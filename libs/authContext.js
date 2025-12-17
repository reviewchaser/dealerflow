/**
 * Authentication and Dealer Context Helpers
 *
 * All server actions and API routes should use these helpers to:
 * 1. Validate the user's session
 * 2. Resolve the current dealer from membership
 * 3. Scope all queries by dealerId
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/authOptions";
import DealerMembership, { MEMBERSHIP_ROLES } from "@/models/DealerMembership";
import User, { PLATFORM_ROLES, USER_STATUS } from "@/models/User";
import { DEALER_STATUS } from "@/models/Dealer";
import connectMongo from "@/libs/mongoose";

/**
 * Custom error class for auth/access errors
 */
export class AuthError extends Error {
  constructor(message, status = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

/**
 * Get the current user's session
 * @param {object} req - Request object
 * @param {object} res - Response object
 * @returns {Promise<object|null>} Session or null
 */
export async function getSession(req, res) {
  return getServerSession(req, res, authOptions);
}

/**
 * Require authenticated user (no dealer context)
 * Use this for routes that don't need dealer scoping (e.g., profile, invite accept)
 *
 * @param {object} req - Request object
 * @param {object} res - Response object
 * @returns {Promise<{ user: object, userId: string }>}
 * @throws {AuthError} if not authenticated
 */
export async function requireAuth(req, res) {
  await connectMongo();

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    throw new AuthError("Unauthorized - Please sign in", 401);
  }

  return {
    user: session.user,
    userId: session.user.id,
  };
}

/**
 * Get authenticated dealer context for API routes
 * This is the primary helper for most API routes.
 *
 * IMPORTANT: SUPER_ADMIN users are blocked from dealer context.
 * They should use requireSuperAdmin() instead.
 *
 * @param {object} req - Request object
 * @param {object} res - Response object
 * @returns {Promise<{ user, dealer, membership, userId, dealerId, role }>}
 * @throws {AuthError} if not authenticated or no dealer access
 */
export async function requireDealerContext(req, res) {
  await connectMongo();

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    throw new AuthError("Unauthorized - Please sign in", 401);
  }

  const userId = session.user.id;

  // Get user's preferred dealer or most recently active membership
  const user = await User.findById(userId).lean();

  // Check if user is disabled
  if (user?.status === USER_STATUS.DISABLED) {
    throw new AuthError(
      "Your account has been disabled. Please contact support.",
      403
    );
  }

  // SUPER_ADMIN users cannot access dealer context
  if (user?.role === PLATFORM_ROLES.SUPER_ADMIN) {
    throw new AuthError(
      "Platform admins cannot access dealer workflows. Use the admin panel instead.",
      403
    );
  }

  let membership;

  // Check for preferred dealer first
  if (user?.defaultDealerId) {
    membership = await DealerMembership.findOneActive({
      userId,
      dealerId: user.defaultDealerId,
    }).populate("dealerId");
  }

  // Fall back to most recently active membership
  if (!membership) {
    membership = await DealerMembership.findOneActive({ userId })
      .sort({ lastActiveAt: -1 })
      .populate("dealerId");
  }

  if (!membership) {
    throw new AuthError(
      "No dealer access. Please accept an invitation or create a dealership.",
      403
    );
  }

  const dealer = membership.dealerId;

  // Check if dealer is disabled
  if (dealer?.status === DEALER_STATUS.DISABLED) {
    throw new AuthError(
      "This dealership has been disabled. Please contact support.",
      403
    );
  }

  // Update last active timestamp (fire and forget)
  DealerMembership.updateOne(
    { _id: membership._id },
    { lastActiveAt: new Date() }
  ).exec();

  return {
    user: session.user,
    userId,
    dealer,
    dealerId: dealer._id || dealer,
    membership: {
      id: membership._id,
      role: membership.role,
    },
    role: membership.role,
  };
}

/**
 * Check if user has required role(s)
 *
 * @param {{ role: string }} membership - Membership object with role
 * @param {string[]} allowedRoles - Array of allowed roles
 * @throws {AuthError} if role not allowed
 */
export function requireRole(membership, allowedRoles) {
  if (!allowedRoles.includes(membership.role)) {
    throw new AuthError(
      `This action requires ${allowedRoles.join(" or ")} role`,
      403
    );
  }
}

/**
 * Check if user can manage team (OWNER or ADMIN)
 *
 * @param {{ role: string }} membership
 * @throws {AuthError} if not allowed
 */
export function requireTeamManagement(membership) {
  requireRole(membership, ["OWNER", "ADMIN"]);
}

/**
 * Check if user can assign a specific role
 * - OWNER can assign any role
 * - ADMIN can assign ADMIN, STAFF, WORKSHOP (not OWNER)
 *
 * @param {{ role: string }} membership - Current user's membership
 * @param {string} targetRole - Role being assigned
 * @throws {AuthError} if not allowed
 */
export function canAssignRole(membership, targetRole) {
  if (membership.role === "OWNER") {
    return true; // Owner can assign any role
  }

  if (membership.role === "ADMIN") {
    if (targetRole === "OWNER") {
      throw new AuthError("Only owners can assign the OWNER role", 403);
    }
    return true;
  }

  throw new AuthError("You don't have permission to manage team members", 403);
}

/**
 * Wrapper for API routes with dealer context
 * Automatically handles errors and returns proper status codes
 *
 * @param {function} handler - Async handler function(req, res, ctx)
 * @returns {function} Wrapped handler
 *
 * @example
 * export default withDealerContext(async (req, res, ctx) => {
 *   const { dealerId, userId, role } = ctx;
 *   // Your logic here
 * });
 */
export function withDealerContext(handler) {
  return async (req, res) => {
    try {
      const ctx = await requireDealerContext(req, res);
      return await handler(req, res, ctx);
    } catch (error) {
      console.error("[withDealerContext]", error.message);
      const status = error.status || 500;
      return res.status(status).json({ error: error.message });
    }
  };
}

/**
 * Wrapper for API routes that only need auth (no dealer context)
 *
 * @param {function} handler - Async handler function(req, res, ctx)
 * @returns {function} Wrapped handler
 */
export function withAuth(handler) {
  return async (req, res) => {
    try {
      const ctx = await requireAuth(req, res);
      return await handler(req, res, ctx);
    } catch (error) {
      console.error("[withAuth]", error.message);
      const status = error.status || 500;
      return res.status(status).json({ error: error.message });
    }
  };
}

/**
 * Get all memberships for a user (for dealer switcher UI)
 *
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export async function getUserMemberships(userId) {
  await connectMongo();
  return DealerMembership.findActive({ userId })
    .populate("dealerId", "name logoUrl")
    .sort({ lastActiveAt: -1 })
    .lean();
}

/**
 * Require SUPER_ADMIN role for platform admin routes
 * This is completely separate from dealer context.
 *
 * @param {object} req - Request object
 * @param {object} res - Response object
 * @returns {Promise<{ user: object, userId: string }>}
 * @throws {AuthError} if not authenticated or not SUPER_ADMIN
 */
export async function requireSuperAdmin(req, res) {
  await connectMongo();

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    throw new AuthError("Unauthorized - Please sign in", 401);
  }

  const userId = session.user.id;
  const user = await User.findById(userId).lean();

  if (!user || user.role !== PLATFORM_ROLES.SUPER_ADMIN) {
    throw new AuthError("Access denied. This area is restricted to platform administrators.", 403);
  }

  return {
    user: { ...session.user, role: user.role },
    userId,
  };
}

/**
 * Wrapper for API routes that require SUPER_ADMIN
 *
 * @param {function} handler - Async handler function(req, res, ctx)
 * @returns {function} Wrapped handler
 */
export function withSuperAdmin(handler) {
  return async (req, res) => {
    try {
      const ctx = await requireSuperAdmin(req, res);
      return await handler(req, res, ctx);
    } catch (error) {
      console.error("[withSuperAdmin]", error.message);
      const status = error.status || 500;
      return res.status(status).json({ error: error.message });
    }
  };
}

export { MEMBERSHIP_ROLES, PLATFORM_ROLES };
