/**
 * Step 1: Get Started
 * - Advertising source
 * - Vehicle use (private/commercial)
 * - Sales person
 * - Export & distance sale flags
 * - Marketing & data protection confirmation
 */

const ADVERTISING_SOURCES = [
  { value: "AUTOTRADER", label: "AutoTrader" },
  { value: "CARGURUS", label: "CarGurus" },
  { value: "FACEBOOK", label: "Facebook" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "WEBSITE", label: "Our Website" },
  { value: "REFERRAL", label: "Referral" },
  { value: "RETURNING", label: "Returning Customer" },
  { value: "WALK_IN", label: "Walk In" },
  { value: "OTHER", label: "Other" },
];

const VEHICLE_USE_OPTIONS = [
  { value: "PRIVATE", label: "Private (Personal)", description: "Customer buying for personal use" },
  { value: "COMMERCIAL", label: "Commercial (Business)", description: "Buying on behalf of a business" },
  { value: "MOTABILITY", label: "Motability", description: "Motability scheme vehicle" },
];

export default function Step1GetStarted({ data, updateData, goNext, canProceed, teamMembers }) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Get Started</h2>
        <p className="text-slate-500">Enter the basic details for this sale</p>
      </div>

      {/* Advertising Source */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Advertising Source</span>
        </label>
        <select
          value={data.advertisingSource}
          onChange={(e) => updateData("advertisingSource", e.target.value)}
          className="select select-bordered w-full"
        >
          <option value="">Select how the customer found us...</option>
          {ADVERTISING_SOURCES.map((source) => (
            <option key={source.value} value={source.value}>
              {source.label}
            </option>
          ))}
        </select>
      </div>

      {/* Vehicle Use */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Vehicle Use *</span>
        </label>
        <div className="space-y-2">
          {VEHICLE_USE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                data.vehicleUse === option.value
                  ? "border-[#0066CC] bg-blue-50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                name="vehicleUse"
                value={option.value}
                checked={data.vehicleUse === option.value}
                onChange={(e) => updateData("vehicleUse", e.target.value)}
                className="radio radio-primary mt-0.5"
              />
              <div>
                <p className="font-medium text-slate-900">{option.label}</p>
                <p className="text-sm text-slate-500">{option.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Sales Person */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Sales Person</span>
        </label>
        <select
          value={data.salesPersonId}
          onChange={(e) => updateData("salesPersonId", e.target.value)}
          className="select select-bordered w-full"
        >
          <option value="">Select sales person...</option>
          {teamMembers.map((member) => (
            <option key={member.id || member._id} value={member.id || member._id}>
              {member.name}
            </option>
          ))}
        </select>
      </div>

      {/* Flags */}
      <div className="space-y-4 p-4 bg-slate-50 rounded-xl">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={data.isExport}
            onChange={(e) => updateData("isExport", e.target.checked)}
            className="checkbox checkbox-primary mt-0.5"
          />
          <div>
            <p className="font-medium text-slate-900">Export Sale</p>
            <p className="text-sm text-slate-500">This deal is for the export market</p>
          </div>
        </label>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={data.isDistanceSale}
            onChange={(e) => updateData("isDistanceSale", e.target.checked)}
            className="checkbox checkbox-primary mt-0.5"
          />
          <div>
            <p className="font-medium text-slate-900">Distance Sale</p>
            <p className="text-sm text-slate-500">This deal qualifies as a distance sale (online/phone order)</p>
          </div>
        </label>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={data.marketingOptIn}
            onChange={(e) => updateData("marketingOptIn", e.target.checked)}
            className="checkbox checkbox-primary mt-0.5"
          />
          <div>
            <p className="font-medium text-slate-900">Marketing Opt-in</p>
            <p className="text-sm text-slate-500">Customer has agreed to receive marketing communications</p>
          </div>
        </label>
      </div>

      {/* Data Protection */}
      <div className={`p-4 rounded-xl border-2 ${
        data.dataProtectionConfirmed ? "border-emerald-500 bg-emerald-50" : "border-amber-400 bg-amber-50"
      }`}>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={data.dataProtectionConfirmed}
            onChange={(e) => updateData("dataProtectionConfirmed", e.target.checked)}
            className="checkbox checkbox-primary mt-0.5"
          />
          <div>
            <p className="font-medium text-slate-900">Data Protection Statement *</p>
            <p className="text-sm text-slate-600 mt-1">
              I confirm that I have read the data protection statement to the customer and they have acknowledged their rights regarding data processing.
            </p>
          </div>
        </label>
      </div>

      {/* Navigation */}
      <div className="flex justify-end pt-4 border-t border-slate-200">
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
