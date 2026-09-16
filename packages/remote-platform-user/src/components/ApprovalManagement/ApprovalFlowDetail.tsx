import React, { useEffect, useMemo, useRef, useState } from "react";
import "./ApprovalFlowDetail.css";
import { toastService } from "@vosox/shared-ui";
import ApprovalProcessDiagram, { type ApprovalStep } from "./ApprovalProcessDiagram";
import EditApprovalModal from "./EditApprovalModal";
import {
  fetchApprovalFlowUsers,
  updateApprovalFlow,
  type ApprovalFlowUser,
  type MasterApprovalFlow,
} from "./approvalManagementApi";

interface ApprovalFlowDetailProps {
  flow: MasterApprovalFlow;
  onBack: () => void;
  onFlowUpdated: (flow: MasterApprovalFlow) => void;
}

const IconBack = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

const ApprovalFlowDetail: React.FC<ApprovalFlowDetailProps> = ({ flow: initialFlow, onBack, onFlowUpdated }) => {
  const [flow, setFlow] = useState(initialFlow);
  const [approvers, setApprovers] = useState<ApprovalFlowUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  // Prevents the request from firing twice for the same approval (e.g. React StrictMode re-running effects).
  const fetchedIdRef = useRef<string | null>(null);

  const loadApprovers = () => {
    setLoading(true);
    setError(null);
    fetchApprovalFlowUsers(flow.id)
      .then(setApprovers)
      .catch((err: any) => setError(err.message || "Failed to load approvers."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (fetchedIdRef.current === flow.id) return;
    fetchedIdRef.current = flow.id;
    loadApprovers();
  }, [flow.id]);

  const getMappingId = (approver: ApprovalFlowUser) => approver.id || flow.id;

  const steps: ApprovalStep[] = useMemo(
    () =>
      approvers.map((approver, i) => ({
        id: `${approver.userId}-${approver.id ?? ""}`,
        title: `Approver ${i + 1}`,
        description: approver.userId,
      })),
    [approvers]
  );

  const handleReorder = async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || savingOrder) return;
    const previous = approvers;
    const reordered = [...approvers];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    const renumbered = reordered.map((approver, i) => ({ ...approver, order: i + 1 }));
    setApprovers(renumbered);

    const changed = renumbered.filter((approver) => {
      const before = previous.find((p) => p === approver || (p.userId === approver.userId && p.id === approver.id));
      return before?.order !== approver.order;
    });
    if (changed.length === 0) return;

    setSavingOrder(true);
    try {
      await Promise.all(
        changed.map((approver) =>
          updateApprovalFlow(getMappingId(approver), {
            approvalCode: flow.approvalCode,
            approvalName: flow.approvalName,
            order: approver.order,
          })
        )
      );
      toastService.success("Approval order updated");
    } catch (err: any) {
      toastService.error(err.message || "Failed to update approval order");
      setApprovers(previous);
      loadApprovers();
    } finally {
      setSavingOrder(false);
    }
  };

  const editingApprover = editingIndex !== null ? approvers[editingIndex] : null;

  return (
    <div className="afd-page">
      <div className="afd-header">
        <button type="button" className="afd-back" onClick={onBack} aria-label="Back to approval list">
          <IconBack />
        </button>
        <div className="afd-heading">
          <h1 className="afd-title">{flow.approvalName || "Approval Flow"}</h1>
          <div className="afd-meta">
            <span className="afd-code">{flow.approvalCode || "—"}</span>
            {!loading && !error && (
              <span className="afd-count">
                {approvers.length} approver{approvers.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>
      </div>

      <ApprovalProcessDiagram
        steps={steps}
        loading={loading}
        error={error}
        onReorder={handleReorder}
        onEdit={setEditingIndex}
        disabled={savingOrder}
      />

      {editingApprover && (
        <EditApprovalModal
          mappingId={getMappingId(editingApprover)}
          approvalCode={flow.approvalCode}
          approvalName={flow.approvalName}
          order={editingApprover.order}
          onClose={() => setEditingIndex(null)}
          onSaved={(values) => {
            const updated = { ...flow, ...values };
            setFlow(updated);
            onFlowUpdated(updated);
            setEditingIndex(null);
          }}
        />
      )}
    </div>
  );
};

export default ApprovalFlowDetail;
