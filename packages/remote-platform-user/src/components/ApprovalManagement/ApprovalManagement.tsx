import React, { useCallback, useEffect, useState } from "react";
import "./ApprovalManagement.css";
import { useNetworkAdminAuthStore } from "../../store/useAuthStore";
import { getTokenClaims } from "../../api/platformApi";
import { fetchMasterApprovalFlows, type MasterApprovalFlow } from "./approvalManagementApi";
import CreateApprovalForm from "./CreateApprovalForm";
import ApprovalFlowDetail from "./ApprovalFlowDetail";

const FETCH_BATCH_SIZE = 50;
const MAX_BATCHES = 40;

const getOrderNumber = (flow: MasterApprovalFlow) => flow.orderNumber ?? flow.order;

const sortByOrderNumber = (flows: MasterApprovalFlow[]) =>
  flows
    .map((flow, apiIndex) => ({ flow, apiIndex }))
    .sort((a, b) => {
      const orderA = getOrderNumber(a.flow) ?? Number.MAX_SAFE_INTEGER;
      const orderB = getOrderNumber(b.flow) ?? Number.MAX_SAFE_INTEGER;
      return orderA - orderB || a.apiIndex - b.apiIndex;
    })
    .map(({ flow }) => flow);

interface ApprovalManagementProps {
  canCreate?: boolean;
}

const ApprovalManagement: React.FC<ApprovalManagementProps> = ({ canCreate = true }) => {
  const currentUser = useNetworkAdminAuthStore((state) => state.currentUser);
  const [buyerId, setBuyerId] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(currentUser?.organizationId || null);
  const [claimsError, setClaimsError] = useState<string | null>(null);

  const [flows, setFlows] = useState<MasterApprovalFlow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState<MasterApprovalFlow | null>(null);


  useEffect(() => {
    getTokenClaims()
      .then((claims) => {
        if (!claims?.buyerId) {
          setClaimsError("Buyer information is not available. Please log in again.");
          return;
        }
        setBuyerId(claims.buyerId);
        if (claims.organizationId) setOrganizationId(claims.organizationId);
      })
      .catch((err: any) => {
        setClaimsError(err?.response?.data?.message || err?.message || "Failed to load token claims.");
      });
  }, []);

  // Loads the whole list by requesting batches until the API returns a short (or repeated) batch.
  const loadAll = useCallback(async () => {
    if (!buyerId) return;
    setLoading(true);
    setError(null);
    try {
      const all: MasterApprovalFlow[] = [];
      const seenIds = new Set<string>();
      for (let batch = 0; batch < MAX_BATCHES; batch++) {
        const data = await fetchMasterApprovalFlows({
          buyerId,
          index: batch * FETCH_BATCH_SIZE,
          limit: FETCH_BATCH_SIZE,
        });
        const fresh = data.filter((flow) => !flow.id || !seenIds.has(flow.id));
        fresh.forEach((flow) => flow.id && seenIds.add(flow.id));
        all.push(...fresh);
        if (data.length < FETCH_BATCH_SIZE || fresh.length === 0) break;
      }
      setFlows(sortByOrderNumber(all));
    } catch (err: any) {
      setError(err.message || "Failed to load approval flows.");
      setFlows([]);
    } finally {
      setLoading(false);
    }
  }, [buyerId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleCreated = () => {
    setShowCreate(false);
    loadAll();
  };

  if (selectedFlow) {
    return (
      <ApprovalFlowDetail
        flow={selectedFlow}
        onBack={() => setSelectedFlow(null)}
        onFlowUpdated={(updated) => setFlows((prev) => prev.map((f) => (f.id === updated.id ? updated : f)))}
      />
    );
  }

  return (
    <div className="apl-card">
      <div className="apl-header">
        <div>
          <h1 className="apl-title">Approval Management</h1>
          <p className="apl-subtitle">
            Master approval flows configured for your organization. Click a row to view its approvers.
          </p>
        </div>
        {canCreate && (
          <button type="button" className="apl-create-btn" onClick={() => setShowCreate(true)}>
            <span className="apl-create-plus">+</span> Create Approval
          </button>
        )}
      </div>

      {claimsError ? (
        <div className="apl-state apl-state-error">{claimsError}</div>
      ) : loading || !buyerId ? (
        <div className="apl-state">
          <div className="apl-spinner" />
          <span>Loading approval flows...</span>
        </div>
      ) : error ? (
        <div className="apl-state apl-state-error">{error}</div>
      ) : flows.length === 0 ? (
        <div className="apl-state">No approval flows found.</div>
      ) : (
        <div className="apl-table-container">
          <table className="apl-table">
            <thead>
              <tr>
                <th className="apl-col-sno">S.No</th>
                <th>Approval Code</th>
                <th>Approval Name</th>
              </tr>
            </thead>
            <tbody>
              {flows.map((flow, idx) => {
                return (
                  <tr key={flow.id || idx} className="apl-row" onClick={() => flow.id && setSelectedFlow(flow)}>
                    <td className="apl-sno">{idx + 1}</td>
                    <td>
                      <span className="apl-code">{flow.approvalCode || "—"}</span>
                    </td>
                    <td className="apl-name">{flow.approvalName || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateApprovalForm
          organizationId={organizationId}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
};

export default ApprovalManagement;
