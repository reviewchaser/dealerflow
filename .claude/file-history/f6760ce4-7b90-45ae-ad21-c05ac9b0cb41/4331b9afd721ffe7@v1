/**
 * Tenant-aware Overtime Route
 * /app/[dealerSlug]/overtime
 *
 * Wraps the existing overtime page with tenant context.
 * The underlying page remains unchanged.
 */

import TenantPage from "@/components/TenantPage";
import OvertimePage from "@/pages/overtime";

export default function TenantOvertime() {
  return (
    <TenantPage>
      <OvertimePage />
    </TenantPage>
  );
}
