import React, { useState } from "react";
import { toastService } from "@vosox/shared-ui";
import {
  INTEGRATION_AUTH_TYPES,
  INTEGRATION_PROCESS_TYPES,
  INTEGRATION_PROTOCOLS,
  createIntegration,
  updateIntegration,
  type IntegrationConfiguration,
  type IntegrationConfigurationWrite,
  type OrganizationUnit,
} from "../../api/operationsApi";
import { blank, errorMessage } from "./operationsFormat";
import "./Operations.css";

interface IntegrationConfigFormProps {
  /** The configuration being edited, or null to create a new one. */
  configuration: IntegrationConfiguration | null;
  units: OrganizationUnit[];
  onSaved: (configuration: IntegrationConfiguration) => void;
  onCancel: () => void;
}

interface ConfigForm {
  name: string;
  entityCode: string;
  organizationUnitId: string;
  processType: string;
  protocol: string;
  baseUrl: string;
  resourcePath: string;
  authenticationType: string;
  username: string;
  password: string;
  clientId: string;
  clientSecret: string;
  bearerToken: string;
  tokenEndpoint: string;
  tokenScope: string;
  tokenHeaders: string;
  tokenBody: string;
  timeoutSeconds: string;
  retryCount: string;
  pageSize: string;
  watermarkField: string;
  scheduleCron: string;
}

const NEW_FORM: ConfigForm = {
  name: "", entityCode: "ALL", organizationUnitId: "", processType: "GET_PO", protocol: "ODATA_V4",
  baseUrl: "", resourcePath: "", authenticationType: "OAUTH2_CLIENT_CREDENTIALS",
  username: "", password: "", clientId: "", clientSecret: "", bearerToken: "",
  tokenEndpoint: "", tokenScope: "", tokenHeaders: "", tokenBody: "",
  timeoutSeconds: "30", retryCount: "2", pageSize: "100", watermarkField: "", scheduleCron: "",
};

const toForm = (configuration: IntegrationConfiguration | null): ConfigForm => {
  if (!configuration) return NEW_FORM;
  return {
    ...NEW_FORM,
    name: configuration.name,
    entityCode: configuration.entityCode,
    organizationUnitId: configuration.organizationUnitId ?? "",
    processType: configuration.processType,
    protocol: configuration.protocol,
    baseUrl: configuration.baseUrl,
    resourcePath: configuration.resourcePath ?? "",
    authenticationType: configuration.authenticationType,
    username: configuration.username ?? "",
    timeoutSeconds: String(configuration.timeoutSeconds),
    retryCount: String(configuration.retryCount),
    pageSize: configuration.pageSize == null ? "" : String(configuration.pageSize),
    watermarkField: configuration.watermarkField ?? "",
    scheduleCron: configuration.scheduleCron ?? "",
  };
};

/** "name=value" lines to an object; null when nothing was entered. Throws on a line without "=". */
const parsePairs = (text: string, label: string): Record<string, string> | null => {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return null;
  const result: Record<string, string> = {};
  lines.forEach((line) => {
    const index = line.indexOf("=");
    if (index <= 0) throw new Error(`${label}: write each line as name=value.`);
    result[line.slice(0, index).trim()] = line.slice(index + 1).trim();
  });
  return result;
};

const inRange = (value: number, min: number, max: number): boolean => Number.isInteger(value) && value >= min && value <= max;

/** Create or edit one integration: what it does, where it calls, how it signs in, and when it runs. */
const IntegrationConfigForm: React.FC<IntegrationConfigFormProps> = ({ configuration, units, onSaved, onCancel }) => {
  const [form, setForm] = useState<ConfigForm>(() => toForm(configuration));
  const [saving, setSaving] = useState(false);

  const setField = <K extends keyof ConfigForm>(key: K, value: ConfigForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const auth = form.authenticationType;
  const usesBasic = auth === "BASIC";
  const usesBearer = auth === "BEARER_TOKEN";
  const usesOAuth = auth === "OAUTH2_CLIENT_CREDENTIALS";
  const usesCustomToken = auth === "CUSTOM_TOKEN_ENDPOINT";
  const secretPlaceholder = configuration ? "Leave empty to keep the saved value" : "";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      toastService.error("Enter a name for the integration.");
      return;
    }
    if (!/^https?:\/\//i.test(form.baseUrl.trim())) {
      toastService.error("Enter the base URL, starting with https://.");
      return;
    }
    const timeoutSeconds = Number(form.timeoutSeconds);
    const retryCount = Number(form.retryCount);
    const pageSize = form.pageSize.trim() ? Number(form.pageSize) : null;
    if (!inRange(timeoutSeconds, 5, 300)) {
      toastService.error("Timeout must be between 5 and 300 seconds.");
      return;
    }
    if (!inRange(retryCount, 0, 5)) {
      toastService.error("Retry count must be between 0 and 5.");
      return;
    }
    if (pageSize !== null && !inRange(pageSize, 1, 1000)) {
      toastService.error("Page size must be between 1 and 1000.");
      return;
    }
    if ((usesOAuth || usesCustomToken) && !form.tokenEndpoint.trim()) {
      toastService.error("Enter the token endpoint.");
      return;
    }

    let tokenHeaders: Record<string, string> | null = null;
    let tokenBody: Record<string, string> | null = null;
    try {
      if (usesCustomToken) {
        tokenHeaders = parsePairs(form.tokenHeaders, "Token request headers");
        tokenBody = parsePairs(form.tokenBody, "Token request body");
      }
    } catch (err: unknown) {
      toastService.error(errorMessage(err, "Check the token request fields."));
      return;
    }

    // Credentials that do not belong to the chosen sign-in method are not sent.
    const payload: IntegrationConfigurationWrite = {
      name: form.name.trim(),
      entityCode: form.entityCode.trim() || "ALL",
      organizationUnitId: form.organizationUnitId || null,
      processType: form.processType,
      protocol: form.protocol,
      baseUrl: form.baseUrl.trim(),
      resourcePath: blank(form.resourcePath),
      authenticationType: auth,
      username: usesBasic ? blank(form.username) : null,
      password: usesBasic ? blank(form.password) : null,
      clientId: usesOAuth || usesCustomToken ? blank(form.clientId) : null,
      clientSecret: usesOAuth || usesCustomToken ? blank(form.clientSecret) : null,
      bearerToken: usesBearer ? blank(form.bearerToken) : null,
      tokenEndpoint: usesOAuth || usesCustomToken ? blank(form.tokenEndpoint) : null,
      tokenScope: usesOAuth || usesCustomToken ? blank(form.tokenScope) : null,
      tokenHeaders,
      tokenBody,
      timeoutSeconds,
      retryCount,
      pageSize,
      watermarkField: blank(form.watermarkField),
      scheduleCron: blank(form.scheduleCron),
    };

    setSaving(true);
    try {
      const saved = configuration
        ? await updateIntegration(configuration.id, payload)
        : await createIntegration(payload);
      toastService.success(configuration ? "Integration updated." : "Integration saved as a draft. Test it before activating.");
      setForm((current) => ({ ...current, password: "", clientSecret: "", bearerToken: "", clientId: "", tokenHeaders: "", tokenBody: "" }));
      onSaved(saved);
    } catch (err: unknown) {
      toastService.error(errorMessage(err, "Could not save the integration."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="sila-card" onSubmit={handleSubmit}>
      <div className="sila-card-body">
        <div className="sila-form-section">
          <h3 className="sila-form-section-title">General</h3>
          <div className="sila-form-grid">
            <div className="sila-field">
              <label className="sila-label" htmlFor="integration-name">Name<span className="sila-required">*</span></label>
              <input id="integration-name" className="sila-input" value={form.name} onChange={(event) => setField("name", event.target.value)} />
            </div>
            <div className="sila-field">
              <label className="sila-label" htmlFor="integration-process">Process<span className="sila-required">*</span></label>
              <select id="integration-process" className="sila-select" value={form.processType} onChange={(event) => setField("processType", event.target.value)}>
                {INTEGRATION_PROCESS_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label} ({option.value})</option>)}
              </select>
            </div>
            <div className="sila-field">
              <label className="sila-label" htmlFor="integration-entity">Entity code</label>
              <input id="integration-entity" className="sila-input" value={form.entityCode} onChange={(event) => setField("entityCode", event.target.value)} />
              <span className="sila-help">ALL applies to every entity of the organization.</span>
            </div>
            <div className="sila-field">
              <label className="sila-label" htmlFor="integration-unit">Organization unit</label>
              <select id="integration-unit" className="sila-select" value={form.organizationUnitId} onChange={(event) => setField("organizationUnitId", event.target.value)}>
                <option value="">Whole organization</option>
                {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name} ({unit.code})</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="sila-form-section">
          <h3 className="sila-form-section-title">Endpoint</h3>
          <div className="sila-form-grid">
            <div className="sila-field">
              <label className="sila-label" htmlFor="integration-protocol">Protocol<span className="sila-required">*</span></label>
              <select id="integration-protocol" className="sila-select" value={form.protocol} onChange={(event) => setField("protocol", event.target.value)}>
                {INTEGRATION_PROTOCOLS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <div className="sila-field">
              <label className="sila-label" htmlFor="integration-timeout">Timeout (seconds)</label>
              <input id="integration-timeout" type="number" min="5" max="300" className="sila-input" value={form.timeoutSeconds} onChange={(event) => setField("timeoutSeconds", event.target.value)} />
            </div>
            <div className="sila-field sila-field--full">
              <label className="sila-label" htmlFor="integration-base-url">Base URL<span className="sila-required">*</span></label>
              <input id="integration-base-url" className="sila-input" placeholder="https://erp.example.com" value={form.baseUrl} onChange={(event) => setField("baseUrl", event.target.value)} />
            </div>
            <div className="sila-field sila-field--full">
              <label className="sila-label" htmlFor="integration-resource">Resource path</label>
              <input id="integration-resource" className="sila-input" placeholder="API_PURCHASEORDER_PROCESS_SRV/A_PurchaseOrder" value={form.resourcePath} onChange={(event) => setField("resourcePath", event.target.value)} />
              <span className="sila-help">Appended to the base URL. For OData this is the service and entity set.</span>
            </div>
          </div>
        </div>

        <div className="sila-form-section">
          <h3 className="sila-form-section-title">Authentication</h3>
          <p className="sila-form-section-description">
            {configuration
              ? `Credential state: ${configuration.credentialStatus}. Secrets are never shown again; leave a secret empty to keep the saved one.`
              : "Secrets are stored by the server and are never shown again after saving."}
          </p>
          <div className="sila-form-grid">
            <div className="sila-field">
              <label className="sila-label" htmlFor="integration-auth">Sign-in method<span className="sila-required">*</span></label>
              <select id="integration-auth" className="sila-select" value={auth} onChange={(event) => setField("authenticationType", event.target.value)}>
                {INTEGRATION_AUTH_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            {usesBasic && (
              <>
                <div className="sila-field">
                  <label className="sila-label" htmlFor="integration-username">Username</label>
                  <input id="integration-username" className="sila-input" autoComplete="off" value={form.username} onChange={(event) => setField("username", event.target.value)} />
                </div>
                <div className="sila-field">
                  <label className="sila-label" htmlFor="integration-password">Password</label>
                  <input id="integration-password" type="password" className="sila-input" autoComplete="new-password" placeholder={secretPlaceholder} value={form.password} onChange={(event) => setField("password", event.target.value)} />
                </div>
              </>
            )}
            {usesBearer && (
              <div className="sila-field sila-field--full">
                <label className="sila-label" htmlFor="integration-bearer">Bearer token</label>
                <input id="integration-bearer" type="password" className="sila-input" autoComplete="new-password" placeholder={secretPlaceholder} value={form.bearerToken} onChange={(event) => setField("bearerToken", event.target.value)} />
              </div>
            )}
            {(usesOAuth || usesCustomToken) && (
              <>
                <div className="sila-field">
                  <label className="sila-label" htmlFor="integration-client-id">Client ID</label>
                  <input id="integration-client-id" className="sila-input" autoComplete="off" placeholder={secretPlaceholder} value={form.clientId} onChange={(event) => setField("clientId", event.target.value)} />
                </div>
                <div className="sila-field">
                  <label className="sila-label" htmlFor="integration-client-secret">Client secret</label>
                  <input id="integration-client-secret" type="password" className="sila-input" autoComplete="new-password" placeholder={secretPlaceholder} value={form.clientSecret} onChange={(event) => setField("clientSecret", event.target.value)} />
                </div>
                <div className="sila-field sila-field--full">
                  <label className="sila-label" htmlFor="integration-token-endpoint">Token endpoint<span className="sila-required">*</span></label>
                  <input id="integration-token-endpoint" className="sila-input" placeholder="https://login.example.com/oauth/token" value={form.tokenEndpoint} onChange={(event) => setField("tokenEndpoint", event.target.value)} />
                </div>
                <div className="sila-field">
                  <label className="sila-label" htmlFor="integration-token-scope">Scope</label>
                  <input id="integration-token-scope" className="sila-input" value={form.tokenScope} onChange={(event) => setField("tokenScope", event.target.value)} />
                </div>
              </>
            )}
            {usesCustomToken && (
              <>
                <div className="sila-field sila-field--full">
                  <label className="sila-label" htmlFor="integration-token-headers">Token request headers</label>
                  <textarea id="integration-token-headers" className="sila-textarea" rows={3} placeholder={"Accept=application/json"} value={form.tokenHeaders} onChange={(event) => setField("tokenHeaders", event.target.value)} />
                  <span className="sila-help">One name=value per line.{configuration ? " Leave empty to keep the saved headers." : ""}</span>
                </div>
                <div className="sila-field sila-field--full">
                  <label className="sila-label" htmlFor="integration-token-body">Token request body</label>
                  <textarea id="integration-token-body" className="sila-textarea" rows={3} placeholder={"grant_type=client_credentials"} value={form.tokenBody} onChange={(event) => setField("tokenBody", event.target.value)} />
                  <span className="sila-help">One name=value per line.{configuration ? " Leave empty to keep the saved body." : ""}</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="sila-form-section">
          <h3 className="sila-form-section-title">Paging and schedule</h3>
          <div className="sila-form-grid">
            <div className="sila-field">
              <label className="sila-label" htmlFor="integration-retry">Retry count</label>
              <input id="integration-retry" type="number" min="0" max="5" className="sila-input" value={form.retryCount} onChange={(event) => setField("retryCount", event.target.value)} />
            </div>
            <div className="sila-field">
              <label className="sila-label" htmlFor="integration-page-size">Page size</label>
              <input id="integration-page-size" type="number" min="1" max="1000" className="sila-input" value={form.pageSize} onChange={(event) => setField("pageSize", event.target.value)} />
            </div>
            <div className="sila-field">
              <label className="sila-label" htmlFor="integration-watermark">Watermark field</label>
              <input id="integration-watermark" className="sila-input" placeholder="PurchaseOrderLastChangeDateTime" value={form.watermarkField} onChange={(event) => setField("watermarkField", event.target.value)} />
              <span className="sila-help">The source field holding the last change time. Scheduled pulls only read records changed since the last run.</span>
            </div>
            <div className="sila-field">
              <label className="sila-label" htmlFor="integration-cron">Schedule (cron)</label>
              <input id="integration-cron" className="sila-input" placeholder="0 */2 * * *" value={form.scheduleCron} onChange={(event) => setField("scheduleCron", event.target.value)} />
              <span className="sila-help">Leave empty to pull only on demand. The schedule runs once the integration is active.</span>
            </div>
          </div>
        </div>
      </div>
      <div className="sila-card-footer">
        <button type="button" className="sila-btn sila-btn--secondary" onClick={onCancel} disabled={saving}>
          {configuration ? "Close" : "Cancel"}
        </button>
        <button type="submit" className="sila-btn sila-btn--primary" disabled={saving}>
          {saving ? "Saving..." : configuration ? "Save integration" : "Save draft"}
        </button>
      </div>
    </form>
  );
};

export default IntegrationConfigForm;
