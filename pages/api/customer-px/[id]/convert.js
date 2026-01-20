import connectMongo from "@/libs/mongoose";
import CustomerPXAppraisal from "@/models/CustomerPXAppraisal";
import CustomerPXIssue from "@/models/CustomerPXIssue";
import Vehicle from "@/models/Vehicle";
import VehicleTask from "@/models/VehicleTask";
import VehicleDocument from "@/models/VehicleDocument";
import VehicleIssue from "@/models/VehicleIssue";
import VehicleTaskTemplate from "@/models/VehicleTaskTemplate";

const DEFAULT_TASKS = ["PDI", "Valet", "Oil Service Check", "Photos", "Advert"];

// Map appraisal issue categories to vehicle issue categories
const CATEGORY_MAP = {
  mechanical: "Mechanical",
  electrical: "Electrical",
  bodywork: "Cosmetic",
  interior: "Cosmetic",
  tyres: "Mechanical",
  mot: "Other",
  service: "Other",
  fault_codes: "Electrical",
  other: "Other",
};

// Map appraisal issue status to vehicle issue status
const STATUS_MAP = {
  outstanding: "Outstanding",
  ordered: "Ordered",
  in_progress: "In Progress",
  resolved: "Complete",
};

export default async function handler(req, res) {
  try {
    await connectMongo();
    const { id } = req.query;

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const appraisal = await CustomerPXAppraisal.findById(id).populate("contactId");
    if (!appraisal) return res.status(404).json({ error: "Customer PX Appraisal not found" });
    if (appraisal.vehicleId) return res.status(400).json({ error: "Already converted" });

    const { initialStatus = "in_stock", createPrepTasks = true } = req.body;

    // Check for duplicate VRM within this dealer
    const normalizedReg = appraisal.vehicleReg?.toUpperCase().replace(/\s/g, "");
    if (normalizedReg) {
      const existingVehicle = await Vehicle.findOne({
        dealerId: appraisal.dealerId,
        regCurrent: normalizedReg,
      }).lean();

      if (existingVehicle) {
        return res.status(409).json({
          error: "Vehicle already in stock",
          message: `A vehicle with registration ${normalizedReg} already exists in your inventory`,
          existingVehicleId: existingVehicle._id,
        });
      }
    }

    // Create vehicle with all details (including dealerId, MOT expiry, and document URLs from appraisal)
    const vehicle = await Vehicle.create({
      dealerId: appraisal.dealerId,
      regCurrent: appraisal.vehicleReg,
      make: appraisal.vehicleMake || "Unknown",
      model: appraisal.vehicleModel || "Unknown",
      year: appraisal.vehicleYear,
      mileageCurrent: appraisal.mileage,
      colour: appraisal.colour,
      fuelType: appraisal.fuelType,
      motExpiryDate: appraisal.motExpiryDate || null, // Transfer MOT expiry
      status: initialStatus,
      notes: appraisal.conditionNotes,
      type: "STOCK",
      saleType: "RETAIL",
      // Transfer document URLs directly to vehicle fields
      v5Url: appraisal.v5Url || null,
      serviceHistoryUrl: appraisal.serviceHistoryUrl || null,
      // Transfer seller contact info for Stock Book
      purchase: {
        purchasedFromContactId: appraisal.contactId || null,
        purchaseDate: new Date(),
      },
    });

    // Transfer service history URL to VehicleDocument collection
    if (appraisal.serviceHistoryUrl) {
      await VehicleDocument.create({
        vehicleId: vehicle._id,
        name: "Service History",
        type: "service_history",
        url: appraisal.serviceHistoryUrl,
      });
    }

    // Transfer other documents to VehicleDocument collection
    if (appraisal.otherDocuments && appraisal.otherDocuments.length > 0) {
      for (const doc of appraisal.otherDocuments) {
        // Preserve document type if specified, otherwise default to "other"
        const docType = doc.type || "other";
        await VehicleDocument.create({
          vehicleId: vehicle._id,
          name: doc.name || "Other Document",
          type: docType,
          url: doc.url,
        });
      }
    }

    // Transfer issues from CustomerPXIssue to VehicleIssue
    const pxIssues = await CustomerPXIssue.find({ customerPXAppraisalId: appraisal._id });
    console.log(`Found ${pxIssues.length} issues to transfer for Customer PX Appraisal ${appraisal._id}`);
    for (const issue of pxIssues) {
      // Build description - include fault codes if present
      let description = issue.description || "";
      if (issue.category === "fault_codes" && issue.faultCodes) {
        description = `Fault Codes: ${issue.faultCodes}${description ? ` - ${description}` : ""}`;
      }

      // Ensure description is not empty (required field)
      if (!description) {
        description = issue.actionNeeded || `${issue.category} issue`;
      }

      // Map subcategory - use "Other" as fallback if not set
      const subcategory = issue.subcategory || "Other";

      try {
        await VehicleIssue.create({
          vehicleId: vehicle._id,
          category: CATEGORY_MAP[issue.category] || "Other",
          subcategory: subcategory,
          description: description,
          photos: issue.photos || [],
          attachments: issue.attachments || [],  // Transfer attachments
          actionNeeded: issue.actionNeeded || "",
          status: STATUS_MAP[issue.status] || "Outstanding",
          notes: issue.notes || "",
          createdByUserId: issue.createdByUserId,
        });
      } catch (issueError) {
        console.error("Failed to transfer issue:", issueError.message, issue);
        // Continue with other issues even if one fails
      }
    }

    // Create tasks - only if createPrepTasks is true
    if (createPrepTasks) {
      if (appraisal.prepTemplateId) {
        const templateTasks = await VehicleTaskTemplate.find({ groupId: appraisal.prepTemplateId }).sort({ order: 1 });
        if (templateTasks.length > 0) {
          for (const template of templateTasks) {
            await VehicleTask.create({
              vehicleId: vehicle._id,
              name: template.name,
              status: "pending",
              source: "prep_template",
            });
          }
        } else {
          // Fallback to default tasks if template has no tasks
          for (const taskName of DEFAULT_TASKS) {
            await VehicleTask.create({
              vehicleId: vehicle._id,
              name: taskName,
              status: "pending",
              source: "system_default",
            });
          }
        }
      } else {
        // No template selected, use default tasks
        for (const taskName of DEFAULT_TASKS) {
          await VehicleTask.create({
            vehicleId: vehicle._id,
            name: taskName,
            status: "pending",
            source: "system_default",
          });
        }
      }
    }

    // Update appraisal
    appraisal.decision = "converted";
    appraisal.decidedAt = new Date();
    appraisal.vehicleId = vehicle._id;
    await appraisal.save();

    return res.status(201).json({ vehicle, appraisal });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
