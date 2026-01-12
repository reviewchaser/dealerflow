/**
 * Card Component - Reusable carded layout system
 * Usage:
 *   <Card>
 *     <CardHeader title="Section Title" action={<button>...</button>} />
 *     <CardContent>{children}</CardContent>
 *   </Card>
 */

export function Card({ children, className = "", variant = "default", ...props }) {
  const variants = {
    default: "bg-white border border-slate-200 shadow-sm",
    accent: "bg-[#0066CC]/5 border-2 border-[#0066CC]/20",
    success: "bg-emerald-50/50 border-2 border-emerald-200",
    warning: "bg-amber-50/50 border-2 border-amber-200",
    danger: "bg-red-50/50 border-2 border-red-200",
    ghost: "bg-slate-50 border border-slate-100",
  };

  return (
    <div
      className={`rounded-xl overflow-hidden ${variants[variant] || variants.default} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  icon,
  action,
  badge,
  className = "",
  variant = "default"
}) {
  const variants = {
    default: "bg-white border-b border-slate-100",
    accent: "bg-[#0066CC]/10 border-b border-[#0066CC]/20",
    success: "bg-emerald-100/50 border-b border-emerald-200",
    warning: "bg-amber-100/50 border-b border-amber-200",
    danger: "bg-red-100/50 border-b border-red-200",
    ghost: "border-b border-slate-100",
  };

  return (
    <div className={`px-4 py-3 flex items-center justify-between gap-3 ${variants[variant] || variants.default} ${className}`}>
      <div className="flex items-center gap-2 min-w-0">
        {icon && <span className="text-lg flex-shrink-0">{icon}</span>}
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900 truncate">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 truncate">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {badge}
        {action}
      </div>
    </div>
  );
}

export function CardContent({ children, className = "", noPadding = false }) {
  return (
    <div className={noPadding ? className : `p-4 ${className}`}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = "" }) {
  return (
    <div className={`px-4 py-3 border-t border-slate-100 bg-slate-50/50 ${className}`}>
      {children}
    </div>
  );
}

export default Card;
