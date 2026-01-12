import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
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
 * - useServerFallback: If true, use server-side upload instead of presigned URLs
 *
 * Debug Mode:
 * Add ?debugUploads=1 to URL to enable detailed console logging
 */
export default function VehicleImageUploader({
  vehicleId,
  onUploadComplete,
  maxFiles = 10,
  maxSizeMB = 10,
  className = "",
  useServerFallback = false,
}) {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState([]);
  const [lastError, setLastError] = useState(null);
  const fileInputRef = useRef(null);

  // Debug mode from URL param
  const debugMode = router.query.debugUploads === "1";

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const debugLog = (...args) => {
    if (debugMode) {
      console.log("[VehicleImageUploader]", ...args);
    }
  };

  const validateFile = (file) => {
    if (!allowedTypes.includes(file.type)) {
      return `${file.name}: Invalid file type. Use JPEG, PNG, WebP, or GIF.`;
    }
    if (file.size > maxSizeBytes) {
      return `${file.name}: File too large. Maximum size is ${maxSizeMB}MB.`;
    }
    return null;
  };

  const uploadViaPresignedUrl = async (file, index) => {
    debugLog("Step 1: Getting presigned URL for", file.name);

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

    const presignText = await presignRes.text();
    debugLog("Presign response status:", presignRes.status);
    debugLog("Presign response body:", presignText);

    if (!presignRes.ok) {
      let errorDetail;
      try {
        errorDetail = JSON.parse(presignText);
      } catch {
        errorDetail = { error: presignText };
      }
      throw new Error(`Presign failed (${presignRes.status}): ${errorDetail.error || errorDetail.details || presignText}`);
    }

    const { uploadUrl, publicUrl, key, contentType: signedContentType } = JSON.parse(presignText);

    debugLog("Step 2: Uploading to R2 via presigned URL");
    debugLog("Upload URL (first 100 chars):", uploadUrl.substring(0, 100));
    debugLog("File type:", file.type);
    debugLog("Signed content type:", signedContentType);

    // Update progress
    setUploadProgress((prev) => {
      const updated = [...prev];
      updated[index] = { name: file.name, status: "uploading", progress: 10 };
      return updated;
    });

    // Step 2: Upload file to R2 via presigned URL
    // IMPORTANT: Content-Type header must match what was used in presign
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
        // Do NOT include any other headers like x-amz-acl
      },
    });

    debugLog("Upload response status:", uploadRes.status);
    debugLog("Upload response ok:", uploadRes.ok);

    if (!uploadRes.ok) {
      const uploadText = await uploadRes.text();
      debugLog("Upload error response:", uploadText);

      // Check for CORS error indicators
      if (uploadRes.status === 0 || uploadText === "") {
        throw new Error(
          "CORS error: Browser blocked the upload. R2 bucket CORS needs to be configured in Cloudflare. " +
          "See console for details."
        );
      }

      throw new Error(`Upload to R2 failed (${uploadRes.status}): ${uploadText.substring(0, 200)}`);
    }

    return { publicUrl, key };
  };

  const uploadViaServer = async (file, index) => {
    debugLog("Using server-side upload for", file.name);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("vehicleId", vehicleId);

    const res = await fetch("/api/uploads/vehicle-image-server", {
      method: "POST",
      body: formData,
    });

    const text = await res.text();
    debugLog("Server upload response status:", res.status);
    debugLog("Server upload response:", text);

    if (!res.ok) {
      let errorDetail;
      try {
        errorDetail = JSON.parse(text);
      } catch {
        errorDetail = { error: text };
      }
      throw new Error(`Server upload failed: ${errorDetail.error || text}`);
    }

    const result = JSON.parse(text);
    return { publicUrl: result.publicUrl, key: result.key };
  };

  const uploadSingleFile = async (file, index, total) => {
    try {
      // Update progress
      setUploadProgress((prev) => {
        const updated = [...prev];
        updated[index] = { name: file.name, status: "presigning", progress: 0 };
        return updated;
      });

      let uploadResult;

      if (useServerFallback) {
        uploadResult = await uploadViaServer(file, index);
      } else {
        try {
          uploadResult = await uploadViaPresignedUrl(file, index);
        } catch (presignError) {
          debugLog("Presigned URL upload failed, error:", presignError.message);

          // Check if it's a CORS error and we should try fallback
          if (presignError.message.includes("CORS")) {
            debugLog("Detected CORS error, trying server fallback...");
            toast.error("CORS error - trying server upload...");

            try {
              uploadResult = await uploadViaServer(file, index);
            } catch (fallbackError) {
              throw new Error(`Both presigned and server upload failed: ${presignError.message} / ${fallbackError.message}`);
            }
          } else {
            throw presignError;
          }
        }
      }

      const { publicUrl, key } = uploadResult;

      // Update progress
      setUploadProgress((prev) => {
        const updated = [...prev];
        updated[index] = { name: file.name, status: "saving", progress: 80 };
        return updated;
      });

      debugLog("Step 3: Saving image reference to vehicle");

      // Step 3: Save image reference to vehicle
      const saveRes = await fetch(`/api/vehicles/${vehicleId}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: publicUrl, key }),
      });

      const saveText = await saveRes.text();
      debugLog("Save response status:", saveRes.status);
      debugLog("Save response:", saveText);

      if (!saveRes.ok) {
        let errorDetail;
        try {
          errorDetail = JSON.parse(saveText);
        } catch {
          errorDetail = { error: saveText };
        }
        throw new Error(`Save to vehicle failed: ${errorDetail.error || saveText}`);
      }

      const result = JSON.parse(saveText);

      // Update progress - complete
      setUploadProgress((prev) => {
        const updated = [...prev];
        updated[index] = { name: file.name, status: "complete", progress: 100 };
        return updated;
      });

      debugLog("Upload complete for", file.name);

      return { success: true, vehicle: result.vehicle };
    } catch (error) {
      debugLog("Upload error for", file.name, ":", error.message);
      console.error("[VehicleImageUploader] Error:", error);

      setLastError({
        fileName: file.name,
        message: error.message,
        timestamp: new Date().toISOString(),
      });

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

    debugLog("Selected files:", files.map(f => ({ name: f.name, type: f.type, size: f.size })));

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
    setLastError(null);
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
      toast.error("All uploads failed - check console for details");
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

      {/* Debug mode indicator */}
      {debugMode && (
        <span className="ml-2 text-xs text-orange-500 font-mono">DEBUG</span>
      )}

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
                <span className="text-xs text-red-500 truncate max-w-[150px]" title={item.error}>
                  {item.error}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Last error display (for debugging) */}
      {lastError && debugMode && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs">
          <div className="font-bold text-red-700">Last Error:</div>
          <div className="text-red-600 mt-1">
            <div>File: {lastError.fileName}</div>
            <div>Time: {lastError.timestamp}</div>
            <div className="mt-1 break-all">{lastError.message}</div>
          </div>
        </div>
      )}
    </div>
  );
}
