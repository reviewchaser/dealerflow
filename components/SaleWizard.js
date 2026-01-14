import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import { toast } from "react-hot-toast";

const STEPS = [
  { id: 1, title: "Vehicle & Sale Type" },
  { id: 2, title: "Customer" },
  { id: 3, title: "Pricing & Add-ons" },
  { id: 4, title: "Review" },
];

const STORAGE_KEY = "dealerhq_sale_wizard";

// Format currency
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || amount === "") return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(amount);
};

// Check if vehicle has complete purchase info
const hasPurchaseInfo = (vehicle) => {
  return (
    vehicle?.purchase?.purchasePriceNet != null &&
    vehicle?.vatScheme &&
    vehicle?.purchase?.purchasedFromContactId
  );
};

const initialWizardData = {
  // Step 1: Vehicle & Sale Type
  vehicleId: null,
  vehicle: null,
  saleType: "RETAIL",
  buyerUse: "PRIVATE",
  saleChannel: "IN_PERSON",

  // Step 2: Customer & Part Exchange
  customerId: null,
  customer: null,
  isNewCustomer: false,
  newCustomer: {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: {
      line1: "",
      line2: "",
      town: "",
      county: "",
      postcode: "",
    },
  },
  hasPx: false,
  px: {
    vrm: "",
    make: "",
    model: "",
    year: "",
    mileage: "",
    allowance: "",
    settlementAmount: "",
    vatQualifying: false,
    hasFinance: false,
    financeCompanyId: "",
    financeCompanyName: "",
    hasSettlementInWriting: false,
    sourceType: "MANUAL",
    sourceId: null,
  },

  // Step 3: Pricing & Add-ons
  salePriceGross: "",
  vatScheme: "MARGIN",
  addOns: [],
  paymentType: "CASH",
  depositAmount: "",
  depositMethod: "CARD",

  // Delivery
  delivery: {
    amount: "",
    isFree: false,
  },

  // Finance selection
  financeSelection: {
    isFinanced: false,
    financeCompanyId: "",
    financeCompanyName: "",
    toBeConfirmed: false,
  },
};

export default function SaleWizard({ isOpen, onClose, preSelectedVehicleId }) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState(initialWizardData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data fetching
  const [vehicles, setVehicles] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [isLookingUpPx, setIsLookingUpPx] = useState(false);

  // Search states
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [addOnSearch, setAddOnSearch] = useState("");

  // Appraisal search for PX
  const [pxSearchMode, setPxSearchMode] = useState("new"); // "new" or "existing"
  const [pxAppraisalSearch, setPxAppraisalSearch] = useState("");
  const [pxAppraisalResults, setPxAppraisalResults] = useState([]);
  const [isSearchingAppraisals, setIsSearchingAppraisals] = useState(false);

  // Finance companies
  const [financeCompanies, setFinanceCompanies] = useState([]);

  // Load saved state from localStorage
  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setWizardData(parsed.data || initialWizardData);
          setCurrentStep(parsed.step || 1);
        } catch (e) {
          console.error("[SaleWizard] Failed to parse saved state:", e);
        }
      }

      // If vehicle pre-selected, fetch it
      if (preSelectedVehicleId) {
        fetchVehicle(preSelectedVehicleId);
      }

      // Load all required data
      fetchVehicles();
      fetchCustomers();
      fetchProducts();
      fetchFinanceCompanies();
    }
  }, [isOpen, preSelectedVehicleId]);

  // Save state to localStorage
  useEffect(() => {
    if (isOpen) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        data: wizardData,
        step: currentStep,
      }));
    }
  }, [wizardData, currentStep, isOpen]);

  const fetchVehicle = async (vehicleId) => {
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}`);
      if (res.ok) {
        const data = await res.json();
        setWizardData(prev => ({
          ...prev,
          vehicleId,
          vehicle: data,
          vatScheme: data.vatScheme || "MARGIN",
        }));
      }
    } catch (e) {
      console.error("[SaleWizard] Failed to fetch vehicle:", e);
    }
  };

  const fetchVehicles = async () => {
    setIsLoadingVehicles(true);
    try {
      const res = await fetch("/api/vehicles?type=STOCK&salesStatus=AVAILABLE");
      if (res.ok) {
        const data = await res.json();
        setVehicles(Array.isArray(data) ? data : data.vehicles || []);
      }
    } catch (e) {
      console.error("[SaleWizard] Failed to fetch vehicles:", e);
    } finally {
      setIsLoadingVehicles(false);
    }
  };

  const fetchCustomers = async () => {
    setIsLoadingCustomers(true);
    try {
      const res = await fetch("/api/contacts?type=CUSTOMER");
      if (res.ok) {
        const data = await res.json();
        setCustomers(Array.isArray(data) ? data : data.contacts || []);
      }
    } catch (e) {
      console.error("[SaleWizard] Failed to fetch customers:", e);
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/addons");
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || data || []);
      }
    } catch (e) {
      console.error("[SaleWizard] Failed to fetch add-ons:", e);
    }
  };

  const fetchFinanceCompanies = async () => {
    try {
      const res = await fetch("/api/contacts?type=FINANCE");
      if (res.ok) {
        const data = await res.json();
        setFinanceCompanies(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("[SaleWizard] Failed to fetch finance companies:", e);
    }
  };

  // Search unconverted appraisals by VRM
  const searchAppraisals = async (query) => {
    if (!query || query.length < 2) {
      setPxAppraisalResults([]);
      return;
    }

    setIsSearchingAppraisals(true);
    try {
      const res = await fetch(`/api/appraisals/search-unconverted?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setPxAppraisalResults(data || []);
      }
    } catch (e) {
      console.error("[SaleWizard] Failed to search appraisals:", e);
    } finally {
      setIsSearchingAppraisals(false);
    }
  };

  // Select existing appraisal for PX
  const selectAppraisalForPx = (appraisal) => {
    setWizardData(prev => ({
      ...prev,
      px: {
        ...prev.px,
        vrm: appraisal.vehicleReg || appraisal.reg || "",
        make: appraisal.vehicleMake || appraisal.make || "",
        model: appraisal.vehicleModel || appraisal.model || "",
        year: appraisal.vehicleYear || appraisal.year || "",
        mileage: appraisal.mileage || "",
        sourceType: appraisal.type === "customer_px" ? "CUSTOMER_FORM" : "DEALER_APPRAISAL",
        sourceId: appraisal.id || appraisal._id,
      },
    }));
    setPxAppraisalSearch("");
    setPxAppraisalResults([]);
    toast.success(`Selected appraisal for ${appraisal.vehicleMake || appraisal.make} ${appraisal.vehicleModel || appraisal.model}`);
  };

  // PX VRM Lookup
  const handlePxLookup = async () => {
    const vrm = wizardData.px.vrm?.replace(/\s/g, "").toUpperCase();
    if (!vrm || vrm.length < 2) {
      toast.error("Enter a valid registration");
      return;
    }

    setIsLookingUpPx(true);
    try {
      const [dvlaRes, motRes] = await Promise.all([
        fetch("/api/dvla-lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vehicleReg: vrm }),
        }),
        fetch(`/api/mot?vrm=${vrm}`),
      ]);

      const dvlaData = await dvlaRes.json();
      let motData = null;
      if (motRes.ok) {
        motData = await motRes.json();
      }

      if ((!dvlaRes.ok || dvlaData.error) && !motData) {
        toast.error(dvlaData.message || dvlaData.error || "Vehicle not found");
        return;
      }

      setWizardData(prev => ({
        ...prev,
        px: {
          ...prev.px,
          vrm,
          make: dvlaData.make || motData?.make || prev.px.make,
          model: motData?.model || dvlaData.model || prev.px.model,
          year: dvlaData.yearOfManufacture || dvlaData.year || prev.px.year,
        },
      }));

      toast.success(`Found: ${dvlaData.make || motData?.make} ${motData?.model || dvlaData.model}`);
    } catch (error) {
      toast.error("Lookup failed");
    } finally {
      setIsLookingUpPx(false);
    }
  };

  // Filter vehicles
  const filteredVehicles = useMemo(() => {
    if (!vehicleSearch) return vehicles.filter(hasPurchaseInfo);
    const q = vehicleSearch.toLowerCase();
    return vehicles
      .filter(hasPurchaseInfo)
      .filter(v =>
        v.regCurrent?.toLowerCase().includes(q) ||
        v.make?.toLowerCase().includes(q) ||
        v.model?.toLowerCase().includes(q)
      );
  }, [vehicles, vehicleSearch]);

  // Filter customers
  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter(c =>
      c.displayName?.toLowerCase().includes(q) ||
      c.firstName?.toLowerCase().includes(q) ||
      c.lastName?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    );
  }, [customers, customerSearch]);

  // Filter add-ons
  const filteredAddOns = useMemo(() => {
    if (!addOnSearch) return products;
    const q = addOnSearch.toLowerCase();
    return products.filter(p => p.name?.toLowerCase().includes(q));
  }, [products, addOnSearch]);

  // Navigation
  const goNext = () => {
    if (currentStep < STEPS.length) setCurrentStep(currentStep + 1);
  };

  const goBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  // Cancel wizard
  const handleCancel = () => {
    if (confirm("Are you sure you want to cancel? All entered data will be lost.")) {
      localStorage.removeItem(STORAGE_KEY);
      setWizardData(initialWizardData);
      setCurrentStep(1);
      onClose();
    }
  };

  // Submit - create deal
  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // Create customer if new
      let customerId = wizardData.customerId;
      if (wizardData.isNewCustomer && !customerId) {
        const customerRes = await fetch("/api/contacts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: wizardData.newCustomer.firstName,
            lastName: wizardData.newCustomer.lastName,
            displayName: `${wizardData.newCustomer.firstName} ${wizardData.newCustomer.lastName}`.trim(),
            email: wizardData.newCustomer.email,
            phone: wizardData.newCustomer.phone,
            address: wizardData.newCustomer.address,
            type: "CUSTOMER",
          }),
        });

        if (!customerRes.ok) {
          const err = await customerRes.json();
          throw new Error(err.error || "Failed to create customer");
        }

        const newCustomer = await customerRes.json();
        customerId = newCustomer.id || newCustomer._id;
      }

      // Build deal payload
      const salePriceGross = parseFloat(wizardData.salePriceGross) || 0;
      const vatScheme = wizardData.vatScheme;
      let vehiclePriceNet = salePriceGross;
      let vehicleVatAmount = 0;

      if (vatScheme === "VAT_QUALIFYING") {
        vehiclePriceNet = salePriceGross / 1.2;
        vehicleVatAmount = salePriceGross - vehiclePriceNet;
      }

      const dealPayload = {
        vehicleId: wizardData.vehicleId,
        soldToContactId: customerId,
        saleType: wizardData.saleType,
        saleChannel: wizardData.saleChannel,
        buyerUse: wizardData.buyerUse,
        vatScheme,
        vehiclePriceNet,
        vehicleVatAmount,
        vehiclePriceGross: salePriceGross,
        paymentType: wizardData.paymentType,
        addOns: wizardData.addOns.map(a => ({
          productId: a.productId,
          name: a.name,
          qty: a.qty || 1,
          unitPriceNet: parseFloat(a.unitPriceNet) || 0,
          vatTreatment: a.vatTreatment || "STANDARD",
          vatRate: 0.2,
        })),
        // Delivery
        delivery: {
          amount: parseFloat(wizardData.delivery?.amount) || 0,
          isFree: wizardData.delivery?.isFree || false,
        },
        // Finance selection
        financeSelection: wizardData.financeSelection?.isFinanced ? {
          isFinanced: true,
          financeCompanyContactId: wizardData.financeSelection.financeCompanyId || undefined,
          toBeConfirmed: wizardData.financeSelection.toBeConfirmed || false,
        } : undefined,
      };

      const dealRes = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dealPayload),
      });

      const dealData = await dealRes.json();

      if (!dealRes.ok) {
        throw new Error(dealData.error || "Failed to create deal");
      }

      // Handle part exchange if exists
      if (wizardData.hasPx && wizardData.px.vrm) {
        const pxData = wizardData.px;
        await fetch("/api/part-exchanges", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dealId: dealData.id,
            vrm: pxData.vrm,
            make: pxData.make,
            model: pxData.model,
            year: parseInt(pxData.year) || undefined,
            mileage: parseInt(pxData.mileage) || undefined,
            settlement: parseFloat(pxData.settlementAmount) || 0,
            allowance: parseFloat(pxData.allowance) || 0,
            vatQualifying: pxData.vatQualifying || false,
            hasFinance: pxData.hasFinance || false,
            financeCompanyContactId: pxData.financeCompanyId || undefined,
            hasSettlementInWriting: pxData.hasSettlementInWriting || false,
            sourceType: pxData.sourceType || "MANUAL",
            sourceId: pxData.sourceId || undefined,
          }),
        });
      }

      // Take deposit if provided
      if (wizardData.depositAmount && parseFloat(wizardData.depositAmount) > 0) {
        await fetch(`/api/deals/${dealData.id}/take-deposit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: parseFloat(wizardData.depositAmount),
            method: wizardData.depositMethod,
          }),
        });
      }

      // Success
      toast.success("Deal created successfully!");
      localStorage.removeItem(STORAGE_KEY);
      setWizardData(initialWizardData);
      setCurrentStep(1);
      onClose();
      router.push(`/sales?id=${dealData.id}`);
    } catch (error) {
      console.error("[SaleWizard] Submit error:", error);
      toast.error(error.message || "Failed to create deal");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Validation for each step
  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 1:
        return !!wizardData.vehicleId;
      case 2:
        // New customer requires name, contact, and address
        if (wizardData.isNewCustomer) {
          const nc = wizardData.newCustomer;
          return (
            nc.firstName &&
            nc.lastName &&
            (nc.email || nc.phone) &&
            nc.address?.line1 &&
            nc.address?.town &&
            nc.address?.postcode
          );
        }
        return !!wizardData.customerId;
      case 3:
        return wizardData.salePriceGross && parseFloat(wizardData.salePriceGross) > 0;
      case 4:
        return true;
      default:
        return false;
    }
  }, [currentStep, wizardData]);

  // Select vehicle
  const selectVehicle = (vehicle) => {
    setWizardData(prev => ({
      ...prev,
      vehicleId: vehicle.id || vehicle._id,
      vehicle,
      vatScheme: vehicle.vatScheme || "MARGIN",
    }));
  };

  // Select customer
  const selectCustomer = (customer) => {
    setWizardData(prev => ({
      ...prev,
      customerId: customer.id || customer._id,
      customer,
      isNewCustomer: false,
    }));
  };

  // Toggle add-on
  const toggleAddOn = (product) => {
    const productId = product.id || product._id;
    const exists = wizardData.addOns.find(a => a.productId === productId);

    if (exists) {
      setWizardData(prev => ({
        ...prev,
        addOns: prev.addOns.filter(a => a.productId !== productId),
      }));
    } else {
      setWizardData(prev => ({
        ...prev,
        addOns: [...prev.addOns, {
          productId,
          name: product.name,
          qty: 1,
          unitPriceNet: product.defaultPriceNet || 0,
          vatTreatment: "STANDARD",
        }],
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" />

      {/* Wizard Modal - Inline Popup */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
            <div>
              <h1 className="text-xl font-bold text-slate-900">New Sale</h1>
              <p className="text-sm text-slate-500">Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].title}</p>
            </div>
            <button onClick={handleCancel} className="btn btn-sm btn-ghost btn-circle">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress Bar */}
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 shrink-0">
            <div className="flex items-center justify-between">
              {STEPS.map((step, index) => (
                <div key={step.id} className="flex items-center flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                    step.id < currentStep
                      ? "bg-emerald-500 text-white"
                      : step.id === currentStep
                        ? "bg-[#0066CC] text-white"
                        : "bg-slate-200 text-slate-500"
                  }`}>
                    {step.id < currentStep ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : step.id}
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 ${step.id < currentStep ? "bg-emerald-500" : "bg-slate-200"}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Step 1: Vehicle & Sale Type */}
            {currentStep === 1 && (
              <div className="space-y-6">
                {/* Selected Vehicle */}
                {wizardData.vehicle ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-lg bg-white px-3 py-1 rounded border">
                          {wizardData.vehicle.regCurrent}
                        </span>
                        <div>
                          <p className="font-semibold">{wizardData.vehicle.make} {wizardData.vehicle.model}</p>
                          <p className="text-sm text-slate-500">
                            {wizardData.vehicle.year} | {wizardData.vehicle.colour} | {wizardData.vehicle.mileageCurrent?.toLocaleString()} miles
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setWizardData(prev => ({ ...prev, vehicleId: null, vehicle: null }))}
                        className="btn btn-sm btn-ghost"
                      >
                        Change
                      </button>
                    </div>
                    <div className="mt-2 flex gap-2 text-sm">
                      <span className="text-slate-500">SIV: {formatCurrency(wizardData.vehicle.purchase?.purchasePriceNet)}</span>
                      <span className={`px-2 py-0.5 rounded font-medium ${
                        wizardData.vehicle.vatScheme === "VAT_QUALIFYING"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-slate-100 text-slate-600"
                      }`}>
                        {wizardData.vehicle.vatScheme === "VAT_QUALIFYING" ? "VAT Qualifying" : "Margin"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="form-control">
                      <label className="label"><span className="label-text font-medium">Search Vehicle</span></label>
                      <input
                        type="text"
                        value={vehicleSearch}
                        onChange={(e) => setVehicleSearch(e.target.value)}
                        placeholder="Search by VRM, make, model..."
                        className="input input-bordered w-full"
                      />
                    </div>
                    <div className="border border-slate-200 rounded-xl max-h-48 overflow-y-auto divide-y">
                      {isLoadingVehicles ? (
                        <div className="flex justify-center py-8">
                          <span className="loading loading-spinner loading-md text-[#0066CC]"></span>
                        </div>
                      ) : filteredVehicles.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                          No available vehicles with purchase info
                        </div>
                      ) : (
                        filteredVehicles.slice(0, 10).map((v) => (
                          <button
                            key={v.id || v._id}
                            onClick={() => selectVehicle(v)}
                            className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-mono font-bold text-sm bg-slate-100 px-2 py-0.5 rounded">{v.regCurrent}</span>
                              <div>
                                <p className="font-medium">{v.make} {v.model}</p>
                                <p className="text-sm text-slate-500">{v.year} | {v.colour}</p>
                              </div>
                            </div>
                            <span className="text-sm font-semibold">{formatCurrency(v.purchase?.purchasePriceNet)}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}

                {/* Sale Type */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="form-control">
                    <label className="label"><span className="label-text font-medium">Sale Type</span></label>
                    <select
                      value={wizardData.saleType}
                      onChange={(e) => setWizardData(prev => ({ ...prev, saleType: e.target.value }))}
                      className="select select-bordered w-full"
                    >
                      <option value="RETAIL">Retail</option>
                      <option value="TRADE">Trade</option>
                      <option value="EXPORT">Export</option>
                    </select>
                  </div>
                  {wizardData.saleType === "RETAIL" && (
                    <>
                      <div className="form-control">
                        <label className="label"><span className="label-text font-medium">Buyer Use</span></label>
                        <select
                          value={wizardData.buyerUse}
                          onChange={(e) => setWizardData(prev => ({ ...prev, buyerUse: e.target.value }))}
                          className="select select-bordered w-full"
                        >
                          <option value="PRIVATE">Personal</option>
                          <option value="BUSINESS">Business</option>
                        </select>
                      </div>
                      <div className="form-control">
                        <label className="label"><span className="label-text font-medium">Sale Channel</span></label>
                        <select
                          value={wizardData.saleChannel}
                          onChange={(e) => setWizardData(prev => ({ ...prev, saleChannel: e.target.value }))}
                          className="select select-bordered w-full"
                        >
                          <option value="IN_PERSON">In Person</option>
                          <option value="DISTANCE">Distance</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Customer & Part Exchange */}
            {currentStep === 2 && (
              <div className="space-y-6">
                {/* Customer Selection */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Customer</h3>

                  {wizardData.customer ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{wizardData.customer.displayName || `${wizardData.customer.firstName} ${wizardData.customer.lastName}`}</p>
                          <p className="text-sm text-slate-500">{wizardData.customer.email} | {wizardData.customer.phone}</p>
                        </div>
                        <button
                          onClick={() => setWizardData(prev => ({ ...prev, customerId: null, customer: null }))}
                          className="btn btn-sm btn-ghost"
                        >
                          Change
                        </button>
                      </div>
                    </div>
                  ) : wizardData.isNewCustomer ? (
                    <div className="border border-slate-200 rounded-xl p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">New Customer</h4>
                        <button
                          onClick={() => setWizardData(prev => ({ ...prev, isNewCustomer: false, newCustomer: initialWizardData.newCustomer }))}
                          className="btn btn-sm btn-ghost"
                        >
                          Select Existing
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          type="text"
                          value={wizardData.newCustomer.firstName}
                          onChange={(e) => setWizardData(prev => ({ ...prev, newCustomer: { ...prev.newCustomer, firstName: e.target.value } }))}
                          placeholder="First Name *"
                          className="input input-bordered"
                        />
                        <input
                          type="text"
                          value={wizardData.newCustomer.lastName}
                          onChange={(e) => setWizardData(prev => ({ ...prev, newCustomer: { ...prev.newCustomer, lastName: e.target.value } }))}
                          placeholder="Last Name *"
                          className="input input-bordered"
                        />
                        <input
                          type="email"
                          value={wizardData.newCustomer.email}
                          onChange={(e) => setWizardData(prev => ({ ...prev, newCustomer: { ...prev.newCustomer, email: e.target.value } }))}
                          placeholder="Email"
                          className="input input-bordered"
                        />
                        <input
                          type="tel"
                          value={wizardData.newCustomer.phone}
                          onChange={(e) => setWizardData(prev => ({ ...prev, newCustomer: { ...prev.newCustomer, phone: e.target.value } }))}
                          placeholder="Phone"
                          className="input input-bordered"
                        />
                      </div>

                      {/* Address Fields */}
                      <div className="pt-3 border-t border-slate-200">
                        <p className="text-sm font-medium text-slate-600 mb-3">Address</p>
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={wizardData.newCustomer.address?.line1 || ""}
                            onChange={(e) => setWizardData(prev => ({
                              ...prev,
                              newCustomer: {
                                ...prev.newCustomer,
                                address: { ...prev.newCustomer.address, line1: e.target.value }
                              }
                            }))}
                            placeholder="Address Line 1 *"
                            className="input input-bordered w-full"
                          />
                          <input
                            type="text"
                            value={wizardData.newCustomer.address?.line2 || ""}
                            onChange={(e) => setWizardData(prev => ({
                              ...prev,
                              newCustomer: {
                                ...prev.newCustomer,
                                address: { ...prev.newCustomer.address, line2: e.target.value }
                              }
                            }))}
                            placeholder="Address Line 2"
                            className="input input-bordered w-full"
                          />
                          <div className="grid grid-cols-2 gap-3">
                            <input
                              type="text"
                              value={wizardData.newCustomer.address?.town || ""}
                              onChange={(e) => setWizardData(prev => ({
                                ...prev,
                                newCustomer: {
                                  ...prev.newCustomer,
                                  address: { ...prev.newCustomer.address, town: e.target.value }
                                }
                              }))}
                              placeholder="Town/City *"
                              className="input input-bordered"
                            />
                            <input
                              type="text"
                              value={wizardData.newCustomer.address?.county || ""}
                              onChange={(e) => setWizardData(prev => ({
                                ...prev,
                                newCustomer: {
                                  ...prev.newCustomer,
                                  address: { ...prev.newCustomer.address, county: e.target.value }
                                }
                              }))}
                              placeholder="County"
                              className="input input-bordered"
                            />
                          </div>
                          <input
                            type="text"
                            value={wizardData.newCustomer.address?.postcode || ""}
                            onChange={(e) => setWizardData(prev => ({
                              ...prev,
                              newCustomer: {
                                ...prev.newCustomer,
                                address: { ...prev.newCustomer.address, postcode: e.target.value.toUpperCase() }
                              }
                            }))}
                            placeholder="Postcode *"
                            className="input input-bordered w-40"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2 mb-3">
                        <input
                          type="text"
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          placeholder="Search customers..."
                          className="input input-bordered flex-1"
                        />
                        <button
                          onClick={() => setWizardData(prev => ({ ...prev, isNewCustomer: true }))}
                          className="btn bg-[#0066CC] hover:bg-[#0052a3] text-white border-none"
                        >
                          + New
                        </button>
                      </div>
                      <div className="border border-slate-200 rounded-xl max-h-36 overflow-y-auto divide-y">
                        {isLoadingCustomers ? (
                          <div className="flex justify-center py-6">
                            <span className="loading loading-spinner loading-md text-[#0066CC]"></span>
                          </div>
                        ) : filteredCustomers.length === 0 ? (
                          <div className="text-center py-6 text-slate-500">No customers found</div>
                        ) : (
                          filteredCustomers.slice(0, 8).map((c) => (
                            <button
                              key={c.id || c._id}
                              onClick={() => selectCustomer(c)}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50"
                            >
                              <p className="font-medium">{c.displayName || `${c.firstName} ${c.lastName}`}</p>
                              <p className="text-sm text-slate-500">{c.email} {c.phone && `| ${c.phone}`}</p>
                            </button>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Part Exchange */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold">Part Exchange</h3>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={wizardData.hasPx}
                        onChange={(e) => setWizardData(prev => ({ ...prev, hasPx: e.target.checked }))}
                        className="checkbox checkbox-sm checkbox-primary"
                      />
                      <span className="text-sm">Has Part Exchange</span>
                    </label>
                  </div>

                  {wizardData.hasPx && (
                    <div className="border border-slate-200 rounded-xl p-4 space-y-4">
                      {/* Search Mode Toggle */}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setPxSearchMode("existing")}
                          className={`btn btn-sm flex-1 ${pxSearchMode === "existing" ? "btn-primary" : "btn-ghost"}`}
                        >
                          Search Existing Appraisal
                        </button>
                        <button
                          type="button"
                          onClick={() => setPxSearchMode("new")}
                          className={`btn btn-sm flex-1 ${pxSearchMode === "new" ? "btn-primary" : "btn-ghost"}`}
                        >
                          New VRM Lookup
                        </button>
                      </div>

                      {/* Existing Appraisal Search */}
                      {pxSearchMode === "existing" && (
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={pxAppraisalSearch}
                            onChange={(e) => {
                              setPxAppraisalSearch(e.target.value.toUpperCase());
                              searchAppraisals(e.target.value);
                            }}
                            placeholder="Search by VRM..."
                            className="input input-bordered w-full font-mono"
                          />
                          {isSearchingAppraisals && (
                            <div className="flex justify-center py-4">
                              <span className="loading loading-spinner loading-md text-[#0066CC]"></span>
                            </div>
                          )}
                          {!isSearchingAppraisals && pxAppraisalResults.length > 0 && (
                            <div className="border border-slate-200 rounded-lg max-h-32 overflow-y-auto divide-y">
                              {pxAppraisalResults.map((apr) => (
                                <button
                                  key={apr.id || apr._id}
                                  onClick={() => selectAppraisalForPx(apr)}
                                  className="w-full text-left px-3 py-2 hover:bg-slate-50"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-sm bg-slate-100 px-2 py-0.5 rounded">
                                      {apr.vehicleReg || apr.reg}
                                    </span>
                                    <span className="text-sm">
                                      {apr.vehicleMake || apr.make} {apr.vehicleModel || apr.model}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                      ({apr.type === "customer_px" ? "Customer PX" : "Dealer Appraisal"})
                                    </span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                          {!isSearchingAppraisals && pxAppraisalSearch.length >= 2 && pxAppraisalResults.length === 0 && (
                            <p className="text-sm text-slate-500 text-center py-2">No appraisals found for this VRM</p>
                          )}
                        </div>
                      )}

                      {/* New VRM Lookup */}
                      {pxSearchMode === "new" && (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={wizardData.px.vrm}
                            onChange={(e) => setWizardData(prev => ({ ...prev, px: { ...prev.px, vrm: e.target.value.toUpperCase() } }))}
                            placeholder="VRM"
                            className="input input-bordered flex-1 font-mono font-bold uppercase"
                          />
                          <button
                            type="button"
                            onClick={handlePxLookup}
                            disabled={isLookingUpPx}
                            className="btn bg-slate-700 text-white border-none"
                          >
                            {isLookingUpPx ? <span className="loading loading-spinner loading-sm"></span> : "Lookup"}
                          </button>
                        </div>
                      )}

                      {/* Vehicle Details (shown when VRM is set) */}
                      {wizardData.px.vrm && (
                        <>
                          <div className="grid grid-cols-3 gap-3">
                            <input
                              type="text"
                              value={wizardData.px.make}
                              onChange={(e) => setWizardData(prev => ({ ...prev, px: { ...prev.px, make: e.target.value } }))}
                              placeholder="Make *"
                              className="input input-bordered input-sm"
                            />
                            <input
                              type="text"
                              value={wizardData.px.model}
                              onChange={(e) => setWizardData(prev => ({ ...prev, px: { ...prev.px, model: e.target.value } }))}
                              placeholder="Model *"
                              className="input input-bordered input-sm"
                            />
                            <input
                              type="number"
                              value={wizardData.px.year}
                              onChange={(e) => setWizardData(prev => ({ ...prev, px: { ...prev.px, year: e.target.value } }))}
                              placeholder="Year *"
                              className="input input-bordered input-sm"
                            />
                            <input
                              type="number"
                              value={wizardData.px.mileage}
                              onChange={(e) => setWizardData(prev => ({ ...prev, px: { ...prev.px, mileage: e.target.value } }))}
                              placeholder="Mileage *"
                              className="input input-bordered input-sm"
                            />
                            <input
                              type="number"
                              step="0.01"
                              value={wizardData.px.allowance}
                              onChange={(e) => setWizardData(prev => ({ ...prev, px: { ...prev.px, allowance: e.target.value } }))}
                              placeholder="Allowance *"
                              className="input input-bordered input-sm"
                            />
                            <input
                              type="number"
                              step="0.01"
                              value={wizardData.px.settlementAmount}
                              onChange={(e) => setWizardData(prev => ({ ...prev, px: { ...prev.px, settlementAmount: e.target.value } }))}
                              placeholder="Settlement"
                              className="input input-bordered input-sm"
                            />
                          </div>

                          {/* VAT Qualifying Toggle */}
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={wizardData.px.vatQualifying}
                              onChange={(e) => setWizardData(prev => ({ ...prev, px: { ...prev.px, vatQualifying: e.target.checked } }))}
                              className="checkbox checkbox-sm checkbox-primary"
                            />
                            <span className="text-sm">VAT Qualifying</span>
                          </label>

                          {/* Finance Fields (shown when settlement > 0) */}
                          {parseFloat(wizardData.px.settlementAmount) > 0 && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-3">
                              <p className="text-sm font-medium text-amber-800">Settlement Finance Details</p>
                              <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={wizardData.px.hasFinance}
                                    onChange={(e) => setWizardData(prev => ({
                                      ...prev,
                                      px: { ...prev.px, hasFinance: e.target.checked }
                                    }))}
                                    className="checkbox checkbox-sm"
                                  />
                                  <span className="text-sm">Has Finance</span>
                                </label>
                              </div>
                              {wizardData.px.hasFinance && (
                                <>
                                  <select
                                    value={wizardData.px.financeCompanyId}
                                    onChange={(e) => {
                                      const fc = financeCompanies.find(c => (c.id || c._id) === e.target.value);
                                      setWizardData(prev => ({
                                        ...prev,
                                        px: {
                                          ...prev.px,
                                          financeCompanyId: e.target.value,
                                          financeCompanyName: fc?.displayName || fc?.name || ""
                                        }
                                      }));
                                    }}
                                    className="select select-bordered select-sm w-full"
                                  >
                                    <option value="">Select Finance Company</option>
                                    {financeCompanies.map((fc) => (
                                      <option key={fc.id || fc._id} value={fc.id || fc._id}>
                                        {fc.displayName || fc.name}
                                      </option>
                                    ))}
                                  </select>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={wizardData.px.hasSettlementInWriting}
                                      onChange={(e) => setWizardData(prev => ({
                                        ...prev,
                                        px: { ...prev.px, hasSettlementInWriting: e.target.checked }
                                      }))}
                                      className="checkbox checkbox-sm"
                                    />
                                    <span className="text-sm">Have settlement in writing</span>
                                  </label>
                                  {!wizardData.px.hasSettlementInWriting && (
                                    <p className="text-xs text-amber-700">
                                      Note: Settlement in writing is required before deal can be completed
                                    </p>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Pricing & Add-ons */}
            {currentStep === 3 && (
              <div className="space-y-6">
                {/* Pricing */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Pricing</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="form-control">
                      <label className="label"><span className="label-text font-medium">Sale Price (Gross) *</span></label>
                      <input
                        type="number"
                        step="0.01"
                        value={wizardData.salePriceGross}
                        onChange={(e) => setWizardData(prev => ({ ...prev, salePriceGross: e.target.value }))}
                        placeholder="0.00"
                        className="input input-bordered w-full"
                      />
                    </div>
                    <div className="form-control">
                      <label className="label"><span className="label-text font-medium">VAT Scheme</span></label>
                      <div className={`px-3 py-2 rounded-lg border ${
                        wizardData.vatScheme === "VAT_QUALIFYING"
                          ? "bg-blue-50 border-blue-200 text-blue-700"
                          : "bg-slate-50 border-slate-200 text-slate-700"
                      }`}>
                        {wizardData.vatScheme === "VAT_QUALIFYING" ? "VAT Qualifying" : "Margin Scheme"}
                        <span className="text-xs ml-2 opacity-60">(from vehicle)</span>
                      </div>
                    </div>
                    <div className="form-control">
                      <label className="label"><span className="label-text font-medium">Payment Type</span></label>
                      <select
                        value={wizardData.paymentType}
                        onChange={(e) => setWizardData(prev => ({ ...prev, paymentType: e.target.value }))}
                        className="select select-bordered w-full"
                      >
                        <option value="CASH">Cash</option>
                        <option value="CARD">Card</option>
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                        <option value="FINANCE">Finance</option>
                        <option value="MIXED">Mixed</option>
                      </select>
                    </div>
                    <div className="form-control">
                      <label className="label"><span className="label-text font-medium">Deposit Amount</span></label>
                      <input
                        type="number"
                        step="0.01"
                        value={wizardData.depositAmount}
                        onChange={(e) => setWizardData(prev => ({ ...prev, depositAmount: e.target.value }))}
                        placeholder="0.00"
                        className="input input-bordered w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Delivery */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Delivery</h3>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={wizardData.delivery?.isFree || false}
                        onChange={(e) => setWizardData(prev => ({
                          ...prev,
                          delivery: { ...prev.delivery, isFree: e.target.checked, amount: e.target.checked ? "" : prev.delivery?.amount }
                        }))}
                        className="checkbox checkbox-sm checkbox-primary"
                      />
                      <span className="text-sm">Free Delivery</span>
                    </label>
                    {!wizardData.delivery?.isFree && (
                      <input
                        type="number"
                        step="0.01"
                        value={wizardData.delivery?.amount || ""}
                        onChange={(e) => setWizardData(prev => ({
                          ...prev,
                          delivery: { ...prev.delivery, amount: e.target.value }
                        }))}
                        placeholder="Delivery amount"
                        className="input input-bordered input-sm w-40"
                      />
                    )}
                  </div>
                </div>

                {/* Customer Finance Selection */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Customer Finance</h3>
                  <label className="flex items-center gap-2 cursor-pointer mb-3">
                    <input
                      type="checkbox"
                      checked={wizardData.financeSelection?.isFinanced || false}
                      onChange={(e) => setWizardData(prev => ({
                        ...prev,
                        financeSelection: {
                          ...prev.financeSelection,
                          isFinanced: e.target.checked,
                          toBeConfirmed: !e.target.checked ? false : prev.financeSelection?.toBeConfirmed
                        }
                      }))}
                      className="checkbox checkbox-sm checkbox-primary"
                    />
                    <span className="text-sm">Customer is using finance</span>
                  </label>
                  {wizardData.financeSelection?.isFinanced && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={wizardData.financeSelection?.toBeConfirmed || false}
                          onChange={(e) => setWizardData(prev => ({
                            ...prev,
                            financeSelection: {
                              ...prev.financeSelection,
                              toBeConfirmed: e.target.checked,
                              financeCompanyId: e.target.checked ? "" : prev.financeSelection?.financeCompanyId
                            }
                          }))}
                          className="checkbox checkbox-sm"
                        />
                        <span className="text-sm">To Be Confirmed</span>
                      </label>
                      {!wizardData.financeSelection?.toBeConfirmed && (
                        <select
                          value={wizardData.financeSelection?.financeCompanyId || ""}
                          onChange={(e) => {
                            const fc = financeCompanies.find(c => (c.id || c._id) === e.target.value);
                            setWizardData(prev => ({
                              ...prev,
                              financeSelection: {
                                ...prev.financeSelection,
                                financeCompanyId: e.target.value,
                                financeCompanyName: fc?.displayName || fc?.name || ""
                              }
                            }));
                          }}
                          className="select select-bordered select-sm w-full"
                        >
                          <option value="">Select Finance Company</option>
                          {financeCompanies.map((fc) => (
                            <option key={fc.id || fc._id} value={fc.id || fc._id}>
                              {fc.displayName || fc.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </div>

                {/* Add-ons */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold">Add-ons</h3>
                    {wizardData.addOns.length > 0 && (
                      <span className="text-sm text-slate-500">
                        {wizardData.addOns.length} selected ({formatCurrency(wizardData.addOns.reduce((sum, a) => sum + (parseFloat(a.unitPriceNet) || 0), 0))} net)
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={addOnSearch}
                    onChange={(e) => setAddOnSearch(e.target.value)}
                    placeholder="Search add-ons..."
                    className="input input-bordered w-full mb-3"
                  />
                  <div className="border border-slate-200 rounded-xl max-h-48 overflow-y-auto">
                    {products.length === 0 ? (
                      <div className="text-center py-6 text-slate-500">
                        No add-on products configured. Add them in Settings.
                      </div>
                    ) : (
                      filteredAddOns.map((p) => {
                        const isSelected = wizardData.addOns.some(a => a.productId === (p.id || p._id));
                        return (
                          <div
                            key={p.id || p._id}
                            onClick={() => toggleAddOn(p)}
                            className={`px-4 py-3 border-b border-slate-100 last:border-0 cursor-pointer flex items-center justify-between ${
                              isSelected ? "bg-blue-50" : "hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleAddOn(p)}
                                className="checkbox checkbox-sm checkbox-primary"
                              />
                              <div>
                                <p className="font-medium">{p.name}</p>
                                <p className="text-sm text-slate-500">{p.category}</p>
                              </div>
                            </div>
                            <span className="font-semibold">{formatCurrency(p.defaultPriceNet)}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Review & Confirm</h3>

                {/* Vehicle Summary */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-slate-500 mb-2">VEHICLE</h4>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-lg bg-white px-3 py-1 rounded border">
                      {wizardData.vehicle?.regCurrent}
                    </span>
                    <div>
                      <p className="font-semibold">{wizardData.vehicle?.make} {wizardData.vehicle?.model}</p>
                      <p className="text-sm text-slate-500">{wizardData.vehicle?.year} | {wizardData.vehicle?.colour}</p>
                    </div>
                  </div>
                </div>

                {/* Customer Summary */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-slate-500 mb-2">CUSTOMER</h4>
                  {wizardData.customer ? (
                    <p className="font-medium">{wizardData.customer.displayName}</p>
                  ) : wizardData.isNewCustomer ? (
                    <p className="font-medium">{wizardData.newCustomer.firstName} {wizardData.newCustomer.lastName} (New)</p>
                  ) : (
                    <p className="text-slate-500">No customer selected</p>
                  )}
                </div>

                {/* Pricing Summary */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-slate-500 mb-2">PRICING</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Sale Price (Gross)</span>
                      <span className="font-semibold">{formatCurrency(wizardData.salePriceGross)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-500">
                      <span>VAT Scheme</span>
                      <span>{wizardData.vatScheme === "VAT_QUALIFYING" ? "VAT Qualifying" : "Margin"}</span>
                    </div>
                    {wizardData.addOns.length > 0 && (
                      <div className="flex justify-between">
                        <span>Add-ons ({wizardData.addOns.length})</span>
                        <span className="font-semibold">
                          {formatCurrency(wizardData.addOns.reduce((sum, a) => sum + (parseFloat(a.unitPriceNet) || 0), 0))}
                        </span>
                      </div>
                    )}
                    {wizardData.depositAmount && parseFloat(wizardData.depositAmount) > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>Deposit to Take</span>
                        <span className="font-semibold">{formatCurrency(wizardData.depositAmount)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Part Exchange Summary */}
                {wizardData.hasPx && wizardData.px.vrm && (
                  <div className="bg-amber-50 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-amber-700 mb-2">PART EXCHANGE</h4>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border">{wizardData.px.vrm}</span>
                      <span>{wizardData.px.make} {wizardData.px.model}</span>
                    </div>
                    <div className="mt-2 flex gap-4 text-sm">
                      <span>Allowance: {formatCurrency(wizardData.px.allowance)}</span>
                      {wizardData.px.settlementAmount && <span>Settlement: {formatCurrency(wizardData.px.settlementAmount)}</span>}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
            <button
              onClick={currentStep === 1 ? handleCancel : goBack}
              className="btn btn-ghost"
            >
              {currentStep === 1 ? "Cancel" : (
                <>
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </>
              )}
            </button>

            {currentStep === STEPS.length ? (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !canProceed()}
                className="btn bg-emerald-600 hover:bg-emerald-700 text-white border-none"
              >
                {isSubmitting ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  <>
                    Create Deal
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={goNext}
                disabled={!canProceed()}
                className="btn bg-[#0066CC] hover:bg-[#0052a3] text-white border-none"
              >
                Continue
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
