import { useState, useCallback } from "react";

/**
 * VehicleImage Component
 *
 * A wrapper for displaying vehicle images that handles:
 * - Public URL loading (primary)
 * - Signed URL fallback when public URL fails (403 for private buckets)
 * - Graceful error handling with fallback placeholder
 *
 * Props:
 * - src: The image URL (can be public or signed)
 * - imageKey: The R2 object key (required for signed URL fallback)
 * - alt: Alt text for the image
 * - className: CSS classes for the img element
 * - fallback: Custom fallback content (optional)
 * - ...rest: Additional props passed to img element
 */
export default function VehicleImage({
  src,
  imageKey,
  alt = "Vehicle image",
  className = "",
  fallback = null,
  ...rest
}) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [triedSignedUrl, setTriedSignedUrl] = useState(false);

  // Fetch signed URL when public URL fails
  const fetchSignedUrl = useCallback(async () => {
    if (!imageKey || triedSignedUrl) {
      setHasError(true);
      return;
    }

    setTriedSignedUrl(true);

    try {
      const res = await fetch(`/api/uploads/signed-get?key=${encodeURIComponent(imageKey)}`);
      if (!res.ok) {
        console.error("[VehicleImage] Failed to get signed URL:", await res.text());
        setHasError(true);
        return;
      }
      const { signedUrl } = await res.json();
      setCurrentSrc(signedUrl);
    } catch (err) {
      console.error("[VehicleImage] Error fetching signed URL:", err);
      setHasError(true);
    }
  }, [imageKey, triedSignedUrl]);

  const handleError = useCallback(() => {
    if (!triedSignedUrl && imageKey) {
      // Try signed URL fallback
      fetchSignedUrl();
    } else {
      setHasError(true);
    }
  }, [triedSignedUrl, imageKey, fetchSignedUrl]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  // Show fallback if we have no source or had an error
  if (!currentSrc || hasError) {
    if (fallback) return fallback;

    return (
      <div className={`bg-slate-100 flex items-center justify-center ${className}`} style={rest.style}>
        <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }

  return (
    <>
      {isLoading && (
        <div className={`bg-slate-100 animate-pulse ${className}`} style={rest.style} />
      )}
      <img
        src={currentSrc}
        alt={alt}
        className={`${className} ${isLoading ? 'hidden' : ''}`}
        onError={handleError}
        onLoad={handleLoad}
        {...rest}
      />
    </>
  );
}
