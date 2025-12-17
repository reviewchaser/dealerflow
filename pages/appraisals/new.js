import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "react-hot-toast";
import { showDummyNotification } from "@/utils/notifications";

// Issue subcategories - same as stock board
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

const CATEGORY_LABELS = {
  mechanical: "Mechanical",
  electrical: "Electrical",
  bodywork: "Bodywork",
  interior: "Interior",
  tyres: "Tyres",
  mot: "MOT",
  service: "Service",
  fault_codes: "Fault Codes",
  other: "Other",
};

export default function NewAppraisal() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [dvlaData, setDvlaData] = useState(null);
  const [aiHints, setAiHints] = useState(null);
  const [isLoadingHints, setIsLoadingHints] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    vehicleReg: "",
    vehicleMake: "",
    vehicleModel: "",
    vehicleYear: "",
    mileage: "",
    colour: "",
    fuelType: "",
    conditionNotes: "",
    proposedPurchasePrice: "",
    aiHintText: "",
    prepTemplateId: "default",
  });

  // Documents
  const [v5File, setV5File] = useState(null);
  const [serviceHistoryFile, setServiceHistoryFile] = useState(null);
  const [otherDocuments, setOtherDocuments] = useState([]);

  // Issues
  const [issues, setIssues] = useState([]);
  const [showAddIssueModal, setShowAddIssueModal] = useState(false);
  const [issueForm, setIssueForm] = useState({
    category: "",
    subcategory: "",
    description: "",
    actionNeeded: "",
    status: "outstanding",
    notes: "",
    photos: [],
    faultCodes: "",
    estimatedCost: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDvlaLookup = async () => {
    if (!formData.vehicleReg) return toast.error("Enter registration first");
    setIsLookingUp(true);
    setAiHints(null);

    try {
      const res = await fetch("/api/dvla-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleReg: formData.vehicleReg }),
      });
      const data = await res.json();
      setDvlaData(data);
      if (data.isDummy) showDummyNotification("DVLA API");

      setFormData((prev) => ({
        ...prev,
        vehicleMake: data.make || prev.vehicleMake,
        vehicleModel: data.model || prev.vehicleModel,
        vehicleYear: data.yearOfManufacture || prev.vehicleYear,
        colour: data.colour || prev.colour,
        fuelType: data.fuelType || prev.fuelType,
      }));

      // Fetch AI hints
      fetchAiHints(data.make, data.model, data.yearOfManufacture);
    } catch (error) {
      toast.error("Lookup failed");
    } finally {
      setIsLookingUp(false);
    }
  };

  const fetchAiHints = async (make, model, year) => {
    setIsLoadingHints(true);
    try {
      const res = await fetch("/api/ai-hints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ make, model, year, mileage: formData.mileage }),
      });
      const data = await res.json();
      setAiHints(data);
      if (data.isDummy) showDummyNotification("AI Hints");
    } catch (error) {
      console.error("AI hints error:", error);
    } finally {
      setIsLoadingHints(false);
    }
  };

  const addHintsToNotes = () => {
    if (!aiHints?.hints || !Array.isArray(aiHints.hints)) return;
    const hintsText = aiHints.hints.map((h) => `• ${h}`).join("\n");
    setFormData((prev) => ({
      ...prev,
      conditionNotes: prev.conditionNotes
        ? `${prev.conditionNotes}\n\n--- AI Suggestions ---\n${hintsText}`
        : `--- AI Suggestions ---\n${hintsText}`,
      aiHintText: hintsText,
    }));
    toast.success("Added to notes");
  };

  const uploadFile = async (file, type) => {
    const formDataUpload = new FormData();
    formDataUpload.append("file", file);
    formDataUpload.append("type", type);

    const res = await fetch("/api/vehicles/upload", {
      method: "POST",
      body: formDataUpload,
    });

    if (!res.ok) throw new Error("Upload failed");
    const data = await res.json();
    return data.url;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.vehicleReg) {
      return toast.error("Vehicle registration is required");
    }
    setIsLoading(true);

    try {
      // Upload documents first
      let v5Url = null;
      let serviceHistoryUrl = null;
      const uploadedOtherDocs = [];

      if (v5File) {
        v5Url = await uploadFile(v5File, "v5");
      }
      if (serviceHistoryFile) {
        serviceHistoryUrl = await uploadFile(serviceHistoryFile, "service_history");
      }
      for (const doc of otherDocuments) {
        if (doc.file) {
          const url = await uploadFile(doc.file, "other");
          uploadedOtherDocs.push({ name: doc.name, url });
        }
      }

      // Create appraisal
      const appraisalData = {
        ...formData,
        v5Url,
        serviceHistoryUrl,
        otherDocuments: uploadedOtherDocs,
      };

      const res = await fetch("/api/appraisals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(appraisalData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create");
      }

      const appraisal = await res.json();

      // Create issues if any
      for (const issue of issues) {
        await fetch("/api/appraisals/issues", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appraisalId: appraisal.id,
            ...issue,
          }),
        });
      }

      toast.success("Appraisal created!");
      router.push("/appraisals");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <Head>
        <title>New Appraisal | DealerFlow</title>
      </Head>

      <div className="mb-8">
        <Link href="/appraisals" className="btn btn-ghost btn-sm mb-4">
          ← Back
        </Link>
        <h1 className="text-3xl font-bold">New Buying Appraisal</h1>
        <p className="text-base-content/60 mt-2">
          Capture vehicle details for purchase assessment
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form - Left Side */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Vehicle Registration Lookup */}
            <div className="card bg-base-200">
              <div className="card-body">
                <h2 className="card-title">Vehicle Registration</h2>
                <div className="flex gap-4">
                  <input
                    type="text"
                    name="vehicleReg"
                    value={formData.vehicleReg}
                    onChange={handleChange}
                    className="input input-bordered flex-1 uppercase text-xl font-mono"
                    placeholder="AB12 CDE"
                    required
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleDvlaLookup}
                    disabled={isLookingUp}
                  >
                    {isLookingUp ? (
                      <span className="loading loading-spinner"></span>
                    ) : (
                      "🔍 Lookup"
                    )}
                  </button>
                </div>
                {dvlaData && (
                  <div
                    className={`alert ${
                      dvlaData.isDummy ? "alert-warning" : "alert-success"
                    } mt-4`}
                  >
                    <span>
                      {dvlaData.isDummy ? "⚠️ Demo data – " : "✅ "}
                      {dvlaData.yearOfManufacture} {dvlaData.make}{" "}
                      {dvlaData.model} – {dvlaData.colour}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Vehicle Information */}
            <div className="card bg-base-200">
              <div className="card-body">
                <h2 className="card-title">Vehicle Details</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Make</span>
                    </label>
                    <input
                      type="text"
                      name="vehicleMake"
                      value={formData.vehicleMake}
                      onChange={handleChange}
                      className="input input-bordered"
                    />
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Model</span>
                    </label>
                    <input
                      type="text"
                      name="vehicleModel"
                      value={formData.vehicleModel}
                      onChange={handleChange}
                      className="input input-bordered"
                    />
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Year</span>
                    </label>
                    <input
                      type="number"
                      name="vehicleYear"
                      value={formData.vehicleYear}
                      onChange={handleChange}
                      className="input input-bordered"
                    />
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Mileage</span>
                    </label>
                    <input
                      type="number"
                      name="mileage"
                      value={formData.mileage}
                      onChange={handleChange}
                      className="input input-bordered"
                      placeholder="50000"
                    />
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Colour</span>
                    </label>
                    <input
                      type="text"
                      name="colour"
                      value={formData.colour}
                      onChange={handleChange}
                      className="input input-bordered"
                    />
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Fuel Type</span>
                    </label>
                    <select
                      name="fuelType"
                      value={formData.fuelType}
                      onChange={handleChange}
                      className="select select-bordered"
                    >
                      <option value="">Select...</option>
                      <option value="Petrol">Petrol</option>
                      <option value="Diesel">Diesel</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="Electric">Electric</option>
                    </select>
                  </div>
                </div>
                <div className="form-control mt-4">
                  <label className="label">
                    <span className="label-text">Proposed Purchase Price (£)</span>
                  </label>
                  <input
                    type="number"
                    name="proposedPurchasePrice"
                    value={formData.proposedPurchasePrice}
                    onChange={handleChange}
                    className="input input-bordered w-full md:w-1/3"
                    placeholder="5000"
                  />
                </div>
              </div>
            </div>

            {/* Documents Section */}
            <div className="card bg-base-200">
              <div className="card-body">
                <h2 className="card-title">Documents</h2>
                <div className="space-y-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">V5 Document</span>
                    </label>
                    <input
                      type="file"
                      className="file-input file-input-bordered w-full"
                      accept="image/*,.pdf"
                      onChange={(e) => setV5File(e.target.files[0])}
                    />
                    {v5File && (
                      <p className="text-sm text-success mt-1">
                        ✓ {v5File.name}
                      </p>
                    )}
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Service History</span>
                    </label>
                    <input
                      type="file"
                      className="file-input file-input-bordered w-full"
                      accept="image/*,.pdf"
                      onChange={(e) => setServiceHistoryFile(e.target.files[0])}
                    />
                    {serviceHistoryFile && (
                      <p className="text-sm text-success mt-1">
                        ✓ {serviceHistoryFile.name}
                      </p>
                    )}
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Other Documents</span>
                    </label>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() =>
                        setOtherDocuments([
                          ...otherDocuments,
                          { name: "", file: null },
                        ])
                      }
                    >
                      + Add Document
                    </button>
                    {otherDocuments.map((doc, idx) => (
                      <div key={idx} className="flex gap-2 mt-2">
                        <input
                          type="text"
                          placeholder="Document name"
                          className="input input-sm input-bordered flex-1"
                          value={doc.name}
                          onChange={(e) => {
                            const updated = [...otherDocuments];
                            updated[idx].name = e.target.value;
                            setOtherDocuments(updated);
                          }}
                        />
                        <input
                          type="file"
                          className="file-input file-input-sm file-input-bordered flex-1"
                          accept="image/*,.pdf"
                          onChange={(e) => {
                            const updated = [...otherDocuments];
                            updated[idx].file = e.target.files[0];
                            setOtherDocuments(updated);
                          }}
                        />
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          onClick={() =>
                            setOtherDocuments(
                              otherDocuments.filter((_, i) => i !== idx)
                            )
                          }
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Issues Section */}
            <div className="card bg-base-200">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <h2 className="card-title">Issues</h2>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => setShowAddIssueModal(true)}
                  >
                    + Add Issue
                  </button>
                </div>
                <p className="text-sm text-base-content/60">
                  Add any damage, mechanical issues, or fault codes found during appraisal
                </p>

                {issues.length > 0 ? (
                  <div className="space-y-2 mt-4">
                    {issues.map((issue, index) => (
                      <div
                        key={index}
                        className="bg-base-100 rounded-lg p-4 border border-base-300"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                {CATEGORY_LABELS[issue.category] || issue.category}
                              </span>
                              {issue.subcategory && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                  {issue.subcategory}
                                </span>
                              )}
                              {issue.estimatedCost && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                  £{issue.estimatedCost}
                                </span>
                              )}
                            </div>
                            <p className="font-medium">{issue.description}</p>
                            {issue.faultCodes && (
                              <p className="text-sm font-mono text-error mt-1">
                                Codes: {issue.faultCodes}
                              </p>
                            )}
                            {issue.actionNeeded && (
                              <p className="text-sm text-base-content/60 mt-1">
                                Action: {issue.actionNeeded}
                              </p>
                            )}
                            {issue.photos && issue.photos.length > 0 && (
                              <div className="flex gap-2 mt-2">
                                {issue.photos.map((photo, pIdx) => (
                                  <img
                                    key={pIdx}
                                    src={photo}
                                    alt={`Issue photo ${pIdx + 1}`}
                                    className="w-16 h-16 object-cover rounded"
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs text-error"
                            onClick={() => {
                              setIssues(issues.filter((_, i) => i !== index));
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-base-content/50">
                    No issues added yet. Click "+ Add Issue" to record problems.
                  </div>
                )}
              </div>
            </div>

            {/* Condition Notes */}
            <div className="card bg-base-200">
              <div className="card-body">
                <h2 className="card-title">Condition Notes</h2>
                <div className="form-control">
                  <textarea
                    name="conditionNotes"
                    value={formData.conditionNotes}
                    onChange={handleChange}
                    className="textarea textarea-bordered h-32"
                    placeholder="General condition, service history notes, anything else to note..."
                  ></textarea>
                </div>
              </div>
            </div>

            {/* Prep Checklist Template */}
            <div className="card bg-base-200">
              <div className="card-body">
                <h2 className="card-title">Prep Checklist Template</h2>
                <p className="text-sm text-base-content/60 mb-3">
                  Select which prep tasks to create if this vehicle is converted to stock
                </p>
                <div className="form-control">
                  <select
                    name="prepTemplateId"
                    value={formData.prepTemplateId}
                    onChange={handleChange}
                    className="select select-bordered"
                  >
                    <option value="">None - add tasks manually</option>
                    <option value="default">Standard Prep (5 tasks)</option>
                  </select>
                </div>

                {formData.prepTemplateId === "default" && (
                  <div className="mt-3 p-3 bg-base-100 rounded-lg">
                    <p className="text-xs font-semibold text-base-content/70 mb-2">
                      Tasks that will be created:
                    </p>
                    <div className="text-xs text-base-content/60 space-y-1">
                      {["PDI", "Valet", "Photos", "MOT Check", "Advert"].map(
                        (task, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-primary">✓</span>
                            <span>{task}</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-4">
              <Link href="/appraisals" className="btn btn-ghost">
                Cancel
              </Link>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="loading loading-spinner"></span> Saving...
                  </>
                ) : (
                  "Save Appraisal"
                )}
              </button>
            </div>
          </form>
        </div>

        {/* AI Hints Sidebar - Right Side */}
        <div className="lg:col-span-1">
          <div className="card bg-base-200 sticky top-20">
            <div className="card-body">
              <h3 className="card-title text-lg">🤖 AI Suggestions</h3>
              <p className="text-xs text-base-content/60 mb-4">
                Things to check for this vehicle
              </p>

              {isLoadingHints ? (
                <div className="flex justify-center py-8">
                  <span className="loading loading-spinner"></span>
                </div>
              ) : aiHints ? (
                <div className="space-y-4">
                  {aiHints.isDummy && (
                    <div className="alert alert-warning text-xs">
                      ⚠️ Demo mode – AI not configured
                    </div>
                  )}

                  <ul className="list-disc list-inside text-sm space-y-2">
                    {Array.isArray(aiHints.hints) && aiHints.hints.map((hint, i) => (
                      <li key={i} className="text-base-content/80">
                        {hint}
                      </li>
                    ))}
                  </ul>

                  {aiHints.marketInsight && (
                    <div className="mt-4 p-3 bg-base-100 rounded-lg">
                      <p className="text-xs font-semibold mb-1">Market Insight</p>
                      <p className="text-sm text-base-content/70">
                        {aiHints.marketInsight}
                      </p>
                    </div>
                  )}

                  <button
                    className="btn btn-outline btn-sm w-full mt-4"
                    onClick={addHintsToNotes}
                  >
                    Add to Notes
                  </button>

                  <p className="text-xs text-base-content/50 mt-2">
                    These are common issues for this type of vehicle. Not
                    guaranteed faults.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-base-content/60">
                  Enter registration and click "Lookup" to see AI-powered
                  suggestions.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Issue Modal */}
      {showAddIssueModal && (
        <AddIssueModal
          issueForm={issueForm}
          setIssueForm={setIssueForm}
          onClose={() => {
            setShowAddIssueModal(false);
            setIssueForm({
              category: "",
              subcategory: "",
              description: "",
              actionNeeded: "",
              status: "outstanding",
              notes: "",
              photos: [],
              faultCodes: "",
              estimatedCost: "",
            });
          }}
          onSubmit={async (photoUrls) => {
            // Validate required fields
            if (!issueForm.category || !issueForm.description) {
              return toast.error("Category and description are required");
            }

            // Add issue to the array
            setIssues([
              ...issues,
              {
                ...issueForm,
                photos: photoUrls || [],
              },
            ]);

            // Close modal and reset form
            setShowAddIssueModal(false);
            setIssueForm({
              category: "",
              subcategory: "",
              description: "",
              actionNeeded: "",
              status: "outstanding",
              notes: "",
              photos: [],
              faultCodes: "",
              estimatedCost: "",
            });
            toast.success("Issue added");
          }}
        />
      )}
    </DashboardLayout>
  );
}

// Add Issue Modal Component
function AddIssueModal({ issueForm, setIssueForm, onClose, onSubmit }) {
  const [isLoading, setIsLoading] = useState(false);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files);
    setPhotoFiles((prev) => [...prev, ...files]);

    // Create previews
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreviews((prev) => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index) => {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadPhotos = async () => {
    const uploadedUrls = [];
    for (const file of photoFiles) {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/vehicles/upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        uploadedUrls.push(data.url);
      }
    }
    return uploadedUrls;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Upload photos first if any
      let photoUrls = [];
      if (photoFiles.length > 0) {
        setIsUploadingPhotos(true);
        photoUrls = await uploadPhotos();
        setIsUploadingPhotos(false);
      }
      // Pass photo URLs to onSubmit
      await onSubmit(photoUrls);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg mb-4">Add Issue</h3>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Category *</span>
              </label>
              <select
                className="select select-bordered"
                value={issueForm.category}
                onChange={(e) => {
                  setIssueForm({
                    ...issueForm,
                    category: e.target.value,
                    subcategory: "",
                  });
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

            {issueForm.category && (
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Subcategory</span>
                </label>
                <select
                  className="select select-bordered"
                  value={issueForm.subcategory}
                  onChange={(e) =>
                    setIssueForm({ ...issueForm, subcategory: e.target.value })
                  }
                >
                  <option value="">Select subcategory...</option>
                  {ISSUE_SUBCATEGORIES[issueForm.category]?.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Fault Codes field - only show for fault_codes category */}
            {issueForm.category === "fault_codes" && (
              <div className="form-control col-span-2">
                <label className="label">
                  <span className="label-text">Fault Codes</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered font-mono"
                  value={issueForm.faultCodes}
                  onChange={(e) =>
                    setIssueForm({ ...issueForm, faultCodes: e.target.value })
                  }
                  placeholder="e.g. P0301, P0420, C1234"
                />
                <label className="label">
                  <span className="label-text-alt">
                    Enter codes separated by commas
                  </span>
                </label>
              </div>
            )}

            <div className="form-control col-span-2">
              <label className="label">
                <span className="label-text">Description *</span>
              </label>
              <textarea
                className="textarea textarea-bordered"
                value={issueForm.description}
                onChange={(e) =>
                  setIssueForm({ ...issueForm, description: e.target.value })
                }
                placeholder={
                  issueForm.category === "fault_codes"
                    ? "Describe what the fault codes indicate..."
                    : "Describe the issue..."
                }
                required
                rows="3"
              ></textarea>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Action Needed</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                value={issueForm.actionNeeded}
                onChange={(e) =>
                  setIssueForm({ ...issueForm, actionNeeded: e.target.value })
                }
                placeholder="What needs to be done?"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Estimated Cost (£)</span>
              </label>
              <input
                type="number"
                className="input input-bordered"
                value={issueForm.estimatedCost}
                onChange={(e) =>
                  setIssueForm({ ...issueForm, estimatedCost: e.target.value })
                }
                placeholder="0"
              />
            </div>

            <div className="form-control col-span-2">
              <label className="label">
                <span className="label-text">Notes</span>
              </label>
              <textarea
                className="textarea textarea-bordered"
                value={issueForm.notes}
                onChange={(e) =>
                  setIssueForm({ ...issueForm, notes: e.target.value })
                }
                placeholder="Additional notes..."
                rows="2"
              ></textarea>
            </div>

            {/* Photo Upload */}
            <div className="form-control col-span-2">
              <label className="label">
                <span className="label-text">Photos</span>
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoChange}
                className="file-input file-input-bordered w-full"
              />
              {photoPreviews.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {photoPreviews.map((preview, idx) => (
                    <div key={idx} className="relative">
                      <img
                        src={preview}
                        alt={`Preview ${idx + 1}`}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(idx)}
                        className="absolute -top-2 -right-2 btn btn-circle btn-xs btn-error"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="modal-action">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  {isUploadingPhotos ? "Uploading..." : "Adding..."}
                </>
              ) : (
                "Add Issue"
              )}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
}
