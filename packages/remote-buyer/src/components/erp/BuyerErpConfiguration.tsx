import React, { useEffect, useState } from "react";
import { EmptyState, Loader, PageHeader, toastService } from "@vosox/shared-ui";
import {
  AUTH_TYPES,
  DOCUMENT_TYPES,
  ERP_SYSTEMS,
  PAYLOAD_FORMATS,
  PO_CREATE_PROCESS,
  createBuyerErpIntegration,
  getBuyerErpIntegrations,
  updateBuyerErpIntegration,
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
  apiName: "Purchase order",
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

const BuyerErpConfiguration: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<ErpIntegration | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await getBuyerErpIntegrations();
      const purchaseOrder = rows.find(
        (row) => row.process?.toUpperCase() === PO_CREATE_PROCESS,
      ) ?? null;
      setSaved(purchaseOrder);
      setForm(purchaseOrder ? formFromSaved(purchaseOrder) : EMPTY_FORM);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not load the purchase order API.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
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
      process: PO_CREATE_PROCESS,
      erpType,
      payloadFormat: form.payloadFormat,
      requestBody: blank(form.requestBody),
      documentType: form.documentType,
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
        toastService.success("Purchase order API updated.");
      } else {
        await createBuyerErpIntegration(payload);
        toastService.success("Purchase order API saved.");
      }
      await load();
    } catch (err: unknown) {
      toastService.error(err instanceof Error ? err.message : "Could not save the purchase order API.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loader size={24} message="Loading purchase order API..." />;
  }

  if (error) {
    return <EmptyState variant="error" title="Couldn't load the purchase order API" description={error} />;
  }

  const secretHint = saved ? "Leave blank to keep the saved value." : undefined;

  return (
    <>
      <PageHeader
        className="pud-page-header"
        title="Purchase order API"
        description="One PO_CREATE system for this organization. The last wishlist approval sends the order to this URL, body, and authentication."
      />
      <form className="sila-card" onSubmit={handleSubmit}>
        <div className="sila-card-body">
        <div className="sila-form-grid">
          <div className="sila-field">
            <label className="sila-label" htmlFor="buyer-erp-name">API name<span className="sila-required">*</span></label>
            <input id="buyer-erp-name" className="sila-input" value={form.apiName} onChange={(event) => setField("apiName", event.target.value)} />
          </div>
          <div className="sila-field">
            <label className="sila-label" htmlFor="buyer-erp-system">System<span className="sila-required">*</span></label>
            <select id="buyer-erp-system" className="sila-select" value={form.systemChoice} onChange={(event) => setField("systemChoice", event.target.value)}>
              {ERP_SYSTEMS.map((system) => (
                <option key={system} value={system}>{system}</option>
              ))}
              <option value="Others">Others</option>
            </select>
          </div>
          {form.systemChoice === "Others" && (
            <div className="sila-field">
              <label className="sila-label" htmlFor="buyer-erp-other">ERP name<span className="sila-required">*</span></label>
              <input id="buyer-erp-other" className="sila-input" value={form.otherSystem} onChange={(event) => setField("otherSystem", event.target.value)} />
            </div>
          )}
          <div className="sila-field">
            <label className="sila-label" htmlFor="buyer-erp-document">Document type<span className="sila-required">*</span></label>
            <select id="buyer-erp-document" className="sila-select" value={form.documentType} onChange={(event) => setField("documentType", event.target.value)}>
              {DOCUMENT_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div className="sila-field">
            <label className="sila-label" htmlFor="buyer-erp-format">Body format</label>
            <select id="buyer-erp-format" className="sila-select" value={form.payloadFormat} onChange={(event) => setField("payloadFormat", event.target.value)}>
              {PAYLOAD_FORMATS.map((format) => (
                <option key={format} value={format}>{format}</option>
              ))}
            </select>
          </div>
          <div className="sila-field">
            <label className="sila-label" htmlFor="buyer-erp-method">HTTP method</label>
            <input id="buyer-erp-method" className="sila-input" value={form.httpMethod} onChange={(event) => setField("httpMethod", event.target.value)} />
          </div>
          <div className="sila-field sila-field--full">
            <label className="sila-label" htmlFor="buyer-erp-url">Base URL<span className="sila-required">*</span></label>
            <input id="buyer-erp-url" className="sila-input" value={form.baseUrl} onChange={(event) => setField("baseUrl", event.target.value)} placeholder="https://erp.example.com" />
          </div>
          <div className="sila-field sila-field--full">
            <label className="sila-label" htmlFor="buyer-erp-path">Path<span className="sila-required">*</span></label>
            <input id="buyer-erp-path" className="sila-input" value={form.createDocumentPath} onChange={(event) => setField("createDocumentPath", event.target.value)} placeholder="/api/purchase-orders" />
          </div>
          <div className="sila-field sila-field--full">
            <label className="sila-label" htmlFor="buyer-erp-body">
              Request body{form.payloadFormat !== "JSON" && <span className="sila-required">*</span>}
            </label>
            <textarea
              id="buyer-erp-body"
              className="sila-textarea"
              value={form.requestBody}
              onChange={(event) => setField("requestBody", event.target.value)}
              placeholder="Tokens: {{wishlistId}} {{buyerDocumentNumber}} {{shipTo}} {{orderDate}} {{currency}} {{deliveryInstruction}} {{entries}}"
            />
            <span className="sila-help">SOAP and cXML send this body. JSON can leave it empty and use the built request.</span>
          </div>
          <div className="sila-field">
            <label className="sila-label" htmlFor="buyer-erp-auth">Authentication<span className="sila-required">*</span></label>
            <select id="buyer-erp-auth" className="sila-select" value={form.authType} onChange={(event) => setField("authType", event.target.value)}>
              {AUTH_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          {(form.authType === "BASIC" || form.authType === "OAUTH2_CLIENT_CREDENTIALS") && (
            <div className="sila-field">
              <label className="sila-label" htmlFor="buyer-erp-username">Username</label>
              <input id="buyer-erp-username" className="sila-input" value={form.username} onChange={(event) => setField("username", event.target.value)} />
            </div>
          )}
          {form.authType === "BASIC" && (
            <div className="sila-field">
              <label className="sila-label" htmlFor="buyer-erp-password">Password</label>
              <input id="buyer-erp-password" className="sila-input" type="password" value={form.password} onChange={(event) => setField("password", event.target.value)} placeholder={saved?.hasPassword ? "Saved" : ""} autoComplete="new-password" />
              {secretHint && <span className="sila-help">{secretHint}</span>}
            </div>
          )}
          {form.authType === "API_KEY" && (
            <>
              <div className="sila-field">
                <label className="sila-label" htmlFor="buyer-erp-key-header">API key header</label>
                <input id="buyer-erp-key-header" className="sila-input" value={form.apiKeyHeader} onChange={(event) => setField("apiKeyHeader", event.target.value)} />
              </div>
              <div className="sila-field">
                <label className="sila-label" htmlFor="buyer-erp-key">API key</label>
                <input id="buyer-erp-key" className="sila-input" type="password" value={form.apiKey} onChange={(event) => setField("apiKey", event.target.value)} placeholder={saved?.hasApiKey ? "Saved" : ""} autoComplete="new-password" />
                {secretHint && <span className="sila-help">{secretHint}</span>}
              </div>
            </>
          )}
          {form.authType === "BEARER" && (
            <div className="sila-field sila-field--full">
              <label className="sila-label" htmlFor="buyer-erp-token">Access token</label>
              <input id="buyer-erp-token" className="sila-input" type="password" value={form.accessToken} onChange={(event) => setField("accessToken", event.target.value)} placeholder={saved?.hasAccessToken ? "Saved" : ""} autoComplete="new-password" />
              {secretHint && <span className="sila-help">{secretHint}</span>}
            </div>
          )}
          {form.authType === "OAUTH2_CLIENT_CREDENTIALS" && (
            <>
              <div className="sila-field sila-field--full">
                <label className="sila-label" htmlFor="buyer-erp-token-url">Token URL</label>
                <input id="buyer-erp-token-url" className="sila-input" value={form.tokenUrl} onChange={(event) => setField("tokenUrl", event.target.value)} />
              </div>
              <div className="sila-field">
                <label className="sila-label" htmlFor="buyer-erp-client">Client ID</label>
                <input id="buyer-erp-client" className="sila-input" value={form.clientId} onChange={(event) => setField("clientId", event.target.value)} />
              </div>
              <div className="sila-field">
                <label className="sila-label" htmlFor="buyer-erp-secret">Client secret</label>
                <input id="buyer-erp-secret" className="sila-input" type="password" value={form.clientSecret} onChange={(event) => setField("clientSecret", event.target.value)} placeholder={saved?.hasClientSecret ? "Saved" : ""} autoComplete="new-password" />
                {secretHint && <span className="sila-help">{secretHint}</span>}
              </div>
              <div className="sila-field">
                <label className="sila-label" htmlFor="buyer-erp-scope">Scope</label>
                <input id="buyer-erp-scope" className="sila-input" value={form.scope} onChange={(event) => setField("scope", event.target.value)} />
              </div>
            </>
          )}
          <div className="sila-field">
            <label className="sila-label" htmlFor="buyer-erp-timeout">Timeout (seconds)</label>
            <input id="buyer-erp-timeout" className="sila-input" type="number" min="1" value={form.timeoutSeconds} onChange={(event) => setField("timeoutSeconds", event.target.value)} />
          </div>
          <div className="sila-field">
            <label className="sila-label" htmlFor="buyer-erp-retry">Retries</label>
            <input id="buyer-erp-retry" className="sila-input" type="number" min="0" value={form.maxRetryCount} onChange={(event) => setField("maxRetryCount", event.target.value)} />
          </div>
          <div className="sila-field sila-field--full">
            <label className="sila-label" htmlFor="buyer-erp-headers">Extra headers (JSON)</label>
            <textarea id="buyer-erp-headers" className="sila-textarea" value={form.headersJson} onChange={(event) => setField("headersJson", event.target.value)} />
          </div>
          <div className="sila-field">
            <label className="sila-label" htmlFor="buyer-erp-active">
              <input id="buyer-erp-active" type="checkbox" checked={form.isActive} onChange={(event) => setField("isActive", event.target.checked)} /> Active
            </label>
          </div>
        </div>
        </div>
        <div className="sila-card-footer">
          <button type="submit" className="sila-btn sila-btn--primary" disabled={saving}>
            {saving ? "Saving..." : saved ? "Update API" : "Save API"}
          </button>
        </div>
      </form>
    </>
  );
};

export default BuyerErpConfiguration;
