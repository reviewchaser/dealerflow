import { useState, useRef } from "react";
import { toast } from "react-hot-toast";

/**
 * VehicleImageUploader Component
 *
 * Handles uploading images to R2 via presigned URLs.
 * Supports multiple file uploads with progress tracking.
 *
 * Props:
 * - vehicleId: The vehicle ID to attach images to
 * - onUploadComplete: Callback when all uploads are done (receives updated vehicle)
 * - maxFiles: Maximum number of files allowed (default 10)
 * - maxSizeMB: Maximum file size in MB (default 10)
 * - className: Optional className for the container
 */
export default function VehicleImageUploader({
  vehicleId,
  onUploadComplete,
  maxFiles = 10,
  maxSizeMB = 10,
  className = "",
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState([]);
  const fileInputRef = useRef(null);

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const validateFile = (file) => {
    if (!allowedTypes.includes(file.type)) {
      return `${file.name}: Invalid file type. Use JPEG, PNG, WebP, or GIF.`;
    }
    if (file.size > maxSizeBytes) {
      return `${file.name}: File too large. Maximum size is ${maxSizeMB}MB.`;
    }
    return null;
  };

  const uploadSingleFile = async (file, index, total) => {
    try {
      // Update progress
      setUploadProgress((prev) => {
        const updated = [...prev];
        updated[index] = { name: file.name, status: "presigning", progress: 0 };
        return updated;
      });

      // Step 1: Get presigned URL
      const presignRes = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "vehicle",
          entityId: vehicleId,
          fileName: file.name,
          contentType: file.type,
        }),
      });

      if (!presignRes.ok) {
        const err = await presignRes.json();
        throw new Error(err.error || "Failed to get upload URL");
      }

      const { uploadUrl, publicUrl, key } = await presignRes.json();

      // Update progress
      setUploadProgress((prev) => {
        const updated = [...prev];
        updated[index] = { name: file.name, status: "uploading", progress: 10 };
        return updated;
      });

      // Step 2: Upload file to R2 via presigned URL
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload file to storage");
      }

      // Update progress
      setUploadProgress((prev) => {
        const updated = [...prev];
        updated[index] = { name: file.name, status: "saving", progress: 80 };
        return updated;
      });

      // Step 3: Save image reference to vehicle
      const saveRes = await fetch(`/api/vehicles/${vehicleId}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: publicUrl, key }),
      });

      if (!saveRes.ok) {
        const err = await saveRes.json();
        throw new Error(err.error || "Failed to save image");
      }

      const result = await saveRes.json();

      // Update progress - complete
      setUploadProgress((prev) => {
        const updated = [...prev];
        updated[index] = { name: file.name, status: "complete", progress: 100 };
        return updated;
      });

      return { success: true, vehicle: result.vehicle };
    } catch (error) {
      // Update progress - error
      setUploadProgress((prev) => {
        const updated = [...prev];
        updated[index] = {
          name: file.name,
          status: "error",
          progress: 0,
          error: error.message,
        };
        return updated;
      });
      return { success: false, error: error.message };
    }
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate file count
    if (files.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed at once`);
      return;
    }

    // Validate each file
    const errors = files.map(validateFile).filter(Boolean);
    if (errors.length > 0) {
      errors.forEach((err) => toast.error(err));
      return;
    }

    setIsUploading(true);
    setUploadProgress(
      files.map((f) => ({ name: f.name, status: "pending", progress: 0 }))
    );

    let lastVehicle = null;
    let successCount = 0;
    let errorCount = 0;

    // Upload files sequentially to avoid overwhelming the server
    for (let i = 0; i < files.length; i++) {
      const result = await uploadSingleFile(files[i], i, files.length);
      if (result.success) {
        successCount++;
        lastVehicle = result.vehicle;
      } else {
        errorCount++;
      }
    }

    // Show summary toast
    if (errorCount === 0) {
      toast.success(`${successCount} image${successCount !== 1 ? "s" : ""} uploaded successfully`);
    } else if (successCount === 0) {
      toast.error("All uploads failed");
    } else {
      toast.success(`${successCount} uploaded, ${errorCount} failed`);
    }

    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    // Callback with updated vehicle
    if (lastVehicle && onUploadComplete) {
      onUploadComplete(lastVehicle);
    }

    // Clear progress after a delay
    setTimeout(() => {
      setIsUploading(false);
      setUploadProgress([]);
    }, 2000);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return (
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "presigning":
      case "uploading":
      case "saving":
        return (
          <span className="loading loading-spinner loading-xs"></span>
        );
      case "complete":
        return (
          <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case "error":
        return (
          <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className={className}>
      {/* Upload Button */}
      <label className="btn btn-outline btn-sm gap-2 cursor-pointer">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        {isUploading ? "Uploading..." : "Upload Images"}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          onChange={handleFileSelect}
          disabled={isUploading}
          className="hidden"
        />
      </label>

      {/* Upload Progress */}
      {uploadProgress.length > 0 && (
        <div className="mt-3 space-y-2">
          {uploadProgress.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 text-sm bg-slate-50 rounded-lg px-3 py-2"
            >
              {getStatusIcon(item.status)}
              <span className="flex-1 truncate">{item.name}</span>
              {item.status === "uploading" && (
                <span className="text-xs text-slate-500">{item.progress}%</span>
              )}
              {item.error && (
                <span className="text-xs text-red-500 truncate max-w-[100px]">
                  {item.error}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
