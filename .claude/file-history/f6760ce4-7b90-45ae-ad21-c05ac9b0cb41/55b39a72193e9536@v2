import { useState } from "react";
import Head from "next/head";
import { toast, Toaster } from "react-hot-toast";

// Issue subcategories - same as stock board and buying appraisal
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

export default function PXAppraisalForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [dvlaData, setDvlaData] = useState(null);
  const [aiHints, setAiHints] = useState(null);
  const [isLoadingHints, setIsLoadingHints] = useState(false);

  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    vehicleReg: "",
    vehicleMake: "",
    vehicleModel: "",
    vehicleYear: "",
    mileage: "",
    colour: "",
    fuelType: "",
    motExpiryDate: "", // MOT expiry - captured from DVLA lookup
    conditionNotes: "",
    outstandingFinanceAmount: "",
    interestedInVehicle: "",
    proposedPurchasePrice: "",
    aiHintText: "",
    prepTemplateId: "default",
  });

  // Documents - No V5 for GDPR
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
      setFormData((prev) => ({
        ...prev,
        vehicleMake: data.make || prev.vehicleMake,
        vehicleModel: data.model || prev.vehicleModel,
        vehicleYear: data.yearOfManufacture || prev.vehicleYear,
        colour: data.colour || prev.colour,
        fuelType: data.fuelType || prev.fuelType,
        motExpiryDate: data.motExpiryDate || prev.motExpiryDate, // Capture MOT expiry
      }));
      toast.success("Vehicle details found!");

      // Fetch AI hints after successful lookup
      fetchAiHints(data.make, data.model, data.yearOfManufacture);
    } catch (error) {
      toast.error("Lookup failed - please enter details manually");
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
    } catch (error) {
      console.error("AI hints error:", error);
    } finally {
      setIsLoadingHints(false);
    }
  };

  const addHintsToNotes = () => {
    if (!aiHints?.hints) return;
    const hintsText = aiHints.hints.map((h) => `- ${h}`).join("\n");
    setFormData((prev) => ({
      ...prev,
      conditionNotes: prev.conditionNotes
        ? `${prev.conditionNotes}\n\n--- AI Suggestions ---\n${hintsText}`
        : `--- AI Suggestions ---\n${hintsText}`,
      aiHintText: hintsText,
    }));
    toast.success("Added to notes");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customerName || !formData.customerPhone || !formData.vehicleReg) {
      return toast.error("Please fill in all required fields");
    }
    setIsSubmitting(true);
    try {
      let serviceHistoryUrl = null;
      const uploadedOtherDocs = [];

      if (serviceHistoryFile) {
        const formDataUpload = new FormData();
        formDataUpload.append("file", serviceHistoryFile);
        formDataUpload.append("type", "service_history");
        const uploadRes = await fetch("/api/vehicles/upload", { method: "POST", body: formDataUpload });
        if (uploadRes.ok) {
          const data = await uploadRes.json();
          serviceHistoryUrl = data.url;
        }
      }

      for (const doc of otherDocuments) {
        if (doc.file) {
          const formDataUpload = new FormData();
          formDataUpload.append("file", doc.file);
          formDataUpload.append("type", "other");
          const uploadRes = await fetch("/api/vehicles/upload", { method: "POST", body: formDataUpload });
          if (uploadRes.ok) {
            const data = await uploadRes.json();
            uploadedOtherDocs.push({ name: doc.name, url: data.url });
          }
        }
      }

      const res = await fetch("/api/customer-px", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          serviceHistoryUrl,
          otherDocuments: uploadedOtherDocs,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to submit");
      }

      const appraisal = await res.json();

      // Create issues if any
      for (const issue of issues) {
        await fetch("/api/customer-px/issues", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerPXAppraisalId: appraisal.id,
            ...issue,
          }),
        });
      }

      setIsSubmitted(true);
    } catch (error) {
      toast.error(error.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
        <Head><title>Valuation Request Submitted</title></Head>
        <Toaster position="top-center" />
        <div className="card bg-base-100 max-w-md w-full shadow-xl">
          <div className="card-body text-center">
            <div className="text-6xl mb-4">🚗</div>
            <h1 className="text-2xl font-bold">Valuation Request Received</h1>
            <p className="text-base-content/60 mt-2">
              Thank you for your part-exchange enquiry. We will review your vehicle details and get back to you with a valuation.
            </p>
            <p className="text-sm mt-4 text-base-content/50">
              We typically respond within 24 hours during business days.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 py-8 px-4">
      <Head><title>Part Exchange Valuation</title></Head>
      <Toaster position="top-center" />

      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Part Exchange Valuation</h1>
          <p className="text-base-content/60 mt-2">
            Get a free valuation for your vehicle
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form - Left Side */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Your Details */}
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h2 className="card-title">Your Details</h2>
                  <div className="form-control">
                    <label className="label"><span className="label-text">Full Name *</span></label>
                    <input type="text" name="customerName" value={formData.customerName} onChange={handleChange}
                      className="input input-bordered" required />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-control">
                      <label className="label"><span className="label-text">Phone *</span></label>
                      <input type="tel" name="customerPhone" value={formData.customerPhone} onChange={handleChange}
                        className="input input-bordered" required />
                    </div>
                    <div className="form-control">
                      <label className="label"><span className="label-text">Email *</span></label>
                      <input type="email" name="customerEmail" value={formData.customerEmail} onChange={handleChange}
                        className="input input-bordered" required />
                    </div>
                  </div>
                </div>
              </div>

              {/* Vehicle Registration Lookup */}
              <div className="card bg-base-100 shadow-xl">
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
                      {isLookingUp ? <span className="loading loading-spinner"></span> : "Lookup"}
                    </button>
                  </div>
                  {dvlaData && (
                    <div className={`alert ${dvlaData.isDummy ? "alert-warning" : "alert-success"} mt-4`}>
                      <span>
                        {dvlaData.isDummy ? "Demo data - " : ""}
                        {dvlaData.yearOfManufacture} {dvlaData.make} {dvlaData.model} - {dvlaData.colour}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Vehicle Details */}
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h2 className="card-title">Vehicle Details</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="form-control">
                      <label className="label"><span className="label-text">Make</span></label>
                      <input type="text" name="vehicleMake" value={formData.vehicleMake} onChange={handleChange}
                        className="input input-bordered" placeholder="e.g. Ford" />
                    </div>
                    <div className="form-control">
                      <label className="label"><span className="label-text">Model</span></label>
                      <input type="text" name="vehicleModel" value={formData.vehicleModel} onChange={handleChange}
                        className="input input-bordered" placeholder="e.g. Focus" />
                    </div>
                    <div className="form-control">
                      <label className="label"><span className="label-text">Year</span></label>
                      <input type="number" name="vehicleYear" value={formData.vehicleYear} onChange={handleChange}
                        className="input input-bordered" placeholder="e.g. 2019" />
                    </div>
                    <div className="form-control">
                      <label className="label"><span className="label-text">Mileage</span></label>
                      <input type="number" name="mileage" value={formData.mileage} onChange={handleChange}
                        className="input input-bordered" placeholder="e.g. 50000" />
                    </div>
                    <div className="form-control">
                      <label className="label"><span className="label-text">Colour</span></label>
                      <input type="text" name="colour" value={formData.colour} onChange={handleChange}
                        className="input input-bordered" placeholder="e.g. Blue" />
                    </div>
                    <div className="form-control">
                      <label className="label"><span className="label-text">Fuel Type</span></label>
                      <select name="fuelType" value={formData.fuelType} onChange={handleChange}
                        className="select select-bordered">
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
                      <span className="label-text">Expected Value (optional)</span>
                    </label>
                    <div className="join">
                      <span className="join-item btn btn-disabled">GBP</span>
                      <input
                        type="number"
                        name="proposedPurchasePrice"
                        value={formData.proposedPurchasePrice}
                        onChange={handleChange}
                        className="input input-bordered join-item flex-1"
                        placeholder="What do you expect for your vehicle?"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Documents Section - No V5 for GDPR */}
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h2 className="card-title">Documents</h2>
                  <p className="text-sm text-base-content/60 mb-4">Upload any supporting documents (optional)</p>
                  <div className="space-y-4">
                    <div className="form-control">
                      <label className="label"><span className="label-text">Service History</span></label>
                      <input
                        type="file"
                        className="file-input file-input-bordered w-full"
                        accept="image/*,.pdf"
                        onChange={(e) => setServiceHistoryFile(e.target.files[0])}
                      />
                      {serviceHistoryFile && <p className="text-sm text-success mt-1">{serviceHistoryFile.name}</p>}
                    </div>
                    <div className="form-control">
                      <label className="label"><span className="label-text">Other Documents</span></label>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={() => setOtherDocuments([...otherDocuments, { name: "", file: null }])}
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
                            onClick={() => setOtherDocuments(otherDocuments.filter((_, i) => i !== idx))}
                          >
                            x
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Issues Section */}
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <div className="flex items-center justify-between">
                    <h2 className="card-title">Known Issues</h2>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => setShowAddIssueModal(true)}
                    >
                      + Add Issue
                    </button>
                  </div>
                  <p className="text-sm text-base-content/60">
                    Tell us about any damage, mechanical issues, or fault codes (helps us give you an accurate valuation)
                  </p>

                  {issues.length > 0 ? (
                    <div className="space-y-2 mt-4">
                      {issues.map((issue, index) => (
                        <div
                          key={index}
                          className="bg-base-200 rounded-lg p-4 border border-base-300"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="badge badge-primary">
                                  {CATEGORY_LABELS[issue.category] || issue.category}
                                </span>
                                {issue.subcategory && (
                                  <span className="badge badge-ghost">
                                    {issue.subcategory}
                                  </span>
                                )}
                                {issue.estimatedCost && (
                                  <span className="badge badge-warning">
                                    Est. repair cost
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
                                  Needs: {issue.actionNeeded}
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
                              x
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-base-content/50">
                      No issues added yet. Click "+ Add Issue" to record any problems with your vehicle.
                    </div>
                  )}
                </div>
              </div>

              {/* Condition Notes */}
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h2 className="card-title">Condition Notes</h2>
                  <div className="form-control">
                    <textarea
                      name="conditionNotes"
                      value={formData.conditionNotes}
                      onChange={handleChange}
                      className="textarea textarea-bordered h-32"
                      placeholder="Please describe the overall condition of your vehicle - any damage, mechanical issues, modifications, service history notes, etc."
                    ></textarea>
                  </div>
                </div>
              </div>

              {/* Financial Info */}
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h2 className="card-title">Financial Information</h2>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Outstanding Finance</span>
                      <span className="label-text-alt">Leave blank if none</span>
                    </label>
                    <div className="join">
                      <span className="join-item btn btn-disabled">GBP</span>
                      <input type="number" name="outstandingFinanceAmount" value={formData.outstandingFinanceAmount} onChange={handleChange}
                        className="input input-bordered join-item flex-1" placeholder="0" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Vehicle of Interest */}
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h2 className="card-title">Vehicle of Interest</h2>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Are you interested in a specific vehicle from us?</span>
                    </label>
                    <input type="text" name="interestedInVehicle" value={formData.interestedInVehicle} onChange={handleChange}
                      className="input input-bordered"
                      placeholder="e.g. The blue BMW 3 Series, reg AB12 CDE" />
                  </div>
                </div>
              </div>

              {/* Prep Checklist Template - hidden field, defaults to default */}
              <input type="hidden" name="prepTemplateId" value={formData.prepTemplateId} />

              {/* Submit */}
              <div className="form-control">
                <button type="submit" className="btn btn-primary btn-lg" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <><span className="loading loading-spinner"></span> Submitting...</>
                  ) : (
                    "Get My Valuation"
                  )}
                </button>
              </div>

              <p className="text-xs text-base-content/50 text-center">
                By submitting this form, you agree to be contacted regarding your part-exchange enquiry.
              </p>
            </form>
          </div>

          {/* AI Hints Sidebar - Right Side */}
          <div className="lg:col-span-1">
            <div className="card bg-base-100 shadow-xl sticky top-8">
              <div className="card-body">
                <h3 className="card-title text-lg">Common Issues</h3>
                <p className="text-xs text-base-content/60 mb-4">
                  Things to check for this type of vehicle
                </p>

                {isLoadingHints ? (
                  <div className="flex justify-center py-8">
                    <span className="loading loading-spinner"></span>
                  </div>
                ) : aiHints ? (
                  <div className="space-y-4">
                    {aiHints.isDummy && (
                      <div className="alert alert-warning text-xs">
                        Demo mode - AI not configured
                      </div>
                    )}

                    <ul className="list-disc list-inside text-sm space-y-2">
                      {aiHints.hints?.map((hint, i) => (
                        <li key={i} className="text-base-content/80">
                          {hint}
                        </li>
                      ))}
                    </ul>

                    {aiHints.marketInsight && (
                      <div className="mt-4 p-3 bg-base-200 rounded-lg">
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
                      These are common issues for this type of vehicle. Please let us know if any apply to yours.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-base-content/60">
                    Enter your registration and click "Lookup" to see common issues for your vehicle type.
                  </p>
                )}
              </div>
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
    </div>
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
                <span className="label-text">What needs to be done?</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                value={issueForm.actionNeeded}
                onChange={(e) =>
                  setIssueForm({ ...issueForm, actionNeeded: e.target.value })
                }
                placeholder="e.g. Needs new brakes"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Estimated Repair Cost (optional)</span>
              </label>
              <div className="join">
                <span className="join-item btn btn-disabled btn-sm">GBP</span>
                <input
                  type="number"
                  className="input input-bordered join-item flex-1"
                  value={issueForm.estimatedCost}
                  onChange={(e) =>
                    setIssueForm({ ...issueForm, estimatedCost: e.target.value })
                  }
                  placeholder="0"
                />
              </div>
            </div>

            <div className="form-control col-span-2">
              <label className="label">
                <span className="label-text">Additional Notes</span>
              </label>
              <textarea
                className="textarea textarea-bordered"
                value={issueForm.notes}
                onChange={(e) =>
                  setIssueForm({ ...issueForm, notes: e.target.value })
                }
                placeholder="Any additional information..."
                rows="2"
              ></textarea>
            </div>

            {/* Photo Upload */}
            <div className="form-control col-span-2">
              <label className="label">
                <span className="label-text">Photos (optional)</span>
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
                        x
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
