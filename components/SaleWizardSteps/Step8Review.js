/**
 * Step 8: Review & Complete
 * - Summary of all entered data
 * - Terms confirmation
 * - Create deal
 */

// Format currency
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(amount);
};

export default function Step8Review({ data, goBack, onSubmit, isSubmitting }) {
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

  // Customer name
  const customerName = data.customer
    ? (data.customer.displayName || `${data.customer.firstName} ${data.customer.lastName}`)
    : (data.isNewCustomer ? `${data.newCustomer.firstName} ${data.newCustomer.lastName}` : "—");

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Review & Create</h2>
        <p className="text-slate-500">Review the deal details before creating</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Customer */}
        <div className="bg-slate-50 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-400 uppercase mb-2">Customer</p>
          <p className="font-semibold text-slate-900">{customerName}</p>
          {data.isNewCustomer && (
            <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
              New Customer
            </span>
          )}
          <div className="mt-2 text-sm text-slate-500">
            {(data.customer?.email || data.newCustomer?.email) && (
              <p>{data.customer?.email || data.newCustomer?.email}</p>
            )}
            {(data.customer?.phone || data.newCustomer?.phone) && (
              <p>{data.customer?.phone || data.newCustomer?.phone}</p>
            )}
          </div>
        </div>

        {/* Vehicle */}
        <div className="bg-slate-50 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-400 uppercase mb-2">Vehicle</p>
          {data.vehicle ? (
            <>
              <p className="font-mono font-bold text-slate-900">{data.vehicle.regCurrent}</p>
              <p className="text-slate-600">
                {data.vehicle.make} {data.vehicle.model}
              </p>
              <p className="text-sm text-slate-500">
                {data.vehicle.year} | {data.vehicle.colour}
              </p>
            </>
          ) : (
            <p className="text-slate-400">No vehicle selected</p>
          )}
        </div>

        {/* Sale Details */}
        <div className="bg-slate-50 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-400 uppercase mb-2">Sale Details</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Type</span>
              <span className="text-slate-900">{data.isExport ? "Export" : "Retail"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Channel</span>
              <span className="text-slate-900">{data.isDistanceSale ? "Distance" : "In Person"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">VAT Scheme</span>
              <span className="text-slate-900">
                {data.vatScheme === "VAT_QUALIFYING" ? "VAT Qualifying" : "Margin"}
              </span>
            </div>
            {data.advertisingSource && (
              <div className="flex justify-between">
                <span className="text-slate-500">Source</span>
                <span className="text-slate-900">{data.advertisingSource}</span>
              </div>
            )}
          </div>
        </div>

        {/* Payment */}
        <div className="bg-slate-50 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-400 uppercase mb-2">Payment</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Method</span>
              <span className="text-slate-900">{data.paymentType}</span>
            </div>
            {data.paymentType === "FINANCE" && data.finance.provider && (
              <div className="flex justify-between">
                <span className="text-slate-500">Provider</span>
                <span className="text-slate-900">{data.finance.provider}</span>
              </div>
            )}
            {deposit > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">Deposit</span>
                <span className="text-emerald-600 font-semibold">{formatCurrency(deposit)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Part Exchange */}
      {data.hasPx && data.px.vrm && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p className="text-xs font-medium text-emerald-600 uppercase mb-2">Part Exchange</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono font-bold text-slate-900">{data.px.vrm}</p>
              <p className="text-slate-600">
                {data.px.make} {data.px.model} {data.px.year}
              </p>
              {data.px.hasFinance && (
                <p className="text-sm text-amber-600 mt-1">
                  Finance: {data.px.financeCompany} (Settlement: {formatCurrency(parseFloat(data.px.settlementAmount))})
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-emerald-600">Allowance</p>
              <p className="text-xl font-bold text-emerald-700">{formatCurrency(parseFloat(data.px.allowance))}</p>
            </div>
          </div>
        </div>
      )}

      {/* Add-ons */}
      {data.addOns.length > 0 && (
        <div className="bg-slate-50 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-400 uppercase mb-2">Add-ons</p>
          <ul className="space-y-1">
            {data.addOns.map((addon, index) => {
              const net = (addon.unitPriceNet || 0) * (addon.qty || 1);
              const vat = addon.vatTreatment === "STANDARD" ? net * 0.2 : 0;
              return (
                <li key={index} className="flex justify-between text-sm">
                  <span className="text-slate-600">
                    {addon.name} {addon.qty > 1 && `x${addon.qty}`}
                  </span>
                  <span className="text-slate-900 font-semibold">{formatCurrency(net + vat)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Financial Summary */}
      <div className="bg-white border-2 border-[#0066CC] rounded-xl p-6">
        <p className="font-bold text-slate-900 mb-4">Financial Summary</p>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-600">Vehicle Price</span>
            <span className="font-semibold text-slate-900">{formatCurrency(vehiclePrice)}</span>
          </div>
          {addOnsTotal > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-600">Add-ons</span>
              <span className="font-semibold text-slate-900">{formatCurrency(addOnsTotal)}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-slate-200">
            <span className="font-medium text-slate-700">Total</span>
            <span className="font-bold text-slate-900">{formatCurrency(grandTotal)}</span>
          </div>
          {pxNet > 0 && (
            <div className="flex justify-between">
              <span className="text-emerald-600">Part Exchange</span>
              <span className="font-semibold text-emerald-600">-{formatCurrency(pxNet)}</span>
            </div>
          )}
          {deposit > 0 && (
            <div className="flex justify-between">
              <span className="text-emerald-600">Deposit</span>
              <span className="font-semibold text-emerald-600">-{formatCurrency(deposit)}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t-2 border-[#0066CC]">
            <span className="font-bold text-lg text-slate-900">Balance Due</span>
            <span className="font-bold text-xl text-[#0066CC]">{formatCurrency(balanceDue)}</span>
          </div>
        </div>
      </div>

      {/* Terms Confirmation */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm text-amber-800">
          By creating this deal, you confirm that all information is accurate and that applicable terms and conditions have been discussed with the customer.
        </p>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t border-slate-200">
        <button onClick={goBack} className="btn btn-ghost" disabled={isSubmitting}>
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="btn bg-emerald-600 hover:bg-emerald-700 text-white border-none btn-lg"
        >
          {isSubmitting ? (
            <>
              <span className="loading loading-spinner loading-sm mr-2"></span>
              Creating Deal...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Create Deal
            </>
          )}
        </button>
      </div>
    </div>
  );
}
