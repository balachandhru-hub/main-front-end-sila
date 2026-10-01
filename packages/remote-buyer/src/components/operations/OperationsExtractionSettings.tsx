import React, { useEffect, useState } from "react";
import { EmptyState, Loader, PageHeader, toastService } from "@vosox/shared-ui";
import {
  EXTRACTION_AUTH_TYPES,
  EXTRACTION_PROVIDER_TYPES,
  getExtractionAgents,
  getInvoiceOcrConfiguration,
  saveExtractionAgent,
  testExtractionAgent,
  updateInvoiceOcrConfiguration,
  type ExtractionAgent,
  type ExtractionAgentWrite,
  type InvoiceOcrConfiguration,
  type InvoiceOcrConfigurationWrite,
} from "../../api/operationsApi";
import { blank, errorMessage, formatDateTime, statusLabel } from "./operationsFormat";
import "./Operations.css";

type BooleanKey = {
  [K in keyof InvoiceOcrConfigurationWrite]: InvoiceOcrConfigurationWrite[K] extends boolean ? K : never;
}[keyof InvoiceOcrConfigurationWrite];

const BEHAVIOUR_FLAGS: { key: BooleanKey; label: string }[] = [
  { key: "mobileBasicOcrEnabled", label: "Read the basic fields on the mobile device" },
  { key: "automaticBackendFallbackEnabled", label: "Fall back to the backend reader when the policy checks fail" },
  { key: "alwaysBackendOnReread", label: "Always use the backend reader for a re-read" },
  { key: "detailedLineExtractionEnabled", label: "Extract invoice lines with line-level confidence" },
  { key: "supplierMasterValidationEnabled", label: "Check supplier candidates against the supplier master" },
  { key: "purchaseOrderValidationEnabled", label: "Check purchase order candidates against the stored orders" },
  { key: "financialReconciliationEnabled", label: "Require the amounts to reconcile before an extraction is complete" },
  { key: "reuseCachedOcr", label: "Reuse the result of an identical document" },
];

const REQUIRED_FLAGS: { key: BooleanKey; label: string }[] = [
  { key: "requireSupplierName", label: "Supplier name" },
  { key: "requireInvoiceNumber", label: "Invoice number" },
  { key: "requirePurchaseOrderNumber", label: "Purchase order number" },
  { key: "requireInvoiceAmount", label: "Invoice amount" },
  { key: "requireInvoiceDate", label: "Invoice date" },
  { key: "requireCurrency", label: "Currency" },
  { key: "requireSupplierTrn", label: "Supplier TRN" },
];

const toPolicy = (configuration: InvoiceOcrConfiguration): InvoiceOcrConfigurationWrite => ({
  mobileBasicOcrEnabled: configuration.mobileBasicOcrEnabled,
  automaticBackendFallbackEnabled: configuration.automaticBackendFallbackEnabled,
  minimumMobileConfidence: configuration.minimumMobileConfidence,
  requireSupplierName: configuration.requireSupplierName,
  requireInvoiceNumber: configuration.requireInvoiceNumber,
  requirePurchaseOrderNumber: configuration.requirePurchaseOrderNumber,
  requireInvoiceAmount: configuration.requireInvoiceAmount,
  requireInvoiceDate: configuration.requireInvoiceDate,
  requireCurrency: configuration.requireCurrency,
  requireSupplierTrn: configuration.requireSupplierTrn,
  backendProvider: configuration.backendProvider,
  alwaysBackendOnReread: configuration.alwaysBackendOnReread,
  detailedLineExtractionEnabled: configuration.detailedLineExtractionEnabled,
  supplierMasterValidationEnabled: configuration.supplierMasterValidationEnabled,
  purchaseOrderValidationEnabled: configuration.purchaseOrderValidationEnabled,
  financialReconciliationEnabled: configuration.financialReconciliationEnabled,
  amountTolerance: configuration.amountTolerance,
  backendTimeoutSeconds: configuration.backendTimeoutSeconds,
  backendRetryCount: configuration.backendRetryCount,
  reuseCachedOcr: configuration.reuseCachedOcr,
});

interface AgentForm {
  name: string;
  providerType: string;
  endpointUrl: string;
  authenticationType: string;
  credentialReference: string;
  priority: string;
  isActive: boolean;
  configurationJson: string;
}

const EMPTY_AGENT: AgentForm = {
  name: "", providerType: "CUSTOM_REST", endpointUrl: "", authenticationType: "NONE",
  credentialReference: "", priority: "100", isActive: false, configurationJson: "",
};

/** Document extraction settings: the invoice OCR policy and the extraction providers. */
const OperationsExtractionSettings: React.FC = () => {
  const [configuration, setConfiguration] = useState<InvoiceOcrConfiguration | null>(null);
  const [policy, setPolicy] = useState<InvoiceOcrConfigurationWrite | null>(null);
  const [agents, setAgents] = useState<ExtractionAgent[]>([]);
  const [agentsError, setAgentsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingPolicy, setSavingPolicy] = useState(false);

  // null = list only; "new" = create form; otherwise the provider being edited.
  const [editing, setEditing] = useState<ExtractionAgent | "new" | null>(null);
  const [agentForm, setAgentForm] = useState<AgentForm>(EMPTY_AGENT);
  const [savingAgent, setSavingAgent] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  const loadAgents = async () => {
    setAgentsError(null);
    try {
      setAgents(await getExtractionAgents());
    } catch (err: unknown) {
      setAgentsError(errorMessage(err, "Could not load the extraction providers."));
    }
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const loaded = await getInvoiceOcrConfiguration();
      setConfiguration(loaded);
      setPolicy(toPolicy(loaded));
      await loadAgents();
    } catch (err: unknown) {
      setError(errorMessage(err, "Could not load the extraction settings."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <Loader size={24} message="Loading extraction settings..." />;
  if (error || !policy) {
    return (
      <EmptyState
        variant="error"
        title="Couldn't load the extraction settings"
        description={error ?? "The policy was not returned."}
        action={<button type="button" className="sila-btn sila-btn--secondary" onClick={load}>Try again</button>}
      />
    );
  }

  const setPolicyField = <K extends keyof InvoiceOcrConfigurationWrite>(key: K, value: InvoiceOcrConfigurationWrite[K]) =>
    setPolicy((current) => (current ? { ...current, [key]: value } : current));

  const handleSavePolicy = async (event: React.FormEvent) => {
    event.preventDefault();
    if (policy.minimumMobileConfidence < 0 || policy.minimumMobileConfidence > 1) {
      toastService.error("Minimum confidence must be between 0 and 1.");
      return;
    }
    if (policy.amountTolerance < 0 || policy.backendTimeoutSeconds < 1 || policy.backendRetryCount < 0) {
      toastService.error("Check the tolerance, timeout and retry values.");
      return;
    }
    setSavingPolicy(true);
    try {
      const saved = await updateInvoiceOcrConfiguration(policy);
      setConfiguration(saved);
      setPolicy(toPolicy(saved));
      toastService.success("Invoice OCR policy saved. New documents use it from now on.");
    } catch (err: unknown) {
      toastService.error(errorMessage(err, "Could not save the invoice OCR policy."));
    } finally {
      setSavingPolicy(false);
    }
  };

  const setAgentField = <K extends keyof AgentForm>(key: K, value: AgentForm[K]) =>
    setAgentForm((current) => ({ ...current, [key]: value }));

  const openCreateAgent = () => {
    setAgentForm(EMPTY_AGENT);
    setEditing("new");
  };

  const openEditAgent = (agent: ExtractionAgent) => {
    setAgentForm({
      name: agent.name,
      providerType: agent.providerType,
      endpointUrl: agent.endpointUrl ?? "",
      authenticationType: agent.authenticationType,
      credentialReference: "",
      priority: String(agent.priority),
      isActive: agent.isActive,
      configurationJson: "",
    });
    setEditing(agent);
  };

  const handleSaveAgent = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    if (!agentForm.name.trim()) {
      toastService.error("Enter a name for the provider.");
      return;
    }
    const priority = Number(agentForm.priority);
    if (!Number.isInteger(priority) || priority < 1) {
      toastService.error("Priority must be a whole number of 1 or more.");
      return;
    }
    if (agentForm.configurationJson.trim()) {
      try {
        JSON.parse(agentForm.configurationJson);
      } catch {
        toastService.error("The additional configuration is not valid JSON.");
        return;
      }
    }
    const existing = editing === "new" ? null : editing;
    const payload: ExtractionAgentWrite = {
      name: agentForm.name.trim(),
      documentType: existing?.documentType ?? "INVOICE",
      providerType: agentForm.providerType,
      endpointUrl: blank(agentForm.endpointUrl),
      authenticationType: agentForm.authenticationType,
      credentialReference: blank(agentForm.credentialReference),
      priority,
      isActive: agentForm.isActive,
      configurationJson: blank(agentForm.configurationJson),
    };
    setSavingAgent(true);
    try {
      await saveExtractionAgent(existing ? existing.id : null, payload);
      toastService.success(existing ? "Provider updated." : "Provider created.");
      setEditing(null);
      await loadAgents();
    } catch (err: unknown) {
      toastService.error(errorMessage(err, "Could not save the extraction provider."));
    } finally {
      setSavingAgent(false);
    }
  };

  const handleTestAgent = async (agent: ExtractionAgent) => {
    setTestingId(agent.id);
    try {
      const result = await testExtractionAgent(agent.id);
      if (result.success) {
        toastService.success(result.message || "The provider test passed.");
      } else {
        toastService.error(result.message || "The provider test failed.");
      }
    } catch (err: unknown) {
      toastService.error(errorMessage(err, "The provider test could not be completed."));
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="ops-section">
      <PageHeader
        className="pud-page-header"
        title="Document extraction"
        description="How invoices are read: the OCR policy of the organization and the providers that do the reading."
      />

      <form className="sila-card" onSubmit={handleSavePolicy}>
        <div className="sila-card-header">
          <h2 className="sila-card-title">Invoice OCR policy</h2>
          {configuration && <span className="ops-muted">Version {configuration.version} · updated {formatDateTime(configuration.updatedAt)}</span>}
        </div>
        <div className="sila-card-body">
          <div className="sila-form-section">
            <h3 className="sila-form-section-title">Backend reader</h3>
            <div className="sila-form-grid">
              <div className="sila-field">
                <label className="sila-label" htmlFor="ocr-provider">Backend provider</label>
                <select id="ocr-provider" className="sila-select" value={policy.backendProvider} onChange={(event) => setPolicyField("backendProvider", event.target.value)}>
                  <option value="BUILT_IN_ADVANCED">Built-in advanced reader</option>
                  {policy.backendProvider !== "BUILT_IN_ADVANCED" && <option value={policy.backendProvider}>{policy.backendProvider}</option>}
                </select>
              </div>
              <div className="sila-field">
                <label className="sila-label" htmlFor="ocr-confidence">Minimum mobile confidence (0 to 1)</label>
                <input id="ocr-confidence" type="number" min="0" max="1" step="0.01" className="sila-input" value={policy.minimumMobileConfidence} onChange={(event) => setPolicyField("minimumMobileConfidence", Number(event.target.value))} />
              </div>
              <div className="sila-field">
                <label className="sila-label" htmlFor="ocr-tolerance">Amount tolerance</label>
                <input id="ocr-tolerance" type="number" min="0" step="0.01" className="sila-input" value={policy.amountTolerance} onChange={(event) => setPolicyField("amountTolerance", Number(event.target.value))} />
              </div>
              <div className="sila-field">
                <label className="sila-label" htmlFor="ocr-timeout">Backend timeout (seconds)</label>
                <input id="ocr-timeout" type="number" min="1" className="sila-input" value={policy.backendTimeoutSeconds} onChange={(event) => setPolicyField("backendTimeoutSeconds", Number(event.target.value))} />
              </div>
              <div className="sila-field">
                <label className="sila-label" htmlFor="ocr-retry">Backend retry count</label>
                <input id="ocr-retry" type="number" min="0" className="sila-input" value={policy.backendRetryCount} onChange={(event) => setPolicyField("backendRetryCount", Number(event.target.value))} />
              </div>
            </div>
          </div>

          <div className="sila-form-section" role="group" aria-labelledby="ocr-behaviour-title">
            <h3 id="ocr-behaviour-title" className="sila-form-section-title">Behaviour</h3>
            <div className="ops-check-list">
              {BEHAVIOUR_FLAGS.map((flag) => (
                <label key={flag.key} className="ops-check">
                  <input type="checkbox" checked={policy[flag.key]} onChange={(event) => setPolicyField(flag.key, event.target.checked)} />
                  {flag.label}
                </label>
              ))}
            </div>
          </div>

          <div className="sila-form-section" role="group" aria-labelledby="ocr-required-title">
            <h3 id="ocr-required-title" className="sila-form-section-title">Fields an invoice must have</h3>
            <p className="sila-form-section-description">
              An invoice cannot be saved from review while one of these is missing. A purchase order number is not required for an invoice marked as having none.
            </p>
            <div className="ops-check-list">
              {REQUIRED_FLAGS.map((flag) => (
                <label key={flag.key} className="ops-check">
                  <input type="checkbox" checked={policy[flag.key]} onChange={(event) => setPolicyField(flag.key, event.target.checked)} />
                  {flag.label}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="sila-card-footer">
          <button type="button" className="sila-btn sila-btn--secondary" onClick={() => configuration && setPolicy(toPolicy(configuration))} disabled={savingPolicy}>Reset</button>
          <button type="submit" className="sila-btn sila-btn--primary" disabled={savingPolicy}>
            {savingPolicy ? "Saving..." : "Save policy"}
          </button>
        </div>
      </form>

      {editing && (
        <form className="sila-card" onSubmit={handleSaveAgent}>
          <div className="sila-card-header">
            <h2 className="sila-card-title">{editing === "new" ? "New extraction provider" : `Edit ${editing.name}`}</h2>
          </div>
          <div className="sila-card-body">
            <div className="sila-form-grid">
              <div className="sila-field">
                <label className="sila-label" htmlFor="agent-name">Name<span className="sila-required">*</span></label>
                <input id="agent-name" className="sila-input" value={agentForm.name} onChange={(event) => setAgentField("name", event.target.value)} />
              </div>
              <div className="sila-field">
                <label className="sila-label" htmlFor="agent-type">Provider type<span className="sila-required">*</span></label>
                <select id="agent-type" className="sila-select" value={agentForm.providerType} onChange={(event) => setAgentField("providerType", event.target.value)}>
                  {!EXTRACTION_PROVIDER_TYPES.some((value) => value === agentForm.providerType) && (
                    <option value={agentForm.providerType}>{agentForm.providerType}</option>
                  )}
                  {EXTRACTION_PROVIDER_TYPES.map((value) => <option key={value} value={value}>{statusLabel(value)}</option>)}
                </select>
              </div>
              <div className="sila-field sila-field--full">
                <label className="sila-label" htmlFor="agent-endpoint">Endpoint URL</label>
                <input id="agent-endpoint" className="sila-input" placeholder="https://provider.example.com/extract" value={agentForm.endpointUrl} onChange={(event) => setAgentField("endpointUrl", event.target.value)} />
              </div>
              <div className="sila-field">
                <label className="sila-label" htmlFor="agent-auth">Authentication</label>
                <select id="agent-auth" className="sila-select" value={agentForm.authenticationType} onChange={(event) => setAgentField("authenticationType", event.target.value)}>
                  {EXTRACTION_AUTH_TYPES.map((value) => <option key={value} value={value}>{statusLabel(value)}</option>)}
                </select>
              </div>
              <div className="sila-field">
                <label className="sila-label" htmlFor="agent-credential">Credential reference</label>
                <input id="agent-credential" className="sila-input" autoComplete="off" placeholder={editing === "new" ? "secret://invoice-ocr-token" : "Leave empty to keep the saved reference"} value={agentForm.credentialReference} onChange={(event) => setAgentField("credentialReference", event.target.value)} />
                <span className="sila-help">The name of a stored secret, never the secret itself.</span>
              </div>
              <div className="sila-field">
                <label className="sila-label" htmlFor="agent-priority">Priority</label>
                <input id="agent-priority" type="number" min="1" className="sila-input" value={agentForm.priority} onChange={(event) => setAgentField("priority", event.target.value)} />
                <span className="sila-help">The active provider with the lowest number is tried first.</span>
              </div>
              <div className="sila-field sila-field--full">
                <label className="sila-label" htmlFor="agent-config">Additional configuration (JSON)</label>
                <textarea id="agent-config" className="sila-textarea" rows={3} value={agentForm.configurationJson} onChange={(event) => setAgentField("configurationJson", event.target.value)} />
                {editing !== "new" && <span className="sila-help">The saved configuration is not shown. Leave empty to keep it.</span>}
              </div>
              <div className="sila-field sila-field--full">
                <label className="ops-check">
                  <input type="checkbox" checked={agentForm.isActive} onChange={(event) => setAgentField("isActive", event.target.checked)} />
                  Use this provider for invoices
                </label>
              </div>
            </div>
          </div>
          <div className="sila-card-footer">
            <button type="button" className="sila-btn sila-btn--secondary" onClick={() => setEditing(null)} disabled={savingAgent}>Cancel</button>
            <button type="submit" className="sila-btn sila-btn--primary" disabled={savingAgent}>
              {savingAgent ? "Saving..." : editing === "new" ? "Create provider" : "Save provider"}
            </button>
          </div>
        </form>
      )}

      <section className="sila-card">
        <div className="sila-card-header">
          <h2 className="sila-card-title">Extraction providers</h2>
          {!editing && (
            <button type="button" className="sila-btn sila-btn--primary sila-btn--sm" onClick={openCreateAgent}>New provider</button>
          )}
        </div>
        {agentsError ? (
          <EmptyState
            variant="error"
            title="Couldn't load the extraction providers"
            description={agentsError}
            action={<button type="button" className="sila-btn sila-btn--secondary" onClick={loadAgents}>Try again</button>}
          />
        ) : agents.length === 0 ? (
          <EmptyState
            title="No external provider"
            description="The built-in reader is used. Add a provider only when the organization needs a different one."
          />
        ) : (
          <div className="sila-table-wrap">
            <table className="sila-table">
              <thead>
                <tr>
                  <th scope="col">Provider</th>
                  <th scope="col">Type</th>
                  <th scope="col">Endpoint</th>
                  <th scope="col">Authentication</th>
                  <th scope="col">Priority</th>
                  <th scope="col">State</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => (
                  <tr key={agent.id}>
                    <td>
                      <span className="sila-cell-strong">{agent.name}</span>
                      <div className="sila-help">{statusLabel(agent.documentType)}</div>
                    </td>
                    <td>{statusLabel(agent.providerType)}</td>
                    <td className="ops-break">{agent.endpointUrl || "—"}</td>
                    <td>
                      {statusLabel(agent.authenticationType)}
                      <div className="sila-help">{agent.credentialMask || "No credential"}</div>
                    </td>
                    <td>{agent.priority}</td>
                    <td>
                      <span className={agent.isActive ? "sila-badge sila-badge--success" : "sila-badge sila-badge--neutral"}>
                        {agent.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div className="sila-btn-group">
                        <button type="button" className="sila-btn sila-btn--secondary sila-btn--sm" onClick={() => openEditAgent(agent)}>Edit</button>
                        <button type="button" className="sila-btn sila-btn--ghost sila-btn--sm" onClick={() => handleTestAgent(agent)} disabled={testingId !== null}>
                          {testingId === agent.id ? "Testing..." : "Test"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default OperationsExtractionSettings;
