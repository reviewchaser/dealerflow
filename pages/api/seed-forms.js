import connectMongo from "@/libs/mongoose";
import mongoose from "mongoose";
import Form from "@/models/Form";
import FormField from "@/models/FormField";
import Dealer from "@/models/Dealer";
import { FORM_TEMPLATES, DEPRECATED_FORM_TYPES } from "@/libs/formTemplates";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await connectMongo();

    let { dealerId, cleanupDeprecated, forceReseed } = req.body;

    // If no valid dealerId provided, get the first dealer
    if (!dealerId || dealerId === "000000000000000000000000") {
      const firstDealer = await Dealer.findOne().lean();
      if (firstDealer) {
        dealerId = firstDealer._id;
      } else {
        return res.status(400).json({ error: "No dealer found. Please set up a dealer first." });
      }
    } else if (typeof dealerId === "string") {
      dealerId = new mongoose.Types.ObjectId(dealerId);
    }

    // Clean up deprecated form types
    if (cleanupDeprecated !== false && DEPRECATED_FORM_TYPES.length > 0) {
      for (const deprecatedType of DEPRECATED_FORM_TYPES) {
        const deprecatedForms = await Form.find({ dealerId, type: deprecatedType });
        for (const form of deprecatedForms) {
          // Delete associated fields
          await FormField.deleteMany({ formId: form._id });
          // Delete the form
          await Form.findByIdAndDelete(form._id);
        }
      }
    }

    const createdForms = [];
    const updatedForms = [];

    for (const template of FORM_TEMPLATES) {
      // Check if form already exists
      const existing = await Form.findOne({
        dealerId,
        type: template.type,
      });

      if (existing) {
        // Migrate visibility field if not set
        if (!existing.visibility) {
          const newVisibility = template.visibility || (template.isPublic ? "PUBLIC" : "INTERNAL");
          await Form.findByIdAndUpdate(existing._id, { visibility: newVisibility });
        }

        // Check if existing form has fields, if not seed them
        const existingFieldCount = await FormField.countDocuments({ formId: existing._id });
        if (existingFieldCount === 0 || forceReseed) {
          // Delete existing fields if force reseeding
          if (forceReseed && existingFieldCount > 0) {
            await FormField.deleteMany({ formId: existing._id });
          }
          // Seed fields for existing form
          for (const field of template.fields) {
            await FormField.create({
              formId: existing._id,
              ...field,
              visible: true,
              isDefault: true,
              isCustom: false,
            });
          }
          updatedForms.push(existing);
        }
        continue; // Skip creating new form
      }

      // Create form with new visibility field
      const form = await Form.create({
        dealerId,
        name: template.name,
        type: template.type,
        visibility: template.visibility || (template.isPublic ? "PUBLIC" : "INTERNAL"),
        isPublic: template.isPublic, // Deprecated but kept for backward compat
        publicSlug: template.publicSlug,
      });

      // Create fields
      for (const field of template.fields) {
        await FormField.create({
          formId: form._id,
          ...field,
          visible: true,
          isDefault: true,
          isCustom: false,
        });
      }

      createdForms.push(form);
    }

    return res.status(200).json({
      message: `${createdForms.length} forms created, ${updatedForms.length} forms ${forceReseed ? 'reseeded' : 'updated'} with fields`,
      forms: createdForms,
      updated: updatedForms,
      forceReseed: !!forceReseed,
    });
  } catch (error) {
    console.error("Error seeding forms:", error);
    return res.status(500).json({ error: "Failed to seed forms" });
  }
}
