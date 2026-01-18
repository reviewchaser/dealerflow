/**
 * Tenant-aware Aftersales Route
 * /app/[dealerSlug]/aftersales
 *
 * Wraps the existing aftersales page with tenant context.
 * The underlying page remains unchanged.
 */

import TenantPage from "@/components/TenantPage";
import AftersalesPage from "@/pages/aftersales";

export default function TenantAftersales() {
  return (
    <TenantPage>
      <AftersalesPage />
    </TenantPage>
  );
}
