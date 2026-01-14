/**
 * Step 3: Part Exchange
 * - Optional trade-in vehicle
 * - VRM lookup with DVLA
 * - Finance details
 */

import { useState } from "react";

export default function Step3PartExchange({ data, updateData, goNext, goBack }) {
  const [isLookingUp, setIsLookingUp] = useState(false);

  const handleVrmLookup = async () => {
    const vrm = data.px.vrm?.trim().toUpperCase().replace(/\s/g, "");
    if (!vrm) return;

    setIsLookingUp(true);
    try {
      const res = await fetch("/api/dvla/vehicle-enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationNumber: vrm }),
      });

      if (res.ok) {
        const dvlaData = await res.json();
        updateData("px", {
          ...data.px,
          vrm,
          make: dvlaData.make || "",
          model: dvlaData.model || "",
          year: dvlaData.yearOfManufacture || dvlaData.year || "",
          colour: dvlaData.colour || "",
        });
      }
    } catch (e) {
      console.error("[Step3] VRM lookup error:", e);
    } finally {
      setIsLookingUp(false);
    }
  };

  const updatePx = (field, value) => {
    updateData("px", { ...data.px, [field]: value });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Part Exchange</h2>
        <p className="text-slate-500">Does the customer have a vehicle to trade in?</p>
      </div>

      {/* Toggle */}
      <div className="flex gap-4">
        <button
          onClick={() => updateData("hasPx", false)}
          className={`flex-1 py-4 px-6 rounded-xl border-2 transition-all ${
            !data.hasPx
              ? "border-[#0066CC] bg-blue-50"
              : "border-slate-200 hover:border-slate-300"
          }`}
        >
          <p className="font-semibold text-slate-900">No Part Exchange</p>
          <p className="text-sm text-slate-500 mt-1">Customer is not trading in a vehicle</p>
        </button>

        <button
          onClick={() => updateData("hasPx", true)}
          className={`flex-1 py-4 px-6 rounded-xl border-2 transition-all ${
            data.hasPx
              ? "border-[#0066CC] bg-blue-50"
              : "border-slate-200 hover:border-slate-300"
          }`}
        >
          <p className="font-semibold text-slate-900">Add Part Exchange</p>
          <p className="text-sm text-slate-500 mt-1">Customer has a vehicle to trade in</p>
        </button>
      </div>

      {/* Part Exchange Form */}
      {data.hasPx && (
        <div className="space-y-6 p-6 bg-slate-50 rounded-xl">
          {/* VRM Lookup */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Registration Number</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={data.px.vrm}
                onChange={(e) => updatePx("vrm", e.target.value.toUpperCase())}
                placeholder="AB12 CDE"
                className="input input-bordered flex-1 font-mono uppercase"
              />
              <button
                onClick={handleVrmLookup}
                disabled={!data.px.vrm || isLookingUp}
                className="btn btn-outline"
              >
                {isLookingUp ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  "Lookup"
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Make</span>
              </label>
              <input
                type="text"
                value={data.px.make}
                onChange={(e) => updatePx("make", e.target.value)}
                className="input input-bordered w-full"
                placeholder="Ford"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Model</span>
              </label>
              <input
                type="text"
                value={data.px.model}
                onChange={(e) => updatePx("model", e.target.value)}
                className="input input-bordered w-full"
                placeholder="Focus"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Year</span>
              </label>
              <input
                type="text"
                value={data.px.year}
                onChange={(e) => updatePx("year", e.target.value)}
                className="input input-bordered w-full"
                placeholder="2020"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Mileage</span>
              </label>
              <input
                type="number"
                value={data.px.mileage}
                onChange={(e) => updatePx("mileage", e.target.value)}
                className="input input-bordered w-full"
                placeholder="50000"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Colour</span>
              </label>
              <input
                type="text"
                value={data.px.colour}
                onChange={(e) => updatePx("colour", e.target.value)}
                className="input input-bordered w-full"
                placeholder="Blue"
              />
            </div>
          </div>

          {/* Finance */}
          <div className="border-t border-slate-200 pt-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={data.px.hasFinance}
                onChange={(e) => updatePx("hasFinance", e.target.checked)}
                className="checkbox checkbox-primary"
              />
              <span className="font-medium text-slate-900">Vehicle has outstanding finance</span>
            </label>
          </div>

          {data.px.hasFinance && (
            <div className="grid grid-cols-2 gap-4 pl-8">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Finance Company</span>
                </label>
                <input
                  type="text"
                  value={data.px.financeCompany}
                  onChange={(e) => updatePx("financeCompany", e.target.value)}
                  className="input input-bordered w-full"
                  placeholder="Black Horse"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Settlement Amount</span>
                </label>
                <input
                  type="number"
                  value={data.px.settlementAmount}
                  onChange={(e) => updatePx("settlementAmount", e.target.value)}
                  className="input input-bordered w-full"
                  placeholder="5000"
                />
              </div>
            </div>
          )}

          {/* Allowance */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Part Exchange Allowance</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">£</span>
              <input
                type="number"
                value={data.px.allowance}
                onChange={(e) => updatePx("allowance", e.target.value)}
                className="input input-bordered w-full pl-8"
                placeholder="3000"
              />
            </div>
            <label className="label">
              <span className="label-text-alt text-slate-400">Agreed value for customer&apos;s vehicle</span>
            </label>
          </div>

          {/* Condition Notes */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Condition Notes</span>
            </label>
            <textarea
              value={data.px.conditionNotes}
              onChange={(e) => updatePx("conditionNotes", e.target.value)}
              className="textarea textarea-bordered w-full"
              rows={3}
              placeholder="Any notes about the vehicle condition..."
            />
          </div>
        </div>
      )}

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
