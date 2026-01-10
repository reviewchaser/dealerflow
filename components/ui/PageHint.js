/**
 * PageHint - First-time guidance tooltip for pages
 * Shows a short helper message under the page header, dismissible with localStorage persistence
 * Mobile-friendly: full-width callout banner, never overflows screen
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
    strokeWidth={2}
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

  // Show small "?" button when dismissed - inline with header
  if (dismissed) {
    return (
      <button
        onClick={handleReopen}
        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-400 hover:bg-blue-100 hover:text-blue-600 transition-colors"
        title="Show page help"
        aria-label="Show page help"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
    );
  }

  // Show hint message - mobile-friendly callout banner
  return (
    <div
      className="flex items-start gap-2.5 px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-lg text-sm text-slate-700 mt-2"
      style={{
        maxWidth: 'calc(100vw - 2rem)', // Never overflow viewport
      }}
    >
      <InfoIcon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0 leading-relaxed">{children}</div>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-blue-100 transition-colors -mr-1"
        title="Dismiss"
        aria-label="Dismiss hint"
      >
        <XIcon className="w-4 h-4" />
      </button>
    </div>
  );
}
