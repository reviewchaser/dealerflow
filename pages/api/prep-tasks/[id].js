import connectMongo from "@/libs/mongoose";
import PrepTaskTemplate from "@/models/PrepTaskTemplate";

export default async function handler(req, res) {
  await connectMongo();

  const { id } = req.query;

  if (req.method === "DELETE") {
    try {
      const task = await PrepTaskTemplate.findByIdAndDelete(id);

      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      return res.status(200).json({ message: "Task deleted" });
    } catch (error) {
      console.error("Error deleting task:", error);
      return res.status(500).json({ error: "Failed to delete task" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
