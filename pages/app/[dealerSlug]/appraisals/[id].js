/**
 * Tenant-aware Appraisal Detail Route
 * /app/[dealerSlug]/appraisals/[id]
 *
 * Wraps the existing appraisal detail page with tenant context.
 */

import TenantPage from "@/components/TenantPage";
import AppraisalDetailPage from "@/pages/appraisals/[id]";

export default function TenantAppraisalDetail() {
  return (
    <TenantPage>
      <AppraisalDetailPage />
    </TenantPage>
  );
}
