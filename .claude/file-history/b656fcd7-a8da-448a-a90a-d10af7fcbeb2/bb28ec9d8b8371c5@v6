/**
 * Tenant-aware Dashboard Route
 * /app/[dealerSlug]/dashboard
 *
 * Wraps the existing dashboard page with tenant context.
 * The underlying page remains unchanged.
 */

import TenantPage from "@/components/TenantPage";
import DashboardPage from "@/pages/dashboard";

export default function TenantDashboard() {
  return (
    <TenantPage>
      <DashboardPage />
    </TenantPage>
  );
}
