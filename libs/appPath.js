/**
 * appPath - Link generation helper for multi-tenant routes
 *
 * Generates URLs for navigation within the app, supporting both:
 * - Tenant-aware routes: /app/[dealerSlug]/dashboard
 * - Legacy routes: /dashboard (when no slug provided)
 *
 * Usage:
 *   import { appPath } from "@/libs/appPath";
 *   import { useDealer } from "@/contexts/DealerContext";
 *
 *   const { dealerSlug } = useDealer();
 *   const dashboardUrl = appPath(dealerSlug, "/dashboard");
 *   // Returns: "/app/my-dealer/dashboard" or "/dashboard" if no slug
 */

/**
 * Generate an app path, optionally scoped to a dealer
 *
 * @param {string|null} dealerSlug - The dealer's URL slug, or null for legacy routes
 * @param {string} path - The path within the app (e.g., "/dashboard", "/sales-prep")
 * @returns {string} The full path
 *
 * @example
 * appPath("my-dealer", "/dashboard") // "/app/my-dealer/dashboard"
 * appPath(null, "/dashboard") // "/dashboard"
 * appPath("my-dealer", "/vehicles/123") // "/app/my-dealer/vehicles/123"
 */
export function appPath(dealerSlug, path) {
  // Ensure path starts with /
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  // If no dealer slug, return legacy path
  if (!dealerSlug) {
    return normalizedPath;
  }

  // Return tenant-aware path
  return `/app/${dealerSlug}${normalizedPath}`;
}

/**
 * Hook-friendly version that returns a function bound to the current dealer
 * Use this in components to avoid passing dealerSlug everywhere
 *
 * @param {string|null} dealerSlug - The dealer's URL slug
 * @returns {function} A function that takes a path and returns the full URL
 *
 * @example
 * const { dealerSlug } = useDealer();
 * const getPath = useAppPath(dealerSlug);
 * const dashboardUrl = getPath("/dashboard");
 */
export function useAppPath(dealerSlug) {
  return (path) => appPath(dealerSlug, path);
}

/**
 * Common app routes as constants
 * Helps with autocomplete and prevents typos
 */
export const APP_ROUTES = {
  DASHBOARD: "/dashboard",
  SALES_PREP: "/sales-prep",
  WARRANTY: "/warranty",
  APPRAISALS: "/appraisals",
  FORMS: "/forms",
  REVIEWS: "/reviews",
  CALENDAR: "/calendar",
  SETTINGS: "/settings",
  VEHICLES: "/vehicles",
  CONTACTS: "/contacts",
  ONBOARDING: "/onboarding",
};

export default appPath;
