import React, { useEffect, useState } from "react";
import { EmptyState, Loader, PageHeader, toastService } from "@vosox/shared-ui";
import {
  createStorageConnection,
  disconnectMicrosoftConnection,
  getMicrosoftReadiness,
  getStorageConnections,
  startMicrosoftConnect,
  type MicrosoftReadiness,
  type StorageConnection,
  type StorageConnectionWrite,
} from "../../api/operationsApi";
import StorageDestinationPicker from "./StorageDestinationPicker";
import { blank, errorMessage, formatDateTime, statusBadgeClass, statusLabel } from "./operationsFormat";
import "./Operations.css";

interface ConnectionForm {
  provider: string;
  name: string;
  displayUrl: string;
  tenantIdentifier: string;
  siteIdentifier: string;
  driveIdentifier: string;
  folderIdentifier: string;
}

const EMPTY_FORM: ConnectionForm = {
  provider: "GOOGLE", name: "", displayUrl: "", tenantIdentifier: "", siteIdentifier: "", driveIdentifier: "", folderIdentifier: "",
};

/** Providers registered by hand. Microsoft connections are created by signing in instead. */
const MANUAL_PROVIDERS = ["GOOGLE", "OTHER"];

const CALLBACK_REASONS: Record<string, string> = {
  consent_denied: "The Microsoft sign-in was cancelled or consent was not given.",
  invalid_state: "The Microsoft sign-in could not be matched to this session. Start it again.",
  expired_or_reused_state: "The Microsoft sign-in expired. Start it again.",
  missing_code: "Microsoft did not return an authorization code. Start the sign-in again.",
  configuration_or_token_exchange: "The Microsoft sign-in could not be completed. Check the Microsoft integration settings.",
};

interface Callback {
  outcome: string;
  connectionId: string | null;
  reason: string | null;
}

/** Reads the result Microsoft's sign-in redirect left in the address, then removes it from the address. */
const readCallback = (): Callback | null => {
  const params = new URLSearchParams(window.location.search);
  const outcome = params.get("microsoft");
  if (!outcome) return null;
  const callback: Callback = { outcome, connectionId: params.get("connectionId"), reason: params.get("reason") };
  ["microsoft", "connectionId", "draft", "reason"].forEach((name) => params.delete(name));
  const query = params.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
  return callback;
};

const destinationOf = (connection: StorageConnection): string =>
  connection.displayName || connection.displayUrl ||
  [connection.siteIdentifier, connection.driveIdentifier, connection.folderIdentifier].filter(Boolean).join(" / ") ||
  "Not chosen";

/** Document storage: the external connections (SharePoint and others) and the destination each one stores documents in. */
const OperationsDocumentStorage: React.FC = () => {
  const [connections, setConnections] = useState<StorageConnection[]>([]);
  const [readiness, setReadiness] = useState<MicrosoftReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ConnectionForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  // The Microsoft connection whose destination is being chosen.
  const [pickerId, setPickerId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [connectionRows, readinessResult] = await Promise.all([
        getStorageConnections(),
        // Readiness only decides whether the Microsoft sign-in is offered.
        getMicrosoftReadiness().catch(() => null),
      ]);
      setConnections(connectionRows);
      setReadiness(readinessResult);
    } catch (err: unknown) {
      setError(errorMessage(err, "Could not load the storage connections."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const callback = readCallback();
    if (callback?.outcome === "connected") {
      toastService.success("Microsoft sign-in completed. Choose the SharePoint destination and run the read/write check.");
      if (callback.connectionId) setPickerId(callback.connectionId);
    } else if (callback) {
      toastService.error(CALLBACK_REASONS[callback.reason ?? ""] ?? "The Microsoft sign-in did not complete.");
    }
    load();
  }, []);

  const setField = <K extends keyof ConnectionForm>(key: K, value: ConnectionForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleConnectMicrosoft = async () => {
    setConnecting(true);
    try {
      // Microsoft sends the browser back to this same page once the sign-in is done.
      const result = await startMicrosoftConnect(window.location.pathname);
      if (!result.authorizationUrl) throw new Error("The Microsoft sign-in address was not returned.");
      window.location.assign(result.authorizationUrl);
    } catch (err: unknown) {
      toastService.error(errorMessage(err, "Could not start the Microsoft sign-in."));
      setConnecting(false);
    }
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (form.name.trim().length < 2) {
      toastService.error("Enter a name of at least two characters.");
      return;
    }
    const payload: StorageConnectionWrite = {
      provider: form.provider,
      name: form.name.trim(),
      displayUrl: blank(form.displayUrl),
      tenantIdentifier: blank(form.tenantIdentifier),
      siteIdentifier: blank(form.siteIdentifier),
      driveIdentifier: blank(form.driveIdentifier),
      folderIdentifier: blank(form.folderIdentifier),
    };
    setSaving(true);
    try {
      await createStorageConnection(payload);
      toastService.success("Storage connection registered. It stays pending until it is validated.");
      setShowForm(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (err: unknown) {
      toastService.error(errorMessage(err, "Could not create the storage connection."));
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async (connection: StorageConnection) => {
    if (!window.confirm(`Disconnect ${connection.name}? Documents are no longer copied to it.`)) return;
    setDisconnectingId(connection.id);
    try {
      await disconnectMicrosoftConnection(connection.id);
      toastService.success("Microsoft connection disconnected.");
      if (pickerId === connection.id) setPickerId(null);
      await load();
    } catch (err: unknown) {
      toastService.error(errorMessage(err, "Could not disconnect the Microsoft connection."));
    } finally {
      setDisconnectingId(null);
    }
  };

  if (loading) return <Loader size={24} message="Loading document storage..." />;
  if (error) {
    return (
      <EmptyState
        variant="error"
        title="Couldn't load document storage"
        description={error}
        action={<button type="button" className="sila-btn sila-btn--secondary" onClick={load}>Try again</button>}
      />
    );
  }

  const microsoftReady = readiness?.graphIntegrationReady ?? false;
  const pickerConnection = connections.find((connection) => connection.id === pickerId);

  return (
    <div className="ops-section">
      <PageHeader
        className="pud-page-header"
        title="Document storage"
        description="Where uploaded invoice documents are copied to outside the application, such as a SharePoint library."
        actions={(
          <div className="sila-btn-group">
            {!showForm && (
              <button type="button" className="sila-btn sila-btn--secondary" onClick={() => setShowForm(true)}>Register other storage</button>
            )}
            <button type="button" className="sila-btn sila-btn--primary" onClick={handleConnectMicrosoft} disabled={connecting || !microsoftReady}>
              {connecting ? "Opening Microsoft..." : "Connect Microsoft SharePoint"}
            </button>
          </div>
        )}
      />

      {!microsoftReady && (
        <div className="sila-alert sila-alert--warning" role="status">
          <div>
            <div className="sila-alert-title">Microsoft sign-in is not available</div>
            <div>
              {readiness
                ? "The Microsoft integration is not fully configured on the server (tenant, client, redirect address or token encryption)."
                : "The state of the Microsoft integration could not be checked."}
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <form className="sila-card" onSubmit={handleCreate}>
          <div className="sila-card-header">
            <h2 className="sila-card-title">Register a storage connection</h2>
          </div>
          <div className="sila-card-body">
            <div className="sila-form-grid">
              <div className="sila-field">
                <label className="sila-label" htmlFor="storage-provider">Provider<span className="sila-required">*</span></label>
                <select id="storage-provider" className="sila-select" value={form.provider} onChange={(event) => setField("provider", event.target.value)}>
                  {MANUAL_PROVIDERS.map((value) => <option key={value} value={value}>{statusLabel(value)}</option>)}
                </select>
                <span className="sila-help">For SharePoint, use "Connect Microsoft SharePoint" instead.</span>
              </div>
              <div className="sila-field">
                <label className="sila-label" htmlFor="storage-name">Name<span className="sila-required">*</span></label>
                <input id="storage-name" className="sila-input" value={form.name} onChange={(event) => setField("name", event.target.value)} />
              </div>
              <div className="sila-field sila-field--full">
                <label className="sila-label" htmlFor="storage-url">Address shown to users</label>
                <input id="storage-url" className="sila-input" value={form.displayUrl} onChange={(event) => setField("displayUrl", event.target.value)} />
              </div>
              <div className="sila-field">
                <label className="sila-label" htmlFor="storage-tenant">Tenant identifier</label>
                <input id="storage-tenant" className="sila-input" value={form.tenantIdentifier} onChange={(event) => setField("tenantIdentifier", event.target.value)} />
              </div>
              <div className="sila-field">
                <label className="sila-label" htmlFor="storage-site">Site identifier</label>
                <input id="storage-site" className="sila-input" value={form.siteIdentifier} onChange={(event) => setField("siteIdentifier", event.target.value)} />
              </div>
              <div className="sila-field">
                <label className="sila-label" htmlFor="storage-drive">Drive identifier</label>
                <input id="storage-drive" className="sila-input" value={form.driveIdentifier} onChange={(event) => setField("driveIdentifier", event.target.value)} />
              </div>
              <div className="sila-field">
                <label className="sila-label" htmlFor="storage-folder">Folder identifier</label>
                <input id="storage-folder" className="sila-input" value={form.folderIdentifier} onChange={(event) => setField("folderIdentifier", event.target.value)} />
              </div>
            </div>
          </div>
          <div className="sila-card-footer">
            <button type="button" className="sila-btn sila-btn--secondary" onClick={() => setShowForm(false)} disabled={saving}>Cancel</button>
            <button type="submit" className="sila-btn sila-btn--primary" disabled={saving}>
              {saving ? "Saving..." : "Register connection"}
            </button>
          </div>
        </form>
      )}

      {pickerId && (
        <StorageDestinationPicker
          key={pickerId}
          connectionId={pickerId}
          connectionName={pickerConnection?.name ?? "the Microsoft connection"}
          onClose={() => setPickerId(null)}
          onValidated={load}
        />
      )}

      <section className="sila-card">
        <div className="sila-card-header">
          <h2 className="sila-card-title">Connections</h2>
          <button type="button" className="sila-btn sila-btn--secondary sila-btn--sm" onClick={load}>Refresh</button>
        </div>
        {connections.length === 0 ? (
          <EmptyState
            title="No storage connection yet"
            description="Documents stay in the application's own storage until a connection is added."
          />
        ) : (
          <div className="sila-table-wrap">
            <table className="sila-table">
              <thead>
                <tr>
                  <th scope="col">Connection</th>
                  <th scope="col">Provider</th>
                  <th scope="col">Destination</th>
                  <th scope="col">Validated</th>
                  <th scope="col">Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {connections.map((connection) => (
                  <tr key={connection.id}>
                    <td className="sila-cell-strong">{connection.name}</td>
                    <td>{statusLabel(connection.provider)}</td>
                    <td className="ops-break">{destinationOf(connection)}</td>
                    <td>{formatDateTime(connection.validatedAt)}</td>
                    <td><span className={statusBadgeClass(connection.connectionStatus)}>{statusLabel(connection.connectionStatus)}</span></td>
                    <td>
                      {connection.provider === "MICROSOFT" ? (
                        <div className="sila-btn-group">
                          <button type="button" className="sila-btn sila-btn--secondary sila-btn--sm" onClick={() => setPickerId(connection.id)}>
                            Destination
                          </button>
                          {connection.connectionStatus !== "DISCONNECTED" && (
                            <button type="button" className="sila-btn sila-btn--danger sila-btn--sm" onClick={() => handleDisconnect(connection)} disabled={disconnectingId !== null}>
                              {disconnectingId === connection.id ? "Disconnecting..." : "Disconnect"}
                            </button>
                          )}
                        </div>
                      ) : "—"}
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

export default OperationsDocumentStorage;
