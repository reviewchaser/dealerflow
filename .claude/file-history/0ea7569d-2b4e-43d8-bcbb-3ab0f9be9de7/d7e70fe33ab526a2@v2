import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import DashboardLayout from "@/components/DashboardLayout";
import ShareFormModal from "@/components/ShareFormModal";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import useDealerRedirect from "@/hooks/useDealerRedirect";
import { AttachmentField, isAttachmentValue, formatAttachmentHtml } from "@/components/ui/AttachmentField";

// Human-readable form type labels
// Note: Appraisal forms are handled in the dedicated Appraisals section
const FORM_TYPE_LABELS = {
  PDI: "PDI",
  TEST_DRIVE: "Test Drive",
  WARRANTY_CLAIM: "Warranty Claim",
  COURTESY_OUT: "Courtesy Car Out",
  COURTESY_IN: "Courtesy Car In",
  SERVICE_RECEIPT: "Service Receipt",
  REVIEW_FEEDBACK: "Review & Feedback",
  OTHER: "Other",
};

// Form type colors for icons and accents
const FORM_TYPE_STYLES = {
  PDI: { bg: "bg-blue-50", text: "text-blue-600", accent: "border-blue-500" },
  TEST_DRIVE: { bg: "bg-cyan-50", text: "text-cyan-600", accent: "border-cyan-500" },
  WARRANTY_CLAIM: { bg: "bg-red-50", text: "text-red-600", accent: "border-red-500" },
  COURTESY_OUT: { bg: "bg-emerald-50", text: "text-emerald-600", accent: "border-emerald-500" },
  COURTESY_IN: { bg: "bg-green-50", text: "text-green-600", accent: "border-green-500" },
  SERVICE_RECEIPT: { bg: "bg-teal-50", text: "text-teal-600", accent: "border-teal-500" },
  REVIEW_FEEDBACK: { bg: "bg-pink-50", text: "text-pink-600", accent: "border-pink-500" },
  OTHER: { bg: "bg-slate-50", text: "text-slate-600", accent: "border-slate-500" },
};

// Small form type icons for list items
const FormTypeIcon = ({ type, size = "w-4 h-4" }) => {
  const iconProps = { className: size, fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 1.5 };
  switch (type) {
    case "PDI":
      return <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    case "TEST_DRIVE":
      return <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg>;
    case "WARRANTY_CLAIM":
      return <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>;
    case "COURTESY_OUT":
    case "COURTESY_IN":
      return <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" /></svg>;
    case "SERVICE_RECEIPT":
      return <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185zM9.75 9h.008v.008H9.75V9zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 4.5h.008v.008h-.008V13.5zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>;
    case "REVIEW_FEEDBACK":
      return <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>;
    default:
      return <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>;
  }
};

// Large feature icon for detail panel
const LargeFormIcon = ({ type }) => {
  const styles = FORM_TYPE_STYLES[type] || FORM_TYPE_STYLES.OTHER;
  return (
    <div className={`w-12 h-12 rounded-xl ${styles.bg} ${styles.text} flex items-center justify-center flex-shrink-0`}>
      <FormTypeIcon type={type} size="w-6 h-6" />
    </div>
  );
};

// Time ago helper
const timeAgo = (date) => {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return then.toLocaleDateString();
};

export default function Forms() {
  const router = useRouter();
  const { isRedirecting } = useDealerRedirect();
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState(router.query.tab || "submissions");
  const [forms, setForms] = useState([]);
  const [filteredForms, setFilteredForms] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [shareForm, setShareForm] = useState(null);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [submissionDetail, setSubmissionDetail] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Filters for templates
  const [templateTypeFilter, setTemplateTypeFilter] = useState(router.query.type || "");

  // Filters for submissions
  const [searchQuery, setSearchQuery] = useState("");
  const [vrmSearch, setVrmSearch] = useState("");
  const [selectedFormId, setSelectedFormId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const dealerId = session?.user?.dealerId || "000000000000000000000000";

  // Detect mobile breakpoint (matches Tailwind's md: breakpoint at 768px)
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Check if any filters are active
  const hasActiveFilters = vrmSearch || searchQuery || statusFilter || selectedFormId;
  const activeFilterCount = [vrmSearch, searchQuery, statusFilter, selectedFormId].filter(Boolean).length;

  // Clear all filters
  const clearAllFilters = () => {
    setVrmSearch("");
    setSearchQuery("");
    setStatusFilter("");
    setSelectedFormId("");
  };

  useEffect(() => {
    if (status === "loading") return;
    loadForms();
    loadSubmissions();
  }, [status]);

  useEffect(() => {
    if (router.query.tab) setActiveTab(router.query.tab);
    if (router.query.type) setTemplateTypeFilter(router.query.type);
  }, [router.query]);

  useEffect(() => {
    applyFilters();
  }, [submissions, searchQuery, vrmSearch, selectedFormId, statusFilter]);

  useEffect(() => {
    applyTemplateFilters();
  }, [forms, templateTypeFilter]);

  // Load submission detail when selected
  useEffect(() => {
    if (selectedSubmission) {
      // Use id or _id depending on what's available (toJSON plugin transforms _id to id)
      const submissionId = selectedSubmission.id || selectedSubmission._id;
      loadSubmissionDetail(submissionId);
    } else {
      setSubmissionDetail(null);
    }
  }, [selectedSubmission]);

  const loadForms = async () => {
    try {
      setError(null);
      const res = await fetch(`/api/forms?dealerId=${dealerId}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setForms(data);
      } else if (data.error) {
        setError(data.error);
        setForms([]);
      } else {
        setForms([]);
      }
      setIsLoading(false);
    } catch (err) {
      console.error("Failed to load forms:", err);
      setError("Failed to load forms");
      setForms([]);
      setIsLoading(false);
    }
  };

  const loadSubmissions = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/forms/submissions?dealerId=${dealerId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setSubmissions(data);
        // Auto-select the most recent submission on desktop only (not on mobile)
        // On mobile, we want to show the list first
        const isDesktop = window.innerWidth >= 768;
        if (data.length > 0 && !selectedSubmission && isDesktop) {
          setSelectedSubmission(data[0]);
        }
      } else {
        console.error("API returned non-array:", data);
        setSubmissions([]);
      }
      setIsLoading(false);
    } catch (error) {
      console.error("Failed to load submissions:", error);
      setSubmissions([]);
      setIsLoading(false);
    }
  };

  const loadSubmissionDetail = async (id) => {
    try {
      setIsLoadingDetail(true);
      console.log("Loading submission detail for ID:", id);
      const res = await fetch(`/api/forms/submissions/${id}`);
      const data = await res.json();
      console.log("API response:", res.status, data);

      // Check for errors or missing submission
      if (!res.ok || data.error || !data.submission) {
        console.error("Failed to load submission:", data.error || "No submission data", data);
        setSubmissionDetail(null);
        return;
      }

      setSubmissionDetail(data);

      // Mark as viewed if it's new
      const submission = submissions.find(s => (s.id || s._id) === id);
      if (submission && !submission.viewed) {
        markAsViewed(id);
      }
    } catch (error) {
      console.error("Failed to load submission detail:", error);
      setSubmissionDetail(null);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const markAsViewed = async (id) => {
    try {
      await fetch(`/api/forms/submissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ viewed: true, status: "viewed" }),
      });
      // Update local state
      setSubmissions(prev => prev.map(s =>
        (s.id || s._id) === id ? { ...s, viewed: true, status: "viewed" } : s
      ));
    } catch (error) {
      console.error("Failed to mark as viewed:", error);
    }
  };

  const applyFilters = () => {
    // Exclude REVIEW_FEEDBACK submissions - they appear in dedicated Reviews page
    let filtered = [...submissions].filter(s => s.formId?.type !== "REVIEW_FEEDBACK");

    if (selectedFormId) {
      filtered = filtered.filter((s) => s.formId?._id === selectedFormId);
    }

    if (statusFilter) {
      if (statusFilter === "new") {
        filtered = filtered.filter((s) => !s.viewed && s.status !== "viewed");
      } else {
        filtered = filtered.filter((s) => s.status === statusFilter);
      }
    }

    if (vrmSearch) {
      const vrmQuery = vrmSearch.toLowerCase().replace(/\s/g, "");
      filtered = filtered.filter((s) => {
        const answers = s.rawAnswers || {};
        const vrmFields = [
          answers.vrm,
          answers.reg,
          answers.registration,
          answers.vehicle_reg,
          answers.regCurrent,
          answers.courtesy_vrm,
        ];
        return vrmFields.some(
          (field) => field && field.toLowerCase().replace(/\s/g, "").includes(vrmQuery)
        );
      });
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((s) => {
        const answers = s.rawAnswers || {};
        return (
          answers.name?.toLowerCase().includes(query) ||
          answers.email?.toLowerCase().includes(query) ||
          answers.phone?.toLowerCase().includes(query)
        );
      });
    }

    setFilteredSubmissions(filtered);
  };

  const applyTemplateFilters = () => {
    let filtered = [...forms];

    if (templateTypeFilter) {
      if (templateTypeFilter === "COURTESY") {
        filtered = filtered.filter((f) => f.type === "COURTESY_IN" || f.type === "COURTESY_OUT");
      } else {
        filtered = filtered.filter((f) => f.type === templateTypeFilter);
      }
    }

    setFilteredForms(filtered);
  };

  const handleDeleteForm = async (formId) => {
    if (!confirm("Delete this form template? This cannot be undone.")) return;

    try {
      const res = await fetch(`/api/forms/${formId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      loadForms();
    } catch (error) {
      alert("Failed to delete form");
    }
  };

  const getPublicUrl = (form) => {
    // Support both legacy isPublic flag and new visibility modes
    // PUBLIC and SHARE_LINK visibility modes should have shareable URLs
    const isShareable = form.isPublic ||
      form.visibility === "PUBLIC" ||
      form.visibility === "SHARE_LINK";

    if (!isShareable || !form.publicSlug) return null;
    return `${window.location.origin}/public/forms/${form.publicSlug}`;
  };

  const getSubmissionCount = (formId) => {
    return submissions.filter((s) => s.formId?._id === formId).length;
  };

  const getVrm = (submission) => {
    const answers = submission.rawAnswers || {};
    return answers.vrm || answers.reg || answers.registration || answers.courtesy_vrm || null;
  };

  // Denylist for PDF export - system/duplicate fields to exclude
  const EXPORT_DENYLIST = [
    'year', 'vehicle_year', 'vehicleyear',
    'vehicle_make', 'vehiclemake',
    'vehicle_model', 'vehiclemodel',
    '_id', '__v', 'createdAt', 'updatedAt'
  ];

  const isExportDenied = (key) => {
    const lowerKey = key.toLowerCase().replace(/[_-]/g, '');
    return EXPORT_DENYLIST.some(denied => lowerKey === denied.toLowerCase().replace(/[_-]/g, ''));
  };

  // Format issues array for display/PDF
  const formatIssuesForPdf = (issues) => {
    if (!Array.isArray(issues)) {
      // Try to parse if it's a string
      try {
        issues = JSON.parse(issues);
      } catch {
        return '<span style="color: #999; font-style: italic;">No issues data</span>';
      }
    }

    // Filter out resolved/complete issues
    const resolvedStatuses = ['complete', 'completed', 'resolved', 'done', 'closed'];
    const activeIssues = issues.filter(issue => {
      const status = (issue.status || '').toLowerCase();
      return !resolvedStatuses.includes(status);
    });

    if (activeIssues.length === 0) {
      return '<span style="color: #16a34a; font-weight: 500;">No outstanding issues</span>';
    }

    return `<ol style="margin: 0; padding-left: 20px; list-style-type: decimal;">
      ${activeIssues.map(issue => `
        <li style="margin-bottom: 12px; padding: 8px; background: #fef3c7; border-radius: 4px; border-left: 3px solid #f59e0b;">
          <strong>${issue.category || 'Unknown'}${issue.subcategory ? ` / ${issue.subcategory}` : ''}</strong>
          <br/><span style="color: #374151;">${issue.description || 'No description'}</span>
          ${issue.actionNeeded ? `<br/><span style="color: #6b7280; font-size: 12px;">Action: ${issue.actionNeeded}</span>` : ''}
          <br/><span style="display: inline-block; margin-top: 4px; padding: 2px 8px; background: #fbbf24; color: #78350f; border-radius: 9999px; font-size: 11px; font-weight: 600;">
            ${issue.status || 'Outstanding'}
          </span>
          ${issue.notes ? `<br/><span style="color: #6b7280; font-size: 12px; font-style: italic;">Notes: ${issue.notes}</span>` : ''}
        </li>
      `).join('')}
    </ol>`;
  };

  // Format photos array for display/PDF
  const formatPhotosForPdf = (photos) => {
    if (!photos) return '<span style="color: #999; font-style: italic;">No photos</span>';

    // Try to parse if string
    let photoArray = photos;
    if (typeof photos === 'string') {
      try {
        photoArray = JSON.parse(photos);
      } catch {
        // If it's a URL string, treat as single photo
        if (photos.startsWith('http') || photos.startsWith('/')) {
          photoArray = [{ url: photos }];
        } else {
          return '<span style="color: #999; font-style: italic;">No photos</span>';
        }
      }
    }

    if (!Array.isArray(photoArray) || photoArray.length === 0) {
      return '<span style="color: #999; font-style: italic;">No photos</span>';
    }

    // Filter out empty objects
    const validPhotos = photoArray.filter(p => p && (p.url || (typeof p === 'string' && p.length > 0)));

    if (validPhotos.length === 0) {
      return '<span style="color: #999; font-style: italic;">No photos</span>';
    }

    return `<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
      ${validPhotos.map(photo => {
        const url = typeof photo === 'string' ? photo : photo.url;
        const filename = typeof photo === 'object' ? (photo.filename || 'Photo') : 'Photo';
        return url ? `
          <div style="text-align: center;">
            <img src="${url}" alt="${filename}" style="max-width: 100%; max-height: 120px; border-radius: 4px; border: 1px solid #e5e5e5;" />
            <div style="font-size: 10px; color: #666; margin-top: 4px;">${filename}</div>
          </div>
        ` : '';
      }).join('')}
    </div>`;
  };

  const formatFieldValue = (value, fieldType = null, fieldName = null) => {
    if (value === null || value === undefined) return "—";
    if (typeof value === "boolean") return value ? "Yes" : "No";

    // Handle signature fields - check if it's base64 image data
    if (fieldType === "SIGNATURE" || (typeof value === "string" && value.startsWith("data:image/"))) {
      return `<img src="${value}" alt="Signature" style="max-width: 300px; max-height: 150px; border: 1px solid #e5e5e5; border-radius: 4px; background: white;" />`;
    }

    // Handle issues field specially
    const lowerFieldName = (fieldName || '').toLowerCase();
    if (lowerFieldName === 'issues' || lowerFieldName.includes('issue')) {
      if (Array.isArray(value) || (typeof value === 'string' && value.startsWith('['))) {
        return formatIssuesForPdf(value);
      }
    }

    // Handle photos field specially
    if (lowerFieldName === 'photos' || lowerFieldName.includes('photo') || lowerFieldName.includes('image')) {
      if (Array.isArray(value) || (typeof value === 'string' && value.startsWith('['))) {
        return formatPhotosForPdf(value);
      }
    }

    // Handle UPLOAD field types and any attachment-like values
    if (fieldType === "UPLOAD" || fieldType === "FILE" || fieldType === "IMAGE") {
      return formatAttachmentHtml(value);
    }

    // Check if value looks like a file upload (path/URL)
    if (isAttachmentValue(value)) {
      return formatAttachmentHtml(value);
    }

    if (typeof value === "object") return JSON.stringify(value);
    return value.toString();
  };

  // Format for display (non-HTML)
  const formatFieldValueDisplay = (value, fieldType = null) => {
    if (value === null || value === undefined) return "—";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    // For signatures in UI display, return a placeholder - the actual image is rendered separately
    if (fieldType === "SIGNATURE" || (typeof value === "string" && value.startsWith("data:image/"))) {
      return null; // Will be handled specially in the UI
    }
    if (typeof value === "object") return JSON.stringify(value);
    return value.toString();
  };

  // Start editing
  const handleStartEdit = () => {
    setEditFormData({ ...submissionDetail.submission?.rawAnswers });
    setIsEditing(true);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditFormData({});
  };

  // Save edit
  const handleSaveEdit = async () => {
    const subId = selectedSubmission.id || selectedSubmission._id;
    if (!subId) {
      toast.error("No submission selected");
      return;
    }
    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/forms/submissions/${subId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawAnswers: editFormData }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save");
      }

      // Reload submission detail
      await loadSubmissionDetail(subId);
      setIsEditing(false);
      setEditFormData({});
      toast.success("Submission updated");
    } catch (error) {
      console.error("Error saving edit:", error);
      toast.error(error.message || "Failed to save changes");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Handle edit input change
  const handleEditInputChange = (fieldName, value) => {
    setEditFormData(prev => ({ ...prev, [fieldName]: value }));
  };

  // Helper function to generate ordered fields HTML for PDF export
  // Fixes bug where fields like "Gear Change" appear at bottom instead of correct position
  const getOrderedFieldsHtml = (detail) => {
    const rawAnswers = detail.submission?.rawAnswers || {};
    const fields = detail.fields || [];

    // Sort fields by order to ensure consistent ordering
    const sortedFields = [...fields].sort((a, b) => (a.order || 0) - (b.order || 0));

    // Build ordered entries: first from sorted fields, then any remaining answers not in fields
    const orderedEntries = [];
    const processedKeys = new Set();

    // Add answers in field order (excluding denied duplicate fields)
    for (const field of sortedFields) {
      const key = field.fieldName;
      if (key && rawAnswers.hasOwnProperty(key) && !key.startsWith('_') && !isExportDenied(key)) {
        orderedEntries.push({ key, value: rawAnswers[key], field });
        processedKeys.add(key);
      }
    }

    // Add any remaining answers not in the field definitions (fallback)
    for (const [key, value] of Object.entries(rawAnswers)) {
      if (!processedKeys.has(key) && !key.startsWith('_') && !isExportDenied(key)) {
        orderedEntries.push({ key, value, field: null });
      }
    }

    return orderedEntries.map(({ key, value, field }) => {
      const label = field?.label || key;
      const fieldType = field?.type || null;
      const formattedValue = formatFieldValue(value, fieldType, key);
      const isSignature = fieldType === "SIGNATURE" || (typeof value === "string" && value.startsWith("data:image/"));
      const isLongText = !isSignature && formattedValue.length > 100;
      const fieldClass = isLongText || isSignature ? 'field field-full' : 'field';
      const valueClass = !value && value !== false ? 'field-value empty' : 'field-value';
      return `
        <div class="${fieldClass}">
          <div class="field-label">${label}</div>
          <div class="${valueClass}">${formattedValue || '—'}</div>
        </div>
      `;
    }).join("");
  };

  // Print submission
  const handlePrint = () => {
    generatePrintContent(false);
  };

  // Export PDF
  const handleExportPdf = () => {
    generatePrintContent(true);
  };

  // Generate printable content
  const generatePrintContent = (isPdf) => {
    const printWindow = window.open("", "_blank");
    const formName = submissionDetail.submission?.formId?.name || "Form Submission";
    const vrm = getVrm(submissionDetail.submission) || "";

    printWindow.document.write(`
      <html>
        <head>
          <title>${formName}${vrm ? ` - ${vrm}` : ""}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #1a1a1a; }
            .header { border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { max-height: 50px; margin-bottom: 15px; }
            .dealer-name { font-size: 14px; color: #666; margin-bottom: 10px; }
            h1 { font-size: 26px; margin-bottom: 8px; color: #1a1a1a; }
            .vrm { font-family: monospace; font-size: 20px; font-weight: bold; color: #2563eb; margin-bottom: 8px; }
            .meta { font-size: 13px; color: #666; }
            .meta span { margin-right: 20px; }
            .section { margin-bottom: 25px; }
            .section-title { font-size: 11px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #e5e5e5; }
            .fields-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
            .field { background: #f8f9fa; border-radius: 6px; padding: 12px; page-break-inside: avoid; }
            .field-full { grid-column: 1 / -1; }
            .field-label { font-size: 11px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 4px; }
            .field-value { font-size: 14px; color: #1a1a1a; word-break: break-word; }
            .field-value.empty { color: #999; font-style: italic; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 11px; color: #999; text-align: center; }

            /* Attachment thumbnail styles for print/PDF */
            .field-value img {
              max-width: 150px;
              max-height: 100px;
              object-fit: cover;
              border-radius: 4px;
              border: 1px solid #e5e5e5;
              margin: 2px;
            }
            .field-value a {
              color: #2563eb;
              text-decoration: underline;
            }

            @media print {
              body { padding: 20px; }
              .no-print { display: none; }
              .field { page-break-inside: avoid; }
              .field-value img {
                max-width: 120px;
                max-height: 80px;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
            .download-btn {
              position: fixed;
              top: 20px;
              right: 20px;
              padding: 10px 20px;
              background: #2563eb;
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
            }
            .download-btn:hover { background: #1d4ed8; }
          </style>
        </head>
        <body>
          ${isPdf ? `<button class="download-btn no-print" onclick="window.print(); return false;">Download PDF</button>` : ""}
          <div class="header">
            ${submissionDetail.dealer?.logoUrl
              ? `<img src="${submissionDetail.dealer.logoUrl}" alt="Logo" class="logo" />`
              : submissionDetail.dealer?.name
              ? `<div class="dealer-name">${submissionDetail.dealer.name}</div>`
              : ""}
            <h1>${formName}</h1>
            ${vrm ? `<div class="vrm">${vrm}</div>` : ""}
            <div class="meta">
              <span>Submitted: ${new Date(submissionDetail.submission?.submittedAt).toLocaleString()}</span>
              ${submissionDetail.submission?.lastEditedAt ? `<span>Edited: ${new Date(submissionDetail.submission.lastEditedAt).toLocaleString()}</span>` : ""}
            </div>
          </div>

          <div class="section">
            <div class="section-title">Form Responses</div>
            <div class="fields-grid">
              ${getOrderedFieldsHtml(submissionDetail)}
            </div>
          </div>

          ${submissionDetail.files && submissionDetail.files.length > 0 ? `
          <div class="section">
            <div class="section-title">Uploaded Files</div>
            <div style="display: flex; flex-wrap: wrap; gap: 12px;">
              ${submissionDetail.files.map(file => {
                const isImage = /\.(jpg|jpeg|png|gif|webp|heic|bmp|svg)$/i.test(file.url || file.filename || '');
                if (isImage) {
                  return `<div style="text-align: center;">
                    <img src="${file.url}" alt="${file.filename || 'File'}" style="max-width: 150px; max-height: 100px; border-radius: 4px; border: 1px solid #e5e5e5; object-fit: cover;" />
                    <div style="font-size: 10px; color: #666; margin-top: 4px; max-width: 150px; word-break: break-all;">${file.filename || file.fieldName || 'Image'}</div>
                  </div>`;
                } else {
                  return `<div style="display: flex; align-items: center; gap: 6px; padding: 8px 12px; background: #f8f9fa; border-radius: 4px; border: 1px solid #e5e5e5;">
                    <span>${/\.pdf$/i.test(file.url || '') ? '📄' : '📎'}</span>
                    <a href="${file.url}" target="_blank" style="color: #2563eb; text-decoration: underline; font-size: 13px;">
                      ${file.filename || file.fieldName || 'File'}
                    </a>
                  </div>`;
                }
              }).join('')}
            </div>
          </div>
          ` : ''}

          <div class="footer">
            Generated from DealerFlow on ${new Date().toLocaleString()}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    if (!isPdf) {
      printWindow.print();
    }
  };

  // Delete submission
  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this submission? This cannot be undone.")) return;

    const subId = selectedSubmission.id || selectedSubmission._id;
    if (!subId) {
      toast.error("No submission selected");
      return;
    }
    try {
      const res = await fetch(`/api/forms/submissions/${subId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete");
      }

      // Remove from list
      setSubmissions(prev => prev.filter(s => (s.id || s._id) !== subId));
      setSelectedSubmission(null);
      setSubmissionDetail(null);
      toast.success("Submission deleted");
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error(error.message || "Failed to delete submission");
    }
  };

  // Note: Appraisal forms are in the dedicated Appraisals section
  // Note: Review forms are shown in the dedicated Reviews page
  const formTypes = ["PDI", "TEST_DRIVE", "WARRANTY_CLAIM", "COURTESY_OUT", "COURTESY_IN", "SERVICE_RECEIPT", "OTHER"];

  const newCount = submissions.filter(s => !s.viewed && s.status !== "viewed").length;

  // Show loading while checking for dealer redirect
  if (isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <Head><title>Submissions | DealerFlow</title></Head>

      {/* Compact Sticky Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 -mx-4 md:-mx-6 lg:-mx-8">
        {/* Row 1: Title + Actions */}
        <div className="flex items-center justify-between h-12 px-4">
          <h1 className="text-lg font-bold text-slate-800">Submissions</h1>

          {/* Right: Add Button + Share + Overflow Menu */}
          <div className="flex items-center gap-2">
            {/* Share Forms Dropdown */}
            <div className="dropdown dropdown-end">
              <label tabIndex={0} className="h-9 w-9 md:w-auto md:px-3 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 flex items-center justify-center gap-2 cursor-pointer transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-4 md:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span className="hidden md:inline">Share Forms</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="hidden md:block h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </label>
              <ul tabIndex={0} className="dropdown-content z-20 menu p-2 shadow-lg bg-base-100 rounded-box w-64 max-h-80 overflow-y-auto">
                {forms.length === 0 ? (
                  <li><span className="text-base-content/60 text-sm">No forms available</span></li>
                ) : (
                  forms.filter(f => f.visibility === "PUBLIC" || f.visibility === "SHARE_LINK" || f.isPublic).length === 0 ? (
                    <li><span className="text-base-content/60 text-sm px-3 py-2">No shareable forms. Enable sharing in template settings.</span></li>
                  ) : (
                    forms.filter(f => f.visibility === "PUBLIC" || f.visibility === "SHARE_LINK" || f.isPublic).map((form) => (
                      <li key={form.id || form._id}>
                        <button
                          onClick={() => {
                            setShareForm(form);
                            document.activeElement?.blur();
                          }}
                          className="text-sm text-left flex items-center gap-2"
                        >
                          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          <span className="truncate">{form.name}</span>
                        </button>
                      </li>
                    ))
                  )
                )}
              </ul>
            </div>

            {/* Fill Out Form Dropdown */}
            <div className="dropdown dropdown-end">
              <label tabIndex={0} className="h-9 w-9 md:w-auto md:px-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-2 cursor-pointer transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-4 md:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden md:inline">Fill Out Form</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="hidden md:block h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </label>
              <ul tabIndex={0} className="dropdown-content z-20 menu p-2 shadow-lg bg-base-100 rounded-box w-64 max-h-80 overflow-y-auto">
                {forms.length === 0 ? (
                  <li><span className="text-base-content/60 text-sm">No forms available</span></li>
                ) : (
                  forms.map((form) => (
                    <li key={form.id || form._id}>
                      <button
                        onClick={() => {
                          const canOpenPublic = (form.visibility === "PUBLIC" || form.visibility === "SHARE_LINK" || (!form.visibility && form.isPublic));
                          if (canOpenPublic && form.publicSlug) {
                            window.open(`/public/forms/${form.publicSlug}`, '_blank');
                          } else {
                            router.push(`/forms/fill/${form.id || form._id}`);
                          }
                        }}
                        className="text-sm text-left"
                      >
                        <span className="truncate">{form.name}</span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Row 2: Compact Segmented Tabs */}
        <div className="flex items-center px-4 pb-2">
          <div className="bg-slate-100 p-0.5 rounded-lg flex text-xs font-medium">
            <button
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === "submissions"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
              onClick={() => setActiveTab("submissions")}
            >
              Inbox
              {newCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
              )}
            </button>
            <button
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeTab === "templates"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
              onClick={() => setActiveTab("templates")}
            >
              Templates
            </button>
          </div>
        </div>
      </div>

      {/* Templates Tab - App Store Gallery */}
      {activeTab === "templates" && (
        <>
          {/* Filter Bar - Compact */}
          {forms.length > 0 && (
            <div className="flex items-center gap-3 py-2 px-4 -mx-4 sm:-mx-6 lg:-mx-8 bg-white border-b border-slate-200">
              <select
                className="h-8 px-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                value={templateTypeFilter}
                onChange={(e) => {
                  setTemplateTypeFilter(e.target.value);
                  const newQuery = { ...router.query };
                  if (e.target.value) {
                    newQuery.type = e.target.value;
                  } else {
                    delete newQuery.type;
                  }
                  router.push({ pathname: router.pathname, query: newQuery }, undefined, { shallow: true });
                }}
              >
                <option value="">All Form Types</option>
                {formTypes.map((type) => (
                  <option key={type} value={type}>{FORM_TYPE_LABELS[type] || type}</option>
                ))}
              </select>
              {templateTypeFilter && (
                <button
                  className="text-xs text-slate-500 hover:text-slate-700"
                  onClick={() => {
                    setTemplateTypeFilter("");
                    const newQuery = { ...router.query };
                    delete newQuery.type;
                    router.push({ pathname: router.pathname, query: newQuery }, undefined, { shallow: true });
                  }}
                >
                  Clear
                </button>
              )}
              <span className="text-xs text-slate-400">
                {filteredForms.length} template{filteredForms.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}

          {/* Gallery Grid */}
          <div className="p-4 sm:p-6">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : filteredForms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg font-medium">
                {error ? (
                  <span className="text-error">{error}</span>
                ) : templateTypeFilter ? (
                  `No ${FORM_TYPE_LABELS[templateTypeFilter] || templateTypeFilter} forms found`
                ) : (
                  "No forms available"
                )}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {filteredForms.map((form) => {
                const submissionCount = getSubmissionCount(form._id);

                // Color gradients based on form type
                const getGradient = (type) => {
                  const gradients = {
                    PDI: "from-blue-500 to-blue-600",
                    TEST_DRIVE: "from-cyan-500 to-cyan-600",
                    WARRANTY_CLAIM: "from-amber-500 to-amber-600",
                    COURTESY_OUT: "from-emerald-500 to-emerald-600",
                    COURTESY_IN: "from-green-500 to-green-600",
                    SERVICE_RECEIPT: "from-teal-500 to-teal-600",
                    REVIEW_FEEDBACK: "from-pink-500 to-pink-600",
                    OTHER: "from-slate-500 to-slate-600",
                  };
                  return gradients[type] || gradients.OTHER;
                };

                // Icons based on form type
                const getIcon = (type) => {
                  switch (type) {
                    case "PDI":
                      return (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      );
                    case "TEST_DRIVE":
                      return (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                        </svg>
                      );
                    case "WARRANTY_CLAIM":
                      return (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                        </svg>
                      );
                    case "COURTESY_OUT":
                    case "COURTESY_IN":
                      return (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                        </svg>
                      );
                    case "SERVICE_RECEIPT":
                      return (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185zM9.75 9h.008v.008H9.75V9zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 4.5h.008v.008h-.008V13.5zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                        </svg>
                      );
                    case "REVIEW_FEEDBACK":
                      return (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                        </svg>
                      );
                    default:
                      return (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                      );
                  }
                };

                return (
                  <div
                    key={form._id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group relative overflow-hidden"
                  >
                    {/* Edit Button - appears on hover */}
                    <Link
                      href={`/settings/forms/${form._id}`}
                      className="absolute top-3 right-3 z-10 p-2 bg-white/90 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white shadow-sm"
                      title="Edit form"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                    </Link>

                    {/* Header - Colored gradient with icon */}
                    <div className={`h-32 bg-gradient-to-br ${getGradient(form.type)} flex items-center justify-center`}>
                      <div className="text-white">
                        {getIcon(form.type)}
                      </div>
                    </div>

                    {/* Body */}
                    <div className="p-5">
                      {/* Title */}
                      <h3 className="text-lg font-bold text-slate-900 mb-1 truncate">
                        {form.name}
                      </h3>

                      {/* Type Badge */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          {FORM_TYPE_LABELS[form.type] || form.type}
                        </span>
                        {/* Visibility Badge */}
                        {form.visibility === "PUBLIC" || (!form.visibility && form.isPublic) ? (
                          <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                            Public
                          </span>
                        ) : form.visibility === "SHARE_LINK" ? (
                          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                            Share Link
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            Internal
                          </span>
                        )}
                      </div>

                      {/* Stats */}
                      <p className="text-xs text-slate-500 mb-4">
                        {submissionCount} Submission{submissionCount !== 1 ? "s" : ""} · {form.fieldCount || 0} Field{(form.fieldCount || 0) !== 1 ? "s" : ""}
                      </p>

                      {/* Footer Actions */}
                      <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                        {/* Show share buttons for PUBLIC and SHARE_LINK visibility */}
                        {(form.visibility === "PUBLIC" || form.visibility === "SHARE_LINK" || (!form.visibility && form.isPublic)) ? (
                          <>
                            <button
                              className="flex-1 btn btn-sm btn-outline btn-primary"
                              onClick={() => {
                                const url = `${window.location.origin}/public/forms/${form.publicSlug}`;
                                navigator.clipboard.writeText(url);
                                toast.success("Link copied!");
                              }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                              </svg>
                              Copy Link
                            </button>
                            <button
                              className="btn btn-sm btn-outline"
                              onClick={() => setShareForm(form)}
                              title="Show QR Code"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
                              </svg>
                            </button>
                          </>
                        ) : (
                          /* INTERNAL forms - only show Start Now button */
                          <button
                            className="flex-1 btn btn-sm btn-primary"
                            onClick={() => router.push(`/forms/fill/${form.id || form._id}`)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                            </svg>
                            Start Now
                          </button>
                        )}
                        <button
                          className="btn btn-sm btn-ghost"
                          onClick={() => {
                            setSelectedFormId(form._id);
                            setActiveTab("submissions");
                          }}
                          title="View submissions"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </>
      )}

      {/* Submissions Tab - Split-View Inbox Layout */}
      {activeTab === "submissions" && (
        <>
          {/* Mobile Search + Filters Row */}
          <div className="md:hidden flex gap-2 items-center bg-white border-b border-slate-200 py-2 px-4 -mx-4">
            {/* VRM Search */}
            <div className="relative flex-1 min-w-0">
              <input
                type="text"
                placeholder="Search VRM..."
                className="w-full h-10 pl-9 pr-3 text-sm font-mono uppercase bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={vrmSearch}
                onChange={(e) => setVrmSearch(e.target.value.toUpperCase())}
              />
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Filters Button */}
            <button
              onClick={() => setShowMobileFilters(true)}
              className={`h-10 px-3 flex items-center gap-2 rounded-lg text-sm font-medium transition-colors ${
                hasActiveFilters
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-white/20 text-xs px-1.5 py-0.5 rounded-full">{activeFilterCount}</span>
              )}
            </button>
          </div>

          {/* Desktop Filters Row */}
          <div className="hidden md:flex flex-wrap gap-2 items-center bg-white border-b border-slate-200 py-2 px-4 -mx-6 lg:-mx-8">
            {/* VRM Search */}
            <div className="relative min-w-[200px] max-w-xs">
              <input
                type="text"
                placeholder="Search VRM..."
                className="w-full h-9 pl-9 pr-3 text-sm font-mono uppercase bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={vrmSearch}
                onChange={(e) => setVrmSearch(e.target.value.toUpperCase())}
              />
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Customer Search */}
            <input
              type="text"
              placeholder="Customer name..."
              className="h-9 px-3 text-sm w-40 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            {/* Status Filter */}
            <select
              className="h-9 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="new">New</option>
              <option value="viewed">Viewed</option>
              <option value="actioned">Actioned</option>
              <option value="archived">Archived</option>
            </select>

            {/* Form Filter */}
            <select
              className="h-9 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
              value={selectedFormId}
              onChange={(e) => setSelectedFormId(e.target.value)}
            >
              <option value="">All Forms</option>
              {forms.map((form) => (
                <option key={form._id} value={form._id}>{form.name}</option>
              ))}
            </select>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                className="h-9 px-3 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                onClick={clearAllFilters}
              >
                Clear
              </button>
            )}

            <span className="text-sm text-slate-400 ml-auto">
              {filteredSubmissions.length} submission{filteredSubmissions.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Mobile Filters BottomSheet */}
          <BottomSheet
            isOpen={showMobileFilters}
            onClose={() => setShowMobileFilters(false)}
            title="Filters"
            footer={
              <div className="flex gap-2">
                {hasActiveFilters && (
                  <button
                    className="btn btn-ghost flex-1"
                    onClick={() => {
                      clearAllFilters();
                      setShowMobileFilters(false);
                    }}
                  >
                    Clear All
                  </button>
                )}
                <button
                  className="btn btn-primary flex-1"
                  onClick={() => setShowMobileFilters(false)}
                >
                  Apply
                </button>
              </div>
            }
          >
            <div className="space-y-4">
              {/* Customer Name */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Customer Name</span>
                </label>
                <input
                  type="text"
                  placeholder="Search by name..."
                  className="input input-bordered w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Status Filter */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Status</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Status</option>
                  <option value="new">New</option>
                  <option value="viewed">Viewed</option>
                  <option value="actioned">Actioned</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              {/* Form Filter */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Specific Form</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={selectedFormId}
                  onChange={(e) => setSelectedFormId(e.target.value)}
                >
                  <option value="">All Forms</option>
                  {forms.map((form) => (
                    <option key={form._id} value={form._id}>{form.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </BottomSheet>

          {/* Split View - 2-Column Grid on desktop, single column on mobile */}
          <div className="grid grid-cols-1 md:grid-cols-12 h-[calc(100vh-180px)] sm:h-[calc(100vh-140px)] bg-white border-x border-b border-slate-200 overflow-hidden -mx-4 sm:-mx-6 lg:-mx-8">
            {/* Left Column - The List (col-span-4 on desktop, full on mobile when no selection) */}
            <div className={`${selectedSubmission ? "hidden md:block" : ""} md:col-span-4 border-r border-slate-200 h-full overflow-y-auto bg-white`}>
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <span className="loading loading-spinner loading-md"></span>
                </div>
              ) : filteredSubmissions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 px-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="text-lg font-medium">No submissions</p>
                  <p className="text-sm mt-1">Submissions will appear here</p>
                </div>
              ) : (
                <div className="py-2">
                  {filteredSubmissions.map((submission) => {
                    const isSelected = (selectedSubmission?.id || selectedSubmission?._id) === (submission.id || submission._id);
                    const isNew = !submission.viewed && submission.status !== "viewed";
                    const vrm = getVrm(submission);
                    const formType = submission.formId?.type || "OTHER";
                    const styles = FORM_TYPE_STYLES[formType] || FORM_TYPE_STYLES.OTHER;

                    return (
                      <div
                        key={submission.id || submission._id}
                        onClick={() => setSelectedSubmission(submission)}
                        className={`relative px-4 py-3 cursor-pointer transition-all mx-2 my-1 rounded-lg ${
                          isSelected
                            ? `border-l-4 ${styles.accent} bg-blue-50/50`
                            : "hover:bg-slate-50 border-l-4 border-transparent"
                        }`}
                      >
                        {/* Row 1: Icon + Form Name + Time */}
                        <div className="flex items-center gap-2 mb-2">
                          {/* Form Type Icon */}
                          <div className={`${styles.text} flex-shrink-0`}>
                            <FormTypeIcon type={formType} size="w-4 h-4" />
                          </div>

                          <span className={`text-slate-900 truncate flex-1 ${isNew ? "font-semibold" : "font-medium"}`}>
                            {submission.formId?.name || "Unknown Form"}
                          </span>

                          {/* New indicator */}
                          {isNew && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                          )}

                          <span className="text-xs text-slate-400 whitespace-nowrap flex-shrink-0">
                            {timeAgo(submission.submittedAt)}
                          </span>
                        </div>

                        {/* Row 2: Vehicle Reg (Number Plate Style) */}
                        <div className="pl-6">
                          {vrm && (
                            <div className="mb-1.5">
                              <span className="inline-block bg-[#fcd34d] border border-yellow-500/50 rounded-md px-2 py-0.5 shadow-sm font-mono font-bold text-slate-900 text-xs tracking-wider uppercase">
                                {vrm}
                              </span>
                            </div>
                          )}

                          {/* Row 3: Customer name */}
                          {submission.rawAnswers?.name && (
                            <p className="text-sm text-slate-500 truncate">
                              {submission.rawAnswers.name}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column - The Viewer (col-span-8 on desktop, full on mobile when selected) */}
            <div className={`${!selectedSubmission ? "hidden md:flex" : ""} md:col-span-8 bg-slate-50 p-4 md:p-6 h-full overflow-y-auto flex-col`}>
              {/* Mobile back button */}
              {selectedSubmission && (
                <button
                  className="md:hidden flex items-center gap-2 text-slate-600 mb-4 -mt-1"
                  onClick={() => setSelectedSubmission(null)}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="text-sm font-medium">Back to list</span>
                </button>
              )}
              {!selectedSubmission ? (
                /* Empty State - centered illustration */
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mb-6 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-xl font-medium text-slate-500">No submission selected</p>
                  <p className="text-sm mt-2 text-slate-400">Select a submission from the list to view details</p>
                </div>
              ) : isLoadingDetail ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <span className="loading loading-spinner loading-lg text-blue-600"></span>
                  <p className="mt-4 text-slate-500">Loading submission...</p>
                </div>
              ) : !submissionDetail ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-lg font-medium">Failed to load submission</p>
                  <p className="text-sm mt-1">Please try selecting again</p>
                </div>
              ) : (
                /* Modern Document Card - Compact on Mobile */
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 md:p-6 max-w-3xl mx-auto flex-1">
                  {/* Card Header - Compact on Mobile */}
                  <div className="flex items-start gap-3 md:gap-4 mb-4 md:mb-6 pb-4 md:pb-6 border-b border-slate-100">
                    {/* Feature Icon - Smaller on mobile */}
                    <div className="hidden md:block">
                      <LargeFormIcon type={submissionDetail.submission?.formId?.type || "OTHER"} />
                    </div>
                    <div className="md:hidden w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <FormTypeIcon type={submissionDetail.submission?.formId?.type || "OTHER"} size="w-5 h-5" />
                    </div>

                    {/* Title Section - Compact on Mobile */}
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg md:text-xl font-semibold text-slate-900 leading-tight">
                        {submissionDetail.submission?.formId?.name || "Form Submission"}
                      </h2>
                      <p className="text-xs md:text-sm text-slate-500 mt-0.5">
                        {new Date(submissionDetail.submission?.submittedAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })}
                        {" · "}
                        {new Date(submissionDetail.submission?.submittedAt).toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </p>
                    </div>

                    {/* Actions - Compact dropdown on mobile */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Desktop: Edit + Status */}
                      <div className="hidden md:flex items-center gap-1">
                        {!isEditing && (
                          <button
                            className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                            onClick={handleStartEdit}
                          >
                            Edit
                          </button>
                        )}
                      </div>

                      {/* Status Dropdown - Works on both mobile and desktop */}
                      <div className="dropdown dropdown-end">
                        <label tabIndex={0} className="p-2 md:px-3 md:py-1.5 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer flex items-center gap-1">
                          <span className="hidden md:inline">
                            {submissionDetail.submission?.status === "actioned" ? "Actioned" :
                             submissionDetail.submission?.status === "archived" ? "Archived" :
                             submissionDetail.submission?.viewed ? "Viewed" : "New"}
                          </span>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-4 md:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </label>
                        <ul tabIndex={0} className="dropdown-content z-10 menu p-2 shadow-lg bg-white rounded-lg w-40 border border-slate-200">
                          <li>
                            <button onClick={async () => {
                              const subId = selectedSubmission.id || selectedSubmission._id;
                              await fetch(`/api/forms/submissions/${subId}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ status: "actioned" }),
                              });
                              setSubmissions(prev => prev.map(s =>
                                (s.id || s._id) === subId ? { ...s, status: "actioned", viewed: true } : s
                              ));
                              setSubmissionDetail(prev => ({
                                ...prev,
                                submission: { ...prev.submission, status: "actioned", viewed: true }
                              }));
                              toast.success("Marked as actioned");
                            }}>
                              Mark Actioned
                            </button>
                          </li>
                          <li>
                            <button onClick={async () => {
                              const subId = selectedSubmission.id || selectedSubmission._id;
                              await fetch(`/api/forms/submissions/${subId}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ status: "archived" }),
                              });
                              setSubmissions(prev => prev.map(s =>
                                (s.id || s._id) === subId ? { ...s, status: "archived", viewed: true } : s
                              ));
                              setSubmissionDetail(prev => ({
                                ...prev,
                                submission: { ...prev.submission, status: "archived", viewed: true }
                              }));
                              toast.success("Archived");
                            }}>
                              Archive
                            </button>
                          </li>
                          <li>
                            <button onClick={async () => {
                              const subId = selectedSubmission.id || selectedSubmission._id;
                              await fetch(`/api/forms/submissions/${subId}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ viewed: false, status: "new" }),
                              });
                              setSubmissions(prev => prev.map(s =>
                                (s.id || s._id) === subId ? { ...s, status: "new", viewed: false } : s
                              ));
                              setSubmissionDetail(prev => ({
                                ...prev,
                                submission: { ...prev.submission, status: "new", viewed: false }
                              }));
                              toast.success("Marked as unread");
                            }}>
                              Mark Unread
                            </button>
                          </li>
                        </ul>
                      </div>

                      {/* Print Button */}
                      <button
                        className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                        onClick={handlePrint}
                        title="Print"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                      </button>

                      {/* More Actions Menu */}
                      <div className="dropdown dropdown-end">
                        <label tabIndex={0} className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </label>
                        <ul tabIndex={0} className="dropdown-content z-10 menu p-2 shadow-lg bg-white rounded-lg w-44 border border-slate-200">
                          <li><button onClick={handleStartEdit}>Edit</button></li>
                          <li><button onClick={handleExportPdf}>Export PDF</button></li>
                          <li className="divider my-1"></li>
                          <li><button onClick={handleDelete} className="text-error">Delete</button></li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Edit History Notice */}
                  {submissionDetail.submission?.lastEditedAt && (
                    <div className="flex items-center gap-2 p-3 mb-6 bg-blue-50 text-blue-700 rounded-lg text-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>
                        Edited by {submissionDetail.submission.lastEditedByName} on {new Date(submissionDetail.submission.lastEditedAt).toLocaleString()}
                      </span>
                    </div>
                  )}

                  {/* Linked Records */}
                  {(submissionDetail.submission?.linkedVehicleId || submissionDetail.submission?.linkedAftercareCaseId || submissionDetail.submission?.linkedVehicleSaleId) && (
                    <div className="mb-6">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Linked Records</h4>
                      <div className="flex flex-wrap gap-2">
                        {submissionDetail.submission.linkedVehicleId && (
                          <Link
                            href={`/vehicles/${submissionDetail.submission.linkedVehicleId._id}`}
                            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                            </svg>
                            <span className="font-mono font-semibold">{submissionDetail.submission.linkedVehicleId.regCurrent}</span>
                          </Link>
                        )}
                        {submissionDetail.submission.linkedAftercareCaseId && (
                          <Link
                            href={`/warranty?caseId=${submissionDetail.submission.linkedAftercareCaseId._id}`}
                            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                            </svg>
                            Aftercare Case
                          </Link>
                        )}
                        {submissionDetail.submission.linkedVehicleSaleId && (
                          <Link
                            href={`/sales/${submissionDetail.submission.linkedVehicleSaleId._id}`}
                            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                            </svg>
                            Sale Record
                          </Link>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Answers - View or Edit Mode */}
                  <div id="submission-print-content">
                    {isEditing ? (
                      /* Edit Mode - Keep input style for editing */
                      <>
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Edit Responses
                          </h4>
                          <div className="flex gap-2">
                            <button
                              className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                              onClick={handleCancelEdit}
                              disabled={isSavingEdit}
                            >
                              Cancel
                            </button>
                            <button
                              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                              onClick={handleSaveEdit}
                              disabled={isSavingEdit}
                            >
                              {isSavingEdit ? "Saving..." : "Save Changes"}
                            </button>
                          </div>
                        </div>
                        <div className="space-y-4">
                          {Object.entries(editFormData)
                            .filter(([key]) => !key.startsWith('_')) // Filter out internal fields like _selectedVehicle
                            .map(([key, value]) => {
                            const field = submissionDetail.fields?.find(f => f.fieldName === key);
                            const label = field?.label || key;
                            const fieldType = field?.type || "TEXT";

                            return (
                              <div key={key} className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                  {label}
                                </label>
                                {fieldType === "TEXTAREA" ? (
                                  <textarea
                                    className="textarea textarea-bordered w-full bg-white"
                                    value={value || ""}
                                    onChange={(e) => handleEditInputChange(key, e.target.value)}
                                    rows={3}
                                  />
                                ) : fieldType === "BOOLEAN" ? (
                                  <input
                                    type="checkbox"
                                    className="checkbox checkbox-primary"
                                    checked={value === true}
                                    onChange={(e) => handleEditInputChange(key, e.target.checked)}
                                  />
                                ) : fieldType === "NUMBER" ? (
                                  <input
                                    type="number"
                                    className="input input-bordered w-full bg-white"
                                    value={value || ""}
                                    onChange={(e) => handleEditInputChange(key, e.target.value)}
                                  />
                                ) : fieldType === "DATE" ? (
                                  <input
                                    type="date"
                                    className="input input-bordered w-full bg-white"
                                    value={value || ""}
                                    onChange={(e) => handleEditInputChange(key, e.target.value)}
                                  />
                                ) : fieldType === "DROPDOWN" ? (
                                  <select
                                    className="select select-bordered w-full bg-white"
                                    value={value || ""}
                                    onChange={(e) => handleEditInputChange(key, e.target.value)}
                                  >
                                    <option value="">Select...</option>
                                    {(field?.options?.values || field?.options?.choices || []).map((opt) => (
                                      <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    className="input input-bordered w-full bg-white"
                                    value={value || ""}
                                    onChange={(e) => handleEditInputChange(key, e.target.value)}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      /* View Mode - Definition List Style */
                      <>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">
                          Form Responses
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          {Object.entries(submissionDetail.submission?.rawAnswers || {})
                            .filter(([key]) => !key.startsWith('_')) // Filter out internal fields like _selectedVehicle
                            .map(([key, value]) => {
                            const field = submissionDetail.fields?.find(f => f.fieldName === key);
                            const label = field?.label || key;
                            const fieldType = field?.type || "TEXT";
                            const isSignature = fieldType === "SIGNATURE" || (typeof value === "string" && value?.startsWith("data:image/"));
                            const isLongText = !isSignature && typeof value === "string" && value.length > 80;
                            const isAttachment = fieldType === "UPLOAD" || fieldType === "FILE" || fieldType === "IMAGE" || isAttachmentValue(value);

                            return (
                              <div
                                key={key}
                                className={isSignature || isLongText || isAttachment ? "sm:col-span-2" : ""}
                              >
                                {/* Label - small, uppercase, subtle */}
                                <dt className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                  {label}
                                </dt>
                                {/* Value - large, dark, readable */}
                                <dd className="text-base font-medium text-slate-900 mt-1">
                                  {isSignature ? (
                                    <img
                                      src={value}
                                      alt="Signature"
                                      className="max-w-[300px] max-h-[150px] border border-slate-200 rounded bg-white mt-2"
                                    />
                                  ) : isAttachment ? (
                                    <AttachmentField
                                      value={value}
                                      fieldName={label}
                                      thumbnailSize="md"
                                    />
                                  ) : (
                                    formatFieldValueDisplay(value, fieldType) || <span className="text-slate-400">—</span>
                                  )}
                                </dd>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Files */}
                  {submissionDetail.files && submissionDetail.files.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-slate-100">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Uploaded Files</h4>
                      <AttachmentField
                        value={submissionDetail.files.map(f => ({
                          url: f.url,
                          name: f.filename || f.fieldName || "File",
                        }))}
                        fieldName="Uploaded Files"
                        thumbnailSize="lg"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Share Modal */}
      {shareForm && (
        <ShareFormModal
          form={shareForm}
          publicUrl={getPublicUrl(shareForm)}
          onClose={() => setShareForm(null)}
        />
      )}
    </DashboardLayout>
  );
}
