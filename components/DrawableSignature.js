import { useRef, useEffect, useState } from "react";
import SignaturePad from "signature_pad";

export default function DrawableSignature({
  value,
  onChange,
  required = false,
  label = "Signature",
  helpText = "Please sign in the box above"
}) {
  const canvasRef = useRef(null);
  const signaturePadRef = useRef(null);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    if (canvasRef.current && !signaturePadRef.current) {
      // Initialize SignaturePad
      signaturePadRef.current = new SignaturePad(canvasRef.current, {
        backgroundColor: "rgb(255, 255, 255)",
        penColor: "rgb(0, 0, 0)",
      });

      // Handle end stroke to save signature
      signaturePadRef.current.addEventListener("endStroke", () => {
        const data = signaturePadRef.current.toDataURL("image/png");
        onChange(data);
        setIsEmpty(signaturePadRef.current.isEmpty());
      });

      // Resize canvas to fit container
      resizeCanvas();
      window.addEventListener("resize", resizeCanvas);

      // Load existing value if provided
      if (value && value.startsWith("data:image")) {
        signaturePadRef.current.fromDataURL(value);
        setIsEmpty(false);
      }
    }

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  // Load value when it changes externally
  useEffect(() => {
    if (signaturePadRef.current && value && value.startsWith("data:image")) {
      signaturePadRef.current.fromDataURL(value);
      setIsEmpty(false);
    }
  }, [value]);

  const resizeCanvas = () => {
    if (canvasRef.current && signaturePadRef.current) {
      const canvas = canvasRef.current;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const container = canvas.parentElement;

      canvas.width = container.offsetWidth * ratio;
      canvas.height = 150 * ratio;
      canvas.style.width = `${container.offsetWidth}px`;
      canvas.style.height = "150px";

      canvas.getContext("2d").scale(ratio, ratio);

      // Restore signature if it was there
      if (value && value.startsWith("data:image")) {
        signaturePadRef.current.fromDataURL(value);
      }
    }
  };

  const handleClear = () => {
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
      onChange("");
      setIsEmpty(true);
    }
  };

  return (
    <div className="form-control w-full">
      {label && (
        <label className="label">
          <span className="label-text font-semibold">
            {label}
            {required && <span className="text-error ml-1">*</span>}
          </span>
        </label>
      )}
      <div className="border-2 border-base-300 rounded-lg bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full touch-none cursor-crosshair"
          style={{ height: "150px" }}
        />
      </div>
      <div className="flex justify-between items-center mt-2">
        <span className="text-sm text-base-content/60">{helpText}</span>
        <button
          type="button"
          onClick={handleClear}
          className="btn btn-sm btn-ghost text-error"
        >
          Clear
        </button>
      </div>
      {required && isEmpty && (
        <input
          type="text"
          required
          value=""
          onChange={() => {}}
          className="opacity-0 absolute pointer-events-none"
          tabIndex={-1}
        />
      )}
    </div>
  );
}

// Display component for showing saved signatures
export function SignatureDisplay({ value, label = "Signature" }) {
  if (!value || !value.startsWith("data:image")) {
    return (
      <div className="p-4 bg-base-200 rounded-lg text-center text-base-content/60">
        No signature
      </div>
    );
  }

  return (
    <div className="form-control w-full">
      {label && (
        <label className="label">
          <span className="label-text font-semibold">{label}</span>
        </label>
      )}
      <div className="border border-base-300 rounded-lg bg-white p-2">
        <img
          src={value}
          alt="Signature"
          className="max-h-32 mx-auto"
        />
      </div>
    </div>
  );
}
