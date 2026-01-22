/**
 * PageHint - First-time guidance tooltip for pages
 * Shows a short helper message as a dropdown tooltip, dismissible with localStorage persistence
 * Mobile-friendly: dropdown tooltip that doesn't overflow or disrupt header layout
 */

import { useState, useEffect, useRef } from "react";

// Inline SVG icons to avoid external dependencies
const InfoIcon = ({ className }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
    />
  </svg>
);

const XIcon = ({ className }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export function PageHint({ id, children }) {
  const [dismissed, setDismissed] = useState(true); // Start hidden to prevent flash
  const [loaded, setLoaded] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const storageKey = `pageHint_${id}_dismissed`;

  useEffect(() => {
    const wasDismissed = localStorage.getItem(storageKey) === "true";
    setDismissed(wasDismissed);
    setLoaded(true);
    // Auto-open if not dismissed
    if (!wasDismissed) {
      setIsOpen(true);
    }
  }, [storageKey]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleDismiss = () => {
    setDismissed(true);
    setIsOpen(false);
    localStorage.setItem(storageKey, "true");
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  // Don't render anything if dismissed or not yet loaded
  if (!loaded || dismissed) return null;

  // Don't render anything if dropdown is closed
  if (!isOpen) return null;

  return (
    <div className="relative inline-flex" ref={containerRef}>
      {/* Close button */}
      <button
        onClick={handleClose}
        className="inline-flex items-center justify-center w-5 h-5 rounded-full transition-colors bg-blue-100 text-blue-600"
        title="Close help"
        aria-label="Close help"
      >
        <XIcon className="w-3 h-3" />
      </button>

      {/* Dropdown tooltip */}
      <div
        className="absolute top-full left-0 mt-2 z-[100] w-72 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-xl shadow-lg"
      >
        <div className="flex items-start gap-2.5 p-3">
          <InfoIcon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0 text-sm text-slate-600 leading-relaxed">{children}</div>
        </div>
        <div className="border-t border-slate-100 px-3 py-2 flex justify-end">
          <button
            onClick={handleDismiss}
            className="text-xs text-slate-500 hover:text-slate-700 font-medium"
          >
            Got it, don't show again
          </button>
        </div>
      </div>
    </div>
  );
}
