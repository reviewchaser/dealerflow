/**
 * Tenant-aware Vehicle Detail Route
 * /app/[dealerSlug]/vehicles/[id]
 *
 * Wraps the existing vehicle detail page with tenant context.
 * The underlying page remains unchanged.
 */

import TenantPage from "@/components/TenantPage";
import VehicleDetailPage from "@/pages/vehicles/[id]";

export default function TenantVehicleDetail() {
  return (
    <TenantPage>
      <VehicleDetailPage />
    </TenantPage>
  );
}
