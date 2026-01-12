import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "react-hot-toast";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { KeyValue, KeyValueGrid } from "@/components/ui/KeyValue";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { PhotoGallery } from "@/components/ui/PhotoGallery";

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

  // Email share modal state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [includeValuation, setIncludeValuation] = useState(true);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

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

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!emailTo.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    setIsSendingEmail(true);
    try {
      const res = await fetch(`/api/customer-px/${id}/share-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: emailTo.trim(),
          message: emailMessage.trim() || undefined,
          includeValuation,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send email");
      }

      toast.success(`Valuation sent to ${emailTo}`);
      setShowEmailModal(false);
      setEmailTo("");
      setEmailMessage("");
    } catch (error) {
      toast.error(error.message || "Failed to send email");
    } finally {
      setIsSendingEmail(false);
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
      <Head><title>PX Appraisal {appraisal.vehicleReg} | DealerHQ</title></Head>

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
          <Card>
            <CardHeader title="Customer Details" />
            <CardContent>
              <KeyValueGrid cols={3}>
                <KeyValue label="Name" value={appraisal.customerName || appraisal.contactId?.name} />
                <KeyValue label="Email" value={appraisal.customerEmail || appraisal.contactId?.email} />
                <KeyValue label="Phone" value={appraisal.customerPhone || appraisal.contactId?.phone} />
                {appraisal.interestedInVehicle && (
                  <div className="md:col-span-3">
                    <KeyValue label="Interested In Vehicle" value={appraisal.interestedInVehicle} />
                  </div>
                )}
              </KeyValueGrid>
            </CardContent>
          </Card>

          {/* Vehicle Details */}
          <Card>
            <CardHeader title="Vehicle Details" />
            <CardContent>
              <KeyValueGrid cols={2}>
                <KeyValue label="Make" value={appraisal.vehicleMake} />
                <KeyValue label="Model" value={appraisal.vehicleModel} />
                <KeyValue label="Year" value={appraisal.vehicleYear} />
                <KeyValue label="Mileage" value={appraisal.mileage ? `${appraisal.mileage.toLocaleString()} mi` : null} />
                <KeyValue label="Colour" value={appraisal.colour} />
                <KeyValue label="Fuel Type" value={appraisal.fuelType} />
                {appraisal.conditionRating && (
                  <KeyValue label="Condition" value={<Badge variant={
                    appraisal.conditionRating === 'excellent' ? 'success' :
                    appraisal.conditionRating === 'good' ? 'info' :
                    appraisal.conditionRating === 'fair' ? 'warning' : 'danger'
                  }>{appraisal.conditionRating}</Badge>} />
                )}
                {appraisal.outstandingFinanceAmount > 0 && (
                  <KeyValue label="Outstanding Finance" value={<span className="text-red-600 font-bold">£{appraisal.outstandingFinanceAmount?.toLocaleString()}</span>} />
                )}
                {appraisal.proposedPurchasePrice > 0 && (
                  <KeyValue label="Proposed Price" value={<span className="text-lg font-bold text-emerald-600">£{appraisal.proposedPurchasePrice?.toLocaleString()}</span>} size="lg" />
                )}
              </KeyValueGrid>
            </CardContent>
          </Card>

          {/* Condition Notes */}
          <Card>
            <CardHeader title="Condition Notes" />
            <CardContent>
              <p className="whitespace-pre-wrap text-slate-700">{appraisal.conditionNotes || <span className="text-slate-400 italic">No notes recorded</span>}</p>
            </CardContent>
          </Card>

          {/* Vehicle Photos Gallery */}
          {appraisal.photos && (
            (appraisal.photos.exterior?.length > 0 || appraisal.photos.interior?.length > 0 ||
             appraisal.photos.dashboard || appraisal.photos.odometer) && (
              <Card>
                <CardHeader title="Vehicle Photos" icon="📷" />
                <CardContent>
                  <PhotoGallery
                    photos={[
                      ...(appraisal.photos.exterior || []).map(url => ({ url, category: 'exterior' })),
                      ...(appraisal.photos.interior || []).map(url => ({ url, category: 'interior' })),
                      ...(appraisal.photos.dashboard ? [{ url: appraisal.photos.dashboard, category: 'dashboard', caption: 'Dashboard' }] : []),
                      ...(appraisal.photos.odometer ? [{ url: appraisal.photos.odometer, category: 'odometer', caption: 'Odometer' }] : []),
                    ]}
                    groupByCategory
                    showCount={false}
                  />
                </CardContent>
              </Card>
            )
          )}

          {/* Issues Section */}
          <Card>
            <CardHeader
              title="Issues & Damage"
              icon="⚠️"
              subtitle={totalEstimatedCost > 0 ? `Total est. repair: £${totalEstimatedCost.toLocaleString()}` : undefined}
              action={
                <button
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-[#0066CC] text-white hover:bg-[#0055BB] transition-colors"
                  onClick={() => setShowIssueModal(true)}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Issue
                </button>
              }
            />
            <CardContent>
              {issues.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-slate-600 font-medium">No issues recorded</p>
                  <p className="text-sm text-slate-400 mt-1">Click "Add Issue" to log damage, faults, or condition notes</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {issues.map((issue) => (
                    <div key={issue.id} className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={
                            issue.category === 'mechanical' ? 'danger' :
                            issue.category === 'electrical' ? 'warning' :
                            issue.category === 'bodywork' ? 'info' :
                            issue.category === 'fault_codes' ? 'danger' :
                            issue.category === 'mot' ? 'secondary' : 'default'
                          }>
                            {CATEGORY_LABELS[issue.category] || issue.category}
                          </Badge>
                          <span className="font-semibold text-slate-800">{issue.subcategory}</span>
                        </div>
                        <button
                          className="text-xs text-red-500 hover:text-red-700 hover:underline transition-colors"
                          onClick={() => handleDeleteIssue(issue.id)}
                        >
                          Delete
                        </button>
                      </div>
                      <p className="text-sm text-slate-700 mb-2">{issue.description}</p>
                      {issue.actionNeeded && (
                        <p className="text-xs text-slate-500 mb-1">
                          <span className="font-medium text-slate-600">Action needed:</span> {issue.actionNeeded}
                        </p>
                      )}
                      {issue.estimatedCost > 0 && (
                        <p className="text-sm font-semibold text-red-600">
                          Est. cost: £{issue.estimatedCost.toLocaleString()}
                        </p>
                      )}
                      {/* Photos - use PhotoGallery component */}
                      {issue.photos && issue.photos.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-200">
                          <PhotoGallery
                            photos={issue.photos}
                            thumbnailSize="sm"
                            showCount={false}
                          />
                        </div>
                      )}
                      {/* Attachments format */}
                      {issue.attachments && issue.attachments.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-200">
                          <PhotoGallery
                            photos={issue.attachments.map(a => ({ url: a.url, caption: a.caption }))}
                            thumbnailSize="sm"
                            showCount={false}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documents Section */}
          {(appraisal.v5Url || appraisal.serviceHistoryUrl || (appraisal.otherDocuments && appraisal.otherDocuments.length > 0)) && (
            <Card>
              <CardHeader title="Documents" icon="📄" />
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {appraisal.v5Url && (
                    <a
                      href={appraisal.v5Url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                    >
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      V5 Document
                    </a>
                  )}
                  {appraisal.serviceHistoryUrl && (
                    <a
                      href={appraisal.serviceHistoryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                    >
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Service History
                    </a>
                  )}
                  {appraisal.otherDocuments?.map((doc, idx) => (
                    <a
                      key={idx}
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                    >
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {doc.name || "Document"}
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Hints */}
          {appraisal.aiHintText && (
            <Card variant="accent">
              <CardHeader title="AI Suggestions" icon="🤖" />
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-slate-700">{appraisal.aiHintText}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Actions Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-20">
            <CardHeader title="Actions" />
            <CardContent className="space-y-4">
              {(appraisal.decision === "pending" || appraisal.decision === "reviewed") && !appraisal.vehicleId && (
                <div className="space-y-3">
                  <button
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                    onClick={handleConvert}
                    disabled={isConverting}
                  >
                    {isConverting ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    Convert to Stock
                  </button>
                  <button
                    className="w-full px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                    onClick={() => handleDecision("reviewed")}
                  >
                    Mark as Reviewed
                  </button>
                  <button
                    className="w-full px-4 py-2 text-sm font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                    onClick={() => handleDecision("declined")}
                  >
                    Decline
                  </button>
                  <p className="text-xs text-slate-500 text-center">Converting will create a vehicle and default prep tasks.</p>
                </div>
              )}

              {appraisal.decision === "converted" || appraisal.vehicleId ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 text-center">
                    Vehicle added to stock
                  </div>
                  <Link
                    href="/sales-prep"
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-[#0066CC] text-white hover:bg-[#0055BB] transition-colors"
                  >
                    View in Stock & Prep
                  </Link>
                </div>
              ) : null}

              {appraisal.decision === "declined" && (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-slate-100 border border-slate-200 text-sm text-slate-600 text-center">
                    This appraisal was declined
                  </div>
                  <button
                    className="w-full px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                    onClick={() => handleDecision("pending")}
                  >
                    Re-open
                  </button>
                </div>
              )}

              {/* Email Valuation */}
              <div className="pt-4 border-t border-slate-200">
                <button
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                  onClick={() => {
                    // Pre-fill customer email if available
                    const customerEmail = appraisal.customerEmail || appraisal.contactId?.email;
                    if (customerEmail) setEmailTo(customerEmail);
                    setShowEmailModal(true);
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Email Valuation
                </button>
              </div>

              {/* Issues Summary */}
              {issues.length > 0 && (
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Issues Summary</p>
                  <p className="text-sm text-slate-700">{issues.length} issue{issues.length !== 1 ? "s" : ""} logged</p>
                  {totalEstimatedCost > 0 && (
                    <p className="text-sm font-semibold text-red-600">£{totalEstimatedCost.toLocaleString()} est. repairs</p>
                  )}
                </div>
              )}

              <div className="pt-4 border-t border-slate-200">
                <button
                  className="w-full px-4 py-2 text-sm font-medium rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                  onClick={async () => {
                    if (confirm("Delete this appraisal?")) {
                      await fetch(`/api/customer-px/${id}`, { method: "DELETE" });
                      router.push("/appraisals");
                    }
                  }}
                >
                  Delete Appraisal
                </button>
              </div>
            </CardContent>
          </Card>
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

      {/* Email Valuation Modal */}
      {showEmailModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">Email Valuation</h3>
              <button
                type="button"
                onClick={() => {
                  setShowEmailModal(false);
                  setEmailTo("");
                  setEmailMessage("");
                }}
                className="btn btn-ghost btn-sm btn-circle"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSendEmail} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Recipient Email</span>
                </label>
                <input
                  type="email"
                  className="input input-bordered w-full"
                  placeholder="customer@example.com"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  required
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Personal Message (optional)</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full"
                  placeholder="Add a message to include with the valuation..."
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="form-control">
                <label className="cursor-pointer label justify-start gap-3">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary"
                    checked={includeValuation}
                    onChange={(e) => setIncludeValuation(e.target.checked)}
                  />
                  <span className="label-text">
                    Include valuation amount
                    {appraisal.proposedPurchasePrice ? (
                      <span className="text-emerald-600 font-semibold ml-1">
                        (£{appraisal.proposedPurchasePrice.toLocaleString()})
                      </span>
                    ) : (
                      <span className="text-slate-400 ml-1">(not set)</span>
                    )}
                  </span>
                </label>
              </div>

              <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600">
                <p className="font-medium mb-1">Email will include:</p>
                <ul className="list-disc list-inside text-xs space-y-0.5 text-slate-500">
                  <li>Vehicle details ({appraisal.vehicleReg})</li>
                  {includeValuation && appraisal.proposedPurchasePrice && <li>Valuation amount</li>}
                  {emailMessage && <li>Your personal message</li>}
                </ul>
              </div>

              <div className="modal-action">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setShowEmailModal(false);
                    setEmailTo("");
                    setEmailMessage("");
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary gap-2"
                  disabled={isSendingEmail || !emailTo.trim()}
                >
                  {isSendingEmail ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Sending...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      Send Email
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={() => setShowEmailModal(false)}></div>
        </div>
      )}

    </DashboardLayout>
  );
}
