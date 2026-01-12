/**
 * BottomSheet Component - Mobile-friendly modal that slides up from bottom
 *
 * IMPORTANT: Uses Portal to render outside DOM hierarchy, ensuring fixed
 * positioning works correctly regardless of parent CSS (transform, filter, etc.)
 *
 * Usage:
 *   <BottomSheet isOpen={isOpen} onClose={() => setIsOpen(false)} title="Filters">
 *     <FilterContent />
 *   </BottomSheet>
 */

import { useEffect, useRef } from "react";
import { Portal } from "./Portal";

export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxHeight = "85vh",
  className = "",
  hideAbove = "md", // "md" = hide above 768px, "lg" = hide above 1024px
}) {
  const sheetRef = useRef(null);

  // Lock body scroll and prevent horizontal pan when open
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      const html = document.documentElement;

      // Lock both html and body to prevent any horizontal movement
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";
      document.body.style.overflowX = "hidden";
      document.body.style.touchAction = "none";

      html.style.overflow = "hidden";
      html.style.overflowX = "hidden";

      document.body.classList.add("modal-open");

      return () => {
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.left = "";
        document.body.style.right = "";
        document.body.style.width = "";
        document.body.style.overflow = "";
        document.body.style.overflowX = "";
        document.body.style.touchAction = "";

        html.style.overflow = "";
        html.style.overflowX = "";

        document.body.classList.remove("modal-open");
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Determine which breakpoint to hide at
  const hideClass = hideAbove === "lg" ? "lg:hidden" : "md:hidden";

  return (
    <Portal>
      <div
        className={`fixed inset-0 z-[9999] ${hideClass}`}
        style={{ touchAction: "none", overscrollBehavior: "contain" }}
      >
        {/* Backdrop - prevent touch events from reaching background */}
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
          onTouchMove={(e) => e.preventDefault()}
          aria-hidden="true"
          style={{ touchAction: "none" }}
        />

        {/* Sheet - Fixed to viewport bottom */}
        <div
          ref={sheetRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="bottom-sheet-title"
          className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl flex flex-col animate-slide-up ${className}`}
          style={{ maxHeight }}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 bg-slate-300 rounded-full" />
          </div>

          {/* Header - Sticky */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white shrink-0">
            <h2 id="bottom-sheet-title" className="text-lg font-bold text-slate-900">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 -mr-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content - Scrollable vertically only */}
          <div
            className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-4 min-h-0"
            style={{ touchAction: "pan-y", WebkitOverflowScrolling: "touch" }}
          >
            {children}
          </div>

          {/* Footer - Sticky at bottom */}
          {footer && (
            <div
              className="shrink-0 border-t border-slate-200 bg-white p-4"
              style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
            >
              {footer}
            </div>
          )}
        </div>

        <style jsx global>{`
          @keyframes slide-up {
            from {
              transform: translateY(100%);
            }
            to {
              transform: translateY(0);
            }
          }
          .animate-slide-up {
            animation: slide-up 0.3s ease-out forwards;
          }
        `}</style>
      </div>
    </Portal>
  );
}

export default BottomSheet;
