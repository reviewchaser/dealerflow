/**
 * Tenant-aware New Appraisal Route
 * /app/[dealerSlug]/appraisals/new
 *
 * Wraps the existing new appraisal page with tenant context.
 */

import TenantPage from "@/components/TenantPage";
import NewAppraisalPage from "@/pages/appraisals/new";

export default function TenantNewAppraisal() {
  return (
    <TenantPage>
      <NewAppraisalPage />
    </TenantPage>
  );
}
