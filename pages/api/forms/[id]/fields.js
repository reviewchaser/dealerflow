import connectMongo from "@/libs/mongoose";
import FormField from "@/models/FormField";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";

export default async function handler(req, res) {
  await connectMongo();

  const { id } = req.query; // formId

  if (req.method === "GET") {
    try {
      const session = await getServerSession(req, res, authOptions);
      if (!session?.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const fields = await FormField.find({ formId: id }).sort({ order: 1 }).lean();
      return res.status(200).json(fields);
    } catch (error) {
      console.error("Error fetching form fields:", error);
      return res.status(500).json({ error: "Failed to fetch form fields" });
    }
  }

  // POST - Add a single new custom field
  if (req.method === "POST") {
    try {
      const session = await getServerSession(req, res, authOptions);
      if (!session?.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { label, type, required, options } = req.body;

      if (!label || !type) {
        return res.status(400).json({ error: "Label and type are required" });
      }

      // Get max order
      const maxOrderField = await FormField.findOne({ formId: id }).sort({ order: -1 });
      const nextOrder = (maxOrderField?.order || 0) + 1;

      const newField = await FormField.create({
        formId: id,
        label,
        fieldName: label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
        type,
        required: required || false,
        order: nextOrder,
        options: options || undefined,
        visible: true,
        isCustom: true,
        isDefault: false,
      });

      return res.status(201).json(newField);
    } catch (error) {
      console.error("Error creating form field:", error);
      return res.status(500).json({ error: "Failed to create form field" });
    }
  }

  // PUT - Update all fields (order, visibility, labels, required status)
  if (req.method === "PUT") {
    try {
      const session = await getServerSession(req, res, authOptions);
      if (!session?.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { fields } = req.body;

      if (!Array.isArray(fields)) {
        return res.status(400).json({ error: "Fields must be an array" });
      }

      // Update each field individually (don't delete - preserve isDefault/isCustom)
      const updatedFields = [];
      for (let i = 0; i < fields.length; i++) {
        const field = fields[i];

        if (field._id || field.id) {
          // Update existing field
          const updated = await FormField.findByIdAndUpdate(
            field._id || field.id,
            {
              label: field.label,
              required: field.required || false,
              order: i + 1,
              visible: field.visible !== false,
              options: field.options || undefined,
            },
            { new: true }
          );
          if (updated) updatedFields.push(updated);
        } else {
          // Create new field
          const newField = await FormField.create({
            formId: id,
            label: field.label,
            fieldName: field.fieldName || field.label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
            type: field.type,
            required: field.required || false,
            order: i + 1,
            options: field.options || undefined,
            visible: field.visible !== false,
            isCustom: field.isCustom || false,
            isDefault: field.isDefault || false,
          });
          updatedFields.push(newField);
        }
      }

      return res.status(200).json(updatedFields);
    } catch (error) {
      console.error("Error updating form fields:", error);
      return res.status(500).json({ error: "Failed to update form fields" });
    }
  }

  // DELETE - Delete a custom field by fieldId query param
  if (req.method === "DELETE") {
    try {
      const session = await getServerSession(req, res, authOptions);
      if (!session?.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { fieldId } = req.query;

      if (!fieldId) {
        return res.status(400).json({ error: "fieldId is required" });
      }

      // Only allow deleting custom fields
      const field = await FormField.findById(fieldId);
      if (!field) {
        return res.status(404).json({ error: "Field not found" });
      }

      if (field.isDefault) {
        return res.status(400).json({ error: "Cannot delete default fields. You can hide them instead." });
      }

      await FormField.findByIdAndDelete(fieldId);
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error deleting form field:", error);
      return res.status(500).json({ error: "Failed to delete form field" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
