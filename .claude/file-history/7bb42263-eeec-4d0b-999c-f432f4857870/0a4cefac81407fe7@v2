import { useEffect, useState } from "react";
import Head from "next/head";
import DashboardLayout from "@/components/DashboardLayout";
import toast from "react-hot-toast";

const ROLES = ["OWNER", "ADMIN", "STAFF", "WORKSHOP"];

const ROLE_DESCRIPTIONS = {
  OWNER: "Full access, can manage team and billing",
  ADMIN: "Full access, can manage team (except owners)",
  STAFF: "Can manage vehicles, forms, and customers",
  WORKSHOP: "Limited access to tasks and forms",
};

const ROLE_COLORS = {
  OWNER: "badge-primary",
  ADMIN: "badge-secondary",
  STAFF: "badge-accent",
  WORKSHOP: "badge-ghost",
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

      <div className="mb-8">
        <h1 className="text-3xl font-bold">Team</h1>
        <p className="text-base-content/60 mt-2">
          Manage your team members and invitations
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Email Not Configured Banner */}
          {emailStatus && !emailStatus.configured && (
            <div className="alert alert-warning">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 className="font-bold">Email invites disabled</h3>
                <p className="text-sm">
                  Invite emails cannot be sent until email is configured.
                  {emailStatus.missing?.length > 0 && (
                    <span className="block mt-1">
                      Missing: <code className="text-xs bg-base-300 px-1 rounded">{emailStatus.missing.join(", ")}</code>
                    </span>
                  )}
                </p>
                <p className="text-xs mt-1 opacity-70">
                  {process.env.NODE_ENV === "development"
                    ? "In development mode, invite links will be logged to the console."
                    : "Contact your administrator to configure email settings."}
                </p>
              </div>
            </div>
          )}

          {/* Invite Form */}
          {canManageTeam && (
            <div className="card bg-base-200">
              <div className="card-body">
                <h2 className="card-title">Invite Team Member</h2>
                <form onSubmit={handleInvite} className="flex flex-wrap gap-4 mt-4">
                  <div className="form-control flex-1 min-w-[200px]">
                    <input
                      type="email"
                      className="input input-bordered"
                      placeholder="colleague@dealership.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-control">
                    <select
                      className="select select-bordered"
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                    >
                      {ROLES.map((role) => (
                        <option
                          key={role}
                          value={role}
                          disabled={role === "OWNER" && !isOwner}
                        >
                          {role}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={inviting || !inviteEmail.trim()}
                  >
                    {inviting ? (
                      <span className="loading loading-spinner loading-sm"></span>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Send Invite
                      </>
                    )}
                  </button>
                  <div className="divider divider-horizontal mx-1">or</div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowCreateUserModal(true)}
                  >
                    <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    Create User
                  </button>
                </form>
                <p className="text-xs text-base-content/50 mt-2">
                  Invites expire after 7 days. Use "Create User" to add team members without sending an invite email.
                </p>
              </div>
            </div>
          )}

          {/* Members Table */}
          <div className="card bg-base-200">
            <div className="card-body">
              <h2 className="card-title">Team Members ({members.length})</h2>
              <div className="overflow-x-auto mt-4">
                <table className="table table-zebra">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Role</th>
                      <th>Joined</th>
                      {canManageTeam && <th className="w-32">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <tr key={member.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="avatar placeholder">
                              <div className="bg-neutral text-neutral-content rounded-full w-10">
                                {member.image ? (
                                  <img src={member.image} alt={member.name} />
                                ) : (
                                  <span className="text-sm">
                                    {member.name?.charAt(0)?.toUpperCase() || "?"}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="font-semibold">
                                {member.name}
                                {member.isCurrentUser && (
                                  <span className="ml-2 text-xs text-base-content/50">(you)</span>
                                )}
                              </div>
                              <div className="text-sm text-base-content/60">{member.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          {canManageTeam && !member.isCurrentUser ? (
                            <select
                              className={`select select-sm select-bordered ${ROLE_COLORS[member.role]}`}
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
                                  {role}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className={`badge ${ROLE_COLORS[member.role]}`}>
                              {member.role}
                            </span>
                          )}
                        </td>
                        <td className="text-sm text-base-content/60">
                          {new Date(member.joinedAt).toLocaleDateString()}
                        </td>
                        {canManageTeam && (
                          <td>
                            {!member.isCurrentUser && (
                              <button
                                className="btn btn-ghost btn-sm text-error"
                                onClick={() => handleRemoveMember(member.id, member.name)}
                                disabled={member.role === "OWNER" && !isOwner}
                              >
                                Remove
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Pending Invites */}
          {canManageTeam && invites.length > 0 && (
            <div className="card bg-base-200">
              <div className="card-body">
                <h2 className="card-title">Pending Invites ({invites.length})</h2>
                <div className="overflow-x-auto mt-4">
                  <table className="table table-zebra">
                    <thead>
                      <tr>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Invited By</th>
                        <th>Status</th>
                        <th className="w-40">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invites.map((invite) => (
                        <tr key={invite.id}>
                          <td className="font-medium">{invite.email}</td>
                          <td>
                            <span className={`badge ${ROLE_COLORS[invite.role]}`}>
                              {invite.role}
                            </span>
                          </td>
                          <td className="text-sm text-base-content/60">{invite.invitedBy}</td>
                          <td>
                            {invite.isExpired ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">Expired</span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Pending</span>
                            )}
                            <div className="text-xs text-base-content/50 mt-1">
                              Expires: {new Date(invite.expiresAt).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="space-x-1">
                            <button
                              className="btn btn-ghost btn-xs"
                              onClick={() => handleResendInvite(invite.id)}
                            >
                              Resend
                            </button>
                            <button
                              className="btn btn-ghost btn-xs text-error"
                              onClick={() => handleRevokeInvite(invite.id)}
                            >
                              Revoke
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Role Permissions Guide */}
          <div className="card bg-base-200">
            <div className="card-body">
              <h2 className="card-title">Role Permissions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                {ROLES.map((role) => (
                  <div key={role} className="p-4 bg-base-100 rounded-lg">
                    <span className={`badge ${ROLE_COLORS[role]} mb-2`}>{role}</span>
                    <p className="text-sm text-base-content/70">{ROLE_DESCRIPTIONS[role]}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateUserModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Create User</h3>
              <button
                type="button"
                onClick={() => {
                  setShowCreateUserModal(false);
                  setCreateUserForm({ name: "", email: "", password: "", role: "STAFF" });
                }}
                className="btn btn-ghost btn-sm btn-circle"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="space-y-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Name *</span>
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
                    <span className="label-text font-medium">Email *</span>
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
                    <span className="label-text font-medium">Password *</span>
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
                    <span className="label-text-alt text-base-content/50">The user can log in immediately with this password</span>
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
                        {role} - {ROLE_DESCRIPTIONS[role]}
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
                  className="btn btn-primary"
                  disabled={creatingUser}
                >
                  {creatingUser ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    "Create User"
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
