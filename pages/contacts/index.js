import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { MobileStageSelector } from "@/components/ui/PageShell";
import { toast } from "react-hot-toast";

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [newContact, setNewContact] = useState({
    name: "",
    email: "",
    phone: "",
    type: "seller",
    notes: "",
    address: {
      line1: "",
      line2: "",
      town: "",
      county: "",
      postcode: "",
    },
  });

  useEffect(() => {
    fetchContacts();
  }, [filter]);

  const fetchContacts = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (filter !== "all") params.append("type", filter);
      if (search) params.append("search", search);
      
      const response = await fetch(`/api/contacts?${params}`);
      if (!response.ok) throw new Error("Failed to fetch contacts");
      const data = await response.json();
      setContacts(data);
    } catch (error) {
      console.error(error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchContacts();
  };

  const handleCreateContact = async (e) => {
    e.preventDefault();

    // Validate required address fields
    if (!newContact.address?.line1?.trim()) {
      return toast.error("Address line 1 is required");
    }
    if (!newContact.address?.town?.trim()) {
      return toast.error("Town/City is required");
    }
    if (!newContact.address?.postcode?.trim()) {
      return toast.error("Postcode is required");
    }

    try {
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newContact),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to create contact");
      }

      toast.success("Contact created!");
      setShowModal(false);
      setNewContact({
        name: "",
        email: "",
        phone: "",
        type: "seller",
        notes: "",
        address: { line1: "", line2: "", town: "", county: "", postcode: "" },
      });
      fetchContacts();
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <DashboardLayout>
      <Head>
        <title>Contacts | DealerHQ</title>
      </Head>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Contacts</h1>
          <p className="text-base-content/60 mt-2">Manage your customers and sellers</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Add Contact
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col gap-4 mb-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            placeholder="Search by name, email or phone..."
            className="input input-bordered flex-1"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn btn-ghost">Search</button>
        </form>

        <MobileStageSelector
          stages={[
            { value: "all", label: "All" },
            { value: "seller", label: "Seller" },
            { value: "buyer", label: "Buyer" },
            { value: "both", label: "Both" },
          ]}
          activeStage={filter}
          onStageChange={setFilter}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : error ? (
        <div className="alert alert-error">
          <span>Error: {error}</span>
        </div>
      ) : contacts.length === 0 ? (
        <div className="card bg-base-200">
          <div className="card-body text-center py-16">
            <p className="text-lg text-base-content/60">No contacts found</p>
            <p className="text-sm text-base-content/40 mt-2">
              Add your first contact to get started
            </p>
            <div className="mt-6">
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                Add First Contact
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Type</th>
                <th>Added</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.id} className="hover">
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="avatar placeholder">
                        <div className="bg-neutral text-neutral-content rounded-full w-10">
                          <span>{contact.name?.charAt(0)?.toUpperCase() || "?"}</span>
                        </div>
                      </div>
                      <div className="font-semibold">{contact.name}</div>
                    </div>
                  </td>
                  <td>{contact.email || "—"}</td>
                  <td>{contact.phone || "—"}</td>
                  <td>
                    <div className={`badge ${
                      contact.type === "buyer" ? "badge-primary" :
                      contact.type === "both" ? "badge-secondary" :
                      "badge-ghost"
                    }`}>
                      {contact.type}
                    </div>
                  </td>
                  <td>{new Date(contact.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Contact Modal */}
      {showModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Add New Contact</h3>
            
            <form onSubmit={handleCreateContact}>
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Name *</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={newContact.name}
                  onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                  required
                />
              </div>

              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Email</span>
                </label>
                <input
                  type="email"
                  className="input input-bordered"
                  value={newContact.email}
                  onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                />
              </div>

              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Phone</span>
                </label>
                <input
                  type="tel"
                  className="input input-bordered"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                />
              </div>

              {/* Address Fields */}
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Address Line 1 *</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  placeholder="Street address"
                  value={newContact.address.line1}
                  onChange={(e) => setNewContact({
                    ...newContact,
                    address: { ...newContact.address, line1: e.target.value }
                  })}
                  required
                />
              </div>

              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Address Line 2</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  placeholder="Apartment, suite, etc. (optional)"
                  value={newContact.address.line2}
                  onChange={(e) => setNewContact({
                    ...newContact,
                    address: { ...newContact.address, line2: e.target.value }
                  })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Town/City *</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered"
                    value={newContact.address.town}
                    onChange={(e) => setNewContact({
                      ...newContact,
                      address: { ...newContact.address, town: e.target.value }
                    })}
                    required
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">County</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered"
                    value={newContact.address.county}
                    onChange={(e) => setNewContact({
                      ...newContact,
                      address: { ...newContact.address, county: e.target.value }
                    })}
                  />
                </div>
              </div>

              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Postcode *</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-40"
                  placeholder="AB12 3CD"
                  value={newContact.address.postcode}
                  onChange={(e) => setNewContact({
                    ...newContact,
                    address: { ...newContact.address, postcode: e.target.value.toUpperCase() }
                  })}
                  required
                />
              </div>

              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Type</span>
                </label>
                <select
                  className="select select-bordered"
                  value={newContact.type}
                  onChange={(e) => setNewContact({...newContact, type: e.target.value})}
                >
                  <option value="seller">Seller</option>
                  <option value="buyer">Buyer</option>
                  <option value="both">Both</option>
                </select>
              </div>

              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Notes</span>
                </label>
                <textarea
                  className="textarea textarea-bordered"
                  value={newContact.notes}
                  onChange={(e) => setNewContact({...newContact, notes: e.target.value})}
                ></textarea>
              </div>

              <div className="modal-action">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Contact
                </button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={() => setShowModal(false)}></div>
        </div>
      )}
    </DashboardLayout>
  );
}
