import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "react-hot-toast";
import { showDummyNotification } from "@/utils/notifications";

export default function NewVehicle() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);

  // VRM suggestions state
  const [vrmSuggestions, setVrmSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedAppraisal, setSelectedAppraisal] = useState(null);
  const suggestionRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const [formData, setFormData] = useState({
    vehicleReg: "",
    make: "",
    model: "",
    year: "",
    colour: "",
    mileage: "",
    fuelType: "",
    transmission: "",
    engineSize: "",
    doors: "",
    purchasePrice: "",
    salePrice: "",
    notes: "",
  });

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Search for VRM suggestions when typing in the registration field
    if (name === "vehicleReg" && value.length >= 2) {
      // Debounce the search
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      searchTimeoutRef.current = setTimeout(() => {
        searchVrmSuggestions(value);
      }, 300);
    } else if (name === "vehicleReg" && value.length < 2) {
      setVrmSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const searchVrmSuggestions = async (query) => {
    setIsSearching(true);
    try {
      const res = await fetch(`/api/vehicles/vrm-suggestions?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setVrmSuggestions(data);
        setShowSuggestions(data.length > 0);
      }
    } catch (error) {
      console.error("Error fetching VRM suggestions:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const selectAppraisal = (appraisal) => {
    setSelectedAppraisal(appraisal);
    setFormData((prev) => ({
      ...prev,
      vehicleReg: appraisal.vehicleReg,
      make: appraisal.vehicleMake || prev.make,
      model: appraisal.vehicleModel || prev.model,
      year: appraisal.vehicleYear || prev.year,
      colour: appraisal.colour || prev.colour,
      mileage: appraisal.mileage || prev.mileage,
      fuelType: appraisal.fuelType || prev.fuelType,
      purchasePrice: appraisal.proposedPurchasePrice || prev.purchasePrice,
      notes: appraisal.conditionNotes || prev.notes,
    }));
    setShowSuggestions(false);
    toast.success(`Loaded data from ${appraisal.type === "buying" ? "buying appraisal" : "customer PX"}`);
  };

  const handleDvlaLookup = async () => {
    if (!formData.vehicleReg) {
      toast.error("Please enter a registration number");
      return;
    }

    setIsLookingUp(true);
    try {
      const response = await fetch("/api/dvla-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleReg: formData.vehicleReg }),
      });

      const data = await response.json();

      // Handle error responses
      if (!response.ok) {
        const errorCode = data.errorCode || "UNKNOWN";
        switch (errorCode) {
          case "NOT_FOUND":
            toast.error("VRM not found - please check the registration");
            break;
          case "INVALID_FORMAT":
            toast.error("Invalid registration format");
            break;
          case "NOT_CONFIGURED":
          case "AUTH_FAILED":
          case "ACCESS_DENIED":
            toast.error("DVLA integration not configured");
            break;
          case "NETWORK_ERROR":
          case "SERVICE_ERROR":
            toast.error("DVLA service unavailable, try again later");
            break;
          default:
            toast.error(data.message || "Lookup failed");
        }
        return;
      }

      if (data.isDummy) {
        showDummyNotification("DVLA API");
      }

      setFormData((prev) => ({
        ...prev,
        make: data.make || prev.make,
        model: data.model || prev.model,
        year: data.yearOfManufacture || prev.year,
        colour: data.colour || prev.colour,
        fuelType: data.fuelType || prev.fuelType,
        engineSize: data.engineCapacity ? `${data.engineCapacity}cc` : prev.engineSize,
      }));

      toast.success("Vehicle details loaded");
    } catch (error) {
      toast.error("DVLA service unavailable, try again later");
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          regCurrent: formData.vehicleReg,
          make: formData.make,
          model: formData.model,
          year: formData.year,
          colour: formData.colour,
          mileageCurrent: formData.mileage,
          fuelType: formData.fuelType,
          transmission: formData.transmission,
          notes: formData.notes,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to create vehicle");
      }

      toast.success("Vehicle added successfully!");
      router.push("/vehicles");
    } catch (error) {
      console.error(error);
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <Head>
        <title>Add Vehicle | DealerFlow</title>
      </Head>

      <div className="mb-8">
        <Link href="/vehicles" className="btn btn-ghost btn-sm mb-4">
          ← Back to Vehicles
        </Link>
        <h1 className="text-3xl font-bold">Add New Vehicle</h1>
        <p className="text-base-content/60 mt-2">
          Add a vehicle directly to your stock
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
        {/* Vehicle Registration Lookup */}
        <div className="card bg-base-200">
          <div className="card-body">
            <h2 className="card-title">Vehicle Registration</h2>
            <div className="flex gap-4">
              <div className="form-control flex-1 relative" ref={suggestionRef}>
                <input
                  type="text"
                  name="vehicleReg"
                  value={formData.vehicleReg}
                  onChange={handleChange}
                  onFocus={() => {
                    if (vrmSuggestions.length > 0) setShowSuggestions(true);
                  }}
                  className="input input-bordered uppercase text-xl font-mono"
                  placeholder="AB12 CDE"
                  required
                  autoComplete="off"
                />

                {/* VRM Suggestions Dropdown */}
                {showSuggestions && vrmSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-base-100 border border-base-300 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
                    <div className="p-2 text-xs text-base-content/60 border-b border-base-300 bg-base-200">
                      Existing appraisals found - click to import data
                    </div>
                    {vrmSuggestions.map((suggestion) => (
                      <button
                        key={`${suggestion.type}-${suggestion.id}`}
                        type="button"
                        onClick={() => selectAppraisal(suggestion)}
                        className="w-full p-3 text-left hover:bg-base-200 border-b border-base-300 last:border-b-0 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono font-bold text-lg">
                                {suggestion.vehicleReg}
                              </span>
                              <span className={`badge badge-sm ${suggestion.type === "buying" ? "badge-primary" : "badge-secondary"}`}>
                                {suggestion.type === "buying" ? "Buying" : "Customer PX"}
                              </span>
                              {suggestion.issueCount > 0 && (
                                <span className="badge badge-sm badge-warning">
                                  {suggestion.issueCount} issue{suggestion.issueCount !== 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-base-content/70">
                              {suggestion.vehicleYear && `${suggestion.vehicleYear} `}
                              {suggestion.vehicleMake} {suggestion.vehicleModel}
                              {suggestion.colour && ` - ${suggestion.colour}`}
                            </div>
                            {suggestion.mileage && (
                              <div className="text-xs text-base-content/50">
                                {Number(suggestion.mileage).toLocaleString()} miles
                              </div>
                            )}
                            {suggestion.type === "customer_px" && suggestion.customerName && (
                              <div className="text-xs text-base-content/50 mt-1">
                                From: {suggestion.customerName}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            {suggestion.proposedPurchasePrice && (
                              <div className="text-sm font-semibold text-success">
                                £{Number(suggestion.proposedPurchasePrice).toLocaleString()}
                              </div>
                            )}
                            <div className="text-xs text-base-content/50">
                              {new Date(suggestion.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <span className="loading loading-spinner loading-sm"></span>
                  </div>
                )}
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleDvlaLookup}
                disabled={isLookingUp}
              >
                {isLookingUp ? (
                  <span className="loading loading-spinner"></span>
                ) : (
                  "Lookup"
                )}
              </button>
            </div>

            {/* Selected appraisal info */}
            {selectedAppraisal && (
              <div className="alert alert-info mt-4">
                <div className="flex-1">
                  <span className="font-semibold">
                    Imported from {selectedAppraisal.type === "buying" ? "buying appraisal" : "customer PX"}
                  </span>
                  {selectedAppraisal.issueCount > 0 && (
                    <span className="ml-2 badge badge-warning">
                      {selectedAppraisal.issueCount} recorded issue{selectedAppraisal.issueCount !== 1 ? "s" : ""}
                    </span>
                  )}
                  <p className="text-sm mt-1">
                    Issues and documents will be transferred when you save.
                    {selectedAppraisal.type === "customer_px" && selectedAppraisal.customerName && (
                      <> From customer: {selectedAppraisal.customerName}</>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setSelectedAppraisal(null)}
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Vehicle Details */}
        <div className="card bg-base-200">
          <div className="card-body">
            <h2 className="card-title">Vehicle Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Make *</span>
                </label>
                <input
                  type="text"
                  name="make"
                  value={formData.make}
                  onChange={handleChange}
                  className="input input-bordered"
                  placeholder="Ford"
                  required
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Model *</span>
                </label>
                <input
                  type="text"
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
                  className="input input-bordered"
                  placeholder="Focus"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Year</span>
                </label>
                <input
                  type="number"
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  className="input input-bordered"
                  placeholder="2019"
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Colour</span>
                </label>
                <input
                  type="text"
                  name="colour"
                  value={formData.colour}
                  onChange={handleChange}
                  className="input input-bordered"
                  placeholder="Blue"
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Mileage</span>
                </label>
                <input
                  type="number"
                  name="mileage"
                  value={formData.mileage}
                  onChange={handleChange}
                  className="input input-bordered"
                  placeholder="50000"
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Doors</span>
                </label>
                <input
                  type="number"
                  name="doors"
                  value={formData.doors}
                  onChange={handleChange}
                  className="input input-bordered"
                  placeholder="5"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Fuel Type</span>
                </label>
                <select
                  name="fuelType"
                  value={formData.fuelType}
                  onChange={handleChange}
                  className="select select-bordered"
                >
                  <option value="">Select...</option>
                  <option value="Petrol">Petrol</option>
                  <option value="Diesel">Diesel</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="Electric">Electric</option>
                </select>
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Transmission</span>
                </label>
                <select
                  name="transmission"
                  value={formData.transmission}
                  onChange={handleChange}
                  className="select select-bordered"
                >
                  <option value="">Select...</option>
                  <option value="Manual">Manual</option>
                  <option value="Automatic">Automatic</option>
                </select>
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Engine Size</span>
                </label>
                <input
                  type="text"
                  name="engineSize"
                  value={formData.engineSize}
                  onChange={handleChange}
                  className="input input-bordered"
                  placeholder="1.5L"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="card bg-base-200">
          <div className="card-body">
            <h2 className="card-title">Pricing</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Purchase Price (£)</span>
                </label>
                <input
                  type="number"
                  name="purchasePrice"
                  value={formData.purchasePrice}
                  onChange={handleChange}
                  className="input input-bordered"
                  placeholder="5000"
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Sale Price (£)</span>
                </label>
                <input
                  type="number"
                  name="salePrice"
                  value={formData.salePrice}
                  onChange={handleChange}
                  className="input input-bordered"
                  placeholder="6500"
                />
              </div>
            </div>

            {formData.purchasePrice && formData.salePrice && (
              <div className="alert alert-info mt-4">
                <span>
                  Potential Profit: £{(Number(formData.salePrice) - Number(formData.purchasePrice)).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="card bg-base-200">
          <div className="card-body">
            <h2 className="card-title">Notes</h2>
            <div className="form-control">
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className="textarea textarea-bordered h-32"
                placeholder="Any additional notes about this vehicle..."
              ></textarea>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Link href="/vehicles" className="btn btn-ghost">
            Cancel
          </Link>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="loading loading-spinner"></span>
                Saving...
              </>
            ) : (
              "Add Vehicle"
            )}
          </button>
        </div>
      </form>
    </DashboardLayout>
  );
}
