import { useEffect, useState } from "react";
import Link from "next/link";

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
          if (value.trim()) return <pre className="whitespace-pre-wrap text-sm">{value}</pre>;
          return <span className="text-base-content/60 italic">No issues</span>;
        }
      }

      if (!Array.isArray(issuesArray)) {
        // Single issue object
        if (typeof issuesArray === 'object' && issuesArray !== null) {
          issuesArray = [issuesArray];
        } else {
          return <span className="text-base-content/60 italic">Invalid issues format</span>;
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

      if (activeIssues.length === 0) return <span className="text-base-content/60 italic">No active issues</span>;

      return (
        <div className="space-y-2">
          {activeIssues.map((issue, idx) => (
            <div key={idx} className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <span className="font-bold text-amber-700 shrink-0">{idx + 1}.</span>
                <div className="flex-1">
                  {/* Category / Subcategory */}
                  <p className="font-medium text-amber-800">
                    {issue.category || issue.type || 'Issue'}
                    {issue.subcategory && <span className="text-amber-600"> / {issue.subcategory}</span>}
                  </p>
                  {/* Description */}
                  {issue.description && (
                    <p className="text-sm text-amber-700 mt-1">{issue.description}</p>
                  )}
                  {/* Action */}
                  {issue.actionNeeded && (
                    <p className="text-sm text-amber-600 mt-1">
                      <span className="font-medium">Action:</span> {issue.actionNeeded}
                    </p>
                  )}
                  {/* Status badge */}
                  {issue.status && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold mt-2 ${
                      issue.status.toLowerCase() === 'outstanding' ? 'bg-red-100 text-red-700' :
                      issue.status.toLowerCase() === 'ordered' ? 'bg-amber-100 text-amber-700' :
                      issue.status.toLowerCase() === 'in progress' ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {issue.status}
                    </span>
                  )}
                  {/* Severity badge */}
                  {issue.severity && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold mt-2 ml-1 ${
                      issue.severity === 'high' ? 'bg-red-100 text-red-700' :
                      issue.severity === 'medium' ? 'bg-orange-100 text-orange-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {issue.severity}
                    </span>
                  )}
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
            return <span className="text-base-content/60 italic">No photos</span>;
          }
        }
      }

      if (!Array.isArray(photosArray)) {
        if (typeof photosArray === 'object' && photosArray !== null && (photosArray.url || photosArray.src)) {
          photosArray = [photosArray];
        } else {
          return <span className="text-base-content/60 italic">No photos</span>;
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
        });

      if (validPhotos.length === 0) return <span className="text-base-content/60 italic">No photos</span>;

      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {validPhotos.map((photo, idx) => {
            const url = typeof photo === 'string' ? photo : (photo.url || photo.src || photo.dataUrl);
            const label = typeof photo === 'object' ? (photo.filename || photo.label || photo.category || `Photo ${idx + 1}`) : `Photo ${idx + 1}`;
            if (!url) return null;
            return (
              <div key={idx} className="relative group">
                <img
                  src={url}
                  alt={label}
                  className="w-full h-28 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity border border-base-300"
                  onClick={() => setLightboxImage({ src: url, alt: label })}
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                  <button
                    className="btn btn-sm btn-circle btn-ghost text-white"
                    onClick={() => setLightboxImage({ src: url, alt: label })}
                    title="View fullscreen"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                  </button>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm btn-circle btn-ghost text-white"
                    title="Open in new tab"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
                <p className="text-xs text-base-content/60 mt-1 truncate">{label}</p>
              </div>
            );
          })}
        </div>
      );
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
          <label className="drawer-overlay" onClick={onClose}></label>
          <div className="w-full max-w-2xl bg-base-100 min-h-screen p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Form Submission</h2>
              <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>
                ✕
              </button>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-20">
                <span className="loading loading-spinner loading-lg"></span>
              </div>
            ) : !data ? (
              <div className="text-center py-20 text-base-content/60">
                Failed to load submission
              </div>
            ) : (
              <>
                {/* Form Info */}
                <div className="card bg-base-200 mb-6">
                  <div className="card-body">
                    <h3 className="font-bold text-lg">{data.submission.formId?.name}</h3>
                    <div className="flex gap-2 items-center">
                      <div className="badge badge-outline">{data.submission.formId?.type}</div>
                      <span className="text-sm text-base-content/60">
                        Submitted: {new Date(data.submission.submittedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Linked Records */}
                {(data.submission.linkedVehicleId || data.submission.linkedAftercareCaseId || data.submission.linkedVehicleSaleId) && (
                  <div className="card bg-base-200 mb-6">
                    <div className="card-body">
                      <h4 className="font-semibold mb-2">Linked Records</h4>
                      <div className="space-y-2">
                        {data.submission.linkedVehicleId && (
                          <Link href={`/vehicles/${data.submission.linkedVehicleId._id}`} className="btn btn-sm btn-outline">
                            🚗 Vehicle: {data.submission.linkedVehicleId.regCurrent}
                          </Link>
                        )}
                        {data.submission.linkedAftercareCaseId && (
                          <Link href={`/warranty/${data.submission.linkedAftercareCaseId._id}`} className="btn btn-sm btn-outline">
                            🔧 Aftercare Case
                          </Link>
                        )}
                        {data.submission.linkedVehicleSaleId && (
                          <Link href={`/sales/${data.submission.linkedVehicleSaleId._id}`} className="btn btn-sm btn-outline">
                            📄 Sale Record
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Answers */}
                <div className="card bg-base-200 mb-6">
                  <div className="card-body">
                    <h4 className="font-semibold mb-4">Answers</h4>
                    <div className="space-y-4">
                      {Object.entries(data.submission.rawAnswers || {}).map(([key, value]) => {
                        // Find the field definition if available
                        const field = data.fields?.find(f => f.fieldName === key);
                        const label = field?.label || key;

                        return (
                          <div key={key}>
                            <label className="label">
                              <span className="label-text font-semibold">{label}</span>
                            </label>
                            <div className="p-3 bg-base-100 rounded-lg">
                              {formatFieldValue(value, key)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Files */}
                {data.files && data.files.length > 0 && (
                  <div className="card bg-base-200">
                    <div className="card-body">
                      <h4 className="font-semibold mb-4">Uploaded Files</h4>
                      {/* Image grid for image files */}
                      {data.files.filter(f => isImageUrl(f.url)).length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                          {data.files.filter(f => isImageUrl(f.url)).map((file) => (
                            <div key={file._id} className="relative group">
                              <img
                                src={file.url}
                                alt={file.filename || "Uploaded image"}
                                className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => setLightboxImage({ src: file.url, alt: file.filename })}
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                                <button
                                  className="btn btn-sm btn-circle btn-ghost text-white"
                                  onClick={() => setLightboxImage({ src: file.url, alt: file.filename })}
                                  title="View"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </button>
                                <a
                                  href={file.url}
                                  download
                                  className="btn btn-sm btn-circle btn-ghost text-white"
                                  title="Download"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                  </svg>
                                </a>
                              </div>
                              <p className="text-xs text-base-content/60 mt-1 truncate">{file.filename || file.fieldName}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* List for non-image files */}
                      {data.files.filter(f => !isImageUrl(f.url)).length > 0 && (
                        <div className="space-y-2">
                          {data.files.filter(f => !isImageUrl(f.url)).map((file) => (
                            <div key={file._id} className="flex items-center justify-between p-3 bg-base-100 rounded-lg">
                              <div>
                                <p className="font-semibold">{file.filename || "File"}</p>
                                <p className="text-sm text-base-content/60">
                                  Field: {file.fieldName}
                                  {file.size && ` • ${(file.size / 1024).toFixed(1)} KB`}
                                </p>
                              </div>
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-sm btn-primary"
                              >
                                Download
                              </a>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
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
