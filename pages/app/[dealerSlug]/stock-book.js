/**
 * Tenant-aware Stock Book Route
 * /app/[dealerSlug]/stock-book
 *
 * Wraps the existing stock book page with tenant context.
 * The underlying page remains unchanged.
 */

import TenantPage from "@/components/TenantPage";
import StockBookPage from "@/pages/stock-book";

export default function TenantStockBook() {
  return (
    <TenantPage>
      <StockBookPage />
    </TenantPage>
  );
}
