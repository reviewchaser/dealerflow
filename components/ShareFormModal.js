import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import toast from "react-hot-toast";

export default function ShareFormModal({ form, publicUrl, onClose }) {
  const [showQR, setShowQR] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(publicUrl);
    toast.success("Link copied to clipboard!");
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`${form.name} - DealerFlow Form`);
    const body = encodeURIComponent(`Please fill out this form:\n\n${publicUrl}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(`Please fill out this form: ${publicUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const getSMSText = () => {
    return `Please fill out this form: ${publicUrl}`;
  };

  return (
    <>
      {/* Modal backdrop */}
      <div className="modal modal-open">
        <div className="modal-box max-w-2xl">
          <h3 className="font-bold text-lg mb-4">Share: {form.name}</h3>

          {/* Public URL */}
          <div className="form-control mb-6">
            <label className="label">
              <span className="label-text font-semibold">Public URL</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                className="input input-bordered flex-1"
                value={publicUrl}
                readOnly
                onClick={(e) => e.target.select()}
              />
              <button className="btn btn-primary" onClick={copyToClipboard}>
                Copy
              </button>
            </div>
          </div>

          {/* Share Options */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              className="btn btn-outline"
              onClick={shareViaEmail}
            >
              📧 Email
            </button>
            <button
              className="btn btn-outline"
              onClick={shareViaWhatsApp}
            >
              💬 WhatsApp
            </button>
            <button
              className="btn btn-outline"
              onClick={() => setShowQR(!showQR)}
            >
              📱 QR Code
            </button>
            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text">SMS</span>
                <input type="checkbox" className="toggle" disabled />
              </label>
              <p className="text-xs text-base-content/60 mt-1">
                Copy the link and send via SMS
              </p>
            </div>
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
          {showQR && (
            <div className="flex flex-col items-center mb-6 p-6 bg-base-200 rounded-lg">
              <p className="font-semibold mb-4">Scan to open form</p>
              <QRCodeSVG value={publicUrl} size={200} level="H" />
              <p className="text-sm text-base-content/60 mt-4">
                Right-click to save or print
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
