/**
 * Tenant-aware Contacts Route
 * /app/[dealerSlug]/contacts
 *
 * Wraps the existing contacts page with tenant context.
 * The underlying page remains unchanged.
 */

import TenantPage from "@/components/TenantPage";
import ContactsPage from "@/pages/contacts";

export default function TenantContacts() {
  return (
    <TenantPage>
      <ContactsPage />
    </TenantPage>
  );
}
