export default function StatsCard({ title, value, subtitle, trend, icon, color = "primary" }) {
  // Soft semantic circle background colors
  const circleStyles = {
    primary: "bg-blue-50 text-blue-600",
    secondary: "bg-indigo-50 text-indigo-600",
    accent: "bg-purple-50 text-purple-600",
    success: "bg-emerald-50 text-emerald-600",
    warning: "bg-amber-50 text-amber-600",
    error: "bg-red-50 text-red-600",
    info: "bg-amber-50 text-amber-600",
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
  };

  return (
    <div className="bg-white shadow-sm hover:shadow-md rounded-2xl p-5 transition-all">
      <div className="flex items-center justify-between">
        {/* Left: Text Content */}
        <div className="flex-1 min-w-0">
          {/* Label */}
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>

          {/* Value */}
          <p className="text-3xl font-bold text-slate-900 tracking-tight">{value}</p>

          {/* Trend/Subtitle */}
          {trend && (
            <p className="text-xs font-medium text-emerald-600 mt-1">{trend}</p>
          )}
          {subtitle && !trend && (
            <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
          )}
        </div>

        {/* Right: Circular Icon */}
        {icon && (
          <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ml-4 ${circleStyles[color]}`}>
            {icons[icon] || <span className="text-xl">{icon}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
