/**
 * Tenant-aware Onboarding Route
 * /app/[dealerSlug]/onboarding
 *
 * Wraps the existing onboarding page with tenant context.
 * The underlying page remains unchanged.
 */

import TenantPage from "@/components/TenantPage";
import OnboardingPage from "@/pages/onboarding";

export default function TenantOnboarding() {
  return (
    <TenantPage>
      <OnboardingPage />
    </TenantPage>
  );
}
