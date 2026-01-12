import { useState, useCallback } from "react";
import Image from "next/image";
import { toast } from "react-hot-toast";

/**
 * VehicleImageGallery Component
 *
 * Displays vehicle images in a gallery format with:
 * - Thumbnail grid view
 * - Lightbox for larger preview
 * - Delete functionality
 * - Set as primary functionality
 * - Automatic signed URL fallback for private buckets
 *
 * Props:
 * - vehicleId: The vehicle ID
 * - images: Array of { url, key, uploadedAt }
 * - primaryImageUrl: The current primary image URL
 * - onUpdate: Callback when images are modified (receives updated vehicle)
 * - editable: Whether to show edit controls (default true)
 */
export default function VehicleImageGallery({
  vehicleId,
  images = [],
  primaryImageUrl,
  onUpdate,
  editable = true,
}) {
  const [lightboxImage, setLightboxImage] = useState(null);
  const [isDeleting, setIsDeleting] = useState(null);
  const [isSettingPrimary, setIsSettingPrimary] = useState(null);
  // Map of image keys to signed URLs (for private bucket fallback)
  const [signedUrls, setSignedUrls] = useState({});
  const [loadErrors, setLoadErrors] = useState({});

  // Fetch signed URL when public URL fails
  const fetchSignedUrl = useCallback(async (imageKey) => {
    // Don't refetch if we already have it or already tried
    if (signedUrls[imageKey] || loadErrors[imageKey] === "signed-failed") return null;

    try {
      const res = await fetch(`/api/uploads/signed-get?key=${encodeURIComponent(imageKey)}`);
      if (!res.ok) {
        console.error("[Gallery] Failed to get signed URL:", await res.text());
        setLoadErrors((prev) => ({ ...prev, [imageKey]: "signed-failed" }));
        return null;
      }
      const { signedUrl } = await res.json();
      setSignedUrls((prev) => ({ ...prev, [imageKey]: signedUrl }));
      return signedUrl;
    } catch (err) {
      console.error("[Gallery] Error fetching signed URL:", err);
      setLoadErrors((prev) => ({ ...prev, [imageKey]: "signed-failed" }));
      return null;
    }
  }, [signedUrls, loadErrors]);

  // Handle image load error - try signed URL fallback
  const handleImageError = useCallback((imageKey) => {
    // Mark as errored and try to fetch signed URL
    setLoadErrors((prev) => {
      if (prev[imageKey]) return prev; // Already tried
      return { ...prev, [imageKey]: "public-failed" };
    });
    fetchSignedUrl(imageKey);
  }, [fetchSignedUrl]);

  // Get the best URL for an image (signed if available, otherwise public)
  const getImageUrl = useCallback((image) => {
    return signedUrls[image.key] || image.url;
  }, [signedUrls]);

  const handleDelete = async (image) => {
    if (!confirm("Are you sure you want to delete this image?")) return;

    setIsDeleting(image.key);
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}/images`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: image.key }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete image");
      }

      const result = await res.json();
      toast.success("Image deleted");
      if (onUpdate) onUpdate(result.vehicle);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleSetPrimary = async (image) => {
    if (primaryImageUrl === image.url) return;

    setIsSettingPrimary(image.key);
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}/primary-image`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: image.url }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to set primary image");
      }

      const result = await res.json();
      toast.success("Primary image updated");
      if (onUpdate) onUpdate(result.vehicle);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSettingPrimary(null);
    }
  };

  if (images.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-sm">No images uploaded</p>
      </div>
    );
  }

  return (
    <>
      {/* Image Grid */}
      <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
        {images.map((image, idx) => {
          const isPrimary = primaryImageUrl === image.url;
          const isLoading = isDeleting === image.key || isSettingPrimary === image.key;

          return (
            <div
              key={image.key || idx}
              className={`relative aspect-square rounded-lg overflow-hidden group cursor-pointer border-2 transition-all ${
                isPrimary ? "border-blue-500 ring-2 ring-blue-200" : "border-transparent hover:border-slate-300"
              }`}
              onClick={() => setLightboxImage(image)}
            >
              {/* Image */}
              <Image
                src={getImageUrl(image)}
                alt={`Vehicle image ${idx + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 33vw, 25vw"
                unoptimized
                onError={() => handleImageError(image.key)}
              />

              {/* Primary Badge */}
              {isPrimary && (
                <div className="absolute top-1 left-1 bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                  Primary
                </div>
              )}

              {/* Loading Overlay */}
              {isLoading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="loading loading-spinner loading-sm text-white"></span>
                </div>
              )}

              {/* Hover Actions */}
              {editable && !isLoading && (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  {/* Set as Primary */}
                  {!isPrimary && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetPrimary(image);
                      }}
                      className="p-2 bg-white rounded-full shadow hover:bg-blue-50 transition-colors"
                      title="Set as primary"
                    >
                      <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </button>
                  )}

                  {/* Delete */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(image);
                    }}
                    className="p-2 bg-white rounded-full shadow hover:bg-red-50 transition-colors"
                    title="Delete image"
                  >
                    <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-slate-300 transition-colors"
            onClick={() => setLightboxImage(null)}
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="relative max-w-4xl max-h-[80vh] w-full h-full" onClick={(e) => e.stopPropagation()}>
            <Image
              src={getImageUrl(lightboxImage)}
              alt="Vehicle image"
              fill
              className="object-contain"
              sizes="100vw"
              unoptimized
              onError={() => handleImageError(lightboxImage.key)}
            />
          </div>

          {/* Navigation */}
          {images.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-slate-300 transition-colors p-2"
                onClick={(e) => {
                  e.stopPropagation();
                  const currentIdx = images.findIndex((img) => img.key === lightboxImage.key);
                  const prevIdx = (currentIdx - 1 + images.length) % images.length;
                  setLightboxImage(images[prevIdx]);
                }}
              >
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-slate-300 transition-colors p-2"
                onClick={(e) => {
                  e.stopPropagation();
                  const currentIdx = images.findIndex((img) => img.key === lightboxImage.key);
                  const nextIdx = (currentIdx + 1) % images.length;
                  setLightboxImage(images[nextIdx]);
                }}
              >
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          {/* Image counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
            {images.findIndex((img) => img.key === lightboxImage.key) + 1} / {images.length}
          </div>
        </div>
      )}
    </>
  );
}
