import { useEffect, useState, useCallback, useMemo } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "react-hot-toast";
import useDealerRedirect from "@/hooks/useDealerRedirect";

// Status tabs for filtering
const STATUS_TABS = [
  { key: "AVAILABLE", label: "In Stock" },
  { key: "IN_DEAL", label: "In Deal" },
  { key: "SOLD", label: "Sold (Ex-Stock)" },
  { key: "all", label: "All Vehicles" },
];

// Days in stock filter options
const DAYS_IN_STOCK_OPTIONS = [
  { value: "all", label: "All" },
  { value: "0-30", label: "0-30 days" },
  { value: "30-60", label: "30-60 days" },
  { value: "60-90", label: "60-90 days" },
  { value: "90+", label: "90+ days" },
];

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
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

// Calculate days in stock
const getDaysInStock = (createdAt) => {
  if (!createdAt) return 0;
  const created = new Date(createdAt);
  const now = new Date();
  const diff = now - created;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

// Calculate VAT breakdown from gross price
const calculateVatFromGross = (grossPrice, vatRate = 0.2) => {
  if (!grossPrice || isNaN(grossPrice)) return { net: "", vat: "" };
  const gross = parseFloat(grossPrice);
  const net = gross / (1 + vatRate);
  const vat = gross - net;
  return {
    net: net.toFixed(2),
    vat: vat.toFixed(2),
  };
};

export default function StockBook() {
  const router = useRouter();
  const { isRedirecting } = useDealerRedirect();
  const [vehicles, setVehicles] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [dealer, setDealer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState("AVAILABLE");
  const [searchQuery, setSearchQuery] = useState("");
  const [daysFilter, setDaysFilter] = useState("all");
  const [hasSivFilter, setHasSivFilter] = useState("all");
  const [vatFilter, setVatFilter] = useState("all");
  const [sellerFilter, setSellerFilter] = useState("all");
  const [sellerSearch, setSellerSearch] = useState("");
  const [sellerFilterName, setSellerFilterName] = useState(""); // Display name of selected seller
  const [showSellerSuggestions, setShowSellerSuggestions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Sorting state
  const [sortField, setSortField] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("stockbook_sortField") || "days";
    }
    return "days";
  });
  const [sortDirection, setSortDirection] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("stockbook_sortDirection") || "desc";
    }
    return "desc";
  });

  // Drawer state
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDrawerLoading, setIsDrawerLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingSelfBill, setIsGeneratingSelfBill] = useState(false);

  // Purchase info form state
  const [purchaseForm, setPurchaseForm] = useState({
    purchasePriceNet: "",
    purchasePriceGross: "", // For VAT_QUALIFYING: user enters gross, we calculate net
    purchaseVat: "",
    vatScheme: "MARGIN",
    purchasedFromContactId: "",
    purchaseDate: "",
    purchaseInvoiceRef: "",
    purchaseNotes: "",
  });

  // Document upload modal state
  const [showAddDocumentModal, setShowAddDocumentModal] = useState(false);
  const [documentForm, setDocumentForm] = useState({
    name: "",
    type: "other",
    file: null,
  });

  // Add Vehicle modal state
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [addVehicleForm, setAddVehicleForm] = useState({
    // Vehicle details
    regCurrent: "",
    vin: "",
    make: "",
    model: "",
    year: "",
    colour: "",
    mileageCurrent: "",
    fuelType: "",
    transmission: "",
    // MOT data from DVSA API
    motExpiryDate: null,
    motHistory: null,
    firstRegisteredDate: null, // Date of first registration from DVSA
    // DVLA data
    dvlaDetails: null,
    // Purchase details
    vatScheme: "MARGIN",
    purchasePriceNet: "",
    purchasePriceGross: "", // For VAT_QUALIFYING: user enters gross, we calculate net
    purchaseVat: "",
    purchasedFromContactId: "",
    purchaseDate: "",
    purchaseInvoiceRef: "",
    purchaseNotes: "",
    // Document uploads
    v5File: null,
    serviceHistoryFile: null,
    // Vehicle Prep option
    addToVehiclePrep: false,
  });

  // Load vehicles
  const fetchVehicles = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch all STOCK type vehicles (not COURTESY or FLEET_OTHER)
      const response = await fetch("/api/vehicles?type=STOCK&includeAll=1");
      if (!response.ok) {
        throw new Error("Failed to fetch vehicles");
      }
      const data = await response.json();
      setVehicles(Array.isArray(data) ? data : data.vehicles || []);
    } catch (error) {
      console.error("[StockBook] Fetch error:", error);
      toast.error("Failed to load vehicles");
      setVehicles([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load contacts for seller dropdown
  const fetchContacts = useCallback(async () => {
    try {
      const response = await fetch("/api/contacts?type=SUPPLIER");
      if (response.ok) {
        const data = await response.json();
        setContacts(Array.isArray(data) ? data : data.contacts || []);
      }
    } catch (error) {
      console.error("[StockBook] Contacts fetch error:", error);
    }
  }, []);

  // Load dealer settings (for VAT rate)
  const fetchDealer = useCallback(async () => {
    try {
      const response = await fetch("/api/dealer");
      if (response.ok) {
        const data = await response.json();
        setDealer(data);
      }
    } catch (error) {
      console.error("[StockBook] Dealer fetch error:", error);
    }
  }, []);

  useEffect(() => {
    if (!isRedirecting) {
      fetchVehicles();
      fetchContacts();
      fetchDealer();
    }
  }, [isRedirecting, fetchVehicles, fetchContacts, fetchDealer]);

  // Handle addVehicle query param (from Vehicle Prep or Quick Add menu)
  useEffect(() => {
    if (router.query.addVehicle === "1") {
      setShowAddVehicleModal(true);
      // Remove the query param from URL without reload
      router.replace("/stock-book", undefined, { shallow: true });
    }
  }, [router.query.addVehicle, router]);

  // Filter vehicles
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((vehicle) => {
      // Status filter - treat undefined/null salesStatus as "AVAILABLE"
      const vehicleSalesStatus = vehicle.salesStatus || "AVAILABLE";

      if (activeStatus !== "all") {
        if (activeStatus === "SOLD") {
          // Sold includes DELIVERED and COMPLETED
          if (!["DELIVERED", "COMPLETED"].includes(vehicleSalesStatus)) {
            return false;
          }
        } else if (activeStatus === "IN_DEAL") {
          // In deal includes IN_DEAL and SOLD_IN_PROGRESS
          if (!["IN_DEAL", "SOLD_IN_PROGRESS"].includes(vehicleSalesStatus)) {
            return false;
          }
        } else if (vehicleSalesStatus !== activeStatus) {
          return false;
        }
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          vehicle.regCurrent?.toLowerCase().includes(query) ||
          vehicle.make?.toLowerCase().includes(query) ||
          vehicle.model?.toLowerCase().includes(query) ||
          vehicle.stockNumber?.toLowerCase().includes(query) ||
          vehicle.vin?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Days in stock filter
      if (daysFilter !== "all") {
        const days = getDaysInStock(vehicle.createdAt);
        if (daysFilter === "0-30" && days > 30) return false;
        if (daysFilter === "30-60" && (days < 30 || days > 60)) return false;
        if (daysFilter === "60-90" && (days < 60 || days > 90)) return false;
        if (daysFilter === "90+" && days < 90) return false;
      }

      // Has SIV filter
      if (hasSivFilter !== "all") {
        const hasSiv = vehicle.purchase?.purchasePriceNet != null;
        if (hasSivFilter === "yes" && !hasSiv) return false;
        if (hasSivFilter === "no" && hasSiv) return false;
      }

      // VAT filter
      if (vatFilter !== "all") {
        if (vatFilter === "vat_qualifying" && vehicle.vatScheme !== "VAT_QUALIFYING") return false;
        if (vatFilter === "margin" && vehicle.vatScheme !== "MARGIN") return false;
      }

      // Seller filter
      if (sellerFilter !== "all") {
        const sellerId = vehicle.purchase?.purchasedFromContactId;
        const sellerIdStr = typeof sellerId === "object" ? sellerId?._id : sellerId;
        if (sellerIdStr !== sellerFilter) return false;
      }

      return true;
    });

    // Sort filtered results
    const sorted = [...filtered].sort((a, b) => {
      let aVal, bVal;

      switch (sortField) {
        case "vrm":
          aVal = a.regCurrent || "";
          bVal = b.regCurrent || "";
          break;
        case "vehicle":
          aVal = `${a.make || ""} ${a.model || ""}`.trim();
          bVal = `${b.make || ""} ${b.model || ""}`.trim();
          break;
        case "days":
          aVal = getDaysInStock(a.createdAt);
          bVal = getDaysInStock(b.createdAt);
          break;
        case "siv":
          aVal = a.purchase?.purchasePriceNet || 0;
          bVal = b.purchase?.purchasePriceNet || 0;
          break;
        case "purchased":
          aVal = a.purchase?.purchaseDate ? new Date(a.purchase.purchaseDate).getTime() : 0;
          bVal = b.purchase?.purchaseDate ? new Date(b.purchase.purchaseDate).getTime() : 0;
          break;
        case "stock":
          aVal = a.stockNumber || "";
          bVal = b.stockNumber || "";
          break;
        default:
          aVal = getDaysInStock(a.createdAt);
          bVal = getDaysInStock(b.createdAt);
      }

      // Handle string comparison
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      // Handle number comparison
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    });

    return sorted;
  }, [vehicles, activeStatus, searchQuery, daysFilter, hasSivFilter, vatFilter, sellerFilter, sortField, sortDirection]);

  // Calculate stats (treat undefined/null salesStatus as AVAILABLE)
  const stats = useMemo(() => {
    const inStock = vehicles.filter(v => !v.salesStatus || v.salesStatus === "AVAILABLE");
    const totalStockValue = inStock.reduce((sum, v) => sum + (v.purchase?.purchasePriceNet || 0), 0);
    const vatQualifying = inStock.filter(v => v.vatScheme === "VAT_QUALIFYING");
    const vatQualifyingValue = vatQualifying.reduce((sum, v) => sum + (v.purchase?.purchasePriceNet || 0), 0);
    const marginScheme = inStock.filter(v => v.vatScheme === "MARGIN" || !v.vatScheme);
    const marginSchemeValue = marginScheme.reduce((sum, v) => sum + (v.purchase?.purchasePriceNet || 0), 0);
    const totalDays = inStock.reduce((sum, v) => sum + getDaysInStock(v.createdAt), 0);
    const avgDaysInStock = inStock.length > 0 ? Math.round(totalDays / inStock.length) : 0;

    return {
      totalStockValue,
      vatQualifyingCount: vatQualifying.length,
      vatQualifyingValue,
      marginSchemeCount: marginScheme.length,
      marginSchemeValue,
      avgDaysInStock,
      inStockCount: inStock.length,
    };
  }, [vehicles]);

  // Handle column sorting
  const handleSort = (field) => {
    let newDirection = "asc";
    if (sortField === field) {
      // Toggle direction if same field
      newDirection = sortDirection === "asc" ? "desc" : "asc";
    } else {
      // Default to descending for days/dates, ascending for text
      newDirection = ["days", "siv", "purchased"].includes(field) ? "desc" : "asc";
    }
    setSortField(field);
    setSortDirection(newDirection);
    // Persist to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("stockbook_sortField", field);
      localStorage.setItem("stockbook_sortDirection", newDirection);
    }
  };

  // Sort indicator component
  const SortIndicator = ({ field }) => {
    if (sortField !== field) return null;
    return (
      <span className="ml-1">
        {sortDirection === "asc" ? "↑" : "↓"}
      </span>
    );
  };

  // Check if vehicle has complete purchase info
  const hasPurchaseInfo = (vehicle) => {
    return (
      vehicle.purchase?.purchasePriceNet != null &&
      vehicle.vatScheme &&
      vehicle.purchase?.purchasedFromContactId
    );
  };

  // Open vehicle drawer
  const handleVehicleClick = async (vehicleId) => {
    setSelectedVehicleId(vehicleId);
    setIsDrawerOpen(true);
    setIsDrawerLoading(true);

    try {
      const response = await fetch(`/api/vehicles/${vehicleId}`);
      if (!response.ok) throw new Error("Failed to load vehicle");
      const data = await response.json();
      setSelectedVehicle(data);

      // Populate form - calculate gross from net+vat for VAT_QUALIFYING
      const net = data.purchase?.purchasePriceNet || "";
      const vat = data.purchase?.purchaseVat || "";
      const gross = net && vat ? (parseFloat(net) + parseFloat(vat)).toFixed(2) : net || "";

      setPurchaseForm({
        purchasePriceNet: net,
        purchasePriceGross: data.vatScheme === "VAT_QUALIFYING" ? gross : "",
        purchaseVat: vat,
        vatScheme: data.vatScheme || "MARGIN",
        purchasedFromContactId: data.purchase?.purchasedFromContactId?._id || data.purchase?.purchasedFromContactId || "",
        purchaseDate: data.purchase?.purchaseDate ? new Date(data.purchase.purchaseDate).toISOString().split("T")[0] : "",
        purchaseInvoiceRef: data.purchase?.purchaseInvoiceRef || "",
        purchaseNotes: data.purchase?.purchaseNotes || "",
      });
    } catch (error) {
      toast.error("Failed to load vehicle details");
      setIsDrawerOpen(false);
    } finally {
      setIsDrawerLoading(false);
    }
  };

  // Close drawer
  const handleDrawerClose = () => {
    setIsDrawerOpen(false);
    setSelectedVehicle(null);
    setSelectedVehicleId(null);
  };

  // Save purchase info
  const handleSavePurchaseInfo = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Auto-assign stock number if vehicle doesn't have one
      if (!selectedVehicle?.stockNumber) {
        try {
          await fetch(`/api/vehicles/${selectedVehicleId}/assign-stock-number`, {
            method: "POST",
          });
        } catch (stockErr) {
          console.error("[StockBook] Failed to assign stock number:", stockErr);
          // Continue with save even if stock number assignment fails
        }
      }

      const response = await fetch(`/api/vehicles/${selectedVehicleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vatScheme: purchaseForm.vatScheme,
          purchase: {
            purchasePriceNet: purchaseForm.purchasePriceNet ? parseFloat(purchaseForm.purchasePriceNet) : null,
            purchaseVat: purchaseForm.purchaseVat ? parseFloat(purchaseForm.purchaseVat) : null,
            purchasedFromContactId: purchaseForm.purchasedFromContactId || null,
            purchaseDate: purchaseForm.purchaseDate || null,
            purchaseInvoiceRef: purchaseForm.purchaseInvoiceRef || null,
            purchaseNotes: purchaseForm.purchaseNotes || null,
          },
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to save");
      }

      toast.success("Purchase info saved");
      fetchVehicles(); // Refresh list
      handleDrawerClose();
    } catch (error) {
      toast.error(error.message || "Failed to save purchase info");
    } finally {
      setIsSaving(false);
    }
  };

  // Create sale for vehicle
  const handleCreateSale = async (vehicle) => {
    const vehicleId = vehicle.id || vehicle._id;

    if (!hasPurchaseInfo(vehicle)) {
      toast.error("Complete purchase info required before creating a sale");
      handleVehicleClick(vehicleId);
      return;
    }

    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.existingDealId) {
          toast.success("Opening existing deal");
          router.push(`/sales?id=${data.existingDealId}`);
          return;
        }
        throw new Error(data.error || "Failed to create deal");
      }

      toast.success("Deal created");
      router.push(`/sales?id=${data.id}`);
    } catch (error) {
      toast.error(error.message || "Could not create sale");
    }
  };

  // Generate self-billing invoice
  const handleGenerateSelfBill = async (vehicle) => {
    const vehicleId = vehicle.id || vehicle._id;

    if (!hasPurchaseInfo(vehicle)) {
      toast.error("Complete purchase info required before generating self-bill");
      return;
    }

    setIsGeneratingSelfBill(true);

    try {
      const res = await fetch(`/api/vehicles/${vehicleId}/generate-self-bill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.existingDocumentId) {
          toast.error(`Self-billing invoice already exists: ${data.documentNumber}`);
          return;
        }
        throw new Error(data.error || "Failed to generate self-billing invoice");
      }

      toast.success(`Self-billing invoice ${data.documentNumber} generated`);

      // Open the generated document in a new tab
      if (data.shareUrl) {
        window.open(data.shareUrl, "_blank");
      }
    } catch (error) {
      toast.error(error.message || "Could not generate self-billing invoice");
    } finally {
      setIsGeneratingSelfBill(false);
    }
  };

  // Add vehicle to Prep Board
  const handleAddToPrepBoard = async (vehicle) => {
    const vehicleId = vehicle.id || vehicle._id;

    if (vehicle.showOnPrepBoard === true) {
      toast.error("Vehicle is already on the Prep Board");
      return;
    }

    try {
      const res = await fetch(`/api/vehicles/${vehicleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showOnPrepBoard: true }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to add to Prep Board");
      }

      fetchVehicles();
      toast.success("Vehicle added to Prep Board");
    } catch (error) {
      toast.error(error.message || "Failed to add to Prep Board");
    }
  };

  // Delete vehicle permanently
  const handleDeleteVehicle = async (vehicle) => {
    const vehicleId = vehicle.id || vehicle._id;

    if (!confirm("Delete this vehicle permanently?\n\nThis cannot be undone.")) return;

    try {
      const res = await fetch(`/api/vehicles/${vehicleId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete vehicle");

      fetchVehicles();
      toast.success("Vehicle deleted");
    } catch (error) {
      toast.error(error.message || "Failed to delete vehicle");
    }
  };

  // Upload V5 document
  const uploadV5 = async (file) => {
    if (!file || !selectedVehicle) return;

    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/vehicles/upload", {
        method: "POST",
        body: formData,
      });
      if (!uploadRes.ok) throw new Error("Upload failed");
      const uploadData = await uploadRes.json();

      const vehicleId = selectedVehicle.id || selectedVehicle._id;
      await fetch(`/api/vehicles/${vehicleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ v5Url: uploadData.url }),
      });

      const updated = await fetch(`/api/vehicles/${vehicleId}`).then(r => r.json());
      setSelectedVehicle(updated);
      fetchVehicles();
      toast.success("V5 uploaded");
    } catch (error) {
      console.error("V5 upload error:", error);
      toast.error("Failed to upload V5");
    }
  };

  // Upload Service History document
  const uploadServiceHistory = async (file) => {
    if (!file || !selectedVehicle) return;

    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/vehicles/upload", {
        method: "POST",
        body: formData,
      });
      if (!uploadRes.ok) throw new Error("Upload failed");
      const uploadData = await uploadRes.json();

      const vehicleId = selectedVehicle.id || selectedVehicle._id;
      await fetch(`/api/vehicles/${vehicleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceHistoryUrl: uploadData.url }),
      });

      const updated = await fetch(`/api/vehicles/${vehicleId}`).then(r => r.json());
      setSelectedVehicle(updated);
      fetchVehicles();
      toast.success("Service history uploaded");
    } catch (error) {
      console.error("Service history upload error:", error);
      toast.error("Failed to upload service history");
    }
  };

  // Upload generic document
  const uploadDocument = async (file, name, type) => {
    if (!file || !selectedVehicle) return;

    try {
      // First upload the file
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);

      const uploadRes = await fetch("/api/vehicles/upload", {
        method: "POST",
        body: uploadFormData,
      });
      if (!uploadRes.ok) throw new Error("File upload failed");
      const uploadData = await uploadRes.json();

      // Then create the document record with the URL
      const vehicleId = selectedVehicle.id || selectedVehicle._id;
      const docRes = await fetch(`/api/vehicles/${vehicleId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type, url: uploadData.url }),
      });
      if (!docRes.ok) throw new Error("Document creation failed");

      const updatedVehicle = await fetch(`/api/vehicles/${vehicleId}`).then(r => r.json());
      setSelectedVehicle(updatedVehicle);
      fetchVehicles();
      setShowAddDocumentModal(false);
      setDocumentForm({ name: "", type: "other", file: null });
      toast.success("Document uploaded");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload document");
    }
  };

  // Delete document
  const deleteDocument = async (documentId) => {
    if (!selectedVehicle) return;

    try {
      await fetch(`/api/documents/${documentId}`, { method: "DELETE" });
      const vehicleId = selectedVehicle.id || selectedVehicle._id;
      const updatedVehicle = await fetch(`/api/vehicles/${vehicleId}`).then(r => r.json());
      setSelectedVehicle(updatedVehicle);
      fetchVehicles();
      toast.success("Document removed");
    } catch (error) {
      toast.error("Failed to delete document");
    }
  };

  // Get unique sellers from vehicles for filter dropdown
  const uniqueSellers = useMemo(() => {
    const sellerMap = new Map();
    vehicles.forEach(v => {
      const seller = v.purchase?.purchasedFromContactId;
      if (seller) {
        const id = typeof seller === "object" ? seller._id : seller;
        const name = typeof seller === "object" ? seller.displayName || seller.companyName : null;
        if (id && !sellerMap.has(id)) {
          sellerMap.set(id, name || `Seller ${id.slice(-4)}`);
        }
      }
    });
    return Array.from(sellerMap.entries());
  }, [vehicles]);

  // Filter sellers based on search input (for autocomplete)
  const filteredSellers = useMemo(() => {
    if (!sellerSearch.trim()) return uniqueSellers.slice(0, 10); // Show first 10 when no search
    const search = sellerSearch.toLowerCase();
    return uniqueSellers
      .filter(([, name]) => name.toLowerCase().includes(search))
      .slice(0, 10); // Limit to 10 suggestions
  }, [uniqueSellers, sellerSearch]);

  // VRM Lookup for Add Vehicle form
  const handleAddVehicleVrmLookup = async () => {
    const vrm = addVehicleForm.regCurrent?.replace(/\s/g, "").toUpperCase();
    if (!vrm || vrm.length < 2) {
      toast.error("Enter a valid registration");
      return;
    }

    setIsLookingUp(true);
    try {
      // Call both DVLA and MOT APIs in parallel
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

      // Update form with combined data including MOT history and DVLA details
      setAddVehicleForm(prev => ({
        ...prev,
        regCurrent: vrm,
        make: dvlaData.make || motData?.make || prev.make,
        model: motData?.model || dvlaData.model || prev.model,
        vin: motData?.vin || prev.vin,
        year: dvlaData.yearOfManufacture || dvlaData.year || motData?.manufactureYear || prev.year,
        colour: dvlaData.colour || motData?.primaryColour || prev.colour,
        fuelType: dvlaData.fuelType || motData?.fuelType || prev.fuelType,
        transmission: dvlaData.transmission || prev.transmission,
        // Store MOT data from DVSA API
        motExpiryDate: motData?.motExpiry || dvlaData.dvlaDetails?.motExpiryDate || null,
        motHistory: motData?.motHistory || null,
        // Date of first registration from DVSA or DVLA
        firstRegisteredDate: motData?.firstUsedDate || dvlaData.firstRegisteredDate || null,
        // Store DVLA details
        dvlaDetails: dvlaData.dvlaDetails || null,
      }));

      const make = dvlaData.make || motData?.make;
      const model = motData?.model || dvlaData.model;
      toast.success(`Found: ${make} ${model}`);
    } catch (error) {
      console.error("[StockBook] VRM Lookup error:", error);
      toast.error("Lookup failed - please try again");
    } finally {
      setIsLookingUp(false);
    }
  };

  // Add Vehicle handler
  const handleAddVehicle = async (e) => {
    e.preventDefault();

    if (!addVehicleForm.regCurrent || !addVehicleForm.make || !addVehicleForm.model) {
      toast.error("Registration, make and model are required");
      return;
    }

    setIsAddingVehicle(true);
    try {
      // Create vehicle with purchase info and MOT/DVLA data
      const response = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          regCurrent: addVehicleForm.regCurrent,
          vin: addVehicleForm.vin || undefined,
          make: addVehicleForm.make,
          model: addVehicleForm.model,
          year: addVehicleForm.year ? parseInt(addVehicleForm.year) : undefined,
          colour: addVehicleForm.colour || undefined,
          mileageCurrent: addVehicleForm.mileageCurrent ? parseInt(addVehicleForm.mileageCurrent) : undefined,
          fuelType: addVehicleForm.fuelType || undefined,
          transmission: addVehicleForm.transmission || undefined,
          type: "STOCK",
          status: "in_stock",
          // Set showOnPrepBoard if adding to Vehicle Prep
          showOnPrepBoard: addVehicleForm.addToVehiclePrep,
          // Only skip default tasks if NOT adding to Vehicle Prep
          skipDefaultTasks: !addVehicleForm.addToVehiclePrep,
          // MOT data from DVSA API
          motExpiryDate: addVehicleForm.motExpiryDate || undefined,
          motHistory: addVehicleForm.motHistory || undefined,
          motHistoryFetchedAt: addVehicleForm.motHistory ? new Date().toISOString() : undefined,
          // Date of first registration from DVSA
          firstRegisteredDate: addVehicleForm.firstRegisteredDate || undefined,
          // DVLA data
          dvlaDetails: addVehicleForm.dvlaDetails || undefined,
          lastDvlaFetchAt: addVehicleForm.dvlaDetails ? new Date().toISOString() : undefined,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        if (response.status === 409) {
          throw new Error(err.message || "Vehicle already in stock");
        }
        throw new Error(err.error || "Failed to create vehicle");
      }

      const newVehicle = await response.json();
      const vehicleId = newVehicle.id || newVehicle._id;

      // If purchase info provided, save it
      if (addVehicleForm.purchasePriceNet || addVehicleForm.purchasedFromContactId) {
        // Assign stock number
        await fetch(`/api/vehicles/${vehicleId}/assign-stock-number`, { method: "POST" });

        // Update purchase info
        await fetch(`/api/vehicles/${vehicleId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vatScheme: addVehicleForm.vatScheme,
            purchase: {
              purchasePriceNet: addVehicleForm.purchasePriceNet ? parseFloat(addVehicleForm.purchasePriceNet) : null,
              purchaseVat: addVehicleForm.purchaseVat ? parseFloat(addVehicleForm.purchaseVat) : null,
              purchasedFromContactId: addVehicleForm.purchasedFromContactId || null,
              purchaseDate: addVehicleForm.purchaseDate || null,
              purchaseInvoiceRef: addVehicleForm.purchaseInvoiceRef || null,
              purchaseNotes: addVehicleForm.purchaseNotes || null,
            },
          }),
        });
      }

      // Upload V5 document if provided
      if (addVehicleForm.v5File) {
        try {
          const formData = new FormData();
          formData.append("file", addVehicleForm.v5File);
          const uploadRes = await fetch("/api/vehicles/upload", { method: "POST", body: formData });
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            await fetch(`/api/vehicles/${vehicleId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ v5Url: uploadData.url }),
            });
          }
        } catch (e) {
          console.error("V5 upload failed:", e);
        }
      }

      // Upload Service History document if provided
      if (addVehicleForm.serviceHistoryFile) {
        try {
          const formData = new FormData();
          formData.append("file", addVehicleForm.serviceHistoryFile);
          const uploadRes = await fetch("/api/vehicles/upload", { method: "POST", body: formData });
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            await fetch(`/api/vehicles/${vehicleId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ serviceHistoryUrl: uploadData.url }),
            });
          }
        } catch (e) {
          console.error("Service history upload failed:", e);
        }
      }

      const shouldRedirectToPrep = addVehicleForm.addToVehiclePrep;
      toast.success(shouldRedirectToPrep ? "Vehicle added - redirecting to Vehicle Prep" : "Vehicle added to stock book");
      setShowAddVehicleModal(false);
      setAddVehicleForm({
        regCurrent: "", vin: "", make: "", model: "", year: "", colour: "",
        mileageCurrent: "", fuelType: "", transmission: "",
        motExpiryDate: null, motHistory: null, dvlaDetails: null,
        vatScheme: "MARGIN", purchasePriceNet: "", purchasePriceGross: "", purchaseVat: "",
        purchasedFromContactId: "", purchaseDate: "", purchaseInvoiceRef: "", purchaseNotes: "",
        v5File: null, serviceHistoryFile: null,
        addToVehiclePrep: false,
      });
      fetchVehicles();

      // Redirect to Vehicle Prep if checkbox was checked
      if (shouldRedirectToPrep) {
        router.push("/prep");
      }
    } catch (error) {
      toast.error(error.message || "Failed to add vehicle");
    } finally {
      setIsAddingVehicle(false);
    }
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
        <title>Stock Book | DealerHQ</title>
      </Head>

      <div className="min-h-screen bg-slate-50 pb-20">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
          <div className="px-4 py-4 md:px-6 md:py-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-slate-900">Stock Book</h1>
                <p className="text-sm text-slate-500 mt-0.5">
                  All vehicles from the Stock & Prep board will be shown here
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
                    placeholder="Search VRM, make, model..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input input-bordered w-full pl-10 h-10"
                  />
                </div>

                {/* Filter Toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`btn btn-sm ${showFilters ? "btn-primary" : "btn-ghost"}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  <span className="hidden sm:inline">Filters</span>
                </button>

                {/* Add Vehicle Button */}
                <button
                  onClick={() => setShowAddVehicleModal(true)}
                  className="btn bg-[#0066CC] hover:bg-[#0052a3] text-white border-none"
                >
                  <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span className="hidden sm:inline">Add Vehicle</span>
                </button>
              </div>
            </div>

            {/* Status Tabs - Mobile Dropdown */}
            <div className="mt-4 md:hidden">
              <select
                value={activeStatus}
                onChange={(e) => setActiveStatus(e.target.value)}
                className="select select-bordered w-full bg-white text-slate-900 font-medium"
              >
                {STATUS_TABS.map((tab) => {
                  let count = 0;
                  if (tab.key === "all") {
                    count = vehicles.length;
                  } else if (tab.key === "SOLD") {
                    count = vehicles.filter(v => ["DELIVERED", "COMPLETED"].includes(v.salesStatus)).length;
                  } else if (tab.key === "IN_DEAL") {
                    count = vehicles.filter(v => ["IN_DEAL", "SOLD_IN_PROGRESS"].includes(v.salesStatus)).length;
                  } else {
                    count = vehicles.filter(v => v.salesStatus === tab.key).length;
                  }
                  return (
                    <option key={tab.key} value={tab.key}>
                      {tab.label} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Status Tabs - Desktop Horizontal */}
            <div className="mt-4 -mb-px hidden md:flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
              {STATUS_TABS.map((tab) => {
                let count = 0;
                if (tab.key === "all") {
                  count = vehicles.length;
                } else if (tab.key === "SOLD") {
                  count = vehicles.filter(v => ["DELIVERED", "COMPLETED"].includes(v.salesStatus)).length;
                } else if (tab.key === "IN_DEAL") {
                  count = vehicles.filter(v => ["IN_DEAL", "SOLD_IN_PROGRESS"].includes(v.salesStatus)).length;
                } else {
                  count = vehicles.filter(v => v.salesStatus === tab.key).length;
                }

                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveStatus(tab.key)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                      activeStatus === tab.key
                        ? "bg-[#0066CC] text-white shadow-md shadow-[#0066CC]/25"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {tab.label}
                    {count > 0 && (
                      <span
                        className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold ${
                          activeStatus === tab.key
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

          {/* Filters Panel */}
          {showFilters && (
            <div className="px-4 md:px-6 py-4 bg-slate-50 border-t border-slate-200">
              <div className="flex flex-wrap gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-500">Days in Stock</label>
                  <select
                    value={daysFilter}
                    onChange={(e) => setDaysFilter(e.target.value)}
                    className="select select-sm select-bordered bg-white"
                  >
                    {DAYS_IN_STOCK_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-500">Has SIV</label>
                  <select
                    value={hasSivFilter}
                    onChange={(e) => setHasSivFilter(e.target.value)}
                    className="select select-sm select-bordered bg-white"
                  >
                    <option value="all">All</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-500">VAT Status</label>
                  <select
                    value={vatFilter}
                    onChange={(e) => setVatFilter(e.target.value)}
                    className="select select-sm select-bordered bg-white"
                  >
                    <option value="all">All</option>
                    <option value="vat_qualifying">VAT Qualifying</option>
                    <option value="margin">Margin Scheme</option>
                  </select>
                </div>

                {uniqueSellers.length > 0 && (
                  <div className="flex flex-col gap-1 relative">
                    <label className="text-xs font-medium text-slate-500">Seller</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search sellers..."
                        value={sellerFilter === "all" ? sellerSearch : sellerFilterName}
                        onChange={(e) => {
                          setSellerSearch(e.target.value);
                          setSellerFilter("all");
                          setSellerFilterName("");
                          setShowSellerSuggestions(true);
                        }}
                        onFocus={() => setShowSellerSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSellerSuggestions(false), 150)}
                        className="input input-sm input-bordered bg-white w-full pr-8"
                      />
                      {(sellerFilter !== "all" || sellerSearch) && (
                        <button
                          type="button"
                          onClick={() => {
                            setSellerFilter("all");
                            setSellerSearch("");
                            setSellerFilterName("");
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                      {showSellerSuggestions && filteredSellers.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                          {filteredSellers.map(([id, name]) => (
                            <button
                              key={id}
                              type="button"
                              onMouseDown={() => {
                                setSellerFilter(id);
                                setSellerFilterName(name);
                                setSellerSearch("");
                                setShowSellerSuggestions(false);
                              }}
                              className="w-full px-3 py-2 text-sm text-left hover:bg-slate-50 border-b border-slate-100 last:border-0"
                            >
                              {name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => {
                    setDaysFilter("all");
                    setHasSivFilter("all");
                    setVatFilter("all");
                    setSellerFilter("all");
                    setSellerSearch("");
                    setSellerFilterName("");
                  }}
                  className="btn btn-sm btn-ghost self-end"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Stats Summary */}
        <div className="px-4 md:px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
              <p className="text-xs text-slate-500 font-medium">Total Stock Value</p>
              <p className="text-lg font-bold text-slate-900">{formatCurrency(stats.totalStockValue)}</p>
              <p className="text-[10px] text-slate-400">{stats.inStockCount} vehicles</p>
            </div>

            <div className="bg-white rounded-xl border border-blue-200 px-4 py-3">
              <p className="text-xs text-blue-600 font-medium">VAT Qualifying</p>
              <p className="text-lg font-bold text-blue-600">{formatCurrency(stats.vatQualifyingValue)}</p>
              <p className="text-[10px] text-slate-400">{stats.vatQualifyingCount} vehicles</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
              <p className="text-xs text-slate-500 font-medium">Margin Scheme</p>
              <p className="text-lg font-bold text-slate-900">{formatCurrency(stats.marginSchemeValue)}</p>
              <p className="text-[10px] text-slate-400">{stats.marginSchemeCount} vehicles</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
              <p className="text-xs text-slate-500 font-medium">Avg Days in Stock</p>
              <p className="text-lg font-bold text-slate-900">{stats.avgDaysInStock}</p>
              <p className="text-[10px] text-slate-400">days average</p>
            </div>

            <div className="bg-white rounded-xl border border-amber-200 px-4 py-3">
              <p className="text-xs text-amber-600 font-medium">Missing Info</p>
              <p className="text-lg font-bold text-amber-600">
                {vehicles.filter(v => v.salesStatus === "AVAILABLE" && !hasPurchaseInfo(v)).length}
              </p>
              <p className="text-[10px] text-slate-400">need purchase info</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <span className="loading loading-spinner loading-lg text-[#0066CC]"></span>
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 md:p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">No vehicles found</h3>
              <p className="text-slate-500 mb-4">
                {searchQuery ? "Try adjusting your search or filters" : "Add vehicles to get started"}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {/* Table Header */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <div
                  className="col-span-1 cursor-pointer hover:text-slate-700 select-none"
                  onClick={() => handleSort("stock")}
                >
                  Stock #<SortIndicator field="stock" />
                </div>
                <div
                  className="col-span-1 cursor-pointer hover:text-slate-700 select-none"
                  onClick={() => handleSort("vrm")}
                >
                  VRM<SortIndicator field="vrm" />
                </div>
                <div
                  className="col-span-2 cursor-pointer hover:text-slate-700 select-none"
                  onClick={() => handleSort("vehicle")}
                >
                  Vehicle<SortIndicator field="vehicle" />
                </div>
                <div className="col-span-1">Year</div>
                <div
                  className="col-span-1 text-center cursor-pointer hover:text-slate-700 select-none"
                  onClick={() => handleSort("days")}
                >
                  Days<SortIndicator field="days" />
                </div>
                <div
                  className="col-span-1 text-right cursor-pointer hover:text-slate-700 select-none"
                  onClick={() => handleSort("siv")}
                >
                  SIV<SortIndicator field="siv" />
                </div>
                <div className="col-span-1 text-center">VAT</div>
                <div
                  className="col-span-1 cursor-pointer hover:text-slate-700 select-none"
                  onClick={() => handleSort("purchased")}
                >
                  Purchased<SortIndicator field="purchased" />
                </div>
                <div className="col-span-1">Seller</div>
                <div className="col-span-1 text-center">Status</div>
                <div className="col-span-1 text-right">Actions</div>
              </div>

              {/* Table Rows */}
              <div className="divide-y divide-slate-100">
                {filteredVehicles.map((vehicle) => {
                  const days = getDaysInStock(vehicle.createdAt);
                  const hasInfo = hasPurchaseInfo(vehicle);
                  const seller = vehicle.purchase?.purchasedFromContactId;
                  const sellerName = typeof seller === "object"
                    ? seller?.displayName || seller?.companyName
                    : null;

                  return (
                    <div
                      key={vehicle.id || vehicle._id}
                      className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors items-center"
                      onClick={() => handleVehicleClick(vehicle.id || vehicle._id)}
                    >
                      {/* Stock # */}
                      <div className="col-span-6 md:col-span-1">
                        <span className="text-sm font-medium text-slate-900">
                          {vehicle.stockNumber || "—"}
                        </span>
                      </div>

                      {/* VRM */}
                      <div className="col-span-6 md:col-span-1">
                        <span className="font-mono text-sm font-bold text-black bg-[#F7D117] px-2 py-0.5 rounded border border-black/20 tracking-wide">
                          {vehicle.regCurrent}
                        </span>
                      </div>

                      {/* Vehicle */}
                      <div className="col-span-12 md:col-span-2">
                        <p className="font-medium text-slate-900 truncate">
                          {vehicle.make} {vehicle.model}
                        </p>
                      </div>

                      {/* Year */}
                      <div className="hidden md:block col-span-1">
                        <span className="text-sm text-slate-600">{vehicle.year || "—"}</span>
                      </div>

                      {/* Days in Stock */}
                      <div className="hidden md:flex col-span-1 justify-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          days > 90 ? "bg-red-100 text-red-700" :
                          days > 60 ? "bg-amber-100 text-amber-700" :
                          "bg-slate-100 text-slate-600"
                        }`}>
                          {days}d
                        </span>
                      </div>

                      {/* SIV */}
                      <div className="col-span-6 md:col-span-1 text-right">
                        <span className={`text-sm font-medium ${
                          vehicle.purchase?.purchasePriceNet ? "text-slate-900" : "text-slate-400"
                        }`}>
                          {formatCurrency(vehicle.purchase?.purchasePriceNet)}
                        </span>
                      </div>

                      {/* VAT Status */}
                      <div className="hidden md:flex col-span-1 justify-center">
                        {vehicle.vatScheme === "VAT_QUALIFYING" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700">
                            VAT Q
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                            Margin
                          </span>
                        )}
                      </div>

                      {/* Purchased Date */}
                      <div className="hidden md:block col-span-1">
                        <span className="text-sm text-slate-600">
                          {vehicle.purchase?.purchaseDate
                            ? formatDate(vehicle.purchase.purchaseDate)
                            : "—"}
                        </span>
                      </div>

                      {/* Seller */}
                      <div className="hidden md:block col-span-1">
                        <span className="text-sm text-slate-600 truncate block">
                          {sellerName || "—"}
                        </span>
                      </div>

                      {/* Status */}
                      <div className="col-span-6 md:col-span-1 flex justify-center">
                        {!hasInfo ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            Incomplete
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Ready
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="hidden md:flex col-span-1 justify-end gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCreateSale(vehicle);
                          }}
                          className="btn btn-xs btn-ghost text-[#0066CC]"
                          title="Create Sale"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                        {/* Quick Actions Dropdown */}
                        <div className="dropdown dropdown-end">
                          <button
                            tabIndex={0}
                            onClick={(e) => e.stopPropagation()}
                            className="btn btn-xs btn-ghost"
                            title="More actions"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </button>
                          <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-48 z-50">
                            {vehicle.showOnPrepBoard !== true && (
                              <li>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddToPrepBoard(vehicle);
                                  }}
                                  className="text-sm"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                  </svg>
                                  Add to Prep Board
                                </button>
                              </li>
                            )}
                            <li>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteVehicle(vehicle);
                                }}
                                className="text-sm text-error"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete Vehicle
                              </button>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Purchase Info Drawer */}
      {isDrawerOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={handleDrawerClose}
          />
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white shadow-xl z-50 overflow-y-auto">
            {/* Drawer Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Purchase Information</h2>
                {selectedVehicle && (
                  <p className="text-sm text-slate-500">
                    {selectedVehicle.regCurrent} - {selectedVehicle.make} {selectedVehicle.model}
                  </p>
                )}
              </div>
              <button
                onClick={handleDrawerClose}
                className="btn btn-sm btn-ghost btn-circle"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Drawer Content */}
            <div className="p-6 pb-12">
              {isDrawerLoading ? (
                <div className="flex items-center justify-center py-12">
                  <span className="loading loading-spinner loading-lg text-[#0066CC]"></span>
                </div>
              ) : (
                <form onSubmit={handleSavePurchaseInfo} className="space-y-6">
                  {/* VAT Scheme */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">VAT Scheme *</span>
                    </label>
                    <select
                      value={purchaseForm.vatScheme}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, vatScheme: e.target.value })}
                      className="select select-bordered w-full"
                      required
                    >
                      <option value="MARGIN">Margin Scheme</option>
                      <option value="VAT_QUALIFYING">VAT Qualifying</option>
                      <option value="NO_VAT">No VAT</option>
                    </select>
                  </div>

                  {/* Purchase Price */}
                  {purchaseForm.vatScheme === "VAT_QUALIFYING" ? (
                    <>
                      {/* VAT Qualifying: Enter Gross, auto-calculate Net and VAT */}
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text font-medium">Purchase Price (Gross inc VAT) *</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={purchaseForm.purchasePriceGross}
                          onChange={(e) => {
                            const gross = e.target.value;
                            const vatRate = dealer?.salesSettings?.vatRate || 0.2;
                            const { net, vat } = calculateVatFromGross(gross, vatRate);
                            setPurchaseForm({
                              ...purchaseForm,
                              purchasePriceGross: gross,
                              purchasePriceNet: net,
                              purchaseVat: vat,
                            });
                          }}
                          className="input input-bordered w-full"
                          placeholder="0.00"
                          required
                        />
                      </div>
                      {/* Show calculated Net and VAT as read-only */}
                      {purchaseForm.purchasePriceGross && (
                        <div className="grid grid-cols-2 gap-4 mt-2">
                          <div className="form-control">
                            <label className="label py-1">
                              <span className="label-text text-sm text-slate-500">Net (calculated)</span>
                            </label>
                            <input
                              type="text"
                              value={formatCurrency(purchaseForm.purchasePriceNet)}
                              className="input input-bordered w-full bg-slate-50 text-slate-600"
                              disabled
                            />
                          </div>
                          <div className="form-control">
                            <label className="label py-1">
                              <span className="label-text text-sm text-slate-500">VAT (calculated)</span>
                            </label>
                            <input
                              type="text"
                              value={formatCurrency(purchaseForm.purchaseVat)}
                              className="input input-bordered w-full bg-slate-50 text-slate-600"
                              disabled
                            />
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    /* Margin/No VAT: Just enter SIV price */
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium">Purchase Price (SIV) *</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={purchaseForm.purchasePriceNet}
                        onChange={(e) => setPurchaseForm({ ...purchaseForm, purchasePriceNet: e.target.value })}
                        className="input input-bordered w-full"
                        placeholder="0.00"
                        required
                      />
                    </div>
                  )}

                  {/* Seller */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Purchased From (Seller) *</span>
                    </label>
                    <select
                      value={purchaseForm.purchasedFromContactId}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, purchasedFromContactId: e.target.value })}
                      className="select select-bordered w-full"
                      required
                    >
                      <option value="">Select a seller...</option>
                      {contacts.map((contact) => (
                        <option key={contact.id || contact._id} value={contact.id || contact._id}>
                          {contact.displayName || contact.companyName}
                        </option>
                      ))}
                    </select>
                    <label className="label">
                      <span className="label-text-alt text-slate-400">
                        Don&apos;t see the seller?{" "}
                        <button
                          type="button"
                          onClick={() => router.push("/contacts?addContact=1&type=SUPPLIER")}
                          className="text-[#0066CC] hover:underline"
                        >
                          Add a new contact
                        </button>
                      </span>
                    </label>
                  </div>

                  {/* Purchase Date */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Purchase Date</span>
                    </label>
                    <input
                      type="date"
                      value={purchaseForm.purchaseDate}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, purchaseDate: e.target.value })}
                      className="input input-bordered w-full"
                    />
                  </div>

                  {/* Stock Number - Read Only */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Stock Number</span>
                      <span className="label-text-alt text-slate-400">Auto-assigned</span>
                    </label>
                    <div className="input input-bordered bg-slate-50 flex items-center">
                      <span className="font-mono font-bold text-slate-700">
                        {selectedVehicle?.stockNumber || "Will be assigned on save"}
                      </span>
                    </div>
                  </div>

                  {/* Supplier Invoice Reference */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Supplier Invoice Ref</span>
                      <span className="label-text-alt text-slate-400">Optional</span>
                    </label>
                    <input
                      type="text"
                      value={purchaseForm.purchaseInvoiceRef}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, purchaseInvoiceRef: e.target.value })}
                      className="input input-bordered w-full"
                      placeholder="Supplier's invoice number"
                    />
                  </div>

                  {/* Notes */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Purchase Notes</span>
                    </label>
                    <textarea
                      value={purchaseForm.purchaseNotes}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, purchaseNotes: e.target.value })}
                      className="textarea textarea-bordered w-full"
                      rows={3}
                      placeholder="Any notes about this purchase..."
                    />
                  </div>

                  {/* Documents Section */}
                  <div className="border-t border-slate-200 pt-4 mt-4">
                    <p className="text-sm font-medium text-slate-600 mb-3">Documents</p>

                    {/* V5 Document */}
                    <div className="mb-4">
                      <label className="label">
                        <span className="label-text font-medium">V5 Document</span>
                      </label>
                      {selectedVehicle?.v5Url ? (
                        <div className="flex gap-2">
                          <a
                            href={selectedVehicle.v5Url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-outline flex-1"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View V5
                          </a>
                          <label className="btn btn-sm btn-ghost">
                            Replace
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              className="hidden"
                              onChange={(e) => uploadV5(e.target.files[0])}
                            />
                          </label>
                        </div>
                      ) : (
                        <label className="btn btn-sm btn-outline w-full">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          Upload V5 Document
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            className="hidden"
                            onChange={(e) => uploadV5(e.target.files[0])}
                          />
                        </label>
                      )}
                    </div>

                    {/* Service History */}
                    <div>
                      <label className="label">
                        <span className="label-text font-medium">Service History</span>
                      </label>
                      {selectedVehicle?.serviceHistoryUrl ? (
                        <div className="flex gap-2">
                          <a
                            href={selectedVehicle.serviceHistoryUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-outline flex-1"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View Service History
                          </a>
                          <label className="btn btn-sm btn-ghost">
                            Replace
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              className="hidden"
                              onChange={(e) => uploadServiceHistory(e.target.files[0])}
                            />
                          </label>
                        </div>
                      ) : (
                        <label className="btn btn-sm btn-outline w-full">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          Upload Service History
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            className="hidden"
                            onChange={(e) => uploadServiceHistory(e.target.files[0])}
                          />
                        </label>
                      )}
                    </div>

                    {/* Other Documents */}
                    <div className="pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <label className="label py-0">
                          <span className="label-text font-medium">Other Documents</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowAddDocumentModal(true)}
                          className="btn btn-xs btn-ghost text-[#0066CC]"
                        >
                          + Add
                        </button>
                      </div>
                      {selectedVehicle?.documents && selectedVehicle.documents.length > 0 ? (
                        <div className="space-y-2">
                          {selectedVehicle.documents.map((doc) => (
                            <div key={doc.id || doc._id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{doc.name}</p>
                                <span className="text-xs text-slate-500">
                                  {doc.type === "v5" && "V5"}
                                  {doc.type === "service_history" && "Service History"}
                                  {doc.type === "fault_codes" && "Fault Codes"}
                                  {doc.type === "other" && "Other"}
                                </span>
                              </div>
                              <div className="flex gap-1 ml-2">
                                <a
                                  href={doc.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-ghost btn-xs"
                                >
                                  View
                                </a>
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-xs text-error"
                                  onClick={() => {
                                    if (confirm("Delete this document?")) deleteDocument(doc.id || doc._id);
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400 text-center py-2">No documents uploaded</p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={handleDrawerClose}
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
                      ) : (
                        "Save Purchase Info"
                      )}
                    </button>
                  </div>

                  {/* Quick Actions */}
                  {selectedVehicle && hasPurchaseInfo(selectedVehicle) && (
                    <div className="border-t border-slate-200 pt-4 mt-4">
                      <p className="text-sm font-medium text-slate-600 mb-3">Quick Actions</p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleCreateSale(selectedVehicle)}
                          className="btn btn-sm btn-outline border-[#0066CC] text-[#0066CC] hover:bg-[#0066CC] hover:text-white"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Create Sale
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGenerateSelfBill(selectedVehicle)}
                          disabled={isGeneratingSelfBill}
                          className="btn btn-sm btn-outline border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white"
                        >
                          {isGeneratingSelfBill ? (
                            <span className="loading loading-spinner loading-xs mr-1"></span>
                          ) : (
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          )}
                          Generate Self-Bill
                        </button>
                      </div>
                    </div>
                  )}
                </form>
              )}
            </div>
          </div>
        </>
      )}

      {/* Add Vehicle Modal */}
      {showAddVehicleModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowAddVehicleModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Add Vehicle to Stock Book</h2>
                  <p className="text-sm text-slate-500">Enter vehicle and purchase details</p>
                </div>
                <button
                  onClick={() => setShowAddVehicleModal(false)}
                  className="btn btn-sm btn-ghost btn-circle"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <form onSubmit={handleAddVehicle} className="space-y-6">
                  {/* VRM Lookup */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Registration (VRM) *</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={addVehicleForm.regCurrent}
                        onChange={(e) => setAddVehicleForm({ ...addVehicleForm, regCurrent: e.target.value.toUpperCase() })}
                        className="input input-bordered flex-1 font-mono font-bold uppercase"
                        placeholder="AB12 CDE"
                        required
                      />
                      <button
                        type="button"
                        onClick={handleAddVehicleVrmLookup}
                        disabled={isLookingUp}
                        className="btn bg-slate-700 hover:bg-slate-800 text-white border-none"
                      >
                        {isLookingUp ? (
                          <span className="loading loading-spinner loading-sm"></span>
                        ) : (
                          <>
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            Lookup
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Vehicle Details */}
                  <div className="border-t border-slate-200 pt-4">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">Vehicle Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text font-medium">Make *</span>
                        </label>
                        <input
                          type="text"
                          value={addVehicleForm.make}
                          onChange={(e) => setAddVehicleForm({ ...addVehicleForm, make: e.target.value })}
                          className="input input-bordered w-full"
                          placeholder="e.g. Ford"
                          required
                        />
                      </div>
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text font-medium">Model *</span>
                        </label>
                        <input
                          type="text"
                          value={addVehicleForm.model}
                          onChange={(e) => setAddVehicleForm({ ...addVehicleForm, model: e.target.value })}
                          className="input input-bordered w-full"
                          placeholder="e.g. Focus"
                          required
                        />
                      </div>
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text font-medium">Year</span>
                        </label>
                        <input
                          type="number"
                          value={addVehicleForm.year}
                          onChange={(e) => setAddVehicleForm({ ...addVehicleForm, year: e.target.value })}
                          className="input input-bordered w-full"
                          placeholder="e.g. 2020"
                          min="1900"
                          max={new Date().getFullYear() + 1}
                        />
                      </div>
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text font-medium">Colour</span>
                        </label>
                        <input
                          type="text"
                          value={addVehicleForm.colour}
                          onChange={(e) => setAddVehicleForm({ ...addVehicleForm, colour: e.target.value })}
                          className="input input-bordered w-full"
                          placeholder="e.g. Blue"
                        />
                      </div>
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text font-medium">Mileage</span>
                        </label>
                        <input
                          type="number"
                          value={addVehicleForm.mileageCurrent}
                          onChange={(e) => setAddVehicleForm({ ...addVehicleForm, mileageCurrent: e.target.value })}
                          className="input input-bordered w-full"
                          placeholder="e.g. 45000"
                        />
                      </div>
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text font-medium">VIN</span>
                        </label>
                        <input
                          type="text"
                          value={addVehicleForm.vin}
                          onChange={(e) => setAddVehicleForm({ ...addVehicleForm, vin: e.target.value.toUpperCase() })}
                          className="input input-bordered w-full font-mono"
                          placeholder="17-character VIN"
                          maxLength={17}
                        />
                      </div>
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text font-medium">Fuel Type</span>
                        </label>
                        <select
                          value={addVehicleForm.fuelType}
                          onChange={(e) => setAddVehicleForm({ ...addVehicleForm, fuelType: e.target.value })}
                          className="select select-bordered w-full"
                        >
                          <option value="">Select...</option>
                          <option value="Petrol">Petrol</option>
                          <option value="Diesel">Diesel</option>
                          <option value="Electric">Electric</option>
                          <option value="Hybrid">Hybrid</option>
                          <option value="Plug-in Hybrid">Plug-in Hybrid</option>
                        </select>
                      </div>
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text font-medium">Transmission</span>
                        </label>
                        <select
                          value={addVehicleForm.transmission}
                          onChange={(e) => setAddVehicleForm({ ...addVehicleForm, transmission: e.target.value })}
                          className="select select-bordered w-full"
                        >
                          <option value="">Select...</option>
                          <option value="Manual">Manual</option>
                          <option value="Automatic">Automatic</option>
                          <option value="Semi-Automatic">Semi-Automatic</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Purchase Information */}
                  <div className="border-t border-slate-200 pt-4">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">Purchase Information</h3>
                    <div className="space-y-4">
                      {/* VAT Scheme */}
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text font-medium">VAT Scheme</span>
                        </label>
                        <select
                          value={addVehicleForm.vatScheme}
                          onChange={(e) => setAddVehicleForm({ ...addVehicleForm, vatScheme: e.target.value })}
                          className="select select-bordered w-full"
                        >
                          <option value="MARGIN">Margin Scheme</option>
                          <option value="VAT_QUALIFYING">VAT Qualifying</option>
                          <option value="NO_VAT">No VAT</option>
                        </select>
                      </div>

                      {/* Purchase Price */}
                      {addVehicleForm.vatScheme === "VAT_QUALIFYING" ? (
                        <>
                          {/* VAT Qualifying: Enter Gross, auto-calculate Net and VAT */}
                          <div className="form-control">
                            <label className="label">
                              <span className="label-text font-medium">Purchase Price (Gross inc VAT)</span>
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={addVehicleForm.purchasePriceGross}
                              onChange={(e) => {
                                const gross = e.target.value;
                                const vatRate = dealer?.salesSettings?.vatRate || 0.2;
                                const { net, vat } = calculateVatFromGross(gross, vatRate);
                                setAddVehicleForm({
                                  ...addVehicleForm,
                                  purchasePriceGross: gross,
                                  purchasePriceNet: net,
                                  purchaseVat: vat,
                                });
                              }}
                              className="input input-bordered w-full"
                              placeholder="0.00"
                            />
                          </div>
                          {/* Show calculated Net and VAT as read-only */}
                          {addVehicleForm.purchasePriceGross && (
                            <div className="grid grid-cols-2 gap-4 mt-2">
                              <div className="form-control">
                                <label className="label py-1">
                                  <span className="label-text text-sm text-slate-500">Net (calculated)</span>
                                </label>
                                <input
                                  type="text"
                                  value={formatCurrency(addVehicleForm.purchasePriceNet)}
                                  className="input input-bordered w-full bg-slate-50 text-slate-600"
                                  disabled
                                />
                              </div>
                              <div className="form-control">
                                <label className="label py-1">
                                  <span className="label-text text-sm text-slate-500">VAT (calculated)</span>
                                </label>
                                <input
                                  type="text"
                                  value={formatCurrency(addVehicleForm.purchaseVat)}
                                  className="input input-bordered w-full bg-slate-50 text-slate-600"
                                  disabled
                                />
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        /* Margin/No VAT: Just enter SIV price */
                        <div className="form-control">
                          <label className="label">
                            <span className="label-text font-medium">Purchase Price (SIV)</span>
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={addVehicleForm.purchasePriceNet}
                            onChange={(e) => setAddVehicleForm({ ...addVehicleForm, purchasePriceNet: e.target.value })}
                            className="input input-bordered w-full"
                            placeholder="0.00"
                          />
                        </div>
                      )}

                      {/* Seller */}
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text font-medium">Purchased From (Seller)</span>
                        </label>
                        <select
                          value={addVehicleForm.purchasedFromContactId}
                          onChange={(e) => setAddVehicleForm({ ...addVehicleForm, purchasedFromContactId: e.target.value })}
                          className="select select-bordered w-full"
                        >
                          <option value="">Select a seller...</option>
                          {contacts.map((contact) => (
                            <option key={contact.id || contact._id} value={contact.id || contact._id}>
                              {contact.displayName || contact.companyName}
                            </option>
                          ))}
                        </select>
                        <label className="label">
                          <span className="label-text-alt text-slate-400">
                            Don&apos;t see the seller?{" "}
                            <button
                              type="button"
                              onClick={() => router.push("/contacts?addContact=1&type=SUPPLIER")}
                              className="text-[#0066CC] hover:underline"
                            >
                              Add a new contact
                            </button>
                          </span>
                        </label>
                      </div>

                      {/* Purchase Date & Invoice Ref */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="form-control">
                          <label className="label">
                            <span className="label-text font-medium">Purchase Date</span>
                          </label>
                          <input
                            type="date"
                            value={addVehicleForm.purchaseDate}
                            onChange={(e) => setAddVehicleForm({ ...addVehicleForm, purchaseDate: e.target.value })}
                            className="input input-bordered w-full"
                          />
                        </div>
                        <div className="form-control">
                          <label className="label">
                            <span className="label-text font-medium">Supplier Invoice Ref</span>
                          </label>
                          <input
                            type="text"
                            value={addVehicleForm.purchaseInvoiceRef}
                            onChange={(e) => setAddVehicleForm({ ...addVehicleForm, purchaseInvoiceRef: e.target.value })}
                            className="input input-bordered w-full"
                            placeholder="Supplier's invoice number"
                          />
                        </div>
                      </div>

                      {/* Notes */}
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text font-medium">Purchase Notes</span>
                        </label>
                        <textarea
                          value={addVehicleForm.purchaseNotes}
                          onChange={(e) => setAddVehicleForm({ ...addVehicleForm, purchaseNotes: e.target.value })}
                          className="textarea textarea-bordered w-full"
                          rows={2}
                          placeholder="Any notes about this purchase..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Document Uploads */}
                  <div className="border-t border-slate-200 pt-4">
                    <p className="text-sm font-medium text-slate-700 mb-3">Documents (Optional)</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="form-control">
                        <label className="label py-1">
                          <span className="label-text text-sm">V5 Document</span>
                        </label>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="file-input file-input-bordered file-input-sm w-full"
                          onChange={(e) => setAddVehicleForm({ ...addVehicleForm, v5File: e.target.files[0] || null })}
                        />
                      </div>
                      <div className="form-control">
                        <label className="label py-1">
                          <span className="label-text text-sm">Service History</span>
                        </label>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="file-input file-input-bordered file-input-sm w-full"
                          onChange={(e) => setAddVehicleForm({ ...addVehicleForm, serviceHistoryFile: e.target.files[0] || null })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Vehicle Prep Option */}
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={addVehicleForm.addToVehiclePrep}
                        onChange={(e) => setAddVehicleForm({ ...addVehicleForm, addToVehiclePrep: e.target.checked })}
                        className="checkbox checkbox-primary mt-0.5"
                      />
                      <div>
                        <span className="font-medium text-slate-900">Add to Vehicle Prep board</span>
                        <p className="text-sm text-slate-600 mt-0.5">Create prep tasks (PDI, Valet, Photos, etc.) and track this vehicle through preparation</p>
                      </div>
                    </label>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setShowAddVehicleModal(false)}
                      className="btn btn-ghost flex-1"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isAddingVehicle}
                      className="btn bg-[#0066CC] hover:bg-[#0052a3] text-white border-none flex-1"
                    >
                      {isAddingVehicle ? (
                        <span className="loading loading-spinner loading-sm"></span>
                      ) : (
                        addVehicleForm.addToVehiclePrep ? "Add & Go to Prep" : "Add Vehicle"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Document Modal */}
      {showAddDocumentModal && (
        <AddDocumentModal
          documentForm={documentForm}
          setDocumentForm={setDocumentForm}
          onClose={() => {
            setShowAddDocumentModal(false);
            setDocumentForm({ name: "", type: "other", file: null });
          }}
          onSubmit={() => {
            if (!documentForm.file) {
              return toast.error("File is required");
            }
            if (documentForm.type === "other" && !documentForm.name) {
              return toast.error("Document name is required for 'Other' type");
            }
            const docName = documentForm.type === "other"
              ? documentForm.name
              : documentForm.type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
            uploadDocument(documentForm.file, docName, documentForm.type);
          }}
        />
      )}
    </DashboardLayout>
  );
}

// Add Document Modal Component
function AddDocumentModal({ documentForm, setDocumentForm, onClose, onSubmit }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSubmit();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">Add Document/Image</h3>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="form-control">
              <label className="label"><span className="label-text">Document Type</span></label>
              <select
                className="select select-bordered"
                value={documentForm.type}
                onChange={(e) => setDocumentForm({ ...documentForm, type: e.target.value })}
              >
                <option value="v5">V5</option>
                <option value="service_history">Service History</option>
                <option value="fault_codes">Fault Codes</option>
                <option value="other">Other</option>
              </select>
            </div>

            {documentForm.type === "other" && (
              <div className="form-control">
                <label className="label"><span className="label-text">Document Name *</span></label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={documentForm.name}
                  onChange={(e) => setDocumentForm({ ...documentForm, name: e.target.value })}
                  placeholder="e.g., MOT Certificate, Insurance"
                  required
                />
              </div>
            )}

            <div className="form-control">
              <label className="label"><span className="label-text">File *</span></label>
              <input
                type="file"
                className="file-input file-input-bordered w-full"
                onChange={(e) => setDocumentForm({ ...documentForm, file: e.target.files[0] })}
                accept="image/*,.pdf,.doc,.docx"
                required
              />
            </div>
          </div>

          <div className="modal-action">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? <span className="loading loading-spinner"></span> : "Upload Document"}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
}
