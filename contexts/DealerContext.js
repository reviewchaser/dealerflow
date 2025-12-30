/**
 * DealerContext - Provides tenant/dealer state to pages in /app/[dealerSlug]/ routes
 *
 * This context allows pages to access dealer information resolved from the URL slug.
 * Pages wrapped with DealerProvider will have access to:
 * - dealer: The full dealer object
 * - dealerId: The MongoDB ObjectId as string
 * - dealerSlug: The URL slug
 * - isLoading: Whether dealer is still being resolved
 * - error: Any error that occurred during resolution
 */

import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/router";

const DealerContext = createContext(null);

/**
 * Hook to access dealer context
 * @returns {{ dealer: object|null, dealerId: string|null, dealerSlug: string|null, isLoading: boolean, error: string|null }}
 */
export function useDealer() {
  const context = useContext(DealerContext);
  if (!context) {
    // Return a default state when not in tenant context
    // This allows pages to work both in legacy mode and tenant mode
    return {
      dealer: null,
      dealerId: null,
      dealerSlug: null,
      isLoading: false,
      error: null,
      isTenantRoute: false,
    };
  }
  return context;
}

/**
 * Provider component that resolves dealer from URL slug
 * Wraps pages in /app/[dealerSlug]/ routes
 */
export function DealerProvider({ children, initialDealer = null }) {
  const router = useRouter();
  const { dealerSlug } = router.query;

  const [dealer, setDealer] = useState(initialDealer);
  const [isLoading, setIsLoading] = useState(!initialDealer);
  const [error, setError] = useState(null);

  // Resolve dealer from slug if not provided initially
  useEffect(() => {
    // Skip if already have dealer or no slug
    if (dealer || !dealerSlug) {
      return;
    }

    async function resolveDealer() {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch dealer by slug
        const res = await fetch(`/api/dealers/by-slug/${dealerSlug}`);

        if (!res.ok) {
          if (res.status === 404) {
            setError("Dealership not found");
          } else if (res.status === 403) {
            setError("You don't have access to this dealership");
          } else {
            setError("Failed to load dealership");
          }
          return;
        }

        const dealerData = await res.json();
        setDealer(dealerData);
      } catch (err) {
        console.error("Error resolving dealer:", err);
        setError("Failed to load dealership");
      } finally {
        setIsLoading(false);
      }
    }

    resolveDealer();
  }, [dealerSlug, dealer]);

  const value = {
    dealer,
    dealerId: dealer?._id || dealer?.id || null,
    dealerSlug: dealerSlug || dealer?.slug || null,
    isLoading,
    error,
    isTenantRoute: true,
  };

  return (
    <DealerContext.Provider value={value}>
      {children}
    </DealerContext.Provider>
  );
}

export default DealerContext;
