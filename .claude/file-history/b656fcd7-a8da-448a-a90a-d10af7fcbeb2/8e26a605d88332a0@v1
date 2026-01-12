/**
 * Tenant-aware New Vehicle Route
 * /app/[dealerSlug]/vehicles/new
 *
 * Wraps the existing new vehicle page with tenant context.
 * The underlying page remains unchanged.
 */

import TenantPage from "@/components/TenantPage";
import NewVehiclePage from "@/pages/vehicles/new";

export default function TenantNewVehicle() {
  return (
    <TenantPage>
      <NewVehiclePage />
    </TenantPage>
  );
}
