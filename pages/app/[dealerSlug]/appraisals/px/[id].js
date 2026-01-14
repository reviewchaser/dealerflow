/**
 * Tenant-aware PX Appraisal Detail Route
 * /app/[dealerSlug]/appraisals/px/[id]
 *
 * Wraps the existing PX appraisal detail page with tenant context.
 */

import TenantPage from "@/components/TenantPage";
import PxAppraisalDetailPage from "@/pages/appraisals/px/[id]";

export default function TenantPxAppraisalDetail() {
  return (
    <TenantPage>
      <PxAppraisalDetailPage />
    </TenantPage>
  );
}
