import connectMongo from "@/libs/mongoose";
import Contact from "@/models/Contact";
import { withDealerContext } from "@/libs/authContext";

async function handler(req, res, ctx) {
  await connectMongo();
  const { dealerId } = ctx;

  if (req.method === "GET") {
    const { type, search } = req.query;

    let query = { dealerId };
    if (type && type !== "all") {
      query.type = type;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const contacts = await Contact.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(contacts);
  }

  if (req.method === "POST") {
    const { name, email, phone, address, notes, type } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    const contact = await Contact.create({
      dealerId,
      name,
      email,
      phone,
      address,
      notes,
      type: type || "seller",
    });

    return res.status(201).json(contact);
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withDealerContext(handler);
