/**
 * KeyValue Component - Consistent display for labeled values
 * Usage:
 *   <KeyValue label="Mileage" value="45,000 mi" />
 *   <KeyValue label="Status" value={<Badge variant="success">Active</Badge>} />
 */

export function KeyValue({
  label,
  value,
  className = "",
  size = "default",
  direction = "vertical",
  mono = false,
}) {
  const sizes = {
    sm: {
      label: "text-[10px]",
      value: "text-sm",
    },
    default: {
      label: "text-xs",
      value: "text-base",
    },
    lg: {
      label: "text-xs",
      value: "text-lg",
    },
  };

  const sizeConfig = sizes[size] || sizes.default;

  if (direction === "horizontal") {
    return (
      <div className={`flex items-center justify-between gap-2 ${className}`}>
        <span className={`${sizeConfig.label} font-medium text-slate-500 uppercase tracking-wide`}>
          {label}
        </span>
        <span className={`${sizeConfig.value} font-semibold text-slate-900 ${mono ? "font-mono" : ""}`}>
          {value ?? "—"}
        </span>
      </div>
    );
  }

  return (
    <div className={className}>
      <span className={`${sizeConfig.label} font-medium text-slate-500 uppercase tracking-wide block mb-0.5`}>
        {label}
      </span>
      <span className={`${sizeConfig.value} font-semibold text-slate-900 ${mono ? "font-mono" : ""}`}>
        {value ?? "—"}
      </span>
    </div>
  );
}

/**
 * KeyValueGrid - Grid layout for multiple KeyValue items
 */
export function KeyValueGrid({ children, cols = 2, className = "" }) {
  const colClasses = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
  };

  return (
    <div className={`grid ${colClasses[cols] || "grid-cols-2"} gap-x-4 gap-y-3 ${className}`}>
      {children}
    </div>
  );
}

export default KeyValue;
