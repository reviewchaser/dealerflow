/**
 * SectionTitle Component - Consistent section headers
 * Usage:
 *   <SectionTitle>Customer Details</SectionTitle>
 *   <SectionTitle icon="📋" action={<Button>Add</Button>}>Forms</SectionTitle>
 */

export function SectionTitle({
  children,
  icon,
  action,
  subtitle,
  className = "",
  size = "default",
}) {
  const sizes = {
    sm: "text-xs",
    default: "text-sm",
    lg: "text-base",
  };

  return (
    <div className={`flex items-center justify-between gap-2 mb-3 ${className}`}>
      <div className="flex items-center gap-2 min-w-0">
        {icon && <span className="flex-shrink-0">{icon}</span>}
        <div className="min-w-0">
          <h3 className={`${sizes[size] || sizes.default} font-bold text-slate-700 uppercase tracking-wide`}>
            {children}
          </h3>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

export default SectionTitle;
