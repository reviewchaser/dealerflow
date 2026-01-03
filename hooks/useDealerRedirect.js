/**
 * useDealerRedirect Hook
 *
 * Handles automatic redirection from legacy routes (e.g., /sales-prep)
 * to tenant-aware routes (e.g., /app/{slug}/sales-prep).
 *
 * Usage:
 * const { isRedirecting } = useDealerRedirect();
 * if (isRedirecting) return <LoadingSpinner />;
 *
 * Behavior:
 * - If user is on a tenant route (/app/...), does nothing
 * - If user has 0 dealers, redirects to /onboarding/create-dealer
 * - If user has 1 dealer, redirects to /app/{slug}/{currentPath}
 * - If user has multiple dealers, redirects to /choose-dealer
 */

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";

export default function useDealerRedirect() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isRedirecting, setIsRedirecting] = useState(true);
  const [error, setError] = useState(null);
  const hasChecked = useRef(false);

  useEffect(() => {
    // Don't run multiple times
    if (hasChecked.current) return;

    // Skip if already on a tenant route
    if (router.asPath.startsWith("/app/")) {
      setIsRedirecting(false);
      return;
    }

    // Wait for session to load
    if (status === "loading") return;

    // If not authenticated, let middleware handle redirect to login
    if (status === "unauthenticated") {
      setIsRedirecting(false);
      return;
    }

    // Authenticated - check for dealer redirect
    async function checkForTenantRedirect() {
      hasChecked.current = true;

      try {
        const res = await fetch("/api/dealers/memberships");

        if (!res.ok) {
          // If we can't fetch memberships, just proceed without redirect
          console.error("[useDealerRedirect] Failed to fetch memberships:", res.status);
          setIsRedirecting(false);
          return;
        }

        const dealers = await res.json();

        if (dealers.length === 0) {
          // No dealers - redirect to create dealer
          router.replace("/onboarding/create-dealer");
          return;
        }

        if (dealers.length === 1) {
          // Single dealer - redirect to tenant route
          // Get the current path (e.g., /sales-prep -> sales-prep)
          const currentPath = router.pathname.replace(/^\//, "");
          router.replace(`/app/${dealers[0].slug}/${currentPath}`);
          return;
        }

        if (dealers.length > 1) {
          // Multiple dealers - show picker with return URL
          const returnUrl = encodeURIComponent(router.asPath);
          router.replace(`/choose-dealer?returnUrl=${returnUrl}`);
          return;
        }
      } catch (err) {
        console.error("[useDealerRedirect] Error:", err);
        setError(err.message);
        setIsRedirecting(false);
      }
    }

    checkForTenantRedirect();
  }, [router, session, status]);

  return { isRedirecting, error };
}
