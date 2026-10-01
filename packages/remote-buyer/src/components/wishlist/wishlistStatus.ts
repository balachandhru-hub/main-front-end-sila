const LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  PENDING_APPROVAL: "Pending approval",
  APPROVED: "Approved",
  APPROVE: "Approved",
  REJECTED: "Rejected",
  REJECT: "Rejected",
  PENDING: "Pending",
  ERP_PROCESSING: "Sending purchase order",
  ERP_PO_CREATED: "Purchase order created",
  SUPPLIER_PO_PROCESSING: "Sending to supplier",
  COMPLETED: "Completed",
  ERP_FAILED: "Purchase order failed",
  SUPPLIER_PO_FAILED: "Supplier order failed",
  CANCELLED: "Cancelled",
};

export const statusLabel = (status: string): string => LABELS[status] ?? status;

/** The server accepts changes only to a draft or a rejected wishlist; any other status is frozen. */
export const isEditableStatus = (status: string): boolean => status === "DRAFT" || status === "REJECTED";

export const isMyApprovalTurn = (
  wishlist: { status: string; approvalSteps: { userId: string; order: number; status: string }[] },
  userId: string | null,
): boolean => {
  if (!userId || wishlist.status !== "PENDING_APPROVAL") return false;
  const steps = [...wishlist.approvalSteps].sort((left, right) => left.order - right.order);
  const mine = steps.find((step) => step.userId === userId && step.status === "PENDING");
  if (!mine) return false;
  return steps.filter((step) => step.order < mine.order).every((step) => step.status === "APPROVE");
};

export const statusBadgeClass = (status: string): string => {
  if (status === "REJECTED" || status === "REJECT" || status === "ERP_FAILED" || status === "SUPPLIER_PO_FAILED") {
    return "sila-badge sila-badge--danger";
  }
  if (status === "COMPLETED" || status === "ERP_PO_CREATED" || status === "APPROVED" || status === "APPROVE") {
    return "sila-badge sila-badge--success";
  }
  if (status === "PENDING_APPROVAL" || status === "PENDING" || status === "ERP_PROCESSING" || status === "SUPPLIER_PO_PROCESSING") {
    return "sila-badge sila-badge--warning";
  }
  return "sila-badge sila-badge--neutral";
};
