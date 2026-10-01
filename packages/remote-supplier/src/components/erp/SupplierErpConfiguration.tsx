import React, { useEffect, useState } from "react";
import { EmptyState, Loader, PageHeader, toastService } from "@vosox/shared-ui";
import {
  PO_CREATE_PROCESS,
  getSupplierErpConfiguration,
  saveSupplierErpConfiguration,
  type SupplierErpConfiguration as SupplierErp,
  type SupplierErpWrite,
} from "../../api/supplierErpApi";

const SYSTEMS = ["SAP S/4", "Ariba"] as const;
const FORMATS = ["JSON", "SOAP", "CXML"] as const;
const AUTH_TYPES = ["NONE", "BASIC", "API_KEY", "BEARER", "OAUTH2_CLIENT_CREDENTIALS"] as const;

interface FormState {
  systemChoice: string;
  otherSystem: string;
  payloadFormat: string;
  requestBody: string;
  baseUrl: string;
  orderPath: string;
  authPath: string;
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
  defaultShipTo: string;
  orderDateFormat: string;
  headersJson: string;
  timeoutSeconds: string;
  maxRetryCount: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  systemChoice: "SAP S/4",
  otherSystem: "",
  payloadFormat: "JSON",
  requestBody: "",
  baseUrl: "",
  orderPath: "",
  authPath: "",
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
  defaultShipTo: "",
  orderDateFormat: "dd/MM/yyyy",
  headersJson: "",
  timeoutSeconds: "60",
  maxRetryCount: "3",
  isActive: true,
};

const blank = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const formFromSaved = (saved: SupplierErp): FormState => {
  const known = SYSTEMS.find((system) => system.toLowerCase() === saved.erpType.toLowerCase());
  return {
    ...EMPTY_FORM,
    systemChoice: known ?? "Others",
    otherSystem: known ? "" : saved.erpType,
    payloadFormat: saved.payloadFormat || "JSON",
    requestBody: saved.requestBody ?? "",
    baseUrl: saved.baseUrl,
    orderPath: saved.orderPath,
    authPath: saved.authPath ?? "",
    httpMethod: saved.httpMethod || "POST",
    authType: saved.authType || "NONE",
    tokenUrl: saved.tokenUrl ?? "",
    username: saved.username ?? "",
    clientId: saved.clientId ?? "",
    scope: saved.scope ?? "",
    apiKeyHeader: saved.apiKeyHeader ?? "",
    defaultShipTo: saved.defaultShipTo ?? "",
    orderDateFormat: saved.orderDateFormat || "dd/MM/yyyy",
    headersJson: saved.headersJson ?? "",
    timeoutSeconds: String(saved.timeoutSeconds || 60),
    maxRetryCount: String(saved.maxRetryCount ?? 3),
    isActive: saved.isActive,
  };
};

const SupplierErpConfiguration: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<SupplierErp | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const configuration = await getSupplierErpConfiguration();
      setSaved(configuration);
      setForm(configuration ? formFromSaved(configuration) : EMPTY_FORM);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not load the purchase order API.");
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
    const erpType = form.systemChoice === "Others" ? form.otherSystem.trim() : form.systemChoice;
    if (!erpType || !form.baseUrl.trim() || !form.orderPath.trim()) {
      toastService.error("System, base URL, and path are required.");
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

    const payload: SupplierErpWrite = {
      process: PO_CREATE_PROCESS,
      erpType,
      payloadFormat: form.payloadFormat,
      requestBody: blank(form.requestBody),
      baseUrl: form.baseUrl.trim(),
      authPath: blank(form.authPath),
      orderPath: form.orderPath.trim(),
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
      defaultShipTo: blank(form.defaultShipTo),
      orderDateFormat: blank(form.orderDateFormat) ?? "dd/MM/yyyy",
      headersJson: blank(form.headersJson),
      timeoutSeconds: Number(form.timeoutSeconds) || 60,
      maxRetryCount: Number(form.maxRetryCount) || 0,
      isActive: form.isActive,
    };

    setSaving(true);
    try {
      await saveSupplierErpConfiguration(payload);
      toastService.success(saved ? "Purchase order API updated." : "Purchase order API saved.");
      await load();
    } catch (err: unknown) {
      toastService.error(err instanceof Error ? err.message : "Could not save the purchase order API.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader size={24} message="Loading purchase order API..." />;
  if (error) return <EmptyState variant="error" title="Couldn't load the purchase order API" description={error} />;

  const secretHint = saved ? "Leave blank to keep the saved value." : undefined;

  return (
    <>
      <PageHeader
        className="pud-page-header"
        title="Purchase order API"
        description="The one PO_CREATE system this supplier receives purchase orders on. SAP S/4, Ariba, or another ERP name."
      />
      <form className="sila-card" onSubmit={handleSubmit}>
        <div className="sila-card-body">
        <div className="sila-form-grid">
          <div className="sila-field">
            <label className="sila-label" htmlFor="supplier-erp-system">System<span className="sila-required">*</span></label>
            <select id="supplier-erp-system" className="sila-select" value={form.systemChoice} onChange={(event) => setField("systemChoice", event.target.value)}>
              {SYSTEMS.map((system) => (
                <option key={system} value={system}>{system}</option>
              ))}
              <option value="Others">Others</option>
            </select>
          </div>
          {form.systemChoice === "Others" && (
            <div className="sila-field">
              <label className="sila-label" htmlFor="supplier-erp-other">ERP name<span className="sila-required">*</span></label>
              <input id="supplier-erp-other" className="sila-input" value={form.otherSystem} onChange={(event) => setField("otherSystem", event.target.value)} />
            </div>
          )}
          <div className="sila-field">
            <label className="sila-label" htmlFor="supplier-erp-format">Body format</label>
            <select id="supplier-erp-format" className="sila-select" value={form.payloadFormat} onChange={(event) => setField("payloadFormat", event.target.value)}>
              {FORMATS.map((format) => (
                <option key={format} value={format}>{format}</option>
              ))}
            </select>
          </div>
          <div className="sila-field">
            <label className="sila-label" htmlFor="supplier-erp-method">HTTP method</label>
            <input id="supplier-erp-method" className="sila-input" value={form.httpMethod} onChange={(event) => setField("httpMethod", event.target.value)} />
          </div>
          <div className="sila-field sila-field--full">
            <label className="sila-label" htmlFor="supplier-erp-url">Base URL<span className="sila-required">*</span></label>
            <input id="supplier-erp-url" className="sila-input" value={form.baseUrl} onChange={(event) => setField("baseUrl", event.target.value)} placeholder="https://erp.example.com" />
          </div>
          <div className="sila-field">
            <label className="sila-label" htmlFor="supplier-erp-path">Order path<span className="sila-required">*</span></label>
            <input id="supplier-erp-path" className="sila-input" value={form.orderPath} onChange={(event) => setField("orderPath", event.target.value)} />
          </div>
          <div className="sila-field">
            <label className="sila-label" htmlFor="supplier-erp-auth-path">Auth path</label>
            <input id="supplier-erp-auth-path" className="sila-input" value={form.authPath} onChange={(event) => setField("authPath", event.target.value)} />
          </div>
          <div className="sila-field sila-field--full">
            <label className="sila-label" htmlFor="supplier-erp-body">
              Request body{form.payloadFormat !== "JSON" && <span className="sila-required">*</span>}
            </label>
            <textarea id="supplier-erp-body" className="sila-textarea" value={form.requestBody} onChange={(event) => setField("requestBody", event.target.value)} />
          </div>
          <div className="sila-field">
            <label className="sila-label" htmlFor="supplier-erp-auth">Authentication<span className="sila-required">*</span></label>
            <select id="supplier-erp-auth" className="sila-select" value={form.authType} onChange={(event) => setField("authType", event.target.value)}>
              {AUTH_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          {(form.authType === "BASIC" || form.authType === "OAUTH2_CLIENT_CREDENTIALS") && (
            <div className="sila-field">
              <label className="sila-label" htmlFor="supplier-erp-username">Username</label>
              <input id="supplier-erp-username" className="sila-input" value={form.username} onChange={(event) => setField("username", event.target.value)} />
            </div>
          )}
          {form.authType === "BASIC" && (
            <div className="sila-field">
              <label className="sila-label" htmlFor="supplier-erp-password">Password</label>
              <input id="supplier-erp-password" type="password" className="sila-input" value={form.password} onChange={(event) => setField("password", event.target.value)} placeholder={saved?.hasPassword ? "Saved" : ""} autoComplete="new-password" />
              {secretHint && <span className="sila-help">{secretHint}</span>}
            </div>
          )}
          {form.authType === "API_KEY" && (
            <>
              <div className="sila-field">
                <label className="sila-label" htmlFor="supplier-erp-key-header">API key header</label>
                <input id="supplier-erp-key-header" className="sila-input" value={form.apiKeyHeader} onChange={(event) => setField("apiKeyHeader", event.target.value)} />
              </div>
              <div className="sila-field">
                <label className="sila-label" htmlFor="supplier-erp-key">API key</label>
                <input id="supplier-erp-key" type="password" className="sila-input" value={form.apiKey} onChange={(event) => setField("apiKey", event.target.value)} placeholder={saved?.hasApiKey ? "Saved" : ""} autoComplete="new-password" />
                {secretHint && <span className="sila-help">{secretHint}</span>}
              </div>
            </>
          )}
          {form.authType === "BEARER" && (
            <div className="sila-field sila-field--full">
              <label className="sila-label" htmlFor="supplier-erp-token">Access token</label>
              <input id="supplier-erp-token" type="password" className="sila-input" value={form.accessToken} onChange={(event) => setField("accessToken", event.target.value)} placeholder={saved?.hasAccessToken ? "Saved" : ""} autoComplete="new-password" />
              {secretHint && <span className="sila-help">{secretHint}</span>}
            </div>
          )}
          {form.authType === "OAUTH2_CLIENT_CREDENTIALS" && (
            <>
              <div className="sila-field sila-field--full">
                <label className="sila-label" htmlFor="supplier-erp-token-url">Token URL</label>
                <input id="supplier-erp-token-url" className="sila-input" value={form.tokenUrl} onChange={(event) => setField("tokenUrl", event.target.value)} />
              </div>
              <div className="sila-field">
                <label className="sila-label" htmlFor="supplier-erp-client">Client ID</label>
                <input id="supplier-erp-client" className="sila-input" value={form.clientId} onChange={(event) => setField("clientId", event.target.value)} />
              </div>
              <div className="sila-field">
                <label className="sila-label" htmlFor="supplier-erp-secret">Client secret</label>
                <input id="supplier-erp-secret" type="password" className="sila-input" value={form.clientSecret} onChange={(event) => setField("clientSecret", event.target.value)} placeholder={saved?.hasClientSecret ? "Saved" : ""} autoComplete="new-password" />
                {secretHint && <span className="sila-help">{secretHint}</span>}
              </div>
              <div className="sila-field">
                <label className="sila-label" htmlFor="supplier-erp-scope">Scope</label>
                <input id="supplier-erp-scope" className="sila-input" value={form.scope} onChange={(event) => setField("scope", event.target.value)} />
              </div>
            </>
          )}
          <div className="sila-field">
            <label className="sila-label" htmlFor="supplier-erp-ship">Default ship-to</label>
            <input id="supplier-erp-ship" className="sila-input" value={form.defaultShipTo} onChange={(event) => setField("defaultShipTo", event.target.value)} />
          </div>
          <div className="sila-field">
            <label className="sila-label" htmlFor="supplier-erp-date">Order date format</label>
            <input id="supplier-erp-date" className="sila-input" value={form.orderDateFormat} onChange={(event) => setField("orderDateFormat", event.target.value)} />
          </div>
          <div className="sila-field">
            <label className="sila-label" htmlFor="supplier-erp-timeout">Timeout (seconds)</label>
            <input id="supplier-erp-timeout" type="number" min="1" className="sila-input" value={form.timeoutSeconds} onChange={(event) => setField("timeoutSeconds", event.target.value)} />
          </div>
          <div className="sila-field">
            <label className="sila-label" htmlFor="supplier-erp-retry">Retries</label>
            <input id="supplier-erp-retry" type="number" min="0" className="sila-input" value={form.maxRetryCount} onChange={(event) => setField("maxRetryCount", event.target.value)} />
          </div>
          <div className="sila-field sila-field--full">
            <label className="sila-label" htmlFor="supplier-erp-headers">Extra headers (JSON)</label>
            <textarea id="supplier-erp-headers" className="sila-textarea" value={form.headersJson} onChange={(event) => setField("headersJson", event.target.value)} />
          </div>
          <div className="sila-field">
            <label className="sila-label" htmlFor="supplier-erp-active">
              <input id="supplier-erp-active" type="checkbox" checked={form.isActive} onChange={(event) => setField("isActive", event.target.checked)} /> Active
            </label>
          </div>
        </div>
        </div>
        <div className="sila-card-footer">
          <button type="submit" className="sila-btn sila-btn--primary" disabled={saving}>
            {saving ? "Saving..." : "Save API"}
          </button>
        </div>
      </form>
    </>
  );
};

export default SupplierErpConfiguration;
