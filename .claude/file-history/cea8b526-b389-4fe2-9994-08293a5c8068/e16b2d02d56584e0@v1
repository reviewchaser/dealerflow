/**
 * Portal Component - Renders children into document.body
 * This escapes the DOM hierarchy to avoid CSS stacking context issues
 * (transform, filter, will-change on ancestors break fixed positioning)
 */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function Portal({ children }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  return createPortal(children, document.body);
}

export default Portal;
