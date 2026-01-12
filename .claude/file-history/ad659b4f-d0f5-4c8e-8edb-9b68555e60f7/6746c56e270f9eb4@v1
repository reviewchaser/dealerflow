export default function StatsCard({ title, value, subtitle, trend, icon, color = "primary" }) {
  // Left border colors
  const borderColors = {
    primary: "border-l-blue-500",
    secondary: "border-l-indigo-500",
    accent: "border-l-cyan-500",
    success: "border-l-emerald-500",
    warning: "border-l-orange-500",
    error: "border-l-red-500",
    info: "border-l-yellow-500",
  };

  // Watermark icon colors (subtle)
  const watermarkColors = {
    primary: "text-blue-900",
    secondary: "text-indigo-900",
    accent: "text-cyan-900",
    success: "text-emerald-900",
    warning: "text-orange-900",
    error: "text-red-900",
    info: "text-yellow-900",
  };

  return (
    <div className={`relative bg-white shadow-sm hover:shadow-lg rounded-2xl p-6 border-l-4 ${borderColors[color]} transition-shadow overflow-hidden`}>
      {/* Watermark Icon - Large, Subtle */}
      {icon && (
        <div className={`absolute top-4 right-4 opacity-[0.07] w-14 h-14 ${watermarkColors[color]}`}>
          <span className="text-6xl">{icon}</span>
        </div>
      )}

      <div className="relative z-10">
        {/* Label - Uppercase, Tracking Wide */}
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{title}</p>

        {/* Number - Extra Large */}
        <p className="text-4xl font-extrabold text-slate-900">{value}</p>

        {/* Trend/Subtitle */}
        {trend && (
          <p className="text-sm text-slate-500 mt-2 font-medium">{trend}</p>
        )}
        {subtitle && !trend && (
          <p className="text-sm text-slate-500 mt-2">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
