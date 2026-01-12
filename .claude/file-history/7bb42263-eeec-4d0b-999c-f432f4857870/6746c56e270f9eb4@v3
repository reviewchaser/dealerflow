export default function StatsCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  color = "primary",
  variant = "default" // "default", "gradient", "outlined"
}) {
  // Gradient backgrounds for each color
  const gradientStyles = {
    primary: "bg-gradient-to-br from-[#0066CC] to-[#0EA5E9]",
    secondary: "bg-gradient-to-br from-[#14B8A6] to-[#06B6D4]",
    accent: "bg-gradient-to-br from-[#0EA5E9] to-[#38BDF8]",
    success: "bg-gradient-to-br from-emerald-500 to-emerald-400",
    warning: "bg-gradient-to-br from-amber-500 to-amber-400",
    error: "bg-gradient-to-br from-red-500 to-red-400",
    info: "bg-gradient-to-br from-cyan-500 to-cyan-400",
  };

  // Icon container colors for default/outlined variants
  const iconContainerStyles = {
    primary: "bg-[#0066CC]/10 text-[#0066CC]",
    secondary: "bg-[#14B8A6]/10 text-[#14B8A6]",
    accent: "bg-[#0EA5E9]/10 text-[#0EA5E9]",
    success: "bg-emerald-100 text-emerald-600",
    warning: "bg-amber-100 text-amber-600",
    error: "bg-red-100 text-red-600",
    info: "bg-cyan-100 text-cyan-600",
  };

  // Border accent colors for outlined variant
  const borderAccentStyles = {
    primary: "border-l-[#0066CC]",
    secondary: "border-l-[#14B8A6]",
    accent: "border-l-[#0EA5E9]",
    success: "border-l-emerald-500",
    warning: "border-l-amber-500",
    error: "border-l-red-500",
    info: "border-l-cyan-500",
  };

  // Icon SVGs for each type
  const icons = {
    "🚗": (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8m-8 4h8m-8 4h4m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    "📋": (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    "✨": (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
    "⭐": (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
    "🏆": (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
    "📢": (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
    ),
    "car": (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8m-8 4h8m-8 4h4m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    "chart": (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    "check": (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    "alert": (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    "trending": (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  };

  // Gradient variant - colored background with white text
  if (variant === "gradient") {
    return (
      <div className={`${gradientStyles[color]} rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all duration-200`}>
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white/80 mb-1">{title}</p>
            <p className="text-3xl font-bold text-white tracking-tight">{value}</p>
            {trend && (
              <p className="text-xs font-medium text-white/90 mt-1.5 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                {trend}
              </p>
            )}
            {subtitle && !trend && (
              <p className="text-xs text-white/70 mt-1.5">{subtitle}</p>
            )}
          </div>
          {icon && (
            <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 ml-4 text-white">
              {icons[icon] || <span className="text-2xl">{icon}</span>}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Outlined variant - white background with colored left border
  if (variant === "outlined") {
    return (
      <div className={`bg-white border-l-4 ${borderAccentStyles[color]} rounded-2xl p-5 shadow-md hover:shadow-lg transition-all duration-200`}>
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
            <p className="text-3xl font-bold text-slate-900 tracking-tight">{value}</p>
            {trend && (
              <p className="text-xs font-medium text-[#0066CC] mt-1.5 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                {trend}
              </p>
            )}
            {subtitle && !trend && (
              <p className="text-xs text-slate-500 mt-1.5">{subtitle}</p>
            )}
          </div>
          {icon && (
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ml-4 ${iconContainerStyles[color]}`}>
              {icons[icon] || <span className="text-2xl">{icon}</span>}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default variant - elevated white card
  return (
    <div className="bg-white rounded-2xl p-5 shadow-md hover:shadow-lg border border-slate-100/50 transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-slate-900 tracking-tight">{value}</p>
          {trend && (
            <p className="text-xs font-medium text-[#0066CC] mt-1.5 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              {trend}
            </p>
          )}
          {subtitle && !trend && (
            <p className="text-xs text-slate-500 mt-1.5">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ml-4 ${iconContainerStyles[color]}`}>
            {icons[icon] || <span className="text-2xl">{icon}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
