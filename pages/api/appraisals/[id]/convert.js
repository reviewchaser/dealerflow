import connectMongo from "@/libs/mongoose";
import Appraisal from "@/models/Appraisal";
import AppraisalIssue from "@/models/AppraisalIssue";
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

    const appraisal = await Appraisal.findById(id).populate("contactId");
    if (!appraisal) return res.status(404).json({ error: "Appraisal not found" });
    if (appraisal.vehicleId) return res.status(400).json({ error: "Already converted" });

    console.log("Converting appraisal:", id);
    console.log("V5 URL:", appraisal.v5Url);
    console.log("Service History URL:", appraisal.serviceHistoryUrl);
    console.log("Other Documents:", appraisal.otherDocuments);

    const { initialStatus = "in_stock" } = req.body;

    // Create vehicle with all details (including dealerId and document URLs from appraisal)
    const vehicle = await Vehicle.create({
      dealerId: appraisal.dealerId,
      regCurrent: appraisal.vehicleReg,
      make: appraisal.vehicleMake || "Unknown",
      model: appraisal.vehicleModel || "Unknown",
      year: appraisal.vehicleYear,
      mileageCurrent: appraisal.mileage,
      colour: appraisal.colour,
      fuelType: appraisal.fuelType,
      status: initialStatus,
      notes: appraisal.conditionNotes,
      type: "STOCK",
      saleType: "RETAIL",
      // Transfer document URLs directly to vehicle fields
      v5Url: appraisal.v5Url || null,
      serviceHistoryUrl: appraisal.serviceHistoryUrl || null,
    });

    // Transfer other documents to VehicleDocument collection
    if (appraisal.otherDocuments && appraisal.otherDocuments.length > 0) {
      for (const doc of appraisal.otherDocuments) {
        await VehicleDocument.create({
          vehicleId: vehicle._id,
          name: doc.name || "Other Document",
          type: "other",
          url: doc.url,
        });
      }
    }

    // Transfer issues from AppraisalIssue to VehicleIssue
    const appraisalIssues = await AppraisalIssue.find({ appraisalId: appraisal._id });
    console.log(`Found ${appraisalIssues.length} issues to transfer for appraisal ${appraisal._id}`);
    for (const issue of appraisalIssues) {
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

    // Create tasks - use prep template if selected, otherwise use defaults
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
