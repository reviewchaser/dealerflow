// Step 3: Configure workflow templates (board columns, tasks, auto-complete)
import connectMongo from "@/libs/mongoose";
import Dealer from "@/models/Dealer";
import VehicleTaskTemplateGroup from "@/models/VehicleTaskTemplateGroup";
import VehicleTaskTemplate from "@/models/VehicleTaskTemplate";
import {
  DEFAULT_BOARD_COLUMNS,
  DEFAULT_TASK_MAPPINGS,
  seedFormsForDealer,
} from "@/libs/seedDefaults";
import { withDealerContext } from "@/libs/authContext";

async function handler(req, res, ctx) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  await connectMongo();
  const { dealerId } = ctx;

  // Re-fetch dealer as a proper Mongoose document (not from populated membership)
  const dealer = await Dealer.findById(dealerId);
  if (!dealer) {
    return res.status(404).json({ error: "Dealer not found" });
  }

  const { tasks, autoCompleteEnabled } = req.body;

  // 1. Set board columns (use defaults for now)
  dealer.boardConfig = { columns: DEFAULT_BOARD_COLUMNS };

  // 2. Create or update task template group
  let taskGroup = await VehicleTaskTemplateGroup.findOne({
    dealerId,
    name: "Default Prep",
  });

  if (!taskGroup) {
    taskGroup = await VehicleTaskTemplateGroup.create({
      dealerId,
      name: "Default Prep",
      note: "Default preparation tasks for new vehicles",
    });
  }

  // Delete existing templates and recreate (simpler than updating)
  await VehicleTaskTemplate.deleteMany({ groupId: taskGroup._id });

  // Create task templates from provided list or defaults
  const taskList = tasks && tasks.length > 0 ? tasks : [
    "Pre-Delivery Inspection",
    "MOT",
    "Service / Oil & Filter",
    "Valet",
    "Photos",
    "Advert Live",
    "Delivery / Handover",
  ];

  for (let i = 0; i < taskList.length; i++) {
    await VehicleTaskTemplate.create({
      groupId: taskGroup._id,
      name: taskList[i],
      order: i,
    });
  }

  // 3. Set auto-complete settings
  dealer.taskAutoComplete = {
    enabled: autoCompleteEnabled !== false,
    mappings: DEFAULT_TASK_MAPPINGS,
  };

  // 4. Set default task template group
  dealer.defaultTaskTemplateGroupId = taskGroup._id;

  await dealer.save();

  // 5. Ensure forms are seeded
  await seedFormsForDealer(dealerId);

  return res.status(200).json({
    success: true,
    taskGroupId: taskGroup._id,
    tasksCreated: taskList.length,
  });
}

export default withDealerContext(handler);
