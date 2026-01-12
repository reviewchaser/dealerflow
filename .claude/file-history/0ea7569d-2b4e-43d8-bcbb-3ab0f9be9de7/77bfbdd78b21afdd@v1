import ActivityLog, { ACTIVITY_TYPE } from "@/models/ActivityLog";

/**
 * Activity Logger Utility
 *
 * Provides helper functions to log various activities throughout the system.
 * These functions are designed to be non-blocking and fail-safe.
 */

/**
 * Log a vehicle location change
 */
export async function logVehicleLocationChange({
  dealerId,
  vehicleId,
  vehicleReg,
  vehicleMakeModel,
  previousLocation,
  newLocation,
  userId,
  userName,
}) {
  return ActivityLog.log({
    dealerId,
    type: ACTIVITY_TYPE.VEHICLE_LOCATION_CHANGED,
    description: `${vehicleReg} moved to ${newLocation}`,
    userId,
    userName,
    vehicleId,
    vehicleReg,
    vehicleMakeModel,
    metadata: {
      previousLocation,
      newLocation,
    },
  });
}

/**
 * Log a vehicle status change
 */
export async function logVehicleStatusChange({
  dealerId,
  vehicleId,
  vehicleReg,
  vehicleMakeModel,
  previousStatus,
  newStatus,
  userId,
  userName,
}) {
  const statusLabels = {
    appraised: "Appraised",
    in_stock: "In Stock",
    in_prep: "Advertised",
    live: "Sold in Progress",
    reserved: "Reserved",
    sold: "Sold",
    delivered: "Delivered",
    archived: "Archived",
  };

  return ActivityLog.log({
    dealerId,
    type: ACTIVITY_TYPE.VEHICLE_STATUS_CHANGED,
    description: `${vehicleReg} status changed to ${statusLabels[newStatus] || newStatus}`,
    userId,
    userName,
    vehicleId,
    vehicleReg,
    vehicleMakeModel,
    metadata: {
      previousValue: previousStatus,
      newValue: newStatus,
    },
  });
}

/**
 * Log an issue created
 */
export async function logIssueCreated({
  dealerId,
  issueId,
  vehicleId,
  vehicleReg,
  vehicleMakeModel,
  category,
  subcategory,
  priority,
  userId,
  userName,
}) {
  return ActivityLog.log({
    dealerId,
    type: ACTIVITY_TYPE.ISSUE_CREATED,
    description: `Issue added: ${subcategory || category} on ${vehicleReg}`,
    userId,
    userName,
    vehicleId,
    vehicleReg,
    vehicleMakeModel,
    issueId,
    metadata: {
      issueCategory: category,
      issuePriority: priority,
    },
  });
}

/**
 * Log an issue resolved
 */
export async function logIssueResolved({
  dealerId,
  issueId,
  vehicleId,
  vehicleReg,
  vehicleMakeModel,
  category,
  subcategory,
  userId,
  userName,
}) {
  return ActivityLog.log({
    dealerId,
    type: ACTIVITY_TYPE.ISSUE_RESOLVED,
    description: `Issue resolved: ${subcategory || category} on ${vehicleReg}`,
    userId,
    userName,
    vehicleId,
    vehicleReg,
    vehicleMakeModel,
    issueId,
    metadata: {
      issueCategory: category,
    },
  });
}

/**
 * Log a task completed
 */
export async function logTaskCompleted({
  dealerId,
  taskId,
  vehicleId,
  vehicleReg,
  vehicleMakeModel,
  taskName,
  userId,
  userName,
}) {
  return ActivityLog.log({
    dealerId,
    type: ACTIVITY_TYPE.TASK_COMPLETED,
    description: `${taskName} completed on ${vehicleReg}`,
    userId,
    userName,
    vehicleId,
    vehicleReg,
    vehicleMakeModel,
    taskId,
    metadata: {
      taskName,
    },
  });
}

/**
 * Log a vehicle added
 */
export async function logVehicleAdded({
  dealerId,
  vehicleId,
  vehicleReg,
  vehicleMakeModel,
  userId,
  userName,
}) {
  return ActivityLog.log({
    dealerId,
    type: ACTIVITY_TYPE.VEHICLE_ADDED,
    description: `Vehicle added: ${vehicleReg} ${vehicleMakeModel || ""}`.trim(),
    userId,
    userName,
    vehicleId,
    vehicleReg,
    vehicleMakeModel,
  });
}

/**
 * Log a deal created
 */
export async function logDealCreated({
  dealerId,
  dealId,
  vehicleId,
  vehicleReg,
  vehicleMakeModel,
  customerName,
  amount,
  userId,
  userName,
}) {
  return ActivityLog.log({
    dealerId,
    type: ACTIVITY_TYPE.DEAL_CREATED,
    description: `Deal created for ${vehicleReg} ${vehicleMakeModel || ""}`.trim(),
    userId,
    userName,
    vehicleId,
    vehicleReg,
    vehicleMakeModel,
    dealId,
    metadata: {
      customerName,
      amount,
    },
  });
}

/**
 * Log deposit taken
 */
export async function logDepositTaken({
  dealerId,
  dealId,
  vehicleId,
  vehicleReg,
  vehicleMakeModel,
  customerName,
  amount,
  userId,
  userName,
}) {
  return ActivityLog.log({
    dealerId,
    type: ACTIVITY_TYPE.DEPOSIT_TAKEN,
    description: `Deposit £${amount?.toLocaleString("en-GB") || 0} taken for ${vehicleReg}`,
    userId,
    userName,
    vehicleId,
    vehicleReg,
    vehicleMakeModel,
    dealId,
    metadata: {
      customerName,
      amount,
    },
  });
}

/**
 * Log a form submitted
 */
export async function logFormSubmitted({
  dealerId,
  formSubmissionId,
  formName,
  formType,
  vehicleId,
  vehicleReg,
  vehicleMakeModel,
  userId,
  userName,
}) {
  return ActivityLog.log({
    dealerId,
    type: ACTIVITY_TYPE.FORM_SUBMITTED,
    description: `${formName || formType} submitted${vehicleReg ? ` for ${vehicleReg}` : ""}`,
    userId,
    userName,
    vehicleId,
    vehicleReg,
    vehicleMakeModel,
    formSubmissionId,
    metadata: {
      formName,
      formType,
    },
  });
}

export default {
  logVehicleLocationChange,
  logVehicleStatusChange,
  logIssueCreated,
  logIssueResolved,
  logTaskCompleted,
  logVehicleAdded,
  logDealCreated,
  logDepositTaken,
  logFormSubmitted,
};
