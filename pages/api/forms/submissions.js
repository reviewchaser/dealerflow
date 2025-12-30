import connectMongo from "@/libs/mongoose";
import FormSubmission from "@/models/FormSubmission";
import Form from "@/models/Form";
import FormSubmissionFile from "@/models/FormSubmissionFile";
import Vehicle from "@/models/Vehicle";
import VehicleTask from "@/models/VehicleTask";
import VehicleIssue from "@/models/VehicleIssue";
import Contact from "@/models/Contact";
import AftercareCase from "@/models/AftercareCase";
import CourtesyAllocation from "@/models/CourtesyAllocation";
import { requireDealerContext } from "@/libs/authContext";

export default async function handler(req, res) {
  await connectMongo();

  // GET requires authentication
  if (req.method === "GET") {
    try {
      const ctx = await requireDealerContext(req, res);
      const { dealerId } = ctx;
      let { formId, formType, search, startDate, endDate } = req.query;

      let query = { dealerId };

      // Filter by form
      if (formId) {
        query.formId = formId;
      }

      // Filter by form type
      if (formType) {
        const forms = await Form.find({ dealerId, type: formType });
        const formIds = forms.map((f) => f._id);
        query.formId = { $in: formIds };
      }

      // Date range filter
      if (startDate || endDate) {
        query.submittedAt = {};
        if (startDate) query.submittedAt.$gte = new Date(startDate);
        if (endDate) query.submittedAt.$lte = new Date(endDate);
      }

      // Search filter (search in rawAnswers)
      if (search) {
        query.$or = [
          { "rawAnswers.name": { $regex: search, $options: "i" } },
          { "rawAnswers.email": { $regex: search, $options: "i" } },
          { "rawAnswers.phone": { $regex: search, $options: "i" } },
          { "rawAnswers.reg": { $regex: search, $options: "i" } },
          { "rawAnswers.vrm": { $regex: search, $options: "i" } },
        ];
      }

      const submissions = await FormSubmission.find(query)
        .populate("formId")
        .populate("submittedByContactId")
        .populate("linkedVehicleId")
        .populate("linkedAftercareCaseId")
        .sort({ submittedAt: -1 });

      return res.status(200).json(submissions);
    } catch (error) {
      return res.status(error.status || 500).json({ error: error.message || "Failed to fetch submissions" });
    }
  }

  // POST is public - form submissions from public forms
  if (req.method === "POST") {
    try {
      const { formId, rawAnswers, submittedByContactId, files } = req.body;

      if (!formId || !rawAnswers) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const form = await Form.findById(formId);
      if (!form) {
        return res.status(404).json({ error: "Form not found" });
      }

      // Ensure dealerId is set - fallback to first dealer if form doesn't have one
      let dealerId = form.dealerId;
      if (!dealerId) {
        const Dealer = (await import("@/models/Dealer")).default;
        const firstDealer = await Dealer.findOne().lean();
        if (firstDealer) {
          dealerId = firstDealer._id;
          // Also update the form to have the dealerId for future submissions
          await Form.findByIdAndUpdate(formId, { dealerId });
        }
      }

      const submission = await FormSubmission.create({
        formId,
        dealerId,
        rawAnswers,
        submittedByContactId,
        submittedAt: new Date(),
      });

      // Handle file uploads if provided
      if (files && Array.isArray(files)) {
        const filePromises = files.map((file) =>
          FormSubmissionFile.create({
            formSubmissionId: submission._id,
            ...file,
          })
        );
        await Promise.all(filePromises);
      }

      // Vehicle integration - update vehicle records based on form type
      const vrm = rawAnswers.vrm || rawAnswers.courtesy_vrm || rawAnswers.vehicle_reg;
      if (vrm) {
        const vehicle = await Vehicle.findOne({
          regCurrent: vrm.toUpperCase().replace(/\s/g, ""),
          dealerId: form.dealerId
        });

        if (vehicle) {
          const updates = {};

          switch (form.type) {
            case "PDI":
              updates.pdiSubmissionId = submission._id;
              updates.pdiCompletedAt = new Date();
              // Auto-complete PDI task on this vehicle (idempotent - only if not already done)
              try {
                const pdiTask = await VehicleTask.findOne({
                  vehicleId: vehicle._id,
                  name: { $regex: /^(PDI|Pre-Delivery Inspection|Pre Delivery Inspection)$/i }
                });
                if (pdiTask && pdiTask.status !== "done" && pdiTask.status !== "DONE") {
                  await VehicleTask.findByIdAndUpdate(pdiTask._id, {
                    status: "done",
                    completedAt: new Date(),
                    notes: pdiTask.notes ? `${pdiTask.notes}\n\nCompleted via form submission` : "Completed via form submission"
                  });
                }
              } catch (taskError) {
                console.error("Error completing PDI task:", taskError);
                // Don't fail the submission if task completion fails
              }

              // ═══════════════════════════════════════════════════════════════════════════════
              // PDI Issues Automation - Create VehicleIssue records from:
              // A) Checklist fields with "Repair", "Repair/Replace", etc. values
              // B) Manual pdi_issues array (Issues Found section)
              // Idempotent: Uses sourceSubmissionId + sourceFieldKey to prevent duplicates
              // ═══════════════════════════════════════════════════════════════════════════════
              try {
                const createdIssueIds = [];

                // ─────────────────────────────────────────────────────────────────────────────
                // PDI Section to Category mapping
                // ─────────────────────────────────────────────────────────────────────────────
                const SECTION_TO_CATEGORY = {
                  interior: "Cosmetic",
                  equipment: "Other",
                  exterior: "Cosmetic",
                  tyres: "Mechanical",
                  lights: "Electrical",
                  road_test: "Mechanical",
                  engine: "Mechanical",
                };

                // Map field names to their sections based on PDI template structure
                const FIELD_TO_SECTION = {
                  // Interior (order 11-34)
                  seat_adjustment: "interior", seat_belts: "interior", sun_visor: "interior",
                  glove_box: "interior", windows: "interior", wipers: "interior", washer: "interior",
                  sat_nav: "interior", horn: "interior", fuel_gauge: "interior", temp_gauge: "interior",
                  dash_lights: "interior", audio_system: "interior", steering_controls: "interior",
                  rear_camera: "interior", parking_sensors_front: "interior", parking_sensors_rear: "interior",
                  clock: "interior", steering_tilt: "interior", outlet_12v: "interior", mirrors: "interior",
                  heated_seats: "interior", air_con: "interior", key_fobs: "interior",
                  // Equipment (order 41-43)
                  jack_wrench: "equipment", parcel_shelf: "equipment",
                  // Exterior (order 51-60)
                  wiper_blades: "exterior", bonnet: "exterior", boot: "exterior", door_locks: "exterior",
                  central_locking: "exterior", exhaust: "exterior", fuel_cap: "exterior", aerial: "exterior",
                  wing_mirrors: "exterior", windscreen: "exterior",
                  // Tyres (order 71-84)
                  wheels_condition: "tyres", tyre_pressure: "tyres", brake_discs: "tyres",
                  // Lights (order 91-98)
                  headlights: "lights", brake_lights: "lights", fog_lights: "lights", reverse_lights: "lights",
                  indicators: "lights", number_plate_lights: "lights", hazard_lights: "lights", interior_lights: "lights",
                  // Road Test (order 101-112)
                  parking_brake: "road_test", steering_effort: "road_test", tracking: "road_test",
                  cruise_control: "road_test", heaters: "road_test", steering_vibration: "road_test",
                  brake_wobble: "road_test", suspension: "road_test", cv_joints: "road_test",
                  clutch: "road_test", gear_change: "road_test",
                  // Engine (order 121-132)
                  oil_level: "engine", brake_fluid: "engine", screen_wash: "engine", coolant_level: "engine",
                  power_steering: "engine", battery: "engine", ignition: "engine", fuel_system: "engine",
                  radiator: "engine", cooling_fan: "engine", dpf_soot: "engine",
                };

                // Field labels for readable descriptions
                const FIELD_LABELS = {
                  seat_adjustment: "Seat Adjustment", seat_belts: "Seat Belts", sun_visor: "Sun Visor/Sunroof",
                  glove_box: "Glove Box", windows: "Windows Front/Rear", wipers: "Wipers", washer: "Washer System",
                  sat_nav: "Sat Nav", horn: "Horn", fuel_gauge: "Fuel Gauge", temp_gauge: "Temp Gauge",
                  dash_lights: "Dash Lights", audio_system: "Audio System", steering_controls: "Steering Wheel Controls",
                  rear_camera: "Rear Camera", parking_sensors_front: "Parking Sensors Front",
                  parking_sensors_rear: "Parking Sensors Rear", clock: "Clock", steering_tilt: "Steering Tilt/Lock",
                  outlet_12v: "12V Outlet", mirrors: "Mirrors", heated_seats: "Heated Seats",
                  air_con: "Air Conditioning", key_fobs: "Key Fobs", jack_wrench: "Jack & Wrench",
                  parcel_shelf: "Parcel Shelf", wiper_blades: "Wiper Blades", bonnet: "Bonnet", boot: "Boot",
                  door_locks: "Door Locks", central_locking: "Central Locking", exhaust: "Exhaust",
                  fuel_cap: "Fuel Cap", aerial: "Aerial", wing_mirrors: "Wing Mirrors", windscreen: "Windscreen",
                  wheels_condition: "Wheels Condition", tyre_pressure: "Tyre Pressure/Valves",
                  brake_discs: "Brake Discs", headlights: "Headlights", brake_lights: "Brake Lights",
                  fog_lights: "Fog Lights", reverse_lights: "Reverse Lights", indicators: "Indicators",
                  number_plate_lights: "Number Plate Lights", hazard_lights: "Hazard Lights",
                  interior_lights: "Interior Lights", parking_brake: "Parking Brake", steering_effort: "Steering Effort",
                  tracking: "Tracking", cruise_control: "Cruise Control", heaters: "Heaters",
                  steering_vibration: "Steering Vibration", brake_wobble: "Brake Wobble", suspension: "Suspension",
                  cv_joints: "CV Joints", clutch: "Clutch", gear_change: "Gear Change", oil_level: "Oil Level",
                  brake_fluid: "Brake Fluid", screen_wash: "Screen Wash", coolant_level: "Coolant Level",
                  power_steering: "Power Steering Fluid", battery: "Battery Condition", ignition: "Ignition",
                  fuel_system: "Fuel System", radiator: "Radiator", cooling_fan: "Cooling Fan", dpf_soot: "DPF Soot Level",
                };

                // Values that indicate "OK" - NOT repair needed
                const OK_VALUES = new Set([
                  "okay", "ok", "good", "normal", "none", "present", "yes", "no", "n/a",
                  "n/a (auto)", "n/a (electric)", "working", "adjusted", "topped up",
                  "1", "2", "3+", "full", "3/4", "1/2", "1/4", "empty"
                ]);

                // ─────────────────────────────────────────────────────────────────────────────
                // A) Create issues from checklist fields with repair-needed values
                // ─────────────────────────────────────────────────────────────────────────────
                for (const [fieldName, value] of Object.entries(rawAnswers)) {
                  // Skip non-checklist fields
                  if (!FIELD_TO_SECTION[fieldName]) continue;
                  if (!value || typeof value !== "string") continue;

                  const valueLower = value.toLowerCase().trim();

                  // Skip OK values
                  if (OK_VALUES.has(valueLower)) continue;

                  // This field needs repair - create issue
                  const section = FIELD_TO_SECTION[fieldName];
                  const category = SECTION_TO_CATEGORY[section] || "Other";
                  const label = FIELD_LABELS[fieldName] || fieldName;
                  const sourceFieldKey = `pdi:${section}:${fieldName}`;

                  // Idempotency check - does this exact field issue already exist?
                  const existingFieldIssue = await VehicleIssue.findOne({
                    sourceSubmissionId: submission._id,
                    sourceFieldKey: sourceFieldKey,
                  });

                  if (!existingFieldIssue) {
                    // Determine subcategory based on section
                    const subcategoryMap = {
                      interior: "Interior", equipment: "Equipment", exterior: "Bodywork",
                      tyres: "Wheels/Tyres", lights: "Lighting", road_test: "Drivetrain", engine: "Engine Bay",
                    };
                    const subcategory = subcategoryMap[section] || "Other";

                    const newIssue = await VehicleIssue.create({
                      vehicleId: vehicle._id,
                      category,
                      subcategory,
                      description: `${label} marked as "${value}"`,
                      actionNeeded: value, // "Repair", "Repair/Replace", "Replace Bulb", etc.
                      status: "Outstanding",
                      notes: `Auto-created from PDI checklist`,
                      sourceSubmissionId: submission._id,
                      sourceFieldKey,
                    });
                    createdIssueIds.push(newIssue._id);
                  }
                }

                // ─────────────────────────────────────────────────────────────────────────────
                // B) Create issues from manual pdi_issues array (Issues Found section)
                // Uses same lowercase categories as stock board - maps to model enum
                // ─────────────────────────────────────────────────────────────────────────────
                const pdiIssues = rawAnswers.pdi_issues;
                if (pdiIssues && Array.isArray(pdiIssues) && pdiIssues.length > 0) {
                  // Map lowercase categories to model enum (same as /api/vehicles/[id]/issues)
                  const categoryMap = {
                    'cosmetic': 'Cosmetic',
                    'bodywork': 'Cosmetic',
                    'mechanical': 'Mechanical',
                    'electrical': 'Electrical',
                    'interior': 'Cosmetic',
                    'tyres': 'Mechanical',
                    'mot': 'Mechanical',
                    'service': 'Mechanical',
                    'fault_codes': 'Mechanical',
                    'other': 'Other'
                  };
                  const statusMap = {
                    'outstanding': 'Outstanding',
                    'ordered': 'Ordered',
                    'in_progress': 'In Progress',
                    'resolved': 'Complete',
                    'complete': 'Complete'
                  };

                  for (let i = 0; i < pdiIssues.length; i++) {
                    const issue = pdiIssues[i];
                    if (!issue.category || !issue.description) continue;

                    const sourceFieldKey = `pdi:manual_issue:${i}`;

                    // Idempotency check
                    const existingManualIssue = await VehicleIssue.findOne({
                      sourceSubmissionId: submission._id,
                      sourceFieldKey: sourceFieldKey,
                    });

                    if (!existingManualIssue) {
                      const mappedCategory = categoryMap[issue.category.toLowerCase()] || 'Other';
                      const mappedStatus = statusMap[(issue.status || 'outstanding').toLowerCase()] || 'Outstanding';

                      const newIssue = await VehicleIssue.create({
                        vehicleId: vehicle._id,
                        category: mappedCategory,
                        subcategory: issue.subcategory || "Other",
                        description: issue.description,
                        actionNeeded: issue.actionNeeded || null,
                        photos: issue.photos || [],
                        status: mappedStatus,
                        notes: issue.notes || "Added from PDI Issues Found section",
                        sourceSubmissionId: submission._id,
                        sourceFieldKey,
                      });
                      createdIssueIds.push(newIssue._id);
                    }
                  }
                }

                // Update submission with created issue IDs
                if (createdIssueIds.length > 0) {
                  await FormSubmission.findByIdAndUpdate(submission._id, {
                    $addToSet: { createdIssueIds: { $each: createdIssueIds } },
                    pdiIssues: pdiIssues || [],
                  });
                }
              } catch (issueError) {
                console.error("Error creating PDI issues:", issueError);
                // Don't fail the submission if issue creation fails
              }
              break;

            case "TEST_DRIVE":
              updates.testDriveCount = (vehicle.testDriveCount || 0) + 1;
              break;

            case "DELIVERY":
              updates.deliverySubmissionId = submission._id;
              updates.status = "delivered";
              // Auto-complete Delivery task on this vehicle (idempotent)
              try {
                const deliveryTask = await VehicleTask.findOne({
                  vehicleId: vehicle._id,
                  name: { $regex: /^(Delivery|Vehicle Delivery|Handover)$/i }
                });
                if (deliveryTask && deliveryTask.status !== "done" && deliveryTask.status !== "DONE") {
                  await VehicleTask.findByIdAndUpdate(deliveryTask._id, {
                    status: "done",
                    completedAt: new Date(),
                    notes: deliveryTask.notes ? `${deliveryTask.notes}\n\nCompleted via form submission` : "Completed via form submission"
                  });
                }
              } catch (taskError) {
                console.error("Error completing Delivery task:", taskError);
              }
              break;
          }

          if (Object.keys(updates).length > 0) {
            await Vehicle.findByIdAndUpdate(vehicle._id, { $set: updates });
          }
        }
      }

      // Warranty board integration - create/update AftercareCase for WARRANTY_CLAIM forms
      if (form.type === "WARRANTY_CLAIM") {
        try {
          const customerEmail = rawAnswers.email?.toLowerCase().trim();
          const customerName = rawAnswers.customer_name?.trim();
          const customerPhone = rawAnswers.phone?.trim();
          const vrmNormalized = vrm ? vrm.toUpperCase().replace(/\s/g, "") : null;
          const warrantyType = rawAnswers.warranty_type;
          const issueDescription = rawAnswers.issue_description;

          if (customerEmail && customerName) {
            // Find or create contact
            let contact = await Contact.findOne({
              dealerId,
              email: { $regex: new RegExp(`^${customerEmail}$`, "i") }
            });

            if (!contact) {
              contact = await Contact.create({
                dealerId,
                name: customerName,
                email: customerEmail,
                phone: customerPhone,
              });
            }

            // Check for existing case with same VRM + contact (deduplication)
            let existingCase = null;
            if (vrmNormalized) {
              existingCase = await AftercareCase.findOne({
                dealerId,
                contactId: contact._id,
                regAtPurchase: vrmNormalized,
                status: { $nin: ["resolved", "closed"] } // Only match open cases
              });
            }

            if (existingCase) {
              // Append submission to existing case
              const updateOps = {
                $addToSet: { linkedSubmissionIds: submission._id },
                // Update details with latest submission info
                $set: {
                  warrantyType: warrantyType || existingCase.warrantyType,
                }
              };

              // Transfer any files from the form submission to case attachments
              const submissionFiles = await FormSubmissionFile.find({ formSubmissionId: submission._id });
              if (submissionFiles.length > 0) {
                const newAttachments = submissionFiles.map(f => ({
                  url: f.url,
                  filename: f.filename || `${f.fieldName}_file`,
                  uploadedAt: new Date(),
                }));
                updateOps.$push = {
                  attachments: { $each: newAttachments },
                  events: {
                    type: "ATTACHMENT_ADDED",
                    createdAt: new Date(),
                    summary: `${submissionFiles.length} file(s) added from warranty form submission`,
                    metadata: { sourceSubmissionId: submission._id }
                  }
                };
              }

              await AftercareCase.findByIdAndUpdate(existingCase._id, updateOps);

              // Link submission to case
              await FormSubmission.findByIdAndUpdate(submission._id, {
                linkedAftercareCaseId: existingCase._id
              });
            } else {
              // Create new AftercareCase
              // Try to find vehicle to link
              let linkedVehicleId = null;
              if (vrmNormalized) {
                const vehicle = await Vehicle.findOne({
                  dealerId,
                  $or: [
                    { regCurrent: vrmNormalized },
                    { regAtPurchase: vrmNormalized }
                  ]
                });
                if (vehicle) {
                  linkedVehicleId = vehicle._id;
                }
              }

              // Get any files from the form submission to add as attachments
              const submissionFiles = await FormSubmissionFile.find({ formSubmissionId: submission._id });
              const initialAttachments = submissionFiles.map(f => ({
                url: f.url,
                filename: f.filename || `${f.fieldName}_file`,
                uploadedAt: new Date(),
              }));

              const initialEvents = [{
                type: "CASE_CREATED",
                createdAt: new Date(),
                summary: "Warranty claim submitted via form",
                metadata: { sourceSubmissionId: submission._id }
              }];

              if (submissionFiles.length > 0) {
                initialEvents.push({
                  type: "ATTACHMENT_ADDED",
                  createdAt: new Date(),
                  summary: `${submissionFiles.length} file(s) attached from form submission`,
                  metadata: { sourceSubmissionId: submission._id }
                });
              }

              const newCase = await AftercareCase.create({
                dealerId,
                contactId: contact._id,
                vehicleId: linkedVehicleId,
                source: "warranty_claim_form",
                status: "new",
                boardStatus: "not_booked_in",
                priority: "normal",
                summary: issueDescription ? issueDescription.substring(0, 100) : "Warranty claim submitted",
                details: {
                  issueDescription,
                  mileage: rawAnswers.exact_mileage,
                  purchaseDate: rawAnswers.purchase_date,
                  vehicleMakeModel: rawAnswers.vehicle_make_model,
                  customerAddress: {
                    street: rawAnswers.address_street,
                    line2: rawAnswers.address_line2,
                    city: rawAnswers.address_city,
                    county: rawAnswers.address_county,
                    postcode: rawAnswers.address_postcode,
                  }
                },
                regAtPurchase: vrmNormalized,
                warrantyType,
                linkedSubmissionIds: [submission._id],
                attachments: initialAttachments,
                events: initialEvents,
              });

              // Link submission to case
              await FormSubmission.findByIdAndUpdate(submission._id, {
                linkedAftercareCaseId: newCase._id
              });
            }
          }
        } catch (caseError) {
          console.error("Error creating/updating AftercareCase:", caseError);
          // Don't fail the submission if case creation fails
        }
      }

      // ═══════════════════════════════════════════════════════════════════════════════
      // Courtesy Car integration - auto-link COURTESY_OUT/IN forms to open cases
      // ═══════════════════════════════════════════════════════════════════════════════
      if (form.type === "COURTESY_OUT") {
        try {
          const courtesyVrm = rawAnswers.courtesy_vrm?.toUpperCase().replace(/\s/g, "");
          const customerVehicleReg = rawAnswers.customer_vehicle_reg?.toUpperCase().replace(/\s/g, "");
          const dateOut = rawAnswers.datetime_out ? new Date(rawAnswers.datetime_out) : new Date();
          const dateDueBack = rawAnswers.date_due_back ? new Date(rawAnswers.date_due_back) : null;
          const mileageOut = rawAnswers.mileage_out ? parseInt(rawAnswers.mileage_out) : null;
          const fuelLevelOut = rawAnswers.fuel_out;
          const driverName = [rawAnswers.driver_first_name, rawAnswers.driver_last_name].filter(Boolean).join(" ");

          // Find the courtesy vehicle
          const courtesyVehicle = courtesyVrm ? await Vehicle.findOne({
            dealerId,
            regCurrent: courtesyVrm,
            type: "COURTESY"
          }) : null;

          if (courtesyVehicle) {
            // Try to find an open AftercareCase matching the customer vehicle reg (within last 30 days)
            let linkedCase = null;
            if (customerVehicleReg) {
              const thirtyDaysAgo = new Date();
              thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

              linkedCase = await AftercareCase.findOne({
                dealerId,
                $or: [
                  { regAtPurchase: customerVehicleReg },
                  { currentReg: customerVehicleReg }
                ],
                status: { $nin: ["resolved", "closed"] },
                createdAt: { $gte: thirtyDaysAgo }
              });
            }

            // Create CourtesyAllocation
            const allocation = await CourtesyAllocation.create({
              dealerId,
              courtesyVehicleId: courtesyVehicle._id,
              aftercareCaseId: linkedCase?._id || null,
              customerVehicleRegNormalized: customerVehicleReg || null,
              dateOut,
              dateDueBack,
              mileageOut,
              fuelLevelOut,
              driverName,
              source: "FORM",
              status: "OUT"
            });

            // If linked to a case, update the case with courtesy summary
            if (linkedCase) {
              // Get courtesy vehicle name for display
              const courtesyVehicleName = courtesyVehicle.make && courtesyVehicle.model
                ? `${courtesyVehicle.make} ${courtesyVehicle.model}`
                : courtesyVrm;

              await AftercareCase.updateOne(
                { _id: linkedCase._id, dealerId },
                {
                  $set: {
                    courtesyRequired: true,
                    courtesyAllocationId: allocation._id,
                    // Populate courtesy summary for card display
                    "courtesy.vehicleReg": courtesyVrm,
                    "courtesy.vehicleName": courtesyVehicleName,
                    "courtesy.outAt": dateOut,
                    "courtesy.dueBack": dateDueBack,
                  },
                  $push: {
                    events: {
                      type: "COURTESY_OUT_RECORDED",
                      createdAt: new Date(),
                      summary: `Courtesy vehicle ${courtesyVrm} issued via form`,
                      metadata: {
                        courtesyVrm,
                        allocationId: allocation._id,
                        dueBack: dateDueBack
                      }
                    }
                  }
                }
              );
            }
          }
        } catch (courtesyError) {
          console.error("Error processing COURTESY_OUT form:", courtesyError);
          // Don't fail the submission if courtesy allocation fails
        }
      }

      if (form.type === "COURTESY_IN") {
        try {
          const courtesyVrm = rawAnswers.courtesy_vrm?.toUpperCase().replace(/\s/g, "");
          const dateReturned = rawAnswers.datetime_returned ? new Date(rawAnswers.datetime_returned) : new Date();
          const mileageIn = rawAnswers.mileage_in ? parseInt(rawAnswers.mileage_in) : null;
          const fuelLevelIn = rawAnswers.fuel_in;

          // Find the courtesy vehicle
          const courtesyVehicle = courtesyVrm ? await Vehicle.findOne({
            dealerId,
            regCurrent: courtesyVrm,
            type: "COURTESY"
          }) : null;

          if (courtesyVehicle) {
            // Find the most recent OUT allocation for this courtesy vehicle
            const allocation = await CourtesyAllocation.findOne({
              dealerId,
              courtesyVehicleId: courtesyVehicle._id,
              status: "OUT"
            }).sort({ dateOut: -1 });

            if (allocation) {
              // Update the allocation
              await CourtesyAllocation.updateOne(
                { _id: allocation._id, dealerId },
                {
                  $set: {
                    dateReturned,
                    mileageIn,
                    fuelLevelIn,
                    status: "RETURNED"
                  }
                }
              );

              // If linked to a case, update courtesy summary and add timeline event
              if (allocation.aftercareCaseId) {
                await AftercareCase.updateOne(
                  { _id: allocation.aftercareCaseId, dealerId },
                  {
                    $set: {
                      // Mark courtesy as returned
                      "courtesy.returnedAt": dateReturned,
                    },
                    $push: {
                      events: {
                        type: "COURTESY_IN_RECORDED",
                        createdAt: new Date(),
                        summary: `Courtesy vehicle ${courtesyVrm} returned via form`,
                        metadata: {
                          courtesyVrm,
                          allocationId: allocation._id,
                          mileageIn,
                          fuelLevelIn
                        }
                      }
                    }
                  }
                );
              }
            }
          }
        } catch (courtesyError) {
          console.error("Error processing COURTESY_IN form:", courtesyError);
          // Don't fail the submission if courtesy return fails
        }
      }

      return res.status(201).json(submission);
    } catch (error) {
      console.error("Error creating submission:", error);
      return res.status(500).json({ error: "Failed to create submission" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
