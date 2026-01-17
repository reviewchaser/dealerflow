import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import connectMongo from "@/libs/mongoose";
import Form from "@/models/Form";
import FormField from "@/models/FormField";
import Dealer from "@/models/Dealer";
import toast from "react-hot-toast";

// Dynamic import for signature pad (client-side only)
const DrawableSignature = dynamic(() => import("@/components/DrawableSignature"), {
  ssr: false,
  loading: () => <div className="h-[150px] bg-base-200 rounded-lg animate-pulse" />
});

export default function PublicForm({ form, fields, dealer }) {
  const router = useRouter();
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]); // Track uploaded files for submission
  const [uploadingField, setUploadingField] = useState(null); // Track which field is currently uploading
  const [courtesyVehicles, setCourtesyVehicles] = useState([]);
  const [stockVehicles, setStockVehicles] = useState([]);
  const [stockSearch, setStockSearch] = useState("");
  const [showNoCourtesyVehicles, setShowNoCourtesyVehicles] = useState(false);
  const [selectedFromStock, setSelectedFromStock] = useState(false);
  const [manualVrmEntry, setManualVrmEntry] = useState(false);
  // VRM suggestions for PDI/Delivery forms
  const [vrmSuggestions, setVrmSuggestions] = useState([]);
  const [vrmSearchActive, setVrmSearchActive] = useState(false);
  // Licence extraction state
  const [isExtractingLicence, setIsExtractingLicence] = useState(false);
  const [licenceExtracted, setLicenceExtracted] = useState(false);
  const [licenceExtractionError, setLicenceExtractionError] = useState(null);

  // Load courtesy vehicles for courtesy car forms
  useEffect(() => {
    if (form?.type === "COURTESY_OUT" || form?.type === "COURTESY_IN") {
      fetchCourtesyVehicles();
    }
    if (form?.type === "TEST_DRIVE") {
      fetchStockVehicles();
    }
  }, [form?.type]);

  // Selected deal info for delivery forms
  const [selectedDealInfo, setSelectedDealInfo] = useState(null);

  // Signature state for delivery forms (invoice signing)
  const [deliverySignature, setDeliverySignature] = useState(null);
  const [signerName, setSignerName] = useState("");

  // Search vehicles for VRM suggestions (PDI/Delivery)
  const searchVrmVehicles = async (query) => {
    if (!query || query.length < 2) {
      setVrmSuggestions([]);
      return;
    }
    try {
      const params = new URLSearchParams({ q: query });
      if (form?.type === "PDI") {
        params.append("statuses", "IN_PREP,ADVERTISED");
      } else if (form?.type === "DELIVERY") {
        // For delivery forms, only show vehicles with active deals that have delivery
        params.append("hasDelivery", "true");
        params.append("includeDealInfo", "true");
      }
      const res = await fetch(`/api/vehicles/search?${params.toString()}`);
      const data = await res.json();
      setVrmSuggestions(data);
    } catch (error) {
      console.error("VRM search error:", error);
    }
  };

  // Handle vehicle selection from VRM suggestions
  const handleVrmVehicleSelect = (vehicle) => {
    setFormData(prev => ({
      ...prev,
      vrm: vehicle.vrm || vehicle.regCurrent,
      make: vehicle.make,
      model: vehicle.model,
      colour: vehicle.colour,
      mileage: vehicle.mileage,
      _selectedVehicleId: vehicle.id,
      _dealId: vehicle.deal?.dealId,
    }));
    // Store deal info for delivery forms
    if (vehicle.deal) {
      setSelectedDealInfo(vehicle.deal);
    }
    setVrmSuggestions([]);
    setVrmSearchActive(false);
    setSelectedFromStock(true);
    toast.success(`Selected: ${vehicle.make} ${vehicle.model} (${vehicle.vrm || vehicle.regCurrent})`);
  };

  const fetchCourtesyVehicles = async () => {
    try {
      const res = await fetch("/api/vehicles/courtesy");
      const data = await res.json();
      setCourtesyVehicles(data);
      if (data.length === 0) {
        setShowNoCourtesyVehicles(true);
      }
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

  // Initialize default values for time fields (Test Drive and Delivery forms)
  useEffect(() => {
    if ((form?.type === "TEST_DRIVE" || form?.type === "DELIVERY") && fields.length > 0) {
      const now = new Date();
      const timeField = fields.find(f => f.type === "TIME");
      const dateField = fields.find(f => f.type === "DATE");

      const updates = {};

      // Set default time to current time (rounded to nearest 15 min)
      if (timeField && !formData[timeField.fieldName]) {
        const minutes = Math.round(now.getMinutes() / 15) * 15;
        const hours = now.getHours() + (minutes >= 60 ? 1 : 0);
        const adjustedMinutes = minutes >= 60 ? 0 : minutes;
        updates[timeField.fieldName] = `${String(hours).padStart(2, "0")}:${String(adjustedMinutes).padStart(2, "0")}`;
      }

      // Set default date to today
      if (dateField && !formData[dateField.fieldName]) {
        updates[dateField.fieldName] = now.toISOString().split("T")[0];
      }

      if (Object.keys(updates).length > 0) {
        setFormData(prev => ({ ...prev, ...updates }));
      }
    }
  }, [form?.type, fields]);

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

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Form Not Found</h1>
          <p className="text-base-content/60">This form does not exist or is not publicly available.</p>
        </div>
      </div>
    );
  }

  // Show no courtesy vehicles message
  if (showNoCourtesyVehicles && (form.type === "COURTESY_OUT" || form.type === "COURTESY_IN")) {
    return (
      <>
        <Head><title>{form.name} | DealerHQ</title></Head>
        <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
          <div className="card bg-base-100 shadow-xl max-w-md">
            <div className="card-body text-center">
              <h2 className="card-title justify-center text-xl mb-2">No Courtesy Vehicles Set Up</h2>
              <p className="text-base-content/70 mb-4">
                You need at least one vehicle marked as a courtesy car to use this form.
              </p>
              <p className="text-sm text-base-content/60">
                Go to Sales & Prep and add a vehicle with type "Courtesy" to get started.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

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
        // Auto-fill related fields if they exist in the form
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
        vehicle_make: vehicle.make,
        vehicle_model: vehicle.model,
        vehicle_interest: vehicle.displayName,
        vehicle_id: vehicle.id,
      }));
      setSelectedFromStock(true);
    }
  };

  // Check if a field should be hidden when vehicle is selected from stock
  const shouldHideField = (field) => {
    // Show make/model fields only if manual entry is enabled or no stock selection
    if (manualVrmEntry) return false; // Show all fields for manual entry
    if (!selectedFromStock) return false;
    // Hide make/model fields when vehicle selected from stock (for TEST_DRIVE, PDI, DELIVERY)
    const hideFields = ["vehicle_make", "vehicle_model", "make", "model"];
    return hideFields.includes(field.fieldName);
  };

  // Upload file to server and return URL
  const handleFileUpload = async (file, fieldName) => {
    setUploadingField(fieldName);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append("file", file);

      const res = await fetch("/api/vehicles/upload", {
        method: "POST",
        body: formDataUpload,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }

      const data = await res.json();

      // Store S3 key (permanent) for database, signed URL for preview
      const storageKey = data.key || data.url; // Key for database storage
      const previewUrl = data.url; // Signed URL for immediate preview

      // Store file metadata for submission (use key for permanent storage)
      setUploadedFiles((prev) => [
        ...prev.filter((f) => f.fieldName !== fieldName), // Replace if same field
        {
          fieldName,
          url: storageKey, // Store key in database
          key: data.key, // S3 key for signed URL regeneration
          previewUrl: previewUrl, // Signed URL for preview
          filename: data.filename || file.name,
          mimeType: data.type || file.type,
          size: data.size || file.size,
        },
      ]);

      // Store URL/key in formData for database storage (use key, not signed URL)
      handleInputChange(fieldName, storageKey);
      toast.success("File uploaded");
      return previewUrl; // Return preview URL for immediate display
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload file");
      return null;
    } finally {
      setUploadingField(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate signature for delivery forms with unsigned invoices
    if (form?.type === "DELIVERY" && selectedDealInfo && !selectedDealInfo.isInvoiceSigned) {
      if (!deliverySignature) {
        toast.error("Customer signature is required to confirm delivery and sign the invoice");
        return;
      }
      if (!signerName.trim()) {
        toast.error("Please enter the customer's full name");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Build submission data
      const submissionData = {
        formId: form._id,
        rawAnswers: formData,
        files: uploadedFiles,
      };

      // Include signature data for delivery forms
      if (form?.type === "DELIVERY" && deliverySignature) {
        submissionData.invoiceSignature = {
          signatureData: deliverySignature,
          signerName: signerName.trim(),
        };
      }

      const res = await fetch("/api/forms/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submissionData),
      });

      if (!res.ok) throw new Error("Submission failed");

      toast.success("Form submitted successfully!");
      setFormData({});
      setUploadedFiles([]);

      setTimeout(() => {
        router.push("/public/forms/thank-you");
      }, 1500);
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("Failed to submit form. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if field is a VRM/registration field
  const isVrmField = (field) => {
    const vrmFieldNames = ["vrm", "reg", "registration", "vehicle_reg", "regcurrent", "courtesy_vrm"];
    return vrmFieldNames.includes(field.fieldName.toLowerCase()) ||
           field.label.toLowerCase().includes("registration") ||
           field.label.toLowerCase().includes("vrm");
  };

  // Check if field is a courtesy vehicle selection field
  const isCourtesyVehicleField = (field) => {
    return (form.type === "COURTESY_OUT" || form.type === "COURTESY_IN") &&
           (field.fieldName === "courtesy_vrm" || field.label.toLowerCase().includes("courtesy vehicle"));
  };

  // Check if field is a stock vehicle selection field (for test drive)
  const isStockVehicleField = (field) => {
    return form.type === "TEST_DRIVE" &&
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
      // If vehicle already selected from stock, show summary
      if (selectedFromStock && formData.vehicle_interest) {
        return (
          <div className="space-y-2">
            <div className="bg-success/10 border border-success/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-success mb-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-semibold">Vehicle Selected</span>
              </div>
              <p className="text-base-content font-medium">{formData.vehicle_interest}</p>
              {formData.vrm && (
                <p className="text-sm text-base-content/70 font-mono">{formData.vrm}</p>
              )}
              <button
                type="button"
                className="btn btn-sm btn-ghost text-primary mt-2"
                onClick={() => {
                  setSelectedFromStock(false);
                  setManualVrmEntry(false);
                  setFormData(prev => ({
                    ...prev,
                    vrm: "",
                    vehicle_make: "",
                    vehicle_model: "",
                    vehicle_interest: "",
                    vehicle_id: "",
                  }));
                }}
              >
                Change Vehicle
              </button>
            </div>
          </div>
        );
      }

      // Manual VRM entry mode - show plain text input
      if (manualVrmEntry) {
        return (
          <div className="space-y-2">
            <input
              type="text"
              className="input input-bordered w-full uppercase font-mono"
              placeholder="Enter registration (e.g. AB12 CDE)"
              value={formData.vrm || ""}
              onChange={(e) => handleInputChange("vrm", e.target.value.toUpperCase())}
              required={field.required}
            />
            <div className="text-xs text-base-content/60">
              <button
                type="button"
                className="link link-primary"
                onClick={() => {
                  setManualVrmEntry(false);
                  setFormData(prev => ({ ...prev, vrm: "", vehicle_make: "", vehicle_model: "" }));
                }}
              >
                ← Search from our stock instead
              </button>
            </div>
          </div>
        );
      }

      // Stock search mode
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
          <div className="text-xs text-base-content/60">
            <button
              type="button"
              className="link link-primary"
              onClick={() => {
                setManualVrmEntry(true);
                setStockSearch("");
              }}
            >
              Vehicle not listed? Enter registration manually
            </button>
          </div>
        </div>
      );
    }

    // VRM field with suggestions for PDI/Delivery, lookup button for others
    if (isVrmField(field) && field.type === "TEXT") {
      const showVrmSuggestions = form?.type === "PDI" || form?.type === "DELIVERY";

      // Show selected vehicle info if vehicle was selected from suggestions
      if (showVrmSuggestions && selectedFromStock && formData._selectedVehicleId) {
        return (
          <div className="space-y-3">
            <div className="bg-success/10 border border-success/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-success mb-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-semibold">Vehicle Selected</span>
              </div>
              <p className="font-mono font-bold text-lg">{formData.vrm}</p>
              {formData.make && formData.model && (
                <p className="text-sm text-base-content/70">{formData.make} {formData.model}</p>
              )}
              <button
                type="button"
                className="btn btn-sm btn-ghost text-primary mt-2"
                onClick={() => {
                  setSelectedFromStock(false);
                  setSelectedDealInfo(null);
                  setFormData(prev => ({
                    ...prev,
                    vrm: "",
                    make: "",
                    model: "",
                    colour: "",
                    mileage: "",
                    _selectedVehicleId: "",
                    _dealId: "",
                  }));
                }}
              >
                Change Vehicle
              </button>
            </div>

            {/* Deal Info for Delivery Forms */}
            {form?.type === "DELIVERY" && selectedDealInfo && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="font-semibold text-blue-800">Deal Information</span>
                  <span className={`badge badge-sm ${
                    selectedDealInfo.dealStatus === "INVOICED" ? "badge-success" :
                    selectedDealInfo.dealStatus === "DEPOSIT_TAKEN" ? "badge-warning" : "badge-ghost"
                  }`}>
                    {selectedDealInfo.dealStatus?.replace("_", " ")}
                  </span>
                  {/* Invoice Signing Status Badge */}
                  {selectedDealInfo.dealStatus === "INVOICED" && (
                    <span className={`badge badge-sm ${selectedDealInfo.isInvoiceSigned ? "badge-success" : "badge-warning"}`}>
                      {selectedDealInfo.isInvoiceSigned ? "Invoice Signed" : "Unsigned"}
                    </span>
                  )}
                </div>

                {/* Customer Info */}
                <div className="text-sm">
                  <p className="text-blue-700 font-medium">{selectedDealInfo.customerName}</p>
                  {selectedDealInfo.customerPhone && (
                    <p className="text-blue-600">{selectedDealInfo.customerPhone}</p>
                  )}
                  {selectedDealInfo.deliveryAddress && (
                    <div className="mt-2 text-blue-600">
                      <p className="text-xs font-medium text-blue-700">Delivery Address:</p>
                      <p>{selectedDealInfo.deliveryAddress.line1}</p>
                      {selectedDealInfo.deliveryAddress.line2 && <p>{selectedDealInfo.deliveryAddress.line2}</p>}
                      <p>{selectedDealInfo.deliveryAddress.town} {selectedDealInfo.deliveryAddress.postcode}</p>
                    </div>
                  )}
                </div>

                {/* Invoice Link if status is INVOICED */}
                {selectedDealInfo.dealStatus === "INVOICED" && selectedDealInfo.invoiceUrl && (
                  <div className="pt-2 border-t border-blue-200">
                    <a
                      href={selectedDealInfo.invoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white border-none"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      View Invoice {selectedDealInfo.invoiceNumber && `(${selectedDealInfo.invoiceNumber})`}
                    </a>
                  </div>
                )}

                {/* Invoice Signature Required */}
                {selectedDealInfo.dealStatus === "INVOICED" && !selectedDealInfo.isInvoiceSigned && (
                  <div className="pt-3 border-t border-blue-200 space-y-3">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-sm text-amber-800 font-medium">
                        Invoice requires customer signature
                      </p>
                      <p className="text-xs text-amber-700 mt-1">
                        Customer signature below confirms delivery AND acceptance of invoice.
                      </p>
                    </div>

                    {/* Customer Name Input */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Customer Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className="input input-bordered w-full"
                        value={signerName}
                        onChange={(e) => setSignerName(e.target.value)}
                        placeholder="Enter customer's full name"
                        required
                      />
                    </div>

                    {/* Signature Capture */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Customer Signature <span className="text-red-500">*</span>
                      </label>
                      <DrawableSignature
                        value={deliverySignature}
                        onChange={setDeliverySignature}
                        label="Customer Signature (confirms delivery AND invoice)"
                      />
                    </div>
                  </div>
                )}

                {/* Already Signed Notice */}
                {selectedDealInfo.dealStatus === "INVOICED" && selectedDealInfo.isInvoiceSigned && (
                  <div className="pt-2 border-t border-blue-200">
                    <p className="text-xs text-emerald-700 bg-emerald-50 rounded px-2 py-1 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Invoice has been signed - delivery confirmation only
                    </p>
                  </div>
                )}

                {/* Warning if not yet invoiced */}
                {selectedDealInfo.dealStatus === "DEPOSIT_TAKEN" && (
                  <div className="pt-2 border-t border-blue-200">
                    <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">
                      ⚠️ Invoice not yet generated - please generate invoice before delivery
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      }

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
                // Trigger VRM suggestions for PDI/Delivery
                if (showVrmSuggestions) {
                  searchVrmVehicles(newValue);
                  setVrmSearchActive(true);
                }
              }}
              onFocus={() => {
                if (showVrmSuggestions && value && value.length >= 2) {
                  searchVrmVehicles(value);
                  setVrmSearchActive(true);
                }
              }}
              onBlur={() => {
                // Delay hiding to allow click on suggestion
                setTimeout(() => setVrmSearchActive(false), 200);
              }}
              required={field.required}
              placeholder={showVrmSuggestions ? "Search or enter VRM..." : "AB12 CDE"}
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleVrmLookup(field.fieldName)}
              disabled={isLookingUp}
              title="DVLA Lookup"
            >
              {isLookingUp ? <span className="loading loading-spinner loading-sm"></span> : "Lookup"}
            </button>
          </div>
          {/* VRM suggestions dropdown for PDI/Delivery */}
          {showVrmSuggestions && vrmSearchActive && vrmSuggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              <div className="text-xs text-base-content/60 px-3 py-1 border-b border-base-200 bg-base-200/50">
                {form?.type === "DELIVERY" ? "Vehicles with scheduled delivery" : "Select from stock or use Lookup for external search"}
              </div>
              {vrmSuggestions.map((vehicle) => (
                <button
                  key={vehicle.id}
                  type="button"
                  className="w-full px-3 py-2 text-left hover:bg-primary/10 border-b border-base-200 last:border-0"
                  onClick={() => handleVrmVehicleSelect(vehicle)}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold">{vehicle.vrm || vehicle.regCurrent}</span>
                    {vehicle.deal && (
                      <span className={`badge badge-xs ${
                        vehicle.deal.dealStatus === "INVOICED" ? "badge-success" :
                        vehicle.deal.dealStatus === "DEPOSIT_TAKEN" ? "badge-warning" : "badge-ghost"
                      }`}>
                        {vehicle.deal.dealStatus?.replace("_", " ")}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-base-content/70">
                    {vehicle.make} {vehicle.model} {vehicle.year ? `(${vehicle.year})` : ""} - {vehicle.colour || ""}
                  </div>
                  {vehicle.deal?.customerName && (
                    <div className="text-xs text-blue-600 mt-0.5">
                      Customer: {vehicle.deal.customerName}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Standard field rendering
    switch (field.type) {
      case "TEXT":
        return (
          <input
            type="text"
            className="input input-bordered w-full"
            value={value}
            onChange={(e) => handleInputChange(field.fieldName, e.target.value)}
            required={field.required}
          />
        );

      case "TEXTAREA":
        return (
          <textarea
            className="textarea textarea-bordered w-full"
            rows={4}
            value={value}
            onChange={(e) => handleInputChange(field.fieldName, e.target.value)}
            required={field.required}
          />
        );

      case "NUMBER":
        return (
          <input
            type="number"
            className="input input-bordered w-full"
            value={value}
            onChange={(e) => handleInputChange(field.fieldName, e.target.value)}
            required={field.required}
          />
        );

      case "DATE":
        return (
          <input
            type="date"
            className="input input-bordered w-full"
            value={value}
            onChange={(e) => handleInputChange(field.fieldName, e.target.value)}
            required={field.required}
          />
        );

      case "DATETIME":
        return (
          <input
            type="datetime-local"
            className="input input-bordered w-full"
            value={value}
            onChange={(e) => handleInputChange(field.fieldName, e.target.value)}
            required={field.required}
          />
        );

      case "TIME":
        return (
          <input
            type="time"
            className="input input-bordered w-full"
            value={value}
            onChange={(e) => handleInputChange(field.fieldName, e.target.value)}
            required={field.required}
          />
        );

      case "DROPDOWN":
        const dropdownOptions = field.options?.values || field.options?.choices || [];
        return (
          <select
            className="select select-bordered w-full"
            value={value}
            onChange={(e) => handleInputChange(field.fieldName, e.target.value)}
            required={field.required}
          >
            <option value="">Select...</option>
            {dropdownOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );

      case "RADIO":
        const radioOptions = field.options?.values || field.options?.choices || [];
        return (
          <div className="flex flex-wrap gap-4">
            {radioOptions.map((opt) => (
              <label key={opt} className="label cursor-pointer gap-2">
                <input
                  type="radio"
                  name={field.fieldName}
                  className="radio radio-primary"
                  value={opt}
                  checked={value === opt}
                  onChange={(e) => handleInputChange(field.fieldName, e.target.value)}
                  required={field.required && !value}
                />
                <span className="label-text">{opt}</span>
              </label>
            ))}
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
          </div>
        );

      case "RATING":
        return (
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
        );

      case "FILE":
        const isUploading = uploadingField === field.fieldName;
        // Get the uploaded file info - use previewUrl for display, not the storage key
        const uploadedFileInfo = uploadedFiles.find(f => f.fieldName === field.fieldName);
        const displayUrl = uploadedFileInfo?.previewUrl || uploadedFileInfo?.url;
        const hasUpload = !!displayUrl;
        const isImage = displayUrl && (
          displayUrl.includes("image") ||
          /\.(jpg|jpeg|png|gif|webp)$/i.test(displayUrl) ||
          uploadedFileInfo?.mimeType?.startsWith("image/")
        );

        return (
          <div className="space-y-2">
            <input
              type="file"
              className="file-input file-input-bordered w-full"
              disabled={isUploading}
              accept="image/*,video/*,.pdf,.doc,.docx"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  handleFileUpload(file, field.fieldName);
                }
              }}
            />
            {isUploading && (
              <div className="flex items-center gap-2 text-sm text-base-content/60">
                <span className="loading loading-spinner loading-sm"></span>
                Uploading...
              </div>
            )}
            {hasUpload && !isUploading && (
              <div className="mt-2">
                {isImage ? (
                  <img src={displayUrl} alt="Uploaded" className="max-h-32 rounded-lg border" />
                ) : (
                  <a
                    href={displayUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link link-primary text-sm"
                  >
                    View uploaded file
                  </a>
                )}
              </div>
            )}
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

      case "LICENCE_SCAN":
        // Licence scan with OCR extraction
        const isLicenceUploading = uploadingField === field.fieldName;

        const handleLicenceCapture = async (file) => {
          if (!file) return;

          setIsExtractingLicence(true);
          setLicenceExtractionError(null);
          setLicenceExtracted(false);

          // First upload the file
          await handleFileUpload(file, field.fieldName);

          try {
            // Convert file to base64 for extraction
            const reader = new FileReader();
            reader.onload = async () => {
              const base64 = reader.result.split(",")[1];
              const mimeType = file.type || "image/jpeg";

              // Call extraction API
              const res = await fetch("/api/forms/test-drive/extract-licence", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image: base64, mimeType }),
              });

              const data = await res.json();

              if (data.ok && data.data) {
                const extracted = data.data;
                const updates = {};

                // Map extracted fields to form field names using autoFillFromLicence config
                fields.forEach((f) => {
                  if (f.autoFillFromLicence && extracted[f.autoFillFromLicence]) {
                    updates[f.fieldName] = extracted[f.autoFillFromLicence];
                  }
                });

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

        const clearLicenceDataPublic = () => {
          handleInputChange(field.fieldName, null);
          setLicenceExtracted(false);
          setLicenceExtractionError(null);

          const fieldsToClear = {};
          fields.forEach((f) => {
            if (f.autoFillFromLicence) {
              fieldsToClear[f.fieldName] = "";
            }
          });
          setFormData((prev) => ({ ...prev, ...fieldsToClear }));
        };

        const licenceUploadedUrl = formData[field.fieldName];

        return (
          <div className="space-y-3">
            {licenceExtracted && (
              <div className="alert alert-success shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="font-bold text-sm">Details captured from licence</h3>
                  <p className="text-xs">Please verify the information below is correct</p>
                </div>
                <button type="button" className="btn btn-ghost btn-xs" onClick={clearLicenceDataPublic}>
                  Clear
                </button>
              </div>
            )}

            {licenceExtractionError && (
              <div className="alert alert-warning shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-sm">{licenceExtractionError}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <label className="flex-1 cursor-pointer">
                <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors ${
                  isExtractingLicence || isLicenceUploading ? "border-primary bg-primary/5" :
                  licenceUploadedUrl ? "border-success bg-success/5" :
                  "border-base-300 hover:border-primary hover:bg-primary/5"
                }`}>
                  {isExtractingLicence || isLicenceUploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <span className="loading loading-spinner loading-md text-primary"></span>
                      <span className="text-sm text-primary">
                        {isLicenceUploading ? "Uploading..." : "Extracting details..."}
                      </span>
                    </div>
                  ) : licenceUploadedUrl ? (
                    <div className="flex flex-col items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm text-success font-medium">Photo captured</span>
                      <img src={licenceUploadedUrl} alt="Licence" className="max-h-20 rounded-lg border mt-1" />
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
                  disabled={isExtractingLicence || isLicenceUploading}
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
          />
        );
    }
  };

  return (
    <>
      <Head>
        <title>{form.name} | DealerHQ</title>
      </Head>

      <div className="min-h-screen bg-base-200 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="card bg-base-100 shadow-xl mb-6">
            <div className="card-body">
              {/* Dealer Logo */}
              {dealer?.logoUrl && (
                <div className="flex justify-center mb-4">
                  <img
                    src={dealer.logoUrl}
                    alt={dealer.name || "Dealer Logo"}
                    className="h-16 object-contain"
                  />
                </div>
              )}
              <h1 className="text-3xl font-bold text-center">{form.name}</h1>
              {dealer?.name && !dealer?.logoUrl && (
                <p className="text-center text-base-content/60 mt-1">{dealer.name}</p>
              )}
            </div>
          </div>

          {/* Intro Text */}
          {form.introText && (
            <div className="card bg-base-100 shadow-xl mb-6">
              <div className="card-body">
                <p className="text-base-content/80 whitespace-pre-wrap">{replaceTokens(form.introText)}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body space-y-6">
                {fields.filter(field => field.visible !== false).map((field) => {
                  // Handle SECTION_HEADER type
                  if (field.type === "SECTION_HEADER") {
                    // Check if this is the Terms section - render terms text
                    if (field.fieldName === "_section_terms" && form.termsText) {
                      return (
                        <div key={field._id} className="pt-4 mt-4 border-t border-base-200">
                          <h3 className="text-lg font-bold text-primary mb-4">{field.label}</h3>
                          <div className="bg-base-200/50 rounded-lg p-4">
                            {formatTermsAsList(form.termsText)}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div key={field._id} className="pt-4 mt-4 border-t border-base-200">
                        <h3 className="text-lg font-bold text-primary">{field.label}</h3>
                      </div>
                    );
                  }

                  // Handle PARAGRAPH type (display-only text)
                  if (field.type === "PARAGRAPH") {
                    return (
                      <div key={field._id} className="text-sm text-base-content/70 -mt-2">
                        {field.label}
                      </div>
                    );
                  }

                  // Handle PDI_ISSUES type (repeatable issue entry - matches stock board Add Issue modal)
                  if (field.type === "PDI_ISSUES") {
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
                    const updateIssue = (index, key, value) => {
                      setFormData(prev => {
                        const newIssues = [...(prev.pdi_issues || [])];
                        newIssues[index] = { ...newIssues[index], [key]: value };
                        return { ...prev, pdi_issues: newIssues };
                      });
                    };
                    const removeIssue = (index) => {
                      setFormData(prev => ({
                        ...prev,
                        pdi_issues: prev.pdi_issues.filter((_, i) => i !== index)
                      }));
                    };
                    // Exact same categories as stock board Add Issue modal
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
                      <div key={field._id} className="space-y-4">
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
                                    updateIssue(idx, "subcategory", ""); // Reset subcategory
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
                  }

                  // Hide make/model fields when vehicle selected from stock
                  if (shouldHideField(field)) {
                    return null;
                  }

                  return (
                    <div key={field._id} className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold">
                          {field.label}
                          {field.required && !shouldHideField(field) && <span className="text-error ml-1">*</span>}
                        </span>
                      </label>
                      {renderField(field)}
                    </div>
                  );
                })}

                <div className="card-actions justify-end mt-8">
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="loading loading-spinner"></span>
                        Submitting...
                      </>
                    ) : (
                      "Submit"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

export async function getServerSideProps({ params }) {
  try {
    await connectMongo();

    // Find form by slug - allow SHARE_LINK and PUBLIC visibility (or legacy isPublic: true)
    const form = await Form.findOne({
      publicSlug: params.slug,
      $or: [
        { visibility: { $in: ["SHARE_LINK", "PUBLIC"] } },
        { visibility: { $exists: false }, isPublic: true }, // Legacy compatibility
      ]
    }).lean();

    if (!form) {
      return { props: { form: null, fields: [], dealer: null } };
    }

    // Get the dealer that owns this form
    let dealer = null;
    if (form.dealerId) {
      dealer = await Dealer.findById(form.dealerId).lean();

      // If dealer has a slug, redirect to the dealer-scoped URL
      if (dealer?.slug) {
        return {
          redirect: {
            destination: `/public/forms/d/${dealer.slug}/${params.slug}`,
            permanent: false,
          },
        };
      }
    }

    // Fallback: Get any dealer info for logo (legacy behavior)
    if (!dealer) {
      dealer = await Dealer.findOne().lean();
    }

    const fields = await FormField.find({ formId: form._id })
      .sort({ order: 1 })
      .lean();

    // Refresh logo URL if dealer has one (signed URLs expire)
    // Dynamic import to avoid client-side bundling of AWS SDK
    let dealerWithFreshLogo = dealer;
    if (dealer?.logoKey) {
      try {
        const { refreshDealerLogoUrl } = await import("@/libs/r2Client");
        dealerWithFreshLogo = await refreshDealerLogoUrl(dealer);
      } catch {
        // Keep original dealer if R2 refresh fails
      }
    }

    return {
      props: {
        form: JSON.parse(JSON.stringify(form)),
        fields: JSON.parse(JSON.stringify(fields)),
        dealer: dealerWithFreshLogo ? JSON.parse(JSON.stringify(dealerWithFreshLogo)) : null,
      },
    };
  } catch (error) {
    console.error("Error loading form:", error);
    return { props: { form: null, fields: [], dealer: null } };
  }
}
