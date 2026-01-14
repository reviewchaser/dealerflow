/**
 * Step 2: Customer Details
 * - Search existing contacts
 * - Create new customer
 */

import { useState, useEffect, useCallback, useRef } from "react";

export default function Step2Customer({ data, updateData, updateNestedData, goNext, goBack, canProceed }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef(null);

  // Debounced search
  const searchContacts = useCallback(async (query) => {
    // Clear any pending search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    // Debounce: wait 300ms before searching
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/contacts?search=${encodeURIComponent(query)}&type=CUSTOMER&limit=10`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.contacts || data || []);
        }
      } catch (e) {
        console.error("[Step2] Search error:", e);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, []);

  useEffect(() => {
    searchContacts(searchQuery);
  }, [searchQuery, searchContacts]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const selectCustomer = (customer) => {
    updateData("customerId", customer.id || customer._id);
    updateData("customer", customer);
    updateData("isNewCustomer", false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const startNewCustomer = () => {
    updateData("customerId", null);
    updateData("customer", null);
    updateData("isNewCustomer", true);
    setSearchQuery("");
    setSearchResults([]);
  };

  const clearSelection = () => {
    updateData("customerId", null);
    updateData("customer", null);
    updateData("isNewCustomer", false);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Customer Details</h2>
        <p className="text-slate-500">Search for an existing customer or enter new customer details</p>
      </div>

      {/* Selected Customer Display */}
      {data.customer && !data.isNewCustomer && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-slate-900">
                {data.customer.displayName || `${data.customer.firstName || ""} ${data.customer.lastName || ""}`.trim()}
              </p>
              {data.customer.companyName && (
                <p className="text-slate-600">{data.customer.companyName}</p>
              )}
              <div className="text-sm text-slate-500 mt-1 space-y-0.5">
                {data.customer.email && <p>{data.customer.email}</p>}
                {data.customer.phone && <p>{data.customer.phone}</p>}
              </div>
            </div>
            <button
              onClick={clearSelection}
              className="btn btn-sm btn-ghost text-slate-500"
            >
              Change
            </button>
          </div>
        </div>
      )}

      {/* Search / New Customer Toggle */}
      {!data.customer && !data.isNewCustomer && (
        <>
          {/* Search Box */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Search Existing Customers</span>
            </label>
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or phone..."
                className="input input-bordered w-full pl-10"
              />
              {isSearching && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 loading loading-spinner loading-sm"></span>
              )}
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-64 overflow-y-auto">
              {searchResults.map((customer) => (
                <button
                  key={customer.id || customer._id}
                  onClick={() => selectCustomer(customer)}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <p className="font-medium text-slate-900">
                    {customer.displayName || `${customer.firstName || ""} ${customer.lastName || ""}`.trim()}
                  </p>
                  <p className="text-sm text-slate-500">
                    {[customer.email, customer.phone].filter(Boolean).join(" | ")}
                  </p>
                </button>
              ))}
            </div>
          )}

          {/* No Results */}
          {searchQuery && searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <p>No customers found matching &quot;{searchQuery}&quot;</p>
            </div>
          )}

          {/* Or Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-slate-200"></div>
            <span className="text-sm text-slate-400">OR</span>
            <div className="flex-1 h-px bg-slate-200"></div>
          </div>

          {/* New Customer Button */}
          <button
            onClick={startNewCustomer}
            className="btn btn-outline border-[#0066CC] text-[#0066CC] hover:bg-[#0066CC] hover:text-white w-full"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Enter New Customer
          </button>
        </>
      )}

      {/* New Customer Form */}
      {data.isNewCustomer && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">New Customer</h3>
            <button
              onClick={clearSelection}
              className="btn btn-sm btn-ghost text-slate-500"
            >
              Search Instead
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">First Name *</span>
              </label>
              <input
                type="text"
                value={data.newCustomer.firstName}
                onChange={(e) => updateNestedData("newCustomer", "firstName", e.target.value)}
                className="input input-bordered w-full"
                placeholder="John"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Last Name *</span>
              </label>
              <input
                type="text"
                value={data.newCustomer.lastName}
                onChange={(e) => updateNestedData("newCustomer", "lastName", e.target.value)}
                className="input input-bordered w-full"
                placeholder="Smith"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Email</span>
              </label>
              <input
                type="email"
                value={data.newCustomer.email}
                onChange={(e) => updateNestedData("newCustomer", "email", e.target.value)}
                className="input input-bordered w-full"
                placeholder="john@example.com"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Phone</span>
              </label>
              <input
                type="tel"
                value={data.newCustomer.phone}
                onChange={(e) => updateNestedData("newCustomer", "phone", e.target.value)}
                className="input input-bordered w-full"
                placeholder="07123 456789"
              />
            </div>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Address Line 1</span>
            </label>
            <input
              type="text"
              value={data.newCustomer.address.line1}
              onChange={(e) => updateData("newCustomer", {
                ...data.newCustomer,
                address: { ...data.newCustomer.address, line1: e.target.value }
              })}
              className="input input-bordered w-full"
              placeholder="123 Main Street"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Town / City</span>
              </label>
              <input
                type="text"
                value={data.newCustomer.address.town}
                onChange={(e) => updateData("newCustomer", {
                  ...data.newCustomer,
                  address: { ...data.newCustomer.address, town: e.target.value }
                })}
                className="input input-bordered w-full"
                placeholder="London"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Postcode</span>
              </label>
              <input
                type="text"
                value={data.newCustomer.address.postcode}
                onChange={(e) => updateData("newCustomer", {
                  ...data.newCustomer,
                  address: { ...data.newCustomer.address, postcode: e.target.value }
                })}
                className="input input-bordered w-full"
                placeholder="SW1A 1AA"
              />
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t border-slate-200">
        <button onClick={goBack} className="btn btn-ghost">
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <button
          onClick={goNext}
          disabled={!canProceed}
          className="btn bg-[#0066CC] hover:bg-[#0052a3] text-white border-none"
        >
          Continue
          <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
