/**
 * Tenant-aware Settings Route
 * /app/[dealerSlug]/settings
 *
 * Wraps the existing settings page with tenant context.
 * The underlying page remains unchanged.
 */

import TenantPage from "@/components/TenantPage";
import SettingsPage from "@/pages/settings";

export default function TenantSettings() {
  return (
    <TenantPage>
      <SettingsPage />
    </TenantPage>
  );
}
