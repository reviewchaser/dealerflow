import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import DashboardLayout from "@/components/DashboardLayout";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { DEFAULT_FORM_TEXT } from "@/libs/formTemplates";

// Note: Appraisal forms are handled in the dedicated Appraisals section
const FORM_TYPE_LABELS = {
  PDI: "PDI (Pre-Delivery Inspection)",
  TEST_DRIVE: "Test Drive",
  WARRANTY_CLAIM: "Warranty Claim",
  COURTESY_OUT: "Courtesy Car Out",
  COURTESY_IN: "Courtesy Car In",
  DELIVERY: "Vehicle Delivery",
  SERVICE_RECEIPT: "Service Receipt",
  REVIEW_FEEDBACK: "Review/Feedback",
  OTHER: "Other",
};

export default function SettingsForms() {
  const router = useRouter();
  const { data: session } = useSession();
  const [forms, setForms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSeeded, setHasSeeded] = useState(false);
  const dealerId = session?.user?.dealerId || "000000000000000000000000";

  // Form text customization state
  const [dealer, setDealer] = useState(null);
  const [editingFormType, setEditingFormType] = useState(null);
  const [formTextData, setFormTextData] = useState({});
  const [isSavingText, setIsSavingText] = useState(false);

  useEffect(() => {
    fetchForms();
    fetchDealer();
  }, [dealerId]);

  // Auto-seed forms when dealer has 0 forms, or reseed to populate missing fields
  useEffect(() => {
    if (!isLoading && !hasSeeded) {
      // Check if any form has 0 fields or if no forms exist
      const needsSeeding = forms.length === 0 || forms.some(f => (f.fieldCount || 0) === 0);
      if (needsSeeding) {
        seedFormsAutomatically();
      }
    }
  }, [isLoading, forms, hasSeeded]);

  const fetchForms = async () => {
    try {
      const res = await fetch(`/api/forms?dealerId=${dealerId}`);
      if (res.ok) {
        const data = await res.json();
        setForms(data);
      }
    } catch (error) {
      console.error("Failed to load forms:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const seedFormsAutomatically = async () => {
    setHasSeeded(true);
    try {
      const res = await fetch("/api/seed-forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealerId }),
      });
      if (res.ok) {
        fetchForms();
      }
    } catch (error) {
      console.error("Failed to seed forms:", error);
    }
  };

  const fetchDealer = async () => {
    try {
      const res = await fetch("/api/dealer");
      const data = await res.json();
      setDealer(data);
    } catch (error) {
      console.error("Failed to load dealer:", error);
    }
  };

  const openTextEditor = (formType) => {
    // Get current custom text or defaults
    const currentCustom = dealer?.formCustomText?.[formType] || {};
    const defaults = DEFAULT_FORM_TEXT[formType] || {};
    setFormTextData({
      introText: currentCustom.introText || defaults.introText || "",
      termsText: currentCustom.termsText || defaults.termsText || "",
    });
    setEditingFormType(formType);
  };

  const saveFormText = async () => {
    setIsSavingText(true);
    try {
      // Merge with existing formCustomText
      const existingCustomText = dealer?.formCustomText || {};
      const newFormCustomText = {
        ...existingCustomText,
        [editingFormType]: formTextData,
      };

      const res = await fetch("/api/dealer", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formCustomText: newFormCustomText }),
      });

      if (!res.ok) throw new Error("Failed to save");
      const updatedDealer = await res.json();
      setDealer(updatedDealer);
      setEditingFormType(null);
      toast.success("Form text saved");
    } catch (error) {
      toast.error("Failed to save form text");
    } finally {
      setIsSavingText(false);
    }
  };

  const resetFormTextToDefault = () => {
    const defaults = DEFAULT_FORM_TEXT[editingFormType] || {};
    setFormTextData({
      introText: defaults.introText || "",
      termsText: defaults.termsText || "",
    });
  };

  return (
    <DashboardLayout>
      <Head><title>Form Templates | Settings | DealerHQ</title></Head>

      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-base-content/60 mb-2">
          <Link href="/settings" className="hover:text-primary">Settings</Link>
          <span>/</span>
          <span>Form Templates</span>
        </div>
        <div>
          <h1 className="text-3xl font-bold">Form Templates</h1>
          <p className="text-base-content/60 mt-1">Customize form fields for each template</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : forms.length === 0 ? (
        <div className="card bg-base-200">
          <div className="card-body items-center text-center py-16">
            <span className="loading loading-spinner loading-lg"></span>
            <p className="text-base-content/60 mt-4">Loading form templates...</p>
          </div>
        </div>
      ) : (
        <div className="card bg-base-200">
          <div className="card-body p-0">
            <table className="table">
              <thead>
                <tr>
                  <th>Form Name</th>
                  <th>Type</th>
                  <th className="text-center">Fields</th>
                  <th className="text-center">Visible</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {forms.map((form) => (
                  <tr key={form._id || form.id} className="hover">
                    <td>
                      <div className="font-semibold">{form.name}</div>
                    </td>
                    <td>
                      <span className="badge badge-ghost badge-sm">
                        {FORM_TYPE_LABELS[form.type] || form.type}
                      </span>
                    </td>
                    <td className="text-center">
                      <span className="font-mono">{form.fieldCount || 0}</span>
                    </td>
                    <td className="text-center">
                      <span className="font-mono text-success">{form.visibleCount || 0}</span>
                    </td>
                    <td className="text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => openTextEditor(form.type)}
                          className="btn btn-sm btn-ghost"
                          title="Edit intro text and terms"
                        >
                          Edit Text
                        </button>
                        <Link
                          href={`/settings/forms/${form._id || form.id}`}
                          className="btn btn-sm btn-outline"
                        >
                          Edit Fields
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="mt-8 p-4 bg-base-200 rounded-lg">
        <h3 className="font-semibold mb-2">About Form Templates</h3>
        <ul className="text-sm text-base-content/70 space-y-1">
          <li>• Each form template contains fields that appear when filling out that form type</li>
          <li>• You can hide fields you don't need, reorder them, or add custom fields</li>
          <li>• Default fields cannot be deleted, but they can be hidden</li>
          <li>• Custom fields you add can be edited or deleted at any time</li>
          <li>• Use "Edit Text" to customize the introduction and terms for each form</li>
          <li>• You can use {"{dealer.companyName}"}, {"{dealer.companyPhone}"}, {"{dealer.companyEmail}"} tokens in your text</li>
        </ul>
      </div>

      {/* Form Text Editor Modal */}
      {editingFormType && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-base-100 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-base-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">
                  Edit Form Text - {FORM_TYPE_LABELS[editingFormType] || editingFormType}
                </h2>
                <button
                  onClick={() => setEditingFormType(null)}
                  className="btn btn-sm btn-circle btn-ghost"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Introduction Text */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Introduction Text</span>
                </label>
                <textarea
                  className="textarea textarea-bordered h-32"
                  placeholder="Enter the introduction text that appears at the top of the form..."
                  value={formTextData.introText || ""}
                  onChange={(e) => setFormTextData(prev => ({ ...prev, introText: e.target.value }))}
                />
                <label className="label">
                  <span className="label-text-alt text-base-content/60">
                    This text appears before the form fields
                  </span>
                </label>
              </div>

              {/* Terms & Conditions */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Terms & Conditions</span>
                </label>
                <textarea
                  className="textarea textarea-bordered h-48"
                  placeholder="Enter the terms and conditions for this form..."
                  value={formTextData.termsText || ""}
                  onChange={(e) => setFormTextData(prev => ({ ...prev, termsText: e.target.value }))}
                />
                <label className="label">
                  <span className="label-text-alt text-base-content/60">
                    This text appears before the signature field
                  </span>
                </label>
              </div>

              {/* Token Help */}
              <div className="bg-base-200 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Available Tokens</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <code className="bg-base-300 px-2 py-1 rounded">{"{dealer.companyName}"}</code>
                  <span className="text-base-content/60">Your company name</span>
                  <code className="bg-base-300 px-2 py-1 rounded">{"{dealer.companyPhone}"}</code>
                  <span className="text-base-content/60">Your phone number</span>
                  <code className="bg-base-300 px-2 py-1 rounded">{"{dealer.companyEmail}"}</code>
                  <span className="text-base-content/60">Your email address</span>
                  <code className="bg-base-300 px-2 py-1 rounded">{"{dealer.companyAddress}"}</code>
                  <span className="text-base-content/60">Your address</span>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-base-200 flex justify-between">
              <button
                onClick={resetFormTextToDefault}
                className="btn btn-ghost"
              >
                Reset to Default
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingFormType(null)}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
                <button
                  onClick={saveFormText}
                  className="btn btn-primary"
                  disabled={isSavingText}
                >
                  {isSavingText ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
