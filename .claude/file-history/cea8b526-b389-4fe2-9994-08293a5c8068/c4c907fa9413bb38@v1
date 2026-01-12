/**
 * PageShell Component - Consistent page layout wrapper
 *
 * Features:
 * - Sticky header with title and actions
 * - Consistent padding across breakpoints
 * - Mobile-optimized with safe-area support
 * - Prevents horizontal overflow
 *
 * Usage:
 *   <PageShell title="Dashboard" actions={<Button>Add</Button>}>
 *     {content}
 *   </PageShell>
 */

import { useState } from "react";

export function PageShell({
  title,
  subtitle,
  actions,
  children,
  className = "",
  headerClassName = "",
  contentClassName = "",
  showBackButton = false,
  onBack,
  noPadding = false,
}) {
  return (
    <div className={`min-w-0 max-w-full ${className}`}>
      {/* Sticky Header */}
      {(title || actions) && (
        <div className={`sticky top-0 z-20 bg-base-200/95 backdrop-blur-sm -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 py-3 md:py-4 mb-4 border-b border-base-300/50 ${headerClassName}`}>
          <div className="flex items-center justify-between gap-4 min-w-0">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {showBackButton && (
                <button
                  onClick={onBack || (() => window.history.back())}
                  className="btn btn-ghost btn-sm btn-circle flex-shrink-0"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <div className="min-w-0">
                {title && (
                  <h1 className="text-xl md:text-2xl font-bold text-base-content truncate">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="text-sm text-base-content/60 truncate mt-0.5">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            {actions && (
              <div className="flex items-center gap-2 flex-shrink-0">
                {actions}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className={`min-w-0 max-w-full ${noPadding ? "" : ""} ${contentClassName}`}>
        {children}
      </div>
    </div>
  );
}

/**
 * PageSection - Consistent section within a page
 */
export function PageSection({
  title,
  subtitle,
  actions,
  children,
  className = "",
  noPadding = false,
}) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-4 px-4 md:px-6 py-3 md:py-4 border-b border-slate-100">
          <div className="min-w-0">
            {title && (
              <h2 className="text-base md:text-lg font-semibold text-slate-900 truncate">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      )}
      <div className={noPadding ? "" : "p-4 md:p-6"}>
        {children}
      </div>
    </div>
  );
}

/**
 * MobileStageSelector - Dropdown selector for stage/status on mobile
 * Replaces horizontal tabs that can overflow
 */
export function MobileStageSelector({
  stages,
  activeStage,
  onStageChange,
  className = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const activeStageData = stages.find((s) => s.value === activeStage) || stages[0];

  return (
    <div className={`relative ${className}`}>
      {/* Mobile: Dropdown */}
      <div className="md:hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm"
        >
          <div className="flex items-center gap-2 min-w-0">
            {activeStageData.icon && <span>{activeStageData.icon}</span>}
            <span className="font-medium text-slate-900 truncate">
              {activeStageData.label}
            </span>
            {activeStageData.count !== undefined && (
              <span className="px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-600 rounded-full">
                {activeStageData.count}
              </span>
            )}
          </div>
          <svg
            className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown menu */}
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
              {stages.map((stage) => (
                <button
                  key={stage.value}
                  onClick={() => {
                    onStageChange(stage.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-4 py-3 text-left transition-colors ${
                    stage.value === activeStage
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {stage.icon && <span>{stage.icon}</span>}
                    <span className="font-medium truncate">{stage.label}</span>
                  </div>
                  {stage.count !== undefined && (
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                      stage.value === activeStage
                        ? "bg-primary/20 text-primary"
                        : "bg-slate-100 text-slate-600"
                    }`}>
                      {stage.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Desktop: Horizontal tabs with scroll */}
      <div className="hidden md:block">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto scrollbar-hide">
          {stages.map((stage) => (
            <button
              key={stage.value}
              onClick={() => onStageChange(stage.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                stage.value === activeStage
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              {stage.icon && <span>{stage.icon}</span>}
              <span>{stage.label}</span>
              {stage.count !== undefined && (
                <span className={`px-1.5 py-0.5 text-xs font-semibold rounded-full ${
                  stage.value === activeStage
                    ? "bg-primary/10 text-primary"
                    : "bg-slate-200 text-slate-600"
                }`}>
                  {stage.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PageShell;
