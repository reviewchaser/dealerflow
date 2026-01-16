import { useEffect, useState, useCallback, useRef } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "react-hot-toast";
import useDealerRedirect from "@/hooks/useDealerRedirect";

// Format currency
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(amount);
};

// Format date
const formatDate = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

// Age bucket labels for inventory
const AGE_BUCKETS = [
  { key: "0-30", label: "0-30 days", min: 0, max: 30 },
  { key: "31-60", label: "31-60 days", min: 31, max: 60 },
  { key: "61-90", label: "61-90 days", min: 61, max: 90 },
  { key: "90+", label: "90+ days", min: 91, max: Infinity },
];

// Report tabs configuration
const REPORT_TABS = [
  { id: "sales", label: "Sales Summary", icon: "chart" },
  { id: "profitloss", label: "Profit & Loss", icon: "trending" },
  { id: "vat", label: "VAT Report", icon: "receipt" },
  { id: "inventory", label: "Inventory", icon: "truck" },
  { id: "stockbook", label: "Stock Book", icon: "book" },
  { id: "profitable", label: "Profitable Models", icon: "trending" },
  { id: "payments", label: "Payments", icon: "cash" },
  { id: "warranty", label: "Warranty Costs", icon: "shield" },
];

// Profit & Loss filter options
const PL_FILTERS = [
  { id: "all", label: "All" },
  { id: "vehicles", label: "Vehicles" },
  { id: "addons", label: "Add-Ons" },
  { id: "delivery", label: "Delivery" },
];

export default function ReportsPage() {
  const router = useRouter();
  const { isRedirecting } = useDealerRedirect();
  const [activeTab, setActiveTab] = useState("sales");
  const [deals, setDeals] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [aftercareCases, setAftercareCases] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const printRef = useRef(null);

  // Date range state
  const [periodType, setPeriodType] = useState("this_month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // Profit & Loss filter state
  const [plFilter, setPlFilter] = useState("all");

  // Calculate period dates
  const getPeriodDates = useCallback(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (periodType) {
      case "this_month":
        return {
          from: new Date(now.getFullYear(), now.getMonth(), 1),
          to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
        };
      case "last_month":
        return {
          from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
          to: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59),
        };
      case "quarter":
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        return {
          from: new Date(now.getFullYear(), quarterStart, 1),
          to: new Date(now.getFullYear(), quarterStart + 3, 0, 23, 59, 59),
        };
      case "last_quarter":
        const lastQuarterStart = Math.floor(now.getMonth() / 3) * 3 - 3;
        return {
          from: new Date(now.getFullYear(), lastQuarterStart, 1),
          to: new Date(now.getFullYear(), lastQuarterStart + 3, 0, 23, 59, 59),
        };
      case "ytd":
        return {
          from: new Date(now.getFullYear(), 0, 1),
          to: today,
        };
      case "custom":
        return {
          from: customFrom ? new Date(customFrom) : null,
          to: customTo ? new Date(customTo + "T23:59:59") : null,
        };
      default:
        return { from: null, to: null };
    }
  }, [periodType, customFrom, customTo]);

  // Fetch all data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [dealsRes, vehiclesRes, aftercareRes] = await Promise.all([
        fetch("/api/deals"),
        fetch("/api/vehicles"),
        fetch("/api/aftercare"),
      ]);

      if (dealsRes.ok) {
        const data = await dealsRes.json();
        setDeals(data);
      }
      if (vehiclesRes.ok) {
        const data = await vehiclesRes.json();
        setVehicles(data.vehicles || data || []);
      }
      if (aftercareRes.ok) {
        const data = await aftercareRes.json();
        setAftercareCases(data.cases || data || []);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load report data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isRedirecting) {
      fetchData();
    }
  }, [isRedirecting, fetchData]);

  const { from, to } = getPeriodDates();

  // ==================== SALES SUMMARY ====================
  const calculateSales = useCallback(() => {
    if (!from || !to) return { deals: [], totalGross: 0, totalNet: 0, totalVat: 0, dealCount: 0 };

    const completedDeals = deals.filter((deal) => {
      if (!["INVOICED", "DELIVERED", "COMPLETED"].includes(deal.status)) return false;
      if (!deal.invoicedAt) return false;
      const invoiceDate = new Date(deal.invoicedAt);
      return invoiceDate >= from && invoiceDate <= to;
    });

    const totalGross = completedDeals.reduce((sum, d) => sum + (d.vehiclePriceGross || 0), 0);
    const totalNet = completedDeals.reduce((sum, d) => sum + (d.vehiclePriceNet || 0), 0);
    const totalVat = completedDeals.reduce((sum, d) => sum + (d.vehicleVatAmount || 0), 0);

    return { deals: completedDeals, totalGross, totalNet, totalVat, dealCount: completedDeals.length };
  }, [deals, from, to]);

  // ==================== PROFIT & LOSS ====================
  const calculateProfitLoss = useCallback(() => {
    if (!from || !to) return {
      vehicles: { tradeSales: 0, retailSales: 0, totalSales: 0, tradeProfit: 0, retailProfit: 0, totalProfit: 0, tradeCount: 0, retailCount: 0, avgMargin: 0 },
      addons: { revenue: 0, cost: 0, profit: 0, count: 0 },
      delivery: { total: 0, free: 0, paid: 0, revenue: 0 },
      combined: { totalSales: 0, totalProfit: 0 },
    };

    // Filter invoiced deals in the period
    const invoicedDeals = deals.filter((deal) => {
      if (!["INVOICED", "DELIVERED", "COMPLETED"].includes(deal.status)) return false;
      if (!deal.invoicedAt) return false;
      const invoiceDate = new Date(deal.invoicedAt);
      return invoiceDate >= from && invoiceDate <= to;
    });

    // === VEHICLE PROFIT ===
    let tradeSales = 0, retailSales = 0, tradeProfit = 0, retailProfit = 0;
    let tradeCount = 0, retailCount = 0;

    invoicedDeals.forEach(deal => {
      const salePrice = deal.vehiclePriceGross || 0;
      const costPrice = deal.vehicle?.purchase?.purchasePriceNet || 0;
      const profit = salePrice - costPrice;

      if (deal.saleType === "TRADE") {
        tradeSales += salePrice;
        tradeProfit += profit;
        tradeCount++;
      } else {
        // RETAIL and EXPORT count as retail
        retailSales += salePrice;
        retailProfit += profit;
        retailCount++;
      }
    });

    const totalSales = tradeSales + retailSales;
    const totalVehicleProfit = tradeProfit + retailProfit;
    const avgMargin = totalSales > 0 ? (totalVehicleProfit / totalSales * 100) : 0;

    // === ADD-ONS PROFIT ===
    let addonsRevenue = 0, addonsCost = 0, addonsCount = 0;

    invoicedDeals.forEach(deal => {
      if (!deal.addOns || deal.addOns.length === 0) return;
      deal.addOns.forEach(addon => {
        const qty = addon.qty || 1;
        const revenue = (addon.unitPriceNet || 0) * qty;
        const cost = (addon.costPrice || 0) * qty;
        addonsRevenue += revenue;
        addonsCost += cost;
        addonsCount += qty;
      });
    });

    const addonsProfit = addonsRevenue - addonsCost;

    // === DELIVERY PROFIT ===
    let deliveryTotal = 0, deliveryFree = 0, deliveryPaid = 0, deliveryRevenue = 0;

    invoicedDeals.forEach(deal => {
      if (!deal.delivery) return;
      const hasDelivery = deal.delivery.isFree || deal.delivery.amountGross > 0 || deal.delivery.amountNet > 0 || deal.delivery.amount > 0;
      if (!hasDelivery) return;

      deliveryTotal++;
      if (deal.delivery.isFree) {
        deliveryFree++;
      } else {
        deliveryPaid++;
        deliveryRevenue += deal.delivery.amountNet || deal.delivery.amount || 0;
      }
    });

    // === COMBINED ===
    const combinedSales = totalSales + addonsRevenue + deliveryRevenue;
    const combinedProfit = totalVehicleProfit + addonsProfit + deliveryRevenue; // Delivery has no cost

    return {
      vehicles: {
        tradeSales, retailSales, totalSales,
        tradeProfit, retailProfit, totalProfit: totalVehicleProfit,
        tradeCount, retailCount, avgMargin,
      },
      addons: {
        revenue: addonsRevenue, cost: addonsCost, profit: addonsProfit, count: addonsCount,
      },
      delivery: {
        total: deliveryTotal, free: deliveryFree, paid: deliveryPaid, revenue: deliveryRevenue,
      },
      combined: {
        totalSales: combinedSales, totalProfit: combinedProfit,
      },
    };
  }, [deals, from, to]);

  // ==================== VAT REPORT ====================
  const calculateVAT = useCallback(() => {
    if (!from || !to) return { vatQualifyingDeals: [], marginDeals: [], totalOutputVAT: 0, totalSalesGross: 0, totalSalesNet: 0, totalMarginGross: 0 };

    const invoicedDeals = deals.filter((deal) => {
      if (!["INVOICED", "DELIVERED", "COMPLETED"].includes(deal.status)) return false;
      if (!deal.invoicedAt) return false;
      const invoiceDate = new Date(deal.invoicedAt);
      return invoiceDate >= from && invoiceDate <= to;
    });

    const vatQualifyingDeals = invoicedDeals.filter(d => d.vatScheme === "VAT_QUALIFYING");
    const marginDeals = invoicedDeals.filter(d => d.vatScheme === "MARGIN");

    let totalOutputVAT = 0;
    let totalSalesGross = 0;
    let totalSalesNet = 0;

    vatQualifyingDeals.forEach((deal) => {
      totalOutputVAT += deal.vehicleVatAmount || 0;
      totalSalesGross += deal.vehiclePriceGross || 0;
      totalSalesNet += deal.vehiclePriceNet || 0;
    });

    marginDeals.forEach((deal) => {
      totalSalesGross += deal.vehiclePriceGross || 0;
    });

    return {
      vatQualifyingDeals,
      marginDeals,
      totalOutputVAT,
      totalSalesGross,
      totalSalesNet,
      totalMarginGross: marginDeals.reduce((sum, d) => sum + (d.vehiclePriceGross || 0), 0),
    };
  }, [deals, from, to]);

  // ==================== INVENTORY ====================
  const calculateInventory = useCallback(() => {
    const now = new Date();
    let totalValue = 0;
    let totalCost = 0;
    let count = 0;
    const byMake = {};
    const byAge = {
      "0-30": { count: 0, value: 0 },
      "31-60": { count: 0, value: 0 },
      "61-90": { count: 0, value: 0 },
      "90+": { count: 0, value: 0 },
    };

    vehicles.forEach((vehicle) => {
      if (vehicle.salesStatus === "SOLD" || vehicle.salesStatus === "DELIVERED" || vehicle.salesStatus === "COMPLETED") return;

      count++;
      const askingPrice = vehicle.askingPrice || vehicle.retailPrice || 0;
      const costPrice = vehicle.purchase?.purchasePriceNet || 0;

      totalValue += askingPrice;
      totalCost += costPrice;

      const make = vehicle.make || "Unknown";
      if (!byMake[make]) byMake[make] = { count: 0, value: 0, cost: 0 };
      byMake[make].count++;
      byMake[make].value += askingPrice;
      byMake[make].cost += costPrice;

      const purchaseDate = vehicle.purchase?.purchaseDate
        ? new Date(vehicle.purchase.purchaseDate)
        : vehicle.createdAt ? new Date(vehicle.createdAt) : now;
      const ageInDays = Math.floor((now - purchaseDate) / (1000 * 60 * 60 * 24));

      for (const bucket of AGE_BUCKETS) {
        if (ageInDays >= bucket.min && ageInDays <= bucket.max) {
          byAge[bucket.key].count++;
          byAge[bucket.key].value += askingPrice;
          break;
        }
      }
    });

    const makeBreakdown = Object.entries(byMake)
      .map(([make, data]) => ({ make, ...data }))
      .sort((a, b) => b.count - a.count);

    return { totalVehicles: count, totalValue, totalCost, potentialProfit: totalValue - totalCost, avgValue: count > 0 ? totalValue / count : 0, byAge, makeBreakdown };
  }, [vehicles]);

  // ==================== STOCK BOOK ====================
  const calculateStockBook = useCallback(() => {
    if (!from || !to) return { entries: [], totalPurchases: 0, totalSales: 0, totalProfit: 0 };

    // Find vehicles sold in the period
    const soldVehicles = vehicles.filter(v => {
      if (!v.soldAt) return false;
      const soldDate = new Date(v.soldAt);
      return soldDate >= from && soldDate <= to;
    });

    // Match with deals for sale prices
    const entries = soldVehicles.map(vehicle => {
      const deal = deals.find(d => d.vehicleId === vehicle.id || d.vehicleId?._id === vehicle.id);
      const purchasePrice = vehicle.purchase?.purchasePriceNet || 0;
      const salePrice = deal?.vehiclePriceGross || 0;
      const profit = salePrice - purchasePrice;

      return {
        vrm: vehicle.regCurrent,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        purchaseDate: vehicle.purchase?.purchaseDate,
        purchasePrice,
        soldAt: vehicle.soldAt,
        salePrice,
        profit,
        margin: salePrice > 0 ? ((profit / salePrice) * 100).toFixed(1) : 0,
      };
    });

    const totalPurchases = entries.reduce((sum, e) => sum + e.purchasePrice, 0);
    const totalSales = entries.reduce((sum, e) => sum + e.salePrice, 0);
    const totalProfit = entries.reduce((sum, e) => sum + e.profit, 0);

    return { entries, totalPurchases, totalSales, totalProfit };
  }, [vehicles, deals, from, to]);

  // ==================== MOST PROFITABLE MODELS ====================
  const calculateProfitableModels = useCallback(() => {
    // Group completed deals by make/model
    const modelProfits = {};

    deals.forEach(deal => {
      if (!["INVOICED", "DELIVERED", "COMPLETED"].includes(deal.status)) return;

      const key = `${deal.vehicle?.make || "Unknown"} ${deal.vehicle?.model || ""}`.trim();
      if (!modelProfits[key]) {
        modelProfits[key] = { make: deal.vehicle?.make, model: deal.vehicle?.model, count: 0, totalRevenue: 0, totalCost: 0, totalProfit: 0 };
      }

      const purchasePrice = deal.vehicle?.purchase?.purchasePriceNet || 0;
      const salePrice = deal.vehiclePriceGross || 0;
      const profit = salePrice - purchasePrice;

      modelProfits[key].count++;
      modelProfits[key].totalRevenue += salePrice;
      modelProfits[key].totalCost += purchasePrice;
      modelProfits[key].totalProfit += profit;
    });

    return Object.values(modelProfits)
      .map(m => ({
        ...m,
        avgProfit: m.count > 0 ? m.totalProfit / m.count : 0,
        margin: m.totalRevenue > 0 ? ((m.totalProfit / m.totalRevenue) * 100).toFixed(1) : 0,
      }))
      .sort((a, b) => b.totalProfit - a.totalProfit)
      .slice(0, 20);
  }, [deals]);

  // ==================== WARRANTY COSTS ====================
  const calculateWarrantyCosts = useCallback(() => {
    if (!from || !to) return { cases: [], totalCost: 0, caseCount: 0, avgPerCase: 0 };

    const periodCases = aftercareCases.filter(c => {
      const caseDate = new Date(c.createdAt);
      return caseDate >= from && caseDate <= to;
    });

    const totalCost = periodCases.reduce((sum, c) => {
      const partsNet = c.costs?.partsNet || 0;
      const labourNet = c.costs?.labourNet || 0;
      return sum + partsNet + labourNet;
    }, 0);

    return {
      cases: periodCases,
      totalCost,
      caseCount: periodCases.length,
      avgPerCase: periodCases.length > 0 ? totalCost / periodCases.length : 0,
    };
  }, [aftercareCases, from, to]);

  // ==================== HMRC VAT DETAIL ====================
  const calculateVATDetail = useCallback(() => {
    if (!from || !to) return {
      box1: 0, box2: 0, box3: 0, box4: 0, box5: 0, box6: 0, box7: 0, box8: 0, box9: 0,
      outputTransactions: [], inputTransactions: [],
      purchasesNetTotal: 0, purchasesVatTotal: 0, salesNetTotal: 0, salesVatTotal: 0
    };

    // Filter deals for the period
    const invoicedDeals = deals.filter((deal) => {
      if (!["INVOICED", "DELIVERED", "COMPLETED"].includes(deal.status)) return false;
      if (!deal.invoicedAt) return false;
      const invoiceDate = new Date(deal.invoicedAt);
      return invoiceDate >= from && invoiceDate <= to;
    });

    // Filter vehicles purchased in the period
    const purchasedVehicles = vehicles.filter(v => {
      if (!v.purchase?.purchaseDate) return false;
      const purchaseDate = new Date(v.purchase.purchaseDate);
      return purchaseDate >= from && purchaseDate <= to;
    });

    // OUTPUT VAT (Sales)
    let box1 = 0; // VAT due on sales
    const outputTransactions = [];

    invoicedDeals.forEach(deal => {
      const isVatQualifying = deal.vatScheme === "VAT_QUALIFYING";
      const vatAmount = isVatQualifying ? (deal.vehicleVatAmount || 0) : 0;
      if (isVatQualifying) box1 += vatAmount;

      outputTransactions.push({
        date: deal.invoicedAt,
        type: "SALE",
        stockNo: deal.vehicle?.stockNumber || "—",
        vrm: deal.vehicle?.regCurrent || "N/A",
        description: `${deal.vehicle?.make || ""} ${deal.vehicle?.model || ""}`.trim(),
        customer: deal.customer?.displayName || "Unknown",
        vatRate: isVatQualifying ? 20 : 0,
        net: isVatQualifying ? (deal.vehiclePriceNet || 0) : (deal.vehiclePriceGross || 0),
        vat: vatAmount,
        gross: deal.vehiclePriceGross || 0,
        scheme: isVatQualifying ? "VAT_QUALIFYING" : "MARGIN",
      });
    });

    // INPUT VAT (Purchases)
    let box4 = 0; // VAT reclaimed on purchases
    const inputTransactions = [];

    purchasedVehicles.forEach(vehicle => {
      const isVatQualifying = vehicle.vatScheme === "VAT_QUALIFYING";
      const purchaseVat = vehicle.purchase?.purchaseVat || 0;
      const purchaseNet = vehicle.purchase?.purchasePriceNet || 0;
      const purchaseGross = vehicle.purchase?.purchasePriceGross || purchaseNet + purchaseVat;

      // Only reclaim VAT on VAT qualifying purchases
      if (isVatQualifying && purchaseVat > 0) {
        box4 += purchaseVat;
      }

      inputTransactions.push({
        date: vehicle.purchase?.purchaseDate,
        type: "PURCHASE",
        stockNo: vehicle.stockNumber || "—",
        vrm: vehicle.regCurrent || "N/A",
        description: `${vehicle.make || ""} ${vehicle.model || ""}`.trim(),
        supplier: vehicle.purchase?.supplierName || "Unknown",
        vatRate: isVatQualifying ? 20 : 0,
        net: purchaseNet,
        vat: isVatQualifying ? purchaseVat : 0,
        gross: purchaseGross,
        scheme: isVatQualifying ? "VAT_QUALIFYING" : "MARGIN",
      });
    });

    const box2 = 0; // VAT due on EU acquisitions (rarely used post-Brexit)
    const box3 = box1 + box2; // Total VAT due
    const box5 = box3 - box4; // Net VAT to pay/reclaim

    // Box 6: Total value of sales excluding VAT
    const box6 = outputTransactions.reduce((sum, t) => sum + t.net, 0);

    // Box 7: Total value of purchases excluding VAT
    const box7 = inputTransactions.reduce((sum, t) => sum + t.net, 0);

    // Box 8 & 9: EU trade (typically 0 for UK motor traders now)
    const box8 = 0;
    const box9 = 0;

    // Totals for summary table
    const purchasesNetTotal = inputTransactions.reduce((sum, t) => sum + t.net, 0);
    const purchasesVatTotal = inputTransactions.reduce((sum, t) => sum + t.vat, 0);
    const salesNetTotal = outputTransactions.reduce((sum, t) => sum + t.net, 0);
    const salesVatTotal = outputTransactions.reduce((sum, t) => sum + t.vat, 0);

    return {
      box1, box2, box3, box4, box5, box6, box7, box8, box9,
      outputTransactions: outputTransactions.sort((a, b) => new Date(a.date) - new Date(b.date)),
      inputTransactions: inputTransactions.sort((a, b) => new Date(a.date) - new Date(b.date)),
      purchasesNetTotal, purchasesVatTotal, salesNetTotal, salesVatTotal,
    };
  }, [deals, vehicles, from, to]);

  // ==================== PAYMENTS REPORT ====================
  const calculatePayments = useCallback(() => {
    if (!from || !to) return { byMethod: {}, byType: {}, transactions: [], totalReceived: 0 };

    // Get all payments from deals
    const allPayments = [];

    deals.forEach(deal => {
      if (!deal.payments || deal.payments.length === 0) return;

      deal.payments.forEach(payment => {
        if (payment.isRefunded) return;
        const paymentDate = new Date(payment.paidAt);
        if (paymentDate < from || paymentDate > to) return;

        allPayments.push({
          date: payment.paidAt,
          dealNumber: deal.dealNumber,
          vrm: deal.vehicle?.regCurrent || "N/A",
          customer: deal.customer?.displayName || "Unknown",
          type: payment.type, // DEPOSIT, BALANCE, etc.
          method: payment.method, // CARD, BANK_TRANSFER, CASH, FINANCE
          amount: payment.amount,
          reference: payment.reference,
        });
      });
    });

    // Group by method
    const byMethod = {};
    allPayments.forEach(p => {
      const method = p.method || "OTHER";
      if (!byMethod[method]) byMethod[method] = { count: 0, total: 0 };
      byMethod[method].count++;
      byMethod[method].total += p.amount;
    });

    // Group by type
    const byType = {};
    allPayments.forEach(p => {
      const type = p.type || "PAYMENT";
      if (!byType[type]) byType[type] = { count: 0, total: 0 };
      byType[type].count++;
      byType[type].total += p.amount;
    });

    const totalReceived = allPayments.reduce((sum, p) => sum + p.amount, 0);

    return {
      byMethod,
      byType,
      transactions: allPayments.sort((a, b) => new Date(b.date) - new Date(a.date)),
      totalReceived,
    };
  }, [deals, from, to]);

  // ==================== ADD-ONS REPORT ====================
  const calculateAddOns = useCallback(() => {
    if (!from || !to) return { items: [], byProduct: {}, totalRevenue: 0, totalCost: 0, totalProfit: 0, totalQty: 0 };

    // Filter invoiced deals in the period
    const invoicedDeals = deals.filter((deal) => {
      if (!["INVOICED", "DELIVERED", "COMPLETED"].includes(deal.status)) return false;
      if (!deal.invoicedAt) return false;
      const invoiceDate = new Date(deal.invoicedAt);
      return invoiceDate >= from && invoiceDate <= to;
    });

    const byProduct = {};
    let totalRevenue = 0;
    let totalCost = 0;
    let totalQty = 0;

    invoicedDeals.forEach(deal => {
      if (!deal.addOns || deal.addOns.length === 0) return;

      deal.addOns.forEach(addon => {
        const key = addon.name || "Unknown";
        const qty = addon.qty || 1;
        const revenue = (addon.unitPriceNet || 0) * qty;
        const cost = (addon.costPrice || 0) * qty;

        if (!byProduct[key]) {
          byProduct[key] = {
            name: addon.name,
            category: addon.category || "OTHER",
            qty: 0,
            revenue: 0,
            cost: 0,
            profit: 0,
          };
        }

        byProduct[key].qty += qty;
        byProduct[key].revenue += revenue;
        byProduct[key].cost += cost;
        byProduct[key].profit += (revenue - cost);

        totalRevenue += revenue;
        totalCost += cost;
        totalQty += qty;
      });
    });

    const items = Object.values(byProduct).sort((a, b) => b.profit - a.profit);
    const avgMargin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue * 100) : 0;

    return {
      items,
      byProduct,
      totalRevenue,
      totalCost,
      totalProfit: totalRevenue - totalCost,
      totalQty,
      avgMargin,
    };
  }, [deals, from, to]);

  // ==================== DELIVERY REPORT ====================
  const calculateDelivery = useCallback(() => {
    if (!from || !to) return { deliveries: [], totalDeliveries: 0, freeDeliveries: 0, paidDeliveries: 0, totalRevenueNet: 0, totalVat: 0, totalRevenueGross: 0, avgCharge: 0 };

    // Filter deals with delivery in the period
    const dealsWithDelivery = deals.filter((deal) => {
      if (!["INVOICED", "DELIVERED", "COMPLETED"].includes(deal.status)) return false;
      // Use invoicedAt or deliveredAt for the date
      const deliveryDate = deal.deliveredAt ? new Date(deal.deliveredAt) : (deal.invoicedAt ? new Date(deal.invoicedAt) : null);
      if (!deliveryDate) return false;
      return deliveryDate >= from && deliveryDate <= to && deal.delivery;
    });

    let totalDeliveries = 0;
    let freeDeliveries = 0;
    let paidDeliveries = 0;
    let totalRevenueNet = 0;
    let totalVat = 0;
    let totalRevenueGross = 0;
    const deliveries = [];

    dealsWithDelivery.forEach(deal => {
      const delivery = deal.delivery;
      if (!delivery) return;

      // Only count if there's a delivery amount or it's marked as free
      const hasDelivery = delivery.isFree || delivery.amountGross > 0 || delivery.amountNet > 0 || delivery.amount > 0;
      if (!hasDelivery) return;

      totalDeliveries++;

      if (delivery.isFree) {
        freeDeliveries++;
      } else {
        paidDeliveries++;
        const net = delivery.amountNet || delivery.amount || 0;
        const vat = delivery.vatAmount || 0;
        const gross = delivery.amountGross || (net + vat);

        totalRevenueNet += net;
        totalVat += vat;
        totalRevenueGross += gross;
      }

      deliveries.push({
        date: deal.deliveredAt || deal.invoicedAt,
        dealNumber: deal.dealNumber,
        vrm: deal.vehicle?.regCurrent || "N/A",
        customer: deal.customer?.displayName || "Unknown",
        isFree: delivery.isFree || false,
        chargeNet: delivery.isFree ? 0 : (delivery.amountNet || delivery.amount || 0),
        chargeGross: delivery.isFree ? 0 : (delivery.amountGross || delivery.amount || 0),
        status: deal.status,
      });
    });

    const avgCharge = paidDeliveries > 0 ? totalRevenueNet / paidDeliveries : 0;

    return {
      deliveries: deliveries.sort((a, b) => new Date(b.date) - new Date(a.date)),
      totalDeliveries,
      freeDeliveries,
      paidDeliveries,
      totalRevenueNet,
      totalVat,
      totalRevenueGross,
      avgCharge,
    };
  }, [deals, from, to]);

  // Calculate all reports
  const salesData = calculateSales();
  const profitLossData = calculateProfitLoss();
  const vatData = calculateVAT();
  const vatDetailData = calculateVATDetail();
  const inventoryData = calculateInventory();
  const stockBookData = calculateStockBook();
  const profitableModels = calculateProfitableModels();
  const paymentsData = calculatePayments();
  const warrantyCosts = calculateWarrantyCosts();

  // Export handlers
  const handleExportCSV = () => {
    let headers = [];
    let rows = [];
    let filename = "";

    switch (activeTab) {
      case "sales":
        headers = ["Invoice Date", "Deal #", "VRM", "Make", "Model", "Customer", "Net", "VAT", "Gross"];
        rows = salesData.deals.map(d => [
          formatDate(d.invoicedAt), d.dealNumber || "", d.vehicle?.regCurrent || "", d.vehicle?.make || "",
          d.vehicle?.model || "", d.customer?.displayName || "", (d.vehiclePriceNet || 0).toFixed(2),
          (d.vehicleVatAmount || 0).toFixed(2), (d.vehiclePriceGross || 0).toFixed(2)
        ]);
        filename = "sales-summary";
        break;
      case "vat":
        headers = ["Invoice Date", "Deal #", "VRM", "Customer", "VAT Scheme", "Net", "VAT", "Gross"];
        rows = [...vatData.vatQualifyingDeals, ...vatData.marginDeals].map(d => [
          formatDate(d.invoicedAt), d.dealNumber || "", d.vehicle?.regCurrent || "", d.customer?.displayName || "",
          d.vatScheme || "", (d.vehiclePriceNet || 0).toFixed(2), (d.vehicleVatAmount || 0).toFixed(2),
          (d.vehiclePriceGross || 0).toFixed(2)
        ]);
        filename = "vat-report";
        break;
      case "stockbook":
        headers = ["VRM", "Make", "Model", "Year", "Purchase Date", "Purchase Price", "Sale Date", "Sale Price", "Profit", "Margin %"];
        rows = stockBookData.entries.map(e => [
          e.vrm || "", e.make || "", e.model || "", e.year || "", formatDate(e.purchaseDate),
          e.purchasePrice.toFixed(2), formatDate(e.soldAt), e.salePrice.toFixed(2), e.profit.toFixed(2), e.margin
        ]);
        filename = "stock-book";
        break;
      case "warranty":
        headers = ["Date", "VRM", "Customer", "Category", "Summary", "Status", "Cost"];
        rows = warrantyCosts.cases.map(c => [
          formatDate(c.createdAt), c.vehicleReg || "", c.customerName || "", c.category || "",
          c.summary || "", c.status || "", ((c.costs?.partsNet || 0) + (c.costs?.labourNet || 0)).toFixed(2)
        ]);
        filename = "warranty-costs";
        break;
      case "vatdetail":
        // Export HMRC VAT boxes summary + all transactions
        headers = ["VAT Return Summary"];
        rows = [
          ["Box 1 - VAT due on sales", vatDetailData.box1.toFixed(2)],
          ["Box 2 - VAT due on acquisitions from EU", vatDetailData.box2.toFixed(2)],
          ["Box 3 - Total VAT due", vatDetailData.box3.toFixed(2)],
          ["Box 4 - VAT reclaimed on purchases", vatDetailData.box4.toFixed(2)],
          ["Box 5 - Net VAT to pay/reclaim", vatDetailData.box5.toFixed(2)],
          ["Box 6 - Total sales ex VAT", vatDetailData.box6.toFixed(2)],
          ["Box 7 - Total purchases ex VAT", vatDetailData.box7.toFixed(2)],
          ["Box 8 - Total supplies to EU ex VAT", vatDetailData.box8.toFixed(2)],
          ["Box 9 - Total acquisitions from EU ex VAT", vatDetailData.box9.toFixed(2)],
          [],
          ["OUTPUT VAT TRANSACTIONS (Sales)"],
          ["Date", "Description", "Customer", "Scheme", "Net", "VAT", "Gross"],
          ...vatDetailData.outputTransactions.map(t => [
            formatDate(t.date), t.description, t.customer, t.scheme,
            t.net.toFixed(2), t.vat.toFixed(2), t.gross.toFixed(2)
          ]),
          [],
          ["INPUT VAT TRANSACTIONS (Purchases)"],
          ["Date", "Description", "Supplier", "Scheme", "Net", "VAT", "Gross"],
          ...vatDetailData.inputTransactions.map(t => [
            formatDate(t.date), t.description, t.supplier, t.scheme,
            t.net.toFixed(2), t.vat.toFixed(2), t.gross.toFixed(2)
          ]),
        ];
        filename = "vat-detail-hmrc";
        break;
      case "payments":
        headers = ["Date", "Deal #", "VRM", "Customer", "Type", "Method", "Amount", "Reference"];
        rows = paymentsData.transactions.map(p => [
          formatDate(p.date), p.dealNumber || "", p.vrm, p.customer,
          p.type || "", p.method || "", p.amount.toFixed(2), p.reference || ""
        ]);
        filename = "payments";
        break;
      case "inventory":
        headers = ["VRM", "Make", "Model", "Year", "Days in Stock", "Cost Price", "Asking Price", "Potential Profit"];
        rows = vehicles
          .filter(v => !["SOLD", "DELIVERED", "COMPLETED"].includes(v.salesStatus))
          .map(v => {
            const purchaseDate = v.purchase?.purchaseDate ? new Date(v.purchase.purchaseDate) : v.createdAt ? new Date(v.createdAt) : new Date();
            const daysInStock = Math.floor((new Date() - purchaseDate) / (1000 * 60 * 60 * 24));
            const costPrice = v.purchase?.purchasePriceNet || 0;
            const askingPrice = v.askingPrice || v.retailPrice || 0;
            return [
              v.regCurrent || "", v.make || "", v.model || "", v.year || "",
              daysInStock, costPrice.toFixed(2), askingPrice.toFixed(2), (askingPrice - costPrice).toFixed(2)
            ];
          });
        filename = "inventory";
        break;
      case "profitable":
        headers = ["Make/Model", "Units Sold", "Total Revenue", "Total Cost", "Total Profit", "Avg Profit", "Margin %"];
        rows = profitableModels.map(m => [
          `${m.make} ${m.model}`, m.count, m.totalRevenue.toFixed(2), m.totalCost.toFixed(2),
          m.totalProfit.toFixed(2), m.avgProfit.toFixed(2), m.margin
        ]);
        filename = "profitable-models";
        break;
      case "profitloss":
        if (plFilter === "vehicles" || plFilter === "all") {
          headers = ["Category", "Sales (Inc VAT)", "Net Profit", "Units", "Avg Margin %"];
          rows = [
            ["Trade Sales", profitLossData.vehicles.tradeSales.toFixed(2), profitLossData.vehicles.tradeProfit.toFixed(2), profitLossData.vehicles.tradeCount, "—"],
            ["Retail Sales", profitLossData.vehicles.retailSales.toFixed(2), profitLossData.vehicles.retailProfit.toFixed(2), profitLossData.vehicles.retailCount, profitLossData.vehicles.avgMargin.toFixed(1)],
            ["Vehicle Total", profitLossData.vehicles.totalSales.toFixed(2), profitLossData.vehicles.totalProfit.toFixed(2), profitLossData.vehicles.tradeCount + profitLossData.vehicles.retailCount, profitLossData.vehicles.avgMargin.toFixed(1)],
          ];
          if (plFilter === "all") {
            rows.push(["Add-Ons", profitLossData.addons.revenue.toFixed(2), profitLossData.addons.profit.toFixed(2), profitLossData.addons.count, profitLossData.addons.revenue > 0 ? ((profitLossData.addons.profit / profitLossData.addons.revenue) * 100).toFixed(1) : "0"]);
            rows.push(["Delivery", profitLossData.delivery.revenue.toFixed(2), profitLossData.delivery.revenue.toFixed(2), profitLossData.delivery.paid, "100.0"]);
            rows.push(["TOTAL", profitLossData.combined.totalSales.toFixed(2), profitLossData.combined.totalProfit.toFixed(2), "", ""]);
          }
        } else if (plFilter === "addons") {
          headers = ["Metric", "Value"];
          rows = [
            ["Total Revenue (Net)", profitLossData.addons.revenue.toFixed(2)],
            ["Total Cost", profitLossData.addons.cost.toFixed(2)],
            ["Total Profit", profitLossData.addons.profit.toFixed(2)],
            ["Items Sold", profitLossData.addons.count],
          ];
        } else if (plFilter === "delivery") {
          headers = ["Metric", "Value"];
          rows = [
            ["Total Deliveries", profitLossData.delivery.total],
            ["Free Deliveries", profitLossData.delivery.free],
            ["Paid Deliveries", profitLossData.delivery.paid],
            ["Revenue (Net)", profitLossData.delivery.revenue.toFixed(2)],
          ];
        }
        filename = "profit-loss";
        break;
      default:
        toast.error("Export not available for this report");
        return;
    }

    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report downloaded");
  };

  // Print/PDF handler
  const handlePrint = () => {
    window.print();
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
        <title>Reports | DealerHQ</title>
      </Head>

      <div className="min-h-screen bg-slate-50 pb-20 print:bg-white print:pb-0">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm print:hidden">
          <div className="px-4 py-4 md:px-6 md:py-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-slate-900">Reports</h1>
                <p className="text-sm text-slate-500 mt-0.5">
                  {from && to ? `${formatDate(from)} - ${formatDate(to)}` : "Select a period"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Print/PDF Dropdown */}
                <div className="dropdown dropdown-end">
                  <label tabIndex={0} className="btn btn-ghost gap-1.5">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    <span className="hidden sm:inline">Print / PDF</span>
                    <svg className="w-3.5 h-3.5 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </label>
                  <ul tabIndex={0} className="dropdown-content z-30 menu p-2 shadow-lg bg-white rounded-xl w-48 mt-2 border border-slate-100">
                    <li>
                      <button onClick={handlePrint} className="flex items-center gap-2 py-2.5">
                        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Print Report
                      </button>
                    </li>
                    <li>
                      <button onClick={handlePrint} className="flex items-center gap-2 py-2.5">
                        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Save as PDF
                        <span className="text-[10px] text-slate-400">(Select PDF printer)</span>
                      </button>
                    </li>
                  </ul>
                </div>
                <button onClick={handleExportCSV} className="btn bg-[#0066CC] hover:bg-[#0052a3] text-white border-none">
                  <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span className="hidden sm:inline">Export CSV</span>
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-4 md:px-6 border-b border-slate-200 overflow-x-auto">
            <div className="flex gap-1">
              {REPORT_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? "border-[#0066CC] text-[#0066CC]"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Period Selector */}
          <div className="px-4 md:px-6 py-3 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-sm text-slate-500">Period:</span>
              <select
                value={periodType}
                onChange={(e) => setPeriodType(e.target.value)}
                className="select select-sm select-bordered bg-white"
              >
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="quarter">This Quarter</option>
                <option value="last_quarter">Last Quarter</option>
                <option value="ytd">Year to Date</option>
                <option value="custom">Custom Range</option>
              </select>

              {periodType === "custom" && (
                <div className="flex items-center gap-2">
                  <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="input input-sm input-bordered bg-white w-36" />
                  <span className="text-slate-400">to</span>
                  <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="input input-sm input-bordered bg-white w-36" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Print Header */}
        <div className="hidden print:block p-6 border-b">
          <h1 className="text-2xl font-bold">{REPORT_TABS.find(t => t.id === activeTab)?.label}</h1>
          <p className="text-sm text-slate-500">{from && to ? `${formatDate(from)} - ${formatDate(to)}` : ""}</p>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 space-y-6 print:p-6" ref={printRef}>
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <span className="loading loading-spinner loading-lg text-[#0066CC]"></span>
            </div>
          ) : (
            <>
              {/* Sales Summary Tab */}
              {activeTab === "sales" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4">
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 print:border">
                      <p className="text-sm text-slate-500 font-medium">Total Sales</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(salesData.totalGross)}</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 p-5">
                      <p className="text-sm text-slate-500 font-medium">Deals Completed</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">{salesData.dealCount}</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 p-5">
                      <p className="text-sm text-slate-500 font-medium">Average Sale</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(salesData.dealCount > 0 ? salesData.totalGross / salesData.dealCount : 0)}</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-blue-200 p-5">
                      <p className="text-sm text-blue-600 font-medium">VAT Collected</p>
                      <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(salesData.totalVat)}</p>
                    </div>
                  </div>

                  {salesData.deals.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                      <div className="px-5 py-4 border-b border-slate-100">
                        <h2 className="text-lg font-bold text-slate-900">Sales Details</h2>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-5 py-3">Date</th>
                              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-5 py-3">Vehicle</th>
                              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-5 py-3">Customer</th>
                              <th className="text-right text-xs font-semibold text-slate-500 uppercase px-5 py-3">Gross</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {salesData.deals.map((deal) => (
                              <tr key={deal.id} className="hover:bg-slate-50">
                                <td className="px-5 py-3 text-sm text-slate-600">{formatDate(deal.invoicedAt)}</td>
                                <td className="px-5 py-3 text-sm text-slate-900">{deal.vehicle?.regCurrent} - {deal.vehicle?.make} {deal.vehicle?.model}</td>
                                <td className="px-5 py-3 text-sm text-slate-600">{deal.customer?.displayName || "—"}</td>
                                <td className="px-5 py-3 text-sm text-right font-medium text-slate-900">{formatCurrency(deal.vehiclePriceGross)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* VAT Report Tab */}
              {activeTab === "vat" && (
                <div className="space-y-6">
                  {/* Legend */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                    <p className="text-sm text-blue-700">
                      <span className="font-semibold">*</span> = VAT Qualifying (20% VAT applies). Unmarked items are Margin Scheme (0% VAT).
                    </p>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-2xl border border-blue-200 p-5">
                      <p className="text-sm text-blue-600 font-medium">Output VAT (Sales)</p>
                      <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(vatDetailData.box1)}</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-emerald-200 p-5">
                      <p className="text-sm text-emerald-600 font-medium">Input VAT (Purchases)</p>
                      <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(vatDetailData.box4)}</p>
                    </div>
                    <div className={`bg-white rounded-2xl border p-5 ${vatDetailData.box5 >= 0 ? "border-red-200" : "border-emerald-200"}`}>
                      <p className={`text-sm font-medium ${vatDetailData.box5 >= 0 ? "text-red-600" : "text-emerald-600"}`}>
                        Net VAT {vatDetailData.box5 >= 0 ? "to Pay" : "to Reclaim"}
                      </p>
                      <p className={`text-2xl font-bold mt-1 ${vatDetailData.box5 >= 0 ? "text-red-600" : "text-emerald-600"}`}>
                        {formatCurrency(Math.abs(vatDetailData.box5))}
                      </p>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 p-5">
                      <p className="text-sm text-slate-500 font-medium">Total Vehicles Sold</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">{vatDetailData.outputTransactions.length}</p>
                    </div>
                  </div>

                  {/* Vehicle Purchases */}
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100">
                      <h2 className="text-lg font-bold text-slate-900">Vehicle Purchases</h2>
                      <p className="text-sm text-slate-500 mt-0.5">{vatDetailData.inputTransactions.length} vehicles purchased in period</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="text-left text-xs font-semibold text-slate-500 uppercase px-5 py-3">Tax Point</th>
                            <th className="text-left text-xs font-semibold text-slate-500 uppercase px-5 py-3">Stock No.</th>
                            <th className="text-left text-xs font-semibold text-slate-500 uppercase px-5 py-3">Description</th>
                            <th className="text-left text-xs font-semibold text-slate-500 uppercase px-5 py-3">Scheme</th>
                            <th className="text-right text-xs font-semibold text-slate-500 uppercase px-5 py-3">Net</th>
                            <th className="text-right text-xs font-semibold text-slate-500 uppercase px-5 py-3">VAT Input</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {vatDetailData.inputTransactions.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-5 py-6 text-center text-slate-500">No purchases in this period</td>
                            </tr>
                          ) : (
                            vatDetailData.inputTransactions.map((t, idx) => (
                              <tr key={idx}>
                                <td className="px-5 py-3 text-sm text-slate-600">{formatDate(t.date)}</td>
                                <td className="px-5 py-3 text-sm font-mono">
                                  {t.stockNo}{t.scheme === "VAT_QUALIFYING" && <span className="text-blue-600 font-bold">*</span>}
                                </td>
                                <td className="px-5 py-3 text-sm text-slate-900">{t.vrm} - {t.description}</td>
                                <td className="px-5 py-3 text-sm">
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${t.scheme === "VAT_QUALIFYING" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                                    {t.scheme === "VAT_QUALIFYING" ? "VAT Qual" : "Margin"}
                                  </span>
                                </td>
                                <td className="px-5 py-3 text-sm text-right">{formatCurrency(t.net)}</td>
                                <td className="px-5 py-3 text-sm text-right font-medium text-emerald-600">
                                  {t.scheme === "VAT_QUALIFYING" ? formatCurrency(t.vat) : "—"}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                        <tfoot className="bg-emerald-50">
                          <tr>
                            <td colSpan={4} className="px-5 py-3 font-semibold text-sm">Total Purchases</td>
                            <td className="px-5 py-3 text-right font-semibold">{formatCurrency(vatDetailData.purchasesNetTotal)}</td>
                            <td className="px-5 py-3 text-right font-bold text-emerald-600">{formatCurrency(vatDetailData.purchasesVatTotal)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Vehicle Sales */}
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100">
                      <h2 className="text-lg font-bold text-slate-900">Vehicle Sales</h2>
                      <p className="text-sm text-slate-500 mt-0.5">{vatDetailData.outputTransactions.length} vehicles sold in period</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="text-left text-xs font-semibold text-slate-500 uppercase px-5 py-3">Tax Point</th>
                            <th className="text-left text-xs font-semibold text-slate-500 uppercase px-5 py-3">Stock No.</th>
                            <th className="text-left text-xs font-semibold text-slate-500 uppercase px-5 py-3">Description</th>
                            <th className="text-left text-xs font-semibold text-slate-500 uppercase px-5 py-3">Scheme</th>
                            <th className="text-right text-xs font-semibold text-slate-500 uppercase px-5 py-3">Sales</th>
                            <th className="text-right text-xs font-semibold text-slate-500 uppercase px-5 py-3">VAT Output</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {vatDetailData.outputTransactions.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-5 py-6 text-center text-slate-500">No sales in this period</td>
                            </tr>
                          ) : (
                            vatDetailData.outputTransactions.map((t, idx) => (
                              <tr key={idx}>
                                <td className="px-5 py-3 text-sm text-slate-600">{formatDate(t.date)}</td>
                                <td className="px-5 py-3 text-sm font-mono">
                                  {t.stockNo}{t.scheme === "VAT_QUALIFYING" && <span className="text-blue-600 font-bold">*</span>}
                                </td>
                                <td className="px-5 py-3 text-sm text-slate-900">{t.vrm} - {t.description}</td>
                                <td className="px-5 py-3 text-sm">
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${t.scheme === "VAT_QUALIFYING" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                                    {t.scheme === "VAT_QUALIFYING" ? "VAT Qual" : "Margin"}
                                  </span>
                                </td>
                                <td className="px-5 py-3 text-sm text-right">{formatCurrency(t.net)}</td>
                                <td className="px-5 py-3 text-sm text-right font-medium text-blue-600">
                                  {t.scheme === "VAT_QUALIFYING" ? formatCurrency(t.vat) : "—"}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                        <tfoot className="bg-blue-50">
                          <tr>
                            <td colSpan={4} className="px-5 py-3 font-semibold text-sm">Total Sales</td>
                            <td className="px-5 py-3 text-right font-semibold">{formatCurrency(vatDetailData.salesNetTotal)}</td>
                            <td className="px-5 py-3 text-right font-bold text-blue-600">{formatCurrency(vatDetailData.salesVatTotal)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* VAT Summary */}
                  <div className={`rounded-2xl p-6 ${vatDetailData.box5 >= 0 ? "bg-red-600" : "bg-emerald-600"} text-white`}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <p className="text-sm opacity-80">Output VAT (Due on Sales)</p>
                        <p className="text-2xl font-bold">{formatCurrency(vatDetailData.box1)}</p>
                      </div>
                      <div>
                        <p className="text-sm opacity-80">Input VAT (Reclaimed on Purchases)</p>
                        <p className="text-2xl font-bold">- {formatCurrency(vatDetailData.box4)}</p>
                      </div>
                      <div>
                        <p className="text-sm opacity-80">Net VAT {vatDetailData.box5 >= 0 ? "to Pay to HMRC" : "to Reclaim from HMRC"}</p>
                        <p className="text-3xl font-bold">{formatCurrency(Math.abs(vatDetailData.box5))}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Profit & Loss Tab */}
              {activeTab === "profitloss" && (
                <div className="space-y-6">
                  {/* Header with filter */}
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Profit and Loss Summary</h2>
                      <p className="text-sm text-slate-500">
                        For the period {formatDate(from)} up to and including {formatDate(to)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500">Show:</span>
                      <select
                        value={plFilter}
                        onChange={(e) => setPlFilter(e.target.value)}
                        className="select select-bordered select-sm"
                      >
                        {PL_FILTERS.map((f) => (
                          <option key={f.id} value={f.id}>{f.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Vehicles Section */}
                  {(plFilter === "all" || plFilter === "vehicles") && (
                    <>
                      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100">
                          <h3 className="text-lg font-bold text-slate-900">Vehicle Sales (Including VAT)</h3>
                        </div>
                        <div className="p-5 space-y-3">
                          <div className="flex justify-between items-center py-2 border-b border-slate-100">
                            <span className="text-sm text-slate-600">Total Sales Trade:</span>
                            <span className="font-semibold">{formatCurrency(profitLossData.vehicles.tradeSales)}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-slate-100">
                            <span className="text-sm text-slate-600">Total Sales Retail:</span>
                            <span className="font-semibold">{formatCurrency(profitLossData.vehicles.retailSales)}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 bg-slate-50 -mx-5 px-5">
                            <span className="text-sm font-semibold text-slate-900">Total Sales:</span>
                            <span className="font-bold text-slate-900">{formatCurrency(profitLossData.vehicles.totalSales)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100">
                          <h3 className="text-lg font-bold text-slate-900">Net Vehicle Sales Profit (Net of VAT)</h3>
                        </div>
                        <div className="p-5 space-y-3">
                          <div className="flex justify-between items-center py-2 border-b border-slate-100">
                            <div>
                              <span className="text-sm text-slate-600">Trade Sales Net Profit:</span>
                              {profitLossData.vehicles.tradeCount > 0 && (
                                <span className="text-xs text-slate-400 ml-2">({profitLossData.vehicles.tradeCount} trade units sold)</span>
                              )}
                              {profitLossData.vehicles.tradeCount === 0 && (
                                <span className="text-xs text-slate-400 ml-2">(No trade units sold)</span>
                              )}
                            </div>
                            <span className={`font-semibold ${profitLossData.vehicles.tradeProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                              {formatCurrency(profitLossData.vehicles.tradeProfit)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-slate-100">
                            <div>
                              <span className="text-sm text-slate-600">Retail Sales Net Profit:</span>
                              {profitLossData.vehicles.retailCount > 0 && (
                                <span className="text-xs text-slate-400 ml-2">
                                  ({profitLossData.vehicles.retailCount} units sold with an average net margin of {profitLossData.vehicles.avgMargin.toFixed(2)}%)
                                </span>
                              )}
                            </div>
                            <span className={`font-semibold ${profitLossData.vehicles.retailProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                              {formatCurrency(profitLossData.vehicles.retailProfit)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2 bg-emerald-50 -mx-5 px-5">
                            <span className="text-sm font-bold text-emerald-800">Vehicle Sales Total Net Profit:</span>
                            <span className={`font-bold text-lg ${profitLossData.vehicles.totalProfit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                              {formatCurrency(profitLossData.vehicles.totalProfit)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Add-Ons Section */}
                  {(plFilter === "all" || plFilter === "addons") && (
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                      <div className="px-5 py-4 border-b border-slate-100">
                        <h3 className="text-lg font-bold text-slate-900">Add-Ons Profit</h3>
                      </div>
                      <div className="p-5 space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                          <span className="text-sm text-slate-600">Total Add-Ons Revenue (Net):</span>
                          <span className="font-semibold">{formatCurrency(profitLossData.addons.revenue)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                          <span className="text-sm text-slate-600">Total Add-Ons Cost:</span>
                          <span className="font-semibold">{formatCurrency(profitLossData.addons.cost)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                          <span className="text-sm text-slate-600">Items Sold:</span>
                          <span className="font-semibold">{profitLossData.addons.count}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 bg-emerald-50 -mx-5 px-5">
                          <span className="text-sm font-bold text-emerald-800">Add-Ons Net Profit:</span>
                          <span className={`font-bold ${profitLossData.addons.profit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                            {formatCurrency(profitLossData.addons.profit)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Delivery Section */}
                  {(plFilter === "all" || plFilter === "delivery") && (
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                      <div className="px-5 py-4 border-b border-slate-100">
                        <h3 className="text-lg font-bold text-slate-900">Delivery Revenue</h3>
                      </div>
                      <div className="p-5 space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                          <span className="text-sm text-slate-600">Total Deliveries:</span>
                          <span className="font-semibold">{profitLossData.delivery.total}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                          <span className="text-sm text-slate-600">Free Deliveries:</span>
                          <span className="font-semibold">{profitLossData.delivery.free}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                          <span className="text-sm text-slate-600">Paid Deliveries:</span>
                          <span className="font-semibold">{profitLossData.delivery.paid}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 bg-emerald-50 -mx-5 px-5">
                          <span className="text-sm font-bold text-emerald-800">Delivery Revenue (Net):</span>
                          <span className="font-bold text-emerald-700">{formatCurrency(profitLossData.delivery.revenue)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Combined Total (only show when "All" filter) */}
                  {plFilter === "all" && (
                    <div className="bg-emerald-600 rounded-2xl p-6 text-white">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-emerald-100 text-sm">Combined Total Net Profit</p>
                          <p className="text-xs text-emerald-200 mt-1">Vehicles + Add-Ons + Delivery</p>
                        </div>
                        <p className="text-3xl font-bold">{formatCurrency(profitLossData.combined.totalProfit)}</p>
                      </div>
                    </div>
                  )}

                  {/* Disclaimer */}
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    <p className="text-sm text-amber-800">
                      <span className="font-semibold">Note:</span> This is only a summary Profit and Loss report, produced for simplicity and ease of use.
                      A full P&L accounting report would need to include such items as depreciation of fixed assets, etc., which are not included in this summary.
                      Consult a certified accountant for a full P&L report.
                    </p>
                  </div>
                </div>
              )}

              {/* Inventory Tab */}
              {activeTab === "inventory" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-2xl border border-slate-200 p-5">
                      <p className="text-sm text-slate-500 font-medium">Total Vehicles</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">{inventoryData.totalVehicles}</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 p-5">
                      <p className="text-sm text-slate-500 font-medium">Stock Value</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(inventoryData.totalValue)}</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 p-5">
                      <p className="text-sm text-slate-500 font-medium">Total Cost</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(inventoryData.totalCost)}</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-emerald-200 p-5">
                      <p className="text-sm text-emerald-600 font-medium">Potential Profit</p>
                      <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(inventoryData.potentialProfit)}</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100">
                      <h2 className="text-lg font-bold text-slate-900">Stock Age Analysis</h2>
                    </div>
                    <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
                      {AGE_BUCKETS.map((bucket) => {
                        const data = inventoryData.byAge[bucket.key];
                        const isOld = bucket.key === "61-90" || bucket.key === "90+";
                        return (
                          <div key={bucket.key} className={`rounded-xl p-4 ${isOld ? "bg-amber-50 border border-amber-200" : "bg-slate-50"}`}>
                            <p className={`text-sm font-medium ${isOld ? "text-amber-700" : "text-slate-600"}`}>{bucket.label}</p>
                            <p className={`text-2xl font-bold mt-1 ${isOld ? "text-amber-700" : "text-slate-900"}`}>{data.count}</p>
                            <p className="text-xs text-slate-500 mt-1">{formatCurrency(data.value)}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Stock Book Tab */}
              {activeTab === "stockbook" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-2xl border border-slate-200 p-5">
                      <p className="text-sm text-slate-500 font-medium">Vehicles Sold</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">{stockBookData.entries.length}</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 p-5">
                      <p className="text-sm text-slate-500 font-medium">Total Purchases</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(stockBookData.totalPurchases)}</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 p-5">
                      <p className="text-sm text-slate-500 font-medium">Total Sales</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(stockBookData.totalSales)}</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-emerald-200 p-5">
                      <p className="text-sm text-emerald-600 font-medium">Total Profit</p>
                      <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(stockBookData.totalProfit)}</p>
                    </div>
                  </div>

                  {stockBookData.entries.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-5 py-3">Vehicle</th>
                              <th className="text-right text-xs font-semibold text-slate-500 uppercase px-5 py-3">Purchase</th>
                              <th className="text-right text-xs font-semibold text-slate-500 uppercase px-5 py-3">Sale</th>
                              <th className="text-right text-xs font-semibold text-slate-500 uppercase px-5 py-3">Profit</th>
                              <th className="text-right text-xs font-semibold text-slate-500 uppercase px-5 py-3">Margin</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {stockBookData.entries.map((entry, idx) => (
                              <tr key={idx}>
                                <td className="px-5 py-3 text-sm text-slate-900">{entry.vrm} - {entry.make} {entry.model}</td>
                                <td className="px-5 py-3 text-sm text-right">{formatCurrency(entry.purchasePrice)}</td>
                                <td className="px-5 py-3 text-sm text-right">{formatCurrency(entry.salePrice)}</td>
                                <td className={`px-5 py-3 text-sm text-right font-medium ${entry.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatCurrency(entry.profit)}</td>
                                <td className="px-5 py-3 text-sm text-right">{entry.margin}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Profitable Models Tab */}
              {activeTab === "profitable" && (
                <div className="space-y-6">
                  {profitableModels.length > 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                      <div className="px-5 py-4 border-b border-slate-100">
                        <h2 className="text-lg font-bold text-slate-900">Most Profitable Models (All Time)</h2>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-5 py-3">Make/Model</th>
                              <th className="text-right text-xs font-semibold text-slate-500 uppercase px-5 py-3">Sold</th>
                              <th className="text-right text-xs font-semibold text-slate-500 uppercase px-5 py-3">Revenue</th>
                              <th className="text-right text-xs font-semibold text-slate-500 uppercase px-5 py-3">Total Profit</th>
                              <th className="text-right text-xs font-semibold text-slate-500 uppercase px-5 py-3">Avg Profit</th>
                              <th className="text-right text-xs font-semibold text-slate-500 uppercase px-5 py-3">Margin</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {profitableModels.map((model, idx) => (
                              <tr key={idx}>
                                <td className="px-5 py-3 text-sm font-medium text-slate-900">{model.make} {model.model}</td>
                                <td className="px-5 py-3 text-sm text-right">{model.count}</td>
                                <td className="px-5 py-3 text-sm text-right">{formatCurrency(model.totalRevenue)}</td>
                                <td className={`px-5 py-3 text-sm text-right font-medium ${model.totalProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatCurrency(model.totalProfit)}</td>
                                <td className="px-5 py-3 text-sm text-right">{formatCurrency(model.avgProfit)}</td>
                                <td className="px-5 py-3 text-sm text-right">{model.margin}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                      <p className="text-slate-500">No sales data available</p>
                    </div>
                  )}
                </div>
              )}

              {/* Payments Tab */}
              {activeTab === "payments" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-2xl border border-emerald-200 p-5">
                      <p className="text-sm text-emerald-600 font-medium">Total Received</p>
                      <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(paymentsData.totalReceived)}</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 p-5">
                      <p className="text-sm text-slate-500 font-medium">Transactions</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">{paymentsData.transactions.length}</p>
                    </div>
                  </div>

                  {/* Payment Methods Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                      <div className="px-5 py-4 border-b border-slate-100">
                        <h2 className="text-lg font-bold text-slate-900">By Payment Method</h2>
                      </div>
                      <div className="p-5 space-y-3">
                        {Object.entries(paymentsData.byMethod).length > 0 ? (
                          Object.entries(paymentsData.byMethod).map(([method, data]) => (
                            <div key={method} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                              <div className="flex items-center gap-3">
                                <span className={`w-3 h-3 rounded-full ${
                                  method === "CARD" ? "bg-purple-500" :
                                  method === "BANK_TRANSFER" ? "bg-blue-500" :
                                  method === "CASH" ? "bg-emerald-500" :
                                  method === "FINANCE" ? "bg-amber-500" : "bg-slate-400"
                                }`}></span>
                                <span className="text-sm font-medium text-slate-700">{method.replace(/_/g, " ")}</span>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-slate-900">{formatCurrency(data.total)}</p>
                                <p className="text-xs text-slate-500">{data.count} payments</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-slate-500 text-center py-4">No payments in this period</p>
                        )}
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                      <div className="px-5 py-4 border-b border-slate-100">
                        <h2 className="text-lg font-bold text-slate-900">By Payment Type</h2>
                      </div>
                      <div className="p-5 space-y-3">
                        {Object.entries(paymentsData.byType).length > 0 ? (
                          Object.entries(paymentsData.byType).map(([type, data]) => (
                            <div key={type} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                              <div className="flex items-center gap-3">
                                <span className={`w-3 h-3 rounded-full ${
                                  type === "DEPOSIT" ? "bg-blue-500" :
                                  type === "BALANCE" ? "bg-emerald-500" : "bg-slate-400"
                                }`}></span>
                                <span className="text-sm font-medium text-slate-700">{type}</span>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-slate-900">{formatCurrency(data.total)}</p>
                                <p className="text-xs text-slate-500">{data.count} payments</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-slate-500 text-center py-4">No payments in this period</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Transactions List */}
                  {paymentsData.transactions.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                      <div className="px-5 py-4 border-b border-slate-100">
                        <h2 className="text-lg font-bold text-slate-900">All Payments</h2>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-5 py-3">Date</th>
                              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-5 py-3">Deal</th>
                              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-5 py-3">Customer</th>
                              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-5 py-3">Type</th>
                              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-5 py-3">Method</th>
                              <th className="text-right text-xs font-semibold text-slate-500 uppercase px-5 py-3">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {paymentsData.transactions.map((p, idx) => (
                              <tr key={idx}>
                                <td className="px-5 py-3 text-sm text-slate-600">{formatDate(p.date)}</td>
                                <td className="px-5 py-3 text-sm text-slate-900">{p.vrm}</td>
                                <td className="px-5 py-3 text-sm text-slate-600">{p.customer}</td>
                                <td className="px-5 py-3 text-sm">
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    p.type === "DEPOSIT" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
                                  }`}>{p.type}</span>
                                </td>
                                <td className="px-5 py-3 text-sm">
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    p.method === "CARD" ? "bg-purple-100 text-purple-700" :
                                    p.method === "BANK_TRANSFER" ? "bg-blue-100 text-blue-700" :
                                    p.method === "CASH" ? "bg-emerald-100 text-emerald-700" :
                                    p.method === "FINANCE" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
                                  }`}>{p.method?.replace(/_/g, " ") || "Other"}</span>
                                </td>
                                <td className="px-5 py-3 text-sm text-right font-medium text-emerald-600">{formatCurrency(p.amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-emerald-50">
                            <tr>
                              <td colSpan={5} className="px-5 py-3 font-semibold">Total</td>
                              <td className="px-5 py-3 text-right font-bold text-emerald-600">{formatCurrency(paymentsData.totalReceived)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}

                  {paymentsData.transactions.length === 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                      <p className="text-slate-500">No payments recorded for this period</p>
                    </div>
                  )}
                </div>
              )}

              {/* Warranty Costs Tab */}
              {activeTab === "warranty" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-2xl border border-slate-200 p-5">
                      <p className="text-sm text-slate-500 font-medium">Cases</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">{warrantyCosts.caseCount}</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-red-200 p-5">
                      <p className="text-sm text-red-600 font-medium">Total Cost</p>
                      <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(warrantyCosts.totalCost)}</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 p-5">
                      <p className="text-sm text-slate-500 font-medium">Avg per Case</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(warrantyCosts.avgPerCase)}</p>
                    </div>
                  </div>

                  {warrantyCosts.cases.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-5 py-3">Date</th>
                              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-5 py-3">VRM</th>
                              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-5 py-3">Summary</th>
                              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-5 py-3">Status</th>
                              <th className="text-right text-xs font-semibold text-slate-500 uppercase px-5 py-3">Cost</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {warrantyCosts.cases.map((c) => (
                              <tr key={c.id}>
                                <td className="px-5 py-3 text-sm">{formatDate(c.createdAt)}</td>
                                <td className="px-5 py-3 text-sm font-mono">{c.vehicleReg}</td>
                                <td className="px-5 py-3 text-sm truncate max-w-[200px]">{c.summary}</td>
                                <td className="px-5 py-3 text-sm"><span className={`px-2 py-1 rounded text-xs font-medium ${c.status === "CLOSED" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{c.status}</span></td>
                                <td className="px-5 py-3 text-sm text-right font-medium text-red-600">{formatCurrency((c.costs?.partsNet || 0) + (c.costs?.labourNet || 0))}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 15mm 10mm; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      `}</style>
    </DashboardLayout>
  );
}
