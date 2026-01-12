/**
 * Tenant-aware Sales Route
 * /app/[dealerSlug]/sales
 *
 * Wraps the existing sales page with tenant context.
 * The underlying page remains unchanged.
 */

import TenantPage from "@/components/TenantPage";
import SalesPage from "@/pages/sales";

export default function TenantSales() {
  return (
    <TenantPage>
      <SalesPage />
    </TenantPage>
  );
}
