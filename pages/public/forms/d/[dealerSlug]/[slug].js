import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import connectMongo from "@/libs/mongoose";
import Form from "@/models/Form";
import FormField from "@/models/FormField";
import Dealer from "@/models/Dealer";
import toast from "react-hot-toast";

// Re-export the same component from the parent forms page
// This route requires a dealer slug in the URL: /public/forms/d/[dealerSlug]/[slug]
export { default } from "../../[slug]";

export async function getServerSideProps({ params }) {
  try {
    await connectMongo();

    const { dealerSlug, slug } = params;

    // First find the dealer by slug
    const dealer = await Dealer.findOne({ slug: dealerSlug }).lean();

    if (!dealer) {
      return { props: { form: null, fields: [], dealer: null } };
    }

    // Find form by publicSlug AND dealerId - must belong to this dealer
    const form = await Form.findOne({
      publicSlug: slug,
      dealerId: dealer._id,
      $or: [
        { visibility: { $in: ["SHARE_LINK", "PUBLIC"] } },
        { visibility: { $exists: false }, isPublic: true }, // Legacy compatibility
      ]
    }).lean();

    if (!form) {
      return { props: { form: null, fields: [], dealer: null } };
    }

    const fields = await FormField.find({ formId: form._id })
      .sort({ order: 1 })
      .lean();

    return {
      props: {
        form: JSON.parse(JSON.stringify(form)),
        fields: JSON.parse(JSON.stringify(fields)),
        dealer: JSON.parse(JSON.stringify(dealer)),
      },
    };
  } catch (error) {
    console.error("Error loading form:", error);
    return { props: { form: null, fields: [], dealer: null } };
  }
}
