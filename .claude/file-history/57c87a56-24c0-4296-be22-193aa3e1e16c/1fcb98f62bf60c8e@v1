import connectMongo from "@/libs/mongoose";
import PrepTaskTemplate from "@/models/PrepTaskTemplate";
import { withDealerContext } from "@/libs/authContext";

const DEFAULT_TASKS = ["PDI", "Valet", "Oil Service Check", "Photos", "Advert"];

async function handler(req, res, ctx) {
  await connectMongo();
  const { dealerId } = ctx;

  if (req.method === "GET") {
    let tasks = await PrepTaskTemplate.find({ dealerId }).sort({ order: 1 }).lean();

    // If no tasks exist, seed with defaults
    if (tasks.length === 0) {
      for (let i = 0; i < DEFAULT_TASKS.length; i++) {
        await PrepTaskTemplate.create({ dealerId, name: DEFAULT_TASKS[i], order: i + 1 });
      }
      tasks = await PrepTaskTemplate.find({ dealerId }).sort({ order: 1 }).lean();
    }

    // Transform for frontend
    const result = tasks.map(t => ({
      ...t,
      id: t._id.toString(),
      _id: undefined,
    }));

    return res.status(200).json(result);
  }

  if (req.method === "POST") {
    const { name, resetToDefaults } = req.body;

    // Handle reset to defaults
    if (resetToDefaults) {
      await PrepTaskTemplate.deleteMany({ dealerId });
      for (let i = 0; i < DEFAULT_TASKS.length; i++) {
        await PrepTaskTemplate.create({ dealerId, name: DEFAULT_TASKS[i], order: i + 1 });
      }
      const tasks = await PrepTaskTemplate.find({ dealerId }).sort({ order: 1 }).lean();
      const result = tasks.map(t => ({
        ...t,
        id: t._id.toString(),
        _id: undefined,
      }));
      return res.status(200).json(result);
    }

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    // Get the highest order number and add 1
    const highestTask = await PrepTaskTemplate.findOne({ dealerId }).sort({ order: -1 });
    const order = highestTask ? highestTask.order + 1 : 1;

    const task = await PrepTaskTemplate.create({ dealerId, name, order });
    const result = {
      ...task.toObject(),
      id: task._id.toString(),
      _id: undefined,
    };
    return res.status(201).json(result);
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withDealerContext(handler);
