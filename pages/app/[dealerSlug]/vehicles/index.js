/**
 * Tenant-aware Vehicles Index Route
 * /app/[dealerSlug]/vehicles
 *
 * Wraps the existing vehicles index page with tenant context.
 * The underlying page remains unchanged.
 */

import TenantPage from "@/components/TenantPage";
import VehiclesPage from "@/pages/vehicles/index";

export default function TenantVehicles() {
  return (
    <TenantPage>
      <VehiclesPage />
    </TenantPage>
  );
}
