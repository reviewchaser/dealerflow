import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useSession, signIn } from "next-auth/react";
import Head from "next/head";
import toast from "react-hot-toast";

// Step indicator component
function StepIndicator({ currentStep, totalSteps }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: totalSteps }, (_, i) => (
        <div key={i} className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
              i + 1 === currentStep
                ? "bg-primary text-primary-content"
                : i + 1 < currentStep
                ? "bg-success text-success-content"
                : "bg-base-300 text-base-content/50"
            }`}
          >
            {i + 1 < currentStep ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              i + 1
            )}
          </div>
          {i < totalSteps - 1 && (
            <div className={`w-12 h-1 mx-1 rounded ${i + 1 < currentStep ? "bg-success" : "bg-base-300"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// Step 1: Dealership Profile
function Step1Profile({ data, onChange, onNext, onSkip }) {
  const [logoPreview, setLogoPreview] = useState(data.logoUrl || null);
  const [uploading, setUploading] = useState(false);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload an image file (PNG, JPEG, WebP, or GIF)");
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 5MB.`);
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/dealer/logo", { method: "POST", body: formData });

      // Check content type
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[Logo Upload] Non-JSON response:", res.status);
        }
        toast.error("Upload failed (LOGO_UPLOAD_SERVER_ERROR)");
        return;
      }

      const data = await res.json();

      if (res.ok) {
        setLogoPreview(data.url);
        onChange({ ...data, logoUrl: data.url });
        toast.success("Logo uploaded!");
      } else {
        // Show the specific error from server
        const errorMsg = data.error || "Failed to upload logo";
        const errorCode = data.code || "UNKNOWN";
        if (process.env.NODE_ENV !== "production") {
          console.error("[Logo Upload] Error:", errorCode, errorMsg, data.details);
        }
        toast.error(`${errorMsg} (${errorCode})`);
      }
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[Logo Upload] Exception:", err);
      }
      toast.error("Upload failed (LOGO_UPLOAD_NETWORK_ERROR)");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-base-content">Welcome to DealerFlow</h2>
        <p className="text-base-content/60 mt-2">Let's get your dealership set up in just a few minutes</p>
      </div>

      <div className="max-w-md mx-auto space-y-4">
        {/* Logo Upload */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">Dealership Logo</span>
            <span className="label-text-alt text-base-content/50">Optional</span>
          </label>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-xl bg-base-200 flex items-center justify-center overflow-hidden border-2 border-dashed border-base-300">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <svg className="w-8 h-8 text-base-content/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
            </div>
            <label className="btn btn-outline btn-sm">
              {uploading ? <span className="loading loading-spinner loading-xs"></span> : "Upload Logo"}
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploading} />
            </label>
          </div>
        </div>

        {/* Dealership Name */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">Dealership Name *</span>
          </label>
          <input
            type="text"
            className="input input-bordered"
            placeholder="e.g. Smith's Motor Company"
            value={data.name || ""}
            onChange={(e) => onChange({ ...data, name: e.target.value })}
          />
        </div>

        {/* Timezone */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">Timezone</span>
          </label>
          <select
            className="select select-bordered"
            value={data.timezone || "Europe/London"}
            onChange={(e) => onChange({ ...data, timezone: e.target.value })}
          >
            <option value="Europe/London">Europe/London (GMT/BST)</option>
            <option value="Europe/Dublin">Europe/Dublin</option>
            <option value="Europe/Paris">Europe/Paris (CET)</option>
          </select>
        </div>

        {/* Contact Details */}
        <div className="divider text-xs text-base-content/50">Contact Details (Optional)</div>

        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">Primary Contact Email</span>
          </label>
          <input
            type="email"
            className="input input-bordered"
            placeholder="contact@yourdealership.com"
            value={data.primaryContactEmail || ""}
            onChange={(e) => onChange({ ...data, primaryContactEmail: e.target.value })}
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">Primary Contact Phone</span>
          </label>
          <input
            type="tel"
            className="input input-bordered"
            placeholder="01onal234 567890"
            value={data.primaryContactPhone || ""}
            onChange={(e) => onChange({ ...data, primaryContactPhone: e.target.value })}
          />
        </div>
      </div>

      <div className="flex justify-between mt-8">
        <button className="btn btn-ghost" onClick={onSkip}>
          Skip for now
        </button>
        <button
          className="btn btn-primary"
          onClick={onNext}
          disabled={!data.name?.trim()}
        >
          Save & Continue
        </button>
      </div>
    </div>
  );
}

// Step 2: Choose Modules
function Step2Modules({ data, onChange, onNext, onSkip, onBack }) {
  const modules = [
    {
      key: "salesPrep",
      name: "Stock & Sales Prep",
      description: "Vehicle stock management, preparation checklists, and issue tracking",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      defaultEnabled: true,
      recommended: true,
    },
    {
      key: "appraisals",
      name: "Appraisals & Buying",
      description: "Part-exchange and dealer buying appraisals — with shareable forms customers can complete from home.",
      tooltip: "Use this for customer PX appraisals, buying stock on the road, or sending a link to a third-party buyer to complete an appraisal.",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      defaultEnabled: true,
      recommended: true,
    },
    {
      key: "warranty",
      name: "Warranty & Aftercare",
      description: "Customer warranty claims, repair tracking, and courtesy car management",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      defaultEnabled: false,
    },
    {
      key: "reviews",
      name: "Reviews & Feedback",
      description: "Request and track customer reviews via email/SMS",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      ),
      defaultEnabled: false,
    },
  ];

  const [enabledModules, setEnabledModules] = useState(
    data.enabledModules || {
      salesPrep: true,
      appraisals: true,
      warranty: false,
      reviews: false,
    }
  );

  const toggleModule = (key) => {
    setEnabledModules({ ...enabledModules, [key]: !enabledModules[key] });
  };

  const handleNext = () => {
    onChange({ ...data, enabledModules });
    onNext();
  };

  const enabledCount = Object.values(enabledModules).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-base-content">Choose Your Modules</h2>
        <p className="text-base-content/60 mt-2">Select the features you want to use. You can change these later in Settings.</p>
      </div>

      <div className="max-w-2xl mx-auto space-y-3">
        {modules.map((module) => (
          <button
            key={module.key}
            onClick={() => toggleModule(module.key)}
            className={`w-full card border-2 transition-all text-left ${
              enabledModules[module.key]
                ? "border-primary bg-primary/5"
                : "border-base-300 bg-base-100 hover:border-base-content/20"
            }`}
          >
            <div className="card-body p-4">
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-lg ${enabledModules[module.key] ? "bg-primary/10 text-primary" : "bg-base-200 text-base-content/50"}`}>
                  {module.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold">{module.name}</h3>
                    {module.recommended && (
                      <span className="badge badge-primary badge-xs">Recommended</span>
                    )}
                    {module.tooltip && (
                      <div className="tooltip tooltip-right" data-tip={module.tooltip}>
                        <svg className="w-4 h-4 text-base-content/40 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-base-content/60 mt-1">{module.description}</p>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  enabledModules[module.key]
                    ? "border-primary bg-primary"
                    : "border-base-300"
                }`}>
                  {enabledModules[module.key] && (
                    <svg className="w-4 h-4 text-primary-content" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="text-center text-sm text-base-content/50 mt-4">
        {enabledCount} module{enabledCount !== 1 ? "s" : ""} selected
      </div>

      <div className="flex justify-between mt-8">
        <button className="btn btn-ghost" onClick={onBack}>
          Back
        </button>
        <div className="flex gap-2">
          <button className="btn btn-ghost" onClick={onSkip}>
            Skip
          </button>
          <button className="btn btn-primary" onClick={handleNext}>
            Save & Continue
          </button>
        </div>
      </div>
    </div>
  );
}

// Step 3: Choose Setup Path
function Step3SetupPath({ onNext, onSkip, onBack }) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-base-content">How would you like to add vehicles?</h2>
        <p className="text-base-content/60 mt-2">Choose how to get your stock into DealerFlow</p>
      </div>

      <div className="grid gap-4 max-w-2xl mx-auto">
        {/* Quick Start - Active */}
        <button
          onClick={onNext}
          className="card bg-base-100 border-2 border-primary shadow-lg hover:shadow-xl transition-all text-left"
        >
          <div className="card-body">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg">Quick Start (Manual)</h3>
                  <span className="badge badge-primary badge-sm">Recommended</span>
                </div>
                <p className="text-base-content/60 text-sm mt-1">
                  Add vehicles manually using VRM lookup. Perfect for getting started quickly.
                </p>
              </div>
              <svg className="w-5 h-5 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </button>

        {/* CSV Import - Coming Soon */}
        <div className="card bg-base-100 border border-base-300 opacity-60 cursor-not-allowed">
          <div className="card-body">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-base-200 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-base-content/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-base-content/50">Import from CSV</h3>
                  <span className="badge badge-ghost badge-sm">Coming Soon</span>
                </div>
                <p className="text-base-content/40 text-sm mt-1">
                  Upload a spreadsheet export from your existing system.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stock Feed - Coming Soon */}
        <div className="card bg-base-100 border border-base-300 opacity-60 cursor-not-allowed">
          <div className="card-body">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-base-200 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-base-content/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-base-content/50">Connect Stock Feed</h3>
                  <span className="badge badge-ghost badge-sm">Coming Soon</span>
                </div>
                <p className="text-base-content/40 text-sm mt-1">
                  Paste a feed URL from your DMS or website provider for automatic sync.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between mt-8">
        <button className="btn btn-ghost" onClick={onBack}>
          Back
        </button>
        <button className="btn btn-ghost" onClick={onSkip}>
          Skip for now
        </button>
      </div>
    </div>
  );
}

// Step 4: Configure Workflow Templates
function Step4Workflow({ data, onChange, onNext, onSkip, onBack }) {
  const defaultTasks = [
    "Pre-Delivery Inspection",
    "MOT",
    "Service / Oil & Filter",
    "Valet",
    "Photos",
    "Advert Live",
    "Delivery / Handover",
  ];

  const [tasks, setTasks] = useState(data.tasks || defaultTasks);
  const [newTask, setNewTask] = useState("");
  const [autoComplete, setAutoComplete] = useState(data.autoCompleteEnabled !== false);

  const addTask = () => {
    if (newTask.trim() && !tasks.includes(newTask.trim())) {
      setTasks([...tasks, newTask.trim()]);
      setNewTask("");
    }
  };

  const removeTask = (index) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const handleNext = () => {
    onChange({ ...data, tasks, autoCompleteEnabled: autoComplete });
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-base-content">Configure Your Workflow</h2>
        <p className="text-base-content/60 mt-2">Set up your default preparation tasks for new vehicles</p>
      </div>

      <div className="max-w-lg mx-auto space-y-6">
        {/* Task List */}
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body">
            <h3 className="font-semibold mb-3">Default Prep Tasks</h3>
            <p className="text-sm text-base-content/60 mb-4">
              These tasks will be automatically created for each new vehicle. Drag to reorder.
            </p>

            <ul className="space-y-2">
              {tasks.map((task, index) => (
                <li
                  key={index}
                  className="flex items-center gap-3 p-3 bg-base-200 rounded-lg"
                >
                  <svg className="w-4 h-4 text-base-content/30 cursor-move" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                  </svg>
                  <span className="flex-1 text-sm">{task}</span>
                  <button
                    className="btn btn-ghost btn-xs text-error"
                    onClick={() => removeTask(index)}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>

            {/* Add Task */}
            <div className="flex gap-2 mt-4">
              <input
                type="text"
                className="input input-bordered input-sm flex-1"
                placeholder="Add custom task..."
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTask()}
              />
              <button className="btn btn-primary btn-sm" onClick={addTask} disabled={!newTask.trim()}>
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Auto-complete Toggle */}
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Auto-complete Tasks</h3>
                <p className="text-sm text-base-content/60 mt-1">
                  Automatically mark tasks complete when forms are submitted
                </p>
              </div>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={autoComplete}
                onChange={(e) => setAutoComplete(e.target.checked)}
              />
            </div>

            {autoComplete && (
              <div className="mt-4 p-3 bg-base-200 rounded-lg">
                <p className="text-xs text-base-content/60 mb-2">Mappings:</p>
                <ul className="text-xs space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="badge badge-ghost badge-xs">PDI Form</span>
                    <span className="text-base-content/40">→</span>
                    <span>Pre-Delivery Inspection</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="badge badge-ghost badge-xs">Delivery Form</span>
                    <span className="text-base-content/40">→</span>
                    <span>Delivery / Handover</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="badge badge-ghost badge-xs">Service Receipt</span>
                    <span className="text-base-content/40">→</span>
                    <span>Service / Oil & Filter</span>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-between mt-8">
        <button className="btn btn-ghost" onClick={onBack}>
          Back
        </button>
        <div className="flex gap-2">
          <button className="btn btn-ghost" onClick={onSkip}>
            Skip
          </button>
          <button className="btn btn-primary" onClick={handleNext}>
            Save & Continue
          </button>
        </div>
      </div>
    </div>
  );
}

// Step 5: Add First Vehicle
function Step5Vehicle({ onComplete, onSkip, onBack }) {
  const [vrm, setVrm] = useState("");
  const [mileage, setMileage] = useState("");
  const [vehicleData, setVehicleData] = useState(null);
  const [lookupError, setLookupError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualData, setManualData] = useState({ make: "", model: "", year: "", colour: "" });

  const handleLookup = async () => {
    if (!vrm.trim()) return;

    setLoading(true);
    setLookupError(null);
    setVehicleData(null);
    setManualMode(false);

    try {
      const res = await fetch("/api/dvla-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleReg: vrm.toUpperCase().replace(/\s/g, "") }),
      });

      if (res.ok) {
        const data = await res.json();
        setVehicleData(data);

        // Check if model is missing from DVLA response
        if (!data.model?.trim()) {
          setManualMode(true);
          setManualData((prev) => ({
            ...prev,
            make: data.make || "",
            model: "", // Need manual entry
            year: data.yearOfManufacture?.toString() || "",
            colour: data.colour || "",
          }));
          setLookupError("DVLA didn't return the model. Please enter it below.");
        }
      } else {
        setLookupError("Could not find vehicle. You can enter details manually.");
        setManualMode(true);
      }
    } catch {
      setLookupError("Lookup failed. You can enter details manually.");
      setManualMode(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    // Build payload: prefer lookup data, but use manual data as fallback/override
    const make = (vehicleData?.make || manualData.make || "").trim();
    const model = (manualData.model || vehicleData?.model || "").trim(); // Manual overrides lookup for model
    const year = manualData.year || vehicleData?.yearOfManufacture || "";
    const colour = manualData.colour || vehicleData?.colour || "";

    // Client-side validation before submit
    if (!make) {
      toast.error("Make is required");
      return;
    }
    if (!model) {
      toast.error("Model is required. Please enter it in the form below.");
      return;
    }

    setCreating(true);

    const payload = {
      vrm: vrm.toUpperCase().replace(/\s/g, ""),
      mileage: mileage ? parseInt(mileage, 10) : null,
      make,
      model,
      year: year ? parseInt(year, 10) : null,
      colour: colour || null,
      fuelType: vehicleData?.fuelType || null,
      transmission: vehicleData?.transmission || null,
    };

    // Debug logging (dev only)
    if (process.env.NODE_ENV !== "production") {
      console.log("[Onboarding Vehicle] Submitting payload:", payload);
    }

    try {
      const res = await fetch("/api/onboarding/vehicle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        console.error("[Onboarding Vehicle] Non-JSON response:", res.status);
        toast.error("Server error (VEHICLE_CREATE_SERVER_ERROR)");
        return;
      }

      const data = await res.json();

      if (res.ok) {
        toast.success("Vehicle created!");
        onComplete(data.vehicleId);
      } else {
        const errorCode = data.code || "UNKNOWN";
        if (process.env.NODE_ENV !== "production") {
          console.error("[Onboarding Vehicle] Error:", errorCode, data.error);
        }
        toast.error(data.error || "Failed to create vehicle");
      }
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[Onboarding Vehicle] Exception:", err);
      }
      toast.error("Error creating vehicle");
    } finally {
      setCreating(false);
    }
  };

  // Determine if we have valid make/model (from lookup or manual entry)
  const effectiveMake = (vehicleData?.make || manualData.make || "").trim();
  const effectiveModel = (manualData.model || vehicleData?.model || "").trim();
  const canCreate = vrm.trim() && effectiveMake && effectiveModel;

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-base-content">Add Your First Vehicle</h2>
        <p className="text-base-content/60 mt-2">Experience the magic of DealerFlow</p>
      </div>

      <div className="max-w-md mx-auto space-y-4">
        {/* VRM Input */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">Vehicle Registration *</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              className="input input-bordered flex-1 uppercase font-mono"
              placeholder="AB12 CDE"
              value={vrm}
              onChange={(e) => setVrm(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
            />
            <button
              className="btn btn-primary"
              onClick={handleLookup}
              disabled={!vrm.trim() || loading}
            >
              {loading ? <span className="loading loading-spinner loading-sm"></span> : "Lookup"}
            </button>
          </div>
        </div>

        {/* Lookup Result */}
        {vehicleData && (
          <div className="card bg-success/10 border border-success/30">
            <div className="card-body p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-semibold text-success">Vehicle Found</span>
              </div>
              {vehicleData.isDummy && (
                <p className="text-xs text-warning mb-2">{vehicleData.message}</p>
              )}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-base-content/50">Make:</span> {vehicleData.make}</div>
                <div><span className="text-base-content/50">Model:</span> {vehicleData.model}</div>
                <div><span className="text-base-content/50">Year:</span> {vehicleData.yearOfManufacture}</div>
                <div><span className="text-base-content/50">Colour:</span> {vehicleData.colour}</div>
                <div><span className="text-base-content/50">Fuel:</span> {vehicleData.fuelType}</div>
                <div><span className="text-base-content/50">MOT:</span> {vehicleData.motStatus}</div>
              </div>
            </div>
          </div>
        )}

        {/* Lookup Error / Manual Mode */}
        {lookupError && (
          <div className="alert alert-warning">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-sm">{lookupError}</span>
          </div>
        )}

        {/* Manual Entry Fields - Full manual entry (no lookup data) */}
        {manualMode && !vehicleData && (
          <div className="space-y-3 p-4 bg-base-200 rounded-lg">
            <p className="text-sm font-medium">Enter vehicle details manually:</p>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                className="input input-bordered input-sm"
                placeholder="Make *"
                value={manualData.make}
                onChange={(e) => setManualData({ ...manualData, make: e.target.value })}
              />
              <input
                type="text"
                className="input input-bordered input-sm"
                placeholder="Model *"
                value={manualData.model}
                onChange={(e) => setManualData({ ...manualData, model: e.target.value })}
              />
              <input
                type="text"
                className="input input-bordered input-sm"
                placeholder="Year"
                value={manualData.year}
                onChange={(e) => setManualData({ ...manualData, year: e.target.value })}
              />
              <input
                type="text"
                className="input input-bordered input-sm"
                placeholder="Colour"
                value={manualData.colour}
                onChange={(e) => setManualData({ ...manualData, colour: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* Model Entry - When lookup succeeded but DVLA didn't return model */}
        {manualMode && vehicleData && !vehicleData.model?.trim() && (
          <div className="space-y-3 p-4 bg-warning/10 border border-warning/30 rounded-lg">
            <p className="text-sm font-medium">Enter model:</p>
            <input
              type="text"
              className="input input-bordered input-sm w-full"
              placeholder="Model (e.g. Focus, Golf, A3) *"
              value={manualData.model}
              onChange={(e) => setManualData({ ...manualData, model: e.target.value })}
              autoFocus
            />
          </div>
        )}

        {/* Mileage (Optional) */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">Current Mileage</span>
            <span className="label-text-alt text-base-content/50">Optional</span>
          </label>
          <input
            type="number"
            className="input input-bordered"
            placeholder="e.g. 45000"
            value={mileage}
            onChange={(e) => setMileage(e.target.value)}
          />
        </div>

        {/* Create Button */}
        {(vehicleData || manualMode) && (
          <button
            className="btn btn-primary btn-block mt-4"
            onClick={handleCreate}
            disabled={!canCreate || creating}
          >
            {creating ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Creating...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Vehicle & Finish Setup
              </>
            )}
          </button>
        )}

        {/* Tip */}
        <div className="text-center mt-6">
          <p className="text-xs text-base-content/50 italic">
            Tip: When you submit a PDI form, the PDI task ticks automatically.
          </p>
        </div>
      </div>

      <div className="flex justify-between mt-8">
        <button className="btn btn-ghost" onClick={onBack}>
          Back
        </button>
        <button className="btn btn-ghost" onClick={() => onComplete(null)}>
          Skip & Finish Later
        </button>
      </div>
    </div>
  );
}

// Main Onboarding Component
export default function Onboarding() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dealer, setDealer] = useState(null);
  const [profileData, setProfileData] = useState({});
  const [modulesData, setModulesData] = useState({
    enabledModules: {
      salesPrep: true,
      appraisals: true,
      warranty: false,
      reviews: false,
    },
  });
  const [workflowData, setWorkflowData] = useState({});

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      signIn(undefined, { callbackUrl: "/onboarding" });
    }
  }, [status]);

  // Check if already onboarded (only when authenticated)
  useEffect(() => {
    if (status !== "authenticated") return;

    fetch("/api/dealer")
      .then((res) => res.json())
      .then((data) => {
        if (data?.completedOnboarding) {
          router.replace("/dashboard");
        } else {
          setDealer(data);
          setProfileData({
            name: data?.name || "",
            logoUrl: data?.logoUrl || "",
            timezone: data?.timezone || "Europe/London",
            primaryContactEmail: data?.primaryContactEmail || data?.email || "",
            primaryContactPhone: data?.primaryContactPhone || data?.phone || "",
          });
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, [router, status]);

  const handleSkip = async () => {
    setSaving(true);
    try {
      await fetch("/api/onboarding/skip", { method: "POST" });
      router.push("/dashboard");
    } catch {
      toast.error("Failed to skip onboarding");
      setSaving(false);
    }
  };

  const handleStep1Next = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/onboarding/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData),
      });
      if (res.ok) {
        setStep(2);
      } else {
        toast.error("Failed to save profile");
      }
    } catch {
      toast.error("Error saving profile");
    } finally {
      setSaving(false);
    }
  };

  const handleStep2Next = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/onboarding/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modulesData),
      });
      if (res.ok) {
        setStep(3);
      } else {
        toast.error("Failed to save modules");
      }
    } catch {
      toast.error("Error saving modules");
    } finally {
      setSaving(false);
    }
  };

  const handleStep4Next = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/onboarding/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(workflowData),
      });
      if (res.ok) {
        setStep(5);
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to save workflow");
        console.error("[onboarding] Workflow save failed:", data);
      }
    } catch (err) {
      toast.error("Error saving workflow");
      console.error("[onboarding] Workflow save error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async (vehicleId) => {
    setSaving(true);
    try {
      await fetch("/api/onboarding/complete", { method: "POST" });

      if (vehicleId) {
        router.push(`/sales-prep?vehicle=${vehicleId}&drawer=open`);
      } else {
        router.push("/dashboard");
      }
    } catch {
      toast.error("Failed to complete onboarding");
      setSaving(false);
    }
  };

  // Show loading while checking auth or loading data
  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Setup | DealerFlow</title>
      </Head>

      <div className="min-h-screen bg-base-200 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
              <span className="text-xl font-bold">DealerFlow</span>
            </div>
          </div>

          {/* Step Indicator */}
          <StepIndicator currentStep={step} totalSteps={5} />

          {/* Card */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body p-6 md:p-8">
              {saving && (
                <div className="absolute inset-0 bg-base-100/80 flex items-center justify-center z-10 rounded-2xl">
                  <span className="loading loading-spinner loading-lg text-primary"></span>
                </div>
              )}

              {step === 1 && (
                <Step1Profile
                  data={profileData}
                  onChange={setProfileData}
                  onNext={handleStep1Next}
                  onSkip={handleSkip}
                />
              )}

              {step === 2 && (
                <Step2Modules
                  data={modulesData}
                  onChange={setModulesData}
                  onNext={handleStep2Next}
                  onSkip={() => setStep(3)}
                  onBack={() => setStep(1)}
                />
              )}

              {step === 3 && (
                <Step3SetupPath
                  onNext={() => setStep(4)}
                  onSkip={handleSkip}
                  onBack={() => setStep(2)}
                />
              )}

              {step === 4 && (
                <Step4Workflow
                  data={workflowData}
                  onChange={setWorkflowData}
                  onNext={handleStep4Next}
                  onSkip={() => setStep(5)}
                  onBack={() => setStep(3)}
                />
              )}

              {step === 5 && (
                <Step5Vehicle
                  onComplete={handleComplete}
                  onSkip={() => handleComplete(null)}
                  onBack={() => setStep(4)}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
