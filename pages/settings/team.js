import { useEffect, useState } from "react";
import Head from "next/head";
import DashboardLayout from "@/components/DashboardLayout";
import toast from "react-hot-toast";

const ROLES = ["OWNER", "ADMIN", "STAFF", "WORKSHOP"];

const ROLE_CONFIG = {
  OWNER: {
    label: "Owner",
    description: "Full access, can manage team and billing",
    color: "bg-purple-100 text-purple-700 border-purple-200",
    iconBg: "bg-purple-500",
  },
  ADMIN: {
    label: "Admin",
    description: "Full access, can manage team (except owners)",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    iconBg: "bg-blue-500",
  },
  STAFF: {
    label: "Staff",
    description: "Can manage vehicles, forms, and customers",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    iconBg: "bg-emerald-500",
  },
  WORKSHOP: {
    label: "Workshop",
    description: "Workshop technician - can update tasks and view vehicles",
    color: "bg-amber-100 text-amber-700 border-amber-200",
    iconBg: "bg-amber-500",
  },
};

export default function TeamSettings() {
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [emailStatus, setEmailStatus] = useState(null);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("STAFF");
  const [inviting, setInviting] = useState(false);

  // Create user form (direct creation without email invite)
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "STAFF",
  });
  const [creatingUser, setCreatingUser] = useState(false);

  useEffect(() => {
    fetchTeamData();
  }, []);

  const fetchTeamData = async () => {
    setLoading(true);
    try {
      const [membersRes, invitesRes, emailRes] = await Promise.all([
        fetch("/api/team/members"),
        fetch("/api/team/invites"),
        fetch("/api/team/email-status"),
      ]);

      if (membersRes.ok) {
        const membersData = await membersRes.json();
        setMembers(membersData);
        // Find current user's role
        const currentUser = membersData.find((m) => m.isCurrentUser);
        setCurrentUserRole(currentUser?.role || null);
      }

      if (invitesRes.ok) {
        const invitesData = await invitesRes.json();
        setInvites(invitesData);
      }

      if (emailRes.ok) {
        const emailData = await emailRes.json();
        setEmailStatus(emailData);
      }
    } catch (error) {
      toast.error("Failed to load team data");
    } finally {
      setLoading(false);
    }
  };

  const canManageTeam = ["OWNER", "ADMIN"].includes(currentUserRole);
  const isOwner = currentUserRole === "OWNER";

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviting(true);
    try {
      const res = await fetch("/api/team/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(`Invite sent to ${inviteEmail}`);
        setInviteEmail("");
        setInviteRole("STAFF");
        fetchTeamData();

        // Show invite URL in dev mode
        if (data.inviteUrl) {
          console.log("Invite URL (dev mode):", data.inviteUrl);
        }
      } else {
        toast.error(data.error || "Failed to send invite");
      }
    } catch (error) {
      toast.error("Failed to send invite");
    } finally {
      setInviting(false);
    }
  };

  const handleChangeRole = async (membershipId, newRole) => {
    try {
      const res = await fetch("/api/team/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membershipId, newRole }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Role updated");
        fetchTeamData();
      } else {
        toast.error(data.error || "Failed to update role");
      }
    } catch (error) {
      toast.error("Failed to update role");
    }
  };

  const handleRemoveMember = async (membershipId, memberName) => {
    if (!confirm(`Remove ${memberName} from the team?`)) return;

    try {
      const res = await fetch("/api/team/members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membershipId }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Member removed");
        fetchTeamData();
      } else {
        toast.error(data.error || "Failed to remove member");
      }
    } catch (error) {
      toast.error("Failed to remove member");
    }
  };

  const handleResendInvite = async (inviteId) => {
    try {
      const res = await fetch("/api/team/invites", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteId }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Invite resent");
        fetchTeamData();
      } else {
        toast.error(data.error || "Failed to resend invite");
      }
    } catch (error) {
      toast.error("Failed to resend invite");
    }
  };

  const handleRevokeInvite = async (inviteId) => {
    if (!confirm("Revoke this invite?")) return;

    try {
      const res = await fetch("/api/team/invites", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteId }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Invite revoked");
        fetchTeamData();
      } else {
        toast.error(data.error || "Failed to revoke invite");
      }
    } catch (error) {
      toast.error("Failed to revoke invite");
    }
  };

  // Create user directly (no email invite)
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!createUserForm.name.trim() || !createUserForm.email.trim() || !createUserForm.password) {
      return toast.error("Please fill in all fields");
    }
    if (createUserForm.password.length < 6) {
      return toast.error("Password must be at least 6 characters");
    }

    setCreatingUser(true);
    try {
      const res = await fetch("/api/team/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createUserForm),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("User created successfully");
        setShowCreateUserModal(false);
        setCreateUserForm({ name: "", email: "", password: "", role: "STAFF" });
        fetchTeamData();
      } else {
        toast.error(data.error || "Failed to create user");
      }
    } catch (error) {
      toast.error("Failed to create user");
    } finally {
      setCreatingUser(false);
    }
  };

  return (
    <DashboardLayout>
      <Head>
        <title>Team Settings | DealerFlow</title>
      </Head>

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Team</h1>
            <p className="text-slate-500 mt-1">
              Manage your team members and permissions
            </p>
          </div>
          {canManageTeam && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowCreateUserModal(true)}
                className="btn btn-outline btn-sm gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Create User
              </button>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Email Not Configured Banner */}
          {emailStatus && !emailStatus.configured && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-amber-800">Email invites disabled</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    Invite emails cannot be sent until email is configured.
                    {emailStatus.missing?.length > 0 && (
                      <span className="block mt-1">
                        Missing: <code className="text-xs bg-amber-100 px-1.5 py-0.5 rounded font-mono">{emailStatus.missing.join(", ")}</code>
                      </span>
                    )}
                  </p>
                  <p className="text-xs mt-2 text-amber-600">
                    {process.env.NODE_ENV === "development"
                      ? "In development mode, invite links will be logged to the console."
                      : "Contact your administrator to configure email settings."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Invite Form */}
          {canManageTeam && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Invite Team Member</h2>
              <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <input
                    type="email"
                    className="input input-bordered w-full"
                    placeholder="colleague@dealership.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                </div>
                <select
                  className="select select-bordered w-full sm:w-auto"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                >
                  {ROLES.map((role) => (
                    <option
                      key={role}
                      value={role}
                      disabled={role === "OWNER" && !isOwner}
                    >
                      {ROLE_CONFIG[role].label}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="btn btn-primary gap-2"
                  disabled={inviting || !inviteEmail.trim()}
                >
                  {inviting ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Send Invite
                    </>
                  )}
                </button>
              </form>
              <p className="text-xs text-slate-400 mt-3">
                Invites expire after 7 days. Use "Create User" to add team members without sending an invite email.
              </p>
            </div>
          )}

          {/* Team Members */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Team Members</h2>
                <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg">
                  {members.length} {members.length === 1 ? "member" : "members"}
                </span>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {members.map((member) => (
                <div key={member.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <div className={`w-12 h-12 rounded-xl ${ROLE_CONFIG[member.role].iconBg} flex items-center justify-center text-white font-semibold text-lg shadow-sm`}>
                        {member.image ? (
                          <img src={member.image} alt={member.name} className="w-12 h-12 rounded-xl object-cover" />
                        ) : (
                          member.name?.charAt(0)?.toUpperCase() || "?"
                        )}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-900 truncate">{member.name}</h3>
                        {member.isCurrentUser && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs font-medium rounded-full">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 truncate">{member.email}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${ROLE_CONFIG[member.role].color}`}>
                          {ROLE_CONFIG[member.role].label}
                        </span>
                        <span className="text-xs text-slate-400">
                          Joined {new Date(member.joinedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    {canManageTeam && !member.isCurrentUser && (
                      <div className="flex items-center gap-2">
                        <select
                          className="select select-bordered select-sm"
                          value={member.role}
                          onChange={(e) => handleChangeRole(member.id, e.target.value)}
                          disabled={member.role === "OWNER" && !isOwner}
                        >
                          {ROLES.map((role) => (
                            <option
                              key={role}
                              value={role}
                              disabled={role === "OWNER" && !isOwner}
                            >
                              {ROLE_CONFIG[role].label}
                            </option>
                          ))}
                        </select>
                        <button
                          className="btn btn-ghost btn-sm btn-square text-slate-400 hover:text-red-500 hover:bg-red-50"
                          onClick={() => handleRemoveMember(member.id, member.name)}
                          disabled={member.role === "OWNER" && !isOwner}
                          title="Remove member"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Invites */}
          {canManageTeam && invites.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">Pending Invites</h2>
                  <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-sm font-medium rounded-lg">
                    {invites.length} pending
                  </span>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {invites.map((invite) => (
                  <div key={invite.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      {/* Icon */}
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 truncate">{invite.email}</h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${ROLE_CONFIG[invite.role].color}`}>
                            {ROLE_CONFIG[invite.role].label}
                          </span>
                          {invite.isExpired ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200">
                              Expired
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-200">
                              Pending
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Invited by {invite.invitedBy} &middot; Expires {new Date(invite.expiresAt).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleResendInvite(invite.id)}
                        >
                          Resend
                        </button>
                        <button
                          className="btn btn-ghost btn-sm text-red-500 hover:bg-red-50"
                          onClick={() => handleRevokeInvite(invite.id)}
                        >
                          Revoke
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Role Permissions Guide */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Role Permissions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {ROLES.map((role) => (
                <div key={role} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${ROLE_CONFIG[role].color}`}>
                    {ROLE_CONFIG[role].label}
                  </span>
                  <p className="text-sm text-slate-600 mt-2">{ROLE_CONFIG[role].description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateUserModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">Create User</h3>
              <button
                type="button"
                onClick={() => {
                  setShowCreateUserModal(false);
                  setCreateUserForm({ name: "", email: "", password: "", role: "STAFF" });
                }}
                className="btn btn-ghost btn-sm btn-circle"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="space-y-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Name</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    placeholder="John Smith"
                    value={createUserForm.name}
                    onChange={(e) => setCreateUserForm({ ...createUserForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Email</span>
                  </label>
                  <input
                    type="email"
                    className="input input-bordered w-full"
                    placeholder="john@example.com"
                    value={createUserForm.email}
                    onChange={(e) => setCreateUserForm({ ...createUserForm, email: e.target.value })}
                    required
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Password</span>
                  </label>
                  <input
                    type="password"
                    className="input input-bordered w-full"
                    placeholder="Minimum 6 characters"
                    value={createUserForm.password}
                    onChange={(e) => setCreateUserForm({ ...createUserForm, password: e.target.value })}
                    minLength={6}
                    required
                  />
                  <label className="label">
                    <span className="label-text-alt text-slate-400">The user can log in immediately with this password</span>
                  </label>
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Role</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={createUserForm.role}
                    onChange={(e) => setCreateUserForm({ ...createUserForm, role: e.target.value })}
                  >
                    {ROLES.map((role) => (
                      <option
                        key={role}
                        value={role}
                        disabled={role === "OWNER" && !isOwner}
                      >
                        {ROLE_CONFIG[role].label} - {ROLE_CONFIG[role].description}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-action">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setShowCreateUserModal(false);
                    setCreateUserForm({ name: "", email: "", password: "", role: "STAFF" });
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary gap-2"
                  disabled={creatingUser}
                >
                  {creatingUser ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      Create User
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={() => setShowCreateUserModal(false)} />
        </div>
      )}
    </DashboardLayout>
  );
}
