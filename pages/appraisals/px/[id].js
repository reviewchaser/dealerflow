import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "react-hot-toast";

// Categories must match CustomerPXIssue model schema (lowercase)
const ISSUE_CATEGORIES = ["mechanical", "electrical", "bodywork", "interior", "tyres", "mot", "service", "fault_codes", "other"];
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

export default function CustomerPXAppraisalDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [appraisal, setAppraisal] = useState(null);
  const [issues, setIssues] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConverting, setIsConverting] = useState(false);

  // Photo lightbox state
  const [lightboxPhoto, setLightboxPhoto] = useState(null);

  // Issue modal state
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueForm, setIssueForm] = useState({
    category: "mechanical",
    subcategory: "Engine",
    description: "",
    actionNeeded: "",
    estimatedCost: "",
    notes: "",
  });
  const [photoFiles, setPhotoFiles] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [isAddingIssue, setIsAddingIssue] = useState(false);

  useEffect(() => {
    if (id) {
      fetchAppraisal();
      fetchIssues();
    }
  }, [id]);

  const fetchAppraisal = async () => {
    try {
      const res = await fetch(`/api/customer-px/${id}`);
      const data = await res.json();
      setAppraisal(data);
    } catch (error) {
      toast.error("Failed to load");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchIssues = async () => {
    try {
      const res = await fetch(`/api/customer-px/issues?customerPXAppraisalId=${id}`);
      const data = await res.json();
      setIssues(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load issues:", error);
      setIssues([]);
    }
  };

  const handleDecision = async (decision) => {
    try {
      await fetch(`/api/customer-px/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      toast.success(`Marked as ${decision}`);
      fetchAppraisal();
    } catch (error) {
      toast.error("Failed to update");
    }
  };

  const handleConvert = async () => {
    setIsConverting(true);
    try {
      const res = await fetch(`/api/customer-px/${id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initialStatus: "in_stock" }),
      });
      if (!res.ok) throw new Error("Failed to convert");
      toast.success("Vehicle created!");
      router.push("/sales-prep");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsConverting(false);
    }
  };

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files);
    setPhotoFiles(prev => [...prev, ...files]);

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreviews(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index) => {
    setPhotoFiles(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadPhotos = async () => {
    const uploadedUrls = [];
    for (const file of photoFiles) {
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await fetch("/api/vehicles/upload", {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          uploadedUrls.push(data.url);
        }
      } catch (error) {
        console.error("Photo upload failed:", error);
      }
    }
    return uploadedUrls;
  };

  const handleAddIssue = async () => {
    if (!issueForm.description.trim()) {
      toast.error("Description is required");
      return;
    }

    setIsAddingIssue(true);

    try {
      let photoUrls = [];
      if (photoFiles.length > 0) {
        setIsUploadingPhotos(true);
        photoUrls = await uploadPhotos();
        setIsUploadingPhotos(false);
      }

      const res = await fetch("/api/customer-px/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerPXAppraisalId: id,
          ...issueForm,
          estimatedCost: issueForm.estimatedCost ? parseFloat(issueForm.estimatedCost) : undefined,
          photos: photoUrls,
        }),
      });

      if (!res.ok) throw new Error("Failed to add issue");

      toast.success("Issue added");
      setShowIssueModal(false);
      setIssueForm({
        category: "mechanical",
        subcategory: "Engine",
        description: "",
        actionNeeded: "",
        estimatedCost: "",
        notes: "",
      });
      setPhotoFiles([]);
      setPhotoPreviews([]);
      fetchIssues();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsAddingIssue(false);
    }
  };

  const handleDeleteIssue = async (issueId) => {
    if (!confirm("Delete this issue?")) return;

    try {
      await fetch(`/api/customer-px/issues/${issueId}`, { method: "DELETE" });
      toast.success("Issue deleted");
      fetchIssues();
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case "mechanical": return "badge-error";
      case "electrical": return "badge-warning";
      case "bodywork": return "badge-info";
      case "interior": return "badge-info";
      case "tyres": return "badge-warning";
      case "mot": return "badge-secondary";
      case "service": return "badge-accent";
      case "fault_codes": return "badge-error";
      default: return "badge-ghost";
    }
  };

  const totalEstimatedCost = issues.reduce((sum, issue) => sum + (issue.estimatedCost || 0), 0);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-20">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </DashboardLayout>
    );
  }

  if (!appraisal) {
    return (
      <DashboardLayout>
        <div className="alert alert-error">Customer PX Appraisal not found</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Head><title>PX Appraisal {appraisal.vehicleReg} | DealerFlow</title></Head>

      <div className="mb-8">
        <Link href="/appraisals" className="btn btn-ghost btn-sm mb-4">← Back</Link>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold font-mono">{appraisal.vehicleReg}</h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">Customer PX</span>
            </div>
            <p className="text-base-content/60 mt-2">
              {appraisal.vehicleMake} {appraisal.vehicleModel} {appraisal.vehicleYear ? `(${appraisal.vehicleYear})` : ""}
            </p>
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${
            appraisal.decision === "converted" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
            appraisal.decision === "declined" ? "bg-red-50 text-red-700 border-red-200" :
            appraisal.decision === "reviewed" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-amber-50 text-amber-700 border-amber-200"
          }`}>
            {appraisal.decision === "pending" ? "New" :
             appraisal.decision === "reviewed" ? "Reviewed" :
             appraisal.decision === "converted" ? "Converted" :
             appraisal.decision === "declined" ? "Declined" : appraisal.decision}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Details */}
          <div className="card bg-base-200">
            <div className="card-body">
              <h2 className="card-title">Customer Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-base-content/60">Name</p>
                  <p className="font-semibold">{appraisal.customerName || appraisal.contactId?.name || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-base-content/60">Email</p>
                  <p className="font-semibold">{appraisal.customerEmail || appraisal.contactId?.email || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-base-content/60">Phone</p>
                  <p className="font-semibold">{appraisal.customerPhone || appraisal.contactId?.phone || "—"}</p>
                </div>
                {appraisal.interestedInVehicle && (
                  <div className="md:col-span-3">
                    <p className="text-sm text-base-content/60">Interested In Vehicle</p>
                    <p className="font-semibold">{appraisal.interestedInVehicle}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Vehicle Details */}
          <div className="card bg-base-200">
            <div className="card-body">
              <h2 className="card-title">Vehicle Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-base-content/60">Make</p><p className="font-semibold">{appraisal.vehicleMake || "—"}</p></div>
                <div><p className="text-sm text-base-content/60">Model</p><p className="font-semibold">{appraisal.vehicleModel || "—"}</p></div>
                <div><p className="text-sm text-base-content/60">Year</p><p className="font-semibold">{appraisal.vehicleYear || "—"}</p></div>
                <div><p className="text-sm text-base-content/60">Mileage</p><p className="font-semibold">{appraisal.mileage?.toLocaleString() || "—"}</p></div>
                <div><p className="text-sm text-base-content/60">Colour</p><p className="font-semibold">{appraisal.colour || "—"}</p></div>
                <div><p className="text-sm text-base-content/60">Fuel Type</p><p className="font-semibold">{appraisal.fuelType || "—"}</p></div>
                {appraisal.conditionRating && (
                  <div><p className="text-sm text-base-content/60">Condition Rating</p><p className="font-semibold capitalize">{appraisal.conditionRating}</p></div>
                )}
                {appraisal.outstandingFinanceAmount > 0 && (
                  <div><p className="text-sm text-base-content/60">Outstanding Finance</p><p className="font-semibold text-error">£{appraisal.outstandingFinanceAmount?.toLocaleString()}</p></div>
                )}
                {appraisal.proposedPurchasePrice > 0 && (
                  <div>
                    <p className="text-sm text-base-content/60">Proposed Price</p>
                    <p className="font-semibold text-lg">£{appraisal.proposedPurchasePrice?.toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Condition Notes */}
          <div className="card bg-base-200">
            <div className="card-body">
              <h2 className="card-title">Condition Notes</h2>
              <p className="whitespace-pre-wrap">{appraisal.conditionNotes || "No notes recorded"}</p>
            </div>
          </div>

          {/* Vehicle Photos Gallery */}
          {appraisal.photos && (
            (appraisal.photos.exterior?.length > 0 || appraisal.photos.interior?.length > 0 ||
             appraisal.photos.dashboard || appraisal.photos.odometer) && (
              <div className="card bg-base-200">
                <div className="card-body">
                  <h2 className="card-title">Vehicle Photos</h2>
                  <div className="space-y-4">
                    {/* Exterior Photos */}
                    {appraisal.photos.exterior?.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-base-content/70 mb-2">Exterior ({appraisal.photos.exterior.length})</p>
                        <div className="flex flex-wrap gap-2">
                          {appraisal.photos.exterior.map((photo, idx) => (
                            <button
                              key={idx}
                              onClick={() => setLightboxPhoto(photo)}
                              className="relative group"
                            >
                              <img
                                src={photo}
                                alt={`Exterior ${idx + 1}`}
                                className="w-24 h-24 object-cover rounded-lg border border-base-300 hover:border-primary transition-all cursor-pointer"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-all flex items-center justify-center">
                                <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                </svg>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Interior Photos */}
                    {appraisal.photos.interior?.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-base-content/70 mb-2">Interior ({appraisal.photos.interior.length})</p>
                        <div className="flex flex-wrap gap-2">
                          {appraisal.photos.interior.map((photo, idx) => (
                            <button
                              key={idx}
                              onClick={() => setLightboxPhoto(photo)}
                              className="relative group"
                            >
                              <img
                                src={photo}
                                alt={`Interior ${idx + 1}`}
                                className="w-24 h-24 object-cover rounded-lg border border-base-300 hover:border-primary transition-all cursor-pointer"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-all flex items-center justify-center">
                                <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                </svg>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Dashboard & Odometer */}
                    {(appraisal.photos.dashboard || appraisal.photos.odometer) && (
                      <div>
                        <p className="text-sm font-semibold text-base-content/70 mb-2">Dashboard & Odometer</p>
                        <div className="flex flex-wrap gap-2">
                          {appraisal.photos.dashboard && (
                            <button
                              onClick={() => setLightboxPhoto(appraisal.photos.dashboard)}
                              className="relative group"
                            >
                              <img
                                src={appraisal.photos.dashboard}
                                alt="Dashboard"
                                className="w-24 h-24 object-cover rounded-lg border border-base-300 hover:border-primary transition-all cursor-pointer"
                              />
                              <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">Dashboard</span>
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-all flex items-center justify-center">
                                <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                </svg>
                              </div>
                            </button>
                          )}
                          {appraisal.photos.odometer && (
                            <button
                              onClick={() => setLightboxPhoto(appraisal.photos.odometer)}
                              className="relative group"
                            >
                              <img
                                src={appraisal.photos.odometer}
                                alt="Odometer"
                                className="w-24 h-24 object-cover rounded-lg border border-base-300 hover:border-primary transition-all cursor-pointer"
                              />
                              <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">Odometer</span>
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-all flex items-center justify-center">
                                <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                </svg>
                              </div>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          )}

          {/* Issues Section */}
          <div className="card bg-base-200">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="card-title">Issues & Damage</h2>
                  {totalEstimatedCost > 0 && (
                    <p className="text-sm text-base-content/60">
                      Total estimated repair cost: <span className="font-semibold text-error">£{totalEstimatedCost.toLocaleString()}</span>
                    </p>
                  )}
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setShowIssueModal(true)}>
                  + Add Issue
                </button>
              </div>

              {issues.length === 0 ? (
                <div className="text-center py-8 text-base-content/60">
                  <p>No issues recorded</p>
                  <p className="text-sm mt-1">Click "Add Issue" to log damage, faults, or condition notes</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {issues.map((issue) => (
                    <div key={issue.id} className="bg-base-100 rounded-lg p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`badge ${getCategoryColor(issue.category)} badge-sm`}>{CATEGORY_LABELS[issue.category] || issue.category}</span>
                          <span className="font-semibold">{issue.subcategory}</span>
                        </div>
                        <button
                          className="btn btn-ghost btn-xs text-error"
                          onClick={() => handleDeleteIssue(issue.id)}
                        >
                          Delete
                        </button>
                      </div>
                      <p className="text-sm mb-2">{issue.description}</p>
                      {issue.actionNeeded && (
                        <p className="text-xs text-base-content/60 mb-1">
                          <span className="font-medium">Action needed:</span> {issue.actionNeeded}
                        </p>
                      )}
                      {issue.estimatedCost > 0 && (
                        <p className="text-sm text-error font-medium">
                          Est. cost: £{issue.estimatedCost.toLocaleString()}
                        </p>
                      )}
                      {/* Legacy photos (simple URL array) */}
                      {issue.photos && issue.photos.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-base-content/60 mb-2">Photos ({issue.photos.length})</p>
                          <div className="flex flex-wrap gap-2">
                            {issue.photos.map((photo, idx) => (
                              <button
                                key={idx}
                                onClick={() => setLightboxPhoto(photo)}
                                className="relative group"
                              >
                                <img
                                  src={photo}
                                  alt={`Issue photo ${idx + 1}`}
                                  className="w-20 h-20 object-cover rounded-lg border border-base-300 hover:border-primary transition-all cursor-pointer"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-all flex items-center justify-center">
                                  <svg className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                  </svg>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* New attachments format (with caption, uploadedAt) */}
                      {issue.attachments && issue.attachments.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-base-content/60 mb-2">Attachments ({issue.attachments.length})</p>
                          <div className="flex flex-wrap gap-2">
                            {issue.attachments.map((attachment, idx) => (
                              <button
                                key={idx}
                                onClick={() => setLightboxPhoto(attachment.url)}
                                className="relative group"
                              >
                                <img
                                  src={attachment.url}
                                  alt={attachment.caption || `Attachment ${idx + 1}`}
                                  className="w-20 h-20 object-cover rounded-lg border border-base-300 hover:border-primary transition-all cursor-pointer"
                                />
                                {attachment.caption && (
                                  <span className="absolute bottom-0 left-0 right-0 text-[9px] bg-black/60 text-white px-1 py-0.5 rounded-b-lg truncate">
                                    {attachment.caption}
                                  </span>
                                )}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-all flex items-center justify-center">
                                  <svg className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                  </svg>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Documents Section */}
          {(appraisal.v5Url || appraisal.serviceHistoryUrl || (appraisal.otherDocuments && appraisal.otherDocuments.length > 0)) && (
            <div className="card bg-base-200">
              <div className="card-body">
                <h2 className="card-title">Documents</h2>
                <div className="space-y-2">
                  {appraisal.v5Url && (
                    <a href={appraisal.v5Url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline">
                      V5 Document
                    </a>
                  )}
                  {appraisal.serviceHistoryUrl && (
                    <a href={appraisal.serviceHistoryUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline ml-2">
                      Service History
                    </a>
                  )}
                  {appraisal.otherDocuments?.map((doc, idx) => (
                    <a key={idx} href={doc.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline ml-2">
                      {doc.name || "Document"}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* AI Hints */}
          {appraisal.aiHintText && (
            <div className="card bg-info/10 border border-info/30">
              <div className="card-body">
                <h2 className="card-title">AI Suggestions</h2>
                <p className="whitespace-pre-wrap text-sm">{appraisal.aiHintText}</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions Sidebar */}
        <div className="lg:col-span-1">
          <div className="card bg-base-200 sticky top-20">
            <div className="card-body">
              <h3 className="card-title">Actions</h3>

              {(appraisal.decision === "pending" || appraisal.decision === "reviewed") && !appraisal.vehicleId && (
                <div className="space-y-3">
                  <button className="btn btn-success w-full" onClick={handleConvert} disabled={isConverting}>
                    {isConverting ? <span className="loading loading-spinner"></span> : "Convert to Stock"}
                  </button>
                  <button className="btn btn-ghost w-full" onClick={() => handleDecision("reviewed")}>
                    Mark as Reviewed
                  </button>
                  <button className="btn btn-error btn-outline w-full" onClick={() => handleDecision("declined")}>
                    Decline
                  </button>
                  <p className="text-xs text-base-content/60">Converting will create a vehicle and default prep tasks.</p>
                </div>
              )}

              {appraisal.decision === "converted" || appraisal.vehicleId ? (
                <div className="space-y-3">
                  <div className="alert alert-success text-sm">Vehicle added to stock</div>
                  <Link href="/sales-prep" className="btn btn-primary w-full">View in Stock & Prep</Link>
                </div>
              ) : null}

              {appraisal.decision === "declined" && (
                <div className="space-y-3">
                  <div className="alert text-sm">This appraisal was declined</div>
                  <button className="btn btn-ghost btn-sm w-full" onClick={() => handleDecision("pending")}>
                    Re-open
                  </button>
                </div>
              )}

              {/* Issues Summary */}
              {issues.length > 0 && (
                <>
                  <div className="divider"></div>
                  <div className="text-sm">
                    <p className="font-semibold mb-2">Issues Summary</p>
                    <p>{issues.length} issue{issues.length !== 1 ? "s" : ""} logged</p>
                    {totalEstimatedCost > 0 && (
                      <p className="text-error font-medium">£{totalEstimatedCost.toLocaleString()} est. repairs</p>
                    )}
                  </div>
                </>
              )}

              <div className="divider"></div>

              <button className="btn btn-ghost btn-sm text-error w-full"
                onClick={async () => {
                  if (confirm("Delete this appraisal?")) {
                    await fetch(`/api/customer-px/${id}`, { method: "DELETE" });
                    router.push("/appraisals");
                  }
                }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Issue Modal */}
      {showIssueModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-lg">
            <h3 className="font-bold text-lg mb-4">Add Issue</h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label"><span className="label-text">Category</span></label>
                  <select
                    className="select select-bordered w-full"
                    value={issueForm.category}
                    onChange={(e) => {
                      const newCat = e.target.value;
                      setIssueForm({
                        ...issueForm,
                        category: newCat,
                        subcategory: ISSUE_SUBCATEGORIES[newCat][0],
                      });
                    }}
                  >
                    {ISSUE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                    ))}
                  </select>
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">Subcategory</span></label>
                  <select
                    className="select select-bordered w-full"
                    value={issueForm.subcategory}
                    onChange={(e) => setIssueForm({ ...issueForm, subcategory: e.target.value })}
                  >
                    {ISSUE_SUBCATEGORIES[issueForm.category].map((sub) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-control">
                <label className="label"><span className="label-text">Description *</span></label>
                <textarea
                  className="textarea textarea-bordered"
                  rows={3}
                  placeholder="Describe the issue..."
                  value={issueForm.description}
                  onChange={(e) => setIssueForm({ ...issueForm, description: e.target.value })}
                />
              </div>

              <div className="form-control">
                <label className="label"><span className="label-text">Action Needed</span></label>
                <input
                  type="text"
                  className="input input-bordered"
                  placeholder="e.g., Replace bumper, repaint"
                  value={issueForm.actionNeeded}
                  onChange={(e) => setIssueForm({ ...issueForm, actionNeeded: e.target.value })}
                />
              </div>

              <div className="form-control">
                <label className="label"><span className="label-text">Estimated Repair Cost (£)</span></label>
                <input
                  type="number"
                  className="input input-bordered"
                  placeholder="0"
                  value={issueForm.estimatedCost}
                  onChange={(e) => setIssueForm({ ...issueForm, estimatedCost: e.target.value })}
                />
              </div>

              {/* Photo Upload */}
              <div className="form-control">
                <label className="label"><span className="label-text">Photos</span></label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="file-input file-input-bordered w-full"
                  onChange={handlePhotoChange}
                />
                {photoPreviews.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {photoPreviews.map((preview, idx) => (
                      <div key={idx} className="relative">
                        <img src={preview} alt={`Preview ${idx + 1}`} className="w-16 h-16 object-cover rounded-lg" />
                        <button
                          type="button"
                          className="absolute -top-1 -right-1 btn btn-circle btn-xs btn-error"
                          onClick={() => removePhoto(idx)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setShowIssueModal(false);
                  setPhotoFiles([]);
                  setPhotoPreviews([]);
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddIssue}
                disabled={isAddingIssue}
              >
                {isAddingIssue ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    {isUploadingPhotos ? "Uploading..." : "Saving..."}
                  </>
                ) : (
                  "Add Issue"
                )}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowIssueModal(false)}></div>
        </div>
      )}

      {/* Photo Lightbox Modal */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxPhoto(null)}
        >
          <button
            className="absolute top-4 right-4 btn btn-circle btn-ghost text-white hover:bg-white/20"
            onClick={() => setLightboxPhoto(null)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={lightboxPhoto}
            alt="Full size photo"
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <a
            href={lightboxPhoto}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-4 right-4 btn btn-sm btn-ghost text-white hover:bg-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Open Original
          </a>
        </div>
      )}
    </DashboardLayout>
  );
}
