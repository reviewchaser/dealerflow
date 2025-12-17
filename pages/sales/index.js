import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "react-hot-toast";
import { showDummyNotification } from "@/utils/notifications";

export default function Sales() {
  const router = useRouter();
  const [sales, setSales] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  
  const [newSale, setNewSale] = useState({
    vehicleId: router.query.vehicleId || "",
    buyerName: "",
    buyerEmail: "",
    buyerPhone: "",
    salePrice: "",
    depositAmount: "",
    paymentMethod: "cash",
    warrantyMonths: "3",
    notes: "",
  });

  useEffect(() => {
    fetchSales();
    fetchVehicles();
  }, []);

  useEffect(() => {
    if (router.query.vehicleId) {
      setNewSale(prev => ({ ...prev, vehicleId: router.query.vehicleId }));
      setShowModal(true);
    }
  }, [router.query.vehicleId]);

  const fetchSales = async () => {
    try {
      const response = await fetch("/api/sales");
      if (!response.ok) throw new Error("Failed to fetch sales");
      const data = await response.json();
      setSales(data);
    } catch (error) {
      console.error(error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      const response = await fetch("/api/vehicles?status=live");
      if (!response.ok) throw new Error("Failed to fetch vehicles");
      const data = await response.json();
      setVehicles(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateSale = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSale),
      });
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to create sale");
      }
      
      toast.success("Sale created!");
      setShowModal(false);
      setNewSale({
        vehicleId: "",
        buyerName: "",
        buyerEmail: "",
        buyerPhone: "",
        salePrice: "",
        depositAmount: "",
        paymentMethod: "cash",
        warrantyMonths: "3",
        notes: "",
      });
      fetchSales();
      fetchVehicles();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleRequestReview = (saleId) => {
    showDummyNotification("Email/SMS review requests");
    toast("📧 Review request would be sent here - Email service not configured");
  };

  return (
    <DashboardLayout>
      <Head>
        <title>Sales | DealerFlow</title>
      </Head>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Sales</h1>
          <p className="text-base-content/60 mt-2">Track vehicle sales and deliveries</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + New Sale
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : error ? (
        <div className="alert alert-error">
          <span>Error: {error}</span>
        </div>
      ) : sales.length === 0 ? (
        <div className="card bg-base-200">
          <div className="card-body text-center py-16">
            <p className="text-lg text-base-content/60">No sales yet</p>
            <p className="text-sm text-base-content/40 mt-2">
              Create your first sale to start tracking
            </p>
            <div className="mt-6">
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                Create First Sale
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Vehicle</th>
                <th>Buyer</th>
                <th>Sale Price</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id} className="hover">
                  <td>{new Date(sale.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div>
                      <p className="font-semibold">
                        {sale.vehicleId?.make} {sale.vehicleId?.model}
                      </p>
                      <p className="text-sm text-base-content/60 font-mono">
                        {sale.vehicleId?.vehicleReg}
                      </p>
                    </div>
                  </td>
                  <td>{sale.buyerId?.name || "—"}</td>
                  <td className="font-semibold">
                    £{sale.salePrice?.toLocaleString()}
                  </td>
                  <td>
                    <div className={`badge ${
                      sale.status === "completed" ? "badge-success" :
                      sale.status === "deposit_paid" ? "badge-warning" :
                      sale.status === "cancelled" ? "badge-error" :
                      "badge-ghost"
                    }`}>
                      {sale.status.replace("_", " ")}
                    </div>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      {sale.status !== "completed" && (
                        <button 
                          className="btn btn-ghost btn-xs"
                          onClick={() => {
                            // Mark as completed
                            fetch(`/api/sales/${sale.id}`, {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ status: "completed" }),
                            }).then(() => {
                              toast.success("Sale completed!");
                              fetchSales();
                            });
                          }}
                        >
                          Complete
                        </button>
                      )}
                      {!sale.reviewRequested && sale.status === "completed" && (
                        <button 
                          className="btn btn-ghost btn-xs"
                          onClick={() => handleRequestReview(sale.id)}
                        >
                          📧 Request Review
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Sale Modal */}
      {showModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-lg mb-4">Create New Sale</h3>
            
            <form onSubmit={handleCreateSale}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control md:col-span-2">
                  <label className="label">
                    <span className="label-text">Vehicle *</span>
                  </label>
                  <select
                    className="select select-bordered"
                    value={newSale.vehicleId}
                    onChange={(e) => setNewSale({...newSale, vehicleId: e.target.value})}
                    required
                  >
                    <option value="">Select a vehicle...</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.make} {v.model} - {v.vehicleReg} (£{v.salePrice?.toLocaleString() || "N/A"})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Buyer Name *</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered"
                    value={newSale.buyerName}
                    onChange={(e) => setNewSale({...newSale, buyerName: e.target.value})}
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Buyer Phone</span>
                  </label>
                  <input
                    type="tel"
                    className="input input-bordered"
                    value={newSale.buyerPhone}
                    onChange={(e) => setNewSale({...newSale, buyerPhone: e.target.value})}
                  />
                </div>

                <div className="form-control md:col-span-2">
                  <label className="label">
                    <span className="label-text">Buyer Email</span>
                  </label>
                  <input
                    type="email"
                    className="input input-bordered"
                    value={newSale.buyerEmail}
                    onChange={(e) => setNewSale({...newSale, buyerEmail: e.target.value})}
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Sale Price (£) *</span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered"
                    value={newSale.salePrice}
                    onChange={(e) => setNewSale({...newSale, salePrice: e.target.value})}
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Deposit Amount (£)</span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered"
                    value={newSale.depositAmount}
                    onChange={(e) => setNewSale({...newSale, depositAmount: e.target.value})}
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Payment Method</span>
                  </label>
                  <select
                    className="select select-bordered"
                    value={newSale.paymentMethod}
                    onChange={(e) => setNewSale({...newSale, paymentMethod: e.target.value})}
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="finance">Finance</option>
                    <option value="card">Card</option>
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Warranty (months)</span>
                  </label>
                  <select
                    className="select select-bordered"
                    value={newSale.warrantyMonths}
                    onChange={(e) => setNewSale({...newSale, warrantyMonths: e.target.value})}
                  >
                    <option value="0">No Warranty</option>
                    <option value="3">3 Months</option>
                    <option value="6">6 Months</option>
                    <option value="12">12 Months</option>
                  </select>
                </div>

                <div className="form-control md:col-span-2">
                  <label className="label">
                    <span className="label-text">Notes</span>
                  </label>
                  <textarea
                    className="textarea textarea-bordered"
                    value={newSale.notes}
                    onChange={(e) => setNewSale({...newSale, notes: e.target.value})}
                  ></textarea>
                </div>
              </div>

              <div className="modal-action">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Sale
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
