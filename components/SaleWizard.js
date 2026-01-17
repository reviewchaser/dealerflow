import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import { toast } from "react-hot-toast";
import ContactPicker from "@/components/ContactPicker";

const STEPS = [
  { id: 1, title: "Vehicle & Sale Type" },
  { id: 2, title: "Customer & PX" },
  { id: 3, title: "Pricing & Options" },
  { id: 4, title: "Deposit" },
  { id: 5, title: "Review" },
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
  buyerUse: "PERSONAL",
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
  // Legacy single PX (for backwards compat with saved wizard data)
  px: {
    vrm: "",
    make: "",
    model: "",
    year: "",
    mileage: "",
    colour: "",
    fuelType: "",
    motExpiry: "",
    dateOfRegistration: "",
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
  // Multiple part exchanges array (max 2)
  partExchanges: [],

  // Step 3: Pricing & Add-ons
  salePriceGross: "",
  vatScheme: "MARGIN",
  addOns: [],

  // Step 4: Deposit
  wantsDeposit: false, // "Would customer like to leave a deposit?"
  depositAmount: "",
  depositMethod: "CARD",

  // Delivery
  delivery: {
    amountGross: "", // Gross amount (inc VAT if VAT registered)
    amountNet: "",   // Net amount (calculated if VAT registered)
    vatAmount: "",   // VAT amount (calculated if VAT registered)
    amount: "",      // Legacy field
    isFree: false,
  },

  // Finance selection
  financeSelection: {
    isFinanced: false,
    financeCompanyId: "",
    financeCompanyName: "",
    toBeConfirmed: false,
  },

  // Agreed work items (dealer commitments)
  requests: [],
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

  // Dealer settings (for VAT rate)
  const [dealer, setDealer] = useState(null);

  // PX duplicate warning
  const [pxDuplicateWarning, setPxDuplicateWarning] = useState(null);

  // Custom add-on form
  const [showCustomAddOnForm, setShowCustomAddOnForm] = useState(false);
  const [customAddOn, setCustomAddOn] = useState({
    name: "",
    unitPriceGross: "",
    category: "OTHER",
    vatTreatment: "STANDARD",
  });

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
      fetchDealer();
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

  const fetchDealer = async () => {
    try {
      const res = await fetch("/api/dealer");
      if (res.ok) {
        const data = await res.json();
        setDealer(data);

        // Auto-add default warranty if enabled and this is a fresh wizard (no saved data)
        const saved = localStorage.getItem(STORAGE_KEY);
        const dw = data.salesSettings?.defaultWarranty;
        if (!saved && dw?.enabled) {
          const warrantyAddOn = {
            productId: `warranty_default_${Date.now()}`,
            name: dw.name || "Standard Warranty",
            qty: 1,
            unitPriceNet: dw.type === "PAID" ? (dw.priceNet || 0) : 0,
            vatTreatment: "NO_VAT", // Warranties are typically VAT exempt
            category: "WARRANTY",
            isCustom: true,
            isDefaultWarranty: true, // Flag to identify this is the default warranty
            durationMonths: dw.durationMonths || 3,
          };
          setWizardData(prev => ({
            ...prev,
            addOns: [...prev.addOns, warrantyAddOn],
          }));
        }
      }
    } catch (e) {
      console.error("[SaleWizard] Failed to fetch dealer:", e);
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

  // Add current PX to the partExchanges array (max 2)
  const addCurrentPxToList = () => {
    const currentPx = wizardData.px;
    if (!currentPx.vrm || !currentPx.allowance) {
      toast.error("Enter VRM and allowance before adding");
      return;
    }
    if ((wizardData.partExchanges?.length || 0) >= 2) {
      toast.error("Maximum 2 part exchanges allowed");
      return;
    }
    // Check for duplicate VRM in existing PXs
    if (wizardData.partExchanges?.some(px => px.vrm === currentPx.vrm)) {
      toast.error("This vehicle is already added as a part exchange");
      return;
    }

    setWizardData(prev => ({
      ...prev,
      partExchanges: [...(prev.partExchanges || []), { ...currentPx }],
      // Reset the current px form for next entry
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
    }));
    setPxDuplicateWarning(null);
    toast.success(`Added ${currentPx.make} ${currentPx.model} as part exchange`);
  };

  // Remove a PX from the list
  const removePxFromList = (index) => {
    setWizardData(prev => ({
      ...prev,
      partExchanges: prev.partExchanges.filter((_, i) => i !== index),
    }));
  };

  // PX VRM Lookup
  const handlePxLookup = async () => {
    const vrm = wizardData.px.vrm?.replace(/\s/g, "").toUpperCase();
    if (!vrm || vrm.length < 2) {
      toast.error("Enter a valid registration");
      return;
    }

    // Clear any previous duplicate warning
    setPxDuplicateWarning(null);

    setIsLookingUpPx(true);
    try {
      // First check if this VRM already exists in stock
      const stockCheckRes = await fetch(`/api/vehicles?regCurrent=${vrm}`);
      if (stockCheckRes.ok) {
        const stockData = await stockCheckRes.json();
        const existingVehicle = Array.isArray(stockData)
          ? stockData.find(v => v.regCurrent?.toUpperCase() === vrm)
          : stockData.vehicles?.find(v => v.regCurrent?.toUpperCase() === vrm);

        if (existingVehicle) {
          // Vehicle exists in stock - show warning and block
          setPxDuplicateWarning({
            vrm,
            stockNumber: existingVehicle.stockNumber,
            make: existingVehicle.make,
            model: existingVehicle.model,
          });
          setIsLookingUpPx(false);
          toast.error("This vehicle is already in your stock book");
          return;
        }
      }
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
          colour: dvlaData.colour || motData?.primaryColour || prev.px.colour,
          fuelType: dvlaData.fuelType || motData?.fuelType || prev.px.fuelType,
          motExpiry: motData?.motExpiryDate || prev.px.motExpiry,
          dateOfRegistration: dvlaData.monthOfFirstRegistration || dvlaData.firstRegistration || prev.px.dateOfRegistration,
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
        addOns: wizardData.addOns.map(a => ({
          productId: a.productId,
          name: a.name,
          qty: a.qty || 1,
          unitPriceNet: parseFloat(a.unitPriceNet) || 0,
          vatTreatment: a.vatTreatment || "STANDARD",
          vatRate: 0.2,
        })),
        // Delivery with VAT breakdown
        delivery: {
          amount: parseFloat(wizardData.delivery?.amountGross || wizardData.delivery?.amount) || 0,
          amountGross: parseFloat(wizardData.delivery?.amountGross) || 0,
          amountNet: parseFloat(wizardData.delivery?.amountNet) || 0,
          vatAmount: parseFloat(wizardData.delivery?.vatAmount) || 0,
          isFree: wizardData.delivery?.isFree || false,
        },
        // Finance selection
        financeSelection: wizardData.financeSelection?.isFinanced ? {
          isFinanced: true,
          financeCompanyContactId: wizardData.financeSelection.financeCompanyId || undefined,
          toBeConfirmed: wizardData.financeSelection.toBeConfirmed || false,
        } : undefined,
        // Agreed work items
        requests: (wizardData.requests || [])
          .filter(r => r.title?.trim())
          .map(r => ({
            title: r.title.trim(),
            details: r.details?.trim() || "",
            type: r.type || "PREP",
            status: "REQUESTED",
          })),
        // Part exchanges - embed in deal for display
        partExchanges: [
          ...(wizardData.partExchanges || []),
          // Also include current px form if filled but not added to list
          ...(wizardData.px?.vrm && wizardData.px?.allowance ? [wizardData.px] : []),
        ].map(px => ({
          vrm: px.vrm,
          make: px.make || "",
          model: px.model || "",
          year: parseInt(px.year) || undefined,
          mileage: parseInt(px.mileage) || undefined,
          colour: px.colour || "",
          fuelType: px.fuelType || "",
          allowance: parseFloat(px.allowance) || 0,
          settlement: parseFloat(px.settlementAmount || px.settlement) || 0,
          vatQualifying: px.vatQualifying || false,
          hasFinance: px.hasFinance || false,
          financeCompanyContactId: px.financeCompanyId || undefined,
          financeCompanyName: px.financeCompanyName || "",
          hasSettlementInWriting: px.hasSettlementInWriting || false,
          conditionNotes: px.conditionNotes || "",
        })),
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

      // Handle part exchanges (multiple or single)
      const allPxs = [
        ...(wizardData.partExchanges || []),
        // Also include current px form if filled but not added to list
        ...(wizardData.px?.vrm && wizardData.px?.allowance ? [wizardData.px] : []),
      ];

      for (const pxData of allPxs) {
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

      // Take deposit if customer wants one and amount is provided
      if (wizardData.wantsDeposit && wizardData.depositAmount && parseFloat(wizardData.depositAmount) > 0) {
        await fetch(`/api/deals/${dealData.id}/take-deposit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: parseFloat(wizardData.depositAmount),
            method: wizardData.depositMethod || "CARD",
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
        // Pricing - requires sale price
        return wizardData.salePriceGross && parseFloat(wizardData.salePriceGross) > 0;
      case 4:
        // Deposit - if they want a deposit, amount is required
        if (wizardData.wantsDeposit) {
          return wizardData.depositAmount && parseFloat(wizardData.depositAmount) > 0;
        }
        return true; // No deposit is fine
      case 5:
        // Review - always can proceed
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

  // Add custom add-on
  const handleAddCustomAddOn = () => {
    if (!customAddOn.name?.trim()) {
      toast.error("Please enter a name for the add-on");
      return;
    }
    if (!customAddOn.unitPriceGross || parseFloat(customAddOn.unitPriceGross) < 0) {
      toast.error("Please enter a valid price");
      return;
    }

    const grossPrice = parseFloat(customAddOn.unitPriceGross) || 0;
    const vatTreatment = customAddOn.vatTreatment || "STANDARD";

    // Calculate net from gross based on VAT treatment
    let netPrice;
    if (vatTreatment === "STANDARD") {
      // Standard VAT at 20%: net = gross / 1.2
      netPrice = grossPrice / 1.2;
    } else {
      // EXEMPT or ZERO_RATED: no VAT, so net = gross
      netPrice = grossPrice;
    }

    const customId = `custom_${Date.now()}`;
    setWizardData(prev => ({
      ...prev,
      addOns: [...prev.addOns, {
        productId: customId,
        name: customAddOn.name.trim(),
        qty: 1,
        unitPriceNet: netPrice,
        vatTreatment: vatTreatment,
        category: customAddOn.category || "OTHER",
        isCustom: true,
      }],
    }));

    // Reset form
    setCustomAddOn({
      name: "",
      unitPriceGross: "",
      category: "OTHER",
      vatTreatment: "STANDARD",
    });
    setShowCustomAddOnForm(false);
  };

  // Remove add-on by productId
  const removeAddOn = (productId) => {
    setWizardData(prev => ({
      ...prev,
      addOns: prev.addOns.filter(a => a.productId !== productId),
    }));
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" />

      {/* Wizard Modal - Inline Popup */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] md:max-h-[85vh] flex flex-col">
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
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
                          <option value="PERSONAL">Personal</option>
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
                    <h3 className="text-lg font-semibold">Part Exchange(s)</h3>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={wizardData.hasPx || (wizardData.partExchanges?.length > 0)}
                        onChange={(e) => setWizardData(prev => ({ ...prev, hasPx: e.target.checked }))}
                        className="checkbox checkbox-sm checkbox-primary"
                      />
                      <span className="text-sm">Has Part Exchange</span>
                    </label>
                  </div>

                  {/* List of Added Part Exchanges */}
                  {wizardData.partExchanges?.length > 0 && (
                    <div className="mb-4 space-y-2">
                      {wizardData.partExchanges.map((px, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-sm bg-emerald-100 px-2 py-0.5 rounded">{px.vrm}</span>
                              <span className="font-medium text-emerald-800">{px.make} {px.model}</span>
                              <span className="text-xs text-emerald-600">({px.year})</span>
                            </div>
                            <div className="text-sm text-emerald-700 mt-1">
                              Allowance: £{parseFloat(px.allowance).toLocaleString()}
                              {parseFloat(px.settlementAmount) > 0 && ` | Settlement: £${parseFloat(px.settlementAmount).toLocaleString()}`}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removePxFromList(idx)}
                            className="btn btn-sm btn-ghost text-red-500 hover:bg-red-50"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                      {wizardData.partExchanges.length >= 2 && (
                        <p className="text-xs text-slate-500 text-center">Maximum 2 part exchanges reached</p>
                      )}
                    </div>
                  )}

                  {(wizardData.hasPx || wizardData.partExchanges?.length > 0) && wizardData.partExchanges?.length < 2 && (
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
                        <>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={wizardData.px.vrm}
                              onChange={(e) => {
                                setPxDuplicateWarning(null); // Clear warning on input change
                                setWizardData(prev => ({ ...prev, px: { ...prev.px, vrm: e.target.value.toUpperCase() } }));
                              }}
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

                          {/* Duplicate vehicle warning */}
                          {pxDuplicateWarning && (
                            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                              <div className="flex items-start gap-2">
                                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                <div>
                                  <p className="text-sm font-medium text-red-800">
                                    This vehicle is already in stock
                                  </p>
                                  <p className="text-xs text-red-600 mt-1">
                                    {pxDuplicateWarning.make} {pxDuplicateWarning.model}
                                    {pxDuplicateWarning.stockNumber && ` (Stock #${pxDuplicateWarning.stockNumber})`}
                                  </p>
                                  <p className="text-xs text-red-600 mt-1">
                                    It cannot be added as a part exchange.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
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
                              onChange={(e) => {
                                const val = e.target.value;
                                setWizardData(prev => ({
                                  ...prev,
                                  px: {
                                    ...prev.px,
                                    settlementAmount: val,
                                    hasFinance: parseFloat(val) > 0 ? true : prev.px.hasFinance
                                  }
                                }));
                              }}
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
                                  <ContactPicker
                                    value={wizardData.px.financeCompanyId}
                                    onChange={(contactId, contact) => {
                                      setWizardData(prev => ({
                                        ...prev,
                                        px: {
                                          ...prev.px,
                                          financeCompanyId: contactId || "",
                                          financeCompanyName: contact?.displayName || contact?.companyName || ""
                                        }
                                      }));
                                    }}
                                    filterTypeTags={["FINANCE"]}
                                    placeholder="Search or add finance company..."
                                    allowCreate={true}
                                  />
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

                          {/* Add to List button - shows when VRM is set and < 2 PXs */}
                          <div className="flex justify-end pt-2 border-t border-slate-200 mt-4">
                            <button
                              type="button"
                              onClick={addCurrentPxToList}
                              className="btn btn-sm bg-emerald-600 hover:bg-emerald-700 text-white border-none gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              Add to Part Exchange List
                            </button>
                          </div>
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
                  </div>
                </div>

                {/* Delivery */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Delivery</h3>
                  <div className="flex items-center gap-4 flex-wrap">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={wizardData.delivery?.isFree || false}
                        onChange={(e) => setWizardData(prev => ({
                          ...prev,
                          delivery: {
                            ...prev.delivery,
                            isFree: e.target.checked,
                            amountGross: e.target.checked ? "" : prev.delivery?.amountGross,
                            amountNet: "",
                            vatAmount: "",
                            amount: "",
                          }
                        }))}
                        className="checkbox checkbox-sm checkbox-primary"
                      />
                      <span className="text-sm">Free Delivery</span>
                    </label>
                    {!wizardData.delivery?.isFree && (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.01"
                          value={wizardData.delivery?.amountGross || ""}
                          onChange={(e) => {
                            const gross = e.target.value;
                            const isVatReg = dealer?.salesSettings?.vatRegistered !== false;
                            const vatRate = dealer?.salesSettings?.vatRate || 0.2;
                            let net = "", vat = "";
                            if (isVatReg && gross) {
                              net = (parseFloat(gross) / (1 + vatRate)).toFixed(2);
                              vat = (parseFloat(gross) - parseFloat(net)).toFixed(2);
                            }
                            setWizardData(prev => ({
                              ...prev,
                              delivery: {
                                ...prev.delivery,
                                amountGross: gross,
                                amountNet: net,
                                vatAmount: vat,
                                amount: gross, // Legacy field
                              }
                            }));
                          }}
                          placeholder={dealer?.salesSettings?.vatRegistered !== false ? "Amount (inc VAT)" : "Amount"}
                          className="input input-bordered input-sm w-40"
                        />
                        {/* Show VAT breakdown if dealer is VAT registered and amount entered */}
                        {dealer?.salesSettings?.vatRegistered !== false && wizardData.delivery?.amountGross && (
                          <span className="text-xs text-slate-500">
                            (Net: £{wizardData.delivery?.amountNet || "0.00"} + VAT: £{wizardData.delivery?.vatAmount || "0.00"})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Delivery can be added or modified later before invoicing</p>
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
                        <ContactPicker
                          value={wizardData.financeSelection?.financeCompanyId || ""}
                          onChange={(contactId, contact) => {
                            setWizardData(prev => ({
                              ...prev,
                              financeSelection: {
                                ...prev.financeSelection,
                                financeCompanyId: contactId || "",
                                financeCompanyName: contact?.displayName || contact?.companyName || ""
                              }
                            }));
                          }}
                          filterTypeTags={["FINANCE"]}
                          placeholder="Search or add finance company..."
                          allowCreate={true}
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Add-ons */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold">Add-ons</h3>
                    <button
                      type="button"
                      onClick={() => setShowCustomAddOnForm(true)}
                      className="btn btn-sm btn-outline gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Custom Item
                    </button>
                  </div>

                  {/* Custom Add-on Form */}
                  {showCustomAddOnForm && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-3">
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-medium text-blue-900">New Custom Add-on</p>
                        <button
                          type="button"
                          onClick={() => setShowCustomAddOnForm(false)}
                          className="btn btn-ghost btn-xs"
                        >
                          Cancel
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="form-control">
                          <label className="label py-0"><span className="label-text text-xs">Name *</span></label>
                          <input
                            type="text"
                            value={customAddOn.name}
                            onChange={(e) => setCustomAddOn(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="e.g., Custom Alloy Wheels"
                            className="input input-bordered input-sm w-full"
                          />
                        </div>
                        <div className="form-control">
                          <label className="label py-0"><span className="label-text text-xs">Price (Inc. VAT) *</span></label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">£</span>
                            <input
                              type="number"
                              step="0.01"
                              value={customAddOn.unitPriceGross}
                              onChange={(e) => setCustomAddOn(prev => ({ ...prev, unitPriceGross: e.target.value }))}
                              placeholder="0.00"
                              className="input input-bordered input-sm w-full pl-7"
                            />
                          </div>
                        </div>
                        <div className="form-control">
                          <label className="label py-0"><span className="label-text text-xs">Category</span></label>
                          <select
                            value={customAddOn.category}
                            onChange={(e) => setCustomAddOn(prev => ({ ...prev, category: e.target.value }))}
                            className="select select-bordered select-sm w-full"
                          >
                            <option value="WARRANTY">Warranty</option>
                            <option value="PROTECTION">Protection</option>
                            <option value="ACCESSORY">Accessory</option>
                            <option value="COSMETIC">Cosmetic</option>
                            <option value="ADMIN">Admin</option>
                            <option value="OTHER">Other</option>
                          </select>
                        </div>
                        <div className="form-control">
                          <label className="label py-0"><span className="label-text text-xs">VAT</span></label>
                          <select
                            value={customAddOn.vatTreatment}
                            onChange={(e) => setCustomAddOn(prev => ({ ...prev, vatTreatment: e.target.value }))}
                            className="select select-bordered select-sm w-full"
                          >
                            <option value="STANDARD">Standard (20%)</option>
                            <option value="ZERO">Zero Rated</option>
                            <option value="NO_VAT">No VAT</option>
                          </select>
                        </div>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={handleAddCustomAddOn}
                          className="btn btn-sm bg-blue-500 hover:bg-blue-600 text-white border-none"
                        >
                          Add to Deal
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Selected Add-ons */}
                  {wizardData.addOns.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm text-slate-500 mb-2">
                        Selected ({wizardData.addOns.length}) - {formatCurrency(wizardData.addOns.reduce((sum, a) => sum + (parseFloat(a.unitPriceNet) || 0), 0))} net
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {wizardData.addOns.map((addon) => (
                          <div
                            key={addon.productId}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                              addon.isCustom
                                ? "bg-blue-100 text-blue-800"
                                : "bg-slate-100 text-slate-800"
                            }`}
                          >
                            <span>{addon.name}</span>
                            <span className="font-medium">{formatCurrency(addon.unitPriceNet)}</span>
                            {addon.isCustom && (
                              <span className="text-xs text-blue-600">(Custom)</span>
                            )}
                            <button
                              type="button"
                              onClick={() => removeAddOn(addon.productId)}
                              className="ml-1 hover:text-red-600"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Catalog Add-ons Search & List */}
                  <input
                    type="text"
                    value={addOnSearch}
                    onChange={(e) => setAddOnSearch(e.target.value)}
                    placeholder="Search catalog add-ons..."
                    className="input input-bordered w-full mb-3"
                  />
                  <div className="border border-slate-200 rounded-xl max-h-48 overflow-y-auto">
                    {products.length === 0 ? (
                      <div className="text-center py-6 text-slate-500">
                        <p className="text-sm">No catalog add-ons configured.</p>
                        <p className="text-xs mt-1">Use "Add Custom Item" above or configure add-ons in Settings.</p>
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
                                <p className="text-sm text-slate-500">
                                  {p.category}
                                  {p.costPrice != null && (
                                    <span className="ml-2 text-emerald-600">
                                      ({((p.defaultPriceNet - p.costPrice) / p.defaultPriceNet * 100).toFixed(0)}% margin)
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-semibold">{formatCurrency(p.defaultPriceNet)}</span>
                              {p.costPrice != null && (
                                <p className="text-xs text-slate-400">Cost: {formatCurrency(p.costPrice)}</p>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Agreed Work Items */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold">Agreed Work</h3>
                    <button
                      type="button"
                      onClick={() => {
                        setWizardData(prev => ({
                          ...prev,
                          requests: [
                            ...prev.requests,
                            { title: "", details: "", type: "PREP", status: "REQUESTED" }
                          ]
                        }));
                      }}
                      className="btn btn-sm btn-outline gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Item
                    </button>
                  </div>
                  <p className="text-sm text-slate-500 mb-3">
                    Record any work agreed with the customer (e.g., prep items, accessories to fit, cosmetic repairs).
                  </p>

                  {wizardData.requests.length === 0 ? (
                    <div className="border border-dashed border-slate-300 rounded-xl p-6 text-center text-slate-500">
                      <p className="text-sm">No agreed work items added yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {wizardData.requests.map((req, idx) => (
                        <div key={idx} className="border border-slate-200 rounded-xl p-4 bg-white">
                          <div className="flex items-start gap-3">
                            <div className="flex-1 space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div className="form-control">
                                  <label className="label py-0"><span className="label-text text-xs">Title *</span></label>
                                  <input
                                    type="text"
                                    value={req.title}
                                    onChange={(e) => {
                                      const newReqs = [...wizardData.requests];
                                      newReqs[idx].title = e.target.value;
                                      setWizardData(prev => ({ ...prev, requests: newReqs }));
                                    }}
                                    placeholder="e.g., Fit roof bars"
                                    className="input input-bordered input-sm w-full"
                                  />
                                </div>
                                <div className="form-control">
                                  <label className="label py-0"><span className="label-text text-xs">Type</span></label>
                                  <select
                                    value={req.type}
                                    onChange={(e) => {
                                      const newReqs = [...wizardData.requests];
                                      newReqs[idx].type = e.target.value;
                                      setWizardData(prev => ({ ...prev, requests: newReqs }));
                                    }}
                                    className="select select-bordered select-sm w-full"
                                  >
                                    <option value="PREP">Prep</option>
                                    <option value="ACCESSORY">Accessory</option>
                                    <option value="COSMETIC">Cosmetic</option>
                                    <option value="ADMIN">Admin</option>
                                    <option value="OTHER">Other</option>
                                  </select>
                                </div>
                              </div>
                              <div className="form-control">
                                <label className="label py-0"><span className="label-text text-xs">Details (optional)</span></label>
                                <input
                                  type="text"
                                  value={req.details}
                                  onChange={(e) => {
                                    const newReqs = [...wizardData.requests];
                                    newReqs[idx].details = e.target.value;
                                    setWizardData(prev => ({ ...prev, requests: newReqs }));
                                  }}
                                  placeholder="Additional details..."
                                  className="input input-bordered input-sm w-full"
                                />
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const newReqs = wizardData.requests.filter((_, i) => i !== idx);
                                setWizardData(prev => ({ ...prev, requests: newReqs }));
                              }}
                              className="btn btn-ghost btn-sm btn-square text-slate-400 hover:text-red-500"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Deposit */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Deposit</h3>

                {/* Deposit Toggle */}
                <div className="bg-slate-50 rounded-xl p-5">
                  <label className="flex items-start gap-4 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={wizardData.wantsDeposit || false}
                      onChange={(e) => setWizardData(prev => ({
                        ...prev,
                        wantsDeposit: e.target.checked,
                        depositAmount: e.target.checked ? prev.depositAmount : "",
                      }))}
                      className="checkbox checkbox-primary mt-1"
                    />
                    <div>
                      <span className="text-lg font-medium">Would customer like to leave a deposit?</span>
                      <p className="text-sm text-slate-500 mt-1">
                        A deposit secures the vehicle for the customer. You can take additional deposits or proceed directly to invoice later.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Deposit Details */}
                {wizardData.wantsDeposit && (
                  <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="form-control">
                        <label className="label"><span className="label-text font-medium">Deposit Amount *</span></label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">£</span>
                          <input
                            type="number"
                            step="0.01"
                            value={wizardData.depositAmount}
                            onChange={(e) => setWizardData(prev => ({ ...prev, depositAmount: e.target.value }))}
                            placeholder="0.00"
                            className="input input-bordered w-full pl-8"
                          />
                        </div>
                      </div>
                      <div className="form-control">
                        <label className="label"><span className="label-text font-medium">Payment Method</span></label>
                        <select
                          value={wizardData.depositMethod || "CARD"}
                          onChange={(e) => setWizardData(prev => ({ ...prev, depositMethod: e.target.value }))}
                          className="select select-bordered w-full"
                        >
                          <option value="CARD">Card</option>
                          <option value="CASH">Cash</option>
                          <option value="BANK_TRANSFER">Bank Transfer</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>
                    </div>

                    {/* Quick amount buttons */}
                    <div>
                      <label className="label pb-1"><span className="label-text text-slate-500">Quick select</span></label>
                      <div className="flex gap-2 flex-wrap">
                        {[100, 250, 500, 1000].map((amount) => (
                          <button
                            key={amount}
                            type="button"
                            onClick={() => setWizardData(prev => ({ ...prev, depositAmount: amount.toString() }))}
                            className={`btn btn-sm ${
                              wizardData.depositAmount === amount.toString()
                                ? "btn-primary"
                                : "btn-outline"
                            }`}
                          >
                            £{amount}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Info box */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex gap-3">
                    <svg className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm text-blue-800">
                      <p className="font-medium">What happens next?</p>
                      <p className="mt-1 text-blue-700">
                        {wizardData.wantsDeposit
                          ? "After creating the deal, a deposit receipt will be generated. You can then generate the full invoice when ready."
                          : "You can proceed without a deposit. A deposit can be taken later from the deal page, or you can go straight to generating an invoice."
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Review */}
            {currentStep === 5 && (
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

                {/* Part Exchange Summary - show all PXs */}
                {(wizardData.partExchanges?.length > 0 || (wizardData.hasPx && wizardData.px.vrm)) && (
                  <div className="bg-amber-50 rounded-xl p-4 space-y-3">
                    <h4 className="text-sm font-semibold text-amber-700 mb-2">
                      PART EXCHANGE{(wizardData.partExchanges?.length || 0) + (wizardData.px?.vrm ? 1 : 0) > 1 ? "S" : ""}
                    </h4>
                    {/* Show PXs from list */}
                    {wizardData.partExchanges?.map((px, idx) => (
                      <div key={idx} className="border-b border-amber-200 pb-2 last:border-0 last:pb-0">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border">{px.vrm}</span>
                          <span>{px.make} {px.model}</span>
                        </div>
                        <div className="mt-1 flex gap-4 text-sm">
                          <span>Allowance: {formatCurrency(px.allowance)}</span>
                          {px.settlementAmount && parseFloat(px.settlementAmount) > 0 && (
                            <span>Settlement: {formatCurrency(px.settlementAmount)}</span>
                          )}
                        </div>
                      </div>
                    ))}
                    {/* Show current PX form if filled */}
                    {wizardData.px?.vrm && (
                      <div className="border-b border-amber-200 pb-2 last:border-0 last:pb-0">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border">{wizardData.px.vrm}</span>
                          <span>{wizardData.px.make} {wizardData.px.model}</span>
                        </div>
                        <div className="mt-1 flex gap-4 text-sm">
                          <span>Allowance: {formatCurrency(wizardData.px.allowance)}</span>
                          {wizardData.px.settlementAmount && parseFloat(wizardData.px.settlementAmount) > 0 && (
                            <span>Settlement: {formatCurrency(wizardData.px.settlementAmount)}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Delivery Summary */}
                {(wizardData.delivery?.isFree || wizardData.delivery?.amountGross) && (
                  <div className="bg-purple-50 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-purple-700 mb-2">DELIVERY</h4>
                    <p className="font-medium text-purple-900">
                      {wizardData.delivery?.isFree
                        ? "Free Delivery"
                        : formatCurrency(wizardData.delivery.amountGross)
                      }
                    </p>
                  </div>
                )}

                {/* Finance Summary */}
                {wizardData.financeSelection?.isFinanced && (
                  <div className="bg-blue-50 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-blue-700 mb-2">FINANCE</h4>
                    <p className="font-medium text-blue-900">
                      {wizardData.financeSelection?.toBeConfirmed
                        ? "Finance - To Be Confirmed"
                        : wizardData.financeSelection?.financeCompanyName || "Finance company not specified"
                      }
                    </p>
                  </div>
                )}

                {/* Deposit Summary */}
                {wizardData.wantsDeposit && wizardData.depositAmount && (
                  <div className="bg-emerald-50 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-emerald-700 mb-2">DEPOSIT</h4>
                    <div className="flex justify-between items-center">
                      <p className="font-medium text-emerald-900">{formatCurrency(wizardData.depositAmount)}</p>
                      <span className="text-sm text-emerald-700">via {wizardData.depositMethod || "Card"}</span>
                    </div>
                  </div>
                )}

                {/* Agreed Work Summary */}
                {wizardData.requests?.filter(r => r.title?.trim()).length > 0 && (
                  <div className="bg-orange-50 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-orange-700 mb-2">AGREED WORK</h4>
                    <ul className="space-y-1">
                      {wizardData.requests.filter(r => r.title?.trim()).map((req, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm">
                          <svg className="w-4 h-4 text-orange-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                          </svg>
                          <span className="font-medium text-orange-900">{req.title}</span>
                          {req.details && <span className="text-orange-700">- {req.details}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* TBC Items Warning */}
                {wizardData.financeSelection?.toBeConfirmed && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="flex gap-3">
                      <svg className="w-5 h-5 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div>
                        <p className="font-medium text-amber-800">Items to be confirmed:</p>
                        <ul className="text-sm text-amber-700 mt-1 list-disc list-inside">
                          <li>Finance company details</li>
                        </ul>
                      </div>
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
