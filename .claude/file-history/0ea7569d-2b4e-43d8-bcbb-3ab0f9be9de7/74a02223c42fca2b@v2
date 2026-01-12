/**
 * AttachmentField Component
 *
 * Renders file attachment values as clickable thumbnails with lightbox/viewer.
 * Supports: images (jpg, png, webp, heic, gif), PDFs, and other files.
 *
 * Usage:
 *   <AttachmentField value={value} fieldName="Upload Photo" />
 *   <AttachmentField value={['url1', 'url2']} fieldName="Documents" />
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Portal } from "./Portal";

// ═══════════════════════════════════════════════════════════════════════════════
// ATTACHMENT DETECTION & NORMALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

// Image extensions that can be displayed as thumbnails
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'bmp', 'svg'];
const PDF_EXTENSIONS = ['pdf'];

/**
 * Check if a string looks like a file path or URL
 */
export function isAttachmentValue(value) {
  if (!value) return false;

  // Array of attachments
  if (Array.isArray(value)) {
    return value.some(v => isAttachmentValue(v));
  }

  // Object with url property
  if (typeof value === 'object' && value.url) {
    return true;
  }

  // String patterns
  if (typeof value === 'string') {
    // S3 key pattern
    if (value.startsWith('uploads/')) return true;
    // HTTP/HTTPS URL
    if (value.startsWith('http://') || value.startsWith('https://')) return true;
    // API file endpoint
    if (value.startsWith('/api/files/') || value.startsWith('/api/uploads/')) return true;
    // Relative path with file extension
    if (/\.(jpg|jpeg|png|gif|webp|heic|heif|bmp|svg|pdf|doc|docx|xls|xlsx|txt|csv)$/i.test(value)) return true;
  }

  return false;
}

/**
 * Get file extension from URL or path
 */
function getFileExtension(url) {
  if (!url || typeof url !== 'string') return '';
  // Remove query string and hash
  const cleanUrl = url.split('?')[0].split('#')[0];
  const lastDot = cleanUrl.lastIndexOf('.');
  if (lastDot === -1) return '';
  return cleanUrl.substring(lastDot + 1).toLowerCase();
}

/**
 * Get file type from extension
 */
function getFileType(url) {
  const ext = getFileExtension(url);
  if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
  if (PDF_EXTENSIONS.includes(ext)) return 'pdf';
  return 'other';
}

/**
 * Get filename from URL or path
 */
function getFilename(url) {
  if (!url || typeof url !== 'string') return 'File';
  const cleanUrl = url.split('?')[0].split('#')[0];
  const lastSlash = cleanUrl.lastIndexOf('/');
  return lastSlash === -1 ? cleanUrl : cleanUrl.substring(lastSlash + 1);
}

/**
 * Normalize attachment value to array of { url, name, ext, type }
 */
export function normalizeAttachments(value) {
  if (!value) return [];

  const attachments = [];

  // Convert to array
  let items = Array.isArray(value) ? value : [value];

  for (const item of items) {
    if (!item) continue;

    let url, name;

    if (typeof item === 'string') {
      // Try to parse JSON string
      if (item.startsWith('[') || item.startsWith('{')) {
        try {
          const parsed = JSON.parse(item);
          const nested = normalizeAttachments(parsed);
          attachments.push(...nested);
          continue;
        } catch {
          // Not JSON, treat as URL
        }
      }
      url = item;
      name = getFilename(item);
    } else if (typeof item === 'object') {
      url = item.url || item.src || item.path || item.key;
      name = item.name || item.filename || item.caption || getFilename(url);
    }

    if (!url) continue;

    // Skip empty or placeholder values
    if (url === '' || url === 'undefined' || url === 'null') continue;

    const ext = getFileExtension(url);
    const type = getFileType(url);

    attachments.push({ url, name, ext, type });
  }

  return attachments;
}

// ═══════════════════════════════════════════════════════════════════════════════
// S3 SIGNED URL HANDLING
// ═══════════════════════════════════════════════════════════════════════════════

// Check if a URL is an S3 key that needs signing
const isS3Key = (url) => typeof url === "string" && url.startsWith("uploads/");

// Module-level cache for signed URLs
const signedUrlCache = new Map();

/**
 * Hook to resolve S3 keys to signed URLs
 */
function useSignedUrls(attachments) {
  const [signedUrls, setSignedUrls] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const fetchedKeysRef = useRef(new Set());
  const isMountedRef = useRef(true);

  const s3Keys = useMemo(() => {
    const keys = new Set();
    attachments.forEach((att) => {
      if (isS3Key(att.url)) {
        keys.add(att.url);
      }
    });
    return Array.from(keys);
  }, [attachments]);

  const s3KeysString = s3Keys.join(",");

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (s3Keys.length === 0) return;

    const keysToFetch = s3Keys.filter(
      (key) => !signedUrlCache.has(key) && !fetchedKeysRef.current.has(key)
    );

    if (keysToFetch.length === 0) {
      const cached = {};
      s3Keys.forEach((key) => {
        if (signedUrlCache.has(key)) {
          cached[key] = signedUrlCache.get(key);
        }
      });
      if (Object.keys(cached).length > 0) {
        setSignedUrls((prev) => ({ ...prev, ...cached }));
      }
      return;
    }

    keysToFetch.forEach((key) => fetchedKeysRef.current.add(key));

    const fetchSignedUrls = async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/photos/signed-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keys: keysToFetch }),
        });

        if (!res.ok) return;

        const data = await res.json();
        if (!isMountedRef.current) return;

        const newSignedUrls = {};
        keysToFetch.forEach((key, i) => {
          const signedUrl = data.urls?.[i];
          if (signedUrl) {
            newSignedUrls[key] = signedUrl;
            signedUrlCache.set(key, signedUrl);
          }
        });

        if (Object.keys(newSignedUrls).length > 0) {
          setSignedUrls((prev) => ({ ...prev, ...newSignedUrls }));
        }
      } catch (err) {
        console.warn("[AttachmentField] Signed URL fetch error:", err.message);
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    fetchSignedUrls();
  }, [s3KeysString]);

  const resolveUrl = useCallback(
    (url) => {
      if (isS3Key(url)) {
        if (signedUrls[url]) return signedUrls[url];
        if (signedUrlCache.has(url)) return signedUrlCache.get(url);
      }
      return url;
    },
    [signedUrls]
  );

  return { resolveUrl, isLoading };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ATTACHMENT FIELD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function AttachmentField({
  value,
  fieldName = "Attachment",
  className = "",
  thumbnailSize = "md", // sm, md, lg
  maxVisible = 6,
  printMode = false, // For PDF/print rendering
}) {
  const attachments = useMemo(() => normalizeAttachments(value), [value]);
  const { resolveUrl, isLoading } = useSignedUrls(attachments);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [showAll, setShowAll] = useState(false);

  // Separate images and non-images
  const images = attachments.filter(a => a.type === 'image');
  const pdfs = attachments.filter(a => a.type === 'pdf');
  const others = attachments.filter(a => a.type === 'other');

  const sizes = {
    sm: { thumb: "w-12 h-12", icon: "w-4 h-4" },
    md: { thumb: "w-16 h-16", icon: "w-5 h-5" },
    lg: { thumb: "w-20 h-20", icon: "w-6 h-6" },
  };
  const size = sizes[thumbnailSize] || sizes.md;

  const visibleImages = showAll ? images : images.slice(0, maxVisible);
  const hiddenCount = images.length - maxVisible;

  if (attachments.length === 0) {
    return <span className="text-slate-400 italic">—</span>;
  }

  // Print mode - render inline thumbnails
  if (printMode) {
    return (
      <div className={`attachment-field-print ${className}`}>
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {images.map((att, idx) => (
              <div key={idx} className="inline-block">
                <img
                  src={resolveUrl(att.url)}
                  alt={att.name}
                  className="max-w-[120px] max-h-[80px] object-cover rounded border border-slate-200"
                  crossOrigin="anonymous"
                />
              </div>
            ))}
          </div>
        )}
        {pdfs.length > 0 && (
          <div className="text-sm text-slate-600">
            {pdfs.map((att, idx) => (
              <div key={idx} className="flex items-center gap-1">
                <span className="text-red-500">📄</span>
                <a href={resolveUrl(att.url)} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                  {att.name}
                </a>
              </div>
            ))}
          </div>
        )}
        {others.length > 0 && (
          <div className="text-sm text-slate-600">
            {others.map((att, idx) => (
              <div key={idx} className="flex items-center gap-1">
                <span>📎</span>
                <a href={resolveUrl(att.url)} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                  {att.name}
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`attachment-field ${className}`}>
      {/* Image thumbnails */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {visibleImages.map((att, idx) => (
            <button
              key={idx}
              onClick={() => {
                setLightboxIndex(idx);
                setLightboxOpen(true);
              }}
              className={`${size.thumb} relative group rounded-lg overflow-hidden border border-slate-200 hover:border-blue-500 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1`}
            >
              <img
                src={resolveUrl(att.url)}
                alt={att.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                <svg
                  className={`${size.icon} text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                  />
                </svg>
              </div>
            </button>
          ))}
          {!showAll && hiddenCount > 0 && (
            <button
              onClick={() => setShowAll(true)}
              className={`${size.thumb} rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center transition-colors`}
            >
              <span className="text-sm font-semibold text-slate-600">+{hiddenCount}</span>
            </button>
          )}
        </div>
      )}

      {/* PDF files */}
      {pdfs.length > 0 && (
        <div className="space-y-1 mb-2">
          {pdfs.map((att, idx) => (
            <button
              key={idx}
              onClick={() => {
                setPdfUrl(resolveUrl(att.url));
                setPdfViewerOpen(true);
              }}
              className="flex items-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 text-left w-full transition-colors group"
            >
              <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800 truncate">{att.name}</p>
                <p className="text-xs text-slate-500">Click to preview PDF</p>
              </div>
              <svg className="w-4 h-4 text-slate-400 group-hover:text-slate-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
          ))}
        </div>
      )}

      {/* Other files */}
      {others.length > 0 && (
        <div className="space-y-1">
          {others.map((att, idx) => (
            <a
              key={idx}
              href={resolveUrl(att.url)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors group"
            >
              <div className="w-8 h-8 bg-slate-200 rounded flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800 truncate">{att.name}</p>
                <p className="text-xs text-slate-500 uppercase">{att.ext || 'File'}</p>
              </div>
              <svg className="w-4 h-4 text-slate-400 group-hover:text-slate-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </a>
          ))}
        </div>
      )}

      {/* Image Lightbox */}
      {lightboxOpen && (
        <ImageLightbox
          images={images.map(img => ({ ...img, resolvedUrl: resolveUrl(img.url) }))}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
          onNavigate={setLightboxIndex}
        />
      )}

      {/* PDF Viewer Modal */}
      {pdfViewerOpen && pdfUrl && (
        <PdfViewer
          url={pdfUrl}
          onClose={() => {
            setPdfViewerOpen(false);
            setPdfUrl(null);
          }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// IMAGE LIGHTBOX
// ═══════════════════════════════════════════════════════════════════════════════

function ImageLightbox({ images, currentIndex, onClose, onNavigate }) {
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && currentIndex > 0) onNavigate(currentIndex - 1);
      if (e.key === "ArrowRight" && currentIndex < images.length - 1) onNavigate(currentIndex + 1);
    },
    [currentIndex, images.length, onClose, onNavigate]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  const currentImage = images[currentIndex];
  const displayUrl = currentImage.resolvedUrl || currentImage.url;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < images.length - 1;

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 p-4"
        onClick={onClose}
      >
        {/* Close button */}
        <button
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
          onClick={onClose}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Previous */}
        {hasPrev && (
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
            onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex - 1); }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Next */}
        {hasNext && (
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
            onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex + 1); }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Main image */}
        <img
          src={displayUrl}
          alt={currentImage.name}
          className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />

        {/* Bottom bar */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 px-4 py-2 rounded-full bg-black/50 text-white text-sm">
          <span>{currentIndex + 1} / {images.length}</span>
          <span className="w-px h-4 bg-white/30" />
          <span className="text-white/70 truncate max-w-[200px]">{currentImage.name}</span>
          <span className="w-px h-4 bg-white/30" />
          <a
            href={displayUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-blue-300 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Open
          </a>
        </div>
      </div>
    </Portal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PDF VIEWER
// ═══════════════════════════════════════════════════════════════════════════════

function PdfViewer({ url, onClose }) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <Portal>
      <div className="fixed inset-0 z-[99999] bg-black/80 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white">
          <h3 className="text-sm font-medium truncate flex-1">PDF Preview</h3>
          <div className="flex items-center gap-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 rounded transition-colors"
            >
              Open in New Tab
            </a>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* PDF iframe */}
        <div className="flex-1 bg-slate-800">
          <iframe
            src={`${url}#view=FitH`}
            className="w-full h-full"
            title="PDF Preview"
          />
        </div>
      </div>
    </Portal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HTML FORMATTER FOR PDF EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format attachment value as HTML for PDF export
 * Returns inline HTML with thumbnails for images, links for other files
 */
export function formatAttachmentHtml(value, options = {}) {
  const attachments = normalizeAttachments(value);
  if (attachments.length === 0) return '—';

  const images = attachments.filter(a => a.type === 'image');
  const pdfs = attachments.filter(a => a.type === 'pdf');
  const others = attachments.filter(a => a.type === 'other');

  let html = '';

  // Images as thumbnails in grid
  if (images.length > 0) {
    html += `<div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">`;
    images.forEach(img => {
      html += `
        <div style="text-align: center;">
          <img src="${img.url}" alt="${img.name}"
               style="max-width: 120px; max-height: 80px; border-radius: 4px; border: 1px solid #e5e5e5; object-fit: cover;"
               onerror="this.style.display='none'" />
        </div>
      `;
    });
    html += `</div>`;
  }

  // PDFs as links with icon
  if (pdfs.length > 0) {
    pdfs.forEach(pdf => {
      html += `
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
          <span style="color: #dc2626;">📄</span>
          <a href="${pdf.url}" target="_blank" style="color: #2563eb; text-decoration: underline; font-size: 13px;">
            ${pdf.name}
          </a>
        </div>
      `;
    });
  }

  // Other files as links
  if (others.length > 0) {
    others.forEach(file => {
      html += `
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
          <span>📎</span>
          <a href="${file.url}" target="_blank" style="color: #2563eb; text-decoration: underline; font-size: 13px;">
            ${file.name}
          </a>
        </div>
      `;
    });
  }

  return html || '—';
}

export default AttachmentField;
