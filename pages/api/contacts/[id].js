import connectMongo from "@/libs/mongoose";
import Contact from "@/models/Contact";
import { withDealerContext } from "@/libs/authContext";

/**
 * Individual Contact API
 * GET /api/contacts/[id] - Get single contact
 * PUT /api/contacts/[id] - Update contact
 * DELETE /api/contacts/[id] - Soft delete (set isActive: false)
 */
async function handler(req, res, ctx) {
  await connectMongo();
  const { dealerId, userId } = ctx;
  const { id } = req.query;

  // Validate ID format
  if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({ error: "Invalid contact ID" });
  }

  if (req.method === "GET") {
    const contact = await Contact.findOne({ _id: id, dealerId }).lean();

    if (!contact) {
      return res.status(404).json({ error: "Contact not found" });
    }

    return res.status(200).json({
      ...contact,
      id: contact._id.toString(),
      name: contact.displayName || contact.name, // Backward compat
      _id: undefined,
      __v: undefined,
    });
  }

  if (req.method === "PUT") {
    const {
      displayName,
      name, // Backward compat
      companyName,
      email,
      phone,
      mobile,
      address,
      notes,
      typeTags,
      isProspect,
      isActive,
      companyNumber,
      vatNumber,
      accountReference,
      financeSettings,
    } = req.body;

    const updateData = {
      updatedByUserId: userId,
    };

    // Handle name (support both old and new field names)
    if (displayName !== undefined) updateData.displayName = displayName;
    else if (name !== undefined) updateData.displayName = name;

    // Update fields if provided
    if (companyName !== undefined) updateData.companyName = companyName;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (mobile !== undefined) updateData.mobile = mobile;
    if (address !== undefined) updateData.address = address;
    if (notes !== undefined) updateData.notes = notes;
    if (typeTags !== undefined) updateData.typeTags = typeTags;
    if (isProspect !== undefined) updateData.isProspect = isProspect;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (companyNumber !== undefined) updateData.companyNumber = companyNumber;
    if (vatNumber !== undefined) updateData.vatNumber = vatNumber;
    if (accountReference !== undefined) updateData.accountReference = accountReference;
    if (financeSettings !== undefined) updateData.financeSettings = financeSettings;

    const contact = await Contact.findOneAndUpdate(
      { _id: id, dealerId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!contact) {
      return res.status(404).json({ error: "Contact not found" });
    }

    return res.status(200).json({
      ...contact.toJSON(),
      name: contact.displayName, // Backward compat
    });
  }

  if (req.method === "DELETE") {
    // Soft delete by setting isActive to false
    const contact = await Contact.findOneAndUpdate(
      { _id: id, dealerId },
      { $set: { isActive: false, updatedByUserId: userId } },
      { new: true }
    );

    if (!contact) {
      return res.status(404).json({ error: "Contact not found" });
    }

    return res.status(200).json({ success: true, message: "Contact archived" });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withDealerContext(handler);
