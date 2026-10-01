import React, { useEffect, useState } from "react";
import { EmptyState, Loader, PageHeader, toastService } from "@vosox/shared-ui";
import {
  AUTH_TYPES,
  DOCUMENT_TYPES,
  ERP_API_TYPES,
  ERP_SYSTEMS,
  PAYLOAD_FORMATS,
  PO_CREATE_PROCESS,
  createBuyerErpIntegration,
  getBuyerErpIntegrations,
  updateBuyerErpIntegration,
  type ErpApiType,
  type ErpIntegration,
  type ErpIntegrationWrite,
} from "../../api/erpIntegrationApi";

interface FormState {
  apiName: string;
  systemChoice: string;
  otherSystem: string;
  documentType: string;
  payloadFormat: string;
  requestBody: string;
  baseUrl: string;
  createDocumentPath: string;
  httpMethod: string;
  authType: string;
  tokenUrl: string;
  username: string;
  password: string;
  clientId: string;
  clientSecret: string;
  scope: string;
  apiKeyHeader: string;
  apiKey: string;
  accessToken: string;
  headersJson: string;
  timeoutSeconds: string;
  maxRetryCount: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  apiName: "",
  systemChoice: "SAP S/4",
  otherSystem: "",
  documentType: "PO",
  payloadFormat: "JSON",
  requestBody: "",
  baseUrl: "",
  createDocumentPath: "",
  httpMethod: "POST",
  authType: "NONE",
  tokenUrl: "",
  username: "",
  password: "",
  clientId: "",
  clientSecret: "",
  scope: "",
  apiKeyHeader: "",
  apiKey: "",
  accessToken: "",
  headersJson: "",
  timeoutSeconds: "60",
  maxRetryCount: "3",
  isActive: true,
};

const blank = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const systemName = (form: FormState): string =>
  form.systemChoice === "Others" ? form.otherSystem.trim() : form.systemChoice;

const formFromSaved = (saved: ErpIntegration): FormState => {
  const known = ERP_SYSTEMS.find((system) => system.toLowerCase() === saved.erpType.toLowerCase());
  return {
    ...EMPTY_FORM,
    apiName: saved.apiName,
    systemChoice: known ?? "Others",
    otherSystem: known ? "" : saved.erpType,
    documentType: saved.documentType || "PO",
    payloadFormat: saved.payloadFormat || "JSON",
    requestBody: saved.requestBody ?? "",
    baseUrl: saved.baseUrl,
    createDocumentPath: saved.createDocumentPath,
    httpMethod: saved.httpMethod || "POST",
    authType: saved.authType || "NONE",
    tokenUrl: saved.tokenUrl ?? "",
    username: saved.username ?? "",
    clientId: saved.clientId ?? "",
    scope: saved.scope ?? "",
    apiKeyHeader: saved.apiKeyHeader ?? "",
    headersJson: saved.headersJson ?? "",
    timeoutSeconds: String(saved.timeoutSeconds || 60),
    maxRetryCount: String(saved.maxRetryCount ?? 3),
    isActive: saved.isActive,
  };
};

interface BuyerErpConfigurationProps {
  /** View only: the saved APIs are shown but cannot be created or changed. */
  readOnly?: boolean;
  /** Opens straight into the form of this API type, instead of the list of types. */
  process?: string;
  /** Called instead of returning to this component's own list (when a host screen owns the list). */
  onExit?: () => void;
  /**
   * Which half of the API is shown. "connection": name, system, URL and sign-in (the Integration
   * screen). "request": method, body, document type, timeout, retries and active (the Workflow &
   * Configuration screen). Omitted: everything.
   */
  section?: "connection" | "request";
}

/**
 * API configuration of the buyer organization: one API per type (purchase order, material,
 * contract, supplier onboarding), each with its own URL, body and authentication/token API.
 */
const BuyerErpConfiguration: React.FC<BuyerErpConfigurationProps> = ({ readOnly = false, process, onExit, section }) => {
  const showConnection = section !== "request";
  const showRequest = section !== "connection";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ErpIntegration[]>([]);
  // The API type whose form is open; null shows the list of API types.
  const [apiType, setApiType] = useState<ErpApiType | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const savedFor = (type: ErpApiType): ErpIntegration | null =>
    rows.find((row) => row.process?.toUpperCase() === type.process) ?? null;
  const saved = apiType ? savedFor(apiType) : null;
  const isPurchaseOrder = apiType?.process === PO_CREATE_PROCESS;

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const loaded = await getBuyerErpIntegrations();
      setRows(loaded);
      // Opened on one API type by the host screen.
      const requested = process ? ERP_API_TYPES.find((type) => type.process === process) : undefined;
      if (requested) {
        const existing = loaded.find((row) => row.process?.toUpperCase() === requested.process);
        setForm(existing ? formFromSaved(existing) : { ...EMPTY_FORM, apiName: requested.label });
        setApiType(requested);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not load the API configuration.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openApiType = (type: ErpApiType) => {
    const existing = savedFor(type);
    setForm(existing ? formFromSaved(existing) : { ...EMPTY_FORM, apiName: type.label });
    setApiType(type);
  };

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (readOnly || !apiType) return;
    const erpType = systemName(form);
    if (!form.apiName.trim() || !erpType || !form.baseUrl.trim() || !form.createDocumentPath.trim()) {
      toastService.error("API name, system, base URL, and path are required.");
      return;
    }
    if (form.payloadFormat !== "JSON" && !form.requestBody.trim()) {
      toastService.error("SOAP and cXML calls need the request body saved on this API.");
      return;
    }
    if (!/^https?:\/\//i.test(form.baseUrl.trim())) {
      toastService.error("Enter an absolute http or https base URL.");
      return;
    }

    const payload: ErpIntegrationWrite = {
      apiName: form.apiName.trim(),
      process: apiType.process,
      erpType,
      payloadFormat: form.payloadFormat,
      requestBody: blank(form.requestBody),
      // Only the purchase order API creates a PO or PR.
      documentType: isPurchaseOrder ? form.documentType : "",
      baseUrl: form.baseUrl.trim(),
      createDocumentPath: form.createDocumentPath.trim(),
      httpMethod: form.httpMethod.trim() || "POST",
      authType: form.authType,
      tokenUrl: blank(form.tokenUrl),
      username: blank(form.username),
      password: blank(form.password),
      clientId: blank(form.clientId),
      clientSecret: blank(form.clientSecret),
      scope: blank(form.scope),
      apiKeyHeader: blank(form.apiKeyHeader),
      apiKey: blank(form.apiKey),
      accessToken: blank(form.accessToken),
      headersJson: blank(form.headersJson),
      timeoutSeconds: Number(form.timeoutSeconds) || 60,
      maxRetryCount: Number(form.maxRetryCount) || 0,
      isActive: form.isActive,
    };

    setSaving(true);
    try {
      if (saved) {
        await updateBuyerErpIntegration(saved.id, payload);
        toastService.success(`${apiType.label} API updated.`);
      } else {
        await createBuyerErpIntegration(payload);
        toastService.success(`${apiType.label} API saved.`);
      }
      if (onExit) {
        onExit();
        return;
      }
      setApiType(null);
      await load();
    } catch (err: unknown) {
      toastService.error(err instanceof Error ? err.message : "Could not save the API configuration.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loader size={24} message="Loading API configuration..." />;
  }

  if (error) {
    return <EmptyState variant="error" title="Couldn't load the API configuration" description={error} />;
  }

  if (!apiType) {
    return (
      <>
        <PageHeader className="pud-page-header" title="API Configuration" />
        <section className="sila-card">
          <div className="sila-table-wrap">
            <table className="sila-table">
              <thead>
                <tr>
                  <th scope="col">API type</th>
                  <th scope="col">API name</th>
                  <th scope="col">System</th>
                  <th scope="col">Base URL</th>
                  <th scope="col">Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {ERP_API_TYPES.map((type) => {
                  const configured = savedFor(type);
                  return (
                    <tr key={type.process}>
                      <td className="sila-cell-strong">{type.label}</td>
                      <td>{configured?.apiName || "—"}</td>
                      <td>{configured?.erpType || "—"}</td>
                      <td>{configured?.baseUrl || "—"}</td>
                      <td>
                        {!configured ? (
                          <span className="sila-badge sila-badge--neutral">Not configured</span>
                        ) : configured.isActive ? (
                          <span className="sila-badge sila-badge--success">Active</span>
                        ) : (
                          <span className="sila-badge sila-badge--warning">Inactive</span>
                        )}
                      </td>
                      <td>
                        {readOnly ? (
                          configured && (
                            <button type="button" className="sila-btn sila-btn--ghost sila-btn--sm" onClick={() => openApiType(type)}>
                              View
                            </button>
                          )
                        ) : (
                          <button type="button" className="sila-btn sila-btn--secondary sila-btn--sm" onClick={() => openApiType(type)}>
                            {configured ? "Edit" : "Configure"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </>
    );
  }

  const secretHint = saved && !readOnly ? "Leave blank to keep the saved value." : undefined;

  return (
    <>
      <PageHeader
        className="pud-page-header"
        title={`${apiType.label} API`}
        onBack={() => (onExit ? onExit() : setApiType(null))}
        backLabel="Back to integrations"
      />
      <form className="sila-card" onSubmit={handleSubmit}>
        <div className="sila-card-body">
        <div className="sila-form-grid">
          {showConnection && (<>
          <div className="sila-field">
            <label className="sila-label" htmlFor="buyer-erp-name">API name<span className="sila-required">*</span></label>
            <input id="buyer-erp-name" className="sila-input" disabled={readOnly} value={form.apiName} onChange={(event) => setField("apiName", event.target.value)} />
          </div>
          <div className="sila-field">
            <label className="sila-label" htmlFor="buyer-erp-system">System<span className="sila-required">*</span></label>
            <select id="buyer-erp-system" className="sila-select" disabled={readOnly} value={form.systemChoice} onChange={(event) => setField("systemChoice", event.target.value)}>
              {ERP_SYSTEMS.map((system) => (
                <option key={system} value={system}>{system}</option>
              ))}
              <option value="Others">Others</option>
            </select>
          </div>
          {form.systemChoice === "Others" && (
            <div className="sila-field">
              <label className="sila-label" htmlFor="buyer-erp-other">ERP name<span className="sila-required">*</span></label>
              <input id="buyer-erp-other" className="sila-input" disabled={readOnly} value={form.otherSystem} onChange={(event) => setField("otherSystem", event.target.value)} />
            </div>
          )}
          </>)}
          {showRequest && (<>
          {isPurchaseOrder && (
            <div className="sila-field">
              <label className="sila-label" htmlFor="buyer-erp-document">Document type<span className="sila-required">*</span></label>
              <select id="buyer-erp-document" className="sila-select" disabled={readOnly} value={form.documentType} onChange={(event) => setField("documentType", event.target.value)}>
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          )}
          <div className="sila-field">
            <label className="sila-label" htmlFor="buyer-erp-format">Body format</label>
            <select id="buyer-erp-format" className="sila-select" disabled={readOnly} value={form.payloadFormat} onChange={(event) => setField("payloadFormat", event.target.value)}>
              {PAYLOAD_FORMATS.map((format) => (
                <option key={format} value={format}>{format}</option>
              ))}
            </select>
          </div>
          <div className="sila-field">
            <label className="sila-label" htmlFor="buyer-erp-method">HTTP method</label>
            <input id="buyer-erp-method" className="sila-input" disabled={readOnly} value={form.httpMethod} onChange={(event) => setField("httpMethod", event.target.value)} />
          </div>
          </>)}
          {showConnection && (<>
          <div className="sila-field sila-field--full">
            <label className="sila-label" htmlFor="buyer-erp-url">Base URL<span className="sila-required">*</span></label>
            <input id="buyer-erp-url" className="sila-input" disabled={readOnly} value={form.baseUrl} onChange={(event) => setField("baseUrl", event.target.value)} placeholder="https://erp.example.com" />
          </div>
          <div className="sila-field sila-field--full">
            <label className="sila-label" htmlFor="buyer-erp-path">Path<span className="sila-required">*</span></label>
            <input id="buyer-erp-path" className="sila-input" disabled={readOnly} value={form.createDocumentPath} onChange={(event) => setField("createDocumentPath", event.target.value)} placeholder={isPurchaseOrder ? "/api/purchase-orders" : "/api/..."} />
          </div>
          </>)}
          {showRequest && (<>
          <div className="sila-field sila-field--full">
            <label className="sila-label" htmlFor="buyer-erp-body">
              Request body{form.payloadFormat !== "JSON" && <span className="sila-required">*</span>}
            </label>
            <textarea
              id="buyer-erp-body"
              className="sila-textarea" disabled={readOnly}
              value={form.requestBody}
              onChange={(event) => setField("requestBody", event.target.value)}
              placeholder={isPurchaseOrder ? "Tokens: {{wishlistId}} {{buyerDocumentNumber}} {{shipTo}} {{orderDate}} {{currency}} {{deliveryInstruction}} {{entries}}" : ""}
            />
            <span className="sila-help">SOAP and cXML send this body. JSON can leave it empty and use the built request.</span>
          </div>
          </>)}
          {showConnection && (<>
          <div className="sila-field">
            <label className="sila-label" htmlFor="buyer-erp-auth">Authentication<span className="sila-required">*</span></label>
            <select id="buyer-erp-auth" className="sila-select" disabled={readOnly} value={form.authType} onChange={(event) => setField("authType", event.target.value)}>
              {AUTH_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          {(form.authType === "BASIC" || form.authType === "OAUTH2_CLIENT_CREDENTIALS") && (
            <div className="sila-field">
              <label className="sila-label" htmlFor="buyer-erp-username">Username</label>
              <input id="buyer-erp-username" className="sila-input" disabled={readOnly} value={form.username} onChange={(event) => setField("username", event.target.value)} />
            </div>
          )}
          {form.authType === "BASIC" && (
            <div className="sila-field">
              <label className="sila-label" htmlFor="buyer-erp-password">Password</label>
              <input id="buyer-erp-password" className="sila-input" disabled={readOnly} type="password" value={form.password} onChange={(event) => setField("password", event.target.value)} placeholder={saved?.hasPassword ? "Saved" : ""} autoComplete="new-password" />
              {secretHint && <span className="sila-help">{secretHint}</span>}
            </div>
          )}
          {form.authType === "API_KEY" && (
            <>
              <div className="sila-field">
                <label className="sila-label" htmlFor="buyer-erp-key-header">API key header</label>
                <input id="buyer-erp-key-header" className="sila-input" disabled={readOnly} value={form.apiKeyHeader} onChange={(event) => setField("apiKeyHeader", event.target.value)} />
              </div>
              <div className="sila-field">
                <label className="sila-label" htmlFor="buyer-erp-key">API key</label>
                <input id="buyer-erp-key" className="sila-input" disabled={readOnly} type="password" value={form.apiKey} onChange={(event) => setField("apiKey", event.target.value)} placeholder={saved?.hasApiKey ? "Saved" : ""} autoComplete="new-password" />
                {secretHint && <span className="sila-help">{secretHint}</span>}
              </div>
            </>
          )}
          {form.authType === "BEARER" && (
            <div className="sila-field sila-field--full">
              <label className="sila-label" htmlFor="buyer-erp-token">Access token</label>
              <input id="buyer-erp-token" className="sila-input" disabled={readOnly} type="password" value={form.accessToken} onChange={(event) => setField("accessToken", event.target.value)} placeholder={saved?.hasAccessToken ? "Saved" : ""} autoComplete="new-password" />
              {secretHint && <span className="sila-help">{secretHint}</span>}
            </div>
          )}
          {form.authType === "OAUTH2_CLIENT_CREDENTIALS" && (
            <>
              <div className="sila-field sila-field--full">
                <label className="sila-label" htmlFor="buyer-erp-token-url">Token API URL</label>
                <input id="buyer-erp-token-url" className="sila-input" disabled={readOnly} value={form.tokenUrl} onChange={(event) => setField("tokenUrl", event.target.value)} />
              </div>
              <div className="sila-field">
                <label className="sila-label" htmlFor="buyer-erp-client">Client ID</label>
                <input id="buyer-erp-client" className="sila-input" disabled={readOnly} value={form.clientId} onChange={(event) => setField("clientId", event.target.value)} />
              </div>
              <div className="sila-field">
                <label className="sila-label" htmlFor="buyer-erp-secret">Client secret</label>
                <input id="buyer-erp-secret" className="sila-input" disabled={readOnly} type="password" value={form.clientSecret} onChange={(event) => setField("clientSecret", event.target.value)} placeholder={saved?.hasClientSecret ? "Saved" : ""} autoComplete="new-password" />
                {secretHint && <span className="sila-help">{secretHint}</span>}
              </div>
              <div className="sila-field">
                <label className="sila-label" htmlFor="buyer-erp-scope">Scope</label>
                <input id="buyer-erp-scope" className="sila-input" disabled={readOnly} value={form.scope} onChange={(event) => setField("scope", event.target.value)} />
              </div>
            </>
          )}
          </>)}
          {showRequest && (<>
          <div className="sila-field">
            <label className="sila-label" htmlFor="buyer-erp-timeout">Timeout (seconds)</label>
            <input id="buyer-erp-timeout" className="sila-input" disabled={readOnly} type="number" min="1" value={form.timeoutSeconds} onChange={(event) => setField("timeoutSeconds", event.target.value)} />
          </div>
          <div className="sila-field">
            <label className="sila-label" htmlFor="buyer-erp-retry">Retries</label>
            <input id="buyer-erp-retry" className="sila-input" disabled={readOnly} type="number" min="0" value={form.maxRetryCount} onChange={(event) => setField("maxRetryCount", event.target.value)} />
          </div>
          <div className="sila-field sila-field--full">
            <label className="sila-label" htmlFor="buyer-erp-headers">Extra headers (JSON)</label>
            <textarea id="buyer-erp-headers" className="sila-textarea" disabled={readOnly} value={form.headersJson} onChange={(event) => setField("headersJson", event.target.value)} />
          </div>
          <div className="sila-field">
            <label className="sila-label" htmlFor="buyer-erp-active">
              <input id="buyer-erp-active" type="checkbox" disabled={readOnly} checked={form.isActive} onChange={(event) => setField("isActive", event.target.checked)} /> Active
            </label>
          </div>
          </>)}
        </div>
        </div>
        {!readOnly && (
          <div className="sila-card-footer">
            <button type="submit" className="sila-btn sila-btn--primary" disabled={saving}>
              {saving ? "Saving..." : saved ? "Update API" : "Save API"}
            </button>
          </div>
        )}
      </form>
    </>
  );
};

export default BuyerErpConfiguration;
