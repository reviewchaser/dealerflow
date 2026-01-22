import { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import ContactPicker from "@/components/ContactPicker";
import SignatureCapture from "@/components/SignatureCapture";
import InlineFormModal from "@/components/InlineFormModal";

// Format currency
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(amount);
};

// Format date helper
const formatDate = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

// Format datetime helper
const formatDateTime = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Status labels and colors
const STATUS_CONFIG = {
  DRAFT: { label: "Draft", color: "bg-slate-100 text-slate-600" },
  DEPOSIT_TAKEN: { label: "Deposit Taken", color: "bg-amber-100 text-amber-700" },
  INVOICED: { label: "Invoiced", color: "bg-blue-100 text-blue-700" },
  DELIVERED: { label: "Delivered", color: "bg-purple-100 text-purple-700" },
  COMPLETED: { label: "Completed", color: "bg-emerald-100 text-emerald-700" },
  CANCELLED: { label: "Cancelled", color: "bg-red-100 text-red-700" },
};

const VAT_SCHEME_LABELS = {
  MARGIN: "Margin Scheme",
  VAT_QUALIFYING: "VAT Qualifying",
  NO_VAT: "No VAT",
  ZERO: "Zero-rated",
  EXEMPT: "VAT Exempt",
};

const SALE_TYPE_OPTIONS = [
  { value: "RETAIL", label: "Retail", description: "Sale to end customer" },
  { value: "TRADE", label: "Trade", description: "Sale to motor trader" },
  { value: "EXPORT", label: "Export", description: "Export sale" },
];

const BUYER_USE_OPTIONS = [
  { value: "PERSONAL", label: "Personal use", description: "Consumer rights apply" },
  { value: "BUSINESS", label: "Business use", description: "B2B terms apply" },
];

const SALE_CHANNEL_OPTIONS = [
  { value: "IN_PERSON", label: "In person", description: "Customer saw vehicle on-site" },
  { value: "DISTANCE", label: "Distance", description: "Online/phone sale - 14 day cooling off" },
];

const PAYMENT_TYPE_OPTIONS = [
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "FINANCE", label: "Finance" },
  { value: "MIXED", label: "Mixed" },
];

const FINANCE_TYPE_OPTIONS = [
  { value: "HP", label: "Hire Purchase (HP)" },
  { value: "PCP", label: "Personal Contract Purchase (PCP)" },
  { value: "LEASE", label: "Lease" },
  { value: "PERSONAL_LOAN", label: "Personal Loan" },
  { value: "OTHER", label: "Other" },
];

const FINANCE_STATUS_OPTIONS = [
  { value: "QUOTED", label: "Quoted" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "APPROVED", label: "Approved" },
  { value: "DECLINED", label: "Declined" },
  { value: "PAID_OUT", label: "Paid Out" },
];

/**
 * DealDrawer - Display and manage deal details
 *
 * Props:
 * - dealId: The ID of the deal to display
 * - isOpen: Whether the drawer is open
 * - onClose: Function to call when closing the drawer
 * - onUpdate: Function to call when deal is updated
 */
export default function DealDrawer({
  dealId,
  isOpen,
  onClose,
  onUpdate,
}) {
  const [deal, setDeal] = useState(null);
  const [dealer, setDealer] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [actionLoading, setActionLoading] = useState(null);

  // Deposit modal state
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositMethod, setDepositMethod] = useState("CARD");
  const [depositReference, setDepositReference] = useState("");

  // Customer editing state
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [isEditingInvoiceTo, setIsEditingInvoiceTo] = useState(false);
  const [invoiceToOption, setInvoiceToOption] = useState("CUSTOMER"); // CUSTOMER or OTHER

  // Document state
  const [documents, setDocuments] = useState({ depositReceipt: null, invoice: null });

  // Handover pack state
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [handoverDocs, setHandoverDocs] = useState({
    invoice: true,
    pdi: false,
    serviceReceipt: false,
  });
  const [linkedSubmissions, setLinkedSubmissions] = useState({ pdi: null, serviceReceipt: null });
  const [isGeneratingPack, setIsGeneratingPack] = useState(false);
  const [isGeneratingHandover, setIsGeneratingHandover] = useState(false);

  // Deal details editing state
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [priceInput, setPriceInput] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReasonInput, setCancelReasonInput] = useState("");

  // Notes editing state
  const [notesInput, setNotesInput] = useState("");
  const [notesModified, setNotesModified] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Delivery confirmation modal state
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryForm, setDeliveryForm] = useState({
    deliveryMileage: "",
    customerConfirmed: false,
    notes: "",
  });

  // Add-on state
  const [showAddOnPicker, setShowAddOnPicker] = useState(false);
  const [availableAddOns, setAvailableAddOns] = useState([]);
  const [addOnsLoading, setAddOnsLoading] = useState(false);
  const [addOnQty, setAddOnQty] = useState(1);
  const [addOnPrice, setAddOnPrice] = useState("");
  const [showCustomAddOnForm, setShowCustomAddOnForm] = useState(false);
  const [customAddOn, setCustomAddOn] = useState({
    name: "",
    unitPriceGross: "",
    category: "OTHER",
    vatTreatment: "STANDARD",
    saveToCatalogue: false, // Option to save as reusable catalogue item
    costPrice: "", // Cost price for catalogue items
    termMonths: "", // For WARRANTY category
    claimLimit: "", // For WARRANTY category
  });

  // Agreed Work Items state
  const [showAgreedWorkModal, setShowAgreedWorkModal] = useState(false);
  const [agreedWorkForm, setAgreedWorkForm] = useState({
    title: "",
    details: "",
    type: "PREP",
    syncToVehicle: true,
  });

  // Part Exchange state
  const [showPxModal, setShowPxModal] = useState(false);
  const [pxForm, setPxForm] = useState({
    vrm: "",
    vin: "", // VIN from MOT API
    make: "",
    model: "",
    year: "",
    mileage: "",
    colour: "",
    fuelType: "",
    allowance: "",
    settlement: "",
    sourceType: "MANUAL",
    sourceId: null,
    conditionNotes: "",
    // Finance & VAT fields
    vatQualifying: false,
    hasFinance: false,
    financeCompanyContactId: "",
    financeCompanyName: "",
    hasSettlementInWriting: false,
  });
  const [financeCompanySearch, setFinanceCompanySearch] = useState("");
  const [financeCompanySuggestions, setFinanceCompanySuggestions] = useState([]);
  const [pxLoading, setPxLoading] = useState(false);
  const [pxLookupLoading, setPxLookupLoading] = useState(false);
  const [pxAppraisalSuggestions, setPxAppraisalSuggestions] = useState([]);
  const [pxAppraisalSearching, setPxAppraisalSearching] = useState(false);
  const [selectedPxAppraisal, setSelectedPxAppraisal] = useState(null);
  const [editingPxIndex, setEditingPxIndex] = useState(null); // null = adding, number = editing index

  // Signature capture state (invoice)
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [driverLink, setDriverLink] = useState(null);
  const [driverLinkLoading, setDriverLinkLoading] = useState(false);
  const [showDriverLinkModal, setShowDriverLinkModal] = useState(false);
  const [driverLinkPin, setDriverLinkPin] = useState("");

  // Deposit signature capture state
  const [showDepositSignatureModal, setShowDepositSignatureModal] = useState(false);

  // Invoice confirmation modal state
  const [showInvoiceConfirmModal, setShowInvoiceConfirmModal] = useState(false);
  const [invoiceConfirmForm, setInvoiceConfirmForm] = useState({
    paymentMethod: "CASH",
    financeCompanyContactId: "",
    financeCompanyName: "",
    financeAdvance: "",
    cancelFinance: false,
    // PX confirmations will be populated from deal.partExchanges
  });

  // Schedule delivery state
  const [showScheduleDeliveryModal, setShowScheduleDeliveryModal] = useState(false);
  const [scheduleDeliveryForm, setScheduleDeliveryForm] = useState({
    date: "",
    time: "",
    notes: "",
    sameAsCustomer: true,
    addressLine1: "",
    addressLine2: "",
    town: "",
    postcode: "",
  });
  const [scheduleDeliveryLoading, setScheduleDeliveryLoading] = useState(false);

  // Delivery amount input - local state to prevent reload on every keystroke
  const [deliveryAmountInput, setDeliveryAmountInput] = useState("");

  // Edit warranty state
  const [showEditWarrantyModal, setShowEditWarrantyModal] = useState(false);
  const [warrantyEditForm, setWarrantyEditForm] = useState({
    name: "",
    description: "",
    durationMonths: "",
    claimLimit: "",
    priceGross: "",
    type: "DEFAULT",
  });
  const [warrantyEditLoading, setWarrantyEditLoading] = useState(false);

  // Third-party warranty products state
  const [warrantyProducts, setWarrantyProducts] = useState([]);
  const [warrantyProductsLoading, setWarrantyProductsLoading] = useState(false);
  const [showWarrantyPicker, setShowWarrantyPicker] = useState(false);

  // Create new warranty form state
  const [showNewWarrantyForm, setShowNewWarrantyForm] = useState(false);
  const [newWarrantyForm, setNewWarrantyForm] = useState({
    name: "",
    description: "",
    termMonths: "",
    claimLimit: "",
    priceGross: "",
    costPrice: "",
    vatTreatment: "NO_VAT",
  });
  const [savingWarranty, setSavingWarranty] = useState(false);

  // Schedule collection state
  const [showScheduleCollectionModal, setShowScheduleCollectionModal] = useState(false);
  const [scheduleCollectionForm, setScheduleCollectionForm] = useState({
    date: "",
    time: "",
    notes: "",
  });

  // Inline form modals state
  const [showServiceReceiptModal, setShowServiceReceiptModal] = useState(false);
  const [showDeliveryFormModal, setShowDeliveryFormModal] = useState(false);
  const [scheduleCollectionLoading, setScheduleCollectionLoading] = useState(false);

  // Take Payment modal state
  const [showTakePaymentModal, setShowTakePaymentModal] = useState(false);
  const [takePaymentForm, setTakePaymentForm] = useState({
    amount: "",
    method: "BANK_TRANSFER",
    reference: "",
  });
  const [takePaymentLoading, setTakePaymentLoading] = useState(false);

  // Check if deal fields can be edited based on deal status
  // Once invoice is generated, fields are locked until invoice is voided
  const canEditAddOns = () => {
    if (!deal) return false;
    // Only allow editing in DRAFT and DEPOSIT_TAKEN
    return ["DRAFT", "DEPOSIT_TAKEN"].includes(deal.status);
  };

  // VRM Lookup for Part Exchange
  const handlePxVrmLookup = async () => {
    const cleanVrm = pxForm.vrm?.replace(/\s/g, "").toUpperCase();
    if (!cleanVrm || cleanVrm.length < 2) {
      toast.error("Please enter a valid registration");
      return;
    }

    setPxLookupLoading(true);
    try {
      // Call both DVLA and MOT APIs in parallel (MOT has VIN and model data)
      const [dvlaRes, motRes] = await Promise.all([
        fetch("/api/dvla/vehicle-enquiry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ registrationNumber: cleanVrm }),
        }),
        fetch(`/api/mot?vrm=${encodeURIComponent(cleanVrm)}`).catch(() => null),
      ]);

      const result = await dvlaRes.json();
      const motData = motRes?.ok ? await motRes.json() : null;

      if (!dvlaRes.ok || !result.ok) {
        throw new Error(result.message || "VRM lookup failed");
      }

      const data = result.data;

      // Extract year from registration date
      let year = "";
      if (data.yearOfManufacture) {
        year = String(data.yearOfManufacture);
      } else if (data.dvlaDetails?.monthOfFirstRegistration) {
        year = data.dvlaDetails.monthOfFirstRegistration.split("-")[0];
      } else if (motData?.manufactureYear) {
        year = String(motData.manufactureYear);
      }

      setPxForm((prev) => ({
        ...prev,
        vrm: cleanVrm,
        vin: motData?.vin || prev.vin, // VIN from MOT API (not available from DVLA)
        make: data.make || motData?.make || prev.make,
        model: motData?.model || prev.model, // MOT API has better model data
        year: year || prev.year,
        colour: data.colour || motData?.primaryColour || prev.colour,
        fuelType: data.dvlaDetails?.fuelType || motData?.fuelType || prev.fuelType,
      }));

      toast.success("Vehicle details loaded from DVLA");
    } catch (error) {
      toast.error(error.message || "VRM lookup failed");
    } finally {
      setPxLookupLoading(false);
    }
  };

  // Search appraisals by VRM for Part Exchange import
  const handlePxAppraisalSearch = async (vrm) => {
    const cleanVrm = vrm?.replace(/\s/g, "").toUpperCase();
    if (!cleanVrm || cleanVrm.length < 2) {
      setPxAppraisalSuggestions([]);
      return;
    }

    setPxAppraisalSearching(true);
    try {
      const res = await fetch(`/api/vehicles/vrm-suggestions?q=${encodeURIComponent(cleanVrm)}`);
      if (res.ok) {
        const data = await res.json();
        setPxAppraisalSuggestions(data);
      }
    } catch (error) {
      console.error("Appraisal search failed:", error);
    } finally {
      setPxAppraisalSearching(false);
    }
  };

  // Select an appraisal to import into PX form
  const handleSelectPxAppraisal = (appraisal) => {
    setSelectedPxAppraisal(appraisal);
    setPxForm({
      vrm: appraisal.vehicleReg || "",
      vin: appraisal.vin || "",
      make: appraisal.vehicleMake || "",
      model: appraisal.vehicleModel || "",
      year: appraisal.vehicleYear || "",
      mileage: appraisal.mileage || "",
      colour: appraisal.colour || "",
      fuelType: appraisal.fuelType || "",
      allowance: appraisal.proposedPurchasePrice || "",
      settlement: appraisal.outstandingFinanceAmount || "",
      sourceType: appraisal.type === "customer_px" ? "CUSTOMER_FORM" : "DEALER_APPRAISAL",
      sourceId: appraisal.id,
      conditionNotes: appraisal.conditionNotes || "",
    });
    setPxAppraisalSuggestions([]);
    toast.success(`Imported from ${appraisal.type === "customer_px" ? "customer" : "dealer"} appraisal`);
  };

  // Clear PX appraisal selection
  const handleClearPxAppraisal = () => {
    setSelectedPxAppraisal(null);
    setPxForm({
      vrm: "",
      vin: "",
      make: "",
      model: "",
      year: "",
      mileage: "",
      colour: "",
      fuelType: "",
      allowance: "",
      settlement: "",
      sourceType: "MANUAL",
      sourceId: null,
      conditionNotes: "",
    });
  };

  // Fetch available add-on products
  const fetchAddOnProducts = async () => {
    setAddOnsLoading(true);
    try {
      const res = await fetch("/api/addons");
      if (res.ok) {
        const data = await res.json();
        setAvailableAddOns(data);
      }
    } catch (error) {
      console.error("Failed to fetch add-ons:", error);
    } finally {
      setAddOnsLoading(false);
    }
  };

  // Add an add-on to the deal
  const handleAddAddOn = async (addOnProduct) => {
    if (!deal) return;

    const price = addOnPrice ? parseFloat(addOnPrice) : addOnProduct.defaultPriceNet;

    const newAddOn = {
      addOnProductId: addOnProduct.id,
      name: addOnProduct.name,
      category: addOnProduct.category,
      qty: addOnQty,
      unitPriceNet: price,
      vatTreatment: addOnProduct.vatTreatment || "STANDARD",
      vatRate: addOnProduct.vatRate || 0.2,
    };

    setActionLoading("addon");
    try {
      const updatedAddOns = [...(deal.addOns || []), newAddOn];
      const res = await fetch(`/api/deals/${dealId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addOns: updatedAddOns }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add add-on");
      }

      toast.success("Add-on added");
      setShowAddOnPicker(false);
      setAddOnQty(1);
      setAddOnPrice("");
      fetchDeal();
      onUpdate?.();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Remove an add-on from the deal
  const handleRemoveAddOn = async (index) => {
    if (!deal) return;

    setActionLoading("addon");
    try {
      const updatedAddOns = deal.addOns.filter((_, i) => i !== index);
      const res = await fetch(`/api/deals/${dealId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addOns: updatedAddOns }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to remove add-on");
      }

      toast.success("Add-on removed");
      fetchDeal();
      onUpdate?.();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Add custom add-on
  const handleAddCustomAddOn = async () => {
    if (!deal) return;

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

    setActionLoading("addon");
    try {
      let catalogueProductId = null;

      // If saving to catalogue, create the product first
      if (customAddOn.saveToCatalogue) {
        const cataloguePayload = {
          name: customAddOn.name.trim(),
          defaultPriceNet: Math.round(netPrice * 100) / 100,
          costPriceNet: customAddOn.costPrice ? parseFloat(customAddOn.costPrice) : undefined,
          category: customAddOn.category || "OTHER",
          vatTreatment: vatTreatment,
        };

        // Add warranty-specific fields if category is WARRANTY
        if (customAddOn.category === "WARRANTY") {
          if (customAddOn.termMonths) {
            cataloguePayload.termMonths = parseInt(customAddOn.termMonths);
          }
          if (customAddOn.claimLimit) {
            cataloguePayload.claimLimit = parseFloat(customAddOn.claimLimit);
          }
        }

        const catalogueRes = await fetch("/api/addons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cataloguePayload),
        });

        if (!catalogueRes.ok) {
          const err = await catalogueRes.json();
          throw new Error(err.error || "Failed to save to catalogue");
        }

        const catalogueProduct = await catalogueRes.json();
        catalogueProductId = catalogueProduct.id || catalogueProduct._id;

        // Refresh available add-ons list
        fetchAddOnProducts();
      }

      const newAddOn = {
        // Only include addOnProductId if it's a valid ObjectId (24 hex chars)
        addOnProductId: (catalogueProductId && /^[a-f0-9]{24}$/i.test(catalogueProductId)) ? catalogueProductId : undefined,
        name: customAddOn.name.trim(),
        qty: 1,
        unitPriceNet: Math.round(netPrice * 100) / 100,
        vatTreatment: vatTreatment,
        vatRate: vatTreatment === "STANDARD" ? 0.2 : 0,
        category: customAddOn.category || "OTHER",
      };

      const updatedAddOns = [...(deal.addOns || []), newAddOn];
      const res = await fetch(`/api/deals/${dealId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addOns: updatedAddOns }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add add-on");
      }

      toast.success(customAddOn.saveToCatalogue ? "Add-on saved to catalogue and added to deal" : "Custom add-on added");
      setShowCustomAddOnForm(false);
      setCustomAddOn({
        name: "",
        unitPriceGross: "",
        category: "OTHER",
        vatTreatment: "STANDARD",
        saveToCatalogue: false,
        costPrice: "",
        termMonths: "",
        claimLimit: "",
      });
      fetchDeal();
      onUpdate?.();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Add an agreed work item
  const handleAddAgreedWork = async () => {
    if (!deal || !agreedWorkForm.title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    setActionLoading("agreedWork");
    try {
      const newRequest = {
        title: agreedWorkForm.title.trim(),
        details: agreedWorkForm.details.trim(),
        type: agreedWorkForm.type,
        status: "REQUESTED",
        createdAt: new Date().toISOString(),
      };

      // If sync to vehicle is enabled, create a VehicleIssue
      if (agreedWorkForm.syncToVehicle && deal.vehicleId) {
        const vehicleId = deal.vehicleId._id || deal.vehicleId;
        // Format deal number for display (e.g., "D00043")
        const dealNumber = deal.dealNumber || (deal.id ? `D${String(deal.id).slice(-5).padStart(5, "0")}` : null);
        const issueRes = await fetch(`/api/vehicles/${vehicleId}/issues`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: agreedWorkForm.type === "COSMETIC" ? "Cosmetic" : agreedWorkForm.type === "PREP" ? "Mechanical" : "Other",
            subcategory: "Customer Promise",
            description: agreedWorkForm.title.trim(),
            actionNeeded: agreedWorkForm.details.trim() || `Agreed at sale: ${agreedWorkForm.title.trim()}`,
            priority: "high",
            status: "Outstanding",
            dealId: deal._id || deal.id, // Link to originating deal
            dealNumber: dealNumber, // Store formatted deal number for display
          }),
        });

        if (issueRes.ok) {
          const issue = await issueRes.json();
          newRequest.linkToIssueId = issue.id || issue._id;
        }
      }

      const updatedRequests = [...(deal.requests || []), newRequest];
      const res = await fetch(`/api/deals/${dealId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requests: updatedRequests }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add agreed work");
      }

      toast.success("Agreed work added");
      setShowAgreedWorkModal(false);
      setAgreedWorkForm({ title: "", details: "", type: "PREP", syncToVehicle: true });
      fetchDeal();
      onUpdate?.();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Update agreed work status
  const handleUpdateAgreedWorkStatus = async (index, newStatus) => {
    if (!deal) return;

    setActionLoading("agreedWork");
    try {
      const updatedRequests = deal.requests.map((req, i) => {
        if (i === index) {
          return {
            ...req,
            status: newStatus,
            completedAt: newStatus === "DONE" ? new Date().toISOString() : null,
          };
        }
        return req;
      });

      const res = await fetch(`/api/deals/${dealId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requests: updatedRequests }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update status");
      }

      toast.success("Status updated");
      fetchDeal();
      onUpdate?.();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Remove an agreed work item
  const handleRemoveAgreedWork = async (index) => {
    if (!deal) return;

    setActionLoading("agreedWork");
    try {
      const updatedRequests = deal.requests.filter((_, i) => i !== index);
      const res = await fetch(`/api/deals/${dealId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requests: updatedRequests }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to remove agreed work");
      }

      toast.success("Agreed work removed");
      fetchDeal();
      onUpdate?.();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      const html = document.documentElement;

      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";

      html.style.overflow = "hidden";

      return () => {
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.left = "";
        document.body.style.right = "";
        document.body.style.width = "";
        document.body.style.overflow = "";
        document.body.style.touchAction = "";

        html.style.overflow = "";

        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && dealId) {
      fetchDeal();
      fetchDealer();
    } else if (!dealId) {
      // Reset state when dealId is cleared
      setDeal(null);
      setFetchError(null);
    }
  }, [isOpen, dealId]);

  // Fetch linked submissions when deal is loaded
  useEffect(() => {
    if (deal?.vehicleId) {
      fetchLinkedSubmissions();
    }
  }, [deal?.vehicleId]);

  // Sync delivery amount input when deal changes
  useEffect(() => {
    if (deal?.delivery?.amountGross !== undefined) {
      setDeliveryAmountInput(deal.delivery.amountGross?.toString() || "");
    } else {
      setDeliveryAmountInput("");
    }
  }, [deal?.id, deal?.delivery?.amountGross]);

  const fetchDeal = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/deals/${dealId}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to load deal (${res.status})`);
      }
      const data = await res.json();
      setDeal(data);

      // Initialize notes input
      setNotesInput(data.notes || "");
      setNotesModified(false);

      // Check if deal has an active driver link and restore state
      if (data.signature?.driverLinkToken && data.signature?.driverLinkExpiresAt) {
        const expiry = new Date(data.signature.driverLinkExpiresAt);
        if (expiry > new Date()) {
          // Link is still valid - reconstruct URL
          setDriverLink(`${window.location.origin}/public/delivery-signing/${data.signature.driverLinkToken}`);
        } else {
          // Link expired - clear state
          setDriverLink(null);
        }
      } else {
        setDriverLink(null);
      }

      // Fetch documents after deal is loaded
      fetchDocuments();
    } catch (error) {
      console.error("[DealDrawer] Fetch error:", error);
      setFetchError(error.message || "Failed to load deal details");
      // Don't show toast here - we'll show error in UI instead
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`/api/deals/${dealId}/documents`);
      if (res.ok) {
        const data = await res.json();
        setDocuments({
          depositReceipt: data.documents?.find(d => d.type === "DEPOSIT_RECEIPT" && d.status !== "VOID"),
          invoice: data.documents?.find(d => d.type === "INVOICE" && d.status !== "VOID"),
        });
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    }
  };

  const fetchDealer = async () => {
    try {
      const res = await fetch("/api/dealer");
      if (res.ok) {
        const data = await res.json();
        setDealer(data);
      }
    } catch (error) {
      console.error("Failed to fetch dealer:", error);
    }
  };

  // Apply default warranty to the deal
  const handleApplyDefaultWarranty = async () => {
    const defaultWarranty = dealer?.salesSettings?.defaultWarranty;
    if (!defaultWarranty?.enabled) {
      toast.error("No default warranty configured");
      return;
    }

    setActionLoading("applyWarranty");
    try {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warranty: {
            included: true,
            name: defaultWarranty.name || "Standard Warranty",
            durationMonths: defaultWarranty.durationMonths || 3,
            claimLimit: defaultWarranty.claimLimit || null,
            priceGross: defaultWarranty.priceGross || 0,
            isDefault: true,
          },
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to apply warranty");
      }

      // Optimistic UI update - update local state immediately
      setDeal(prev => ({
        ...prev,
        warranty: {
          included: true,
          name: defaultWarranty.name || "Standard Warranty",
          durationMonths: defaultWarranty.durationMonths || 3,
          claimLimit: defaultWarranty.claimLimit || null,
          priceGross: defaultWarranty.priceGross || 0,
          isDefault: true,
        }
      }));

      toast.success("Default warranty applied");
      fetchDeal();
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error(error.message || "Failed to apply warranty");
    } finally {
      setActionLoading(null);
    }
  };

  // Remove warranty from the deal
  const handleRemoveWarranty = async () => {
    setActionLoading("removeWarranty");
    try {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warranty: { included: false },
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to remove warranty");
      }

      // Optimistic UI update
      setDeal(prev => ({
        ...prev,
        warranty: { included: false }
      }));

      toast.success("Warranty removed");
      fetchDeal();
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error(error.message || "Failed to remove warranty");
    } finally {
      setActionLoading(null);
    }
  };

  // Fetch third-party warranty products
  const fetchWarrantyProducts = async () => {
    setWarrantyProductsLoading(true);
    try {
      const res = await fetch("/api/warranties?active=true");
      if (!res.ok) throw new Error("Failed to fetch warranty products");
      const data = await res.json();
      setWarrantyProducts(data);
    } catch (error) {
      console.error("Failed to fetch warranty products:", error);
    } finally {
      setWarrantyProductsLoading(false);
    }
  };

  // Create new warranty product and apply to deal
  const handleCreateAndApplyWarranty = async () => {
    if (!newWarrantyForm.name.trim()) {
      toast.error("Warranty name is required");
      return;
    }

    setSavingWarranty(true);
    try {
      // Create the warranty product
      const createRes = await fetch("/api/warranties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newWarrantyForm.name.trim(),
          description: newWarrantyForm.description.trim() || "",
          termMonths: newWarrantyForm.termMonths ? parseInt(newWarrantyForm.termMonths) : null,
          claimLimit: newWarrantyForm.claimLimit ? parseFloat(newWarrantyForm.claimLimit) : null,
          priceGross: newWarrantyForm.priceGross ? parseFloat(newWarrantyForm.priceGross) : 0,
          costPrice: newWarrantyForm.costPrice ? parseFloat(newWarrantyForm.costPrice) : null,
          vatTreatment: newWarrantyForm.vatTreatment || "NO_VAT",
          isActive: true,
        }),
      });

      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to create warranty");
      }

      const newWarranty = await createRes.json();

      // Now apply it to the deal
      const applyRes = await fetch(`/api/deals/${dealId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warranty: {
            included: true,
            name: newWarranty.name,
            description: newWarranty.description || "",
            durationMonths: newWarranty.termMonths || null,
            claimLimit: newWarranty.claimLimit || null,
            priceGross: newWarranty.priceGross || 0,
            costPrice: newWarranty.costPrice || null,
            type: "THIRD_PARTY",
            warrantyProductId: newWarranty.id,
          },
        }),
      });

      if (!applyRes.ok) {
        const errData = await applyRes.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to apply warranty to deal");
      }

      toast.success("Warranty created and applied");

      // Reset form and close
      setNewWarrantyForm({
        name: "",
        description: "",
        termMonths: "",
        claimLimit: "",
        priceGross: "",
        costPrice: "",
        vatTreatment: "NO_VAT",
      });
      setShowNewWarrantyForm(false);
      setShowWarrantyPicker(false);

      // Refresh warranty products list and deal
      fetchWarrantyProducts();
      fetchDeal();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error creating warranty:", error);
      toast.error(error.message || "Failed to create warranty");
    } finally {
      setSavingWarranty(false);
    }
  };

  // Apply third-party warranty to the deal
  const handleApplyThirdPartyWarranty = async (warrantyProduct) => {
    if (!warrantyProduct) {
      toast.error("Please select a warranty product");
      return;
    }

    setActionLoading("applyWarranty");
    try {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warranty: {
            included: true,
            name: warrantyProduct.name,
            description: warrantyProduct.description || "",
            durationMonths: warrantyProduct.termMonths || null,
            claimLimit: warrantyProduct.claimLimit || null,
            priceGross: warrantyProduct.priceGross || 0,
            costPrice: warrantyProduct.costPrice || null,
            type: "THIRD_PARTY",
            warrantyProductId: warrantyProduct.id,
          },
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to apply warranty");
      }

      toast.success("Third-party warranty applied");
      setShowWarrantyPicker(false);
      fetchDeal();
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error(error.message || "Failed to apply warranty");
    } finally {
      setActionLoading(null);
    }
  };

  // Fetch linked submissions (PDI, Service Receipt) for the vehicle
  const fetchLinkedSubmissions = async () => {
    if (!deal?.vehicleId?._id && !deal?.vehicleId) return;

    const vehicleId = deal.vehicleId._id || deal.vehicleId;
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}/submissions`);
      if (res.ok) {
        const data = await res.json();
        setLinkedSubmissions({
          pdi: data.submissions?.find(s => s.formType === "PDI"),
          serviceReceipt: data.submissions?.find(s => s.formType === "SERVICE_RECEIPT"),
        });
      }
    } catch (error) {
      console.error("Failed to fetch linked submissions:", error);
    }
  };

  // Open handover - directly opens the invoice
  const handleOpenHandover = () => {
    if (documents.invoice?.shareUrl) {
      window.open(documents.invoice.shareUrl, "_blank");
    } else {
      toast.error("Invoice not available");
    }
  };

  // Generate handover pack
  const handleGenerateHandoverPack = async () => {
    if (!documents.invoice) {
      toast.error("Invoice is required");
      return;
    }

    setIsGeneratingPack(true);
    try {
      // Open the handover pack page in a new tab
      const params = new URLSearchParams({
        invoiceToken: documents.invoice.shareToken,
        ...(handoverDocs.pdi && linkedSubmissions.pdi && { pdiId: linkedSubmissions.pdi.id }),
        ...(handoverDocs.serviceReceipt && linkedSubmissions.serviceReceipt && { serviceId: linkedSubmissions.serviceReceipt.id }),
      });

      window.open(`/public/handover-pack/${documents.invoice.shareToken}?${params.toString()}`, "_blank");
      setShowHandoverModal(false);
    } catch (error) {
      toast.error("Failed to generate handover pack");
    } finally {
      setIsGeneratingPack(false);
    }
  };

  // Download handover pack PDF directly
  const handleDownloadHandoverPack = async () => {
    if (!deal?._id) return;

    setIsGeneratingHandover(true);
    try {
      const res = await fetch(`/api/deals/${deal._id}/generate-handover-pack`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate handover pack");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const vrm = deal.vehicleId?.regCurrent?.replace(/\s/g, "") || "";
      const dealNumber = deal.dealNumber || deal._id.toString().slice(-6);
      a.download = `handover-pack-${vrm || dealNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Handover pack downloaded");
    } catch (error) {
      console.error("Handover pack error:", error);
      toast.error(error.message || "Failed to generate handover pack");
    } finally {
      setIsGeneratingHandover(false);
    }
  };

  // Calculate totals
  const calculateTotals = () => {
    if (!deal) return {};

    const addOnsNetTotal = (deal.addOns || []).reduce(
      (sum, a) => sum + (a.unitPriceNet * (a.qty || 1)),
      0
    );
    const addOnsVatTotal = (deal.addOns || []).reduce((sum, a) => {
      if (a.vatTreatment === "STANDARD") {
        return sum + a.unitPriceNet * (a.qty || 1) * (a.vatRate || 0.2);
      }
      return sum;
    }, 0);

    // Calculate delivery amount
    const deliveryAmount = deal.delivery?.isFree ? 0 : (deal.delivery?.amountGross || deal.delivery?.amount || 0);

    // Include warranty if applicable
    const warrantyAmount = deal.warranty?.included && deal.warranty?.priceGross > 0 ? deal.warranty.priceGross : 0;

    let subtotal, totalVat, grandTotal;

    if (deal.vatScheme === "VAT_QUALIFYING") {
      subtotal = (deal.vehiclePriceNet || 0) + addOnsNetTotal;
      totalVat = (deal.vehicleVatAmount || 0) + addOnsVatTotal;
      grandTotal = subtotal + totalVat + deliveryAmount + warrantyAmount;
    } else {
      subtotal = (deal.vehiclePriceGross || 0) + addOnsNetTotal + addOnsVatTotal;
      totalVat = 0;
      grandTotal = subtotal + deliveryAmount + warrantyAmount;
    }

    const totalPaid = (deal.payments || [])
      .filter((p) => !p.isRefunded)
      .reduce((sum, p) => sum + p.amount, 0);

    // Calculate PX net value from partExchanges array (new) or legacy single partExchange
    let pxNetValue = 0;
    if (deal.partExchanges && deal.partExchanges.length > 0) {
      pxNetValue = deal.partExchanges.reduce((sum, px) => {
        return sum + ((px.allowance || 0) - (px.settlement || 0));
      }, 0);
    } else if (deal.partExchange) {
      pxNetValue = (deal.partExchange.allowance || 0) - (deal.partExchange.settlement || 0);
    }

    const balanceDue = grandTotal - totalPaid - pxNetValue;

    return {
      addOnsNetTotal,
      addOnsVatTotal,
      deliveryAmount,
      subtotal,
      totalVat,
      grandTotal,
      totalPaid,
      pxNetValue,
      balanceDue,
    };
  };

  // Deal actions
  const handleTakeDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      toast.error("Please enter a valid deposit amount");
      return;
    }

    setActionLoading("deposit");
    try {
      const res = await fetch(`/api/deals/${dealId}/take-deposit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(depositAmount),
          method: depositMethod,
          reference: depositReference,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to record deposit");
      }

      const result = await res.json();
      toast.success(`Deposit recorded: ${result.documentNumber}`);
      setShowDepositModal(false);
      setDepositAmount("");
      setDepositReference("");
      fetchDeal();
      onUpdate?.();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Save warranty changes
  const handleSaveWarranty = async () => {
    setWarrantyEditLoading(true);
    try {
      const res = await fetch(`/api/deals/${dealId}/update-warranty`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: warrantyEditForm.name,
          description: warrantyEditForm.description || "",
          durationMonths: warrantyEditForm.durationMonths ? parseInt(warrantyEditForm.durationMonths) : null,
          claimLimit: warrantyEditForm.claimLimit ? parseFloat(warrantyEditForm.claimLimit) : null,
          priceGross: warrantyEditForm.priceGross ? parseFloat(warrantyEditForm.priceGross) : 0,
          type: warrantyEditForm.type || "DEFAULT",
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update warranty");
      }

      toast.success("Warranty updated");
      setShowEditWarrantyModal(false);
      fetchDeal();
      onUpdate?.();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setWarrantyEditLoading(false);
    }
  };

  // Save deal notes
  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    try {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: notesInput.trim() || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save notes");
      }

      toast.success("Notes saved");
      setNotesModified(false);
      fetchDeal();
      onUpdate?.();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Regenerate deposit receipt with current deal data
  const handleRegenerateReceipt = async () => {
    setActionLoading("regenerate");
    try {
      const res = await fetch(`/api/deals/${dealId}/regenerate-receipt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to regenerate receipt");
      }

      toast.success("Deposit receipt regenerated with current deal data");
      fetchDeal();
      onUpdate?.();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Add Part Exchange
  const handleAddPartExchange = async () => {
    if (!pxForm.vrm) {
      toast.error("Please enter a VRM");
      return;
    }
    if (!pxForm.allowance || parseFloat(pxForm.allowance) <= 0) {
      toast.error("Please enter a valid allowance amount");
      return;
    }

    // Check for duplicate VRM in existing part exchanges
    const normalizedVrm = pxForm.vrm.toUpperCase().replace(/\s/g, "");
    const existingPxWithSameVrm = deal.partExchanges?.find(
      px => px.vrm?.toUpperCase().replace(/\s/g, "") === normalizedVrm
    );
    if (existingPxWithSameVrm) {
      toast.error("This vehicle is already added as a part exchange on this deal");
      return;
    }

    setPxLoading(true);
    try {
      const res = await fetch(`/api/deals/${dealId}/add-part-exchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vrm: pxForm.vrm,
          vin: pxForm.vin || undefined,
          make: pxForm.make,
          model: pxForm.model,
          year: pxForm.year ? parseInt(pxForm.year) : undefined,
          mileage: pxForm.mileage ? parseInt(pxForm.mileage) : undefined,
          colour: pxForm.colour,
          fuelType: pxForm.fuelType || undefined,
          allowance: parseFloat(pxForm.allowance),
          settlement: pxForm.settlement ? parseFloat(pxForm.settlement) : 0,
          sourceType: pxForm.sourceType || "MANUAL",
          sourceId: pxForm.sourceId || undefined,
          conditionSummary: pxForm.conditionNotes || undefined,
          // Finance & VAT fields
          vatQualifying: pxForm.vatQualifying || false,
          hasFinance: pxForm.hasFinance || false,
          financeCompanyContactId: pxForm.hasFinance ? pxForm.financeCompanyContactId : undefined,
          hasSettlementInWriting: pxForm.hasSettlementInWriting || false,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add part exchange");
      }

      toast.success("Part exchange added");
      setShowPxModal(false);
      setSelectedPxAppraisal(null);
      setPxForm({
        vrm: "",
        vin: "",
        make: "",
        model: "",
        year: "",
        mileage: "",
        colour: "",
        fuelType: "",
        allowance: "",
        settlement: "",
        sourceType: "MANUAL",
        sourceId: null,
        conditionNotes: "",
      });
      fetchDeal();
      onUpdate?.();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setPxLoading(false);
    }
  };

  // Remove Part Exchange by index
  const handleRemovePartExchange = async (index) => {
    if (!confirm("Remove this part exchange from the deal?")) return;

    try {
      const res = await fetch(`/api/deals/${dealId}/remove-part-exchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to remove part exchange");
      }

      toast.success("Part exchange removed");
      fetchDeal();
      onUpdate?.();
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Edit Part Exchange - populate form with existing data
  const handleEditPartExchange = (idx) => {
    const px = deal.partExchanges[idx];
    if (!px) return;

    setPxForm({
      vrm: px.vrm || "",
      vin: px.vin || "",
      make: px.make || "",
      model: px.model || "",
      year: px.year ? String(px.year) : "",
      mileage: px.mileage ? String(px.mileage) : "",
      colour: px.colour || "",
      fuelType: px.fuelType || "",
      allowance: px.allowance ? String(px.allowance) : "",
      settlement: px.settlement ? String(px.settlement) : "",
      sourceType: px.sourceType || "MANUAL",
      sourceId: px.sourceId || null,
      conditionNotes: px.conditionNotes || "",
      vatQualifying: px.vatQualifying || false,
      hasFinance: px.hasFinance || false,
      financeCompanyContactId: px.financeCompanyContactId || "",
      financeCompanyName: px.financeCompanyName || "",
      hasSettlementInWriting: px.hasSettlementInWriting || false,
    });
    setEditingPxIndex(idx);
    setShowPxModal(true);
  };

  // Update existing Part Exchange
  const handleUpdatePartExchange = async () => {
    if (editingPxIndex === null) return;

    if (!pxForm.vrm) {
      toast.error("Please enter a VRM");
      return;
    }
    if (!pxForm.allowance || parseFloat(pxForm.allowance) <= 0) {
      toast.error("Please enter a valid allowance amount");
      return;
    }

    setPxLoading(true);
    try {
      const res = await fetch(`/api/deals/${dealId}/update-part-exchange`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          index: editingPxIndex,
          vrm: pxForm.vrm,
          vin: pxForm.vin || undefined,
          make: pxForm.make,
          model: pxForm.model,
          year: pxForm.year ? parseInt(pxForm.year) : undefined,
          mileage: pxForm.mileage ? parseInt(pxForm.mileage) : undefined,
          colour: pxForm.colour,
          fuelType: pxForm.fuelType || undefined,
          allowance: parseFloat(pxForm.allowance),
          settlement: pxForm.settlement ? parseFloat(pxForm.settlement) : 0,
          conditionNotes: pxForm.conditionNotes || undefined,
          vatQualifying: pxForm.vatQualifying || false,
          hasFinance: pxForm.hasFinance || false,
          financeCompanyContactId: pxForm.hasFinance ? pxForm.financeCompanyContactId : undefined,
          financeCompanyName: pxForm.hasFinance ? pxForm.financeCompanyName : undefined,
          hasSettlementInWriting: pxForm.hasSettlementInWriting || false,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update part exchange");
      }

      toast.success("Part exchange updated");
      setShowPxModal(false);
      setEditingPxIndex(null);
      setPxForm({
        vrm: "",
        vin: "",
        make: "",
        model: "",
        year: "",
        mileage: "",
        colour: "",
        fuelType: "",
        allowance: "",
        settlement: "",
        sourceType: "MANUAL",
        sourceId: null,
        conditionNotes: "",
      });
      fetchDeal();
      onUpdate?.();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setPxLoading(false);
    }
  };

  // Toggle settlement received status (can be done even after invoice generated)
  const handleToggleSettlementReceived = async (pxIndex) => {
    const px = deal.partExchanges?.[pxIndex];
    if (!px) return;

    const newValue = !px.hasSettlementInWriting;

    try {
      const res = await fetch(`/api/deals/${dealId}/update-part-exchange`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          index: pxIndex,
          hasSettlementInWriting: newValue,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update settlement status");
      }

      toast.success(newValue ? "Settlement marked as received" : "Settlement status updated");
      fetchDeal();
      onUpdate?.();
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Open invoice confirmation modal
  const handleGenerateInvoice = () => {
    // Pre-populate form with existing deal data
    setInvoiceConfirmForm({
      paymentMethod: deal.paymentType || "CASH",
      financeCompanyContactId: deal.financeSelection?.financeCompanyContactId || "",
      financeCompanyName: deal.financeSelection?.financeCompanyName || "",
      financeAdvance: deal.financeSelection?.financeAdvance || "",
      financeCompanyConfirmed: !deal.financeSelection?.toBeConfirmed,
      cancelFinance: false,
    });
    setShowInvoiceConfirmModal(true);
  };

  // Actually generate the invoice with confirmed values
  const handleConfirmAndGenerateInvoice = async () => {
    setActionLoading("invoice");
    try {
      const res = await fetch(`/api/deals/${dealId}/generate-invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod: invoiceConfirmForm.paymentMethod,
          financeCompanyContactId: invoiceConfirmForm.financeCompanyContactId || undefined,
          financeCompanyName: invoiceConfirmForm.financeCompanyName || undefined,
          financeAdvance: invoiceConfirmForm.financeAdvance ? parseFloat(invoiceConfirmForm.financeAdvance) : undefined,
          cancelFinance: invoiceConfirmForm.cancelFinance || false,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate invoice");
      }

      const result = await res.json();
      toast.success(`Invoice generated: ${result.documentNumber}`);
      setShowInvoiceConfirmModal(false);
      fetchDeal();
      onUpdate?.();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle invoice signature capture completion
  const handleSignatureComplete = async (signatureData) => {
    const res = await fetch(`/api/deals/${dealId}/sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(signatureData),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to save signatures");
    }

    toast.success("Signatures saved successfully");
    fetchDeal();
    onUpdate?.();
  };

  // Handle deposit receipt signature capture completion
  const handleDepositSignatureComplete = async (signatureData) => {
    const res = await fetch(`/api/deals/${dealId}/sign-deposit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(signatureData),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to save signatures");
    }

    toast.success("Deposit receipt signed successfully");
    setShowDepositSignatureModal(false);
    fetchDeal();
    onUpdate?.();
  };

  // Show driver link modal
  const openDriverLinkModal = () => {
    setDriverLinkPin("");
    setShowDriverLinkModal(true);
  };

  // Generate driver signing link (with optional PIN)
  const handleGenerateDriverLink = async () => {
    // Validate PIN if provided (must be 4 digits or empty)
    if (driverLinkPin && !/^\d{4}$/.test(driverLinkPin)) {
      toast.error("PIN must be exactly 4 digits");
      return;
    }

    setDriverLinkLoading(true);
    try {
      const res = await fetch(`/api/deals/${dealId}/generate-driver-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin: driverLinkPin || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate link");
      }

      const data = await res.json();
      setDriverLink(data.link);
      setShowDriverLinkModal(false);
      toast.success(driverLinkPin ? "Driver link generated with PIN protection" : "Driver link generated");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setDriverLinkLoading(false);
    }
  };

  // Copy driver link to clipboard
  const copyDriverLink = () => {
    if (driverLink) {
      navigator.clipboard.writeText(driverLink);
      toast.success("Link copied to clipboard");
    }
  };

  // Schedule delivery to calendar
  const handleScheduleDelivery = async () => {
    if (!scheduleDeliveryForm.date || !scheduleDeliveryForm.time) {
      toast.error("Please select date and time");
      return;
    }

    // Validate address if not same as customer
    if (!scheduleDeliveryForm.sameAsCustomer && !scheduleDeliveryForm.addressLine1) {
      toast.error("Please enter delivery address");
      return;
    }

    setScheduleDeliveryLoading(true);
    try {
      // Combine date and time
      const startDatetime = new Date(`${scheduleDeliveryForm.date}T${scheduleDeliveryForm.time}`);
      const endDatetime = new Date(startDatetime.getTime() + 60 * 60 * 1000); // 1 hour duration

      // Build title
      const vehicle = deal.vehicleId || {};
      const customer = deal.soldToContactId || deal.soldToContact || {};
      const title = `Delivery: ${vehicle.regCurrent || "Vehicle"} to ${customer.displayName || customer.name || "Customer"}`;

      // Determine delivery address
      let deliveryAddress;
      if (scheduleDeliveryForm.sameAsCustomer) {
        deliveryAddress = customer.address;
      } else {
        deliveryAddress = {
          line1: scheduleDeliveryForm.addressLine1,
          line2: scheduleDeliveryForm.addressLine2,
          town: scheduleDeliveryForm.town,
          postcode: scheduleDeliveryForm.postcode,
          isDifferent: true,
        };
      }

      // Build description with customer details and address
      let description = `Vehicle: ${vehicle.make || ""} ${vehicle.model || ""} (${vehicle.regCurrent || ""})`;
      description += `\n\nCustomer: ${customer.displayName || customer.name || ""}`;
      if (customer.phone) description += `\nPhone: ${customer.phone}`;
      if (customer.email) description += `\nEmail: ${customer.email}`;

      if (deliveryAddress) {
        description += `\n\nDelivery Address:`;
        if (deliveryAddress.line1) description += `\n${deliveryAddress.line1}`;
        if (deliveryAddress.line2) description += `\n${deliveryAddress.line2}`;
        if (deliveryAddress.town) description += `\n${deliveryAddress.town}`;
        if (deliveryAddress.postcode) description += ` ${deliveryAddress.postcode}`;
      }
      if (scheduleDeliveryForm.notes) {
        description += `\n\nNotes: ${scheduleDeliveryForm.notes}`;
      }

      // First, try to find a "Delivery" category
      const catRes = await fetch("/api/calendar/categories");
      let categoryId = null;
      if (catRes.ok) {
        const categories = await catRes.json();
        const deliveryCategory = categories.find(c => c.name?.toLowerCase().includes("delivery"));
        if (deliveryCategory) {
          categoryId = deliveryCategory.id;
        }
      }

      // Create calendar event
      const eventRes = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          categoryId,
          startDatetime: startDatetime.toISOString(),
          endDatetime: endDatetime.toISOString(),
          linkedVehicleId: vehicle.id || vehicle._id,
          linkedContactId: customer.id || customer._id,
        }),
      });

      if (!eventRes.ok) {
        const err = await eventRes.json();
        throw new Error(err.error || "Failed to create calendar event");
      }

      const event = await eventRes.json();

      // Update deal with scheduled delivery date and address
      const dealUpdate = {
        "delivery.scheduledDate": startDatetime.toISOString(),
        "delivery.scheduledCalendarEventId": event.id,
      };

      // Save delivery address if different from customer
      if (!scheduleDeliveryForm.sameAsCustomer) {
        dealUpdate.deliveryAddress = deliveryAddress;
      }

      await fetch(`/api/deals/${dealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dealUpdate),
      });

      toast.success("Delivery scheduled");
      setShowScheduleDeliveryModal(false);
      setScheduleDeliveryForm({
        date: "", time: "", notes: "",
        sameAsCustomer: true, addressLine1: "", addressLine2: "", town: "", postcode: ""
      });
      fetchDeal();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setScheduleDeliveryLoading(false);
    }
  };

  // Schedule collection to calendar (customer picks up vehicle)
  const handleScheduleCollection = async () => {
    if (!scheduleCollectionForm.date || !scheduleCollectionForm.time) {
      toast.error("Please select date and time");
      return;
    }

    setScheduleCollectionLoading(true);
    try {
      // Combine date and time
      const startDatetime = new Date(`${scheduleCollectionForm.date}T${scheduleCollectionForm.time}`);
      const endDatetime = new Date(startDatetime.getTime() + 60 * 60 * 1000); // 1 hour duration

      // Build title
      const vehicle = deal.vehicleId || {};
      const customer = deal.soldToContactId || deal.soldToContact || {};
      const customerName = customer.displayName || customer.name || "Customer";
      const title = `Handover: ${vehicle.regCurrent || "Vehicle"} to ${customerName}`;

      // Build description
      let description = `Vehicle: ${vehicle.make || ""} ${vehicle.model || ""} (${vehicle.regCurrent || ""})`;
      description += `\n\nCustomer: ${customerName}`;
      if (customer.phone) description += `\nPhone: ${customer.phone}`;
      if (scheduleCollectionForm.notes) {
        description += `\n\nNotes: ${scheduleCollectionForm.notes}`;
      }

      // First, try to find a "Handover", "Collection" or "Sales" category
      const catRes = await fetch("/api/calendar/categories");
      let categoryId = null;
      if (catRes.ok) {
        const categories = await catRes.json();
        const handoverCategory = categories.find(c =>
          c.name?.toLowerCase().includes("handover") || c.name?.toLowerCase().includes("collection") || c.name?.toLowerCase().includes("sales")
        );
        if (handoverCategory) {
          categoryId = handoverCategory.id;
        }
      }

      // Create calendar event
      const eventRes = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          categoryId,
          startDatetime: startDatetime.toISOString(),
          endDatetime: endDatetime.toISOString(),
          linkedVehicleId: vehicle.id || vehicle._id,
          linkedContactId: customer.id || customer._id,
        }),
      });

      if (!eventRes.ok) {
        const err = await eventRes.json();
        throw new Error(err.error || "Failed to create calendar event");
      }

      const event = await eventRes.json();

      // Update deal with scheduled collection date
      await fetch(`/api/deals/${dealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          "collection.scheduledDate": startDatetime.toISOString(),
          "collection.scheduledCalendarEventId": event.id,
        }),
      });

      toast.success("Handover scheduled");
      setShowScheduleCollectionModal(false);
      setScheduleCollectionForm({ date: "", time: "", notes: "" });
      fetchDeal();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setScheduleCollectionLoading(false);
    }
  };

  // Cancel scheduled delivery
  const handleCancelScheduledDelivery = async () => {
    if (!confirm("Are you sure you want to cancel this scheduled delivery?")) return;

    setActionLoading("cancelDelivery");
    try {
      // Delete calendar event if exists
      if (deal.delivery?.scheduledCalendarEventId) {
        await fetch(`/api/calendar/${deal.delivery.scheduledCalendarEventId}`, { method: "DELETE" });
      }
      // Clear deal delivery schedule
      await fetch(`/api/deals/${dealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          "delivery.scheduledDate": null,
          "delivery.scheduledCalendarEventId": null,
        }),
      });
      toast.success("Delivery schedule cancelled");
      fetchDeal();
    } catch (error) {
      toast.error(error.message || "Failed to cancel delivery");
    } finally {
      setActionLoading(null);
    }
  };

  // Reschedule delivery - clear existing and open modal
  const handleRescheduleDelivery = async () => {
    setActionLoading("rescheduleDelivery");
    try {
      // Delete existing calendar event if exists
      if (deal.delivery?.scheduledCalendarEventId) {
        await fetch(`/api/calendar/${deal.delivery.scheduledCalendarEventId}`, { method: "DELETE" });
      }
      // Clear schedule in deal
      await fetch(`/api/deals/${dealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          "delivery.scheduledDate": null,
          "delivery.scheduledCalendarEventId": null,
        }),
      });
      await fetchDeal();
      // Open schedule modal
      setShowScheduleDeliveryModal(true);
    } catch (error) {
      toast.error(error.message || "Failed to clear schedule");
    } finally {
      setActionLoading(null);
    }
  };

  // Cancel scheduled collection
  const handleCancelScheduledCollection = async () => {
    if (!confirm("Are you sure you want to cancel this scheduled handover?")) return;

    setActionLoading("cancelCollection");
    try {
      // Delete calendar event if exists
      if (deal.collection?.scheduledCalendarEventId) {
        await fetch(`/api/calendar/${deal.collection.scheduledCalendarEventId}`, { method: "DELETE" });
      }
      // Clear deal collection schedule
      await fetch(`/api/deals/${dealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          "collection.scheduledDate": null,
          "collection.scheduledCalendarEventId": null,
        }),
      });
      toast.success("Handover schedule cancelled");
      fetchDeal();
    } catch (error) {
      toast.error(error.message || "Failed to cancel handover");
    } finally {
      setActionLoading(null);
    }
  };

  // Reschedule collection - clear existing and open modal
  const handleRescheduleCollection = async () => {
    setActionLoading("rescheduleCollection");
    try {
      // Delete existing calendar event if exists
      if (deal.collection?.scheduledCalendarEventId) {
        await fetch(`/api/calendar/${deal.collection.scheduledCalendarEventId}`, { method: "DELETE" });
      }
      // Clear schedule in deal
      await fetch(`/api/deals/${dealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          "collection.scheduledDate": null,
          "collection.scheduledCalendarEventId": null,
        }),
      });
      await fetchDeal();
      // Open schedule modal
      setShowScheduleCollectionModal(true);
    } catch (error) {
      toast.error(error.message || "Failed to clear schedule");
    } finally {
      setActionLoading(null);
    }
  };

  // Void invoice and revert to DEPOSIT_TAKEN
  const handleVoidInvoice = async () => {
    if (!confirm("Are you sure you want to void this invoice? This will revert the deal to Deposit Taken status, allowing you to generate a new invoice.")) {
      return;
    }

    setActionLoading("voidInvoice");
    try {
      const res = await fetch(`/api/deals/${dealId}/void-invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: "Voided by user to reissue",
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to void invoice");
      }

      const result = await res.json();
      toast.success(result.message || "Invoice voided");
      fetchDeal();
      fetchDocuments();
      onUpdate?.();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle taking a balance payment
  const handleTakePayment = async () => {
    const amount = parseFloat(takePaymentForm.amount);
    if (!amount || amount <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    if (!takePaymentForm.method) {
      toast.error("Please select a payment method");
      return;
    }

    setTakePaymentLoading(true);
    try {
      const res = await fetch(`/api/deals/${dealId}/record-balance-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          method: takePaymentForm.method,
          reference: takePaymentForm.reference || undefined,
          generateReceipt: true,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to record payment");
      }

      const result = await res.json();
      toast.success(result.message || "Payment recorded successfully");
      setShowTakePaymentModal(false);
      setTakePaymentForm({ amount: "", method: "BANK_TRANSFER", reference: "" });
      fetchDeal();
      onUpdate?.();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setTakePaymentLoading(false);
    }
  };

  const handleMarkDelivered = async () => {
    if (!deliveryForm.customerConfirmed) {
      toast.error("Please confirm customer has received the vehicle");
      return;
    }

    setActionLoading("delivered");
    try {
      const res = await fetch(`/api/deals/${dealId}/mark-delivered`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryMileage: deliveryForm.deliveryMileage ? parseInt(deliveryForm.deliveryMileage, 10) : undefined,
          deliveryNotes: deliveryForm.notes || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to mark as delivered");
      }

      toast.success("Deal marked as delivered");
      setShowDeliveryModal(false);
      setDeliveryForm({ deliveryMileage: "", customerConfirmed: false, notes: "" });
      fetchDeal();
      onUpdate?.();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkCompleted = async (confirmWithoutSettlement = false) => {
    setActionLoading("completed");
    try {
      const res = await fetch(`/api/deals/${dealId}/mark-completed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmWithoutSettlement }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Check if settlement confirmation is required
        if (data.error === "SETTLEMENT_CONFIRMATION_REQUIRED" && data.needsConfirmation) {
          const pxVrms = data.pxDetails?.map(px => px.vrm).join(", ") || "part exchange";
          const confirmed = window.confirm(
            `The following part exchanges have finance but settlement has not been received in writing:\n\n${pxVrms}\n\nAre you sure you want to complete this deal without written confirmation of the settlement figure?`
          );
          if (confirmed) {
            setActionLoading(null);
            return handleMarkCompleted(true);
          }
          setActionLoading(null);
          return;
        }
        throw new Error(data.error || "Failed to complete deal");
      }

      toast.success("Deal completed");
      fetchDeal();
      onUpdate?.();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Mark as handed over (for customer pickups - no delivery)
  const handleMarkCollected = async () => {
    if (!confirm("Mark this vehicle as handed over to the customer?")) return;

    setActionLoading("collected");
    try {
      const res = await fetch(`/api/deals/${dealId}/mark-delivered`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryNotes: "Customer handover",
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to mark as handed over");
      }

      toast.success("Vehicle handed over to customer");
      fetchDeal();
      onUpdate?.();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelDeal = async (reason = null) => {
    // For COMPLETED deals, we need a reason - show modal
    if (deal.status === "COMPLETED" && !reason) {
      setShowCancelModal(true);
      return;
    }

    // For non-completed deals, confirm first
    if (!reason && !confirm("Are you sure you want to cancel this deal?")) return;

    setActionLoading("cancel");
    try {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancelReason: reason || "Cancelled by user" }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to cancel deal");
      }

      toast.success(deal.status === "COMPLETED" ? "Completed deal cancelled" : "Deal cancelled");
      setShowCancelModal(false);
      setCancelReasonInput("");
      fetchDeal();
      onUpdate?.();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateCustomer = async (contactId) => {
    if (!contactId) return;

    setActionLoading("customer");
    try {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ soldToContactId: contactId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update customer");
      }

      toast.success("Customer updated");
      setIsEditingCustomer(false);
      fetchDeal();
      onUpdate?.();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateInvoiceTo = async (contactId) => {
    setActionLoading("invoiceTo");
    try {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceToContactId: contactId || null }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update invoice recipient");
      }

      toast.success("Invoice recipient updated");
      setIsEditingInvoiceTo(false);
      fetchDeal();
      onUpdate?.();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Update invoice to option when deal loads
  useEffect(() => {
    if (deal) {
      if (deal.invoiceToContactId && deal.invoiceToContactId !== deal.soldToContactId) {
        setInvoiceToOption("OTHER");
      } else {
        setInvoiceToOption("CUSTOMER");
      }
    }
  }, [deal?.id, deal?.invoiceToContactId, deal?.soldToContactId]);

  // Generic field update handler
  const handleUpdateField = async (updates, successMessage) => {
    setActionLoading("field");
    try {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update");
      }

      if (successMessage) toast.success(successMessage);
      fetchDeal();
      onUpdate?.();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Update vehicle price
  const handleUpdatePrice = async () => {
    const price = parseFloat(priceInput);
    if (isNaN(price) || price <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    const updates = { vehiclePriceGross: price };

    // For VAT qualifying, calculate net and VAT
    if (deal.vatScheme === "VAT_QUALIFYING") {
      const vatRate = deal.vatRate || 0.2;
      const net = price / (1 + vatRate);
      updates.vehiclePriceNet = Math.round(net * 100) / 100;
      updates.vehicleVatAmount = Math.round((price - net) * 100) / 100;
    }

    await handleUpdateField(updates, "Price updated");
    setIsEditingPrice(false);
  };

  // Delete draft deal
  const handleDeleteDraft = async () => {
    if (deal.status !== "DRAFT") {
      toast.error("Only draft deals can be deleted");
      return;
    }

    setActionLoading("delete");
    try {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hardDelete: true }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete deal");
      }

      toast.success("Draft deleted");
      setShowDeleteConfirm(false);
      onClose?.();
      onUpdate?.();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Check deal readiness
  const getReadinessChecks = () => {
    if (!deal) return [];

    const checks = [
      {
        id: "vehicle",
        label: "Vehicle selected",
        passed: !!deal.vehicleId || !!deal.vehicle,
        tab: null, // Vehicle is auto-selected on deal creation
      },
      {
        id: "customer",
        label: "Customer selected",
        passed: !!deal.soldToContactId || !!deal.customer,
        tab: "customer",
      },
      {
        id: "saleType",
        label: "Sale type set",
        passed: !!deal.saleType,
        tab: "overview",
      },
      {
        id: "paymentType",
        label: "Settlement plan set",
        passed: !!deal.paymentType,
        tab: "overview",
      },
      {
        id: "price",
        label: "Vehicle price set",
        passed: deal.vehiclePriceGross > 0,
        tab: "overview",
      },
      {
        id: "vatScheme",
        label: "VAT treatment set",
        passed: !!deal.vatScheme,
        tab: "overview",
      },
    ];

    return checks;
  };

  // Check if deposit can be taken
  const canTakeDeposit = () => {
    if (!deal) return { allowed: false, reasons: [] };

    const reasons = [];
    if (!deal.soldToContactId && !deal.customer) reasons.push("Customer not selected");
    if (!deal.vehiclePriceGross || deal.vehiclePriceGross <= 0) reasons.push("Vehicle price not set");

    return { allowed: reasons.length === 0, reasons };
  };

  // Check if invoice can be generated
  const canGenerateInvoice = () => {
    if (!deal) return { allowed: false, reasons: [] };

    // Already invoiced
    if (["INVOICED", "DELIVERED", "COMPLETED"].includes(deal.status)) {
      return { allowed: false, reasons: ["Invoice already generated"] };
    }
    if (deal.status === "CANCELLED") {
      return { allowed: false, reasons: ["Deal is cancelled"] };
    }

    const reasons = [];
    if (!deal.soldToContactId && !deal.customer) reasons.push("Customer not selected");
    if (!deal.vehiclePriceGross || deal.vehiclePriceGross <= 0) reasons.push("Vehicle price not set");
    if (!deal.vatScheme) reasons.push("VAT treatment not set");
    if (!deal.saleType) reasons.push("Sale type not set");

    return { allowed: reasons.length === 0, reasons };
  };

  if (!isOpen) return null;

  const totals = calculateTotals();
  const statusConfig = STATUS_CONFIG[deal?.status] || STATUS_CONFIG.DRAFT;

  return (
    <div
      className="fixed inset-0 flex justify-end z-50 drawer-locked"
      style={{ touchAction: "none", overscrollBehavior: "none" }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="relative bg-[#f8fafc] flex flex-col w-full max-w-3xl min-w-0 translate-x-0 overflow-x-hidden shadow-2xl"
        style={{
          height: "100dvh",
          maxHeight: "100dvh",
          touchAction: "pan-y",
        }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <span className="loading loading-spinner loading-lg text-[#0066CC]"></span>
          </div>
        ) : fetchError ? (
          <div className="flex flex-col items-center justify-center h-full p-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-slate-900 mb-1">Failed to load deal</p>
            <p className="text-sm text-slate-500 text-center mb-4">{fetchError}</p>
            <div className="flex gap-2">
              <button className="btn btn-ghost" onClick={onClose}>
                Close
              </button>
              <button className="btn bg-[#0066CC] hover:bg-[#0052a3] text-white border-none" onClick={fetchDeal}>
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Retry
              </button>
            </div>
          </div>
        ) : !deal ? (
          <div className="flex flex-col items-center justify-center h-full p-6">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-slate-900 mb-1">Deal not found</p>
            <p className="text-sm text-slate-500 text-center mb-4">This deal may have been deleted or you may not have access</p>
            <button className="btn btn-ghost" onClick={onClose}>
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-slate-100 px-4 md:px-6 py-4 md:py-5 z-10 shrink-0 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100 hover:bg-[#0066CC]/10 text-slate-500 hover:text-[#0066CC] transition-all"
                    onClick={onClose}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div>
                    <h2 className="text-lg md:text-xl font-bold text-slate-900">
                      Deal #{deal.dealNumber || "—"}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                      {deal.vehicle && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-yellow-400 text-black text-xs font-mono font-bold tracking-wider">
                          {deal.vehicle.regCurrent}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {/* Document buttons */}
                <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                  {documents.depositReceipt && (
                    <>
                      <a
                        href={documents.depositReceipt.shareUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs font-medium transition-colors md:min-w-[70px] justify-center"
                        title="View Deposit Receipt"
                      >
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="hidden md:inline">Deposit Receipt</span>
                        <span className="md:hidden">Receipt</span>
                      </a>
                      <button
                        onClick={handleRegenerateReceipt}
                        disabled={actionLoading === "regenerate"}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium transition-colors"
                        title="Regenerate receipt with current deal data"
                      >
                        {actionLoading === "regenerate" ? (
                          <span className="loading loading-spinner loading-xs"></span>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <span>Update Receipt</span>
                          </>
                        )}
                      </button>
                    </>
                  )}
                  {documents.invoice && (
                    <a
                      href={documents.invoice.shareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-medium transition-colors md:min-w-[70px] justify-center"
                      title="View Invoice"
                    >
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Invoice</span>
                    </a>
                  )}
                  <button
                    className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all"
                    onClick={onClose}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="sticky top-[73px] md:top-[89px] bg-white border-b border-slate-100 px-4 py-3 z-10 shrink-0">
              {/* Mobile: Dropdown selector */}
              <div className="md:hidden">
                <select
                  value={activeTab}
                  onChange={(e) => setActiveTab(e.target.value)}
                  className="select select-bordered w-full font-medium"
                >
                  <option value="overview">Summary</option>
                  <option value="customer">Customer</option>
                  <option value="addons">Add-ons ({deal.addOns?.length || 0})</option>
                  <option value="payments">Payments ({deal.payments?.length || 0})</option>
                </select>
              </div>

              {/* Desktop: Pill tabs */}
              <div className="hidden md:flex items-center gap-2 overflow-x-auto pb-1 -mb-1">
                {[
                  { id: "overview", label: "Summary" },
                  { id: "customer", label: "Customer" },
                  { id: "addons", label: "Add-ons", count: deal.addOns?.length },
                  { id: "payments", label: "Payments", count: deal.payments?.length },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                      activeTab === tab.id
                        ? "bg-[#0066CC] text-white shadow-md shadow-[#0066CC]/25"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.count > 0 && (
                      <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold ${
                        activeTab === tab.id
                          ? "bg-white/20 text-white"
                          : "bg-slate-200 text-slate-600"
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div
              className="p-4 md:p-6 space-y-4 md:space-y-6 flex-1 overflow-y-auto overflow-x-hidden min-w-0 overscroll-contain"
              style={{ paddingBottom: "calc(96px + env(safe-area-inset-bottom, 0px))" }}
            >
              {/* Overview Tab */}
              {activeTab === "overview" && (
                <div className="space-y-4">
                  {/* Invoice Generated Banner - fields are locked */}
                  {deal.status === "INVOICED" && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                      <p className="text-sm text-blue-700">
                        <strong>Invoice Generated</strong> - To make changes, void the invoice first.
                      </p>
                    </div>
                  )}

                  {/* Deal Readiness - Show for Draft deals */}
                  {deal.status === "DRAFT" && (() => {
                    const checks = getReadinessChecks();
                    const passedCount = checks.filter(c => c.passed).length;
                    const allPassed = passedCount === checks.length;
                    return (
                      <div className={`rounded-2xl border shadow-sm overflow-hidden ${
                        allPassed ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"
                      }`}>
                        <div className="px-4 py-3 border-b border-inherit">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-800">Deal Readiness</h3>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              allPassed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                            }`}>
                              {passedCount}/{checks.length} complete
                            </span>
                          </div>
                        </div>
                        <div className="p-4 grid grid-cols-2 gap-2">
                          {checks.map((check) => (
                            <div
                              key={check.id}
                              className={`flex items-center gap-2 text-sm ${
                                check.passed ? "text-emerald-700" : "text-amber-700"
                              }`}
                            >
                              {check.passed ? (
                                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              )}
                              <span className={check.passed ? "" : "font-medium"}>
                                {check.tab && !check.passed ? (
                                  <button
                                    onClick={() => setActiveTab(check.tab)}
                                    className="underline hover:no-underline"
                                  >
                                    {check.label}
                                  </button>
                                ) : (
                                  check.label
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Sale Classification Section */}
                  {deal.status === "DRAFT" && (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                      <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
                        <h3 className="text-sm font-bold text-slate-800">Sale Classification</h3>
                      </div>
                      <div className="p-4 space-y-4">
                        {/* Step 1: Sale Type */}
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1.5">Sale Type</label>
                          <div className="flex flex-wrap gap-2">
                            {SALE_TYPE_OPTIONS.map((opt) => (
                              <button
                                key={opt.value}
                                onClick={() => handleUpdateField({
                                  saleType: opt.value,
                                  // Reset dependent fields when sale type changes
                                  ...(opt.value !== "RETAIL" ? { buyerUse: null, saleChannel: null } : {})
                                })}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                  deal.saleType === opt.value
                                    ? "bg-[#0066CC] text-white"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                                title={opt.description}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Step 2: Buyer Use - Only for Retail */}
                        {deal.saleType === "RETAIL" && (
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5">Buyer Use</label>
                            <div className="flex flex-wrap gap-2">
                              {BUYER_USE_OPTIONS.map((opt) => (
                                <button
                                  key={opt.value}
                                  onClick={() => handleUpdateField({ buyerUse: opt.value })}
                                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                    deal.buyerUse === opt.value
                                      ? "bg-[#0066CC] text-white"
                                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                  }`}
                                  title={opt.description}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Step 3: Sale Channel - Only for Retail */}
                        {deal.saleType === "RETAIL" && (
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5">Sale Channel</label>
                            <div className="flex flex-wrap gap-2">
                              {SALE_CHANNEL_OPTIONS.map((opt) => (
                                <button
                                  key={opt.value}
                                  onClick={() => handleUpdateField({ saleChannel: opt.value })}
                                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                    deal.saleChannel === opt.value
                                      ? "bg-[#0066CC] text-white"
                                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                  }`}
                                  title={opt.description}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                            {deal.saleChannel === "DISTANCE" && (
                              <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                14-day cooling off period applies
                              </p>
                            )}
                          </div>
                        )}

                        {/* Buyer Has Seen Vehicle */}
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1.5">Vehicle Inspection</label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={deal.buyerHasSeenVehicle || false}
                              onChange={(e) => handleUpdateField({ buyerHasSeenVehicle: e.target.checked })}
                              className="checkbox checkbox-sm checkbox-primary"
                            />
                            <span className="text-sm text-slate-700">Buyer has viewed the vehicle</span>
                          </label>
                          <p className="text-xs text-slate-400 mt-1 ml-6">
                            Buyer has physically inspected the vehicle and acknowledges any visible defects.
                          </p>
                        </div>

                        {/* Step 4: Business Details - For Trade or Business buyers */}
                        {(deal.saleType === "TRADE" || deal.buyerUse === "BUSINESS") && (
                          <div className="border-t border-slate-100 pt-4 space-y-3">
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Business Details</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs text-slate-500 mb-1">Company Name</label>
                                <input
                                  type="text"
                                  className="input input-sm input-bordered w-full"
                                  placeholder="Company name"
                                  value={deal.businessDetails?.companyName || ""}
                                  onChange={(e) => handleUpdateField({
                                    businessDetails: { ...deal.businessDetails, companyName: e.target.value }
                                  })}
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-slate-500 mb-1">Company Reg Number</label>
                                <input
                                  type="text"
                                  className="input input-sm input-bordered w-full"
                                  placeholder="e.g., 12345678"
                                  value={deal.businessDetails?.companyRegNumber || ""}
                                  onChange={(e) => handleUpdateField({
                                    businessDetails: { ...deal.businessDetails, companyRegNumber: e.target.value }
                                  })}
                                />
                              </div>
                              <div className="md:col-span-2">
                                <label className="block text-xs text-slate-500 mb-1">VAT Number</label>
                                <input
                                  type="text"
                                  className="input input-sm input-bordered w-full"
                                  placeholder="e.g., GB 123 4567 89"
                                  value={deal.businessDetails?.vatNumber || ""}
                                  onChange={(e) => handleUpdateField({
                                    businessDetails: { ...deal.businessDetails, vatNumber: e.target.value }
                                  })}
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* VAT Treatment (Read-only - inherited from vehicle purchase) */}
                        <div className="border-t border-slate-100 pt-4">
                          <label className="block text-xs font-medium text-slate-500 mb-1.5">VAT Treatment</label>
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium ${
                              deal.vatScheme === "VAT_QUALIFYING"
                                ? "bg-blue-100 text-blue-700"
                                : deal.vatScheme === "MARGIN"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-100 text-slate-600"
                            }`}>
                              {VAT_SCHEME_LABELS[deal.vatScheme] || deal.vatScheme || "Not set"}
                            </span>
                            <span className="text-xs text-slate-400">(from vehicle purchase)</span>
                          </div>
                        </div>

                      </div>
                    </div>
                  )}

                  {/* Delivery Section - For DRAFT and DEPOSIT_TAKEN */}
                  {["DRAFT", "DEPOSIT_TAKEN"].includes(deal.status) && (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                      <div className="px-4 py-3 bg-gradient-to-r from-purple-50 to-white border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17.414L5.586 15 4 16.586V19h2.414L8 17.414zM17 8l4-4m0 0l-4-4m4 4H3" />
                            </svg>
                          </div>
                          <h3 className="text-sm font-bold text-slate-800">Fulfilment</h3>
                        </div>
                      </div>
                      <div className="p-4 space-y-3">
                        {/* Fulfilment method selector */}
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateField({ delivery: null })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              !deal.delivery?.isFree && !deal.delivery?.amountGross
                                ? "bg-purple-600 text-white"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                          >
                            Collection
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateField({
                              delivery: { isFree: true, amountGross: null, amountNet: null, vatAmount: null, amount: null }
                            })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              deal.delivery?.isFree
                                ? "bg-purple-600 text-white"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                          >
                            Free Delivery
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateField({
                              delivery: { isFree: false, amountGross: deal.delivery?.amountGross || null, amountNet: deal.delivery?.amountNet || null, vatAmount: deal.delivery?.vatAmount || null }
                            })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              deal.delivery?.isFree === false && deal.delivery?.amountGross !== undefined
                                ? "bg-purple-600 text-white"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                          >
                            Chargeable Delivery
                          </button>
                        </div>

                        {/* Delivery amount - show only for chargeable */}
                        {deal.delivery?.isFree === false && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">£</span>
                              <input
                                type="number"
                                step="0.01"
                                value={deliveryAmountInput}
                                onChange={(e) => setDeliveryAmountInput(e.target.value)}
                                onBlur={() => {
                                  const gross = deliveryAmountInput;
                                  const vatRate = deal.vatRate || 0.2;
                                  let net = "", vat = "";
                                  if (gross) {
                                    net = (parseFloat(gross) / (1 + vatRate)).toFixed(2);
                                    vat = (parseFloat(gross) - parseFloat(net)).toFixed(2);
                                  }
                                  // Only save if value changed
                                  const currentGross = deal.delivery?.amountGross;
                                  const newGross = gross ? parseFloat(gross) : null;
                                  if (currentGross !== newGross) {
                                    handleUpdateField({
                                      delivery: {
                                        ...deal.delivery,
                                        isFree: false,
                                        amountGross: newGross,
                                        amountNet: net ? parseFloat(net) : null,
                                        vatAmount: vat ? parseFloat(vat) : null,
                                        amount: newGross,
                                      }
                                    });
                                  }
                                }}
                                placeholder="Amount (inc VAT)"
                                className="input input-bordered input-sm w-40 pl-7"
                              />
                            </div>
                            {deliveryAmountInput && parseFloat(deliveryAmountInput) > 0 && (
                              <span className="text-xs text-slate-500">
                                (Net: £{(parseFloat(deliveryAmountInput) / (1 + (deal.vatRate || 0.2))).toFixed(2)} + VAT: £{(parseFloat(deliveryAmountInput) - parseFloat(deliveryAmountInput) / (1 + (deal.vatRate || 0.2))).toFixed(2)})
                              </span>
                            )}
                          </div>
                        )}
                        <p className="text-xs text-slate-500">
                          {deal.delivery?.isFree || deal.delivery?.amountGross ? "Delivery charge is added to the total at invoicing" : "Customer will collect the vehicle"}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Finance Selection Section - For DRAFT and DEPOSIT_TAKEN */}
                  {["DRAFT", "DEPOSIT_TAKEN"].includes(deal.status) && (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                      <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-white border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <h3 className="text-sm font-bold text-slate-800">Customer Finance</h3>
                        </div>
                      </div>
                      <div className="p-4 space-y-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={deal.financeSelection?.isFinanced || false}
                            onChange={(e) => handleUpdateField({
                              financeSelection: {
                                ...deal.financeSelection,
                                isFinanced: e.target.checked,
                                toBeConfirmed: !e.target.checked ? false : deal.financeSelection?.toBeConfirmed
                              }
                            })}
                            className="checkbox checkbox-sm checkbox-primary"
                          />
                          <span className="text-sm">Customer is using finance</span>
                        </label>
                        {deal.financeSelection?.isFinanced && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={deal.financeSelection?.toBeConfirmed || false}
                                onChange={(e) => handleUpdateField({
                                  financeSelection: {
                                    ...deal.financeSelection,
                                    toBeConfirmed: e.target.checked,
                                    financeCompanyId: e.target.checked ? "" : deal.financeSelection?.financeCompanyId
                                  }
                                })}
                                className="checkbox checkbox-sm"
                              />
                              <span className="text-sm">To Be Confirmed (TBC)</span>
                            </label>
                            {!deal.financeSelection?.toBeConfirmed && (
                              <ContactPicker
                                value={deal.financeSelection?.financeCompanyContactId || ""}
                                onChange={(contactId, contact) => {
                                  handleUpdateField({
                                    financeSelection: {
                                      ...deal.financeSelection,
                                      financeCompanyContactId: contactId || null
                                    }
                                  });
                                }}
                                filterTypeTags={["FINANCE"]}
                                placeholder="Search or add finance company..."
                                allowCreate={true}
                              />
                            )}
                            {deal.financeSelection?.toBeConfirmed && (
                              <p className="text-xs text-blue-700">
                                Finance company will be confirmed before invoicing
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Warranty Section */}
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 bg-gradient-to-r from-emerald-50 to-white border-b border-slate-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                          </div>
                          <h3 className="text-sm font-bold text-slate-800">Warranty</h3>
                        </div>
                        {/* Edit and Remove buttons - only for DRAFT or DEPOSIT_TAKEN status */}
                        {["DRAFT", "DEPOSIT_TAKEN"].includes(deal.status) && deal.warranty?.included && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setWarrantyEditForm({
                                  name: deal.warranty.name || "",
                                  description: deal.warranty.description || "",
                                  durationMonths: deal.warranty.durationMonths || "",
                                  claimLimit: deal.warranty.claimLimit || "",
                                  priceGross: deal.warranty.priceGross || "",
                                  type: deal.warranty.type || "DEFAULT",
                                });
                                setShowEditWarrantyModal(true);
                              }}
                              className="btn btn-ghost btn-xs"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                              Edit
                            </button>
                            <button
                              onClick={handleRemoveWarranty}
                              disabled={actionLoading === "removeWarranty"}
                              className="btn btn-ghost btn-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              {actionLoading === "removeWarranty" ? (
                                <span className="loading loading-spinner loading-xs"></span>
                              ) : (
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              )}
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="p-4">
                      {deal.warranty?.included ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-emerald-700">{deal.warranty.name || "Warranty"}</span>
                              {deal.warranty.type && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                  deal.warranty.type === "DEFAULT" ? "bg-emerald-100 text-emerald-700" :
                                  deal.warranty.type === "THIRD_PARTY" ? "bg-blue-100 text-blue-700" :
                                  "bg-slate-100 text-slate-600"
                                }`}>
                                  {deal.warranty.type === "DEFAULT" ? "Default" :
                                   deal.warranty.type === "THIRD_PARTY" ? "Third Party" :
                                   deal.warranty.type}
                                </span>
                              )}
                            </div>
                            {deal.warranty.priceGross > 0 ? (
                              <span className="font-semibold text-emerald-700">{formatCurrency(deal.warranty.priceGross)}</span>
                            ) : (
                              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">FREE</span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            {deal.warranty.durationMonths && (
                              <span>{deal.warranty.durationMonths} months</span>
                            )}
                            {deal.warranty.claimLimit ? (
                              <span>Claim limit: {formatCurrency(deal.warranty.claimLimit)}</span>
                            ) : (
                              <span>Unlimited claims</span>
                            )}
                          </div>
                          {deal.warranty.description && (
                            <p className="text-xs text-slate-500 mt-1">{deal.warranty.description}</p>
                          )}
                        </div>
                      ) : deal.warranty?.type === "TRADE" ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-amber-700">Trade Sale / No Warranty</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">Trade</span>
                          </div>
                          {deal.warranty.tradeTermsText && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mt-2">
                              <p className="text-xs text-amber-700">{deal.warranty.tradeTermsText}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="py-2">
                          <p className="text-sm text-slate-500 text-center">No warranty included</p>
                          {["DRAFT", "DEPOSIT_TAKEN"].includes(deal.status) && (
                            <div className="mt-3 space-y-3">
                              {/* Default Warranty Option */}
                              {dealer?.salesSettings?.defaultWarranty?.enabled && (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                                  <p className="text-xs text-emerald-700 font-medium mb-2">Default Warranty:</p>
                                  <div className="text-xs text-emerald-600 space-y-1 mb-3">
                                    <p className="font-medium">{dealer.salesSettings.defaultWarranty.name || "Standard Warranty"}</p>
                                    <p>
                                      {dealer.salesSettings.defaultWarranty.durationMonths || 3} months
                                      {" • "}
                                      {dealer.salesSettings.defaultWarranty.claimLimit
                                        ? `Claim limit: ${formatCurrency(dealer.salesSettings.defaultWarranty.claimLimit)}`
                                        : "Unlimited claims"}
                                    </p>
                                    <p>
                                      {dealer.salesSettings.defaultWarranty.type === "PAID" && dealer.salesSettings.defaultWarranty.priceGross > 0
                                        ? formatCurrency(dealer.salesSettings.defaultWarranty.priceGross)
                                        : "FREE"}
                                    </p>
                                  </div>
                                  <button
                                    onClick={handleApplyDefaultWarranty}
                                    disabled={actionLoading === "applyWarranty"}
                                    className="w-full px-3 py-1.5 text-xs font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors disabled:opacity-50"
                                  >
                                    {actionLoading === "applyWarranty" ? "Applying..." : "Apply Default Warranty"}
                                  </button>
                                </div>
                              )}

                              {/* Third-Party Warranty Option */}
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <p className="text-xs text-blue-700 font-medium mb-2">Third-Party Warranty:</p>
                                {!showWarrantyPicker ? (
                                  <button
                                    onClick={() => {
                                      fetchWarrantyProducts();
                                      setShowWarrantyPicker(true);
                                    }}
                                    disabled={actionLoading === "applyWarranty"}
                                    className="w-full px-3 py-1.5 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50"
                                  >
                                    Select Third-Party Warranty
                                  </button>
                                ) : (
                                  <div className="space-y-2">
                                    {warrantyProductsLoading ? (
                                      <div className="flex justify-center py-2">
                                        <span className="loading loading-spinner loading-sm text-blue-500"></span>
                                      </div>
                                    ) : (
                                      <div className="space-y-2 max-h-40 overflow-y-auto">
                                        {warrantyProducts.map((wp) => (
                                          <button
                                            key={wp.id}
                                            onClick={() => handleApplyThirdPartyWarranty(wp)}
                                            disabled={actionLoading === "applyWarranty"}
                                            className="w-full text-left p-2 bg-white border border-blue-100 rounded-lg hover:border-blue-300 transition-colors disabled:opacity-50"
                                          >
                                            <div className="flex items-center justify-between">
                                              <span className="text-xs font-medium text-slate-700">{wp.name}</span>
                                              <span className="text-xs font-semibold text-blue-600">
                                                {wp.priceGross > 0 ? formatCurrency(wp.priceGross) : "FREE"}
                                              </span>
                                            </div>
                                            <div className="text-[10px] text-slate-500 mt-0.5">
                                              {wp.termMonths && `${wp.termMonths} months`}
                                              {wp.termMonths && wp.claimLimit && " • "}
                                              {wp.claimLimit ? `Limit: ${formatCurrency(wp.claimLimit)}` : "Unlimited"}
                                            </div>
                                          </button>
                                        ))}
                                      </div>
                                    )}

                                    {/* Create New Warranty Form */}
                                    {showNewWarrantyForm ? (
                                      <div className="bg-white border border-blue-200 rounded-lg p-3 space-y-2">
                                        <p className="text-xs font-medium text-blue-700 mb-2">Create New Warranty</p>
                                        <input
                                          type="text"
                                          placeholder="Warranty Name *"
                                          value={newWarrantyForm.name}
                                          onChange={(e) => setNewWarrantyForm({ ...newWarrantyForm, name: e.target.value })}
                                          className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                        <div className="grid grid-cols-2 gap-2">
                                          <input
                                            type="number"
                                            placeholder="Term (months)"
                                            value={newWarrantyForm.termMonths}
                                            onChange={(e) => setNewWarrantyForm({ ...newWarrantyForm, termMonths: e.target.value })}
                                            className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                                          />
                                          <input
                                            type="number"
                                            placeholder="Claim Limit (£)"
                                            value={newWarrantyForm.claimLimit}
                                            onChange={(e) => setNewWarrantyForm({ ...newWarrantyForm, claimLimit: e.target.value })}
                                            className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                                          />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                          <input
                                            type="number"
                                            placeholder="Price (£)"
                                            value={newWarrantyForm.priceGross}
                                            onChange={(e) => setNewWarrantyForm({ ...newWarrantyForm, priceGross: e.target.value })}
                                            className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                                          />
                                          <input
                                            type="number"
                                            placeholder="Cost to Dealer (£)"
                                            value={newWarrantyForm.costPrice}
                                            onChange={(e) => setNewWarrantyForm({ ...newWarrantyForm, costPrice: e.target.value })}
                                            className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                                          />
                                        </div>
                                        <select
                                          value={newWarrantyForm.vatTreatment}
                                          onChange={(e) => setNewWarrantyForm({ ...newWarrantyForm, vatTreatment: e.target.value })}
                                          className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        >
                                          <option value="NO_VAT">No VAT</option>
                                          <option value="STANDARD">Standard VAT (20%)</option>
                                          <option value="EXEMPT">VAT Exempt</option>
                                        </select>
                                        <textarea
                                          placeholder="Description (optional)"
                                          value={newWarrantyForm.description}
                                          onChange={(e) => setNewWarrantyForm({ ...newWarrantyForm, description: e.target.value })}
                                          rows={2}
                                          className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                        <div className="flex gap-2">
                                          <button
                                            onClick={handleCreateAndApplyWarranty}
                                            disabled={savingWarranty || !newWarrantyForm.name.trim()}
                                            className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50"
                                          >
                                            {savingWarranty ? "Saving..." : "Create & Apply"}
                                          </button>
                                          <button
                                            onClick={() => setShowNewWarrantyForm(false)}
                                            className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => setShowNewWarrantyForm(true)}
                                        className="w-full px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                                      >
                                        + Create New Warranty
                                      </button>
                                    )}

                                    <p className="text-[10px] text-slate-400 text-center">
                                      Manage warranties in <a href="/settings" className="text-blue-600 hover:underline">Settings</a>
                                    </p>

                                    <button
                                      onClick={() => {
                                        setShowWarrantyPicker(false);
                                        setShowNewWarrantyForm(false);
                                      }}
                                      className="w-full px-3 py-1 text-xs text-slate-500 hover:text-slate-700"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          {!["DRAFT", "DEPOSIT_TAKEN"].includes(deal.status) && (
                            <p className="text-xs text-slate-400 mt-1 text-center">Warranty can only be added before invoice</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Vehicle Section */}
                  {deal.vehicle && (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                      <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8m-8 5h8m-4-9a9 9 0 110 18 9 9 0 010-18z" />
                            </svg>
                          </div>
                          <h3 className="text-sm font-bold text-slate-800">Vehicle</h3>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex items-start gap-4">
                          {deal.vehicle.primaryImageUrl && (
                            <img
                              src={deal.vehicle.primaryImageUrl}
                              alt={`${deal.vehicle.make} ${deal.vehicle.model}`}
                              className="w-20 h-20 object-cover rounded-xl"
                            />
                          )}
                          <div className="flex-1">
                            <p className="font-semibold text-slate-900">
                              {deal.vehicle.year} {deal.vehicle.make} {deal.vehicle.model}
                            </p>
                            <p className="text-sm text-slate-500 mt-1">
                              {deal.vehicle.regCurrent}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Pricing Summary */}
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <h3 className="text-sm font-bold text-slate-800">Pricing</h3>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${
                          deal.vatScheme === "VAT_QUALIFYING"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-slate-100 text-slate-600"
                        }`}>
                          {VAT_SCHEME_LABELS[deal.vatScheme] || deal.vatScheme}
                        </span>
                      </div>
                    </div>
                    <div className="p-4 space-y-3">
                      {/* Vehicle Price - Editable for Draft */}
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Vehicle</span>
                        {deal.status === "DRAFT" && isEditingPrice ? (
                          <div className="flex items-center gap-2">
                            <div className="relative w-28">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm">£</span>
                              <input
                                type="number"
                                step="0.01"
                                className="input input-sm input-bordered w-full pl-6 pr-2 text-right"
                                value={priceInput}
                                onChange={(e) => setPriceInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleUpdatePrice();
                                  if (e.key === "Escape") setIsEditingPrice(false);
                                }}
                                autoFocus
                              />
                            </div>
                            <button
                              onClick={handleUpdatePrice}
                              disabled={actionLoading === "field"}
                              className="btn btn-xs btn-ghost text-emerald-600"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => setIsEditingPrice(false)}
                              className="btn btn-xs btn-ghost text-slate-400"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">
                              {deal.vehiclePriceGross > 0
                                ? formatCurrency(deal.vehiclePriceGross)
                                : "—"}
                            </span>
                            {deal.status === "DRAFT" && (
                              <button
                                onClick={() => {
                                  setPriceInput(deal.vehiclePriceGross?.toString() || "");
                                  setIsEditingPrice(true);
                                }}
                                className="btn btn-xs btn-ghost text-[#0066CC]"
                              >
                                Edit
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Show net + VAT breakdown for VAT Qualifying */}
                      {deal.vatScheme === "VAT_QUALIFYING" && deal.vehiclePriceGross > 0 && (
                        <div className="text-xs text-slate-500 text-right">
                          Net: {formatCurrency(deal.vehiclePriceNet)} + VAT: {formatCurrency(deal.vehicleVatAmount)}
                        </div>
                      )}

                      {/* Add-ons */}
                      {totals.addOnsNetTotal > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600">Add-ons</span>
                          <span className="font-semibold text-slate-900">
                            {formatCurrency(totals.addOnsNetTotal)}
                          </span>
                        </div>
                      )}

                      {/* Delivery */}
                      {(deal.delivery?.amount > 0 || deal.delivery?.amountGross > 0 || deal.delivery?.isFree) && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600">Delivery</span>
                          <span className="font-semibold text-slate-900">
                            {deal.delivery?.isFree ? (
                              <span className="text-emerald-600">FREE</span>
                            ) : (
                              formatCurrency(totals.deliveryAmount)
                            )}
                          </span>
                        </div>
                      )}

                      {/* VAT (only for VAT Qualifying) */}
                      {deal.vatScheme === "VAT_QUALIFYING" && totals.totalVat > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600">VAT @ 20%</span>
                          <span className="font-semibold text-slate-900">
                            {formatCurrency(totals.totalVat)}
                          </span>
                        </div>
                      )}

                      <div className="border-t border-slate-100 pt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-semibold text-slate-700">Total</span>
                          <span className="text-lg font-bold text-slate-900">
                            {formatCurrency(totals.grandTotal)}
                          </span>
                        </div>
                      </div>

                      {/* Part Exchange */}
                      {totals.pxNetValue > 0 && (
                        <div className="flex justify-between items-center text-emerald-600">
                          <span className="text-sm">Part Exchange</span>
                          <span className="font-semibold">-{formatCurrency(totals.pxNetValue)}</span>
                        </div>
                      )}

                      {/* Payments Summary */}
                      {totals.totalPaid > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-emerald-600">
                            <span className="text-sm">Paid</span>
                            <span className="font-semibold">-{formatCurrency(totals.totalPaid)}</span>
                          </div>
                          {/* Payment History */}
                          {deal.payments?.filter(p => !p.isRefunded).length > 0 && (
                            <div className="text-xs text-slate-500 space-y-0.5 pl-2 border-l-2 border-emerald-200 ml-1">
                              {deal.payments.filter(p => !p.isRefunded).map((payment, idx) => (
                                <div key={idx} className="flex justify-between items-center">
                                  <span>
                                    {formatDate(payment.paidAt)} - {payment.method?.replace(/_/g, " ") || "Payment"}
                                    {payment.reference && ` (${payment.reference})`}
                                  </span>
                                  <span className="font-medium">{formatCurrency(payment.amount)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Balance Due */}
                      <div className="border-t border-slate-100 pt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-semibold text-slate-700">Balance Due</span>
                          <span className={`text-lg font-bold ${
                            totals.balanceDue <= 0 ? "text-emerald-600" : "text-slate-900"
                          }`}>
                            {formatCurrency(Math.max(0, totals.balanceDue))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Part Exchange Section */}
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 bg-gradient-to-r from-emerald-50 to-white border-b border-slate-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                          </div>
                          <h3 className="text-sm font-bold text-slate-800">Part Exchange{(deal.partExchanges?.length || 0) > 1 ? "s" : ""}</h3>
                          {(deal.partExchanges?.length || 0) > 0 && (
                            <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-medium">
                              {deal.partExchanges.length}
                            </span>
                          )}
                        </div>
                        {/* Allow adding PX in DRAFT and DEPOSIT_TAKEN, max 2 */}
                        {(deal.partExchanges?.length || 0) < 2 && ["DRAFT", "DEPOSIT_TAKEN"].includes(deal.status) && (
                          <button
                            onClick={() => setShowPxModal(true)}
                            className="btn btn-ghost btn-xs text-emerald-600"
                          >
                            + Add PX
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Display partExchanges array (new) or fall back to legacy partExchange */}
                    {(deal.partExchanges?.length > 0) ? (
                      <div className="p-4 space-y-4">
                        {deal.partExchanges.map((px, idx) => (
                          <div key={idx} className={idx > 0 ? "pt-4 border-t border-slate-100" : ""}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Vehicle {deal.partExchanges.length > 1 ? `#${idx + 1}` : ""}</span>
                                <p className="font-semibold text-slate-900 mt-0.5">
                                  {px.vrm} - {px.make} {px.model}
                                </p>
                                {(px.year || px.colour || px.mileage) && (
                                  <p className="text-sm text-slate-500 mt-0.5">
                                    {px.year && `${px.year}`}
                                    {px.colour && `${px.year ? ' • ' : ''}${px.colour}`}
                                    {px.mileage && `${(px.year || px.colour) ? ' • ' : ''}${px.mileage.toLocaleString()} miles`}
                                  </p>
                                )}
                              </div>
                              {/* Edit and Remove buttons - only in DRAFT or DEPOSIT_TAKEN */}
                              {["DRAFT", "DEPOSIT_TAKEN"].includes(deal.status) && (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleEditPartExchange(idx)}
                                    className="btn btn-ghost btn-xs text-emerald-600 hover:bg-emerald-50"
                                    title="Edit PX"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => handleRemovePartExchange(idx)}
                                    className="btn btn-ghost btn-xs text-red-500 hover:bg-red-50"
                                    title="Remove PX"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              )}
                            </div>
                            <div className="grid grid-cols-3 gap-3 mt-2">
                              <div>
                                <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Allowance</span>
                                <p className="font-semibold text-slate-900 mt-0.5">
                                  {formatCurrency(px.allowance)}
                                </p>
                              </div>
                              {px.settlement > 0 && (
                                <div>
                                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Settlement</span>
                                  <p className="font-semibold text-red-600 mt-0.5">
                                    -{formatCurrency(px.settlement)}
                                  </p>
                                </div>
                              )}
                              <div>
                                <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Net</span>
                                <p className="font-bold text-emerald-600 mt-0.5">
                                  {formatCurrency((px.allowance || 0) - (px.settlement || 0))}
                                </p>
                              </div>
                            </div>
                            {/* Finance settlement info */}
                            {px.hasFinance && (
                              <div className="mt-2 flex items-center gap-2 text-xs flex-wrap">
                                <span className="text-blue-600">
                                  Finance: {px.financeCompanyName || "TBC"}
                                </span>
                                {px.hasSettlementInWriting ? (
                                  <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-medium">
                                    Settlement In Writing ✓
                                  </span>
                                ) : (
                                  <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                                    Settlement TBC
                                  </span>
                                )}
                                {/* Toggle settlement button - available for INVOICED/DELIVERED deals */}
                                {["INVOICED", "DELIVERED"].includes(deal.status) && !px.hasSettlementInWriting && (
                                  <button
                                    onClick={() => handleToggleSettlementReceived(idx)}
                                    className="btn btn-xs btn-outline btn-success gap-1"
                                    title="Mark settlement as received in writing"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Mark Received
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                        {/* Total if multiple PXs */}
                        {deal.partExchanges.length > 1 && (
                          <div className="pt-3 border-t border-slate-200">
                            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Total PX Value</span>
                            <p className="font-bold text-emerald-700 text-lg mt-0.5">
                              {formatCurrency(totals.pxNetValue)}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : deal.partExchange ? (
                      /* Legacy single PX display for backwards compatibility */
                      <div className="p-4 space-y-3">
                        <div>
                          <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Vehicle</span>
                          <p className="font-semibold text-slate-900 mt-0.5">
                            {deal.partExchange.vrm} - {deal.partExchange.make} {deal.partExchange.model}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Allowance</span>
                            <p className="font-semibold text-slate-900 mt-0.5">
                              {formatCurrency(deal.partExchange.allowance)}
                            </p>
                          </div>
                          {deal.partExchange.settlement > 0 && (
                            <div>
                              <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Settlement</span>
                              <p className="font-semibold text-red-600 mt-0.5">
                                -{formatCurrency(deal.partExchange.settlement)}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="pt-2 border-t border-slate-100">
                          <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Net Value</span>
                          <p className="font-bold text-emerald-600 mt-0.5">
                            {formatCurrency(totals.pxNetValue)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4">
                        <p className="text-sm text-slate-400 text-center py-4">No part exchange on this deal</p>
                        {["DRAFT", "DEPOSIT_TAKEN"].includes(deal.status) && (
                          <button
                            onClick={() => setShowPxModal(true)}
                            className="btn btn-outline btn-sm w-full text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Add Part Exchange
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Add-ons Section */}
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 bg-gradient-to-r from-violet-50 to-white border-b border-slate-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                            <svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <h3 className="text-sm font-bold text-slate-800">Add-ons</h3>
                          {deal.addOns?.length > 0 && (
                            <span className="bg-violet-100 text-violet-700 text-xs px-2 py-0.5 rounded-full font-medium">
                              {deal.addOns.length} item{deal.addOns.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        {["DRAFT", "DEPOSIT_TAKEN"].includes(deal.status) && (
                          <button
                            onClick={() => setActiveTab("addons")}
                            className="btn btn-ghost btn-xs text-violet-600"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="p-4">
                      {deal.addOns?.length > 0 ? (
                        <div className="space-y-2">
                          {deal.addOns.map((addon, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-2 rounded-lg bg-violet-50 border border-violet-100"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-900 text-sm">{addon.name}</p>
                                {addon.qty > 1 && (
                                  <p className="text-xs text-slate-500">Qty: {addon.qty}</p>
                                )}
                              </div>
                              <p className="font-semibold text-violet-700 text-sm">
                                {formatCurrency(addon.unitPriceNet * (addon.qty || 1))}
                              </p>
                            </div>
                          ))}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Total Add-ons</span>
                            <p className="font-bold text-violet-700">
                              {formatCurrency(deal.addOns.reduce((sum, a) => sum + (a.unitPriceNet * (a.qty || 1)), 0))}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-sm text-slate-400">No add-ons on this deal</p>
                          {["DRAFT", "DEPOSIT_TAKEN"].includes(deal.status) && (
                            <button
                              onClick={() => setActiveTab("addons")}
                              className="btn btn-outline btn-sm mt-2 text-violet-600 border-violet-200 hover:bg-violet-50"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                              Add Add-ons
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Agreed Work Items Section */}
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 bg-gradient-to-r from-orange-50 to-white border-b border-slate-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                            <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <h3 className="text-sm font-bold text-slate-800">Agreed Work</h3>
                          {deal.requests?.length > 0 && (
                            <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full font-medium">
                              {deal.requests.filter(r => r.status !== "DONE" && r.status !== "CANCELLED").length} pending
                            </span>
                          )}
                        </div>
                        {["DRAFT", "DEPOSIT_TAKEN"].includes(deal.status) && (
                          <button
                            onClick={() => setShowAgreedWorkModal(true)}
                            className="btn btn-ghost btn-xs text-orange-600"
                          >
                            + Add
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="p-4">
                      {deal.requests?.length > 0 ? (
                        <div className="space-y-3">
                          {deal.requests.map((req, idx) => (
                            <div
                              key={idx}
                              className={`flex items-start justify-between gap-3 p-3 rounded-xl ${
                                req.status === "DONE"
                                  ? "bg-emerald-50 border border-emerald-200"
                                  : req.status === "CANCELLED"
                                    ? "bg-slate-50 border border-slate-200 opacity-60"
                                    : "bg-orange-50 border border-orange-200"
                              }`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                    req.type === "PREP" ? "bg-blue-100 text-blue-700" :
                                    req.type === "COSMETIC" ? "bg-purple-100 text-purple-700" :
                                    req.type === "ACCESSORY" ? "bg-cyan-100 text-cyan-700" :
                                    "bg-slate-100 text-slate-600"
                                  }`}>
                                    {req.type}
                                  </span>
                                  {req.linkToIssueId && (
                                    <span className="text-xs text-slate-400">Synced to vehicle</span>
                                  )}
                                </div>
                                <p className={`font-medium mt-1 ${req.status === "DONE" ? "line-through text-slate-500" : "text-slate-900"}`}>
                                  {req.title}
                                </p>
                                {req.details && (
                                  <p className="text-sm text-slate-500 mt-0.5">{req.details}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {req.status !== "DONE" && req.status !== "CANCELLED" && (
                                  <button
                                    onClick={() => handleUpdateAgreedWorkStatus(idx, "DONE")}
                                    disabled={actionLoading === "agreedWork"}
                                    className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-all"
                                    title="Mark as done"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </button>
                                )}
                                {deal.status === "DRAFT" && (
                                  <button
                                    onClick={() => handleRemoveAgreedWork(idx)}
                                    disabled={actionLoading === "agreedWork"}
                                    className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all"
                                    title="Remove"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-sm text-slate-400">No agreed work items</p>
                          <p className="text-xs text-slate-400 mt-1">
                            Add items that have been promised to the customer
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Service Documentation - PDI and Service Receipt status */}
                  {deal.status !== "CANCELLED" && deal.vehicleId && (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                      <div className="px-4 py-3 bg-gradient-to-r from-teal-50 to-white border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
                            <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <h3 className="text-sm font-bold text-slate-800">Service Documentation</h3>
                        </div>
                      </div>
                      <div className="p-4 space-y-3">
                        {/* PDI Status */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                            <span className="text-sm text-slate-700">PDI</span>
                          </div>
                          {linkedSubmissions?.pdi ? (
                            <div className="flex items-center gap-2">
                              <a
                                href={`/forms?tab=submissions&viewSubmission=${linkedSubmissions.pdi.id}`}
                                className="text-xs text-emerald-600 font-medium hover:underline flex items-center gap-1"
                              >
                                View / Edit
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </a>
                              <button
                                onClick={() => window.open(`/forms?tab=submissions&viewSubmission=${linkedSubmissions.pdi.id}&print=true`, '_blank')}
                                className="text-xs text-slate-500 hover:text-slate-700"
                                title="Print PDI"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-amber-600 font-medium">Not completed</span>
                          )}
                        </div>

                        {/* Service Receipt Status */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z" />
                            </svg>
                            <span className="text-sm text-slate-700">Service Receipt</span>
                          </div>
                          {linkedSubmissions?.serviceReceipt ? (
                            <div className="flex items-center gap-2">
                              <a
                                href={`/forms?tab=submissions&viewSubmission=${linkedSubmissions.serviceReceipt.id}`}
                                className="text-xs text-emerald-600 font-medium hover:underline flex items-center gap-1"
                              >
                                View / Edit
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </a>
                              <button
                                onClick={() => window.open(`/forms?tab=submissions&viewSubmission=${linkedSubmissions.serviceReceipt.id}&print=true`, '_blank')}
                                className="text-xs text-slate-500 hover:text-slate-700"
                                title="Print Service Receipt"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setShowServiceReceiptModal(true)}
                              className="btn btn-xs btn-outline gap-1"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              Add Service Receipt
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Next Actions */}
                  {deal.status !== "COMPLETED" && deal.status !== "CANCELLED" && (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                      <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-white border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                          </div>
                          <h3 className="text-sm font-bold text-slate-800">Next Actions</h3>
                        </div>
                      </div>
                      <div className="p-4 space-y-4">
                        {/* Take Deposit - for Draft or Deposit_Taken status */}
                        {(deal.status === "DRAFT" || deal.status === "DEPOSIT_TAKEN") && (() => {
                          const { allowed, reasons } = canTakeDeposit();
                          return (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-700">Take Deposit</span>
                                {deal.status === "DEPOSIT_TAKEN" && (
                                  <span className="text-xs text-emerald-600 font-medium">Additional deposit</span>
                                )}
                              </div>
                              {deal.status === "DRAFT" && !allowed && reasons.length > 0 && (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                                  <p className="text-xs font-medium text-amber-800 mb-1.5">Required:</p>
                                  <ul className="space-y-1">
                                    {reasons.map((r, i) => (
                                      <li key={i} className="text-xs text-amber-700 flex items-center gap-1.5">
                                        <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        {r}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              <button
                                onClick={() => (allowed || deal.status === "DEPOSIT_TAKEN") && setShowDepositModal(true)}
                                disabled={actionLoading || (deal.status === "DRAFT" && !allowed)}
                                className={`btn btn-sm w-full border-none ${
                                  allowed || deal.status === "DEPOSIT_TAKEN"
                                    ? "bg-amber-500 hover:bg-amber-600 text-white"
                                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                                }`}
                              >
                                {actionLoading === "deposit" ? (
                                  <span className="loading loading-spinner loading-xs"></span>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                    </svg>
                                    {deal.status === "DEPOSIT_TAKEN" ? "Take Additional Deposit" : "Take Deposit"}
                                  </>
                                )}
                              </button>
                            </div>
                          );
                        })()}

                        {/* Sign Deposit Receipt - only for DEPOSIT_TAKEN, non-distance sales, and if receipt exists */}
                        {deal.status === "DEPOSIT_TAKEN" && deal.saleChannel !== "DISTANCE" && documents.depositReceipt && (
                          <div className="space-y-2 pt-2 border-t border-slate-100">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-slate-700">Deposit Receipt Signature</span>
                              {deal.depositSignature?.customerSignedAt && deal.depositSignature?.dealerSignedAt ? (
                                <span className="text-xs text-emerald-600 font-medium">Complete</span>
                              ) : deal.depositSignature?.customerSignedAt || deal.depositSignature?.dealerSignedAt ? (
                                <span className="text-xs text-amber-600 font-medium">Partial</span>
                              ) : (
                                <span className="text-xs text-slate-400">Not signed</span>
                              )}
                            </div>
                            {deal.depositSignature?.customerSignedAt && deal.depositSignature?.dealerSignedAt ? (
                              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-1">
                                <p className="text-xs text-emerald-700">
                                  <span className="font-medium">Customer:</span> {deal.depositSignature.customerSignerName} ({formatDate(deal.depositSignature.customerSignedAt)})
                                </p>
                                <p className="text-xs text-emerald-700">
                                  <span className="font-medium">Dealer:</span> {deal.depositSignature.dealerSignerName} ({formatDate(deal.depositSignature.dealerSignedAt)})
                                </p>
                              </div>
                            ) : (
                              <button
                                onClick={() => setShowDepositSignatureModal(true)}
                                disabled={actionLoading}
                                className="btn btn-sm w-full bg-purple-500 hover:bg-purple-600 text-white border-none"
                              >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                                {deal.depositSignature?.customerSignedAt ? "Dealer Countersign Receipt" : "Sign Deposit Receipt"}
                              </button>
                            )}
                          </div>
                        )}

                        {/* Generate Invoice */}
                        {(deal.status === "DRAFT" || deal.status === "DEPOSIT_TAKEN") && (() => {
                          const { allowed, reasons } = canGenerateInvoice();
                          return (
                            <div className="space-y-2 pt-2 border-t border-slate-100">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-700">Generate Invoice</span>
                                {deal.status === "DRAFT" && (
                                  <span className="text-xs text-slate-400">Invoice-first supported</span>
                                )}
                              </div>
                              {!allowed && reasons.length > 0 && !reasons.includes("Invoice already generated") && (
                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                                  <p className="text-xs font-medium text-blue-800 mb-1.5">Required:</p>
                                  <ul className="space-y-1">
                                    {reasons.map((r, i) => (
                                      <li key={i} className="text-xs text-blue-700 flex items-center gap-1.5">
                                        <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        {r}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              <button
                                onClick={() => allowed && handleGenerateInvoice()}
                                disabled={actionLoading || !allowed}
                                className={`btn btn-sm w-full border-none ${
                                  allowed
                                    ? "bg-blue-500 hover:bg-blue-600 text-white"
                                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                                }`}
                              >
                                {actionLoading === "invoice" ? (
                                  <span className="loading loading-spinner loading-xs"></span>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Generate Invoice
                                  </>
                                )}
                              </button>
                            </div>
                          );
                        })()}

                        {/* Capture Signatures - for invoiced deals */}
                        {["INVOICED", "DELIVERED", "COMPLETED"].includes(deal.status) && (
                          <div className="space-y-2 pt-2 border-t border-slate-100">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-slate-700">E-Signatures</span>
                              {deal.signature?.customerSignedAt && deal.signature?.dealerSignedAt ? (
                                <span className="text-xs text-emerald-600 font-medium">Complete</span>
                              ) : deal.signature?.customerSignedAt || deal.signature?.dealerSignedAt ? (
                                <span className="text-xs text-amber-600 font-medium">Partial</span>
                              ) : (
                                <span className="text-xs text-slate-400">Not signed</span>
                              )}
                            </div>
                            {deal.signature?.customerSignedAt && deal.signature?.dealerSignedAt ? (
                              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-1">
                                <p className="text-xs text-emerald-700">
                                  <span className="font-medium">Customer:</span> {deal.signature.customerSignerName} ({formatDate(deal.signature.customerSignedAt)})
                                </p>
                                <p className="text-xs text-emerald-700">
                                  <span className="font-medium">Dealer:</span> {deal.signature.dealerSignerName} ({formatDate(deal.signature.dealerSignedAt)})
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {/* Showroom signing */}
                                <button
                                  onClick={() => setShowSignatureModal(true)}
                                  disabled={actionLoading}
                                  className="btn btn-sm w-full bg-indigo-500 hover:bg-indigo-600 text-white border-none"
                                >
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                  {deal.signature?.customerSignedAt
                                    ? "Dealer Countersign"
                                    : (deal.delivery?.amount > 0 || deal.delivery?.amountGross > 0 || deal.delivery?.isFree)
                                      ? "Sign Invoice"
                                      : "Sign in Showroom"}
                                </button>

                                {/* Driver link - for third-party delivery */}
                                {(deal.delivery?.amount > 0 || deal.delivery?.amountGross > 0 || deal.delivery?.isFree) && !deal.signature?.customerSignedAt && (
                                  <>
                                    <div className="flex items-center gap-2 py-1">
                                      <div className="flex-1 h-px bg-slate-200"></div>
                                      <span className="text-xs text-slate-400">or</span>
                                      <div className="flex-1 h-px bg-slate-200"></div>
                                    </div>

                                    {driverLink ? (
                                      <div className="space-y-2">
                                        <div className="flex gap-2">
                                          <input
                                            type="text"
                                            value={driverLink}
                                            readOnly
                                            className="input input-bordered input-sm flex-1 text-xs font-mono"
                                          />
                                          <button
                                            onClick={copyDriverLink}
                                            className="btn btn-sm btn-ghost"
                                            title="Copy link"
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                          </button>
                                        </div>
                                        <p className="text-xs text-slate-500">
                                          Share this link with your driver. Expires in 24 hours.
                                        </p>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={openDriverLinkModal}
                                        className="btn btn-sm w-full btn-ghost border border-slate-200"
                                      >
                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                        </svg>
                                        Generate Third-Party Driver Link
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Take Payment - when INVOICED and balance due > 0 */}
                        {deal.status === "INVOICED" && totals.balanceDue > 0 && (
                          <button
                            onClick={() => {
                              setTakePaymentForm({
                                amount: totals.balanceDue.toFixed(2),
                                method: "BANK_TRANSFER",
                                reference: "",
                              });
                              setShowTakePaymentModal(true);
                            }}
                            disabled={actionLoading}
                            className="btn btn-sm w-full bg-emerald-500 hover:bg-emerald-600 text-white border-none"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Take Payment ({formatCurrency(totals.balanceDue)} due)
                          </button>
                        )}

                        {/* Void Invoice - when INVOICED (allows reissuing) */}
                        {deal.status === "INVOICED" && (
                          <button
                            onClick={handleVoidInvoice}
                            disabled={actionLoading}
                            className="btn btn-sm w-full btn-ghost border border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Void Invoice
                          </button>
                        )}

                        {/* Schedule Delivery - when deal has delivery */}
                        {(deal.delivery?.amount > 0 || deal.delivery?.amountGross > 0 || deal.delivery?.isFree) && deal.status === "INVOICED" && (
                          <div className="space-y-2 pt-2 border-t border-slate-100">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-slate-700">Delivery Schedule</span>
                              {deal.delivery?.scheduledDate ? (
                                <span className="text-xs text-emerald-600 font-medium">Scheduled</span>
                              ) : (
                                <span className="text-xs text-slate-400">Not scheduled</span>
                              )}
                            </div>
                            {deal.delivery?.scheduledDate ? (
                              <div className="space-y-2">
                                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
                                  <p className="text-sm text-purple-700 font-medium">
                                    {new Date(deal.delivery.scheduledDate).toLocaleDateString("en-GB", {
                                      weekday: "short",
                                      day: "numeric",
                                      month: "short",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </p>
                                </div>
                                {/* Fill Delivery Form button */}
                                <button
                                  type="button"
                                  onClick={() => setShowDeliveryFormModal(true)}
                                  className="btn btn-sm w-full btn-primary"
                                >
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                  </svg>
                                  Fill Delivery Form
                                </button>
                                <div className="flex gap-2">
                                  <button
                                    onClick={handleRescheduleDelivery}
                                    disabled={actionLoading}
                                    className="btn btn-xs flex-1 btn-ghost border border-slate-200"
                                  >
                                    Reschedule
                                  </button>
                                  <button
                                    onClick={handleCancelScheduledDelivery}
                                    disabled={actionLoading}
                                    className="btn btn-xs flex-1 btn-ghost border border-red-200 text-red-600 hover:bg-red-50"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <button
                                  onClick={() => setShowScheduleDeliveryModal(true)}
                                  disabled={actionLoading}
                                  className="btn btn-sm w-full btn-ghost border border-slate-200"
                                >
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  Schedule Delivery
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setShowDeliveryFormModal(true)}
                                  className="btn btn-sm w-full btn-outline text-slate-600"
                                >
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                  </svg>
                                  Fill Delivery Form
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Schedule Handover - when deal does NOT have delivery (customer collects) */}
                        {!(deal.delivery?.amount > 0 || deal.delivery?.amountGross > 0 || deal.delivery?.isFree) && deal.status === "INVOICED" && (
                          <div className="space-y-2 pt-2 border-t border-slate-100">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-slate-700">Handover Schedule</span>
                              {deal.collection?.scheduledDate ? (
                                <span className="text-xs text-emerald-600 font-medium">Scheduled</span>
                              ) : (
                                <span className="text-xs text-slate-400">Not scheduled</span>
                              )}
                            </div>
                            {deal.collection?.scheduledDate ? (
                              <div className="space-y-2">
                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                                  <p className="text-sm text-blue-700 font-medium">
                                    {new Date(deal.collection.scheduledDate).toLocaleDateString("en-GB", {
                                      weekday: "short",
                                      day: "numeric",
                                      month: "short",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={handleRescheduleCollection}
                                    disabled={actionLoading}
                                    className="btn btn-xs flex-1 btn-ghost border border-slate-200"
                                  >
                                    Reschedule
                                  </button>
                                  <button
                                    onClick={handleCancelScheduledCollection}
                                    disabled={actionLoading}
                                    className="btn btn-xs flex-1 btn-ghost border border-red-200 text-red-600 hover:bg-red-50"
                                  >
                                    Cancel
                                  </button>
                                </div>
                                {/* Mark as Handed Over - when collection is scheduled */}
                                <button
                                  onClick={handleMarkCollected}
                                  disabled={actionLoading}
                                  className="btn btn-sm w-full bg-emerald-500 hover:bg-emerald-600 text-white border-none mt-2"
                                >
                                  {actionLoading === "collected" ? (
                                    <span className="loading loading-spinner loading-xs"></span>
                                  ) : (
                                    <>
                                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                      Mark as Handed Over
                                    </>
                                  )}
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setShowScheduleCollectionModal(true)}
                                disabled={actionLoading}
                                className="btn btn-sm w-full btn-ghost border border-slate-200"
                              >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Schedule Handover
                              </button>
                            )}

                            {/* Mark as Handed Over - quick option for immediate pickup */}
                            <button
                              onClick={handleMarkCollected}
                              disabled={actionLoading}
                              className="btn btn-sm w-full bg-emerald-500 hover:bg-emerald-600 text-white border-none mt-2"
                            >
                              {actionLoading === "collected" ? (
                                <span className="loading loading-spinner loading-xs"></span>
                              ) : (
                                <>
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Mark as Handed Over
                                </>
                              )}
                            </button>
                          </div>
                        )}

                        {/* Complete Deal */}
                        {deal.status === "DELIVERED" && (
                          <button
                            onClick={() => handleMarkCompleted()}
                            disabled={actionLoading}
                            className="btn btn-sm w-full bg-emerald-500 hover:bg-emerald-600 text-white border-none"
                          >
                            {actionLoading === "completed" ? (
                              <span className="loading loading-spinner loading-xs"></span>
                            ) : (
                              <>
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Complete Deal
                              </>
                            )}
                          </button>
                        )}

                        {/* Delete/Cancel actions */}
                        <div className="pt-2 border-t border-slate-100">
                          {deal.status === "DRAFT" ? (
                            <button
                              onClick={() => setShowDeleteConfirm(true)}
                              disabled={actionLoading}
                              className="btn btn-sm btn-ghost w-full text-red-500 hover:bg-red-50"
                            >
                              Delete Draft
                            </button>
                          ) : (
                            <button
                              onClick={() => handleCancelDeal()}
                              disabled={actionLoading}
                              className="btn btn-sm btn-ghost w-full text-red-500 hover:bg-red-50"
                            >
                              Cancel Deal
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Cancel option for COMPLETED deals */}
                  {deal.status === "COMPLETED" && (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                      <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          </div>
                          <h3 className="text-sm font-bold text-slate-800">Deal Actions</h3>
                        </div>
                      </div>
                      <div className="p-4">
                        <p className="text-xs text-slate-500 mb-3">
                          This deal is completed. Cancelling will restore the vehicle to stock and delete any part exchange vehicles that haven't been sold.
                        </p>
                        <button
                          onClick={() => handleCancelDeal()}
                          disabled={actionLoading}
                          className="btn btn-sm btn-ghost w-full text-red-500 hover:bg-red-50 border border-red-200"
                        >
                          {actionLoading === "cancel" ? (
                            <span className="loading loading-spinner loading-xs"></span>
                          ) : (
                            "Cancel Completed Deal"
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Settlement Plan */}
                  {deal.status === "DRAFT" && (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                      <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          </div>
                          <h3 className="text-sm font-bold text-slate-800">Settlement Plan</h3>
                        </div>
                      </div>
                      <div className="p-4 space-y-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1.5">How will this be paid?</label>
                          <div className="flex flex-wrap gap-2">
                            {PAYMENT_TYPE_OPTIONS.map((opt) => (
                              <button
                                key={opt.value}
                                onClick={() => handleUpdateField({ paymentType: opt.value })}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                  deal.paymentType === opt.value
                                    ? "bg-[#0066CC] text-white"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Finance Details - shown when paymentType is FINANCE or MIXED */}
                        {(deal.paymentType === "FINANCE" || deal.paymentType === "MIXED") && (
                          <div className="border-t border-slate-100 pt-4 space-y-3">
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Finance Details</h4>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs text-slate-500 mb-1">Provider</label>
                                <input
                                  type="text"
                                  className="input input-sm input-bordered w-full"
                                  placeholder="Finance company"
                                  value={deal.finance?.provider || ""}
                                  onChange={(e) => handleUpdateField({
                                    finance: { ...deal.finance, provider: e.target.value }
                                  })}
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-slate-500 mb-1">Finance Type</label>
                                <select
                                  className="select select-sm select-bordered w-full"
                                  value={deal.finance?.financeType || ""}
                                  onChange={(e) => handleUpdateField({
                                    finance: { ...deal.finance, financeType: e.target.value }
                                  })}
                                >
                                  <option value="">Select...</option>
                                  {FINANCE_TYPE_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs text-slate-500 mb-1">Amount Financed</label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">£</span>
                                  <input
                                    type="number"
                                    className="input input-sm input-bordered w-full pl-7"
                                    placeholder="0.00"
                                    value={deal.finance?.amountFinanced || ""}
                                    onChange={(e) => handleUpdateField({
                                      finance: { ...deal.finance, amountFinanced: parseFloat(e.target.value) || null }
                                    })}
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs text-slate-500 mb-1">Customer Deposit</label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">£</span>
                                  <input
                                    type="number"
                                    className="input input-sm input-bordered w-full pl-7"
                                    placeholder="0.00"
                                    value={deal.finance?.customerDeposit || ""}
                                    onChange={(e) => handleUpdateField({
                                      finance: { ...deal.finance, customerDeposit: parseFloat(e.target.value) || null }
                                    })}
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs text-slate-500 mb-1">Status</label>
                                <select
                                  className="select select-sm select-bordered w-full"
                                  value={deal.finance?.status || "QUOTED"}
                                  onChange={(e) => handleUpdateField({
                                    finance: { ...deal.finance, status: e.target.value }
                                  })}
                                >
                                  {FINANCE_STATUS_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs text-slate-500 mb-1">Reference</label>
                                <input
                                  type="text"
                                  className="input input-sm input-bordered w-full"
                                  placeholder="Agreement ref"
                                  value={deal.finance?.reference || ""}
                                  onChange={(e) => handleUpdateField({
                                    finance: { ...deal.finance, reference: e.target.value }
                                  })}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Timeline */}
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <h3 className="text-sm font-bold text-slate-800">Timeline</h3>
                      </div>
                    </div>
                    <div className="p-4 space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Created</span>
                        <span className="text-slate-900">{formatDateTime(deal.createdAt)}</span>
                      </div>
                      {deal.depositTakenAt && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Deposit Taken</span>
                          <span className="text-slate-900">{formatDateTime(deal.depositTakenAt)}</span>
                        </div>
                      )}
                      {deal.invoicedAt && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Invoiced</span>
                          <span className="text-slate-900">{formatDateTime(deal.invoicedAt)}</span>
                        </div>
                      )}
                      {deal.deliveredAt && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Delivered</span>
                          <span className="text-slate-900">{formatDateTime(deal.deliveredAt)}</span>
                        </div>
                      )}
                      {deal.completedAt && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Completed</span>
                          <span className="text-slate-900">{formatDateTime(deal.completedAt)}</span>
                        </div>
                      )}
                      {deal.cancelledAt && (
                        <div className="text-red-600">
                          <div className="flex justify-between">
                            <span>Cancelled</span>
                            <span>{formatDateTime(deal.cancelledAt)}</span>
                          </div>
                          {deal.cancelReason && (
                            <p className="text-sm text-red-500 mt-1">Reason: {deal.cancelReason}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Deal Notes */}
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-800">Deal Notes</h3>
                        {notesModified && (
                          <button
                            onClick={handleSaveNotes}
                            disabled={isSavingNotes}
                            className="btn btn-xs btn-primary"
                          >
                            {isSavingNotes ? "Saving..." : "Save"}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="p-4">
                      <textarea
                        value={notesInput}
                        onChange={(e) => {
                          setNotesInput(e.target.value);
                          setNotesModified(e.target.value !== (deal.notes || ""));
                        }}
                        placeholder="e.g., Finance advance required: £X,XXX"
                        className="textarea textarea-bordered w-full text-sm"
                        rows={3}
                      />
                      <p className="text-xs text-slate-500 mt-2">These notes will appear on invoices and deposit receipts</p>
                    </div>
                  </div>

                  {/* Internal Notes (read-only for now) */}
                  {deal.internalNotes && (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                      <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
                        <h3 className="text-sm font-bold text-slate-800">Internal Notes</h3>
                      </div>
                      <div className="p-4">
                        <p className="text-sm text-slate-700">{deal.internalNotes}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Customer Tab */}
              {activeTab === "customer" && (
                <div className="space-y-4">
                  {/* Sold To Section */}
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-[#0066CC]/10 flex items-center justify-center">
                            <svg className="w-4 h-4 text-[#0066CC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          <h3 className="text-sm font-bold text-slate-800">Sold To</h3>
                        </div>
                        {deal.customer && deal.status === "DRAFT" && !isEditingCustomer && (
                          <button
                            onClick={() => setIsEditingCustomer(true)}
                            className="btn btn-ghost btn-xs text-[#0066CC]"
                          >
                            Change
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="p-4">
                      {isEditingCustomer || !deal.customer ? (
                        <div className="space-y-3">
                          <ContactPicker
                            value={deal.soldToContactId}
                            onChange={(contactId) => handleUpdateCustomer(contactId)}
                            filterTypeTags={["customer"]}
                            placeholder="Search or create a customer..."
                          />
                          {isEditingCustomer && (
                            <button
                              onClick={() => setIsEditingCustomer(false)}
                              className="btn btn-ghost btn-sm w-full"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div>
                            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Name</span>
                            <p className="font-semibold text-slate-900 mt-0.5">{deal.customer.displayName}</p>
                          </div>
                          {deal.customer.companyName && (
                            <div>
                              <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Company</span>
                              <p className="text-slate-700 mt-0.5">{deal.customer.companyName}</p>
                            </div>
                          )}
                          {deal.customer.email && (
                            <div>
                              <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Email</span>
                              <p className="text-slate-700 mt-0.5">{deal.customer.email}</p>
                            </div>
                          )}
                          {deal.customer.phone && (
                            <div>
                              <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Phone</span>
                              <p className="text-slate-700 mt-0.5">{deal.customer.phone}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Invoice To Section */}
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <h3 className="text-sm font-bold text-slate-800">Invoice To</h3>
                        </div>
                        <span className="text-xs text-slate-400">Who receives the invoice?</span>
                      </div>
                    </div>
                    <div className="p-4 space-y-4">
                      {/* Invoice recipient toggle */}
                      {deal.status === "DRAFT" && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => {
                              setInvoiceToOption("CUSTOMER");
                              if (deal.invoiceToContactId) {
                                handleUpdateInvoiceTo(null);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                              invoiceToOption === "CUSTOMER"
                                ? "bg-[#0066CC] text-white"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            Customer
                          </button>
                          <button
                            onClick={() => {
                              setInvoiceToOption("OTHER");
                              setIsEditingInvoiceTo(true);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                              invoiceToOption === "OTHER"
                                ? "bg-[#0066CC] text-white"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            Finance / Broker
                          </button>
                        </div>
                      )}

                      {/* Show current invoice recipient */}
                      {invoiceToOption === "CUSTOMER" ? (
                        <div className="bg-slate-50 rounded-xl p-3">
                          <p className="text-sm text-slate-600">
                            Invoice will be addressed to: <span className="font-medium text-slate-900">{deal.customer?.displayName || "Customer"}</span>
                          </p>
                        </div>
                      ) : deal.invoiceTo && !isEditingInvoiceTo ? (
                        <div className="space-y-3">
                          <div>
                            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Name</span>
                            <p className="font-semibold text-slate-900 mt-0.5">{deal.invoiceTo.displayName}</p>
                          </div>
                          {deal.invoiceTo.companyName && (
                            <div>
                              <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Company</span>
                              <p className="text-slate-700 mt-0.5">{deal.invoiceTo.companyName}</p>
                            </div>
                          )}
                          {deal.status === "DRAFT" && (
                            <button
                              onClick={() => setIsEditingInvoiceTo(true)}
                              className="btn btn-ghost btn-sm text-[#0066CC]"
                            >
                              Change
                            </button>
                          )}
                        </div>
                      ) : invoiceToOption === "OTHER" && (isEditingInvoiceTo || !deal.invoiceTo) ? (
                        <div className="space-y-3">
                          <ContactPicker
                            value={deal.invoiceToContactId}
                            onChange={(contactId) => handleUpdateInvoiceTo(contactId)}
                            filterTypeTags={["FINANCE", "SUPPLIER"]}
                            placeholder="Search finance company or broker..."
                            allowCreate={true}
                          />
                          {isEditingInvoiceTo && (
                            <button
                              onClick={() => setIsEditingInvoiceTo(false)}
                              className="btn btn-ghost btn-sm w-full"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Part Exchange */}
                  {deal.partExchange && (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                      <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                          </div>
                          <h3 className="text-sm font-bold text-slate-800">Part Exchange</h3>
                        </div>
                      </div>
                      <div className="p-4 space-y-3">
                        <div>
                          <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Vehicle</span>
                          <p className="font-semibold text-slate-900 mt-0.5">
                            {deal.partExchange.vrm} - {deal.partExchange.make} {deal.partExchange.model}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Allowance</span>
                            <p className="font-semibold text-slate-900 mt-0.5">
                              {formatCurrency(deal.partExchange.allowance)}
                            </p>
                          </div>
                          {deal.partExchange.settlement > 0 && (
                            <div>
                              <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Settlement</span>
                              <p className="font-semibold text-red-600 mt-0.5">
                                -{formatCurrency(deal.partExchange.settlement)}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="pt-2 border-t border-slate-100">
                          <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Net Value</span>
                          <p className="font-bold text-emerald-600 mt-0.5">
                            {formatCurrency(totals.pxNetValue)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Add-ons Tab */}
              {activeTab === "addons" && (
                <div className="space-y-4">
                  {deal.addOns?.length > 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                      <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-800">Add-ons</h3>
                        {canEditAddOns() && (
                          <button
                            onClick={() => {
                              setShowAddOnPicker(true);
                              fetchAddOnProducts();
                            }}
                            className="btn btn-ghost btn-xs text-[#0066CC]"
                          >
                            + Add
                          </button>
                        )}
                      </div>
                      <div className="divide-y divide-slate-100">
                        {deal.addOns.map((addon, idx) => (
                          <div key={idx} className="p-4 flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-900">{addon.name}</p>
                              <p className="text-sm text-slate-500">
                                {addon.qty > 1 && `${addon.qty} x `}
                                {formatCurrency(addon.unitPriceNet)}
                                {addon.vatTreatment === "STANDARD" && " + VAT"}
                              </p>
                            </div>
                            <span className="font-semibold text-slate-900">
                              {formatCurrency(addon.unitPriceNet * (addon.qty || 1))}
                            </span>
                            {canEditAddOns() && (
                              <button
                                onClick={() => handleRemoveAddOn(idx)}
                                disabled={actionLoading === "addon"}
                                className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex justify-between">
                        <span className="font-medium text-slate-700">Total</span>
                        <span className="font-bold text-slate-900">
                          {formatCurrency(totals.addOnsNetTotal + totals.addOnsVatTotal)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-slate-600">No add-ons</p>
                      <p className="text-xs text-slate-400 mt-1">Add products like warranties or accessories</p>
                      {canEditAddOns() && (
                        <button
                          onClick={() => {
                            setShowAddOnPicker(true);
                            fetchAddOnProducts();
                          }}
                          className="btn btn-sm bg-[#0066CC] hover:bg-[#0052a3] text-white border-none mt-4"
                        >
                          Add Add-on
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Payments Tab */}
              {activeTab === "payments" && (
                <div className="space-y-4">
                  {deal.payments?.length > 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                      <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
                        <h3 className="text-sm font-bold text-slate-800">Payments</h3>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {deal.payments.map((payment, idx) => (
                          <div key={idx} className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                                    payment.type === "DEPOSIT"
                                      ? "bg-amber-100 text-amber-700"
                                      : payment.type === "BALANCE"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-slate-100 text-slate-600"
                                  }`}>
                                    {payment.type}
                                  </span>
                                  <span className="text-sm text-slate-500">{payment.method}</span>
                                </div>
                                <p className="text-xs text-slate-400 mt-1">
                                  {formatDateTime(payment.paidAt)}
                                  {payment.reference && ` • ${payment.reference}`}
                                </p>
                              </div>
                              <span className={`font-semibold ${
                                payment.isRefunded ? "text-red-500 line-through" : "text-emerald-600"
                              }`}>
                                {formatCurrency(payment.amount)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex justify-between">
                        <span className="font-medium text-slate-700">Total Paid</span>
                        <span className="font-bold text-emerald-600">
                          {formatCurrency(totals.totalPaid)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-slate-600">No payments recorded</p>
                      <p className="text-xs text-slate-400 mt-1">Take a deposit to get started</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDepositModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Take Deposit</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">£</span>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="input input-bordered w-full pl-7"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={depositMethod}
                  onChange={(e) => setDepositMethod(e.target.value)}
                  className="select select-bordered w-full"
                >
                  <option value="CARD">Card</option>
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="FINANCE">Finance</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Reference (optional)
                </label>
                <input
                  type="text"
                  value={depositReference}
                  onChange={(e) => setDepositReference(e.target.value)}
                  className="input input-bordered w-full"
                  placeholder="e.g., Transaction ID"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowDepositModal(false)}
                className="btn btn-ghost flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleTakeDeposit}
                disabled={actionLoading === "deposit"}
                className="btn bg-amber-500 hover:bg-amber-600 text-white border-none flex-1"
              >
                {actionLoading === "deposit" ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  "Record Deposit"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add-on Picker Modal */}
      {showAddOnPicker && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setShowAddOnPicker(false); setShowCustomAddOnForm(false); }} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Add Add-on</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCustomAddOnForm(!showCustomAddOnForm)}
                  className="btn btn-sm btn-outline gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Custom Item
                </button>
                <button
                  onClick={() => { setShowAddOnPicker(false); setShowCustomAddOnForm(false); }}
                  className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {/* Custom Add-on Form */}
              {showCustomAddOnForm && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
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
                        <option value="EXEMPT">VAT Exempt</option>
                        <option value="ZERO">Zero-rated</option>
                      </select>
                    </div>
                  </div>

                  {/* Warranty-specific fields */}
                  {customAddOn.category === "WARRANTY" && (
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div className="form-control">
                        <label className="label py-0"><span className="label-text text-xs">Term (months)</span></label>
                        <input
                          type="number"
                          value={customAddOn.termMonths}
                          onChange={(e) => setCustomAddOn(prev => ({ ...prev, termMonths: e.target.value }))}
                          placeholder="e.g., 12"
                          className="input input-bordered input-sm w-full"
                        />
                      </div>
                      <div className="form-control">
                        <label className="label py-0"><span className="label-text text-xs">Claim Limit (£)</span></label>
                        <input
                          type="number"
                          step="0.01"
                          value={customAddOn.claimLimit}
                          onChange={(e) => setCustomAddOn(prev => ({ ...prev, claimLimit: e.target.value }))}
                          placeholder="Leave empty for unlimited"
                          className="input input-bordered input-sm w-full"
                        />
                      </div>
                    </div>
                  )}

                  {/* Save to Catalogue Option */}
                  <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={customAddOn.saveToCatalogue}
                        onChange={(e) => setCustomAddOn(prev => ({ ...prev, saveToCatalogue: e.target.checked }))}
                        className="checkbox checkbox-sm checkbox-success mt-0.5"
                      />
                      <div>
                        <p className="text-sm font-medium text-emerald-800">Save to Catalogue</p>
                        <p className="text-xs text-emerald-600">Make this available for future deals (appears in Settings)</p>
                      </div>
                    </label>
                    {customAddOn.saveToCatalogue && (
                      <div className="mt-3 pt-3 border-t border-emerald-200">
                        <div className="form-control">
                          <label className="label py-0"><span className="label-text text-xs text-emerald-700">Cost Price (optional)</span></label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">£</span>
                            <input
                              type="number"
                              step="0.01"
                              value={customAddOn.costPrice}
                              onChange={(e) => setCustomAddOn(prev => ({ ...prev, costPrice: e.target.value }))}
                              placeholder="Your cost"
                              className="input input-bordered input-sm w-full pl-7"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={handleAddCustomAddOn}
                      disabled={actionLoading === "addon"}
                      className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white border-none"
                    >
                      {actionLoading === "addon" ? (
                        <span className="loading loading-spinner loading-sm"></span>
                      ) : customAddOn.saveToCatalogue ? (
                        "Save & Add to Deal"
                      ) : (
                        "Add Custom Item"
                      )}
                    </button>
                  </div>
                </div>
              )}

              {addOnsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <span className="loading loading-spinner loading-md text-[#0066CC]"></span>
                </div>
              ) : availableAddOns.length === 0 && !showCustomAddOnForm ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-slate-600">No add-on products available</p>
                  <p className="text-xs text-slate-400 mt-1">Create add-on products in Settings or use "Custom Item"</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {availableAddOns.map((addon) => (
                    <button
                      key={addon.id || addon._id}
                      onClick={() => handleAddAddOn(addon)}
                      disabled={actionLoading === "addon"}
                      className="w-full p-4 text-left bg-slate-50 hover:bg-slate-100 rounded-xl transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">{addon.name}</p>
                          <p className="text-sm text-slate-500">
                            {addon.category || "Uncategorized"}
                            {addon.description && ` • ${addon.description}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-900">
                            {formatCurrency(addon.defaultPriceNet)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {addon.vatTreatment === "EXEMPT" ? "VAT Exempt" : "+ VAT"}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 text-center mb-2">Delete Draft?</h3>
            <p className="text-sm text-slate-500 text-center mb-6">
              This will permanently delete this draft deal. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn btn-ghost flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteDraft}
                disabled={actionLoading === "delete"}
                className="btn bg-red-500 hover:bg-red-600 text-white border-none flex-1"
              >
                {actionLoading === "delete" ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Deal Modal (for COMPLETED deals requiring reason) */}
      {showCancelModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setShowCancelModal(false); setCancelReasonInput(""); }} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 text-center mb-2">Cancel Completed Deal?</h3>
            <p className="text-sm text-slate-500 text-center mb-4">
              This deal is marked as completed. Cancelling will:
            </p>
            <ul className="text-sm text-slate-600 mb-4 space-y-1 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <li className="flex items-start gap-2">
                <svg className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Restore <strong>{deal.vehicle?.regCurrent}</strong> to stock</span>
              </li>
              {deal.partExchanges?.length > 0 && (
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Delete part exchange vehicle(s): <strong>{deal.partExchanges.map(px => px.vrm).join(", ")}</strong> (if not already sold)</span>
                </li>
              )}
            </ul>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Cancellation Reason *</label>
              <textarea
                value={cancelReasonInput}
                onChange={(e) => setCancelReasonInput(e.target.value)}
                placeholder="e.g., Customer requested refund, Finance fell through..."
                className="textarea textarea-bordered w-full h-24"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowCancelModal(false); setCancelReasonInput(""); }}
                className="btn btn-ghost flex-1"
              >
                Keep Deal
              </button>
              <button
                onClick={() => handleCancelDeal(cancelReasonInput)}
                disabled={actionLoading === "cancel" || !cancelReasonInput.trim()}
                className="btn bg-red-500 hover:bg-red-600 text-white border-none flex-1 disabled:bg-slate-300"
              >
                {actionLoading === "cancel" ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  "Cancel Deal"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Agreed Work Modal */}
      {showAgreedWorkModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAgreedWorkModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Add Agreed Work</h3>
            <p className="text-sm text-slate-500 mb-4">
              Record work that has been promised to the customer. This will appear on the deposit receipt.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={agreedWorkForm.title}
                  onChange={(e) => setAgreedWorkForm({ ...agreedWorkForm, title: e.target.value })}
                  placeholder="e.g., Repair scratch on rear bumper"
                  className="input input-bordered w-full"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Details</label>
                <textarea
                  value={agreedWorkForm.details}
                  onChange={(e) => setAgreedWorkForm({ ...agreedWorkForm, details: e.target.value })}
                  placeholder="Optional additional details..."
                  className="textarea textarea-bordered w-full"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "PREP", label: "Prep Work" },
                    { value: "COSMETIC", label: "Cosmetic" },
                    { value: "ACCESSORY", label: "Accessory" },
                    { value: "ADMIN", label: "Admin" },
                    { value: "OTHER", label: "Other" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setAgreedWorkForm({ ...agreedWorkForm, type: opt.value })}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        agreedWorkForm.type === opt.value
                          ? "bg-[#0066CC] text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <input
                  type="checkbox"
                  id="syncToVehicle"
                  checked={agreedWorkForm.syncToVehicle}
                  onChange={(e) => setAgreedWorkForm({ ...agreedWorkForm, syncToVehicle: e.target.checked })}
                  className="checkbox checkbox-sm checkbox-primary"
                />
                <label htmlFor="syncToVehicle" className="flex-1 text-sm text-slate-700">
                  <span className="font-medium">Also add to vehicle issues</span>
                  <span className="block text-xs text-slate-400">Creates a linked issue for prep tracking</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAgreedWorkModal(false);
                  setAgreedWorkForm({ title: "", details: "", type: "PREP", syncToVehicle: true });
                }}
                className="btn btn-ghost flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleAddAgreedWork}
                disabled={!agreedWorkForm.title.trim() || actionLoading === "agreedWork"}
                className="btn bg-orange-500 hover:bg-orange-600 text-white border-none flex-1"
              >
                {actionLoading === "agreedWork" ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  "Add Work Item"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Part Exchange Modal */}
      {showPxModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setShowPxModal(false); setEditingPxIndex(null); }} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-bold text-slate-900">{editingPxIndex !== null ? "Edit Part Exchange" : "Add Part Exchange"}</h3>
              <button
                onClick={() => { setShowPxModal(false); setEditingPxIndex(null); }}
                className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Import from Appraisals Section */}
              {selectedPxAppraisal ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                          {selectedPxAppraisal.type === "customer_px" ? "Customer Appraisal" : "Dealer Appraisal"}
                        </span>
                        {selectedPxAppraisal.issueCount > 0 && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                            {selectedPxAppraisal.issueCount} issue{selectedPxAppraisal.issueCount > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-emerald-800">
                        {selectedPxAppraisal.vehicleReg} - {selectedPxAppraisal.vehicleMake} {selectedPxAppraisal.vehicleModel}
                      </p>
                      {selectedPxAppraisal.conditionNotes && (
                        <p className="text-xs text-emerald-600 mt-1 line-clamp-2">{selectedPxAppraisal.conditionNotes}</p>
                      )}
                    </div>
                    <button
                      onClick={handleClearPxAppraisal}
                      className="p-1.5 rounded-lg text-emerald-500 hover:text-emerald-700 hover:bg-emerald-100"
                      title="Clear and enter manually"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                    Import from Appraisals
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search by VRM to import..."
                      className="input input-bordered w-full pl-10 text-sm"
                      onChange={(e) => handlePxAppraisalSearch(e.target.value)}
                    />
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    {pxAppraisalSearching && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 loading loading-spinner loading-xs text-slate-400"></span>
                    )}
                  </div>
                  {/* Appraisal Suggestions Dropdown */}
                  {pxAppraisalSuggestions.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white rounded-xl border border-slate-200 shadow-lg max-h-48 overflow-y-auto">
                      {pxAppraisalSuggestions.map((a) => (
                        <button
                          key={a.id}
                          onClick={() => handleSelectPxAppraisal(a)}
                          className="w-full px-3 py-2 text-left hover:bg-slate-50 border-b border-slate-100 last:border-0"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium text-slate-900">{a.vehicleReg}</p>
                              <p className="text-xs text-slate-500">{a.vehicleMake} {a.vehicleModel} {a.vehicleYear}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              {a.issueCount > 0 && (
                                <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                                  {a.issueCount} issue{a.issueCount > 1 ? "s" : ""}
                                </span>
                              )}
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                a.type === "customer_px" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                              }`}>
                                {a.type === "customer_px" ? "Customer" : "Dealer"}
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-slate-400 mt-1">Find a customer or dealer appraisal to auto-fill details</p>
                </div>
              )}

              <div className="border-t border-slate-200 pt-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Registration <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={pxForm.vrm}
                    onChange={(e) => setPxForm({ ...pxForm, vrm: e.target.value.toUpperCase() })}
                    className="input input-bordered flex-1 font-mono"
                    placeholder="AB12 CDE"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && pxForm.vrm) {
                        e.preventDefault();
                        handlePxVrmLookup();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handlePxVrmLookup}
                    disabled={pxLookupLoading || !pxForm.vrm}
                    className="btn bg-[#0066CC] hover:bg-[#0055B3] text-white border-none px-4"
                  >
                    {pxLookupLoading ? (
                      <span className="loading loading-spinner loading-xs"></span>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <span className="hidden sm:inline ml-1">Lookup</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-1">Enter VRM and click Lookup to auto-fill vehicle details</p>
              </div>

              {/* VIN Field */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">VIN (Vehicle Identification Number)</label>
                <input
                  type="text"
                  value={pxForm.vin}
                  onChange={(e) => setPxForm({ ...pxForm, vin: e.target.value.toUpperCase() })}
                  className="input input-bordered w-full font-mono uppercase"
                  placeholder="Auto-populated from lookup or enter manually"
                  maxLength={17}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Make</label>
                  <input
                    type="text"
                    value={pxForm.make}
                    onChange={(e) => setPxForm({ ...pxForm, make: e.target.value })}
                    className="input input-bordered w-full"
                    placeholder="e.g., Ford"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
                  <input
                    type="text"
                    value={pxForm.model}
                    onChange={(e) => setPxForm({ ...pxForm, model: e.target.value })}
                    className="input input-bordered w-full"
                    placeholder="e.g., Focus"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Year</label>
                  <input
                    type="number"
                    value={pxForm.year}
                    onChange={(e) => setPxForm({ ...pxForm, year: e.target.value })}
                    className="input input-bordered w-full"
                    placeholder="2020"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mileage</label>
                  <input
                    type="number"
                    value={pxForm.mileage}
                    onChange={(e) => setPxForm({ ...pxForm, mileage: e.target.value })}
                    className="input input-bordered w-full"
                    placeholder="50000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Colour</label>
                  <input
                    type="text"
                    value={pxForm.colour}
                    onChange={(e) => setPxForm({ ...pxForm, colour: e.target.value })}
                    className="input input-bordered w-full"
                    placeholder="Silver"
                  />
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <h4 className="text-sm font-semibold text-slate-900 mb-3">Valuation</h4>

                {/* Allowance */}
                <div className="mb-3">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Allowance <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">£</span>
                    <input
                      type="number"
                      value={pxForm.allowance}
                      onChange={(e) => setPxForm({ ...pxForm, allowance: e.target.value })}
                      className="input input-bordered w-full pl-7"
                      placeholder="5000"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Agreed value to customer</p>
                </div>

                {/* Has Outstanding Finance - MOVED HERE */}
                <label className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl mb-3 cursor-pointer hover:bg-amber-100 transition-colors border border-amber-200">
                  <input
                    type="checkbox"
                    checked={pxForm.hasFinance}
                    onChange={(e) => setPxForm({ ...pxForm, hasFinance: e.target.checked, settlement: e.target.checked ? pxForm.settlement : "", financeCompanyContactId: "", financeCompanyName: "", hasSettlementInWriting: false })}
                    className="checkbox checkbox-sm checkbox-warning"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-700">Outstanding Finance</p>
                    <p className="text-xs text-slate-500">This vehicle has finance to settle</p>
                  </div>
                </label>

                {/* Finance Details - only show if hasFinance */}
                {pxForm.hasFinance && (
                  <div className="ml-4 space-y-3 p-3 border-l-2 border-amber-300 bg-amber-50/50 rounded-r-xl mb-3">
                    {/* Settlement Amount */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Settlement Amount
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">£</span>
                        <input
                          type="number"
                          value={pxForm.settlement}
                          onChange={(e) => setPxForm({ ...pxForm, settlement: e.target.value })}
                          className="input input-bordered w-full pl-7"
                          placeholder="0"
                          step="0.01"
                          min="0"
                        />
                      </div>
                      <p className="text-xs text-slate-400 mt-1">Finance amount to pay off</p>
                    </div>

                    {/* Finance Company Picker */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Finance Company <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        {pxForm.financeCompanyName ? (
                          <div className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg">
                            <span className="text-sm text-slate-900">{pxForm.financeCompanyName}</span>
                            <button
                              type="button"
                              onClick={() => setPxForm({ ...pxForm, financeCompanyContactId: "", financeCompanyName: "" })}
                              className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <>
                            <input
                              type="text"
                              value={financeCompanySearch}
                              onChange={async (e) => {
                                const query = e.target.value;
                                setFinanceCompanySearch(query);
                                if (query.length >= 2) {
                                  try {
                                    const res = await fetch(`/api/contacts?search=${encodeURIComponent(query)}&typeTags=FINANCE&limit=5`);
                                    if (res.ok) {
                                      const data = await res.json();
                                      setFinanceCompanySuggestions(data.contacts || data || []);
                                    }
                                  } catch (err) {
                                    console.error("Error searching finance companies:", err);
                                  }
                                } else {
                                  setFinanceCompanySuggestions([]);
                                }
                              }}
                              className="input input-bordered w-full text-sm"
                              placeholder="Search finance companies..."
                            />
                            {financeCompanySuggestions.length > 0 && (
                              <div className="absolute z-10 mt-1 w-full bg-white rounded-lg border border-slate-200 shadow-lg max-h-40 overflow-y-auto">
                                {financeCompanySuggestions.map((contact) => (
                                  <button
                                    key={contact._id || contact.id}
                                    type="button"
                                    onClick={() => {
                                      setPxForm({
                                        ...pxForm,
                                        financeCompanyContactId: contact._id || contact.id,
                                        financeCompanyName: contact.displayName || contact.companyName || contact.name,
                                      });
                                      setFinanceCompanySearch("");
                                      setFinanceCompanySuggestions([]);
                                    }}
                                    className="w-full px-3 py-2 text-left hover:bg-slate-50 text-sm"
                                  >
                                    {contact.displayName || contact.companyName || contact.name}
                                  </button>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">Select from your finance company contacts</p>
                    </div>

                    {/* Settlement in Writing */}
                    <label className="flex items-center gap-3 p-2.5 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={pxForm.hasSettlementInWriting}
                        onChange={(e) => setPxForm({ ...pxForm, hasSettlementInWriting: e.target.checked })}
                        className="checkbox checkbox-sm checkbox-success"
                      />
                      <div>
                        <p className="text-sm font-medium text-slate-700">Settlement Figure in Writing</p>
                        <p className="text-xs text-slate-500">Confirmed settlement amount from finance company</p>
                      </div>
                    </label>

                    {!pxForm.hasSettlementInWriting && (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Required before deal can be completed
                      </p>
                    )}
                  </div>
                )}

                {/* Net preview */}
                {pxForm.allowance && (
                  <div className="mt-3 p-3 bg-emerald-50 rounded-lg text-center">
                    <p className="text-xs text-emerald-600 uppercase tracking-wide font-medium">Net Value to Customer</p>
                    <p className="text-xl font-bold text-emerald-700">
                      {formatCurrency(parseFloat(pxForm.allowance || 0) - parseFloat(pxForm.settlement || 0))}
                    </p>
                  </div>
                )}
              </div>

              {/* VAT Qualifying Section */}
              <div className="border-t border-slate-200 pt-4">
                <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={pxForm.vatQualifying}
                    onChange={(e) => setPxForm({ ...pxForm, vatQualifying: e.target.checked })}
                    className="checkbox checkbox-sm checkbox-primary"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-700">VAT Qualifying Vehicle</p>
                    <p className="text-xs text-slate-500">Check if you can reclaim VAT on this part exchange</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex gap-3 p-4 border-t border-slate-100 shrink-0">
              <button
                onClick={() => {
                  setShowPxModal(false);
                  setSelectedPxAppraisal(null);
                  setPxAppraisalSuggestions([]);
                  setFinanceCompanySuggestions([]);
                  setFinanceCompanySearch("");
                  setPxForm({ vrm: "", make: "", model: "", year: "", mileage: "", colour: "", fuelType: "", allowance: "", settlement: "", sourceType: "MANUAL", sourceId: null, conditionNotes: "", vatQualifying: false, hasFinance: false, financeCompanyContactId: "", financeCompanyName: "", hasSettlementInWriting: false });
                }}
                className="btn btn-ghost flex-1"
              >
                Cancel
              </button>
              <button
                onClick={editingPxIndex !== null ? handleUpdatePartExchange : handleAddPartExchange}
                disabled={!pxForm.vrm || !pxForm.allowance || pxLoading}
                className="btn bg-emerald-500 hover:bg-emerald-600 text-white border-none flex-1"
              >
                {pxLoading ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  editingPxIndex !== null ? "Update PX" : "Add Part Exchange"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Handover Pack Modal */}
      {showHandoverModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowHandoverModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Generate Handover Pack</h3>
            <p className="text-sm text-slate-500 mb-6">
              Select documents to include in the customer handover pack.
            </p>

            <div className="space-y-3">
              {/* Invoice - required */}
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                <input
                  type="checkbox"
                  checked={handoverDocs.invoice}
                  disabled
                  className="checkbox checkbox-sm checkbox-primary"
                />
                <div className="flex-1">
                  <p className="font-medium text-slate-900 flex items-center gap-2">
                    Invoice
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Required</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {documents.invoice?.documentNumber}
                    {documents.invoice?.issuedAt && (
                      <> • Issued {new Date(documents.invoice.issuedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</>
                    )}
                  </p>
                </div>
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              {/* PDI - optional */}
              <div className={`flex items-center gap-3 p-3 rounded-xl border ${
                linkedSubmissions.pdi
                  ? "bg-white border-slate-200 hover:border-slate-300 cursor-pointer"
                  : "bg-slate-50 border-slate-100"
              }`}
              onClick={() => linkedSubmissions.pdi && setHandoverDocs({ ...handoverDocs, pdi: !handoverDocs.pdi })}
              >
                <input
                  type="checkbox"
                  checked={handoverDocs.pdi}
                  onChange={(e) => setHandoverDocs({ ...handoverDocs, pdi: e.target.checked })}
                  disabled={!linkedSubmissions.pdi}
                  className="checkbox checkbox-sm checkbox-primary"
                />
                <div className="flex-1">
                  <p className={`font-medium flex items-center gap-2 ${linkedSubmissions.pdi ? "text-slate-900" : "text-slate-400"}`}>
                    Pre-Delivery Inspection (PDI)
                    {!linkedSubmissions.pdi && <span className="text-xs bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full">Optional</span>}
                  </p>
                  <p className="text-xs text-slate-500">
                    {linkedSubmissions.pdi
                      ? `Completed ${new Date(linkedSubmissions.pdi.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
                      : "No PDI found — can proceed without"}
                  </p>
                </div>
                {linkedSubmissions.pdi && (
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>

              {/* Service Receipt - optional */}
              <div className={`flex items-center gap-3 p-3 rounded-xl border ${
                linkedSubmissions.serviceReceipt
                  ? "bg-white border-slate-200 hover:border-slate-300 cursor-pointer"
                  : "bg-slate-50 border-slate-100"
              }`}
              onClick={() => linkedSubmissions.serviceReceipt && setHandoverDocs({ ...handoverDocs, serviceReceipt: !handoverDocs.serviceReceipt })}
              >
                <input
                  type="checkbox"
                  checked={handoverDocs.serviceReceipt}
                  onChange={(e) => setHandoverDocs({ ...handoverDocs, serviceReceipt: e.target.checked })}
                  disabled={!linkedSubmissions.serviceReceipt}
                  className="checkbox checkbox-sm checkbox-primary"
                />
                <div className="flex-1">
                  <p className={`font-medium flex items-center gap-2 ${linkedSubmissions.serviceReceipt ? "text-slate-900" : "text-slate-400"}`}>
                    Service Receipt
                    {!linkedSubmissions.serviceReceipt && <span className="text-xs bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full">Optional</span>}
                  </p>
                  <p className="text-xs text-slate-500">
                    {linkedSubmissions.serviceReceipt
                      ? `Completed ${new Date(linkedSubmissions.serviceReceipt.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
                      : "No service receipt found — can proceed without"}
                  </p>
                </div>
                {linkedSubmissions.serviceReceipt && (
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowHandoverModal(false)}
                className="btn btn-ghost flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateHandoverPack}
                disabled={isGeneratingPack}
                className="btn bg-emerald-500 hover:bg-emerald-600 text-white border-none flex-1"
              >
                {isGeneratingPack ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Generate Pack
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Delivery Modal */}
      {showScheduleDeliveryModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowScheduleDeliveryModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Schedule Delivery</h3>

            <div className="space-y-4">
              {/* Vehicle & Customer Info */}
              <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Vehicle</span>
                  <span className="text-sm font-medium text-slate-900">
                    {deal?.vehicleId?.regCurrent || "—"} ({deal?.vehicleId?.make} {deal?.vehicleId?.model})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Customer</span>
                  <span className="text-sm font-medium text-slate-900">
                    {deal?.soldToContactId?.name || deal?.soldToContact?.name || "—"}
                  </span>
                </div>
                {deal?.deliveryAddress?.isDifferent && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-xs text-slate-500 block mb-1">Delivery Address</span>
                    <span className="text-sm text-slate-700">
                      {deal.deliveryAddress.line1}
                      {deal.deliveryAddress.town && `, ${deal.deliveryAddress.town}`}
                      {deal.deliveryAddress.postcode && ` ${deal.deliveryAddress.postcode}`}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={scheduleDeliveryForm.date}
                  onChange={(e) => setScheduleDeliveryForm(prev => ({ ...prev, date: e.target.value }))}
                  className="input input-bordered w-full"
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Time
                </label>
                <input
                  type="time"
                  value={scheduleDeliveryForm.time}
                  onChange={(e) => setScheduleDeliveryForm(prev => ({ ...prev, time: e.target.value }))}
                  className="input input-bordered w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={scheduleDeliveryForm.notes}
                  onChange={(e) => setScheduleDeliveryForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="textarea textarea-bordered w-full"
                  placeholder="Any special instructions..."
                  rows={2}
                />
              </div>

              {/* Delivery Address */}
              <div className="border-t pt-4">
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={scheduleDeliveryForm.sameAsCustomer}
                    onChange={(e) => setScheduleDeliveryForm(prev => ({ ...prev, sameAsCustomer: e.target.checked }))}
                    className="checkbox checkbox-sm"
                  />
                  <span className="text-sm text-slate-700">Same as customer address</span>
                </label>

                {!scheduleDeliveryForm.sameAsCustomer && (
                  <div className="space-y-3 bg-slate-50 rounded-lg p-3">
                    <input
                      type="text"
                      value={scheduleDeliveryForm.addressLine1}
                      onChange={(e) => setScheduleDeliveryForm(prev => ({ ...prev, addressLine1: e.target.value }))}
                      className="input input-bordered input-sm w-full"
                      placeholder="Address line 1 *"
                    />
                    <input
                      type="text"
                      value={scheduleDeliveryForm.addressLine2}
                      onChange={(e) => setScheduleDeliveryForm(prev => ({ ...prev, addressLine2: e.target.value }))}
                      className="input input-bordered input-sm w-full"
                      placeholder="Address line 2"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={scheduleDeliveryForm.town}
                        onChange={(e) => setScheduleDeliveryForm(prev => ({ ...prev, town: e.target.value }))}
                        className="input input-bordered input-sm w-full"
                        placeholder="Town/City *"
                      />
                      <input
                        type="text"
                        value={scheduleDeliveryForm.postcode}
                        onChange={(e) => setScheduleDeliveryForm(prev => ({ ...prev, postcode: e.target.value }))}
                        className="input input-bordered input-sm w-full"
                        placeholder="Postcode *"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowScheduleDeliveryModal(false)}
                className="btn btn-ghost flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleScheduleDelivery}
                disabled={scheduleDeliveryLoading || !scheduleDeliveryForm.date || !scheduleDeliveryForm.time || (!scheduleDeliveryForm.sameAsCustomer && (!scheduleDeliveryForm.addressLine1 || !scheduleDeliveryForm.town || !scheduleDeliveryForm.postcode))}
                className="btn bg-purple-500 hover:bg-purple-600 text-white border-none flex-1"
              >
                {scheduleDeliveryLoading ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  "Schedule"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Handover Modal */}
      {showScheduleCollectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowScheduleCollectionModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Schedule Handover</h3>

            <div className="space-y-4">
              {/* Vehicle & Customer Info */}
              <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Vehicle</span>
                  <span className="text-sm font-medium text-slate-900">
                    {deal?.vehicleId?.regCurrent || "—"} ({deal?.vehicleId?.make} {deal?.vehicleId?.model})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Customer</span>
                  <span className="text-sm font-medium text-slate-900">
                    {deal?.soldToContactId?.displayName || deal?.soldToContactId?.name || deal?.soldToContact?.name || "—"}
                  </span>
                </div>
                {deal?.soldToContactId?.phone && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Phone</span>
                    <span className="text-sm text-slate-700">{deal.soldToContactId.phone}</span>
                  </div>
                )}
              </div>

              <p className="text-sm text-slate-600">
                Schedule when the customer will collect the vehicle from your premises.
              </p>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={scheduleCollectionForm.date}
                  onChange={(e) => setScheduleCollectionForm(prev => ({ ...prev, date: e.target.value }))}
                  className="input input-bordered w-full"
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Time
                </label>
                <input
                  type="time"
                  value={scheduleCollectionForm.time}
                  onChange={(e) => setScheduleCollectionForm(prev => ({ ...prev, time: e.target.value }))}
                  className="input input-bordered w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={scheduleCollectionForm.notes}
                  onChange={(e) => setScheduleCollectionForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="textarea textarea-bordered w-full"
                  placeholder="Any special instructions..."
                  rows={2}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowScheduleCollectionModal(false)}
                className="btn btn-ghost flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleScheduleCollection}
                disabled={scheduleCollectionLoading || !scheduleCollectionForm.date || !scheduleCollectionForm.time}
                className="btn bg-blue-500 hover:bg-blue-600 text-white border-none flex-1"
              >
                {scheduleCollectionLoading ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  "Schedule"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Take Payment Modal */}
      {showTakePaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowTakePaymentModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Take Payment</h3>

            <div className="space-y-4">
              {/* Balance Summary */}
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-emerald-700">Outstanding Balance</span>
                  <span className="text-lg font-bold text-emerald-700">{formatCurrency(totals.balanceDue)}</span>
                </div>
                <div className="text-xs text-emerald-600">
                  Total: {formatCurrency(totals.grandTotal)} | Paid: {formatCurrency(totals.totalPaid)}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Payment Amount (£)
                </label>
                <input
                  type="number"
                  value={takePaymentForm.amount}
                  onChange={(e) => setTakePaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="input input-bordered w-full"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={takePaymentForm.method}
                  onChange={(e) => setTakePaymentForm(prev => ({ ...prev, method: e.target.value }))}
                  className="select select-bordered w-full"
                >
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="FINANCE">Finance</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Reference (optional)
                </label>
                <input
                  type="text"
                  value={takePaymentForm.reference}
                  onChange={(e) => setTakePaymentForm(prev => ({ ...prev, reference: e.target.value }))}
                  className="input input-bordered w-full"
                  placeholder="e.g., Bank reference, card last 4 digits"
                />
              </div>

              {/* Preview of remaining balance */}
              {takePaymentForm.amount && parseFloat(takePaymentForm.amount) > 0 && (
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Remaining balance after payment:</span>
                    <span className={`font-bold ${(totals.balanceDue - parseFloat(takePaymentForm.amount)) <= 0 ? "text-emerald-600" : "text-slate-900"}`}>
                      {formatCurrency(Math.max(0, totals.balanceDue - parseFloat(takePaymentForm.amount)))}
                    </span>
                  </div>
                  {(totals.balanceDue - parseFloat(takePaymentForm.amount)) <= 0 && (
                    <p className="text-xs text-emerald-600 mt-1">Balance will be paid in full</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowTakePaymentModal(false)}
                className="btn btn-ghost flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleTakePayment}
                disabled={takePaymentLoading || !takePaymentForm.amount || parseFloat(takePaymentForm.amount) <= 0}
                className="btn bg-emerald-500 hover:bg-emerald-600 text-white border-none flex-1"
              >
                {takePaymentLoading ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Record Payment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Confirmation Modal */}
      {showInvoiceConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">Confirm Invoice Details</h3>
              <p className="text-sm text-slate-500 mt-1">Please confirm the following details before generating the invoice</p>
            </div>
            <div className="p-6 space-y-6">
              {/* Part Exchanges Summary */}
              {(deal?.partExchanges?.length > 0 || deal?.partExchangeAllowance > 0) && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Part Exchange(s)</label>
                  <div className="bg-purple-50 rounded-xl p-4 space-y-3">
                    {deal?.partExchanges?.length > 0 ? (
                      deal.partExchanges.map((px, idx) => (
                        <div key={idx} className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-slate-900">{px.vrm || `PX ${idx + 1}`}</p>
                            <p className="text-xs text-slate-500">
                              Allowance: {formatCurrency(px.allowance)}
                              {px.settlement > 0 && ` | Settlement: ${formatCurrency(px.settlement)}`}
                            </p>
                          </div>
                          <p className="font-bold text-purple-700">Net: {formatCurrency((px.allowance || 0) - (px.settlement || 0))}</p>
                        </div>
                      ))
                    ) : (
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-slate-900">Part Exchange</p>
                          <p className="text-xs text-slate-500">
                            Allowance: {formatCurrency(deal?.partExchangeAllowance)}
                            {deal?.partExchangeSettlement > 0 && ` | Settlement: ${formatCurrency(deal?.partExchangeSettlement)}`}
                          </p>
                        </div>
                        <p className="font-bold text-purple-700">Net: {formatCurrency((deal?.partExchangeAllowance || 0) - (deal?.partExchangeSettlement || 0))}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Finance Details */}
              {deal?.financeSelection?.isFinanced && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Finance Details</label>

                  {/* Cancel Finance Option */}
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={invoiceConfirmForm.cancelFinance}
                        onChange={(e) => setInvoiceConfirmForm(prev => ({
                          ...prev,
                          cancelFinance: e.target.checked,
                          financeCompanyContactId: e.target.checked ? "" : prev.financeCompanyContactId,
                          financeCompanyName: e.target.checked ? "" : prev.financeCompanyName,
                          financeAdvance: e.target.checked ? "" : prev.financeAdvance,
                        }))}
                        className="checkbox checkbox-warning"
                      />
                      <div>
                        <span className="font-medium text-amber-800">Customer no longer using finance</span>
                        <p className="text-xs text-amber-600">Check this if the customer has changed payment method</p>
                      </div>
                    </label>
                  </div>

                  {!invoiceConfirmForm.cancelFinance && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Finance Company</label>
                        <ContactPicker
                          value={invoiceConfirmForm.financeCompanyContactId}
                          onChange={(contactId, contact) => setInvoiceConfirmForm(prev => ({
                            ...prev,
                            financeCompanyContactId: contactId || "",
                            financeCompanyName: contact?.displayName || contact?.companyName || "",
                          }))}
                          filterTypeTags={["FINANCE"]}
                          placeholder="Search finance companies..."
                          allowCreate={true}
                        />
                        {deal.financeSelection?.toBeConfirmed && (
                          <p className="text-xs text-amber-600 mt-1">Finance company was marked as "To Be Confirmed"</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Finance Advance Amount (£)</label>
                        <input
                          type="number"
                          value={invoiceConfirmForm.financeAdvance}
                          onChange={(e) => setInvoiceConfirmForm(prev => ({ ...prev, financeAdvance: e.target.value }))}
                          className="input input-bordered w-full"
                          placeholder="Amount paid by finance company"
                        />
                        <p className="text-xs text-slate-500 mt-1">This is the amount the finance company will pay directly to you</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>

            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => setShowInvoiceConfirmModal(false)}
                className="btn btn-ghost flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAndGenerateInvoice}
                disabled={actionLoading === "invoice"}
                className="btn bg-blue-500 hover:bg-blue-600 text-white border-none flex-1"
              >
                {actionLoading === "invoice" ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Generate Invoice
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Driver Link Modal */}
      {showDriverLinkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">Generate Third-Party Driver Link</h3>
            <p className="text-sm text-slate-600 mb-4">
              Create a secure link for your driver to capture customer signature on delivery.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                PIN Protection (Optional)
              </label>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={driverLinkPin}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                  setDriverLinkPin(value);
                }}
                className="input input-bordered w-full text-center text-xl tracking-widest font-mono"
                placeholder="Enter 4-digit PIN"
              />
              <p className="text-xs text-slate-500 mt-1">
                Leave empty for no PIN protection
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDriverLinkModal(false)}
                className="btn btn-ghost flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateDriverLink}
                disabled={driverLinkLoading}
                className="btn bg-blue-500 hover:bg-blue-600 text-white border-none flex-1"
              >
                {driverLinkLoading ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  "Generate Link"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Signature Capture Modal (Invoice) */}
      <SignatureCapture
        isOpen={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        onComplete={handleSignatureComplete}
        deal={deal}
        existingSignatures={deal?.signature}
      />

      {/* Signature Capture Modal (Deposit Receipt) */}
      <SignatureCapture
        isOpen={showDepositSignatureModal}
        onClose={() => setShowDepositSignatureModal(false)}
        onComplete={handleDepositSignatureComplete}
        deal={deal}
        existingSignatures={deal?.depositSignature}
      />

      {/* Edit Warranty Modal */}
      {showEditWarrantyModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowEditWarrantyModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Edit Warranty</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Warranty Name
                </label>
                <input
                  type="text"
                  value={warrantyEditForm.name}
                  onChange={(e) => setWarrantyEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="input input-bordered w-full"
                  placeholder="e.g., 3 Month Warranty"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={warrantyEditForm.description || ""}
                  onChange={(e) => setWarrantyEditForm(prev => ({ ...prev, description: e.target.value }))}
                  className="input input-bordered w-full"
                  placeholder="Optional description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Duration (months)
                  </label>
                  <input
                    type="number"
                    value={warrantyEditForm.durationMonths}
                    onChange={(e) => setWarrantyEditForm(prev => ({ ...prev, durationMonths: e.target.value }))}
                    className="input input-bordered w-full"
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Claim Limit (£)
                  </label>
                  <input
                    type="number"
                    value={warrantyEditForm.claimLimit}
                    onChange={(e) => setWarrantyEditForm(prev => ({ ...prev, claimLimit: e.target.value }))}
                    className="input input-bordered w-full"
                    placeholder="Leave empty for unlimited"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Price (£)
                </label>
                <input
                  type="number"
                  value={warrantyEditForm.priceGross}
                  onChange={(e) => setWarrantyEditForm(prev => ({ ...prev, priceGross: e.target.value }))}
                  className="input input-bordered w-full"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
                <p className="text-xs text-slate-500 mt-1">Set to 0 for included/free warranty</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEditWarrantyModal(false)}
                className="btn btn-ghost flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveWarranty}
                disabled={warrantyEditLoading}
                className="btn bg-emerald-500 hover:bg-emerald-600 text-white border-none flex-1"
              >
                {warrantyEditLoading ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline Form Modals */}
      <InlineFormModal
        isOpen={showServiceReceiptModal}
        onClose={() => setShowServiceReceiptModal(false)}
        formType="SERVICE_RECEIPT"
        prefill={{
          vrm: deal?.vehicleId?.regCurrent,
          make: deal?.vehicleId?.make,
          model: deal?.vehicleId?.model,
          mileage: deal?.vehicleId?.mileageCurrent,
          vehicleId: deal?.vehicleId?._id || deal?.vehicleId,
          dealId: dealId,
        }}
        onSuccess={() => {
          toast.success("Service receipt added");
          fetchLinkedSubmissions();
          setShowServiceReceiptModal(false);
        }}
      />

      <InlineFormModal
        isOpen={showDeliveryFormModal}
        onClose={() => setShowDeliveryFormModal(false)}
        formType="DELIVERY"
        prefill={{
          vrm: deal?.vehicleId?.regCurrent,
          make: deal?.vehicleId?.make,
          model: deal?.vehicleId?.model,
          vehicleId: deal?.vehicleId?._id || deal?.vehicleId,
          dealId: dealId,
          customer_first_name: deal?.customerId?.name?.split(" ")[0] || "",
          customer_last_name: deal?.customerId?.name?.split(" ").slice(1).join(" ") || "",
        }}
        onSuccess={() => {
          toast.success("Delivery form completed");
          fetchDeal();
          setShowDeliveryFormModal(false);
        }}
      />
    </div>
  );
}
