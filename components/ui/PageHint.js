/**
 * PageHint - First-time guidance tooltip for pages
 * Shows a short helper message under the page header, dismissible with localStorage persistence
 */

import { useState, useEffect } from "react";

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
    strokeWidth={1.5}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export function PageHint({ id, children }) {
  const [dismissed, setDismissed] = useState(true); // Start hidden to prevent flash
  const [loaded, setLoaded] = useState(false);

  const storageKey = `pageHint_${id}_dismissed`;

  useEffect(() => {
    const wasDismissed = localStorage.getItem(storageKey) === "true";
    setDismissed(wasDismissed);
    setLoaded(true);
  }, [storageKey]);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(storageKey, "true");
  };

  const handleReopen = () => {
    setDismissed(false);
    localStorage.removeItem(storageKey);
  };

  // Don't render until we've loaded the localStorage state
  if (!loaded) return null;

  // Show "?" button when dismissed
  if (dismissed) {
    return (
      <button
        onClick={handleReopen}
        className="inline-flex items-center gap-1 text-xs text-base-content/50 hover:text-primary transition-colors"
        title="Show page help"
      >
        <InfoIcon className="w-4 h-4" />
      </button>
    );
  }

  // Show hint message
  return (
    <div className="flex items-start gap-2 px-3 py-2 bg-info/10 border border-info/20 rounded-lg text-sm text-base-content/80 mb-4">
      <InfoIcon className="w-5 h-5 text-info flex-shrink-0 mt-0.5" />
      <div className="flex-1">{children}</div>
      <button
        onClick={handleDismiss}
        className="text-base-content/40 hover:text-base-content/70 transition-colors flex-shrink-0"
        title="Dismiss"
      >
        <XIcon className="w-4 h-4" />
      </button>
    </div>
  );
}
