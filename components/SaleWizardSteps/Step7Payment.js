/**
 * Step 7: Payment
 * - Payment type selection
 * - Finance details
 * - Deposit amount
 */

const PAYMENT_TYPES = [
  { value: "CASH", label: "Cash", description: "Full cash payment" },
  { value: "CARD", label: "Card", description: "Debit or credit card" },
  { value: "BANK_TRANSFER", label: "Bank Transfer", description: "BACS or Faster Payment" },
  { value: "FINANCE", label: "Finance", description: "HP, PCP, or Lease" },
  { value: "MIXED", label: "Mixed", description: "Combination of payment methods" },
];

const FINANCE_TYPES = [
  { value: "HP", label: "Hire Purchase (HP)" },
  { value: "PCP", label: "Personal Contract Purchase (PCP)" },
  { value: "LEASE", label: "Lease" },
];

const DEPOSIT_METHODS = [
  { value: "CARD", label: "Card" },
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
];

// Format currency
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(amount);
};

export default function Step7Payment({ data, updateData, goNext, goBack }) {
  const updateFinance = (field, value) => {
    updateData("finance", { ...data.finance, [field]: value });
  };

  // Calculate totals
  const vehiclePrice = parseFloat(data.salePriceGross) || 0;
  const addOnsTotal = data.addOns.reduce((sum, a) => {
    const net = (a.unitPriceNet || 0) * (a.qty || 1);
    const vat = a.vatTreatment === "STANDARD" ? net * 0.2 : 0;
    return sum + net + vat;
  }, 0);
  const pxNet = data.hasPx
    ? (parseFloat(data.px.allowance) || 0) - (parseFloat(data.px.settlementAmount) || 0)
    : 0;
  const deposit = parseFloat(data.depositAmount) || 0;
  const grandTotal = vehiclePrice + addOnsTotal;
  const balanceDue = grandTotal - pxNet - deposit;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Payment</h2>
        <p className="text-slate-500">How will the customer pay?</p>
      </div>

      {/* Payment Type */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Payment Type</span>
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {PAYMENT_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => updateData("paymentType", type.value)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                data.paymentType === type.value
                  ? "border-[#0066CC] bg-blue-50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <p className="font-semibold text-slate-900">{type.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{type.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Finance Details */}
      {data.paymentType === "FINANCE" && (
        <div className="bg-slate-50 rounded-xl p-6 space-y-6">
          <p className="font-medium text-slate-900">Finance Details</p>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Finance Provider</span>
              </label>
              <input
                type="text"
                value={data.finance.provider}
                onChange={(e) => updateFinance("provider", e.target.value)}
                className="input input-bordered w-full"
                placeholder="e.g., Black Horse"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Finance Type</span>
              </label>
              <select
                value={data.finance.type}
                onChange={(e) => updateFinance("type", e.target.value)}
                className="select select-bordered w-full"
              >
                {FINANCE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Amount Financed</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">£</span>
                <input
                  type="number"
                  value={data.finance.amount}
                  onChange={(e) => updateFinance("amount", e.target.value)}
                  className="input input-bordered w-full pl-8"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Term (months)</span>
              </label>
              <input
                type="number"
                value={data.finance.term}
                onChange={(e) => updateFinance("term", e.target.value)}
                className="input input-bordered w-full"
                placeholder="48"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">APR %</span>
              </label>
              <input
                type="number"
                value={data.finance.apr}
                onChange={(e) => updateFinance("apr", e.target.value)}
                className="input input-bordered w-full"
                placeholder="9.9"
                step="0.1"
              />
            </div>
          </div>
        </div>
      )}

      {/* Deposit */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Deposit Amount</span>
          <span className="label-text-alt text-slate-400">Optional - can take later</span>
        </label>
        <div className="flex gap-4">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">£</span>
            <input
              type="number"
              value={data.depositAmount}
              onChange={(e) => updateData("depositAmount", e.target.value)}
              className="input input-bordered input-lg w-full pl-8"
              placeholder="0.00"
              step="0.01"
            />
          </div>
          {parseFloat(data.depositAmount) > 0 && (
            <select
              value={data.depositMethod}
              onChange={(e) => updateData("depositMethod", e.target.value)}
              className="select select-bordered select-lg"
            >
              {DEPOSIT_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Payment Summary */}
      <div className="bg-slate-50 rounded-xl p-6">
        <p className="font-medium text-slate-900 mb-4">Payment Summary</p>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Vehicle</span>
            <span className="font-semibold text-slate-900">{formatCurrency(vehiclePrice)}</span>
          </div>
          {addOnsTotal > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Add-ons</span>
              <span className="font-semibold text-slate-900">{formatCurrency(addOnsTotal)}</span>
            </div>
          )}
          <div className="flex justify-between text-base pt-2 border-t border-slate-200">
            <span className="font-medium text-slate-700">Total</span>
            <span className="font-bold text-slate-900">{formatCurrency(grandTotal)}</span>
          </div>
          {pxNet > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-emerald-600">Part Exchange</span>
              <span className="font-semibold text-emerald-600">-{formatCurrency(pxNet)}</span>
            </div>
          )}
          {deposit > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-emerald-600">Deposit</span>
              <span className="font-semibold text-emerald-600">-{formatCurrency(deposit)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg pt-2 border-t border-slate-200">
            <span className="font-bold text-slate-900">Balance Due</span>
            <span className="font-bold text-[#0066CC]">{formatCurrency(balanceDue)}</span>
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
          className="btn bg-[#0066CC] hover:bg-[#0052a3] text-white border-none"
        >
          Review & Create
          <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
