/**
 * Tenant-aware Sales Prep Route
 * /app/[dealerSlug]/sales-prep
 *
 * Wraps the existing sales-prep page with tenant context.
 * The underlying page remains unchanged.
 */

import TenantPage from "@/components/TenantPage";
import SalesPrepPage from "@/pages/sales-prep";

export default function TenantSalesPrep() {
  return (
    <TenantPage>
      <SalesPrepPage />
    </TenantPage>
  );
}
