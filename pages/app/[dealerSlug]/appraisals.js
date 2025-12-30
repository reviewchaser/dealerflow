/**
 * Tenant-aware Appraisals Route
 * /app/[dealerSlug]/appraisals
 *
 * Wraps the existing appraisals page with tenant context.
 * The underlying page remains unchanged.
 */

import TenantPage from "@/components/TenantPage";
import AppraisalsPage from "@/pages/appraisals";

export default function TenantAppraisals() {
  return (
    <TenantPage>
      <AppraisalsPage />
    </TenantPage>
  );
}
