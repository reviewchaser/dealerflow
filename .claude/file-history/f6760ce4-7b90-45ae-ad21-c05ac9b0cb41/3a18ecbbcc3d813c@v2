import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PhotoGallery } from "@/components/ui/PhotoGallery";
import { toast } from "react-hot-toast";

// Helper to get viewable URL (handles signed URL fallback for private buckets)
const getViewableUrl = async (urlOrKey) => {
  if (!urlOrKey) return null;

  // If it's a data URL or local path, return as-is
  if (urlOrKey.startsWith("data:") || urlOrKey.startsWith("/")) {
    return urlOrKey;
  }

  // If it looks like an S3 key (no protocol), get signed URL
  if (!urlOrKey.startsWith("http")) {
    try {
      const res = await fetch(`/api/uploads/signed-get?key=${encodeURIComponent(urlOrKey)}`);
      if (res.ok) {
        const { signedUrl } = await res.json();
        return signedUrl;
      }
    } catch (err) {
      console.error("[SubmissionDrawer] Failed to get signed URL:", err);
    }
  }

  // Return the original URL (may be public or already signed)
  return urlOrKey;
};

// Helper to open/download file with signed URL fallback
const handleFileDownload = async (urlOrKey, filename) => {
  try {
    // First try to get a signed URL if needed
    const viewableUrl = await getViewableUrl(urlOrKey);
    if (viewableUrl) {
      window.open(viewableUrl, "_blank");
    } else {
      toast.error("Could not open file");
    }
  } catch (err) {
    console.error("[SubmissionDrawer] Error opening file:", err);
    toast.error("Failed to open file");
  }
};

// Image lightbox component
function ImageLightbox({ src, alt, onClose }) {
  useEffect(() => {
    const handleEsc = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center" onClick={onClose}>
      <button
        className="absolute top-4 right-4 btn btn-circle btn-ghost text-white"
        onClick={onClose}
      >
        ✕
      </button>
      <img
        src={src}
        alt={alt}
        className="max-w-[90vw] max-h-[90vh] object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      <div className="absolute bottom-4 flex gap-2">
        <a
          href={src}
          download
          className="btn btn-primary"
          onClick={(e) => e.stopPropagation()}
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download
        </a>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ghost text-white"
          onClick={(e) => e.stopPropagation()}
        >
          Open in new tab
        </a>
      </div>
    </div>
  );
}

// Check if a URL points to an image
function isImageUrl(url) {
  if (!url) return false;
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
  const lowerUrl = url.toLowerCase();
  return imageExtensions.some(ext => lowerUrl.includes(ext)) ||
         lowerUrl.includes('image') ||
         lowerUrl.includes('/images/');
}

export default function SubmissionDrawer({ submissionId, onClose }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lightboxImage, setLightboxImage] = useState(null);

  useEffect(() => {
    loadSubmission();
  }, [submissionId]);

  const loadSubmission = async () => {
    try {
      const res = await fetch(`/api/forms/submissions/${submissionId}`);
      const result = await res.json();
      setData(result);
      setIsLoading(false);
    } catch (error) {
      console.error("Failed to load submission:", error);
      setIsLoading(false);
    }
  };

  const formatFieldValue = (value, fieldName) => {
    if (value === null || value === undefined) return "—";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    // Check if this is a signature (base64 image data)
    if (typeof value === "string" && value.startsWith("data:image")) {
      return (
        <img
          src={value}
          alt="Signature"
          className="max-h-24 bg-white border border-base-300 rounded p-2 cursor-pointer"
          onClick={() => setLightboxImage({ src: value, alt: fieldName || "Signature" })}
        />
      );
    }

    // Handle issues - can be array or JSON string
    const lowerName = (fieldName || '').toLowerCase();
    if (lowerName === 'issues' || lowerName.includes('issue')) {
      // Try to parse if string
      let issuesArray = value;
      if (typeof value === 'string') {
        try {
          issuesArray = JSON.parse(value);
        } catch {
          // Not valid JSON, show as-is if it looks like formatted text
          if (value.trim()) return <pre className="whitespace-pre-wrap text-sm text-slate-700">{value}</pre>;
          return <span className="text-slate-400 italic">No issues</span>;
        }
      }

      if (!Array.isArray(issuesArray)) {
        // Single issue object
        if (typeof issuesArray === 'object' && issuesArray !== null) {
          issuesArray = [issuesArray];
        } else {
          return <span className="text-slate-400 italic">Invalid issues format</span>;
        }
      }

      // Filter out resolved/completed issues and empty objects
      const resolvedStatuses = ['complete', 'completed', 'resolved', 'done', 'closed'];
      const activeIssues = issuesArray.filter(issue => {
        if (!issue || typeof issue !== 'object') return false;
        if (Object.keys(issue).length === 0) return false; // Skip empty {}
        const status = (issue.status || '').toLowerCase();
        return !resolvedStatuses.includes(status);
      });

      if (activeIssues.length === 0) return <span className="text-slate-400 italic">No active issues</span>;

      return (
        <div className="space-y-3">
          {activeIssues.map((issue, idx) => (
            <div key={idx} className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-amber-700">{idx + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  {/* Category / Subcategory */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="warning">
                      {issue.category || issue.type || 'Issue'}
                    </Badge>
                    {issue.subcategory && (
                      <span className="text-sm text-slate-600">{issue.subcategory}</span>
                    )}
                  </div>
                  {/* Description */}
                  {issue.description && (
                    <p className="text-sm text-slate-700 mt-2">{issue.description}</p>
                  )}
                  {/* Action */}
                  {issue.actionNeeded && (
                    <p className="text-xs text-slate-500 mt-2">
                      <span className="font-medium text-slate-600">Action:</span> {issue.actionNeeded}
                    </p>
                  )}
                  {/* Status & Severity badges */}
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    {issue.status && (
                      <Badge variant={
                        issue.status.toLowerCase() === 'outstanding' ? 'danger' :
                        issue.status.toLowerCase() === 'ordered' ? 'warning' :
                        issue.status.toLowerCase() === 'in progress' ? 'info' : 'default'
                      } size="sm">
                        {issue.status}
                      </Badge>
                    )}
                    {issue.severity && (
                      <Badge variant={
                        issue.severity === 'high' ? 'danger' :
                        issue.severity === 'medium' ? 'warning' : 'info'
                      } size="sm">
                        {issue.severity}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Handle photos - can be array of strings, objects, or JSON string
    if (lowerName === 'photos' || lowerName.includes('photo') || lowerName.includes('image')) {
      // Try to parse if string
      let photosArray = value;
      if (typeof value === 'string') {
        try {
          photosArray = JSON.parse(value);
        } catch {
          // Single URL string
          if (value.startsWith('http') || value.startsWith('data:')) {
            photosArray = [value];
          } else {
            return <span className="text-slate-400 italic">No photos</span>;
          }
        }
      }

      if (!Array.isArray(photosArray)) {
        if (typeof photosArray === 'object' && photosArray !== null && (photosArray.url || photosArray.src)) {
          photosArray = [photosArray];
        } else {
          return <span className="text-slate-400 italic">No photos</span>;
        }
      }

      // Process and filter photos
      const validPhotos = photosArray
        .map(p => {
          // Parse nested JSON strings
          if (typeof p === 'string') {
            try { p = JSON.parse(p); } catch { /* keep as string */ }
          }
          return p;
        })
        .filter(p => {
          if (!p) return false;
          if (typeof p === 'object' && Object.keys(p).length === 0) return false; // Skip empty {}
          // Must have a URL
          if (typeof p === 'string') return p.startsWith('http') || p.startsWith('data:');
          return p.url || p.src || p.dataUrl;
        })
        .map(p => {
          if (typeof p === 'string') return { url: p };
          return { url: p.url || p.src || p.dataUrl, caption: p.filename || p.label || p.category };
        });

      if (validPhotos.length === 0) return <span className="text-slate-400 italic">No photos</span>;

      // Use PhotoGallery component
      return <PhotoGallery photos={validPhotos} thumbnailSize="default" showCount={false} />;
    }

    if (typeof value === "object") return JSON.stringify(value);
    return value.toString();
  };

  return (
    <>
      {/* Drawer */}
      <div className="drawer drawer-end drawer-open">
        <input type="checkbox" className="drawer-toggle" />
        <div className="drawer-side z-50">
          <label className="drawer-overlay bg-black/50 backdrop-blur-sm" onClick={onClose}></label>
          <div className="w-full max-w-2xl bg-white min-h-screen flex flex-col">
            {/* Header - Sticky */}
            <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">Form Submission</h2>
                <button
                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                  onClick={onClose}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              {isLoading ? (
                <div className="flex justify-center py-20">
                  <div className="w-8 h-8 border-4 border-[#0066CC]/20 border-t-[#0066CC] rounded-full animate-spin"></div>
                </div>
              ) : !data ? (
                <div className="text-center py-20 text-slate-400">
                  Failed to load submission
                </div>
              ) : (
              <>
                {/* Form Info */}
                <Card className="mb-4">
                  <CardContent className="pt-4">
                    <h3 className="font-bold text-lg text-slate-900">{data.submission.formId?.name}</h3>
                    <div className="flex gap-2 items-center mt-2">
                      <Badge variant="secondary">{data.submission.formId?.type}</Badge>
                      <span className="text-sm text-slate-500">
                        {new Date(data.submission.submittedAt).toLocaleString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Linked Records */}
                {(data.submission.linkedVehicleId || data.submission.linkedAftercareCaseId || data.submission.linkedVehicleSaleId) && (
                  <Card className="mb-4">
                    <CardHeader title="Linked Records" />
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {data.submission.linkedVehicleId && (
                          <Link
                            href={`/vehicles/${data.submission.linkedVehicleId._id}`}
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                          >
                            <span>🚗</span> Vehicle: {data.submission.linkedVehicleId.regCurrent}
                          </Link>
                        )}
                        {data.submission.linkedAftercareCaseId && (
                          <Link
                            href={`/warranty/${data.submission.linkedAftercareCaseId._id}`}
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                          >
                            <span>🔧</span> Aftercare Case
                          </Link>
                        )}
                        {data.submission.linkedVehicleSaleId && (
                          <Link
                            href={`/sales/${data.submission.linkedVehicleSaleId._id}`}
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                          >
                            <span>📄</span> Sale Record
                          </Link>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Answers */}
                <Card className="mb-4">
                  <CardHeader title="Answers" />
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(data.submission.rawAnswers || {}).map(([key, value]) => {
                        // Find the field definition if available
                        const field = data.fields?.find(f => f.fieldName === key);
                        const label = field?.label || key;

                        return (
                          <div key={key}>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                              {label}
                            </label>
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                              {formatFieldValue(value, key)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Files */}
                {data.files && data.files.length > 0 && (
                  <Card>
                    <CardHeader title="Uploaded Files" icon="📎" />
                    <CardContent>
                      {/* Image files using PhotoGallery */}
                      {data.files.filter(f => isImageUrl(f.url)).length > 0 && (
                        <div className="mb-4">
                          <PhotoGallery
                            photos={data.files.filter(f => isImageUrl(f.url)).map(f => ({
                              url: f.url,
                              caption: f.filename || f.fieldName
                            }))}
                            thumbnailSize="lg"
                            showCount={false}
                          />
                        </div>
                      )}
                      {/* List for non-image files */}
                      {data.files.filter(f => !isImageUrl(f.url)).length > 0 && (
                        <div className="space-y-2">
                          {data.files.filter(f => !isImageUrl(f.url)).map((file) => (
                            <div key={file._id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0">
                                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-slate-800 truncate">{file.filename || "File"}</p>
                                  <p className="text-xs text-slate-500">
                                    {file.fieldName}
                                    {file.size && ` • ${(file.size / 1024).toFixed(1)} KB`}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleFileDownload(file.key || file.url, file.filename)}
                                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-[#0066CC] text-white hover:bg-[#0055BB] transition-colors flex-shrink-0 cursor-pointer"
                              >
                                Download
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            )}
            </div>
          </div>
        </div>
      </div>

      {/* Image lightbox */}
      {lightboxImage && (
        <ImageLightbox
          src={lightboxImage.src}
          alt={lightboxImage.alt}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </>
  );
}
