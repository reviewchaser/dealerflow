/**
 * Badge Component - Status pills and chips
 * Usage:
 *   <Badge variant="success">Active</Badge>
 *   <Badge variant="warning" size="lg">Pending</Badge>
 */

const VARIANTS = {
  // Neutral
  default: "bg-slate-100 text-slate-700 border-slate-200",
  secondary: "bg-slate-50 text-slate-600 border-slate-200",

  // Semantic
  success: "bg-emerald-100 text-emerald-700 border-emerald-200",
  warning: "bg-amber-100 text-amber-700 border-amber-200",
  danger: "bg-red-100 text-red-700 border-red-200",
  info: "bg-blue-100 text-blue-700 border-blue-200",

  // Brand
  primary: "bg-violet-100 text-violet-700 border-violet-200",
  accent: "bg-cyan-100 text-cyan-700 border-cyan-200",

  // Special
  outline: "bg-transparent text-slate-600 border-slate-300",
  ghost: "bg-transparent text-slate-500 border-transparent",
};

const SIZES = {
  xs: "px-1.5 py-0.5 text-[10px]",
  sm: "px-2 py-0.5 text-xs",
  default: "px-2.5 py-1 text-xs",
  lg: "px-3 py-1.5 text-sm",
};

export function Badge({
  children,
  variant = "default",
  size = "default",
  dot = false,
  dotColor,
  icon,
  className = "",
  ...props
}) {
  const dotColors = {
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-red-500",
    info: "bg-blue-500",
    primary: "bg-violet-500",
    default: "bg-slate-500",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold border capitalize ${VARIANTS[variant] || VARIANTS.default} ${SIZES[size] || SIZES.default} ${className}`}
      {...props}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors[dotColor || variant] || dotColors.default}`} />
      )}
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  );
}

/**
 * StatusBadge - Pre-configured badges for common statuses
 */
export function StatusBadge({ status, size = "default" }) {
  const statusConfig = {
    // General
    active: { variant: "success", label: "Active" },
    inactive: { variant: "secondary", label: "Inactive" },
    pending: { variant: "warning", label: "Pending" },
    completed: { variant: "success", label: "Completed" },
    cancelled: { variant: "danger", label: "Cancelled" },

    // Vehicle
    in_stock: { variant: "success", label: "In Stock" },
    in_prep: { variant: "warning", label: "In Prep" },
    live: { variant: "info", label: "Live" },
    sold: { variant: "primary", label: "Sold" },
    delivered: { variant: "success", label: "Delivered" },

    // Warranty
    not_booked_in: { variant: "warning", label: "Not Booked" },
    booked_in: { variant: "info", label: "Booked In" },
    on_site: { variant: "primary", label: "On Site" },
    work_complete: { variant: "success", label: "Complete" },
    collected: { variant: "success", label: "Collected" },

    // Priority
    low: { variant: "secondary", label: "Low" },
    normal: { variant: "default", label: "Normal" },
    high: { variant: "warning", label: "High" },
    critical: { variant: "danger", label: "Critical" },

    // Issues
    outstanding: { variant: "danger", label: "Outstanding" },
    ordered: { variant: "warning", label: "Ordered" },
    in_progress: { variant: "info", label: "In Progress" },
    resolved: { variant: "success", label: "Resolved" },
  };

  const normalizedStatus = status?.toLowerCase().replace(/\s+/g, "_");
  const config = statusConfig[normalizedStatus] || { variant: "default", label: status };

  return (
    <Badge variant={config.variant} size={size}>
      {config.label}
    </Badge>
  );
}

export default Badge;
