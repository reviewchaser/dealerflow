import { useEffect, useState, useCallback } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "react-hot-toast";
import useDealerRedirect from "@/hooks/useDealerRedirect";

// Contact type configuration
const TYPE_TABS = [
  { key: "all", label: "All" },
  { key: "CUSTOMER", label: "Customers" },
  { key: "SUPPLIER", label: "Suppliers" },
  { key: "FINANCE", label: "Finance" },
];

// Format date helper
const formatDate = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export default function Contacts() {
  const router = useRouter();
  const { isRedirecting } = useDealerRedirect();
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeType, setActiveType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [formData, setFormData] = useState({
    contactType: "individual",
    firstName: "",
    lastName: "",
    companyName: "",
    email: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    town: "",
    postcode: "",
    country: "United Kingdom",
    vatNumber: "",
    notes: "",
    typeTags: ["CUSTOMER"],
  });
  const [isSaving, setIsSaving] = useState(false);

  // Load contacts
  const fetchContacts = useCallback(async () => {
    setIsLoading(true);
    try {
      let url = "/api/contacts?";
      if (activeType !== "all") {
        url += `typeTag=${activeType}&`;
      }
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch contacts");
      const data = await response.json();
      setContacts(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load contacts");
    } finally {
      setIsLoading(false);
    }
  }, [activeType]);

  useEffect(() => {
    if (!isRedirecting) {
      fetchContacts();
    }
  }, [isRedirecting, fetchContacts]);

  // Filter contacts by search
  const filteredContacts = contacts.filter((contact) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      contact.displayName?.toLowerCase().includes(query) ||
      contact.companyName?.toLowerCase().includes(query) ||
      contact.email?.toLowerCase().includes(query) ||
      contact.phone?.includes(query)
    );
  });

  // Count by type
  const typeCounts = contacts.reduce((acc, contact) => {
    (contact.typeTags || []).forEach(tag => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
  }, {});

  // Open modal for new contact
  const handleNewContact = () => {
    setEditingContact(null);
    setFormData({
      contactType: "individual",
      firstName: "",
      lastName: "",
      companyName: "",
      email: "",
      phone: "",
      addressLine1: "",
      addressLine2: "",
      town: "",
      postcode: "",
      country: "United Kingdom",
      vatNumber: "",
      notes: "",
      typeTags: ["CUSTOMER"],
    });
    setShowModal(true);
  };

  // Open modal for editing
  const handleEditContact = (contact) => {
    setEditingContact(contact);

    // Determine contact type and parse name
    const isCompany = contact.companyName && contact.displayName === contact.companyName;
    let firstName = "";
    let lastName = "";

    if (!isCompany && contact.displayName) {
      // Try to split displayName into first/last
      const parts = contact.displayName.split(" ");
      if (parts.length >= 2) {
        firstName = parts[0];
        lastName = parts.slice(1).join(" ");
      } else {
        firstName = contact.displayName;
      }
    }

    // Normalize typeTags to uppercase
    const normalizedTypeTags = (contact.typeTags || ["CUSTOMER"]).map(t => t.toUpperCase());

    setFormData({
      contactType: isCompany ? "company" : "individual",
      firstName,
      lastName,
      companyName: contact.companyName || "",
      email: contact.email || "",
      phone: contact.phone || "",
      addressLine1: contact.address?.line1 || "",
      addressLine2: contact.address?.line2 || "",
      town: contact.address?.town || "",
      postcode: contact.address?.postcode || "",
      country: contact.address?.country || "United Kingdom",
      vatNumber: contact.vatNumber || "",
      notes: contact.notes || "",
      typeTags: normalizedTypeTags,
    });
    setShowModal(true);
  };

  // Save contact
  const handleSaveContact = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Compute displayName from firstName/lastName or companyName
      let displayName;
      if (formData.contactType === "company") {
        displayName = formData.companyName?.trim();
      } else {
        displayName = `${formData.firstName || ""} ${formData.lastName || ""}`.trim();
      }

      if (!displayName) {
        toast.error("Name is required");
        setIsSaving(false);
        return;
      }

      // Convert typeTags to uppercase for API
      const normalizedTypeTags = formData.typeTags.map(tag => tag.toUpperCase());

      const payload = {
        displayName,
        companyName: formData.companyName,
        email: formData.email,
        phone: formData.phone,
        address: {
          line1: formData.addressLine1,
          line2: formData.addressLine2,
          town: formData.town,
          postcode: formData.postcode,
          country: formData.country,
        },
        vatNumber: formData.vatNumber,
        notes: formData.notes,
        typeTags: normalizedTypeTags,
      };

      const url = editingContact
        ? `/api/contacts/${editingContact.id}`
        : "/api/contacts";
      const method = editingContact ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save contact");
      }

      toast.success(editingContact ? "Contact updated" : "Contact created");
      setShowModal(false);
      fetchContacts();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete contact
  const handleDeleteContact = async (contactId) => {
    if (!confirm("Are you sure you want to delete this contact?")) return;

    try {
      const res = await fetch(`/api/contacts/${contactId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete contact");
      }

      toast.success("Contact deleted");
      fetchContacts();
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Toggle type tag
  const toggleTypeTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      typeTags: prev.typeTags.includes(tag)
        ? prev.typeTags.filter(t => t !== tag)
        : [...prev.typeTags, tag],
    }));
  };

  if (isRedirecting) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Head>
        <title>Contacts | DealerHQ</title>
      </Head>

      <div className="min-h-screen bg-slate-50 pb-20">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
          <div className="px-4 py-4 md:px-6 md:py-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-slate-900">Contacts</h1>
                <p className="text-sm text-slate-500 mt-0.5">
                  {contacts.length} contact{contacts.length !== 1 ? "s" : ""} total
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 md:w-72">
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search name, email, phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input input-bordered w-full pl-10 h-10"
                  />
                </div>

                {/* Add Contact Button */}
                <button
                  onClick={handleNewContact}
                  className="btn bg-[#0066CC] hover:bg-[#0052a3] text-white border-none"
                >
                  <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span className="hidden sm:inline">Add Contact</span>
                </button>
              </div>
            </div>

            {/* Type Tabs */}
            <div className="mt-4 -mb-px flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
              {TYPE_TABS.map((tab) => {
                const count = tab.key === "all" ? contacts.length : typeCounts[tab.key] || 0;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveType(tab.key)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                      activeType === tab.key
                        ? "bg-[#0066CC] text-white shadow-md shadow-[#0066CC]/25"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {tab.label}
                    {count > 0 && (
                      <span
                        className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold ${
                          activeType === tab.key
                            ? "bg-white/20 text-white"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <span className="loading loading-spinner loading-lg text-[#0066CC]"></span>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 md:p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">No contacts found</h3>
              <p className="text-slate-500 mb-4">
                {searchQuery
                  ? "Try adjusting your search terms"
                  : "Add your first contact to get started"}
              </p>
              {!searchQuery && (
                <button
                  onClick={handleNewContact}
                  className="btn bg-[#0066CC] hover:bg-[#0052a3] text-white border-none"
                >
                  Add Contact
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="bg-white rounded-xl border border-slate-200 hover:border-[#0066CC]/30 hover:shadow-md transition-all overflow-hidden"
                >
                  <div className="p-4 md:p-5">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      {/* Avatar & Name */}
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-12 h-12 md:w-14 md:h-14 bg-[#0066CC]/10 rounded-full flex items-center justify-center shrink-0">
                          <span className="text-lg md:text-xl font-bold text-[#0066CC]">
                            {(contact.displayName || "?")[0].toUpperCase()}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-slate-900 truncate">
                              {contact.displayName}
                            </p>
                            {contact.typeTags?.map(tag => {
                              const tagUpper = tag.toUpperCase();
                              return (
                                <span
                                  key={tag}
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                    tagUpper === "CUSTOMER" ? "bg-emerald-100 text-emerald-700" :
                                    tagUpper === "SUPPLIER" ? "bg-blue-100 text-blue-700" :
                                    tagUpper === "FINANCE" ? "bg-purple-100 text-purple-700" :
                                    "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {tagUpper === "CUSTOMER" ? "Customer" :
                                   tagUpper === "SUPPLIER" ? "Supplier" :
                                   tagUpper === "FINANCE" ? "Finance" :
                                   tag}
                                </span>
                              );
                            })}
                          </div>
                          {contact.companyName && (
                            <p className="text-sm text-slate-500 truncate mt-0.5">
                              {contact.companyName}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                            {contact.email && (
                              <span className="truncate">{contact.email}</span>
                            )}
                            {contact.phone && (
                              <span>{contact.phone}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 border-t border-slate-100 pt-3 md:border-0 md:pt-0">
                        <button
                          onClick={() => handleEditContact(contact)}
                          className="btn btn-sm btn-ghost text-slate-600"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteContact(contact.id)}
                          className="btn btn-sm btn-ghost text-red-500"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Contact Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                {editingContact ? "Edit Contact" : "New Contact"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="btn btn-sm btn-ghost btn-circle"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveContact} className="flex-1 flex flex-col overflow-hidden">
              {/* Scrollable form content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Contact Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Type</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, contactType: "individual" }))}
                    className={`flex-1 btn btn-sm ${formData.contactType === "individual" ? "btn-primary" : "btn-ghost"}`}
                  >
                    Individual
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, contactType: "company" }))}
                    className={`flex-1 btn btn-sm ${formData.contactType === "company" ? "btn-primary" : "btn-ghost"}`}
                  >
                    Business
                  </button>
                </div>
              </div>

              {/* Type Tags */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Categories</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: "CUSTOMER", label: "Customer" },
                    { key: "SUPPLIER", label: "Supplier" },
                    { key: "FINANCE", label: "Finance Company" },
                  ].map(tag => (
                    <button
                      key={tag.key}
                      type="button"
                      onClick={() => toggleTypeTag(tag.key)}
                      className={`btn btn-sm ${formData.typeTags.includes(tag.key) ? "btn-primary" : "btn-ghost"}`}
                    >
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name Fields */}
              {formData.contactType === "individual" ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => setFormData(p => ({ ...p, firstName: e.target.value }))}
                        className="input input-bordered w-full"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                      <input
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => setFormData(p => ({ ...p, lastName: e.target.value }))}
                        className="input input-bordered w-full"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Company (optional)</label>
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => setFormData(p => ({ ...p, companyName: e.target.value }))}
                      className="input input-bordered w-full"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => setFormData(p => ({ ...p, companyName: e.target.value }))}
                      className="input input-bordered w-full"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">First Name (optional)</label>
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => setFormData(p => ({ ...p, firstName: e.target.value }))}
                        className="input input-bordered w-full"
                        placeholder="Contact person"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Last Name (optional)</label>
                      <input
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => setFormData(p => ({ ...p, lastName: e.target.value }))}
                        className="input input-bordered w-full"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Contact Details */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                    className="input input-bordered w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                    className="input input-bordered w-full"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">Address</label>
                <input
                  type="text"
                  placeholder="Address Line 1"
                  value={formData.addressLine1}
                  onChange={(e) => setFormData(p => ({ ...p, addressLine1: e.target.value }))}
                  className="input input-bordered w-full"
                />
                <input
                  type="text"
                  placeholder="Address Line 2"
                  value={formData.addressLine2}
                  onChange={(e) => setFormData(p => ({ ...p, addressLine2: e.target.value }))}
                  className="input input-bordered w-full"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Town/City"
                    value={formData.town}
                    onChange={(e) => setFormData(p => ({ ...p, town: e.target.value }))}
                    className="input input-bordered w-full"
                  />
                  <input
                    type="text"
                    placeholder="Postcode"
                    value={formData.postcode}
                    onChange={(e) => setFormData(p => ({ ...p, postcode: e.target.value }))}
                    className="input input-bordered w-full"
                  />
                </div>
              </div>

              {/* VAT Number */}
              {formData.contactType === "company" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">VAT Number</label>
                  <input
                    type="text"
                    value={formData.vatNumber}
                    onChange={(e) => setFormData(p => ({ ...p, vatNumber: e.target.value }))}
                    className="input input-bordered w-full"
                    placeholder="GB123456789"
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
                  className="textarea textarea-bordered w-full"
                  rows={3}
                />
              </div>

              </div>

              {/* Sticky Actions */}
              <div className="shrink-0 flex gap-3 p-6 pt-4 border-t border-slate-100 bg-white">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-ghost flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn bg-[#0066CC] hover:bg-[#0052a3] text-white border-none flex-1"
                >
                  {isSaving ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : editingContact ? (
                    "Save Changes"
                  ) : (
                    "Create Contact"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
