import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "react-hot-toast";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { KeyValue, KeyValueGrid } from "@/components/ui/KeyValue";
import { Badge } from "@/components/ui/Badge";
import { PhotoGallery } from "@/components/ui/PhotoGallery";
import { compressImages } from "@/libs/imageCompression";

// Categories must match AppraisalIssue model schema (lowercase)
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

export default function AppraisalDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [appraisal, setAppraisal] = useState(null);
  const [issues, setIssues] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConverting, setIsConverting] = useState(false);
  const [addToPrepBoard, setAddToPrepBoard] = useState(true);

  // Issue modal state
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLink, setShareLink] = useState(null);
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
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
  const [isCompressing, setIsCompressing] = useState(false);

  useEffect(() => {
    if (id) {
      fetchAppraisal();
      fetchIssues();
    }
  }, [id]);

  const fetchAppraisal = async () => {
    try {
      const res = await fetch(`/api/appraisals/${id}`);
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
      const res = await fetch(`/api/appraisals/issues?appraisalId=${id}`);
      const data = await res.json();
      setIssues(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load issues:", error);
      setIssues([]);
    }
  };

  const handleDecision = async (decision) => {
    try {
      await fetch(`/api/appraisals/${id}`, {
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
      const res = await fetch(`/api/appraisals/${id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          initialStatus: "in_stock",
          showOnPrepBoard: addToPrepBoard,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        if (res.status === 409) {
          throw new Error(error.message || "Vehicle already in stock");
        }
        throw new Error(error.error || "Failed to convert");
      }
      if (addToPrepBoard) {
        toast.success("Vehicle added to Stock Book and Prep Board!");
        router.push("/prep");
      } else {
        toast.success("Vehicle added to Stock Book!");
        router.push("/stock-book");
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsConverting(false);
    }
  };

  const handlePhotoChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setIsCompressing(true);
    try {
      const compressedFiles = await compressImages(files);
      setPhotoFiles(prev => [...prev, ...compressedFiles]);

      compressedFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotoPreviews(prev => [...prev, reader.result]);
        };
        reader.readAsDataURL(file);
      });
    } catch (error) {
      console.error("Compression error:", error);
      toast.error("Failed to process images");
    } finally {
      setIsCompressing(false);
    }
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
          // Store S3 key (permanent) if available, otherwise use URL (for local dev)
          uploadedUrls.push(data.key || data.url);
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

      const res = await fetch("/api/appraisals/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appraisalId: id,
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
      await fetch(`/api/appraisals/issues/${issueId}`, { method: "DELETE" });
      toast.success("Issue deleted");
      fetchIssues();
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const totalEstimatedCost = issues.reduce((sum, issue) => sum + (issue.estimatedCost || 0), 0);

  const handleGenerateShareLink = async () => {
    setIsGeneratingShare(true);
    try {
      const res = await fetch(`/api/appraisals/${id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiresInDays: 60 }),
      });
      if (!res.ok) throw new Error("Failed to generate share link");
      const data = await res.json();
      const fullUrl = `${window.location.origin}${data.shareUrl}`;
      setShareLink({
        url: fullUrl,
        expiresAt: data.expiresAt,
      });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsGeneratingShare(false);
    }
  };

  const handleRevokeShareLink = async () => {
    if (!confirm("Revoke this share link? Anyone with the link will no longer be able to view this appraisal.")) return;
    try {
      const res = await fetch(`/api/appraisals/${id}/share`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to revoke");
      setShareLink(null);
      toast.success("Share link revoked");
    } catch (error) {
      toast.error(error.message);
    }
  };

  const copyShareLink = () => {
    if (shareLink?.url) {
      navigator.clipboard.writeText(shareLink.url);
      toast.success("Link copied to clipboard!");
    }
  };

  const handlePrint = () => {
    const printContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Appraisal - ${appraisal.vehicleReg}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #1e293b; }
    .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
    .title { font-size: 28px; font-weight: bold; margin-bottom: 8px; }
    .reg { font-size: 24px; font-family: monospace; color: #1e293b; font-weight: bold; }
    .subtitle { font-size: 16px; color: #64748b; margin-top: 8px; }
    .section { margin-bottom: 30px; }
    .section-title { font-size: 16px; font-weight: 600; color: #475569; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .field { margin-bottom: 12px; }
    .field-label { font-size: 12px; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px; }
    .field-value { font-size: 14px; color: #1e293b; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; }
    .badge-warning { background: #fef3c7; color: #92400e; }
    .badge-success { background: #dcfce7; color: #166534; }
    .badge-error { background: #fee2e2; color: #991b1b; }
    .notes { background: #f8fafc; padding: 16px; border-radius: 8px; white-space: pre-wrap; font-size: 14px; }
    .issue { background: #f8fafc; padding: 12px; border-radius: 8px; margin-bottom: 12px; border-left: 4px solid #6366f1; }
    .issue-header { display: flex; gap: 8px; margin-bottom: 8px; align-items: center; }
    .issue-badge { background: #e0e7ff; color: #4338ca; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
    .issue-desc { font-size: 14px; margin-bottom: 4px; }
    .issue-cost { color: #dc2626; font-weight: 600; font-size: 13px; }
    .total-cost { font-size: 18px; color: #dc2626; font-weight: bold; margin-top: 16px; padding: 12px; background: #fef2f2; border-radius: 8px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <p class="reg">${appraisal.vehicleReg}</p>
    <p class="subtitle">${appraisal.vehicleMake || ""} ${appraisal.vehicleModel || ""} ${appraisal.vehicleYear ? `(${appraisal.vehicleYear})` : ""}</p>
    <span class="badge ${appraisal.decision === "converted" ? "badge-success" : appraisal.decision === "declined" ? "badge-error" : "badge-warning"}" style="margin-top: 12px;">
      ${appraisal.decision === "pending" ? "New" : appraisal.decision === "reviewed" ? "Reviewed" : appraisal.decision === "converted" ? "Converted" : appraisal.decision === "declined" ? "Declined" : appraisal.decision}
    </span>
  </div>

  <div class="section">
    <h2 class="section-title">Vehicle Details</h2>
    <div class="grid">
      <div class="field"><div class="field-label">Make</div><div class="field-value">${appraisal.vehicleMake || "—"}</div></div>
      <div class="field"><div class="field-label">Model</div><div class="field-value">${appraisal.vehicleModel || "—"}</div></div>
      <div class="field"><div class="field-label">Year</div><div class="field-value">${appraisal.vehicleYear || "—"}</div></div>
      <div class="field"><div class="field-label">Mileage</div><div class="field-value">${appraisal.mileage ? appraisal.mileage.toLocaleString() : "—"}</div></div>
      <div class="field"><div class="field-label">Colour</div><div class="field-value">${appraisal.colour || "—"}</div></div>
      <div class="field"><div class="field-label">Fuel Type</div><div class="field-value">${appraisal.fuelType || "—"}</div></div>
      <div class="field"><div class="field-label">Transmission</div><div class="field-value">${appraisal.transmission || "—"}</div></div>
      <div class="field"><div class="field-label">Proposed Price</div><div class="field-value" style="font-weight: bold; font-size: 18px;">${appraisal.proposedPurchasePrice ? "£" + appraisal.proposedPurchasePrice.toLocaleString() : "—"}</div></div>
    </div>
  </div>

  ${appraisal.conditionNotes ? `
  <div class="section">
    <h2 class="section-title">Condition Notes</h2>
    <div class="notes">${appraisal.conditionNotes}</div>
  </div>
  ` : ""}

  ${issues.length > 0 ? `
  <div class="section">
    <h2 class="section-title">Issues & Damage (${issues.length})</h2>
    ${issues.map(issue => `
      <div class="issue">
        <div class="issue-header">
          <span class="issue-badge">${CATEGORY_LABELS[issue.category] || issue.category}</span>
          <strong>${issue.subcategory}</strong>
        </div>
        <p class="issue-desc">${issue.description}</p>
        ${issue.actionNeeded ? `<p style="font-size: 12px; color: #64748b;">Action: ${issue.actionNeeded}</p>` : ""}
        ${issue.estimatedCost ? `<p class="issue-cost">Est. cost: £${issue.estimatedCost.toLocaleString()}</p>` : ""}
      </div>
    `).join("")}
    ${totalEstimatedCost > 0 ? `<div class="total-cost">Total Estimated Repairs: £${totalEstimatedCost.toLocaleString()}</div>` : ""}
  </div>
  ` : ""}

  ${appraisal.contactId ? `
  <div class="section">
    <h2 class="section-title">Seller Information</h2>
    <div class="grid">
      <div class="field"><div class="field-label">Name</div><div class="field-value">${appraisal.contactId.name || "—"}</div></div>
      <div class="field"><div class="field-label">Phone</div><div class="field-value">${appraisal.contactId.phone || "—"}</div></div>
      <div class="field"><div class="field-label">Email</div><div class="field-value">${appraisal.contactId.email || "—"}</div></div>
    </div>
  </div>
  ` : ""}

  <div class="footer">
    <p>Appraisal created: ${new Date(appraisal.createdAt).toLocaleDateString()} ${new Date(appraisal.createdAt).toLocaleTimeString()}</p>
    <p style="margin-top: 4px;">Printed from DealerHQ</p>
  </div>
</body>
</html>`;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.onload = function () {
      printWindow.print();
    };
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

  if (!appraisal) {
    return (
      <DashboardLayout>
        <div className="alert alert-error">Appraisal not found</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Head><title>Appraisal {appraisal.vehicleReg} | DealerHQ</title></Head>

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Link href="/appraisals" className="btn btn-ghost btn-sm">← Back</Link>
          <button className="btn btn-ghost btn-sm" onClick={handlePrint}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowShareModal(true)}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share
          </button>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold font-mono">{appraisal.vehicleReg}</h1>
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
          {/* Vehicle Details */}
          <Card>
            <CardHeader title="Vehicle Details" icon={<svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>} />
            <CardContent>
              <KeyValueGrid cols={2}>
                <KeyValue label="Make" value={appraisal.vehicleMake} />
                <KeyValue label="Model" value={appraisal.vehicleModel} />
                <KeyValue label="Year" value={appraisal.vehicleYear} />
                <KeyValue label="Mileage" value={appraisal.mileage?.toLocaleString()} />
                <KeyValue label="Colour" value={appraisal.colour} />
                <KeyValue label="Fuel Type" value={appraisal.fuelType} />
                <KeyValue label="Transmission" value={appraisal.transmission} />
              </KeyValueGrid>
              <div className="mt-4 pt-4 border-t border-slate-100">
                <KeyValue label="Proposed Price" value={appraisal.proposedPurchasePrice ? `£${appraisal.proposedPurchasePrice.toLocaleString()}` : null} size="lg" />
              </div>
            </CardContent>
          </Card>

          {/* Condition Notes */}
          <Card>
            <CardHeader title="Condition Notes" icon={<svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} />
            <CardContent>
              <p className="whitespace-pre-wrap text-slate-700">{appraisal.conditionNotes || "No notes recorded"}</p>
            </CardContent>
          </Card>

          {/* Issues Section */}
          <Card>
            <CardHeader
              title="Issues & Damage"
              icon={<svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
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
                      {issue.photos && issue.photos.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-200">
                          <PhotoGallery photos={issue.photos} thumbnailSize="sm" showCount={false} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Legacy Damage Photos - show if existing */}
          {appraisal.damagePhotos && appraisal.damagePhotos.length > 0 && (
            <Card>
              <CardHeader title="Legacy Damage Photos" icon={<svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} subtitle="Consider creating issues for these photos" />
              <CardContent>
                <PhotoGallery photos={appraisal.damagePhotos} thumbnailSize="lg" />
              </CardContent>
            </Card>
          )}

          {/* Fault Code Photos - show if existing */}
          {appraisal.faultCodePhotos && appraisal.faultCodePhotos.length > 0 && (
            <Card>
              <CardHeader title="Fault Code Photos" icon={<svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />
              <CardContent>
                <PhotoGallery photos={appraisal.faultCodePhotos} thumbnailSize="lg" />
              </CardContent>
            </Card>
          )}

          {/* Seller Info */}
          {appraisal.contactId && (
            <Card>
              <CardHeader title="Seller Information" icon={<svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>} />
              <CardContent>
                <KeyValueGrid cols={3}>
                  <KeyValue label="Name" value={appraisal.contactId?.name} />
                  <KeyValue label="Phone" value={appraisal.contactId?.phone} />
                  <KeyValue label="Email" value={appraisal.contactId?.email} />
                </KeyValueGrid>
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
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm checkbox-primary"
                      checked={addToPrepBoard}
                      onChange={(e) => setAddToPrepBoard(e.target.checked)}
                    />
                    <span className="text-sm text-slate-700">Also add to Prep Board</span>
                  </label>
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
                    Add to Stock Book
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
                </div>
              )}

              {appraisal.decision === "converted" || appraisal.vehicleId ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 text-center">
                    Vehicle added to Stock Book
                  </div>
                  <Link
                    href="/stock-book"
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-[#0066CC] text-white hover:bg-[#0055BB] transition-colors"
                  >
                    View in Stock Book
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
                      await fetch(`/api/appraisals/${id}`, { method: "DELETE" });
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
          <div className="modal-box max-w-lg max-h-[90dvh] overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
            <h3 className="font-bold text-lg mb-4">Add Issue</h3>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                {isCompressing && (
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                    <span className="loading loading-spinner loading-sm"></span>
                    <span>Compressing images...</span>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {/* Take Photo - opens camera on mobile */}
                  <label className="btn btn-primary gap-2 cursor-pointer">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Take Photo
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </label>
                  {/* Upload Photos - opens gallery with multi-select */}
                  <label className="btn btn-ghost gap-2 cursor-pointer">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Upload Photos
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </label>
                </div>
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

      {/* Share Modal */}
      {showShareModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-md">
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
              onClick={() => setShowShareModal(false)}
            >
              ✕
            </button>
            <div className="text-center mb-6">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#14B8A6]/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#14B8A6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </div>
              <h3 className="font-bold text-lg">Share Appraisal</h3>
              <p className="text-sm text-base-content/60 mt-1">
                Share a read-only view of this appraisal
              </p>
            </div>

            {shareLink ? (
              <div className="space-y-4">
                <div className="bg-base-200 rounded-lg p-4">
                  <label className="text-xs text-base-content/60 uppercase tracking-wider">Public Link</label>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="text"
                      readOnly
                      value={shareLink.url}
                      className="input input-bordered input-sm flex-1 text-xs font-mono"
                    />
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={copyShareLink}
                    >
                      Copy
                    </button>
                  </div>
                  <p className="text-xs text-base-content/60 mt-2">
                    Expires: {new Date(shareLink.expiresAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      window.open(`mailto:?subject=Vehicle Appraisal - ${appraisal.vehicleReg}&body=View the appraisal here: ${shareLink.url}`, "_blank");
                    }}
                    className="btn btn-ghost btn-sm"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Email
                  </button>
                  <button
                    onClick={() => {
                      window.open(`https://wa.me/?text=View this vehicle appraisal: ${encodeURIComponent(shareLink.url)}`, "_blank");
                    }}
                    className="btn btn-ghost btn-sm"
                  >
                    <svg className="w-4 h-4 mr-1 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    WhatsApp
                  </button>
                </div>

                <button
                  onClick={handleRevokeShareLink}
                  className="btn btn-ghost btn-sm text-error w-full"
                >
                  Revoke Link
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-center text-base-content/60">
                  Generate a secure link that allows anyone to view this appraisal (read-only). The link will expire after 60 days.
                </p>
                <button
                  className="btn btn-primary w-full"
                  onClick={handleGenerateShareLink}
                  disabled={isGeneratingShare}
                >
                  {isGeneratingShare ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Generating...
                    </>
                  ) : (
                    "Generate Share Link"
                  )}
                </button>
              </div>
            )}
          </div>
          <div className="modal-backdrop" onClick={() => setShowShareModal(false)}></div>
        </div>
      )}
    </DashboardLayout>
  );
}
