/**
 * Tenant-aware Reviews Route
 * /app/[dealerSlug]/reviews
 *
 * Wraps the existing reviews page with tenant context.
 * The underlying page remains unchanged.
 */

import TenantPage from "@/components/TenantPage";
import ReviewsPage from "@/pages/reviews";

export default function TenantReviews() {
  return (
    <TenantPage>
      <ReviewsPage />
    </TenantPage>
  );
}
