/**
 * Step 6: Add-ons
 * - Product catalog picker
 * - Custom pricing
 */

import { useState } from "react";

// Format currency
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(amount);
};

const CATEGORY_LABELS = {
  WARRANTY: "Warranty",
  PROTECTION: "Protection",
  FINANCE: "Finance Products",
  ACCESSORY: "Accessories",
  SERVICE: "Service",
  OTHER: "Other",
};

export default function Step6AddOns({ data, updateData, goNext, goBack, products }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [customProduct, setCustomProduct] = useState({
    name: "",
    unitPriceNet: "",
    vatTreatment: "STANDARD",
  });

  // Group products by category
  const groupedProducts = products.reduce((acc, p) => {
    const cat = p.category || "OTHER";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  const addProduct = (product) => {
    const existing = data.addOns.find(a => a.productId === (product.id || product._id));
    if (existing) return;

    updateData("addOns", [
      ...data.addOns,
      {
        productId: product.id || product._id,
        name: product.name,
        qty: 1,
        unitPriceNet: product.defaultPriceNet || 0,
        vatTreatment: "STANDARD",
      },
    ]);
  };

  const addCustomProduct = () => {
    if (!customProduct.name || !customProduct.unitPriceNet) return;

    updateData("addOns", [
      ...data.addOns,
      {
        productId: null,
        name: customProduct.name,
        qty: 1,
        unitPriceNet: parseFloat(customProduct.unitPriceNet),
        vatTreatment: customProduct.vatTreatment,
      },
    ]);

    setCustomProduct({ name: "", unitPriceNet: "", vatTreatment: "STANDARD" });
    setShowAddForm(false);
  };

  const removeAddOn = (index) => {
    updateData("addOns", data.addOns.filter((_, i) => i !== index));
  };

  const updateAddOn = (index, field, value) => {
    const updated = [...data.addOns];
    updated[index] = { ...updated[index], [field]: value };
    updateData("addOns", updated);
  };

  // Calculate totals
  const addOnsTotal = data.addOns.reduce((sum, a) => {
    const net = (a.unitPriceNet || 0) * (a.qty || 1);
    const vat = a.vatTreatment === "STANDARD" ? net * 0.2 : 0;
    return sum + net + vat;
  }, 0);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Add-ons</h2>
        <p className="text-slate-500">Add products, warranties, and extras to this sale</p>
      </div>

      {/* Selected Add-ons */}
      {data.addOns.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-500">Selected Add-ons</p>
          <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
            {data.addOns.map((addon, index) => {
              const net = (addon.unitPriceNet || 0) * (addon.qty || 1);
              const vat = addon.vatTreatment === "STANDARD" ? net * 0.2 : 0;
              const gross = net + vat;

              return (
                <div key={index} className="p-4 flex items-center gap-4">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{addon.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="number"
                        value={addon.qty}
                        onChange={(e) => updateAddOn(index, "qty", parseInt(e.target.value) || 1)}
                        className="input input-bordered input-sm w-16 text-center"
                        min="1"
                      />
                      <span className="text-slate-400">x</span>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm">£</span>
                        <input
                          type="number"
                          value={addon.unitPriceNet}
                          onChange={(e) => updateAddOn(index, "unitPriceNet", parseFloat(e.target.value) || 0)}
                          className="input input-bordered input-sm w-24 pl-6"
                          step="0.01"
                        />
                      </div>
                      <select
                        value={addon.vatTreatment}
                        onChange={(e) => updateAddOn(index, "vatTreatment", e.target.value)}
                        className="select select-bordered select-sm"
                      >
                        <option value="STANDARD">+ VAT</option>
                        <option value="EXEMPT">No VAT</option>
                      </select>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">{formatCurrency(gross)}</p>
                    {vat > 0 && (
                      <p className="text-xs text-slate-400">inc. {formatCurrency(vat)} VAT</p>
                    )}
                  </div>
                  <button
                    onClick={() => removeAddOn(index)}
                    className="btn btn-ghost btn-sm btn-circle text-slate-400 hover:text-red-500"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Total */}
          <div className="flex justify-end">
            <div className="bg-slate-50 rounded-lg px-4 py-2">
              <span className="text-slate-500 mr-4">Add-ons Total:</span>
              <span className="font-bold text-slate-900">{formatCurrency(addOnsTotal)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Product Catalog */}
      {products.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm font-medium text-slate-500">Available Products</p>
          {Object.entries(groupedProducts).map(([category, categoryProducts]) => (
            <div key={category}>
              <p className="text-xs font-medium text-slate-400 uppercase mb-2">
                {CATEGORY_LABELS[category] || category}
              </p>
              <div className="flex flex-wrap gap-2">
                {categoryProducts.map((product) => {
                  const isSelected = data.addOns.some(a => a.productId === (product.id || product._id));
                  return (
                    <button
                      key={product.id || product._id}
                      onClick={() => !isSelected && addProduct(product)}
                      disabled={isSelected}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        isSelected
                          ? "bg-emerald-100 text-emerald-700 cursor-default"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {product.name}
                      {product.defaultPriceNet > 0 && (
                        <span className="text-slate-400 ml-1">
                          ({formatCurrency(product.defaultPriceNet)})
                        </span>
                      )}
                      {isSelected && (
                        <svg className="w-4 h-4 ml-1 inline" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Custom Product */}
      <div>
        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="btn btn-outline btn-sm"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Custom Item
          </button>
        ) : (
          <div className="bg-slate-50 rounded-xl p-4 space-y-4">
            <p className="font-medium text-slate-900">Add Custom Item</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text text-sm">Name</span>
                </label>
                <input
                  type="text"
                  value={customProduct.name}
                  onChange={(e) => setCustomProduct({ ...customProduct, name: e.target.value })}
                  className="input input-bordered input-sm"
                  placeholder="Product name"
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text text-sm">Price (Net)</span>
                </label>
                <input
                  type="number"
                  value={customProduct.unitPriceNet}
                  onChange={(e) => setCustomProduct({ ...customProduct, unitPriceNet: e.target.value })}
                  className="input input-bordered input-sm"
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={addCustomProduct}
                disabled={!customProduct.name || !customProduct.unitPriceNet}
                className="btn btn-sm bg-[#0066CC] text-white"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setCustomProduct({ name: "", unitPriceNet: "", vatTreatment: "STANDARD" });
                }}
                className="btn btn-sm btn-ghost"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
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
          Continue
          <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
