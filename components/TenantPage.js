/**
 * TenantPage - Wrapper component for pages in /app/[dealerSlug]/ routes
 *
 * This component:
 * 1. Wraps children with DealerProvider for tenant context
 * 2. Shows loading state while dealer is being resolved
 * 3. Shows error state if dealer not found or user lacks access
 * 4. Renders children once dealer is resolved
 *
 * Usage in /pages/app/[dealerSlug]/dashboard.js:
 *   import TenantPage from "@/components/TenantPage";
 *   import DashboardContent from "@/pages/dashboard"; // or inline
 *
 *   export default function TenantDashboard() {
 *     return (
 *       <TenantPage>
 *         <DashboardContent />
 *       </TenantPage>
 *     );
 *   }
 */

import { useRouter } from "next/router";
import { DealerProvider, useDealer } from "@/contexts/DealerContext";
import Link from "next/link";

/**
 * Inner component that renders content based on dealer resolution state
 */
function TenantPageContent({ children }) {
  const { dealer, isLoading, error } = useDealer();
  const router = useRouter();

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading dealership...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{error}</h2>
          <p className="text-gray-600 mb-6">
            {error === "Dealership not found"
              ? "The dealership you're looking for doesn't exist or the URL is incorrect."
              : error === "You don't have access to this dealership"
              ? "You need to be a member of this dealership to access it."
              : "Please try again or contact support if the problem persists."}
          </p>
          <div className="space-x-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go to Dashboard
            </Link>
            <button
              onClick={() => router.back()}
              className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No dealer yet (shouldn't happen if not loading and no error, but just in case)
  if (!dealer) {
    return null;
  }

  // Render children with dealer context available
  return children;
}

/**
 * TenantPage wrapper component
 * Provides dealer context to children pages
 */
export default function TenantPage({ children }) {
  return (
    <DealerProvider>
      <TenantPageContent>{children}</TenantPageContent>
    </DealerProvider>
  );
}
