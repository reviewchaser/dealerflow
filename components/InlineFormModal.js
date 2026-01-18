import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";

// Dynamic import for signature pad (client-side only)
const DrawableSignature = dynamic(() => import("@/components/DrawableSignature"), {
  ssr: false,
  loading: () => <div className="h-[150px] bg-base-200 rounded-lg animate-pulse" />
});

// Human-readable form type labels
const FORM_TYPE_LABELS = {
  PDI: "Pre-Delivery Inspection",
  TEST_DRIVE: "Test Drive",
  WARRANTY_CLAIM: "Warranty Claim",
  COURTESY_OUT: "Courtesy Car Out",
  COURTESY_IN: "Courtesy Car Return",
  DELIVERY: "Vehicle Delivery",
  SERVICE_RECEIPT: "Service Receipt",
  REVIEW_FEEDBACK: "Review & Feedback",
  OTHER: "Other",
};

/**
 * InlineFormModal - A modal component for filling forms inline without navigation
 *
 * @param {boolean} isOpen - Whether the modal is open
 * @param {function} onClose - Callback when modal is closed
 * @param {string} formType - The type of form to load (PDI, SERVICE_RECEIPT, etc.)
 * @param {object} prefill - Pre-filled values for known fields
 * @param {function} onSuccess - Callback when form is submitted successfully
 */
export default function InlineFormModal({ isOpen, onClose, formType, prefill = {}, onSuccess }) {
  const [form, setForm] = useState(null);
  const [fields, setFields] = useState([]);
  const [template, setTemplate] = useState(null);
  const [formData, setFormData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [dealer, setDealer] = useState(null);
  const [courtesyVehicles, setCourtesyVehicles] = useState([]);

  // Load form when modal opens
  useEffect(() => {
    if (isOpen && formType) {
      loadForm();
      loadDealer();
    }
  }, [isOpen, formType]);

  // Initialize form data with prefill values when form loads
  useEffect(() => {
    if (form && fields.length > 0) {
      const initialData = { ...prefill };

      // Set default date/time values
      const now = new Date();
      fields.forEach(field => {
        if (field.type === "DATE" && !initialData[field.fieldName]) {
          initialData[field.fieldName] = now.toISOString().split("T")[0];
        }
        if (field.type === "TIME" && !initialData[field.fieldName]) {
          const minutes = Math.round(now.getMinutes() / 15) * 15;
          const hours = now.getHours() + (minutes >= 60 ? 1 : 0);
          const adjustedMinutes = minutes >= 60 ? 0 : minutes;
          initialData[field.fieldName] = `${String(hours).padStart(2, "0")}:${String(adjustedMinutes).padStart(2, "0")}`;
        }
        if (field.type === "DATETIME" && !initialData[field.fieldName]) {
          initialData[field.fieldName] = now.toISOString().slice(0, 16);
        }
      });

      setFormData(initialData);
    }
  }, [form, fields, prefill]);

  // Load courtesy vehicles for COURTESY_OUT/IN forms
  useEffect(() => {
    if (form?.type === "COURTESY_OUT" || form?.type === "COURTESY_IN") {
      fetchCourtesyVehicles();
    }
  }, [form?.type]);

  const loadForm = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/forms/by-type?type=${formType}`);
      const data = await res.json();

      if (!res.ok || data.error) {
        toast.error(data.error || "Failed to load form");
        onClose();
        return;
      }

      setForm(data.form);
      setFields(data.fields || []);
      setTemplate(data.template || null);
    } catch (error) {
      console.error("Failed to load form:", error);
      toast.error("Failed to load form");
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const loadDealer = async () => {
    try {
      const res = await fetch("/api/dealer");
      const data = await res.json();
      setDealer(data);
    } catch (error) {
      console.error("Failed to load dealer:", error);
    }
  };

  const fetchCourtesyVehicles = async () => {
    try {
      const res = await fetch("/api/vehicles/courtesy");
      const data = await res.json();
      setCourtesyVehicles(data);
    } catch (error) {
      console.error("Failed to fetch courtesy vehicles:", error);
    }
  };

  const handleInputChange = (fieldName, value) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
    // Clear validation error when user starts typing
    if (validationErrors[fieldName]) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[fieldName];
        return next;
      });
    }
  };

  const handleCourtesyVehicleSelect = (vehicleId) => {
    const vehicle = courtesyVehicles.find(v => v.id === vehicleId);
    if (vehicle) {
      setFormData(prev => ({
        ...prev,
        courtesy_vrm: vehicle.regCurrent,
        courtesy_vehicle_id: vehicle.id,
        courtesy_vehicle_display: `${vehicle.regCurrent} - ${vehicle.make} ${vehicle.model}`,
      }));
    }
  };

  // Validate all required fields
  const validateForm = () => {
    const errors = {};
    let firstErrorField = null;

    fields.forEach((field) => {
      // Skip fields that are pre-filled and read-only
      if (isPrefillField(field.fieldName) && prefill[field.fieldName]) return;

      if (field.required) {
        const value = formData[field.fieldName];
        const isEmpty = value === undefined || value === null || value === "" ||
          (Array.isArray(value) && value.length === 0);

        if (isEmpty) {
          errors[field.fieldName] = `${field.label} is required`;
          if (!firstErrorField) {
            firstErrorField = field.fieldName;
          }
        }
      }
    });

    return { errors, firstErrorField, count: Object.keys(errors).length };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { errors, count } = validateForm();
    setValidationErrors(errors);

    if (count > 0) {
      toast.error(`${count} field${count > 1 ? "s" : ""} need${count === 1 ? "s" : ""} attention`);
      return;
    }

    setIsSubmitting(true);

    try {
      // Include any linked IDs from prefill
      const submissionData = {
        ...formData,
        _vehicleId: prefill.vehicleId,
        _dealId: prefill.dealId,
        _caseId: prefill.caseId,
        _allocationId: prefill.allocationId,
      };

      const res = await fetch("/api/forms/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formId: form.id || form._id,
          rawAnswers: submissionData,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Submission failed");

      toast.success("Form submitted successfully!");
      setValidationErrors({});

      if (onSuccess) {
        onSuccess(data);
      }

      onClose();
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("Failed to submit form. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if a field is a prefill field that should be shown read-only
  const isPrefillField = (fieldName) => {
    const prefillFields = ["vrm", "make", "model", "courtesy_vrm", "customer_vehicle_reg"];
    return prefillFields.includes(fieldName);
  };

  // Replace tokens in text with dealer info
  const replaceTokens = (text) => {
    if (!text || !dealer) return text;
    return text
      .replace(/\{companyName\}/g, dealer.companyName || dealer.name || "Our Dealership")
      .replace(/\{companyPhone\}/g, dealer.companyPhone || dealer.phone || "")
      .replace(/\{companyAddress\}/g, dealer.companyAddress || dealer.address || "")
      .replace(/\{companyEmail\}/g, dealer.companyEmail || dealer.email || "")
      .replace(/\{dealer\.companyName\}/g, dealer.companyName || dealer.name || "Our Dealership")
      .replace(/\{dealer\.companyPhone\}/g, dealer.companyPhone || dealer.phone || "")
      .replace(/\{dealer\.companyAddress\}/g, dealer.companyAddress || dealer.address || "")
      .replace(/\{dealer\.companyEmail\}/g, dealer.companyEmail || dealer.email || "");
  };

  // Render a form field
  const renderField = (field) => {
    const value = formData[field.fieldName] || "";
    const options = field.options?.values || field.options?.choices || [];
    const placeholder = field.placeholder || "";
    const helpText = field.helpText || "";
    const hasError = validationErrors[field.fieldName];

    // Check if this is a courtesy vehicle field
    const isCourtesyVehicleField = (form?.type === "COURTESY_OUT" || form?.type === "COURTESY_IN") &&
      (field.fieldName === "courtesy_vrm" || field.label.toLowerCase().includes("courtesy vehicle"));

    if (isCourtesyVehicleField && courtesyVehicles.length > 0) {
      return (
        <div className="space-y-2">
          <select
            className={`select select-bordered w-full ${hasError ? "select-error" : ""}`}
            value={formData.courtesy_vehicle_id || ""}
            onChange={(e) => handleCourtesyVehicleSelect(e.target.value)}
            required={field.required}
          >
            <option value="">Select courtesy vehicle...</option>
            {courtesyVehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.regCurrent} - {v.make} {v.model} {v.colour ? `(${v.colour})` : ""}
              </option>
            ))}
          </select>
          {formData.courtesy_vehicle_display && (
            <div className="text-sm text-success">Selected: {formData.courtesy_vehicle_display}</div>
          )}
        </div>
      );
    }

    switch (field.type) {
      case "SECTION_HEADER":
        return null;

      case "PARAGRAPH":
        return (
          <p className="text-base-content/70 whitespace-pre-wrap text-sm">{replaceTokens(field.label)}</p>
        );

      case "TEXT":
        return (
          <input
            type="text"
            className={`input input-bordered w-full ${field.uppercase ? "uppercase font-mono" : ""} ${hasError ? "input-error" : ""}`}
            value={value}
            onChange={(e) => handleInputChange(field.fieldName, field.uppercase ? e.target.value.toUpperCase() : e.target.value)}
            required={field.required}
            placeholder={placeholder}
          />
        );

      case "TEXTAREA":
        return (
          <textarea
            className={`textarea textarea-bordered w-full ${hasError ? "textarea-error" : ""}`}
            rows={3}
            value={value}
            onChange={(e) => handleInputChange(field.fieldName, e.target.value)}
            required={field.required}
            placeholder={placeholder}
          />
        );

      case "NUMBER":
        return (
          <input
            type="number"
            className={`input input-bordered w-full ${hasError ? "input-error" : ""}`}
            value={value}
            onChange={(e) => handleInputChange(field.fieldName, e.target.value)}
            required={field.required}
            placeholder={placeholder}
          />
        );

      case "DATE":
        return (
          <input
            type="date"
            className={`input input-bordered w-full ${hasError ? "input-error" : ""}`}
            value={value}
            onChange={(e) => handleInputChange(field.fieldName, e.target.value)}
            required={field.required}
          />
        );

      case "TIME":
        return (
          <input
            type="time"
            className={`input input-bordered w-full ${hasError ? "input-error" : ""}`}
            value={value}
            onChange={(e) => handleInputChange(field.fieldName, e.target.value)}
            required={field.required}
          />
        );

      case "DATETIME":
        return (
          <input
            type="datetime-local"
            className={`input input-bordered w-full ${hasError ? "input-error" : ""}`}
            value={value}
            onChange={(e) => handleInputChange(field.fieldName, e.target.value)}
            required={field.required}
          />
        );

      case "DROPDOWN":
        return (
          <select
            className={`select select-bordered w-full ${hasError ? "select-error" : ""}`}
            value={value}
            onChange={(e) => handleInputChange(field.fieldName, e.target.value)}
            required={field.required}
          >
            <option value="">Select...</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );

      case "RADIO":
        return (
          <div className="flex flex-wrap gap-3">
            {options.map((opt) => (
              <label key={opt} className="label cursor-pointer gap-2">
                <input
                  type="radio"
                  name={field.fieldName}
                  className="radio radio-primary radio-sm"
                  checked={value === opt}
                  onChange={() => handleInputChange(field.fieldName, opt)}
                  required={field.required && !value}
                />
                <span className="label-text text-sm">{opt}</span>
              </label>
            ))}
          </div>
        );

      case "BOOLEAN":
        return (
          <label className="label cursor-pointer justify-start gap-3">
            <input
              type="checkbox"
              className="checkbox checkbox-primary checkbox-sm"
              checked={value === true}
              onChange={(e) => handleInputChange(field.fieldName, e.target.checked)}
            />
            <span className="label-text">Yes</span>
          </label>
        );

      case "FILE":
        return (
          <input
            type="file"
            className="file-input file-input-bordered file-input-sm w-full"
            multiple
            accept="image/*,.pdf"
            onChange={(e) => {
              const files = Array.from(e.target.files);
              handleInputChange(field.fieldName, files);
            }}
          />
        );

      case "SIGNATURE":
        return (
          <DrawableSignature
            value={value || ""}
            onChange={(signatureData) => handleInputChange(field.fieldName, signatureData)}
            required={field.required}
            label=""
            helpText="Please sign above"
          />
        );

      case "PDI_ISSUES":
        // Simplified PDI issues for inline modal - just a textarea
        return (
          <div className="space-y-2">
            <textarea
              className="textarea textarea-bordered w-full"
              rows={3}
              placeholder="List any issues found during inspection..."
              value={value || ""}
              onChange={(e) => handleInputChange(field.fieldName, e.target.value)}
            />
            <p className="text-xs text-base-content/60">
              Issues will be added to the vehicle's issue list after submission.
            </p>
          </div>
        );

      default:
        return (
          <input
            type="text"
            className={`input input-bordered w-full ${hasError ? "input-error" : ""}`}
            value={value}
            onChange={(e) => handleInputChange(field.fieldName, e.target.value)}
            required={field.required}
            placeholder={placeholder}
          />
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-base-200 flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {FORM_TYPE_LABELS[formType] || form?.name || "Form"}
            </h2>
            {/* Show prefilled vehicle info */}
            {(prefill.vrm || prefill.courtesy_vrm) && (
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center bg-amber-100 border border-amber-300 rounded-lg px-2 py-0.5 font-mono font-bold text-slate-900 text-xs tracking-wider uppercase">
                  {prefill.vrm || prefill.courtesy_vrm}
                </span>
                {(prefill.make || prefill.model) && (
                  <span className="text-sm text-slate-600">
                    {prefill.make} {prefill.model}
                  </span>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Render fields */}
              {(() => {
                const visibleFields = fields.filter(f => f.visible !== false);
                const renderedGroups = new Set();

                return visibleFields.map((field, index) => {
                  // Skip fields that have been pre-filled (show in header instead)
                  if (isPrefillField(field.fieldName) && prefill[field.fieldName]) {
                    return null;
                  }

                  // Skip already rendered grid groups
                  if (field.gridGroup && renderedGroups.has(field.gridGroup)) {
                    return null;
                  }

                  // Section headers
                  if (field.type === "SECTION_HEADER") {
                    if (!field.label) {
                      return <div key={field.id || index} className="border-t border-base-200 mt-2 pt-2" />;
                    }
                    return (
                      <div key={field.id || index} className={index > 0 ? "pt-3 mt-3 border-t border-base-200" : ""}>
                        <h3 className={`text-sm font-bold text-primary ${field.uppercase ? "uppercase" : ""}`}>
                          {field.label}
                        </h3>
                      </div>
                    );
                  }

                  // Paragraphs
                  if (field.type === "PARAGRAPH") {
                    return (
                      <div key={field.id || index} className="text-base-content/70 text-sm">
                        {replaceTokens(field.label)}
                      </div>
                    );
                  }

                  // Grid group fields - render side by side
                  if (field.gridGroup) {
                    renderedGroups.add(field.gridGroup);
                    const groupFields = visibleFields.filter(f => f.gridGroup === field.gridGroup);

                    return (
                      <div key={field.gridGroup} className="grid grid-cols-2 gap-3">
                        {groupFields.map((gField) => {
                          // Skip pre-filled fields in grid
                          if (isPrefillField(gField.fieldName) && prefill[gField.fieldName]) {
                            return null;
                          }
                          const hasError = validationErrors[gField.fieldName];
                          return (
                            <div key={gField.id || gField.fieldName} className="form-control">
                              <label className="label py-1">
                                <span className={`label-text text-xs font-medium ${gField.uppercase ? "uppercase" : ""}`}>
                                  {gField.label}
                                  {gField.required && <span className="text-error ml-0.5">*</span>}
                                </span>
                              </label>
                              {renderField(gField)}
                              {hasError && (
                                <label className="label py-0.5">
                                  <span className="label-text-alt text-error text-xs">{hasError}</span>
                                </label>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  }

                  // Normal fields
                  const hasError = validationErrors[field.fieldName];
                  return (
                    <div key={field.id || index} className="form-control">
                      <label className="label py-1">
                        <span className={`label-text text-xs font-medium ${field.uppercase ? "uppercase" : ""}`}>
                          {field.label}
                          {field.required && <span className="text-error ml-0.5">*</span>}
                        </span>
                      </label>
                      {renderField(field)}
                      {field.helpText && (
                        <label className="label py-0.5">
                          <span className="label-text-alt text-xs text-base-content/60">{field.helpText}</span>
                        </label>
                      )}
                      {hasError && (
                        <label className="label py-0.5">
                          <span className="label-text-alt text-error text-xs">{hasError}</span>
                        </label>
                      )}
                    </div>
                  );
                });
              })()}
            </form>
          )}
        </div>

        {/* Footer */}
        {!isLoading && (
          <div className="px-6 py-4 border-t border-base-200 flex items-center justify-end gap-3 bg-base-50">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              className="btn btn-primary"
              disabled={isSubmitting || fields.length === 0}
            >
              {isSubmitting ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Submitting...
                </>
              ) : (
                "Submit"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
