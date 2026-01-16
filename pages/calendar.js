import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/DashboardLayout";
import { PageHint } from "@/components/ui";
import { toast } from "react-hot-toast";
import useDealerRedirect from "@/hooks/useDealerRedirect";

export default function Calendar() {
  const router = useRouter();
  const { isRedirecting } = useDealerRedirect();
  const { data: session } = useSession();
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("week"); // day, 3day, week, month
  const [isMobile, setIsMobile] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [pendingHolidayCount, setPendingHolidayCount] = useState(0);
  const [userRole, setUserRole] = useState(null);

  const isAdmin = userRole === "OWNER" || userRole === "ADMIN";

  // Fetch user's role from dealer context
  useEffect(() => {
    const fetchRole = async () => {
      try {
        const res = await fetch("/api/dealer");
        if (res.ok) {
          const data = await res.json();
          setUserRole(data.currentUserRole);
        }
      } catch (error) {
        console.error("Failed to fetch user role:", error);
      }
    };
    fetchRole();
  }, []);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // On mobile, default to 3day view if currently on week
      if (mobile && viewMode === "week") {
        setViewMode("3day");
      }
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [viewMode]);

  useEffect(() => {
    fetchEvents();
    fetchCategories();
    if (isAdmin) {
      fetchPendingHolidayCount();
    }
  }, [isAdmin]);

  const fetchEvents = async () => {
    try {
      const start = new Date();
      start.setMonth(start.getMonth() - 1);
      const end = new Date();
      end.setMonth(end.getMonth() + 3);

      const res = await fetch(`/api/calendar?start=${start.toISOString()}&end=${end.toISOString()}`);
      // Check for JSON response
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        console.error("[Calendar] Non-JSON response:", res.status);
        toast.error(res.status === 401 || res.status === 403 ? "Session expired - please sign in" : "Failed to load events");
        setEvents([]);
        return;
      }
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to load events");
        setEvents([]);
        return;
      }
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("[Calendar] Fetch error:", error);
      toast.error("Failed to load events");
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/calendar/categories");
      // Check for JSON response
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        console.error("[Calendar] Categories non-JSON response:", res.status);
        setCategories([]);
        return;
      }
      if (!res.ok) {
        setCategories([]);
        return;
      }
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load categories");
      setCategories([]);
    }
  };

  const fetchPendingHolidayCount = async () => {
    try {
      const res = await fetch("/api/holiday-requests?status=PENDING");
      // Check for JSON response
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        setPendingHolidayCount(0);
        return;
      }
      if (!res.ok) {
        setPendingHolidayCount(0);
        return;
      }
      const data = await res.json();
      setPendingHolidayCount(Array.isArray(data) ? data.length : 0);
    } catch (error) {
      console.error("Failed to load pending holiday count");
      setPendingHolidayCount(0);
    }
  };

  // Filter events by search query and categories
  const filteredEvents = events.filter((event) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = event.title?.toLowerCase().includes(query);
      const matchesDescription = event.description?.toLowerCase().includes(query);
      const matchesCategory = event.categoryId?.name?.toLowerCase().includes(query);
      if (!matchesTitle && !matchesDescription && !matchesCategory) {
        return false;
      }
    }
    // Category filter
    if (selectedCategories.length > 0) {
      if (!selectedCategories.includes(event.categoryId?.id || event.categoryId?._id)) {
        return false;
      }
    }
    return true;
  });

  // Group filtered events by date
  const eventsByDate = filteredEvents.reduce((acc, event) => {
    const dateKey = new Date(event.startDatetime).toDateString();
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(event);
    return acc;
  }, {});

  // Navigation functions
  const goToToday = () => setSelectedDate(new Date());

  const goToPrevious = () => {
    const newDate = new Date(selectedDate);
    if (viewMode === "day") newDate.setDate(newDate.getDate() - 1);
    else if (viewMode === "3day") newDate.setDate(newDate.getDate() - 3);
    else if (viewMode === "week") newDate.setDate(newDate.getDate() - 7);
    else newDate.setMonth(newDate.getMonth() - 1);
    setSelectedDate(newDate);
  };

  const goToNext = () => {
    const newDate = new Date(selectedDate);
    if (viewMode === "day") newDate.setDate(newDate.getDate() + 1);
    else if (viewMode === "3day") newDate.setDate(newDate.getDate() + 3);
    else if (viewMode === "week") newDate.setDate(newDate.getDate() + 7);
    else newDate.setMonth(newDate.getMonth() + 1);
    setSelectedDate(newDate);
  };

  // Get 3 days for 3-day view (centered on selected date)
  const get3Days = () => {
    const days = [];
    const startDate = new Date(selectedDate);
    startDate.setDate(startDate.getDate() - 1); // Start from day before

    for (let i = 0; i < 3; i++) {
      const day = new Date(startDate);
      day.setDate(day.getDate() + i);
      days.push(day);
    }
    return days;
  };

  // Get week days for week view
  const getWeekDays = () => {
    const days = [];
    const startOfWeek = new Date(selectedDate);
    const dayOfWeek = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek); // Start from Sunday

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(day.getDate() + i);
      days.push(day);
    }
    return days;
  };

  // Get days for current month view
  const getDaysInMonth = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleEventClick = (event) => {
    setEditingEvent(event);
  };

  // Get display text for current view
  const getDateDisplay = () => {
    if (viewMode === "day") {
      return selectedDate.toLocaleDateString("en-GB", { weekday: 'short', day: 'numeric', month: 'short' });
    }
    if (viewMode === "3day") {
      const days = get3Days();
      return `${days[0].getDate()} - ${days[2].getDate()} ${monthNames[days[1].getMonth()].slice(0, 3)}`;
    }
    if (viewMode === "week") {
      const days = getWeekDays();
      return `${days[0].getDate()} - ${days[6].getDate()} ${monthNames[days[0].getMonth()].slice(0, 3)}`;
    }
    return `${monthNames[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
  };

  // Show loading while checking for dealer redirect
  if (isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <Head><title>Calendar | DealerHQ</title></Head>

      {/* Header - Flex Row on all screens */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">Calendar</h1>
          <PageHint id="calendar">View team schedules, events, and approved holidays. Click any time slot to add an event.</PageHint>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-2 text-sm font-medium flex items-center gap-2 transition-colors"
            onClick={() => setShowHolidayModal(true)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span className="hidden sm:inline">Request Holiday</span>
          </button>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-2 text-sm font-medium flex items-center gap-2 transition-colors"
            onClick={() => setShowAddModal(true)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">New Event</span>
          </button>
        </div>
      </div>

      {/* Navigation Bar - Clean Light Theme */}
      <div className="flex flex-col gap-3 mb-4 p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
        {/* Top Row: Date Navigation + View Toggle */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Date Navigation */}
          <div className="flex items-center gap-1">
            <button
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              onClick={goToPrevious}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              onClick={goToToday}
            >
              Today
            </button>
            <button
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              onClick={goToNext}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <span className="font-semibold text-sm text-slate-800 ml-2">
              {getDateDisplay()}
            </span>
          </div>

          {/* View Toggle - Clean buttons */}
          <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
            <button
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === "day" ? "bg-white text-slate-800 shadow-sm" : "text-slate-600 hover:text-slate-800"}`}
              onClick={() => setViewMode("day")}
            >
              Day
            </button>
            {isMobile ? (
              <button
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === "3day" ? "bg-white text-slate-800 shadow-sm" : "text-slate-600 hover:text-slate-800"}`}
                onClick={() => setViewMode("3day")}
              >
                3 Day
              </button>
            ) : (
              <button
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === "week" ? "bg-white text-slate-800 shadow-sm" : "text-slate-600 hover:text-slate-800"}`}
                onClick={() => setViewMode("week")}
              >
                Week
              </button>
            )}
            <button
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === "month" ? "bg-white text-slate-800 shadow-sm" : "text-slate-600 hover:text-slate-800"}`}
              onClick={() => setViewMode("month")}
            >
              Month
            </button>
          </div>
        </div>

        {/* Bottom Row: Search + Category Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1 sm:max-w-xs">
            <input
              type="text"
              placeholder="Search events..."
              className="w-full h-9 pl-9 pr-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                onClick={() => setSearchQuery("")}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Category Filter - Multi-select dropdown */}
          <div className="dropdown dropdown-end">
            <label
              tabIndex={0}
              className="h-9 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg cursor-pointer flex items-center gap-2 hover:bg-slate-100 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="text-slate-700">
                {selectedCategories.length === 0
                  ? "All Categories"
                  : `${selectedCategories.length} selected`}
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </label>
            <ul tabIndex={0} className="dropdown-content z-20 menu p-2 shadow-lg bg-white rounded-lg w-56 max-h-60 overflow-y-auto border border-slate-200 mt-1">
              {categories.length === 0 ? (
                <li><span className="text-slate-500 text-sm">No categories</span></li>
              ) : (
                <>
                  {selectedCategories.length > 0 && (
                    <li className="mb-1">
                      <button
                        className="text-sm text-blue-600 hover:bg-blue-50"
                        onClick={() => setSelectedCategories([])}
                      >
                        Clear all
                      </button>
                    </li>
                  )}
                  {categories.map((cat) => {
                    const isSelected = selectedCategories.includes(cat.id);
                    return (
                      <li key={cat.id}>
                        <label className="flex items-center gap-2 cursor-pointer text-sm">
                          <input
                            type="checkbox"
                            className="checkbox checkbox-sm checkbox-primary"
                            checked={isSelected}
                            onChange={() => {
                              if (isSelected) {
                                setSelectedCategories(selectedCategories.filter((id) => id !== cat.id));
                              } else {
                                setSelectedCategories([...selectedCategories, cat.id]);
                              }
                            }}
                          />
                          <div className="w-3 h-3 rounded" style={{ backgroundColor: cat.colour }}></div>
                          <span>{cat.name}</span>
                        </label>
                      </li>
                    );
                  })}
                </>
              )}
            </ul>
          </div>

          {/* Active Filters Indicator */}
          {(searchQuery || selectedCategories.length > 0) && (
            <span className="text-xs text-slate-500">
              {filteredEvents.length} of {events.length} events
            </span>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <span className="loading loading-spinner loading-lg text-blue-600"></span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Calendar View */}
          <div className="lg:col-span-3">
            {viewMode === "month" && (
              <MonthView
                days={getDaysInMonth()}
                eventsByDate={eventsByDate}
                selectedDate={selectedDate}
                onEventClick={handleEventClick}
                isMobile={isMobile}
              />
            )}
            {viewMode === "week" && (
              <WeekView
                days={getWeekDays()}
                eventsByDate={eventsByDate}
                onEventClick={handleEventClick}
                formatTime={formatTime}
              />
            )}
            {viewMode === "3day" && (
              <ThreeDayView
                days={get3Days()}
                eventsByDate={eventsByDate}
                onEventClick={handleEventClick}
                formatTime={formatTime}
              />
            )}
            {viewMode === "day" && (
              <DayView
                day={selectedDate}
                events={eventsByDate[selectedDate.toDateString()] || []}
                onEventClick={handleEventClick}
                formatTime={formatTime}
              />
            )}
          </div>

          {/* Sidebar - Hidden on mobile, visible on lg */}
          <div className="hidden lg:block lg:col-span-1 space-y-4">
            {/* Pending Holiday Approvals - Admin/Owner only */}
            {isAdmin && pendingHolidayCount > 0 && (
              <Link href="/holidays?filter=pending" className="block">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 hover:bg-amber-100 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-amber-800">Pending Approvals</p>
                      <p className="text-sm text-amber-600">{pendingHolidayCount} holiday request{pendingHolidayCount !== 1 ? "s" : ""}</p>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            )}

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="p-4">
                <h3 className="font-semibold text-slate-800 mb-3">Upcoming Events</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {events
                    .filter(e => new Date(e.startDatetime) >= new Date())
                    .slice(0, 5)
                    .map((event) => (
                      <div
                        key={event.id}
                        className="p-2 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => handleEventClick(event)}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: event.categoryId?.colour || "#6366f1" }}></div>
                          <p className="font-medium text-sm text-slate-800 truncate">{event.title}</p>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(event.startDatetime).toLocaleDateString()} at {formatTime(event.startDatetime)}
                        </p>
                      </div>
                    ))}
                  {events.filter(e => new Date(e.startDatetime) >= new Date()).length === 0 && (
                    <p className="text-sm text-slate-500">No upcoming events</p>
                  )}
                </div>

                <div className="border-t border-slate-100 my-3"></div>

                {/* Categories */}
                <h3 className="font-semibold text-slate-800 mb-3">Categories</h3>
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <div key={cat.id} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: cat.colour }}></div>
                      <span className="text-sm text-slate-600">{cat.name}</span>
                    </div>
                  ))}
                  {categories.length === 0 && (
                    <p className="text-sm text-slate-500">No categories yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile FAB */}
      {isMobile && (
        <button
          className="fixed fab-safe right-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg z-50 transition-colors"
          onClick={() => setShowAddModal(true)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}

      {/* Add Event Modal */}
      {showAddModal && (
        <EventModal
          categories={categories}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { setShowAddModal(false); fetchEvents(); }}
          onCategoriesChange={fetchCategories}
        />
      )}

      {/* Edit Event Modal */}
      {editingEvent && (
        <EventModal
          event={editingEvent}
          categories={categories}
          onClose={() => setEditingEvent(null)}
          onSuccess={() => { setEditingEvent(null); fetchEvents(); }}
          onCategoriesChange={fetchCategories}
          onDelete={() => { setEditingEvent(null); fetchEvents(); }}
        />
      )}

      {/* Holiday Request Modal */}
      {showHolidayModal && (
        <HolidayRequestModal
          onClose={() => setShowHolidayModal(false)}
          onSuccess={() => {
            setShowHolidayModal(false);
            toast.success("Holiday request submitted");
            // Optionally navigate to holidays page
            router.push("/settings/holidays");
          }}
        />
      )}
    </DashboardLayout>
  );
}

// Month View Component - Clean Light Theme
function MonthView({ days, eventsByDate, selectedDate, onEventClick, isMobile }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Day Headers */}
      <div className="grid grid-cols-7 border-b border-slate-100">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => (
          <div
            key={day}
            className={`text-center text-xs font-medium text-slate-500 py-3 ${i < 6 ? "border-r border-slate-100" : ""}`}
          >
            {isMobile ? day.charAt(0) : day}
          </div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          if (!day) {
            return (
              <div
                key={i}
                className={`h-20 md:h-28 bg-slate-50/50 ${(i + 1) % 7 !== 0 ? "border-r border-slate-100" : ""} border-b border-slate-100`}
              ></div>
            );
          }

          const dateKey = day.toDateString();
          const dayEvents = eventsByDate[dateKey] || [];
          const isToday = day.toDateString() === new Date().toDateString();

          return (
            <div
              key={i}
              className={`h-20 md:h-28 p-1 md:p-2 ${(i + 1) % 7 !== 0 ? "border-r border-slate-100" : ""} border-b border-slate-100 overflow-hidden`}
            >
              <div className={`text-xs md:text-sm font-medium ${isToday ? "text-blue-600" : "text-slate-700"}`}>
                {isToday ? (
                  <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-600 text-white rounded-full text-xs">
                    {day.getDate()}
                  </span>
                ) : (
                  day.getDate()
                )}
              </div>
              {isMobile ? (
                // Mobile: show colored dots
                <div className="flex flex-wrap gap-0.5 mt-1">
                  {dayEvents.slice(0, 3).map((event, j) => (
                    <div
                      key={j}
                      className="w-1.5 h-1.5 rounded-full cursor-pointer"
                      style={{ backgroundColor: event.categoryId?.colour || "#6366f1" }}
                      onClick={() => onEventClick(event)}
                    ></div>
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-[10px] text-slate-400">+{dayEvents.length - 3}</span>
                  )}
                </div>
              ) : (
                // Desktop: show event titles
                <div className="space-y-0.5 mt-1">
                  {dayEvents.slice(0, 2).map((event, j) => (
                    <div
                      key={j}
                      className="text-xs px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: event.categoryId?.colour || "#6366f1", color: "white" }}
                      onClick={() => onEventClick(event)}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-[10px] text-slate-400 pl-1">+{dayEvents.length - 2} more</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Week View Component - Clean Light Theme (Desktop only)
function WeekView({ days, eventsByDate, onEventClick, formatTime }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Day Headers */}
      <div className="grid grid-cols-7 border-b border-slate-100">
        {days.map((day, i) => {
          const isToday = day.toDateString() === new Date().toDateString();
          return (
            <div
              key={i}
              className={`text-center py-3 ${i < 6 ? "border-r border-slate-100" : ""}`}
            >
              <div className={`text-xs font-medium ${isToday ? "text-blue-600" : "text-slate-500"}`}>
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day.getDay()]}
              </div>
              <div className={`text-lg font-bold ${isToday ? "text-blue-600" : "text-slate-800"}`}>
                {isToday ? (
                  <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full">
                    {day.getDate()}
                  </span>
                ) : (
                  day.getDate()
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-7 min-h-[400px]">
        {days.map((day, i) => {
          const dateKey = day.toDateString();
          const dayEvents = eventsByDate[dateKey] || [];
          const isToday = day.toDateString() === new Date().toDateString();

          return (
            <div
              key={i}
              className={`p-2 ${i < 6 ? "border-r border-slate-100" : ""} ${isToday ? "bg-blue-50/30" : ""}`}
            >
              <div className="space-y-1.5">
                {dayEvents.map((event, j) => (
                  <EventCard
                    key={j}
                    event={event}
                    onClick={() => onEventClick(event)}
                    formatTime={formatTime}
                    compact={false}
                  />
                ))}
                {dayEvents.length === 0 && (
                  <p className="text-xs text-slate-300 text-center py-4">No events</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 3-Day View Component - Mobile optimized
function ThreeDayView({ days, eventsByDate, onEventClick, formatTime }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Day Headers */}
      <div className="grid grid-cols-3 border-b border-slate-100">
        {days.map((day, i) => {
          const isToday = day.toDateString() === new Date().toDateString();
          return (
            <div
              key={i}
              className={`text-center py-3 ${i < 2 ? "border-r border-slate-100" : ""}`}
            >
              <div className={`text-xs font-medium ${isToday ? "text-blue-600" : "text-slate-500"}`}>
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day.getDay()]}
              </div>
              <div className={`text-lg font-bold ${isToday ? "text-blue-600" : "text-slate-800"}`}>
                {isToday ? (
                  <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full">
                    {day.getDate()}
                  </span>
                ) : (
                  day.getDate()
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-3 min-h-[350px]">
        {days.map((day, i) => {
          const dateKey = day.toDateString();
          const dayEvents = eventsByDate[dateKey] || [];
          const isToday = day.toDateString() === new Date().toDateString();

          return (
            <div
              key={i}
              className={`p-2 ${i < 2 ? "border-r border-slate-100" : ""} ${isToday ? "bg-blue-50/30" : ""}`}
            >
              <div className="space-y-1.5">
                {dayEvents.map((event, j) => (
                  <EventCard
                    key={j}
                    event={event}
                    onClick={() => onEventClick(event)}
                    formatTime={formatTime}
                    compact={true}
                  />
                ))}
                {dayEvents.length === 0 && (
                  <p className="text-xs text-slate-300 text-center py-4">No events</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Day View Component - Clean Light Theme
function DayView({ day, events, onEventClick, formatTime }) {
  const isToday = day.toDateString() === new Date().toDateString();

  // Sort events by time
  const sortedEvents = [...events].sort((a, b) =>
    new Date(a.startDatetime) - new Date(b.startDatetime)
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Day Header */}
      <div className={`text-center py-6 border-b border-slate-100 ${isToday ? "bg-blue-50" : "bg-slate-50"}`}>
        <div className={`text-sm font-medium ${isToday ? "text-blue-600" : "text-slate-500"}`}>
          {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][day.getDay()]}
        </div>
        <div className={`text-4xl font-bold mt-1 ${isToday ? "text-blue-600" : "text-slate-800"}`}>
          {day.getDate()}
        </div>
        <div className="text-sm text-slate-500 mt-1">
          {day.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
        </div>
      </div>

      {/* Events List */}
      <div className="p-4 space-y-3 min-h-[300px]">
        {sortedEvents.length === 0 ? (
          <div className="text-center py-12">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-slate-200 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-slate-400">No events scheduled</p>
          </div>
        ) : (
          sortedEvents.map((event, i) => (
            <div
              key={i}
              className="flex gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
              onClick={() => onEventClick(event)}
            >
              <div className="flex flex-col items-center text-xs text-slate-500 min-w-[50px]">
                <span className="font-semibold text-slate-700">{formatTime(event.startDatetime)}</span>
                <span>to</span>
                <span className="font-semibold text-slate-700">{formatTime(event.endDatetime)}</span>
              </div>
              <div className="flex-1 border-l-4 pl-3" style={{ borderColor: event.categoryId?.colour || "#6366f1" }}>
                {event.categoryId && (
                  <span
                    className="inline-block px-2 py-0.5 rounded text-[10px] font-bold text-white mb-1"
                    style={{ backgroundColor: event.categoryId.colour }}
                  >
                    {event.categoryId.name.toUpperCase()}
                  </span>
                )}
                <h4 className="font-semibold text-slate-800 text-sm">{event.title}</h4>
                {event.description && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{event.description}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Event Card Component - Clean and compact
function EventCard({ event, onClick, formatTime, compact }) {
  return (
    <div
      className="p-2 rounded-lg cursor-pointer hover:opacity-90 transition-opacity text-white"
      style={{ backgroundColor: event.categoryId?.colour || "#6366f1" }}
      onClick={onClick}
    >
      {event.categoryId && (
        <div className={`font-bold uppercase opacity-90 mb-0.5 truncate ${compact ? "text-[9px]" : "text-[10px]"}`}>
          {event.categoryId.name}
        </div>
      )}
      <div className={`font-semibold truncate ${compact ? "text-xs" : "text-sm"}`}>{event.title}</div>
      <div className={`opacity-75 mt-0.5 ${compact ? "text-[10px]" : "text-xs"}`}>
        {formatTime(event.startDatetime)}
      </div>
      {!compact && event.description && (
        <div className="text-xs opacity-75 mt-1 line-clamp-2">{event.description}</div>
      )}
    </div>
  );
}

// Event Modal Component (for Add/Edit)
function EventModal({ event, categories, onClose, onSuccess, onCategoriesChange, onDelete }) {
  const isEditing = !!event;
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColour, setNewCategoryColour] = useState("#3b82f6");
  const [isAllDay, setIsAllDay] = useState(false);
  const [formData, setFormData] = useState({
    title: event?.title || "",
    description: event?.description || "",
    categoryId: event?.categoryId?.id || "",
    startDatetime: event ? new Date(event.startDatetime).toISOString().slice(0, 16) : "",
    endDatetime: event ? new Date(event.endDatetime).toISOString().slice(0, 16) : "",
    linkedVehicleId: event?.linkedVehicleId || "",
    linkedContactId: event?.linkedContactId || "",
  });

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return toast.error("Category name required");
    try {
      const res = await fetch("/api/calendar/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName, colour: newCategoryColour }),
      });
      if (!res.ok) throw new Error("Failed to create category");
      const newCat = await res.json();
      setFormData({ ...formData, categoryId: newCat.id });
      setShowAddCategory(false);
      setNewCategoryName("");
      setNewCategoryColour("#3b82f6");
      toast.success("Category added!");
      if (onCategoriesChange) onCategoriesChange();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.startDatetime) {
      return toast.error("Title and start time are required");
    }
    setIsLoading(true);
    try {
      // End datetime defaults to start datetime if not provided
      const endDatetime = formData.endDatetime || formData.startDatetime;

      const payload = {
        title: formData.title,
        description: formData.description || "",
        startDatetime: formData.startDatetime,
        endDatetime: endDatetime,
      };
      if (formData.categoryId && formData.categoryId !== "") {
        payload.categoryId = formData.categoryId;
      }

      const url = isEditing ? `/api/calendar/${event.id}` : "/api/calendar";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Failed to ${isEditing ? "update" : "create"} event`);
      }
      toast.success(`Event ${isEditing ? "updated" : "created"}!`);
      onSuccess();
    } catch (error) {
      console.error("Event error:", error);
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/calendar/${event.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete event");
      toast.success("Event deleted");
      onDelete();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="font-bold text-lg text-slate-800 mb-4">{isEditing ? "Edit Event" : "New Event"}</h3>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                {showAddCategory ? (
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="Category name"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                    />
                    <input
                      type="color"
                      className="w-10 h-10 rounded cursor-pointer border border-slate-300"
                      value={newCategoryColour}
                      onChange={(e) => setNewCategoryColour(e.target.value)}
                    />
                    <button type="button" className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium" onClick={handleAddCategory}>Add</button>
                    <button type="button" className="px-3 py-2 text-slate-600 text-sm" onClick={() => setShowAddCategory(false)}>Cancel</button>
                  </div>
                ) : (
                  <select
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    value={formData.categoryId}
                    onChange={(e) => {
                      if (e.target.value === "__add_new__") {
                        setShowAddCategory(true);
                      } else {
                        setFormData({ ...formData, categoryId: e.target.value });
                      }
                    }}
                  >
                    <option value="">Select category...</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                    <option value="__add_new__">+ Add New Category</option>
                  </select>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="allDay"
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  checked={isAllDay}
                  onChange={(e) => setIsAllDay(e.target.checked)}
                />
                <label htmlFor="allDay" className="text-sm text-slate-700">All day</label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start *</label>
                  <input
                    type="datetime-local"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    value={formData.startDatetime}
                    onChange={(e) => setFormData({ ...formData, startDatetime: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    End <span className="text-slate-400 font-normal text-xs">(optional)</span>
                  </label>
                  <input
                    type="datetime-local"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    value={formData.endDatetime}
                    onChange={(e) => setFormData({ ...formData, endDatetime: e.target.value })}
                    placeholder="Same as start"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                ></textarea>
              </div>
            </div>

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
              <div>
                {isEditing && (
                  showDeleteConfirm ? (
                    <div className="flex gap-2 items-center">
                      <span className="text-sm text-red-600">Delete?</span>
                      <button
                        type="button"
                        className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium"
                        onClick={handleDelete}
                        disabled={isDeleting}
                      >
                        {isDeleting ? "..." : "Yes"}
                      </button>
                      <button
                        type="button"
                        className="px-3 py-1.5 text-slate-600 text-sm"
                        onClick={() => setShowDeleteConfirm(false)}
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      Delete Event
                    </button>
                  )
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 text-sm font-medium"
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  disabled={isLoading}
                >
                  {isLoading ? "Saving..." : (isEditing ? "Save Changes" : "Create Event")}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Holiday Request Modal Component
function HolidayRequestModal({ onClose, onSuccess }) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    startDate: "",
    endDate: "",
    startSession: "AM",
    endSession: "PM",
    type: "Holiday",
    notes: "",
  });

  // Compute total days with AM/PM sessions
  const computeTotalDays = (startDate, endDate, startSession, endSession) => {
    if (!startDate) return 0;
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date(startDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const msPerDay = 1000 * 60 * 60 * 24;
    const daysDiff = Math.round((end - start) / msPerDay);

    if (daysDiff < 0) return null;

    // Same day
    if (daysDiff === 0) {
      if (startSession === "PM" && endSession === "AM") return null;
      if (startSession === "AM" && endSession === "PM") return 1.0;
      return 0.5;
    }

    // Multi-day
    const startDayValue = startSession === "PM" ? 0.5 : 1.0;
    const endDayValue = endSession === "AM" ? 0.5 : 1.0;
    const middleDays = daysDiff - 1;

    return startDayValue + middleDays + endDayValue;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.startDate) {
      return toast.error("Please select a start date");
    }

    const start = new Date(formData.startDate);
    const end = formData.endDate ? new Date(formData.endDate) : new Date(formData.startDate);

    if (end < start) {
      return toast.error("End date must be on or after start date");
    }

    const totalDays = computeTotalDays(start, end, formData.startSession, formData.endSession);

    if (totalDays === null) {
      return toast.error("Invalid session combination: PM to AM on the same day is not allowed");
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/holiday-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: formData.startDate,
          endDate: formData.endDate || formData.startDate,
          startSession: formData.startSession,
          endSession: formData.endSession,
          type: formData.type,
          notes: formData.notes,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit request");
      }
      onSuccess();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-800">Request Time Off</h3>
              <p className="text-sm text-slate-500">Submit a holiday request for approval</p>
            </div>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="Holiday">Holiday</option>
                  <option value="Sick">Sick Leave</option>
                  <option value="Unpaid">Unpaid Leave</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Start Date and Session */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Session</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    value={formData.startSession}
                    onChange={(e) => setFormData({ ...formData, startSession: e.target.value })}
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>

              {/* End Date and Session */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    End Date <span className="text-slate-400 font-normal text-xs">(optional)</span>
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Session</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    value={formData.endSession}
                    onChange={(e) => setFormData({ ...formData, endSession: e.target.value })}
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>

              {/* Computed Total Days */}
              {formData.startDate && (() => {
                const start = new Date(formData.startDate);
                const end = formData.endDate ? new Date(formData.endDate) : new Date(formData.startDate);
                const totalDays = computeTotalDays(start, end, formData.startSession, formData.endSession);
                const isInvalid = totalDays === null || end < start;

                return (
                  <div className={`flex items-center gap-2 p-3 rounded-lg ${isInvalid ? 'bg-red-50' : 'bg-emerald-50'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isInvalid ? 'text-red-600' : 'text-emerald-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className={`text-sm font-medium ${isInvalid ? 'text-red-700' : 'text-emerald-700'}`}>
                      {end < start ? (
                        "End date must be on or after start date"
                      ) : totalDays === null ? (
                        "Invalid: PM to AM on same day not allowed"
                      ) : (
                        <>
                          Total requested: {totalDays} day{totalDays !== 1 ? "s" : ""}
                          {totalDays === 0.5 && <span className="text-xs opacity-75 ml-1">(half day)</span>}
                        </>
                      )}
                    </span>
                  </div>
                );
              })()}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
                <textarea
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  placeholder="Any additional details..."
                ></textarea>
              </div>
            </div>

            <div className="flex gap-2 mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                className="flex-1 px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
