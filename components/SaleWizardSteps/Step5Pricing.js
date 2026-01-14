/**
 * Step 5: Pricing
 * - Sale price (gross/net)
 * - VAT scheme selection
 * - Profit margin display
 */

// Format currency
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(amount);
};

export default function Step5Pricing({ data, updateData, goNext, goBack, canProceed }) {
  const vatRate = 0.2;

  // Calculate derived values
  const salePriceGross = parseFloat(data.salePriceGross) || 0;
  const siv = data.vehicle?.purchase?.purchasePriceNet || 0;
  const pxAllowance = data.hasPx ? (parseFloat(data.px.allowance) || 0) : 0;
  const pxSettlement = data.hasPx ? (parseFloat(data.px.settlementAmount) || 0) : 0;
  const pxNet = pxAllowance - pxSettlement;

  // VAT calculations
  let salePriceNet, vatAmount, profitGross;

  if (data.vatScheme === "VAT_QUALIFYING") {
    salePriceNet = salePriceGross / (1 + vatRate);
    vatAmount = salePriceGross - salePriceNet;
    profitGross = salePriceNet - siv; // Net profit for VAT qualifying
  } else {
    // Margin scheme - no VAT breakdown
    salePriceNet = salePriceGross;
    vatAmount = 0;
    profitGross = salePriceGross - siv;
  }

  const profitMargin = siv > 0 ? ((profitGross / siv) * 100) : 0;

  // Update form values when VAT scheme changes
  const handleVatSchemeChange = (scheme) => {
    updateData("vatScheme", scheme);

    if (scheme === "VAT_QUALIFYING") {
      const net = salePriceGross / (1 + vatRate);
      const vat = salePriceGross - net;
      updateData("salePriceNet", net.toFixed(2));
      updateData("vatAmount", vat.toFixed(2));
    } else {
      updateData("salePriceNet", data.salePriceGross);
      updateData("vatAmount", "0");
    }
  };

  const handlePriceChange = (value) => {
    updateData("salePriceGross", value);

    const gross = parseFloat(value) || 0;
    if (data.vatScheme === "VAT_QUALIFYING") {
      const net = gross / (1 + vatRate);
      const vat = gross - net;
      updateData("salePriceNet", net.toFixed(2));
      updateData("vatAmount", vat.toFixed(2));
    } else {
      updateData("salePriceNet", value);
      updateData("vatAmount", "0");
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Pricing</h2>
        <p className="text-slate-500">Set the sale price and VAT treatment</p>
      </div>

      {/* Vehicle Reference */}
      {data.vehicle && (
        <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Vehicle</p>
            <p className="font-semibold text-slate-900">
              {data.vehicle.regCurrent} - {data.vehicle.make} {data.vehicle.model}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">Stock Invoice Value (SIV)</p>
            <p className="font-semibold text-slate-900">{formatCurrency(siv)}</p>
          </div>
        </div>
      )}

      {/* VAT Scheme */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">VAT Scheme</span>
        </label>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleVatSchemeChange("MARGIN")}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              data.vatScheme === "MARGIN"
                ? "border-[#0066CC] bg-blue-50"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <p className="font-semibold text-slate-900">Margin Scheme</p>
            <p className="text-sm text-slate-500">No VAT breakdown on invoice</p>
          </button>

          <button
            onClick={() => handleVatSchemeChange("VAT_QUALIFYING")}
            disabled={data.vehicle?.vatScheme !== "VAT_QUALIFYING"}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              data.vatScheme === "VAT_QUALIFYING"
                ? "border-[#0066CC] bg-blue-50"
                : data.vehicle?.vatScheme !== "VAT_QUALIFYING"
                  ? "border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed"
                  : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <p className="font-semibold text-slate-900">VAT Qualifying</p>
            <p className="text-sm text-slate-500">Standard VAT at 20%</p>
            {data.vehicle?.vatScheme !== "VAT_QUALIFYING" && (
              <p className="text-xs text-amber-600 mt-1">Vehicle not VAT qualifying</p>
            )}
          </button>
        </div>
      </div>

      {/* Sale Price */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">
            Sale Price {data.vatScheme === "VAT_QUALIFYING" ? "(Gross inc VAT)" : ""} *
          </span>
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">£</span>
          <input
            type="number"
            value={data.salePriceGross}
            onChange={(e) => handlePriceChange(e.target.value)}
            className="input input-bordered input-lg w-full pl-8 text-xl font-semibold"
            placeholder="0.00"
            step="0.01"
          />
        </div>
      </div>

      {/* VAT Breakdown (for VAT qualifying) */}
      {data.vatScheme === "VAT_QUALIFYING" && (
        <div className="bg-blue-50 rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-blue-600">Net Price</span>
            <span className="font-semibold text-blue-900">{formatCurrency(salePriceNet)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-blue-600">VAT @ 20%</span>
            <span className="font-semibold text-blue-900">{formatCurrency(vatAmount)}</span>
          </div>
          <div className="flex justify-between text-base pt-2 border-t border-blue-200">
            <span className="text-blue-600 font-medium">Gross Price</span>
            <span className="font-bold text-blue-900">{formatCurrency(salePriceGross)}</span>
          </div>
        </div>
      )}

      {/* Part Exchange Summary */}
      {data.hasPx && pxAllowance > 0 && (
        <div className="bg-emerald-50 rounded-xl p-4 space-y-2">
          <p className="text-sm font-medium text-emerald-600 mb-2">Part Exchange</p>
          <div className="flex justify-between text-sm">
            <span className="text-emerald-600">Allowance</span>
            <span className="font-semibold text-emerald-900">{formatCurrency(pxAllowance)}</span>
          </div>
          {pxSettlement > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-emerald-600">Less Settlement</span>
              <span className="font-semibold text-red-600">-{formatCurrency(pxSettlement)}</span>
            </div>
          )}
          <div className="flex justify-between text-base pt-2 border-t border-emerald-200">
            <span className="text-emerald-600 font-medium">Net Value</span>
            <span className="font-bold text-emerald-900">{formatCurrency(pxNet)}</span>
          </div>
        </div>
      )}

      {/* Profit Summary */}
      <div className={`rounded-xl p-4 ${profitGross >= 0 ? "bg-slate-50" : "bg-red-50"}`}>
        <p className="text-sm font-medium text-slate-500 mb-3">Profit Summary</p>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-slate-400 uppercase">SIV (Cost)</p>
            <p className="text-lg font-bold text-slate-900">{formatCurrency(siv)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase">
              {data.vatScheme === "VAT_QUALIFYING" ? "Sale (Net)" : "Sale Price"}
            </p>
            <p className="text-lg font-bold text-slate-900">{formatCurrency(salePriceNet)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase">Gross Profit</p>
            <p className={`text-lg font-bold ${profitGross >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {formatCurrency(profitGross)}
            </p>
            <p className="text-xs text-slate-400">
              {profitMargin >= 0 ? "+" : ""}{profitMargin.toFixed(1)}% margin
            </p>
          </div>
        </div>
      </div>

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
