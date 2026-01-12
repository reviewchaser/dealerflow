import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";

// Format date helper
const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Activity type labels
const ACTIVITY_LABELS = {
  DEALER_CREATED: "Dealer Created",
  DEALER_ONBOARDING_COMPLETED: "Onboarding Completed",
  DEALER_DISABLED: "Dealer Disabled",
  DEALER_ENABLED: "Dealer Enabled",
  USER_INVITED: "User Invited",
  USER_SIGNED_UP: "User Signed Up",
  USER_DISABLED: "User Disabled",
  USER_ENABLED: "User Enabled",
  FIRST_VEHICLE_ADDED: "First Vehicle",
  FIRST_WARRANTY_CASE: "First Warranty Case",
  FIRST_APPRAISAL: "First Appraisal",
};

export default function AdminDashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState("dealers");
  const [dealers, setDealers] = useState([]);
  const [users, setUsers] = useState([]);
  const [activity, setActivity] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  // Check access and fetch data
  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/auth/signin");
      return;
    }

    fetchData();
  }, [session, status, router]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [dealersRes, usersRes, activityRes] = await Promise.all([
        fetch("/api/admin/dealers"),
        fetch("/api/admin/users"),
        fetch("/api/admin/activity?limit=30"),
      ]);

      // Check for 403 - not authorized
      if (dealersRes.status === 403 || usersRes.status === 403) {
        setError("Access denied. This area is restricted to platform administrators.");
        setIsLoading(false);
        return;
      }

      if (!dealersRes.ok || !usersRes.ok || !activityRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const [dealersData, usersData, activityData] = await Promise.all([
        dealersRes.json(),
        usersRes.json(),
        activityRes.json(),
      ]);

      setDealers(dealersData);
      setUsers(usersData);
      setActivity(activityData.activities || []);
    } catch (err) {
      console.error("Admin fetch error:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDealerStatus = async (dealerId, currentStatus) => {
    const newStatus = currentStatus === "ACTIVE" ? "DISABLED" : "ACTIVE";
    setActionLoading(dealerId);

    try {
      const res = await fetch("/api/admin/dealers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealerId, status: newStatus }),
      });

      if (!res.ok) throw new Error("Failed to update dealer");

      // Update local state
      setDealers((prev) =>
        prev.map((d) => (d.id === dealerId ? { ...d, status: newStatus } : d))
      );

      // Refresh activity
      const activityRes = await fetch("/api/admin/activity?limit=30");
      if (activityRes.ok) {
        const activityData = await activityRes.json();
        setActivity(activityData.activities || []);
      }
    } catch (err) {
      console.error("Toggle dealer error:", err);
      alert("Failed to update dealer status");
    } finally {
      setActionLoading(null);
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === "ACTIVE" ? "DISABLED" : "ACTIVE";
    setActionLoading(userId);

    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update user");
      }

      // Update local state
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u))
      );

      // Refresh activity
      const activityRes = await fetch("/api/admin/activity?limit=30");
      if (activityRes.ok) {
        const activityData = await activityRes.json();
        setActivity(activityData.activities || []);
      }
    } catch (err) {
      console.error("Toggle user error:", err);
      alert(err.message || "Failed to update user status");
    } finally {
      setActionLoading(null);
    }
  };

  // Access denied state
  if (error === "Access denied. This area is restricted to platform administrators.") {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-slate-400 mb-6">This area is restricted to platform administrators.</p>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Platform Admin | DealerFlow</title>
      </Head>

      <div className="min-h-screen bg-slate-900">
        {/* Header */}
        <header className="bg-slate-800 border-b border-slate-700">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Platform Admin</h1>
                <p className="text-xs text-slate-400">DealerFlow Master Control</p>
              </div>
            </div>
            <button
              onClick={() => router.push("/")}
              className="text-sm text-slate-400 hover:text-white transition"
            >
              Exit Admin
            </button>
          </div>
        </header>

        {/* Tabs */}
        <div className="bg-slate-800/50 border-b border-slate-700">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex gap-1">
              {[
                { key: "dealers", label: "Dealers", count: dealers.length },
                { key: "users", label: "Users", count: users.length },
                { key: "activity", label: "Activity", count: activity.length },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-3 text-sm font-medium transition border-b-2 ${
                    activeTab === tab.key
                      ? "text-white border-red-500"
                      : "text-slate-400 border-transparent hover:text-white hover:border-slate-500"
                  }`}
                >
                  {tab.label}
                  <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-slate-700">
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <main className="max-w-7xl mx-auto px-4 py-6">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-red-400">{error}</p>
              <button
                onClick={fetchData}
                className="mt-4 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* Dealers Tab */}
              {activeTab === "dealers" && (
                <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-700/50">
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Dealer</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Owner</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Created</th>
                          <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Users</th>
                          <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Vehicles</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Modules</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Last Active</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Status</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700">
                        {dealers.map((dealer) => (
                          <tr key={dealer.id} className="hover:bg-slate-700/30">
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-medium text-white">{dealer.name}</p>
                                {dealer.completedOnboarding ? (
                                  <span className="text-xs text-emerald-400">Onboarded</span>
                                ) : (
                                  <span className="text-xs text-amber-400">Pending onboarding</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-sm text-slate-300">{dealer.ownerName}</p>
                              <p className="text-xs text-slate-500">{dealer.ownerEmail}</p>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-400">{formatDate(dealer.createdAt)}</td>
                            <td className="px-4 py-3 text-center text-sm text-slate-300">{dealer.usersCount}</td>
                            <td className="px-4 py-3 text-center text-sm text-slate-300">{dealer.vehiclesCount}</td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1 flex-wrap">
                                {Object.entries(dealer.enabledModules || {}).map(
                                  ([key, enabled]) =>
                                    enabled && (
                                      <span
                                        key={key}
                                        className="px-2 py-0.5 text-[10px] font-medium rounded bg-slate-700 text-slate-300"
                                      >
                                        {key}
                                      </span>
                                    )
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-400">
                              {formatDateTime(dealer.lastActivityAt)}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded ${
                                  dealer.status === "ACTIVE"
                                    ? "bg-emerald-500/10 text-emerald-400"
                                    : "bg-red-500/10 text-red-400"
                                }`}
                              >
                                {dealer.status || "ACTIVE"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => toggleDealerStatus(dealer.id, dealer.status || "ACTIVE")}
                                disabled={actionLoading === dealer.id}
                                className={`px-3 py-1 text-xs font-medium rounded transition ${
                                  dealer.status === "DISABLED"
                                    ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                                    : "bg-red-600 hover:bg-red-500 text-white"
                                } disabled:opacity-50`}
                              >
                                {actionLoading === dealer.id ? "..." : dealer.status === "DISABLED" ? "Enable" : "Disable"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {dealers.length === 0 && (
                    <div className="text-center py-12 text-slate-500">No dealers yet</div>
                  )}
                </div>
              )}

              {/* Users Tab */}
              {activeTab === "users" && (
                <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-700/50">
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">User</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Role</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Dealer</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Joined</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Last Active</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Status</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700">
                        {users.map((user) => (
                          <tr key={user.id} className="hover:bg-slate-700/30">
                            <td className="px-4 py-3">
                              <p className="font-medium text-white">{user.fullName}</p>
                              <p className="text-xs text-slate-500">{user.email}</p>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-1">
                                {user.platformRole === "SUPER_ADMIN" && (
                                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-red-500/20 text-red-400">
                                    SUPER ADMIN
                                  </span>
                                )}
                                {user.dealerRole !== "—" && (
                                  <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-slate-700 text-slate-300">
                                    {user.dealerRole}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-300">
                              {user.dealerName}
                              {user.membershipsCount > 1 && (
                                <span className="ml-1 text-xs text-slate-500">
                                  +{user.membershipsCount - 1}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-400">{formatDate(user.createdAt)}</td>
                            <td className="px-4 py-3 text-sm text-slate-400">{formatDateTime(user.lastActiveAt)}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded ${
                                  user.status === "ACTIVE" || !user.status
                                    ? "bg-emerald-500/10 text-emerald-400"
                                    : "bg-red-500/10 text-red-400"
                                }`}
                              >
                                {user.status || "ACTIVE"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              {user.platformRole !== "SUPER_ADMIN" && (
                                <button
                                  onClick={() => toggleUserStatus(user.id, user.status || "ACTIVE")}
                                  disabled={actionLoading === user.id}
                                  className={`px-3 py-1 text-xs font-medium rounded transition ${
                                    user.status === "DISABLED"
                                      ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                                      : "bg-red-600 hover:bg-red-500 text-white"
                                  } disabled:opacity-50`}
                                >
                                  {actionLoading === user.id
                                    ? "..."
                                    : user.status === "DISABLED"
                                    ? "Enable"
                                    : "Disable"}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {users.length === 0 && (
                    <div className="text-center py-12 text-slate-500">No users yet</div>
                  )}
                </div>
              )}

              {/* Activity Tab */}
              {activeTab === "activity" && (
                <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                  <div className="divide-y divide-slate-700">
                    {activity.map((item) => (
                      <div key={item.id} className="px-4 py-3 hover:bg-slate-700/30">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="text-sm text-white">
                              <span className="font-medium text-slate-300">
                                {ACTIVITY_LABELS[item.type] || item.type}
                              </span>
                              {item.actorName && (
                                <span className="text-slate-500"> by {item.actorName}</span>
                              )}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                              {item.dealerName && <span>Dealer: {item.dealerName}</span>}
                              {item.targetName && <span>User: {item.targetName}</span>}
                            </div>
                          </div>
                          <span className="text-xs text-slate-500 shrink-0">
                            {formatDateTime(item.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {activity.length === 0 && (
                    <div className="text-center py-12 text-slate-500">No activity yet</div>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}
