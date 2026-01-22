import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { signOut } from "next-auth/react";
import { useDealer } from "@/contexts/DealerContext";
import { appPath } from "@/libs/appPath";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Portal } from "@/components/ui/Portal";
import HelpChat from "@/components/HelpChat";

// Human-readable form type labels
const FORM_TYPE_LABELS = {
  PDI: "PDI",
  TEST_DRIVE: "Test Drive",
  WARRANTY_CLAIM: "Aftersales Issue",
  COURTESY_OUT: "Courtesy Out",
  COURTESY_IN: "Courtesy In",
  SERVICE_RECEIPT: "Service",
  REVIEW_FEEDBACK: "Feedback",
  OTHER: "Other",
};

// Customer-facing forms that should NOT appear in internal quick add menus
const CUSTOMER_FACING_FORM_TYPES = ["WARRANTY_CLAIM"];

// Purpose-led icons for each form type (rounded, modern, single-weight)
const FormTypeIcon = ({ type, className = "w-5 h-5" }) => {
  const icons = {
    PDI: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    TEST_DRIVE: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" strokeWidth={1.5} />
        <circle cx="12" cy="12" r="3" strokeWidth={1.5} />
        <path strokeLinecap="round" strokeWidth={1.5} d="M12 3v6M12 15v6M3 12h6M15 12h6" />
      </svg>
    ),
    COURTESY_OUT: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 17a2 2 0 100-4 2 2 0 000 4zM16 17a2 2 0 100-4 2 2 0 000 4z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 13V11a1 1 0 011-1h2l2-3h6l2 3h2a1 1 0 011 1v2M6 13h12M17 6l3 3m0 0l-3 3m3-3H13" />
      </svg>
    ),
    COURTESY_IN: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 17a2 2 0 100-4 2 2 0 000 4zM16 17a2 2 0 100-4 2 2 0 000 4z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 13V11a1 1 0 011-1h2l2-3h6l2 3h2a1 1 0 011 1v2M6 13h12M13 6l-3 3m0 0l3 3m-3-3h7" />
      </svg>
    ),
    SERVICE_RECEIPT: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    REVIEW_FEEDBACK: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
    DELIVERY: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
      </svg>
    ),
    DEFAULT: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  };
  return icons[type] || icons.DEFAULT;
};

// Icon components (using inline SVG as heroicons alternative)
const ChartBarIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
);

const TruckIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
  </svg>
);

const WrenchIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
  </svg>
);

const ClipboardIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
  </svg>
);

const DocumentTextIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);

const StarIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
  </svg>
);

const CalendarIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
  </svg>
);

const ClockIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const SunIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
  </svg>
);

const UsersIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
);

const CogIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const CurrencyPoundIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.121 7.629A3 3 0 009.017 9.43c0 1.886.784 3.451 1.66 4.692.877 1.242 1.866 2.217 2.477 2.825H6.75v2.304h10.5v-2.304H15m0-9a3 3 0 00-3-3m0 0V3m0 3v.75M6 12h6" />
  </svg>
);

const ChevronDownIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

// Navigation structure with permission requirements:
// - section: "main" | "management" | "hr" | "system"
// - requiresPermission: "sales" | "workshop" | "admin" | null (null = everyone)
// Book icon for Stock Book
const BookOpenIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
  </svg>
);

const navigation = [
  // Main Section
  { name: "Dashboard", href: "/dashboard", Icon: ChartBarIcon, section: "main" },
  { name: "Stock Book", href: "/stock-book", Icon: BookOpenIcon, requiresPermission: "sales", section: "main" },
  { name: "Vehicle Prep", href: "/prep", Icon: TruckIcon, section: "main" },
  { name: "Sales", href: "/sales", Icon: CurrencyPoundIcon, requiresPermission: "sales", section: "main" },
  { name: "Aftersales", href: "/aftersales", Icon: WrenchIcon, section: "main" },
  // Management Section
  { name: "Appraisals", href: "/appraisals", Icon: ClipboardIcon, section: "management" },
  { name: "Contacts", href: "/contacts", Icon: UsersIcon, requiresPermission: "sales", section: "management" },
  { name: "Reports", href: "/reports", Icon: ChartBarIcon, requiresPermission: "admin", section: "management" },
  { name: "Forms & Records", href: "/forms", Icon: DocumentTextIcon, section: "management" },
  { name: "Reviews", href: "/reviews", Icon: StarIcon, section: "management" },
  { name: "Calendar", href: "/calendar", Icon: CalendarIcon, section: "management" },
  // HR Section
  { name: "Holidays", href: "/holidays", Icon: SunIcon, section: "hr" },
  { name: "Overtime", href: "/overtime", Icon: ClockIcon, section: "hr" },
  // System Section
  { name: "Settings", href: "/settings", Icon: CogIcon, requiresPermission: "admin", section: "system" },
];

// Role permission mapping (client-side version of ROLE_PERMISSIONS)
const CLIENT_ROLE_PERMISSIONS = {
  OWNER: { sales: true, workshop: true, admin: true },
  ADMIN: { sales: true, workshop: true, admin: true },
  SALES: { sales: true, workshop: false, admin: false },
  STAFF: { sales: false, workshop: true, admin: false },
  WORKSHOP: { sales: false, workshop: true, admin: false },
  VIEWER: { sales: true, workshop: true, admin: false },
};

// Check if role has permission
const hasClientPermission = (role, permission) => {
  return CLIENT_ROLE_PERMISSIONS[role]?.[permission] ?? false;
};

// Check if a nav item is active (exact match or path segment match)
// This prevents /sales from matching /prep
const isNavItemActive = (pathname, asPath, href) => {
  // Extract the page part from pathname for tenant-aware routes
  // /app/[slug]/prep -> /prep
  // /prep -> /prep
  const normalizedPath = pathname.replace(/^\/app\/[^/]+/, '');
  const normalizedAsPath = asPath.replace(/^\/app\/[^/]+/, '');

  // Exact match
  if (normalizedPath === href) return true;

  // Path starts with href followed by "/" (sub-route)
  if (normalizedPath.startsWith(href + '/')) return true;

  // Also check asPath for dynamic routes
  if (normalizedAsPath === href) return true;
  if (normalizedAsPath.startsWith(href + '/')) return true;

  return false;
};

// Cache key for logo URL in localStorage
const LOGO_CACHE_KEY = "dealerflow_logo_url";
const DEALER_NAME_CACHE_KEY = "dealerflow_dealer_name";

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const { dealerSlug } = useDealer(); // Get dealer slug from tenant context (null if legacy route)
  const getPath = (path) => appPath(dealerSlug, path); // Helper to generate tenant-aware paths
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({});
  const [forms, setForms] = useState([]);

  // Auto-expand menus based on current path
  useEffect(() => {
    navigation.forEach((item) => {
      if (item.children && router.pathname.startsWith(item.href)) {
        setExpandedMenus((prev) => ({ ...prev, [item.name]: true }));
      }
    });
  }, [router.pathname]);
  const [dealer, setDealer] = useState(null);
  const [dealerLoading, setDealerLoading] = useState(true);
  const [userRole, setUserRole] = useState(null); // User's membership role (OWNER, ADMIN, SALES, etc.)
  const [cachedLogo, setCachedLogo] = useState(null);
  const [cachedName, setCachedName] = useState(null);
  const [debugContext, setDebugContext] = useState(null);
  const [debugPanelOpen, setDebugPanelOpen] = useState(false);
  const [showMobileQuickAdd, setShowMobileQuickAdd] = useState(false);
  const [showDesktopQuickAdd, setShowDesktopQuickAdd] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const quickAddButtonRef = useRef(null);
  const quickAddMenuRef = useRef(null);

  // Load cached logo immediately on mount (before API call)
  useEffect(() => {
    try {
      const storedLogo = localStorage.getItem(LOGO_CACHE_KEY);
      const storedName = localStorage.getItem(DEALER_NAME_CACHE_KEY);
      if (storedLogo) setCachedLogo(storedLogo);
      if (storedName) setCachedName(storedName);
    } catch {
      // localStorage not available
    }
  }, []);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Click outside handler for desktop quick add dropdown
  useEffect(() => {
    if (!showDesktopQuickAdd) return;

    const handleClickOutside = (e) => {
      if (
        quickAddButtonRef.current &&
        !quickAddButtonRef.current.contains(e.target) &&
        quickAddMenuRef.current &&
        !quickAddMenuRef.current.contains(e.target)
      ) {
        setShowDesktopQuickAdd(false);
      }
    };

    const handleEscape = (e) => {
      if (e.key === "Escape") {
        setShowDesktopQuickAdd(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showDesktopQuickAdd]);

  // Load sidebar collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    if (saved !== null) {
      setSidebarCollapsed(JSON.parse(saved));
    }
  }, []);

  // Save sidebar collapsed state to localStorage
  const toggleSidebarCollapsed = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem("sidebarCollapsed", JSON.stringify(newState));
  };

  // Keyboard shortcut: [ or Ctrl+B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "[" || (e.ctrlKey && e.key === "b")) {
        e.preventDefault();
        toggleSidebarCollapsed();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sidebarCollapsed]);

  // Dev-only: fetch debug context
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      fetch("/api/debug/context")
        .then(res => {
          const contentType = res.headers.get("content-type") || "";
          if (!contentType.includes("application/json")) return null;
          return res.json();
        })
        .then(data => {
          if (data) setDebugContext(data);
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    // Load forms for the quick add dropdown
    fetch("/api/forms")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setForms(data);
      })
      .catch(() => {});

    // Load dealer for logo and check onboarding status
    fetch("/api/dealer")
      .then(async (res) => {
        // 403 = no dealer membership - redirect to create dealer
        if (res.status === 403 && !router.pathname.startsWith("/onboarding")) {
          router.push(getPath("/onboarding/create-dealer"));
          return null;
        }
        if (!res.ok) return null;
        return res.json();
      })
      .then(async (data) => {
        setDealerLoading(false);
        if (!data) return;

        // If dealer has a logo key, fetch a fresh signed URL (existing URL may be expired)
        if (data.logoKey) {
          try {
            const logoRes = await fetch("/api/dealer/logo");
            if (logoRes.ok) {
              const logoData = await logoRes.json();
              data.logoUrl = logoData.url; // Use fresh signed URL
            }
          } catch {
            // Keep existing logoUrl if refresh fails
          }
        }

        setDealer(data);

        // Store user's role for permission filtering
        if (data.currentUserRole) {
          setUserRole(data.currentUserRole);
        }

        // Cache logo URL for instant display on next load
        try {
          if (data.logoUrl) {
            localStorage.setItem(LOGO_CACHE_KEY, data.logoUrl);
          } else {
            localStorage.removeItem(LOGO_CACHE_KEY);
          }
          if (data.name) {
            localStorage.setItem(DEALER_NAME_CACHE_KEY, data.name);
          }
        } catch {
          // localStorage not available
        }

        // Redirect to onboarding wizard if not completed (skip if already on onboarding page)
        if (data && !data.completedOnboarding && !router.pathname.startsWith("/onboarding")) {
          router.push(getPath("/onboarding"));
        }
      })
      .catch(() => {
        setDealerLoading(false);
      });
  }, [router]);

  const handleFormClick = (form) => {
    if (form.isPublic && form.publicSlug) {
      window.open(`/public/forms/${form.publicSlug}`, '_blank');
    } else {
      router.push(`/forms/fill/${form.id || form._id}`);
    }
  };

  // Filter navigation based on user's role permissions
  const filteredNavigation = navigation.filter((item) => {
    // If no permission required, show to everyone
    if (!item.requiresPermission) return true;
    // If role hasn't loaded yet, show all items (will re-filter when role loads)
    if (!userRole) return true;
    // Check if user's role has the required permission
    return hasClientPermission(userRole, item.requiresPermission);
  });

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar - Modern design with brand colors */}
      <aside
        className={`fixed top-0 left-0 z-50 bg-white border-r border-slate-100 shadow-sm transform transition-all duration-300 ease-in-out lg:translate-x-0 flex flex-col ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} ${sidebarCollapsed ? "lg:w-16" : "lg:w-64"} w-64`}
        style={{
          height: "100dvh",
          maxHeight: "100dvh",
        }}
      >
        {/* Mobile close button */}
        <div className="flex items-center justify-end h-12 px-4 lg:hidden">
          <button className="text-base-content/50 hover:text-base-content hover:bg-base-200 rounded-lg p-2 transition-colors" onClick={() => setSidebarOpen(false)}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Logo Area - Dealer's Logo takes prominence */}
        <div className={`flex flex-col items-center transition-all duration-300 ${sidebarCollapsed ? "p-3" : "p-6"}`}>
          <Link href={getPath("/dashboard")} className="block">
            {(() => {
              // Use dealer logo if loaded, otherwise use cached logo
              const logoUrl = dealer?.logoUrl || cachedLogo;
              const displayName = dealer?.name || cachedName;

              if (logoUrl) {
                return (
                  <img
                    src={logoUrl}
                    alt={displayName || "Logo"}
                    className={`object-contain transition-all duration-300 ${sidebarCollapsed ? "max-h-8 w-8" : "max-h-16 w-auto mx-auto"}`}
                  />
                );
              }

              // Show loading placeholder while fetching dealer (only if no cached logo)
              if (dealerLoading && !cachedLogo) {
                return (
                  <div className={`flex items-center ${sidebarCollapsed ? "justify-center" : "gap-2"}`}>
                    <div className={`animate-pulse bg-slate-200 rounded-lg transition-all duration-300 ${sidebarCollapsed ? "w-8 h-8" : "w-8 h-8"}`} />
                    {!sidebarCollapsed && <div className="animate-pulse bg-slate-200 rounded h-6 w-24" />}
                  </div>
                );
              }

              // No logo - show text fallback (only after loading complete)
              return (
                <div className={`flex items-center ${sidebarCollapsed ? "justify-center" : "gap-2"}`}>
                  <TruckIcon className={`text-primary transition-all duration-300 ${sidebarCollapsed ? "w-6 h-6" : "w-8 h-8"}`} />
                  {!sidebarCollapsed && <span className="text-xl font-bold text-base-content">{displayName || "DealerHQ"}</span>}
                </div>
              );
            })()}
          </Link>
        </div>

        {/* Navigation - Scrollable with proper mobile safari support */}
        <nav
          className={`flex-1 mt-2 ${sidebarCollapsed ? "px-2" : "px-3"} overflow-y-auto overflow-x-hidden overscroll-contain min-h-0`}
          style={{
            WebkitOverflowScrolling: "touch",
            paddingBottom: "env(safe-area-inset-bottom, 16px)",
          }}
        >
          {/* Main Section */}
          {!sidebarCollapsed && (
            <p className="px-3 mb-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Main
            </p>
          )}
          <ul className="space-y-1">
            {filteredNavigation.filter(item => item.section === "main").map((item) => {
              const { Icon } = item;
              const itemPath = getPath(item.href);
              const isActive = isNavItemActive(router.pathname, router.asPath, item.href);
              return (
                <li key={item.name} className="relative group">
                  <Link
                    href={itemPath}
                    className={`relative flex items-center rounded-xl transition-all duration-200 ${
                      sidebarCollapsed ? "justify-center p-2" : "gap-3 px-3 py-2.5"
                    } ${
                      isActive
                        ? "bg-gradient-to-r from-[#0066CC]/10 to-[#0066CC]/5"
                        : "hover:bg-slate-50"
                    }`}
                    title={sidebarCollapsed ? item.name : undefined}
                  >
                    {/* Active indicator bar */}
                    {isActive && !sidebarCollapsed && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-gradient-to-b from-[#0066CC] to-[#0EA5E9] rounded-r-full" />
                    )}
                    {/* Icon with colored container */}
                    <div className={`flex items-center justify-center rounded-lg transition-all duration-200 ${
                      sidebarCollapsed ? "w-9 h-9" : "w-8 h-8"
                    } ${
                      isActive
                        ? "bg-[#0066CC] text-white shadow-md shadow-[#0066CC]/25"
                        : "bg-slate-100 text-slate-500 group-hover:bg-[#0066CC]/10 group-hover:text-[#0066CC]"
                    }`}>
                      <Icon className="w-[18px] h-[18px]" />
                    </div>
                    {!sidebarCollapsed && (
                      <span className={`text-sm transition-colors ${
                        isActive ? "font-semibold text-[#0066CC]" : "text-slate-600 group-hover:text-slate-900"
                      }`}>{item.name}</span>
                    )}
                  </Link>
                  {/* Tooltip for collapsed state */}
                  {sidebarCollapsed && (
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-xl">
                      {item.name}
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-slate-900 rotate-45" />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Management Section */}
          {!sidebarCollapsed && (
            <p className="px-3 mt-6 mb-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Management
            </p>
          )}
          {sidebarCollapsed && <div className="my-4 border-t border-slate-100" />}
          <ul className="space-y-1">
            {filteredNavigation.filter(item => item.section === "management").map((item) => {
              const { Icon } = item;

              if (item.children) {
                const isExpanded = expandedMenus[item.name];
                const isActive = isNavItemActive(router.pathname, router.asPath, item.href);

                return (
                  <li key={item.name}>
                    <button
                      onClick={() => setExpandedMenus(prev => ({ ...prev, [item.name]: !prev[item.name] }))}
                      className={`flex items-center w-full rounded-xl transition-all duration-200 group ${
                        sidebarCollapsed ? "justify-center p-2" : "justify-between gap-3 px-3 py-2.5"
                      } ${
                        isActive
                          ? "bg-gradient-to-r from-[#0066CC]/10 to-[#0066CC]/5"
                          : "hover:bg-slate-50"
                      }`}
                      title={sidebarCollapsed ? item.name : undefined}
                    >
                      <div className={`flex items-center ${sidebarCollapsed ? "" : "gap-3"}`}>
                        <div className={`flex items-center justify-center rounded-lg transition-all duration-200 ${
                          sidebarCollapsed ? "w-9 h-9" : "w-8 h-8"
                        } ${
                          isActive
                            ? "bg-[#0066CC] text-white shadow-md shadow-[#0066CC]/25"
                            : "bg-slate-100 text-slate-500 group-hover:bg-[#0066CC]/10 group-hover:text-[#0066CC]"
                        }`}>
                          <Icon className="w-[18px] h-[18px]" />
                        </div>
                        {!sidebarCollapsed && (
                          <span className={`text-sm transition-colors ${
                            isActive ? "font-semibold text-[#0066CC]" : "text-slate-600 group-hover:text-slate-900"
                          }`}>{item.name}</span>
                        )}
                      </div>
                      {!sidebarCollapsed && (
                        <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""} ${isActive ? "text-[#0066CC]" : "text-slate-400"}`} />
                      )}
                    </button>
                    {!sidebarCollapsed && isExpanded && (
                      <ul className="mt-1.5 ml-11 space-y-0.5 border-l-2 border-[#0066CC]/20 pl-3">
                        {item.children.map((child) => {
                          const childPath = getPath(child.href);
                          const isChildActive = isNavItemActive(router.pathname, router.asPath, child.href);
                          return (
                            <li key={child.name}>
                              <Link
                                href={childPath}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${
                                  isChildActive
                                    ? "bg-[#0066CC]/10 text-[#0066CC] font-semibold"
                                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                                }`}
                              >
                                {isChildActive && <span className="w-1.5 h-1.5 rounded-full bg-[#0066CC]" />}
                                <span>{child.name}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              }

              const itemPath = getPath(item.href);
              const isActive = isNavItemActive(router.pathname, router.asPath, item.href);
              return (
                <li key={item.name} className="relative group">
                  <Link
                    href={itemPath}
                    className={`relative flex items-center rounded-xl transition-all duration-200 ${
                      sidebarCollapsed ? "justify-center p-2" : "gap-3 px-3 py-2.5"
                    } ${
                      isActive
                        ? "bg-gradient-to-r from-[#0066CC]/10 to-[#0066CC]/5"
                        : "hover:bg-slate-50"
                    }`}
                    title={sidebarCollapsed ? item.name : undefined}
                  >
                    {/* Active indicator bar */}
                    {isActive && !sidebarCollapsed && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-gradient-to-b from-[#0066CC] to-[#0EA5E9] rounded-r-full" />
                    )}
                    {/* Icon with colored container */}
                    <div className={`flex items-center justify-center rounded-lg transition-all duration-200 ${
                      sidebarCollapsed ? "w-9 h-9" : "w-8 h-8"
                    } ${
                      isActive
                        ? "bg-[#0066CC] text-white shadow-md shadow-[#0066CC]/25"
                        : "bg-slate-100 text-slate-500 group-hover:bg-[#0066CC]/10 group-hover:text-[#0066CC]"
                    }`}>
                      <Icon className="w-[18px] h-[18px]" />
                    </div>
                    {!sidebarCollapsed && (
                      <span className={`text-sm transition-colors ${
                        isActive ? "font-semibold text-[#0066CC]" : "text-slate-600 group-hover:text-slate-900"
                      }`}>{item.name}</span>
                    )}
                  </Link>
                  {/* Tooltip for collapsed state */}
                  {sidebarCollapsed && (
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-xl">
                      {item.name}
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-slate-900 rotate-45" />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {/* HR Section */}
          {!sidebarCollapsed && (
            <p className="px-3 mt-6 mb-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              HR
            </p>
          )}
          {sidebarCollapsed && <div className="my-4 border-t border-slate-100" />}
          <ul className="space-y-1">
            {filteredNavigation.filter(item => item.section === "hr").map((item) => {
              const { Icon } = item;
              const itemPath = getPath(item.href);
              const isActive = isNavItemActive(router.pathname, router.asPath, item.href);
              return (
                <li key={item.name} className="relative group">
                  <Link
                    href={itemPath}
                    className={`relative flex items-center rounded-xl transition-all duration-200 ${
                      sidebarCollapsed ? "justify-center p-2" : "gap-3 px-3 py-2.5"
                    } ${
                      isActive
                        ? "bg-gradient-to-r from-[#0066CC]/10 to-[#0066CC]/5"
                        : "hover:bg-slate-50"
                    }`}
                    title={sidebarCollapsed ? item.name : undefined}
                  >
                    {isActive && !sidebarCollapsed && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-gradient-to-b from-[#0066CC] to-[#0EA5E9] rounded-r-full" />
                    )}
                    <div className={`flex items-center justify-center rounded-lg transition-all duration-200 ${
                      sidebarCollapsed ? "w-9 h-9" : "w-8 h-8"
                    } ${
                      isActive
                        ? "bg-[#0066CC] text-white shadow-md shadow-[#0066CC]/25"
                        : "bg-slate-100 text-slate-500 group-hover:bg-[#0066CC]/10 group-hover:text-[#0066CC]"
                    }`}>
                      <Icon className="w-[18px] h-[18px]" />
                    </div>
                    {!sidebarCollapsed && (
                      <span className={`text-sm transition-colors ${
                        isActive ? "font-semibold text-[#0066CC]" : "text-slate-600 group-hover:text-slate-900"
                      }`}>{item.name}</span>
                    )}
                  </Link>
                  {sidebarCollapsed && (
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-xl">
                      {item.name}
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-slate-900 rotate-45" />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {/* System Section */}
          {!sidebarCollapsed && (
            <p className="px-3 mt-6 mb-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              System
            </p>
          )}
          {sidebarCollapsed && <div className="my-4 border-t border-slate-100" />}
          <ul className="space-y-1">
            {filteredNavigation.filter(item => item.section === "system").map((item) => {
              const { Icon } = item;
              const itemPath = getPath(item.href);
              const isActive = isNavItemActive(router.pathname, router.asPath, item.href);
              return (
                <li key={item.name} className="relative group">
                  <Link
                    href={itemPath}
                    className={`relative flex items-center rounded-xl transition-all duration-200 ${
                      sidebarCollapsed ? "justify-center p-2" : "gap-3 px-3 py-2.5"
                    } ${
                      isActive
                        ? "bg-gradient-to-r from-[#0066CC]/10 to-[#0066CC]/5"
                        : "hover:bg-slate-50"
                    }`}
                    title={sidebarCollapsed ? item.name : undefined}
                  >
                    {/* Active indicator bar */}
                    {isActive && !sidebarCollapsed && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-gradient-to-b from-[#0066CC] to-[#0EA5E9] rounded-r-full" />
                    )}
                    {/* Icon with colored container */}
                    <div className={`flex items-center justify-center rounded-lg transition-all duration-200 ${
                      sidebarCollapsed ? "w-9 h-9" : "w-8 h-8"
                    } ${
                      isActive
                        ? "bg-[#0066CC] text-white shadow-md shadow-[#0066CC]/25"
                        : "bg-slate-100 text-slate-500 group-hover:bg-[#0066CC]/10 group-hover:text-[#0066CC]"
                    }`}>
                      <Icon className="w-[18px] h-[18px]" />
                    </div>
                    {!sidebarCollapsed && (
                      <span className={`text-sm transition-colors ${
                        isActive ? "font-semibold text-[#0066CC]" : "text-slate-600 group-hover:text-slate-900"
                      }`}>{item.name}</span>
                    )}
                  </Link>
                  {/* Tooltip for collapsed state */}
                  {sidebarCollapsed && (
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-xl">
                      {item.name}
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-slate-900 rotate-45" />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer - Collapse Toggle + SaaS Branding */}
        <div className={`shrink-0 mt-auto border-t border-slate-100 ${sidebarCollapsed ? "p-2" : "p-4"}`}>
          {/* Collapse Toggle Button */}
          <button
            onClick={toggleSidebarCollapsed}
            className={`hidden lg:flex items-center w-full rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all duration-200 ${
              sidebarCollapsed ? "justify-center p-2" : "gap-2 px-3 py-2"
            }`}
            title={sidebarCollapsed ? "Expand sidebar ([ or Ctrl+B)" : "Collapse sidebar ([ or Ctrl+B)"}
          >
            <svg className={`w-5 h-5 transition-transform duration-300 ${sidebarCollapsed ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
            {!sidebarCollapsed && <span className="text-sm">Collapse</span>}
          </button>
          {!sidebarCollapsed && (
            <p className="text-[11px] text-slate-300 text-center mt-3">
              Powered by <span className="font-semibold text-slate-400">DealerHQ</span>
            </p>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? "lg:pl-16" : "lg:pl-64"}`}>
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-6 bg-white/95 backdrop-blur-md border-b border-slate-100">
          <button className="lg:hidden btn btn-ghost btn-sm" onClick={() => setSidebarOpen(true)}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex-1 lg:flex-none" />
          <div className="flex items-center gap-3">
            {/* Quick Add Button - Desktop Portal dropdown, Mobile bottom sheet */}
            <button
              ref={quickAddButtonRef}
              onClick={() => isMobile ? setShowMobileQuickAdd(true) : setShowDesktopQuickAdd(!showDesktopQuickAdd)}
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#0066CC] hover:bg-[#0055AA] text-white cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>

            {/* User Menu */}
            <div className="dropdown dropdown-end">
              <label tabIndex={0} className="btn btn-ghost btn-circle avatar placeholder cursor-pointer">
                <div className="bg-neutral text-neutral-content rounded-full w-8">
                  <span className="text-xs">U</span>
                </div>
              </label>
              <ul tabIndex={0} className="dropdown-content z-50 menu p-2 shadow-lg bg-base-100 rounded-box w-52">
                {hasClientPermission(userRole, "admin") && (
                  <li>
                    <Link href={getPath("/settings")} className="text-sm">
                      <CogIcon className="w-4 h-4" />
                      Settings
                    </Link>
                  </li>
                )}
                {hasClientPermission(userRole, "admin") && <div className="divider my-1"></div>}
                <li>
                  <button
                    onClick={() => signOut()}
                    className="text-sm text-error"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                    </svg>
                    Sign out
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </header>
        <main className="p-4 md:p-6 lg:p-8 pb-24 md:pb-8 min-w-0 max-w-full overflow-x-hidden">{children}</main>
      </div>

      {/* Mobile Bottom Navigation - Safe area aware with modern styling */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-100 md:hidden shadow-lg shadow-slate-200/50" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-center justify-around h-16">
          {[
            { name: "Home", href: "/dashboard", Icon: ChartBarIcon },
            { name: "Prep", href: "/prep", Icon: TruckIcon },
            { name: "Aftersales", href: "/aftersales", Icon: WrenchIcon },
            { name: "Records", href: "/forms", Icon: DocumentTextIcon },
            { name: "More", href: null, Icon: CogIcon, isMore: true },
          ].map((item) => {
            const itemPath = item.href ? getPath(item.href) : null;
            const isActive = item.href && isNavItemActive(router.pathname, router.asPath, item.href);

            if (item.isMore) {
              return (
                <div key={item.name} className="dropdown dropdown-top dropdown-end">
                  <label tabIndex={0} className="flex flex-col items-center justify-center h-full px-2 py-1.5 cursor-pointer group">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 text-slate-400 group-hover:bg-[#0066CC]/10 group-hover:text-[#0066CC] transition-all">
                      <item.Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] mt-0.5 text-slate-400 group-hover:text-[#0066CC] transition-colors">{item.name}</span>
                  </label>
                  <ul tabIndex={0} className="dropdown-content z-50 menu p-2 shadow-xl bg-white rounded-2xl w-52 mb-3 border border-slate-100">
                    <li className="menu-title text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-2">Management</li>
                    <li><Link href={getPath("/appraisals")} className="text-sm py-2.5 rounded-xl">Appraisals</Link></li>
                    {hasClientPermission(userRole, "sales") && (
                      <li><Link href={getPath("/contacts")} className="text-sm py-2.5 rounded-xl">Contacts</Link></li>
                    )}
                    {hasClientPermission(userRole, "admin") && (
                      <li><Link href={getPath("/reports")} className="text-sm py-2.5 rounded-xl">Reports</Link></li>
                    )}
                    <li><Link href={getPath("/reviews")} className="text-sm py-2.5 rounded-xl">Reviews</Link></li>
                    <li><Link href={getPath("/calendar")} className="text-sm py-2.5 rounded-xl">Calendar</Link></li>
                    <div className="divider my-1 px-3"></div>
                    <li className="menu-title text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-2">HR</li>
                    <li><Link href={getPath("/holidays")} className="text-sm py-2.5 rounded-xl">Holidays</Link></li>
                    <li><Link href={getPath("/overtime")} className="text-sm py-2.5 rounded-xl">Overtime</Link></li>
                    {hasClientPermission(userRole, "admin") && (
                      <>
                        <div className="divider my-1 px-3"></div>
                        <li className="menu-title text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-2">System</li>
                        <li><Link href={getPath("/settings")} className="text-sm py-2.5 rounded-xl">Settings</Link></li>
                      </>
                    )}
                  </ul>
                </div>
              );
            }

            return (
              <Link
                key={item.name}
                href={itemPath}
                className="flex flex-col items-center justify-center h-full px-2 py-1.5 group"
              >
                <div className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all ${
                  isActive
                    ? "bg-[#0066CC] text-white shadow-md shadow-[#0066CC]/30"
                    : "bg-slate-100 text-slate-400 group-hover:bg-[#0066CC]/10 group-hover:text-[#0066CC]"
                }`}>
                  <item.Icon className="w-5 h-5" />
                </div>
                <span className={`text-[10px] mt-0.5 transition-colors ${
                  isActive ? "font-semibold text-[#0066CC]" : "text-slate-400 group-hover:text-[#0066CC]"
                }`}>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Dev-only Tenant Debug Panel */}
      {process.env.NODE_ENV === "development" && debugContext && (
        <div className="fixed bottom-20 md:bottom-4 right-4 z-[60]">
          <button
            onClick={() => setDebugPanelOpen(!debugPanelOpen)}
            className="btn btn-xs btn-warning shadow-lg"
            title="Toggle debug panel"
          >
            {debugPanelOpen ? "Hide Debug" : "Debug"}
          </button>
          {debugPanelOpen && (
            <div className="absolute bottom-8 right-0 bg-warning/10 border border-warning rounded-lg p-3 shadow-xl min-w-64 text-xs font-mono">
              <div className="font-bold text-warning mb-2 text-sm">Tenant Context</div>
              <div className="space-y-1 text-base-content">
                <div className="flex justify-between gap-4">
                  <span className="text-base-content/60">Auth:</span>
                  <span className={debugContext.authenticated ? "text-success" : "text-error"}>
                    {debugContext.authenticated ? "Yes" : "No"}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-base-content/60">User ID:</span>
                  <span className="truncate max-w-32" title={debugContext.userId}>
                    {debugContext.userId || "-"}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-base-content/60">Email:</span>
                  <span className="truncate max-w-32" title={debugContext.userEmail}>
                    {debugContext.userEmail || "-"}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-base-content/60">User Role:</span>
                  <span>{debugContext.userRole || "-"}</span>
                </div>
                <hr className="border-base-300 my-1" />
                <div className="flex justify-between gap-4">
                  <span className="text-base-content/60">Dealer ID:</span>
                  <span className="truncate max-w-32" title={debugContext.dealerId}>
                    {debugContext.dealerId || "-"}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-base-content/60">Dealer:</span>
                  <span className="truncate max-w-32" title={debugContext.dealerName}>
                    {debugContext.dealerName || "-"}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-base-content/60">Membership:</span>
                  <span>{debugContext.membershipRole || "-"}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mobile Quick Add Bottom Sheet */}
      <BottomSheet
        isOpen={showMobileQuickAdd}
        onClose={() => setShowMobileQuickAdd(false)}
        title="Quick Actions"
        maxHeight="80dvh"
      >
        <div className="space-y-1 overflow-y-auto">
          {/* Quick Actions Section */}
          <div className="px-2 pb-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-2">Quick Actions</p>
            <Link
              href={getPath("/appraisals/new")}
              onClick={() => setShowMobileQuickAdd(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-[#0066CC]/10 flex items-center justify-center">
                <ClipboardIcon className="w-5 h-5 text-[#0066CC]" />
              </div>
              <span className="font-medium text-slate-900">New Appraisal</span>
            </Link>
            <Link
              href={getPath("/stock-book?addVehicle=1")}
              onClick={() => setShowMobileQuickAdd(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <TruckIcon className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="font-medium text-slate-900">Add Vehicle</span>
            </Link>
            <Link
              href={getPath("/sales?create=1")}
              onClick={() => setShowMobileQuickAdd(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="font-medium text-slate-900">Create Sale</span>
            </Link>
            <Link
              href={getPath("/aftersales?addCase=1")}
              onClick={() => setShowMobileQuickAdd(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <WrenchIcon className="w-5 h-5 text-orange-600" />
              </div>
              <span className="font-medium text-slate-900">New Aftersales Case</span>
            </Link>
          </div>

          {/* Forms Section - excluding customer-facing forms */}
          {forms.filter(f => !CUSTOMER_FACING_FORM_TYPES.includes(f.type)).length > 0 && (
            <div className="px-2 pb-4 border-t border-slate-100 pt-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-2">Forms</p>
              <div className="space-y-0.5">
                {forms.filter(f => !CUSTOMER_FACING_FORM_TYPES.includes(f.type)).map((form) => (
                  <button
                    key={form.id || form._id}
                    onClick={() => {
                      handleFormClick(form);
                      setShowMobileQuickAdd(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#0066CC]/10 flex items-center justify-center text-[#0066CC]">
                      <FormTypeIcon type={form.type} className="w-5 h-5" />
                    </div>
                    <span className="font-medium text-slate-900 truncate">{form.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </BottomSheet>

      {/* Desktop Quick Add Portal Dropdown */}
      {showDesktopQuickAdd && !isMobile && (
        <Portal>
          <div
            ref={quickAddMenuRef}
            className="fixed bg-white rounded-xl shadow-2xl border border-slate-200 w-64 max-h-[70vh] overflow-y-auto"
            style={{
              top: quickAddButtonRef.current
                ? quickAddButtonRef.current.getBoundingClientRect().bottom + 8
                : 72,
              right: 16,
              zIndex: 99999,
            }}
          >
            {/* Quick Actions Section */}
            <div className="p-3 border-b border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 mb-2">Quick Actions</p>
              <div className="space-y-1">
                <Link
                  href={getPath("/appraisals/new")}
                  onClick={() => setShowDesktopQuickAdd(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#0066CC]/10 flex items-center justify-center">
                    <ClipboardIcon className="w-4 h-4 text-[#0066CC]" />
                  </div>
                  <span className="text-sm font-medium text-slate-900">New Appraisal</span>
                </Link>
                <Link
                  href={getPath("/stock-book?addVehicle=1")}
                  onClick={() => setShowDesktopQuickAdd(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <TruckIcon className="w-4 h-4 text-emerald-600" />
                  </div>
                  <span className="text-sm font-medium text-slate-900">Add Vehicle</span>
                </Link>
                <Link
                  href={getPath("/sales?create=1")}
                  onClick={() => setShowDesktopQuickAdd(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-slate-900">Create Sale</span>
                </Link>
                <Link
                  href={getPath("/aftersales?addCase=1")}
                  onClick={() => setShowDesktopQuickAdd(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <WrenchIcon className="w-4 h-4 text-orange-600" />
                  </div>
                  <span className="text-sm font-medium text-slate-900">New Aftersales Case</span>
                </Link>
              </div>
            </div>

            {/* Forms Section - excluding customer-facing forms */}
            {forms.filter(f => !CUSTOMER_FACING_FORM_TYPES.includes(f.type)).length > 0 && (
              <div className="p-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 mb-2">Forms</p>
                <div className="space-y-1">
                  {forms.filter(f => !CUSTOMER_FACING_FORM_TYPES.includes(f.type)).map((form) => (
                    <button
                      key={form.id || form._id}
                      onClick={() => {
                        handleFormClick(form);
                        setShowDesktopQuickAdd(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#0066CC]/10 flex items-center justify-center text-[#0066CC]">
                        <FormTypeIcon type={form.type} className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-medium text-slate-900 truncate">{form.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Portal>
      )}

      {/* Help Chat Widget */}
      <HelpChat />
    </div>
  );
}
