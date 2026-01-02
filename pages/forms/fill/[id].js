import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import DashboardLayout from "@/components/DashboardLayout";
import toast from "react-hot-toast";
import { FORM_TEMPLATES } from "@/libs/formTemplates";

// Dynamic import for signature pad (client-side only)
const DrawableSignature = dynamic(() => import("@/components/DrawableSignature"), {
  ssr: false,
  loading: () => <div className="h-[150px] bg-base-200 rounded-lg animate-pulse" />
});

// Human-readable form type labels
const FORM_TYPE_LABELS = {
  PDI: "PDI",
  TEST_DRIVE: "Test Drive",
  WARRANTY_CLAIM: "Warranty Claim",
  COURTESY_OUT: "Courtesy Car Out",
  COURTESY_IN: "Courtesy Car In",
  DELIVERY: "Delivery",
  SERVICE_RECEIPT: "Service Receipt",
  REVIEW_FEEDBACK: "Review & Feedback",
  OTHER: "Other",
};

export default function FillForm() {
  const router = useRouter();
  const { id } = router.query;

  const [form, setForm] = useState(null);
  const [fields, setFields] = useState([]);
  const [formData, setFormData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [submittedId, setSubmittedId] = useState(null);
  const [courtesyVehicles, setCourtesyVehicles] = useState([]);
  const [stockVehicles, setStockVehicles] = useState([]);
  const [stockSearch, setStockSearch] = useState("");
  // Smart VRM lookup state
  const [vrmSuggestions, setVrmSuggestions] = useState([]);
  const [vrmSearchActive, setVrmSearchActive] = useState(false);
  const [vrmLookupConfig, setVrmLookupConfig] = useState(null);
  // Dealer info for token replacement
  const [dealer, setDealer] = useState(null);
  // Licence extraction state
  const [isExtractingLicence, setIsExtractingLicence] = useState(false);
  const [licenceExtracted, setLicenceExtracted] = useState(false);
  const [licenceExtractionError, setLicenceExtractionError] = useState(null);

  useEffect(() => {
    if (id) {
      loadForm();
      loadDealer();
    }
  }, [id]);

  const loadDealer = async () => {
    try {
      const res = await fetch("/api/dealer");
      const data = await res.json();
      setDealer(data);
    } catch (error) {
      console.error("Failed to load dealer:", error);
    }
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

  // Format terms text as bullet list
  const formatTermsAsList = (text) => {
    if (!text) return null;
    const processedText = replaceTokens(text);

    // Split by bullet points, dashes, or numbered items
    const lines = processedText
      .split(/(?:^|\n)(?:•|●|-|\d+\.)\s*/g)
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length <= 1) {
      // If no bullet format detected, try splitting by newlines
      const newlineLines = processedText.split("\n").filter(line => line.trim());
      if (newlineLines.length > 1) {
        return (
          <ul className="list-disc pl-5 space-y-2 text-sm text-base-content/80">
            {newlineLines.map((line, idx) => (
              <li key={idx}>{line.trim().replace(/^[-•●]\s*/, "")}</li>
            ))}
          </ul>
        );
      }
      return <p className="text-sm text-base-content/80 whitespace-pre-wrap">{processedText}</p>;
    }

    return (
      <ul className="list-disc pl-5 space-y-2 text-sm text-base-content/80">
        {lines.map((line, idx) => (
          <li key={idx}>{line}</li>
        ))}
      </ul>
    );
  };

  useEffect(() => {
    if (form?.type === "COURTESY_OUT" || form?.type === "COURTESY_IN") {
      fetchCourtesyVehicles();
    }
    if (form?.type === "TEST_DRIVE") {
      fetchStockVehicles();
    }
    // Get VRM lookup config from templates
    if (form?.type) {
      const template = FORM_TEMPLATES.find(t => t.type === form.type);
      if (template?.vrmLookup) {
        setVrmLookupConfig(template.vrmLookup);
      }
    }
  }, [form?.type]);

  // Initialize default values for time/date fields
  useEffect(() => {
    if (!fields.length) return;
    const now = new Date();
    const updates = {};

    // Test Drive form: default date and time
    if (form?.type === "TEST_DRIVE") {
      const timeField = fields.find(f => f.fieldName === "time" && f.type === "TIME");
      const dateField = fields.find(f => f.fieldName === "date" && f.type === "DATE");

      // Set default time to current time (rounded to nearest 15 min)
      if (timeField && !formData.time) {
        const minutes = Math.round(now.getMinutes() / 15) * 15;
        const hours = now.getHours() + (minutes >= 60 ? 1 : 0);
        const adjustedMinutes = minutes >= 60 ? 0 : minutes;
        updates.time = `${String(hours).padStart(2, "0")}:${String(adjustedMinutes).padStart(2, "0")}`;
      }

      // Set default date to today
      if (dateField && !formData.date) {
        updates.date = now.toISOString().split("T")[0];
      }
    }

    // Service Receipt form: default service_date to today
    if (form?.type === "SERVICE_RECEIPT") {
      const serviceDateField = fields.find(f => f.fieldName === "service_date" && f.type === "DATE");
      if (serviceDateField && !formData.service_date) {
        updates.service_date = now.toISOString().split("T")[0];
      }
    }

    if (Object.keys(updates).length > 0) {
      setFormData(prev => ({ ...prev, ...updates }));
    }
  }, [form?.type, fields]);

  const loadForm = async () => {
    try {
      const res = await fetch(`/api/forms/${id}`);
      const data = await res.json();

      if (!res.ok || data.error) {
        toast.error("Form not found");
        router.push("/forms");
        return;
      }

      setForm(data.form);
      setFields(data.fields || []);
      setIsLoading(false);
    } catch (error) {
      console.error("Failed to load form:", error);
      toast.error("Failed to load form");
      router.push("/forms");
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

  const fetchStockVehicles = async (search = "") => {
    try {
      const res = await fetch(`/api/vehicles/stock?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      setStockVehicles(data);
    } catch (error) {
      console.error("Failed to fetch stock vehicles:", error);
    }
  };

  // Smart VRM search with status filtering
  const searchVehicles = useCallback(async (query) => {
    if (!query || query.length < 2 || !vrmLookupConfig) {
      setVrmSuggestions([]);
      return;
    }

    try {
      const params = new URLSearchParams({ q: query });
      if (vrmLookupConfig.statuses) {
        params.append("statuses", vrmLookupConfig.statuses.join(","));
      }
      if (vrmLookupConfig.vehicleType) {
        params.append("vehicleType", vrmLookupConfig.vehicleType);
      }

      const res = await fetch(`/api/vehicles/search?${params.toString()}`);
      const data = await res.json();
      setVrmSuggestions(data);
    } catch (error) {
      console.error("VRM search error:", error);
    }
  }, [vrmLookupConfig]);

  // Handle vehicle selection from suggestions
  const handleVehicleSelect = (vehicle) => {
    setFormData(prev => ({
      ...prev,
      vrm: vehicle.vrm,
      make: vehicle.make,
      model: vehicle.model,
      colour: vehicle.colour,
      mileage: vehicle.mileage,
      year: vehicle.year,
      vehicle_make: vehicle.make,
      vehicle_model: vehicle.model,
      _selectedVehicle: vehicle,
    }));
    setVrmSuggestions([]);
    setVrmSearchActive(false);
    toast.success(`Selected: ${vehicle.displayName}`);
  };

  const handleInputChange = (fieldName, value) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleVrmLookup = async (fieldName) => {
    const vrm = formData[fieldName];
    if (!vrm) {
      toast.error("Enter a registration number first");
      return;
    }

    setIsLookingUp(true);
    try {
      const res = await fetch("/api/dvla-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleReg: vrm }),
      });
      const data = await res.json();

      if (res.ok && data.make) {
        const updates = {};
        if (data.make) updates.make = data.make;
        if (data.model) updates.model = data.model;
        if (data.year) updates.year = data.year;
        if (data.colour) updates.colour = data.colour;
        if (data.fuelType) updates.fuel_type = data.fuelType;

        setFormData(prev => ({ ...prev, ...updates }));
        toast.success(`Found: ${data.year || ""} ${data.make} ${data.model} - ${data.colour || ""}`);
      } else {
        toast.error("Vehicle not found or lookup failed");
      }
    } catch (error) {
      console.error("DVLA lookup error:", error);
      toast.error("Failed to lookup vehicle");
    } finally {
      setIsLookingUp(false);
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

  const handleStockVehicleSelect = (vehicleId) => {
    const vehicle = stockVehicles.find(v => v.id === vehicleId);
    if (vehicle) {
      setFormData(prev => ({
        ...prev,
        vrm: vehicle.regCurrent,
        vehicle_interest: vehicle.displayName,
        vehicle_id: vehicle.id,
      }));
    }
  };

  // Validation state
  const [validationErrors, setValidationErrors] = useState({});

  // Validate all required fields and return list of errors
  const validateForm = () => {
    const errors = {};
    let firstErrorField = null;

    fields.forEach((field) => {
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

  // Scroll to first error field and highlight it
  const scrollToFirstError = (fieldName) => {
    const element = document.getElementById(`field-${fieldName}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      // Add temporary highlight
      element.classList.add("ring-2", "ring-red-500", "ring-offset-2");
      setTimeout(() => {
        element.classList.remove("ring-2", "ring-red-500", "ring-offset-2");
      }, 3000);
      // Try to focus the input
      const input = element.querySelector("input, select, textarea");
      if (input) {
        setTimeout(() => input.focus(), 500);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    const { errors, firstErrorField, count } = validateForm();
    setValidationErrors(errors);

    if (count > 0) {
      toast.error(`${count} field${count > 1 ? "s" : ""} need${count === 1 ? "s" : ""} attention`, {
        duration: 4000,
        icon: "⚠️",
      });
      scrollToFirstError(firstErrorField);
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/forms/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formId: form.id || form._id,
          rawAnswers: formData,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Submission failed");

      setSubmittedId(data.id || data._id);
      setValidationErrors({});
      toast.success("Form submitted successfully!");
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("Failed to submit form. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitAnother = () => {
    setFormData({});
    setSubmittedId(null);
  };

  const isVrmField = (field) => {
    const vrmFieldNames = ["vrm", "reg", "registration", "vehicle_reg", "regcurrent", "courtesy_vrm"];
    return vrmFieldNames.includes(field.fieldName.toLowerCase()) ||
           field.label.toLowerCase().includes("registration") ||
           field.label.toLowerCase().includes("vrm");
  };

  const isCourtesyVehicleField = (field) => {
    return (form?.type === "COURTESY_OUT" || form?.type === "COURTESY_IN") &&
           (field.fieldName === "courtesy_vrm" || field.label.toLowerCase().includes("courtesy vehicle"));
  };

  const isStockVehicleField = (field) => {
    return form?.type === "TEST_DRIVE" &&
           (field.fieldName === "vrm" || field.fieldName === "vehicle_interest" ||
            field.label.toLowerCase().includes("vehicle of interest"));
  };

  const renderField = (field) => {
    const value = formData[field.fieldName] || "";

    // Special handling for courtesy vehicle selection
    if (isCourtesyVehicleField(field)) {
      return (
        <div className="space-y-2">
          <select
            className="select select-bordered w-full"
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

    // Special handling for stock vehicle selection (test drive)
    if (isStockVehicleField(field)) {
      return (
        <div className="space-y-2">
          <input
            type="text"
            className="input input-bordered w-full"
            placeholder="Search by VRM or Make/Model..."
            value={stockSearch}
            onChange={(e) => {
              setStockSearch(e.target.value);
              fetchStockVehicles(e.target.value);
            }}
          />
          {stockVehicles.length > 0 && stockSearch && (
            <div className="dropdown dropdown-open w-full">
              <ul className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-full max-h-48 overflow-y-auto">
                {stockVehicles.slice(0, 10).map((v) => (
                  <li key={v.id}>
                    <button type="button" onClick={() => {
                      handleStockVehicleSelect(v.id);
                      setStockSearch("");
                    }}>
                      {v.displayName}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {formData.vehicle_interest && (
            <div className="text-sm text-success">Selected: {formData.vehicle_interest}</div>
          )}
        </div>
      );
    }

    // VRM field with smart lookup (autocomplete from database + DVLA fallback)
    if (isVrmField(field) && field.type === "TEXT") {
      return (
        <div className="relative">
          <div className="flex gap-2">
            <input
              type="text"
              className="input input-bordered flex-1 uppercase font-mono"
              value={value}
              onChange={(e) => {
                const newValue = e.target.value.toUpperCase();
                handleInputChange(field.fieldName, newValue);
                // Trigger smart search if VRM lookup is configured
                if (vrmLookupConfig?.enabled !== false) {
                  searchVehicles(newValue);
                  setVrmSearchActive(true);
                }
              }}
              onFocus={() => {
                if (vrmLookupConfig?.enabled !== false && value && value.length >= 2) {
                  searchVehicles(value);
                  setVrmSearchActive(true);
                }
              }}
              onBlur={() => {
                // Delay hiding to allow click on suggestion
                setTimeout(() => setVrmSearchActive(false), 200);
              }}
              required={field.required}
              placeholder={vrmLookupConfig ? "Search or enter VRM..." : "AB12 CDE"}
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleVrmLookup(field.fieldName)}
              disabled={isLookingUp}
              title="DVLA Lookup"
            >
              {isLookingUp ? <span className="loading loading-spinner loading-sm"></span> : "DVLA"}
            </button>
          </div>
          {/* Smart VRM suggestions dropdown */}
          {vrmSearchActive && vrmSuggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              <div className="text-xs text-base-content/60 px-3 py-1 border-b border-base-200 bg-base-200/50">
                Select from your vehicles or press DVLA for external lookup
              </div>
              {vrmSuggestions.map((vehicle) => (
                <button
                  key={vehicle.id}
                  type="button"
                  className="w-full px-3 py-2 text-left hover:bg-primary/10 border-b border-base-200 last:border-0"
                  onClick={() => handleVehicleSelect(vehicle)}
                >
                  <div className="font-mono font-bold">{vehicle.vrm}</div>
                  <div className="text-sm text-base-content/70">
                    {vehicle.make} {vehicle.model} {vehicle.year ? `(${vehicle.year})` : ""} - {vehicle.colour || ""}
                  </div>
                  <div className="text-xs text-base-content/50">
                    Status: {vehicle.status} {vehicle.mileage ? `| ${vehicle.mileage.toLocaleString()} miles` : ""}
                  </div>
                </button>
              ))}
            </div>
          )}
          {/* Show selected vehicle info */}
          {formData._selectedVehicle && (
            <div className="mt-2 text-sm text-success flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Selected: {formData._selectedVehicle.displayName}
            </div>
          )}
        </div>
      );
    }

    // Standard field rendering
    const options = field.options?.values || field.options?.choices || [];
    const placeholder = field.placeholder || "";
    const helpText = field.helpText || "";

    switch (field.type) {
      case "SECTION_HEADER":
        return null; // Section headers are rendered differently

      case "PARAGRAPH":
        return (
          <p className="text-base-content/70 whitespace-pre-wrap">{field.label}</p>
        );

      case "TEXT":
        return (
          <div>
            <input
              type="text"
              className="input input-bordered w-full"
              value={value}
              onChange={(e) => handleInputChange(field.fieldName, e.target.value)}
              required={field.required}
              placeholder={placeholder}
            />
            {helpText && <p className="text-sm text-base-content/60 mt-1">{helpText}</p>}
          </div>
        );

      case "TEXTAREA":
        return (
          <div>
            <textarea
              className="textarea textarea-bordered w-full"
              rows={4}
              value={value}
              onChange={(e) => handleInputChange(field.fieldName, e.target.value)}
              required={field.required}
              placeholder={placeholder}
            />
            {helpText && <p className="text-sm text-base-content/60 mt-1">{helpText}</p>}
          </div>
        );

      case "NUMBER":
        return (
          <div>
            <input
              type="number"
              className="input input-bordered w-full"
              value={value}
              onChange={(e) => handleInputChange(field.fieldName, e.target.value)}
              required={field.required}
              placeholder={placeholder}
            />
            {helpText && <p className="text-sm text-base-content/60 mt-1">{helpText}</p>}
          </div>
        );

      case "DATE":
        return (
          <div>
            <input
              type="date"
              className="input input-bordered w-full"
              value={value}
              onChange={(e) => handleInputChange(field.fieldName, e.target.value)}
              required={field.required}
            />
            {helpText && <p className="text-sm text-base-content/60 mt-1">{helpText}</p>}
          </div>
        );

      case "TIME":
        return (
          <div>
            <input
              type="time"
              className="input input-bordered w-full"
              value={value}
              onChange={(e) => handleInputChange(field.fieldName, e.target.value)}
              required={field.required}
            />
            {helpText && <p className="text-sm text-base-content/60 mt-1">{helpText}</p>}
          </div>
        );

      case "DATETIME":
        return (
          <div>
            <input
              type="datetime-local"
              className="input input-bordered w-full"
              value={value}
              onChange={(e) => handleInputChange(field.fieldName, e.target.value)}
              required={field.required}
            />
            {helpText && <p className="text-sm text-base-content/60 mt-1">{helpText}</p>}
          </div>
        );

      case "DROPDOWN":
        return (
          <div>
            <select
              className="select select-bordered w-full"
              value={value}
              onChange={(e) => handleInputChange(field.fieldName, e.target.value)}
              required={field.required}
            >
              <option value="">Select...</option>
              {options.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            {helpText && <p className="text-sm text-base-content/60 mt-1">{helpText}</p>}
          </div>
        );

      case "RADIO":
        return (
          <div>
            <div className="flex flex-wrap gap-4">
              {options.map((opt) => (
                <label key={opt} className="label cursor-pointer gap-2">
                  <input
                    type="radio"
                    name={field.fieldName}
                    className="radio radio-primary"
                    checked={value === opt}
                    onChange={() => handleInputChange(field.fieldName, opt)}
                    required={field.required && !value}
                  />
                  <span className="label-text">{opt}</span>
                </label>
              ))}
            </div>
            {helpText && <p className="text-sm text-base-content/60 mt-1">{helpText}</p>}
          </div>
        );

      case "BOOLEAN":
        return (
          <div className="form-control">
            <label className="label cursor-pointer justify-start gap-4">
              <input
                type="checkbox"
                className="checkbox checkbox-primary"
                checked={value === true}
                onChange={(e) => handleInputChange(field.fieldName, e.target.checked)}
              />
              <span className="label-text">Yes</span>
            </label>
            {helpText && <p className="text-sm text-base-content/60 mt-1">{helpText}</p>}
          </div>
        );

      case "FILE":
        return (
          <div>
            <input
              type="file"
              className="file-input file-input-bordered w-full"
              multiple
              accept="image/*,.pdf"
              onChange={(e) => {
                const files = Array.from(e.target.files);
                handleInputChange(field.fieldName, files);
              }}
            />
            {helpText && <p className="text-sm text-base-content/60 mt-1">{helpText}</p>}
            {!helpText && <p className="text-sm text-base-content/60 mt-1">Accepts images and PDFs</p>}
            {value && value.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {value.map((file, idx) => (
                  <span key={idx} className="badge badge-ghost">{file.name}</span>
                ))}
              </div>
            )}
          </div>
        );

      case "RATING":
        return (
          <div>
            <div className="rating rating-lg">
              {[1, 2, 3, 4, 5].map((star) => (
                <input
                  key={star}
                  type="radio"
                  name={`rating-${field.fieldName}`}
                  className="mask mask-star-2 bg-orange-400"
                  checked={value === star}
                  onChange={() => handleInputChange(field.fieldName, star)}
                />
              ))}
            </div>
            {helpText && <p className="text-sm text-base-content/60 mt-1">{helpText}</p>}
          </div>
        );

      case "SIGNATURE":
        return (
          <DrawableSignature
            value={value || ""}
            onChange={(signatureData) => handleInputChange(field.fieldName, signatureData)}
            required={field.required}
            label=""
            helpText="Please sign in the box above"
          />
        );

      case "PDI_ISSUES":
        // PDI Issues - repeatable issue entry matching stock board Add Issue modal
        const issues = formData.pdi_issues || [];
        const addIssue = () => {
          setFormData(prev => ({
            ...prev,
            pdi_issues: [...(prev.pdi_issues || []), {
              category: "",
              subcategory: "",
              description: "",
              actionNeeded: "",
              status: "outstanding",
              notes: "",
            }]
          }));
        };
        const updateIssue = (index, key, val) => {
          setFormData(prev => {
            const newIssues = [...(prev.pdi_issues || [])];
            newIssues[index] = { ...newIssues[index], [key]: val };
            return { ...prev, pdi_issues: newIssues };
          });
        };
        const removeIssue = (index) => {
          setFormData(prev => ({
            ...prev,
            pdi_issues: prev.pdi_issues.filter((_, i) => i !== index)
          }));
        };
        // Same categories as stock board Add Issue modal
        const ISSUE_SUBCATEGORIES = {
          mechanical: ["Engine", "Transmission", "Suspension", "Brakes", "Exhaust", "Other"],
          electrical: ["Battery", "Lights", "Starter Motor", "Alternator", "Sensors", "Other"],
          bodywork: ["Panel Damage", "Scratches", "Dents", "Bumper", "Windscreen", "Other"],
          interior: ["Seats", "Dashboard", "Trim", "Carpet", "Controls", "Other"],
          tyres: ["Tread Depth", "Puncture", "Alloys", "Alignment", "Other"],
          mot: ["Advisory", "Failed Item", "Due Soon", "Other"],
          service: ["Oil Change", "Filters", "Fluids", "Timing Belt", "Other"],
          fault_codes: ["Engine", "Transmission", "ABS", "Airbag", "Emissions", "Other"],
          other: ["General", "Misc"],
        };

        return (
          <div className="space-y-4">
            {issues.map((issue, idx) => (
              <div key={idx} className="bg-base-200 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-sm">Issue #{idx + 1}</span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs text-error"
                    onClick={() => removeIssue(idx)}
                  >
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="form-control">
                    <label className="label py-1"><span className="label-text text-xs">Category *</span></label>
                    <select
                      className="select select-bordered select-sm w-full"
                      value={issue.category}
                      onChange={(e) => {
                        updateIssue(idx, "category", e.target.value);
                        updateIssue(idx, "subcategory", "");
                      }}
                      required
                    >
                      <option value="">Select category...</option>
                      <option value="mechanical">Mechanical</option>
                      <option value="electrical">Electrical</option>
                      <option value="bodywork">Bodywork</option>
                      <option value="interior">Interior</option>
                      <option value="tyres">Tyres</option>
                      <option value="mot">MOT</option>
                      <option value="service">Service</option>
                      <option value="fault_codes">Fault Codes</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  {issue.category && (
                    <div className="form-control">
                      <label className="label py-1"><span className="label-text text-xs">Subcategory</span></label>
                      <select
                        className="select select-bordered select-sm w-full"
                        value={issue.subcategory}
                        onChange={(e) => updateIssue(idx, "subcategory", e.target.value)}
                      >
                        <option value="">Select subcategory...</option>
                        {(ISSUE_SUBCATEGORIES[issue.category] || []).map(sub => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <div className="form-control">
                  <label className="label py-1"><span className="label-text text-xs">Description *</span></label>
                  <textarea
                    className="textarea textarea-bordered textarea-sm w-full"
                    rows={3}
                    placeholder="Describe the issue..."
                    value={issue.description}
                    onChange={(e) => updateIssue(idx, "description", e.target.value)}
                    required
                  />
                </div>
                <div className="form-control">
                  <label className="label py-1"><span className="label-text text-xs">Action Needed</span></label>
                  <input
                    type="text"
                    className="input input-bordered input-sm w-full"
                    placeholder="What needs to be done?"
                    value={issue.actionNeeded || ""}
                    onChange={(e) => updateIssue(idx, "actionNeeded", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="form-control">
                    <label className="label py-1"><span className="label-text text-xs">Status</span></label>
                    <select
                      className="select select-bordered select-sm w-full"
                      value={issue.status || "outstanding"}
                      onChange={(e) => updateIssue(idx, "status", e.target.value)}
                    >
                      <option value="outstanding">Outstanding</option>
                      <option value="ordered">Ordered</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>
                </div>
                <div className="form-control">
                  <label className="label py-1"><span className="label-text text-xs">Notes</span></label>
                  <textarea
                    className="textarea textarea-bordered textarea-sm w-full"
                    rows={2}
                    placeholder="Additional notes..."
                    value={issue.notes || ""}
                    onChange={(e) => updateIssue(idx, "notes", e.target.value)}
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              className="btn btn-outline btn-primary w-full"
              onClick={addIssue}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Issue
            </button>
          </div>
        );

      case "LICENCE_SCAN":
        // Licence scan with OCR extraction
        const handleLicenceCapture = async (file) => {
          if (!file) return;

          setIsExtractingLicence(true);
          setLicenceExtractionError(null);
          setLicenceExtracted(false);

          try {
            // Convert file to base64
            const reader = new FileReader();
            reader.onload = async () => {
              const base64 = reader.result.split(",")[1]; // Remove data URL prefix
              const mimeType = file.type || "image/jpeg";

              // Store the image in form data
              handleInputChange(field.fieldName, [file]);

              // Call extraction API
              const res = await fetch("/api/forms/test-drive/extract-licence", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image: base64, mimeType }),
              });

              const data = await res.json();

              if (data.ok && data.data) {
                // Auto-fill form fields from extracted data
                const extracted = data.data;
                const updates = {};

                // Map extracted fields to form field names using autoFillFromLicence config
                fields.forEach((f) => {
                  if (f.autoFillFromLicence && extracted[f.autoFillFromLicence]) {
                    updates[f.fieldName] = extracted[f.autoFillFromLicence];
                  }
                });

                // Apply all updates at once
                if (Object.keys(updates).length > 0) {
                  setFormData((prev) => ({ ...prev, ...updates }));
                  setLicenceExtracted(true);
                  toast.success("Details captured from licence - please verify");
                } else {
                  setLicenceExtractionError("Could not extract details. Please enter manually.");
                }
              } else {
                setLicenceExtractionError(data.error || "Could not extract details. Please enter manually.");
              }

              setIsExtractingLicence(false);
            };

            reader.onerror = () => {
              setLicenceExtractionError("Failed to read file. Please try again.");
              setIsExtractingLicence(false);
            };

            reader.readAsDataURL(file);
          } catch (error) {
            console.error("Licence extraction error:", error);
            setLicenceExtractionError("Failed to process licence. Please enter details manually.");
            setIsExtractingLicence(false);
          }
        };

        const clearLicenceData = () => {
          // Clear the licence photo and reset extraction state
          handleInputChange(field.fieldName, null);
          setLicenceExtracted(false);
          setLicenceExtractionError(null);

          // Clear auto-filled fields
          const fieldsToClear = {};
          fields.forEach((f) => {
            if (f.autoFillFromLicence) {
              fieldsToClear[f.fieldName] = "";
            }
          });
          setFormData((prev) => ({ ...prev, ...fieldsToClear }));
        };

        return (
          <div className="space-y-3">
            {/* Success banner */}
            {licenceExtracted && (
              <div className="alert alert-success shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="font-bold text-sm">Details captured from licence</h3>
                  <p className="text-xs">Please verify the information below is correct</p>
                </div>
                <button type="button" className="btn btn-ghost btn-xs" onClick={clearLicenceData}>
                  Clear
                </button>
              </div>
            )}

            {/* Error banner */}
            {licenceExtractionError && (
              <div className="alert alert-warning shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-sm">{licenceExtractionError}</span>
              </div>
            )}

            {/* File input with camera option */}
            <div className="flex flex-col sm:flex-row gap-2">
              <label className="flex-1 cursor-pointer">
                <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors ${
                  isExtractingLicence ? "border-primary bg-primary/5" :
                  value && value.length > 0 ? "border-success bg-success/5" :
                  "border-base-300 hover:border-primary hover:bg-primary/5"
                }`}>
                  {isExtractingLicence ? (
                    <div className="flex flex-col items-center gap-2">
                      <span className="loading loading-spinner loading-md text-primary"></span>
                      <span className="text-sm text-primary">Extracting details...</span>
                    </div>
                  ) : value && value.length > 0 ? (
                    <div className="flex flex-col items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm text-success font-medium">Photo captured</span>
                      <span className="text-xs text-base-content/60">{value[0]?.name || "licence_photo.jpg"}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-base-content/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-sm font-medium">Take photo or upload</span>
                      <span className="text-xs text-base-content/60">Tap to capture your driving licence</span>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleLicenceCapture(file);
                    }
                  }}
                  disabled={isExtractingLicence}
                />
              </label>
            </div>

            {helpText && <p className="text-sm text-base-content/60">{helpText}</p>}
          </div>
        );

      default:
        return (
          <input
            type="text"
            className="input input-bordered w-full"
            value={value}
            onChange={(e) => handleInputChange(field.fieldName, e.target.value)}
            required={field.required}
            placeholder={placeholder}
          />
        );
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-20">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </DashboardLayout>
    );
  }

  // Success state after submission
  if (submittedId) {
    return (
      <DashboardLayout>
        <Head>
          <title>Form Submitted | DealerFlow</title>
        </Head>

        <div className="max-w-2xl mx-auto py-12">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body text-center">
              <div className="text-6xl mb-4">✓</div>
              <h2 className="card-title justify-center text-2xl mb-2">Thank You!</h2>
              <p className="text-base-content/70 mb-6">
                Your submission was successful.
              </p>

              <div className="flex flex-wrap justify-center gap-3">
                <button
                  className="btn btn-primary"
                  onClick={handleSubmitAnother}
                >
                  Submit Another
                </button>
                <Link
                  href={`/forms?tab=submissions`}
                  className="btn btn-outline"
                >
                  View in Inbox
                </Link>
                <Link
                  href="/dashboard"
                  className="btn btn-ghost"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Head>
        <title>{form?.name || "Fill Form"} | DealerFlow</title>
      </Head>

      {/* Header - Special layout for Service Receipt */}
      {form?.type === "SERVICE_RECEIPT" ? (
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-base-content/60 mb-2">
            <Link href="/forms" className="hover:text-primary">Forms</Link>
            <span>/</span>
            <span>Fill Out</span>
          </div>
          <div className="card bg-base-100 shadow-xl mb-6">
            <div className="card-body pb-4">
              {dealer?.logoUrl && (
                <div className="flex justify-center mb-2">
                  <img src={dealer.logoUrl} alt={dealer.name} className="h-16 w-auto object-contain" />
                </div>
              )}
              <h1 className="text-2xl font-bold text-center uppercase">Service Receipt</h1>
              {(dealer?.companyAddress || dealer?.companyPhone) && (
                <p className="text-base-content/60 text-center text-sm">
                  {[dealer?.companyAddress, dealer?.companyPhone].filter(Boolean).join(" | ")}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-base-content/60 mb-2">
            <Link href="/forms" className="hover:text-primary">Forms</Link>
            <span>/</span>
            <span>Fill Out</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">{form?.name}</h1>
              {dealer?.companyAddress && (
                <p className="text-base-content/60 mt-1 text-sm">{dealer.companyAddress}</p>
              )}
              <div className="badge badge-outline mt-2">
                {FORM_TYPE_LABELS[form?.type] || form?.type}
              </div>
            </div>
            <div className="flex items-center gap-4">
              {dealer?.logoUrl && (
                <img src={dealer.logoUrl} alt={dealer.name} className="h-12 w-auto object-contain" />
              )}
              <Link href="/forms" className="btn btn-ghost">
                Cancel
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="max-w-3xl">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body space-y-6">
            {(() => {
              // Group fields by gridGroup for side-by-side rendering
              // Filter out fields with visible: false
              const visibleFields = fields.filter(f => f.visible !== false);
              const renderedGroups = new Set();
              return visibleFields.map((field, index) => {
                // If this field is part of a gridGroup and we've already rendered it, skip
                if (field.gridGroup && renderedGroups.has(field.gridGroup)) {
                  return null;
                }

                // SECTION_HEADER renders as a divider
                if (field.type === "SECTION_HEADER") {
                  // Skip empty section headers
                  if (!field.label) {
                    return (
                      <div key={field.id || field._id || index} className="border-t border-base-200 mt-4 pt-4" />
                    );
                  }
                  // Check if this is the Terms section - render terms text from template
                  if (field.fieldName === "_section_terms" && form?.type) {
                    const template = FORM_TEMPLATES.find(t => t.type === form.type);
                    if (template?.termsText) {
                      return (
                        <div key={field.id || field._id || index} className={index > 0 ? "pt-4 mt-4 border-t border-base-200" : ""}>
                          <h3 className={`text-lg font-bold text-primary mb-4 ${field.uppercase ? "uppercase" : ""}`}>{field.label}</h3>
                          <div className="bg-base-200/50 rounded-lg p-4">
                            {formatTermsAsList(template.termsText)}
                          </div>
                        </div>
                      );
                    }
                  }
                  return (
                    <div key={field.id || field._id || index} className={index > 0 ? "pt-4 mt-4 border-t border-base-200" : ""}>
                      <h3 className={`text-lg font-bold text-primary ${field.uppercase ? "uppercase" : ""}`}>{field.label}</h3>
                    </div>
                  );
                }

                // PARAGRAPH renders as text with token replacement
                if (field.type === "PARAGRAPH") {
                  return (
                    <div key={field.id || field._id || index} className="text-base-content/70 whitespace-pre-wrap text-sm leading-relaxed">
                      {replaceTokens(field.label)}
                    </div>
                  );
                }

                // Handle gridGroup - render multiple fields side by side
                if (field.gridGroup) {
                  renderedGroups.add(field.gridGroup);
                  const groupFields = visibleFields.filter(f => f.gridGroup === field.gridGroup);

                  return (
                    <div key={field.gridGroup} className="grid grid-cols-2 gap-4">
                      {groupFields.map((gField) => {
                        const hasError = validationErrors[gField.fieldName];
                        return (
                          <div
                            key={gField.id || gField._id || gField.fieldName}
                            id={`field-${gField.fieldName}`}
                            className={`form-control transition-all rounded-lg ${hasError ? "bg-red-50 p-3 -m-3 ring-2 ring-red-200" : ""}`}
                          >
                            <label className="label">
                              <span className={`label-text font-semibold ${gField.uppercase ? "uppercase" : ""}`}>
                                {gField.label}
                                {gField.required && <span className="text-error ml-1">*</span>}
                              </span>
                            </label>
                            {renderField(gField)}
                            {hasError && (
                              <label className="label">
                                <span className="label-text-alt text-error">{hasError}</span>
                              </label>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                }

                // Normal form fields
                const hasError = validationErrors[field.fieldName];
                return (
                  <div
                    key={field.id || field._id || index}
                    id={`field-${field.fieldName}`}
                    className={`form-control transition-all rounded-lg ${hasError ? "bg-red-50 p-3 -m-3 ring-2 ring-red-200" : ""}`}
                  >
                    <label className="label">
                      <span className={`label-text font-semibold ${field.uppercase ? "uppercase" : ""}`}>
                        {field.label}
                        {field.required && <span className="text-error ml-1">*</span>}
                      </span>
                    </label>
                    {renderField(field)}
                    {hasError && (
                      <label className="label">
                        <span className="label-text-alt text-error">{hasError}</span>
                      </label>
                    )}
                  </div>
                );
              });
            })()}

            {fields.filter(f => f.visible !== false).length === 0 && (
              <div className="text-center py-8 text-base-content/60">
                This form has no visible fields configured yet.
              </div>
            )}

            <div className="card-actions justify-end mt-8 pt-4 border-t border-base-200">
              <Link href="/forms" className="btn btn-ghost">
                Cancel
              </Link>
              <button
                type="submit"
                className="btn btn-primary btn-lg"
                disabled={isSubmitting || fields.length === 0}
              >
                {isSubmitting ? (
                  <>
                    <span className="loading loading-spinner"></span>
                    Submitting...
                  </>
                ) : (
                  "Submit Form"
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </DashboardLayout>
  );
}
