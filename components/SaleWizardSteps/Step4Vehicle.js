/**
 * Step 4: Vehicle Selection
 * - Search and select available vehicles
 * - Only shows vehicles with complete purchase info
 */

import { useState, useEffect } from "react";

// Format currency
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(amount);
};

// Check if vehicle has complete purchase info
const hasPurchaseInfo = (vehicle) => {
  return (
    vehicle.purchase?.purchasePriceNet != null &&
    vehicle.vatScheme &&
    vehicle.purchase?.purchasedFromContactId
  );
};

export default function Step4Vehicle({ data, updateData, goNext, goBack, canProceed }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [vehicles, setVehicles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load available vehicles
  useEffect(() => {
    const fetchVehicles = async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/vehicles?type=STOCK&salesStatus=AVAILABLE");
        if (res.ok) {
          const data = await res.json();
          setVehicles(Array.isArray(data) ? data : data.vehicles || []);
        }
      } catch (e) {
        console.error("[Step4] Fetch error:", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchVehicles();
  }, []);

  // Filter vehicles
  const filteredVehicles = vehicles.filter((v) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      v.regCurrent?.toLowerCase().includes(query) ||
      v.make?.toLowerCase().includes(query) ||
      v.model?.toLowerCase().includes(query) ||
      v.stockNumber?.toLowerCase().includes(query)
    );
  });

  // Available vehicles (with complete purchase info)
  const availableVehicles = filteredVehicles.filter(hasPurchaseInfo);

  // Vehicles missing info (shown separately)
  const incompleteVehicles = filteredVehicles.filter(v => !hasPurchaseInfo(v));

  const selectVehicle = async (vehicle) => {
    updateData("vehicleId", vehicle.id || vehicle._id);
    updateData("vehicle", vehicle);
    updateData("vatScheme", vehicle.vatScheme || "MARGIN");
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Select Vehicle</h2>
        <p className="text-slate-500">Choose the vehicle for this sale</p>
      </div>

      {/* Selected Vehicle Display */}
      {data.vehicle && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <span className="font-mono font-bold text-lg bg-white px-3 py-1 rounded border border-slate-200">
                {data.vehicle.regCurrent}
              </span>
              <div>
                <p className="font-semibold text-slate-900">
                  {data.vehicle.make} {data.vehicle.model}
                </p>
                <p className="text-sm text-slate-500">
                  {data.vehicle.year} | {data.vehicle.colour} | {data.vehicle.mileageCurrent?.toLocaleString()} miles
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                updateData("vehicleId", null);
                updateData("vehicle", null);
              }}
              className="btn btn-sm btn-ghost text-slate-500"
            >
              Change
            </button>
          </div>
          <div className="mt-3 flex items-center gap-4 text-sm">
            <span className="text-slate-500">SIV: {formatCurrency(data.vehicle.purchase?.purchasePriceNet)}</span>
            <span className={`px-2 py-0.5 rounded font-medium ${
              data.vehicle.vatScheme === "VAT_QUALIFYING"
                ? "bg-blue-100 text-blue-700"
                : "bg-slate-100 text-slate-600"
            }`}>
              {data.vehicle.vatScheme === "VAT_QUALIFYING" ? "VAT Qualifying" : "Margin Scheme"}
            </span>
          </div>
        </div>
      )}

      {/* Search and List */}
      {!data.vehicle && (
        <>
          {/* Search */}
          <div className="form-control">
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
                placeholder="Search by VRM, make, model, or stock #..."
                className="input input-bordered w-full pl-10"
              />
            </div>
          </div>

          {/* Vehicle List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <span className="loading loading-spinner loading-lg text-[#0066CC]"></span>
            </div>
          ) : availableVehicles.length === 0 && incompleteVehicles.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <svg className="w-12 h-12 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
              <p>No available vehicles found</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Available Vehicles */}
              {availableVehicles.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-3">
                    Available Vehicles ({availableVehicles.length})
                  </p>
                  <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                    {availableVehicles.map((vehicle) => (
                      <button
                        key={vehicle.id || vehicle._id}
                        onClick={() => selectVehicle(vehicle)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-sm bg-slate-100 px-2 py-0.5 rounded">
                              {vehicle.regCurrent}
                            </span>
                            <div>
                              <p className="font-medium text-slate-900">
                                {vehicle.make} {vehicle.model}
                              </p>
                              <p className="text-sm text-slate-500">
                                {vehicle.year} | {vehicle.colour} | {vehicle.mileageCurrent?.toLocaleString()} miles
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-slate-500">SIV</p>
                            <p className="font-semibold text-slate-900">
                              {formatCurrency(vehicle.purchase?.purchasePriceNet)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          {vehicle.stockNumber && (
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                              #{vehicle.stockNumber}
                            </span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                            vehicle.vatScheme === "VAT_QUALIFYING"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-slate-100 text-slate-600"
                          }`}>
                            {vehicle.vatScheme === "VAT_QUALIFYING" ? "VAT Q" : "Margin"}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Incomplete Vehicles */}
              {incompleteVehicles.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-amber-600 mb-3">
                    Missing Purchase Info ({incompleteVehicles.length})
                  </p>
                  <div className="border border-amber-200 bg-amber-50 rounded-xl divide-y divide-amber-100 max-h-[200px] overflow-y-auto">
                    {incompleteVehicles.map((vehicle) => (
                      <div
                        key={vehicle.id || vehicle._id}
                        className="px-4 py-3 opacity-60"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-sm bg-white/50 px-2 py-0.5 rounded">
                              {vehicle.regCurrent}
                            </span>
                            <div>
                              <p className="font-medium text-slate-900">
                                {vehicle.make} {vehicle.model}
                              </p>
                              <p className="text-sm text-slate-500">
                                {vehicle.year} | {vehicle.colour}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded">
                            Add purchase info in Stock Book
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
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
