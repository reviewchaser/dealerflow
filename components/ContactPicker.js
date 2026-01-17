import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-hot-toast";

// Simple debounce hook
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

/**
 * ContactPicker - Searchable contact picker with inline creation
 *
 * Props:
 * - value: Selected contact ID
 * - onChange: (contactId, contact) => void
 * - filterTypeTags: Array of type tags to filter by (e.g., ["customer"])
 * - placeholder: Input placeholder text
 * - label: Optional label for the field
 * - disabled: Whether the picker is disabled
 * - allowCreate: Whether to allow creating new contacts (default true)
 */
export default function ContactPicker({
  value,
  onChange,
  filterTypeTags = [],
  placeholder = "Search contacts...",
  label,
  disabled = false,
  allowCreate = true,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [isMounted, setIsMounted] = useState(false);

  // Track mount state for portal
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Update dropdown position when open
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const updatePosition = () => {
        const rect = containerRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
          width: rect.width,
        });
      };
      updatePosition();
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
      return () => {
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
    }
  }, [isOpen]);

  // Debounced search query
  const debouncedSearch = useDebounce(searchQuery, 200);

  // Create form state - matches Contact page form
  const [createForm, setCreateForm] = useState({
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
    vatNumber: "",
    notes: "",
    typeTags: filterTypeTags.length > 0 ? filterTypeTags.map(t => t.toUpperCase()) : ["CUSTOMER"],
  });
  const [isCreating, setIsCreating] = useState(false);

  // Load selected contact details
  useEffect(() => {
    if (value && !selectedContact) {
      fetch(`/api/contacts/${value}`)
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data) setSelectedContact(data);
        })
        .catch(() => {});
    } else if (!value) {
      setSelectedContact(null);
    }
  }, [value]);

  // Search contacts
  const searchContacts = useCallback(async (query) => {
    setIsLoading(true);
    try {
      let url = `/api/contacts?search=${encodeURIComponent(query || "")}`;
      if (filterTypeTags.length > 0) {
        // Normalize to uppercase to match API expectations
        const typeTag = filterTypeTags[0].toUpperCase();
        url += `&type=${typeTag}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to search contacts");
      const data = await res.json();
      setContacts(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [filterTypeTags]);

  // Search when dropdown opens or debounced search changes
  useEffect(() => {
    if (isOpen) {
      searchContacts(debouncedSearch);
    }
  }, [isOpen, debouncedSearch, searchContacts]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (e) => {
      const isOutsideContainer = containerRef.current && !containerRef.current.contains(e.target);
      const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(e.target);
      if (isOutsideContainer && isOutsideDropdown) {
        setIsOpen(false);
        setShowCreateForm(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (contact) => {
    setSelectedContact(contact);
    onChange?.(contact.id || contact._id, contact);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleClear = () => {
    setSelectedContact(null);
    onChange?.(null, null);
    setSearchQuery("");
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      // Compute displayName from firstName/lastName or companyName
      let displayName;
      if (createForm.contactType === "company") {
        displayName = createForm.companyName?.trim();
      } else {
        displayName = `${createForm.firstName || ""} ${createForm.lastName || ""}`.trim();
      }

      if (!displayName) {
        toast.error("Name is required");
        setIsCreating(false);
        return;
      }

      // Normalize typeTags to uppercase
      const normalizedTypeTags = createForm.typeTags.map(t => t.toUpperCase());

      const payload = {
        displayName,
        companyName: createForm.companyName,
        email: createForm.email,
        phone: createForm.phone,
        address: {
          line1: createForm.addressLine1,
          line2: createForm.addressLine2,
          town: createForm.town,
          postcode: createForm.postcode,
        },
        vatNumber: createForm.vatNumber,
        notes: createForm.notes,
        typeTags: normalizedTypeTags,
      };

      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create contact");
      }

      const newContact = await res.json();
      toast.success("Contact created");
      handleSelect(newContact);
      setShowCreateForm(false);
      setCreateForm({
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
        vatNumber: "",
        notes: "",
        typeTags: filterTypeTags.length > 0 ? filterTypeTags.map(t => t.toUpperCase()) : ["CUSTOMER"],
      });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {label}
        </label>
      )}

      {/* Selected contact display or search input */}
      {selectedContact ? (
        <div className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl">
          <div className="w-10 h-10 bg-[#0066CC]/10 rounded-full flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-[#0066CC]">
              {(selectedContact.displayName || "?")[0].toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-900 truncate">
              {selectedContact.displayName}
            </p>
            {selectedContact.email && (
              <p className="text-sm text-slate-500 truncate">
                {selectedContact.email}
              </p>
            )}
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="btn btn-ghost btn-sm btn-circle text-slate-400 hover:text-red-500"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      ) : (
        <div className="relative">
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
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            disabled={disabled}
            className="input input-bordered w-full pl-10"
          />
        </div>
      )}

      {/* Dropdown - rendered via portal for proper z-index */}
      {isOpen && !selectedContact && isMounted && createPortal(
        <div
          ref={dropdownRef}
          className="bg-white rounded-xl border border-slate-200 shadow-2xl max-h-[80vh] overflow-hidden flex flex-col"
          style={{
            position: "fixed",
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            zIndex: 99999,
          }}
        >
          {showCreateForm ? (
            <form onSubmit={handleCreate} className="flex flex-col max-h-[80vh]">
              {/* Sticky header */}
              <div className="flex items-center justify-between p-4 pb-2 border-b border-slate-100 shrink-0">
                <h4 className="font-semibold text-slate-900">New Contact</h4>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {/* Contact Type */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateForm((p) => ({ ...p, contactType: "individual" }))}
                    className={`flex-1 btn btn-sm ${createForm.contactType === "individual" ? "btn-primary" : "btn-ghost"}`}
                  >
                    Individual
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateForm((p) => ({ ...p, contactType: "company" }))}
                    className={`flex-1 btn btn-sm ${createForm.contactType === "company" ? "btn-primary" : "btn-ghost"}`}
                  >
                    Business
                  </button>
                </div>

                {/* Categories / Type Tags */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Categories</label>
                  <div className="flex flex-wrap gap-1">
                    {[
                      { key: "CUSTOMER", label: "Customer" },
                      { key: "SUPPLIER", label: "Supplier" },
                      { key: "FINANCE", label: "Finance" },
                    ].map(tag => (
                      <button
                        key={tag.key}
                        type="button"
                        onClick={() => setCreateForm(p => ({
                          ...p,
                          typeTags: p.typeTags.includes(tag.key)
                            ? p.typeTags.filter(t => t !== tag.key)
                            : [...p.typeTags, tag.key]
                        }))}
                        className={`btn btn-xs ${createForm.typeTags.includes(tag.key) ? "btn-primary" : "btn-ghost"}`}
                      >
                        {tag.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name Fields */}
                {createForm.contactType === "individual" ? (
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="First name *"
                      value={createForm.firstName}
                      onChange={(e) => setCreateForm((p) => ({ ...p, firstName: e.target.value }))}
                      className="input input-bordered input-sm"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Last name *"
                      value={createForm.lastName}
                      onChange={(e) => setCreateForm((p) => ({ ...p, lastName: e.target.value }))}
                      className="input input-bordered input-sm"
                      required
                    />
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder="Company name *"
                    value={createForm.companyName}
                    onChange={(e) => setCreateForm((p) => ({ ...p, companyName: e.target.value }))}
                    className="input input-bordered input-sm w-full"
                    required
                  />
                )}

                {/* Company for individuals */}
                {createForm.contactType === "individual" && (
                  <input
                    type="text"
                    placeholder="Company (optional)"
                    value={createForm.companyName}
                    onChange={(e) => setCreateForm((p) => ({ ...p, companyName: e.target.value }))}
                    className="input input-bordered input-sm w-full"
                  />
                )}

                {/* Contact Details */}
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="email"
                    placeholder="Email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                    className="input input-bordered input-sm"
                  />
                  <input
                    type="tel"
                    placeholder="Phone"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm((p) => ({ ...p, phone: e.target.value }))}
                    className="input input-bordered input-sm"
                  />
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-500">Address</label>
                  <input
                    type="text"
                    placeholder="Address Line 1"
                    value={createForm.addressLine1}
                    onChange={(e) => setCreateForm((p) => ({ ...p, addressLine1: e.target.value }))}
                    className="input input-bordered input-sm w-full"
                  />
                  <input
                    type="text"
                    placeholder="Address Line 2"
                    value={createForm.addressLine2}
                    onChange={(e) => setCreateForm((p) => ({ ...p, addressLine2: e.target.value }))}
                    className="input input-bordered input-sm w-full"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Town/City"
                      value={createForm.town}
                      onChange={(e) => setCreateForm((p) => ({ ...p, town: e.target.value }))}
                      className="input input-bordered input-sm"
                    />
                    <input
                      type="text"
                      placeholder="Postcode"
                      value={createForm.postcode}
                      onChange={(e) => setCreateForm((p) => ({ ...p, postcode: e.target.value }))}
                      className="input input-bordered input-sm"
                    />
                  </div>
                </div>

                {/* VAT Number - for companies */}
                {createForm.contactType === "company" && (
                  <input
                    type="text"
                    placeholder="VAT Number (e.g., GB123456789)"
                    value={createForm.vatNumber}
                    onChange={(e) => setCreateForm((p) => ({ ...p, vatNumber: e.target.value }))}
                    className="input input-bordered input-sm w-full"
                  />
                )}

                {/* Notes */}
                <textarea
                  placeholder="Notes (optional)"
                  value={createForm.notes}
                  onChange={(e) => setCreateForm((p) => ({ ...p, notes: e.target.value }))}
                  className="textarea textarea-bordered textarea-sm w-full"
                  rows={2}
                />
              </div>

              {/* Sticky footer */}
              <div className="flex gap-2 p-4 pt-2 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="btn btn-ghost btn-sm flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="btn btn-primary btn-sm flex-1"
                >
                  {isCreating ? (
                    <span className="loading loading-spinner loading-xs"></span>
                  ) : (
                    "Create"
                  )}
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Search results */}
              <div className="max-h-60 overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <span className="loading loading-spinner loading-sm text-[#0066CC]"></span>
                  </div>
                ) : contacts.length === 0 ? (
                  <div className="p-4 text-center">
                    {searchQuery ? (
                      <div className="space-y-3">
                        <p className="text-sm text-slate-500">No contacts found for "{searchQuery}"</p>
                        {allowCreate && (
                          <button
                            type="button"
                            onClick={() => {
                              setCreateForm(prev => ({
                                ...prev,
                                firstName: searchQuery.split(" ")[0] || "",
                                lastName: searchQuery.split(" ").slice(1).join(" ") || "",
                                companyName: searchQuery,
                              }));
                              setShowCreateForm(true);
                            }}
                            className="btn btn-sm bg-[#0066CC] hover:bg-[#0052a3] text-white border-none"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Create "{searchQuery}"
                          </button>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">Type to search contacts</p>
                    )}
                  </div>
                ) : (
                  <div className="py-1">
                    {contacts.slice(0, 10).map((contact) => (
                      <button
                        key={contact.id || contact._id}
                        type="button"
                        onClick={() => handleSelect(contact)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left"
                      >
                        <div className="w-9 h-9 bg-[#0066CC]/10 rounded-full flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-[#0066CC]">
                            {(contact.displayName || "?")[0].toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">
                            {contact.displayName}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {contact.email || contact.phone || "No contact info"}
                          </p>
                        </div>
                        {contact.typeTags?.some(t => t.toUpperCase() === "CUSTOMER") && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded">
                            Customer
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Create new option */}
              {allowCreate && (
                <div className="border-t border-slate-100 p-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(true)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#0066CC] hover:bg-[#0066CC]/5 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create new contact
                  </button>
                </div>
              )}
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
