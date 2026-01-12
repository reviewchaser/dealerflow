import { useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import toast from "react-hot-toast";

export default function ShareFormModal({ form, publicUrl, onClose }) {
  const [showQR, setShowQR] = useState(false);
  const qrRef = useRef(null);

  // Handle case where publicUrl might be null
  const hasValidUrl = !!publicUrl;
  const displayUrl = publicUrl || "(URL not available - form may not be public)";

  const copyToClipboard = () => {
    if (!hasValidUrl) {
      toast.error("No URL available to copy");
      return;
    }
    navigator.clipboard.writeText(publicUrl);
    toast.success("Link copied to clipboard!");
  };

  const shareViaEmail = () => {
    if (!hasValidUrl) {
      toast.error("No URL available to share");
      return;
    }
    const subject = encodeURIComponent(`${form.name} - DealerFlow Form`);
    const body = encodeURIComponent(`Please fill out this form:\n\n${publicUrl}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const shareViaWhatsApp = () => {
    if (!hasValidUrl) {
      toast.error("No URL available to share");
      return;
    }
    const text = encodeURIComponent(`Please fill out this form: ${publicUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const getSMSText = () => {
    if (!hasValidUrl) return "Please fill out this form: (URL not available)";
    return `Please fill out this form: ${publicUrl}`;
  };

  const printQRCode = () => {
    if (!hasValidUrl) {
      toast.error("No URL available for QR code");
      return;
    }
    // Open print-friendly page
    const printWindow = window.open("", "_blank", "width=600,height=800");
    if (!printWindow) {
      toast.error("Please allow popups to print QR code");
      return;
    }

    const qrSvg = qrRef.current?.querySelector("svg");
    const qrHtml = qrSvg ? qrSvg.outerHTML : "";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${form.name} - QR Code</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              padding: 40px;
              text-align: center;
            }
            h1 {
              font-size: 24px;
              font-weight: 600;
              color: #1e293b;
              margin-bottom: 12px;
            }
            .instruction {
              font-size: 16px;
              color: #64748b;
              margin-bottom: 32px;
            }
            .qr-container {
              padding: 24px;
              background: white;
              border-radius: 16px;
              box-shadow: 0 4px 24px rgba(0,0,0,0.08);
              margin-bottom: 24px;
            }
            .qr-container svg {
              width: 256px;
              height: 256px;
            }
            .url {
              font-family: monospace;
              font-size: 12px;
              color: #94a3b8;
              word-break: break-all;
              max-width: 300px;
            }
            @media print {
              body { padding: 20px; }
              .qr-container { box-shadow: none; border: 2px solid #e2e8f0; }
            }
          </style>
        </head>
        <body>
          <h1>${form.name}</h1>
          <p class="instruction">Scan the QR code to access this form</p>
          <div class="qr-container">
            ${qrHtml}
          </div>
          <p class="url">${publicUrl}</p>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <>
      {/* Modal backdrop */}
      <div className="modal modal-open">
        <div className="modal-box max-w-2xl">
          <h3 className="font-bold text-lg mb-4">Share: {form.name}</h3>

          {/* Warning if no valid URL */}
          {!hasValidUrl && (
            <div className="alert alert-warning mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>This form does not have a public URL. Change visibility to "Share Link" or "Public" to enable sharing.</span>
            </div>
          )}

          {/* Public URL */}
          <div className="form-control mb-6">
            <label className="label">
              <span className="label-text font-semibold">Public URL</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                className={`input input-bordered flex-1 ${!hasValidUrl ? "text-base-content/40" : ""}`}
                value={displayUrl}
                readOnly
                onClick={(e) => hasValidUrl && e.target.select()}
              />
              <button
                className={`btn ${hasValidUrl ? "btn-primary" : "btn-disabled"}`}
                onClick={copyToClipboard}
                disabled={!hasValidUrl}
              >
                Copy
              </button>
            </div>
          </div>

          {/* Share Options */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              className={`btn btn-outline ${!hasValidUrl ? "btn-disabled" : ""}`}
              onClick={shareViaEmail}
              disabled={!hasValidUrl}
            >
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email
            </button>
            <button
              className={`btn btn-outline ${!hasValidUrl ? "btn-disabled" : ""}`}
              onClick={shareViaWhatsApp}
              disabled={!hasValidUrl}
            >
              <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </button>
            <button
              className={`btn btn-outline ${!hasValidUrl ? "btn-disabled" : ""}`}
              onClick={() => setShowQR(!showQR)}
              disabled={!hasValidUrl}
            >
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              QR Code
            </button>
            <button
              className="btn btn-outline"
              onClick={() => {
                navigator.clipboard.writeText(getSMSText());
                toast.success("SMS text copied!");
              }}
              disabled={!hasValidUrl}
            >
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              Copy SMS
            </button>
          </div>

          {/* SMS Text */}
          <div className="form-control mb-6">
            <label className="label">
              <span className="label-text font-semibold">SMS Text (Copy & Send)</span>
            </label>
            <textarea
              className="textarea textarea-bordered"
              value={getSMSText()}
              readOnly
              rows={3}
              onClick={(e) => e.target.select()}
            />
          </div>

          {/* QR Code */}
          {showQR && hasValidUrl && (
            <div className="flex flex-col items-center mb-6 p-6 bg-base-200 rounded-lg" ref={qrRef}>
              <p className="font-semibold mb-4">Scan to open form</p>
              <QRCodeSVG value={publicUrl} size={200} level="H" />
              <div className="flex gap-2 mt-4">
                <button
                  className="btn btn-sm btn-primary"
                  onClick={printQRCode}
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print QR
                </button>
              </div>
              <p className="text-sm text-base-content/60 mt-3">
                Print a page with just the QR code for display
              </p>
            </div>
          )}

          {/* Close Button */}
          <div className="modal-action">
            <button className="btn" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
        <div className="modal-backdrop" onClick={onClose}></div>
      </div>
    </>
  );
}
