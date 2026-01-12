// Seed default forms and task templates for a dealer
import Form from "@/models/Form";
import FormField from "@/models/FormField";
import VehicleTaskTemplateGroup from "@/models/VehicleTaskTemplateGroup";
import VehicleTaskTemplate from "@/models/VehicleTaskTemplate";
import Dealer from "@/models/Dealer";
import { FORM_TEMPLATES } from "@/libs/formTemplates";

// Default board columns for Sales & Prep view
export const DEFAULT_BOARD_COLUMNS = [
  { key: "in_stock", label: "In Stock", order: 0, color: "slate" },
  { key: "in_prep", label: "In Prep", order: 1, color: "amber" },
  { key: "live", label: "Advertised", order: 2, color: "blue" },
  { key: "sold", label: "Sold - In Progress", order: 3, color: "purple" },
  { key: "reserved", label: "Reserved", order: 4, color: "pink" },
  { key: "delivered", label: "Delivered", order: 5, color: "green" },
];

// Default task templates
export const DEFAULT_TASKS = [
  { name: "Pre-Delivery Inspection", order: 0 },
  { name: "MOT", order: 1 },
  { name: "Service / Oil & Filter", order: 2 },
  { name: "Valet", order: 3 },
  { name: "Photos", order: 4 },
  { name: "Advert Live", order: 5 },
  { name: "Delivery / Handover", order: 6 },
];

// Default form-to-task mappings for auto-completion
export const DEFAULT_TASK_MAPPINGS = [
  { formType: "PDI", taskName: "Pre-Delivery Inspection" },
  { formType: "DELIVERY", taskName: "Delivery / Handover" },
  { formType: "SERVICE_RECEIPT", taskName: "Service / Oil & Filter" },
];

/**
 * Seed default forms for a dealer
 * @param {string} dealerId - The dealer's ObjectId
 * @returns {Promise<number>} - Number of forms created
 */
export async function seedFormsForDealer(dealerId) {
  // Check if forms already exist
  const existingCount = await Form.countDocuments({ dealerId });
  if (existingCount > 0) {
    console.log(`[seedDefaults] Dealer ${dealerId} already has ${existingCount} forms, skipping`);
    return 0;
  }

  // Sync indexes to handle schema changes (e.g., compound unique index)
  try {
    await Form.syncIndexes();
  } catch (err) {
    console.log("[seedDefaults] Index sync warning:", err.message);
  }

  let created = 0;
  for (const template of FORM_TEMPLATES) {
    try {
      const form = await Form.create({
        dealerId,
        name: template.name,
        type: template.type,
        isPublic: template.isPublic,
        publicSlug: template.publicSlug,
      });

      // Create fields for this form
      for (const field of template.fields) {
        await FormField.create({
          formId: form._id,
          ...field,
          visible: true,
          isDefault: true,
          isCustom: false,
        });
      }
      created++;
    } catch (err) {
      // Handle duplicate key errors gracefully (e.g., if old unique index still exists)
      if (err.code === 11000) {
        console.log(`[seedDefaults] Form ${template.type} may already exist or index conflict, skipping:`, err.message);
      } else {
        console.error(`[seedDefaults] Error creating form ${template.type}:`, err.message);
        throw err;
      }
    }
  }

  console.log(`[seedDefaults] Created ${created} forms for dealer ${dealerId}`);
  return created;
}

/**
 * Seed default task template group for a dealer
 * @param {string} dealerId - The dealer's ObjectId
 * @param {Array} tasks - Optional custom task list (uses DEFAULT_TASKS if not provided)
 * @returns {Promise<Object>} - The created task template group
 */
export async function seedTaskTemplatesForDealer(dealerId, tasks = null) {
  // Check if a default group already exists
  const existingGroup = await VehicleTaskTemplateGroup.findOne({
    dealerId,
    name: "Default Prep"
  });

  if (existingGroup) {
    console.log(`[seedDefaults] Dealer ${dealerId} already has default task group, skipping`);
    return existingGroup;
  }

  // Create the task template group
  const group = await VehicleTaskTemplateGroup.create({
    dealerId,
    name: "Default Prep",
    note: "Default preparation tasks for new vehicles",
  });

  // Create task templates
  const taskList = tasks || DEFAULT_TASKS;
  for (const task of taskList) {
    await VehicleTaskTemplate.create({
      groupId: group._id,
      name: task.name,
      order: task.order,
    });
  }

  console.log(`[seedDefaults] Created task group with ${taskList.length} tasks for dealer ${dealerId}`);
  return group;
}

/**
 * Seed all defaults for a dealer (forms, tasks, board config)
 * @param {string} dealerId - The dealer's ObjectId
 * @returns {Promise<Object>} - Summary of what was created
 */
export async function seedAllDefaultsForDealer(dealerId) {
  const result = {
    formsCreated: 0,
    taskGroupCreated: false,
    boardConfigSet: false,
  };

  // Seed forms
  result.formsCreated = await seedFormsForDealer(dealerId);

  // Seed task templates
  const taskGroup = await seedTaskTemplatesForDealer(dealerId);
  result.taskGroupCreated = !!taskGroup;

  // Update dealer with defaults if not set
  const dealer = await Dealer.findById(dealerId);
  if (dealer) {
    const updates = {};

    // Set default board config if not set
    if (!dealer.boardConfig?.columns?.length) {
      updates.boardConfig = { columns: DEFAULT_BOARD_COLUMNS };
      result.boardConfigSet = true;
    }

    // Set default task mappings if not set
    if (!dealer.taskAutoComplete?.mappings?.length) {
      updates.taskAutoComplete = {
        enabled: true,
        mappings: DEFAULT_TASK_MAPPINGS,
      };
    }

    // Set default task template group if not set
    if (!dealer.defaultTaskTemplateGroupId && taskGroup) {
      updates.defaultTaskTemplateGroupId = taskGroup._id;
    }

    if (Object.keys(updates).length > 0) {
      await Dealer.findByIdAndUpdate(dealerId, updates);
    }
  }

  console.log(`[seedDefaults] Completed seeding for dealer ${dealerId}:`, result);
  return result;
}

export default {
  seedFormsForDealer,
  seedTaskTemplatesForDealer,
  seedAllDefaultsForDealer,
  DEFAULT_BOARD_COLUMNS,
  DEFAULT_TASKS,
  DEFAULT_TASK_MAPPINGS,
};
