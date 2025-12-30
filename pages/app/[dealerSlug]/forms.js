/**
 * Tenant-aware Forms Route
 * /app/[dealerSlug]/forms
 *
 * Wraps the existing forms page with tenant context.
 * The underlying page remains unchanged.
 */

import TenantPage from "@/components/TenantPage";
import FormsPage from "@/pages/forms";

export default function TenantForms() {
  return (
    <TenantPage>
      <FormsPage />
    </TenantPage>
  );
}
