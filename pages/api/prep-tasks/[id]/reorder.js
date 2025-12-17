import connectMongo from "@/libs/mongoose";
import PrepTaskTemplate from "@/models/PrepTaskTemplate";

export default async function handler(req, res) {
  await connectMongo();

  const { id } = req.query;

  if (req.method === "POST") {
    try {
      const { direction } = req.body;

      if (!["up", "down"].includes(direction)) {
        return res.status(400).json({ error: "Invalid direction" });
      }

      const task = await PrepTaskTemplate.findById(id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      // Find the task to swap with
      const swapTask = await PrepTaskTemplate.findOne({
        order: direction === "up" ? task.order - 1 : task.order + 1
      });

      if (!swapTask) {
        return res.status(400).json({ error: "Cannot move task in that direction" });
      }

      // Swap orders
      const tempOrder = task.order;
      task.order = swapTask.order;
      swapTask.order = tempOrder;

      await task.save();
      await swapTask.save();

      return res.status(200).json({ message: "Task reordered" });
    } catch (error) {
      console.error("Error reordering task:", error);
      return res.status(500).json({ error: "Failed to reorder task" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
