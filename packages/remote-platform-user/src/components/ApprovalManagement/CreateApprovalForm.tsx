import React, { useEffect, useMemo, useState } from "react";
import "./CreateApprovalForm.css";
import { FaTimes } from "react-icons/fa";
import { toastService } from "@vosox/shared-ui";
import type { OrganizationUserDto } from "../../dto/networkAdminDto";
import {
  createMasterApprovalFlow,
  fetchApprovalTypes,
  fetchApprovalUsers,
  fetchCurrencies,
  type ApprovalTypeOption,
  type CurrencyOption,
} from "./approvalManagementApi";

interface CreateApprovalFormProps {
  organizationId: string | null;
  onClose: () => void;
  onCreated: () => void;
}

interface FormState {
  approvalCode: string;
  approvalName: string;
  type: string;
  totalAmount: string;
  currency: string;
}

const AMOUNT_APPROVAL_TYPE = "CONTRACT_CREATE";

const EMPTY_FORM: FormState = { approvalCode: "", approvalName: "", type: "", totalAmount: "", currency: "" };

const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
  </svg>
);

const IconArrow = ({ up }: { up?: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={up ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} />
  </svg>
);

const CreateApprovalForm: React.FC<CreateApprovalFormProps> = ({ organizationId, onClose, onCreated }) => {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [types, setTypes] = useState<ApprovalTypeOption[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [users, setUsers] = useState<OrganizationUserDto[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [pendingUserId, setPendingUserId] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<OrganizationUserDto[]>([]);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | "users", string>>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.allSettled([fetchApprovalTypes(), fetchCurrencies()]).then(([typesResult, currenciesResult]) => {
      if (typesResult.status === "fulfilled") setTypes(typesResult.value);
      else toastService.error(typesResult.reason?.message || "Failed to load approval types");
      if (currenciesResult.status === "fulfilled") setCurrencies(currenciesResult.value);
      else toastService.error(currenciesResult.reason?.message || "Failed to load currencies");
      setLoadingOptions(false);
    });
    loadUsers();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !submitting && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, submitting]);

  const loadUsers = async () => {
    if (usersLoaded || loadingUsers) return;
    if (!organizationId) {
      setUsersError("Organization information is not available. Please log in again.");
      return;
    }
    setLoadingUsers(true);
    setUsersError(null);
    try {
      setUsers(await fetchApprovalUsers(organizationId));
      setUsersLoaded(true);
    } catch (err: any) {
      setUsersError(err.message || "Failed to load users.");
    } finally {
      setLoadingUsers(false);
    }
  };

  const availableUsers = useMemo(
    () => users.filter((u) => !selectedUsers.some((s) => s.userId === u.userId)),
    [users, selectedUsers]
  );

  const setField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const addUser = () => {
    const user = users.find((u) => u.userId === pendingUserId);
    if (!user) return;
    setSelectedUsers((prev) => [...prev, user]);
    setPendingUserId("");
    setErrors((prev) => ({ ...prev, users: undefined }));
  };

  const removeUser = (userId: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u.userId !== userId));
  };

  const moveUser = (index: number, direction: -1 | 1) => {
    setSelectedUsers((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const requiresAmount = form.type === AMOUNT_APPROVAL_TYPE;

  const validate = () => {
    const next: typeof errors = {};
    if (!form.approvalCode.trim()) next.approvalCode = "Approval code is required";
    if (!form.approvalName.trim()) next.approvalName = "Approval name is required";
    if (!form.type) next.type = "Select an approval type";
    if (requiresAmount) {
      if (form.totalAmount === "" || Number(form.totalAmount) < 0 || Number.isNaN(Number(form.totalAmount))) {
        next.totalAmount = "Enter a valid amount";
      }
      if (!form.currency) next.currency = "Select a currency";
    }
    if (selectedUsers.length === 0) next.users = "Add at least one approver";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await createMasterApprovalFlow({
        approvalCode: form.approvalCode.trim(),
        approvalName: form.approvalName.trim(),
        type: form.type,
        totalAmount: requiresAmount ? Number(form.totalAmount) : 0,
        currency: requiresAmount ? form.currency : "",
        users: selectedUsers.map((u, i) => ({ userId: u.userId, order: i + 1 })),
      });
      toastService.success("Approval flow created successfully");
      onCreated();
    } catch (err: any) {
      toastService.error(err.message || "Failed to create approval flow");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="apf-overlay" onClick={() => !submitting && onClose()}>
      <form
        className="apf-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="apf-modal-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        noValidate
      >
        <div className="apf-modal-header">
          <div>
            <h2 className="apf-modal-title" id="apf-modal-title">Create Approval</h2>
            <p className="apf-modal-subtitle">Define the approval flow and the order in which users approve.</p>
          </div>
          <button type="button" className="apf-close" onClick={onClose} disabled={submitting} aria-label="Close">
            <FaTimes aria-hidden="true" />
          </button>
        </div>

        <div className="apf-modal-body">
          <div className="apf-section-label">Approval Details</div>
          <div className="apf-grid">
            <label className="apf-field">
              <span className="apf-label">Approval Code <em aria-hidden="true">*</em></span>
              <input
                className={`apf-input ${errors.approvalCode ? "apf-input-error" : ""}`}
                aria-required="true"
                aria-invalid={!!errors.approvalCode}
                value={form.approvalCode}
                onChange={(e) => setField("approvalCode", e.target.value)}
                placeholder="e.g. APR-001"
              />
              {errors.approvalCode && <span className="apf-error">{errors.approvalCode}</span>}
            </label>

            <label className="apf-field">
              <span className="apf-label">Approval Name <em aria-hidden="true">*</em></span>
              <input
                className={`apf-input ${errors.approvalName ? "apf-input-error" : ""}`}
                aria-required="true"
                aria-invalid={!!errors.approvalName}
                value={form.approvalName}
                onChange={(e) => setField("approvalName", e.target.value)}
                placeholder="e.g. Purchasing Team Approval"
              />
              {errors.approvalName && <span className="apf-error">{errors.approvalName}</span>}
            </label>

            <label className="apf-field">
              <span className="apf-label">Type <em aria-hidden="true">*</em></span>
              <select
                className={`apf-input ${errors.type ? "apf-input-error" : ""}`}
                aria-required="true"
                aria-invalid={!!errors.type}
                value={form.type}
                onChange={(e) => setField("type", e.target.value)}
                disabled={loadingOptions}
              >
                <option value="">{loadingOptions ? "Loading..." : "Select type"}</option>
                {types.map((t) => (
                  <option key={t.id} value={t.key} title={t.description}>
                    {t.key}
                  </option>
                ))}
              </select>
              {errors.type && <span className="apf-error">{errors.type}</span>}
            </label>

            {requiresAmount && (
              <div className="apf-field">
                <span className="apf-label" id="apf-amount-label">Total Amount <em aria-hidden="true">*</em></span>
                <div className="apf-amount">
                  <input
                    type="number"
                    min={0}
                    className={`apf-input apf-input-number ${errors.totalAmount ? "apf-input-error" : ""}`}
                    aria-labelledby="apf-amount-label"
                    aria-required="true"
                    aria-invalid={!!errors.totalAmount}
                    value={form.totalAmount}
                    onChange={(e) => setField("totalAmount", e.target.value)}
                    placeholder="0.00"
                  />
                  <select
                    className={`apf-input apf-currency ${errors.currency ? "apf-input-error" : ""}`}
                    value={form.currency}
                    onChange={(e) => setField("currency", e.target.value)}
                    disabled={loadingOptions}
                    aria-label="Currency"
                    aria-invalid={!!errors.currency}
                  >
                    <option value="">{loadingOptions ? "..." : "Currency"}</option>
                    {currencies.map((c) => (
                      <option key={c.id} value={c.currencyName}>
                        {c.currencyName}
                      </option>
                    ))}
                  </select>
                </div>
                {(errors.totalAmount || errors.currency) && (
                  <span className="apf-error">{errors.totalAmount || errors.currency}</span>
                )}
              </div>
            )}
          </div>

          <div className="apf-section-label apf-section-gap" id="apf-users-label">
            Users
            {selectedUsers.length > 0 && <span className="apf-count">{selectedUsers.length}</span>}
          </div>

          <div className="apf-user-picker">
            <select
              className={`apf-input ${errors.users ? "apf-input-error" : ""}`}
              aria-labelledby="apf-users-label"
              aria-invalid={!!errors.users}
              value={pendingUserId}
              onFocus={loadUsers}
              onMouseDown={loadUsers}
              onChange={(e) => setPendingUserId(e.target.value)}
              disabled={loadingUsers}
            >
              <option value="">
                {loadingUsers ? "Loading users..." : usersLoaded && availableUsers.length === 0 ? "No more users to add" : "Select a user"}
              </option>
              {availableUsers.map((u) => (
                <option key={u.userId} value={u.userId}>
                  {u.name} — {u.email}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="apf-add-btn sila-btn sila-btn--primary sila-btn--icon"
              onClick={addUser}
              disabled={!pendingUserId}
              title="Add user"
              aria-label="Add user"
            >
              <IconPlus />
            </button>
          </div>
          {usersError && <span className="apf-error" role="alert">{usersError}</span>}
          {errors.users && <span className="apf-error" role="alert">{errors.users}</span>}

          {selectedUsers.length === 0 ? (
            <div className="apf-users-empty">
              Select a user and click <strong>+</strong> to add approvers. They approve in the order listed.
            </div>
          ) : (
            <ol className="apf-users">
              {selectedUsers.map((u, i) => (
                <li key={u.userId} className="apf-user-card">
                  <span className="apf-order" aria-label={`Step ${i + 1}`}>{i + 1}</span>
                  <div className="apf-user-info">
                    <div className="apf-user-top">
                      <span className="apf-user-name">{u.name}</span>
                      {u.roleName && <span className="apf-role">{u.roleName}</span>}
                    </div>
                    <span className="apf-user-email">{u.email}</span>
                  </div>
                  <div className="apf-user-actions">
                    <button type="button" onClick={() => moveUser(i, -1)} disabled={i === 0} aria-label="Move up" title="Move up">
                      <IconArrow up />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveUser(i, 1)}
                      disabled={i === selectedUsers.length - 1}
                      aria-label="Move down"
                      title="Move down"
                    >
                      <IconArrow />
                    </button>
                    <button
                      type="button"
                      className="apf-remove"
                      onClick={() => removeUser(u.userId)}
                      aria-label="Remove user"
                      title="Remove"
                    >
                      <IconTrash />
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="apf-modal-footer">
          <button type="button" className="apf-btn apf-btn-secondary sila-btn sila-btn--secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="apf-btn apf-btn-primary sila-btn sila-btn--primary" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateApprovalForm;
