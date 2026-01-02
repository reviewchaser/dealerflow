/**
 * MobileModal Component - Full-screen modal optimized for mobile
 *
 * Features:
 * - Uses 100dvh for dynamic viewport height (iOS Safari URL bar)
 * - Sticky header and footer with safe area insets
 * - Scrollable content area
 * - Portal rendering for fixed positioning
 * - Scroll lock to prevent background scrolling
 *
 * Usage:
 *   <MobileModal isOpen={isOpen} onClose={handleClose} title="Add Vehicle">
 *     <form>...</form>
 *     <MobileModal.Footer>
 *       <button onClick={handleClose}>Cancel</button>
 *       <button type="submit">Save</button>
 *     </MobileModal.Footer>
 *   </MobileModal>
 */

import { useEffect, useRef, Children, isValidElement } from "react";
import { Portal } from "./Portal";

export function MobileModal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "max-w-4xl", // Tailwind max-width class for desktop
  className = "",
}) {
  const modalRef = useRef(null);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.overflow = "hidden";

      return () => {
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.left = "";
        document.body.style.right = "";
        document.body.style.overflow = "";
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

  // Separate footer from other children
  let footerContent = null;
  const contentChildren = Children.toArray(children).filter((child) => {
    if (isValidElement(child) && child.type === MobileModalFooter) {
      footerContent = child;
      return false;
    }
    return true;
  });

  return (
    <Portal>
      <div className="fixed inset-0 z-[9999]">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal Container - Centered on desktop, full screen on mobile */}
        <div className="fixed inset-0 flex items-start md:items-center justify-center p-0 md:p-4">
          {/* Modal */}
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-modal-title"
            className={`
              relative bg-white shadow-2xl flex flex-col
              w-full h-[100dvh] md:h-auto md:max-h-[90vh] md:rounded-xl
              ${maxWidth}
              ${className}
            `}
          >
            {/* Header - Sticky with safe area padding on mobile */}
            <div
              className="shrink-0 flex items-center justify-between px-4 md:px-6 py-4 border-b border-slate-200 bg-white md:rounded-t-xl"
              style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
            >
              <h2
                id="mobile-modal-title"
                className="text-lg md:text-xl font-bold text-slate-900"
              >
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="p-2 -mr-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 md:p-6 min-h-0">
              {contentChildren}
            </div>

            {/* Footer - Sticky with safe area padding on mobile */}
            {footerContent && (
              <div
                className="shrink-0 border-t border-slate-200 bg-white px-4 md:px-6 py-4 md:rounded-b-xl"
                style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
              >
                {footerContent.props.children}
              </div>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}

// Footer component for extracting footer content
function MobileModalFooter({ children }) {
  return <>{children}</>;
}

MobileModal.Footer = MobileModalFooter;

export default MobileModal;
