import React, { useEffect, useState } from "react";
import { EmptyState, Loader, PageHeader, toastService } from "@vosox/shared-ui";
import {
  INTEGRATION_AUTH_TYPES,
  INTEGRATION_PROCESS_TYPES,
  INTEGRATION_PROTOCOLS,
  getIntegration,
  getIntegrations,
  getOrganizationUnits,
  pullIntegration,
  setIntegrationActive,
  testIntegration,
  type IntegrationConfiguration,
  type IntegrationTestResult,
  type OrganizationUnit,
} from "../../api/operationsApi";
import IntegrationConfigForm from "./IntegrationConfigForm";
import IntegrationDataUpdate from "./IntegrationDataUpdate";
import IntegrationHistory from "./IntegrationHistory";
import IntegrationMappingEditor from "./IntegrationMappingEditor";
import IntegrationSchemaPanel from "./IntegrationSchemaPanel";
import { errorMessage, formatDateTime, statusBadgeClass, statusLabel } from "./operationsFormat";
import "./Operations.css";

type Tab = "configuration" | "schema" | "mapping" | "data" | "history";

type View = { name: "list" } | { name: "opening" } | { name: "create" } | { name: "workspace"; configuration: IntegrationConfiguration; tab: Tab };

type Action = "test" | "activate" | "pull" | "fullSync";

const TABS: { key: Tab; label: string }[] = [
  { key: "configuration", label: "Configuration" },
  { key: "schema", label: "Schema" },
  { key: "mapping", label: "Field mapping" },
  { key: "data", label: "Data update" },
  { key: "history", label: "Run history" },
];

const labelOf = (options: { value: string; label: string }[], value: string): string =>
  options.find((option) => option.value === value)?.label ?? statusLabel(value);

/**
 * Integrations with external systems: the configured connections, and for each one its endpoint and sign-in,
 * the discovered schema, the field mapping, the imported data (with spreadsheet import/export) and its run history.
 */
interface OperationsIntegrationsProps {
  /** Opens straight into the create form or one integration, instead of the list. */
  startWith?: "create" | { configurationId: string };
  /** Called instead of returning to this component's own list (when a host screen owns the list). */
  onExit?: () => void;
  /**
   * Which half of an integration is shown. "connection": the API, its sign-in, its schema and the
   * connection test (the Integration screen). "workflow": how a connected API is used — field mapping,
   * data update, runs, activation and pulls (the Workflow & Configuration screen). Omitted: everything.
   */
  mode?: "connection" | "workflow";
}

const CONNECTION_TABS: Tab[] = ["configuration", "schema"];
const WORKFLOW_TABS: Tab[] = ["mapping", "data", "history"];

const OperationsIntegrations: React.FC<OperationsIntegrationsProps> = ({ startWith, onExit, mode }) => {
  const visibleTabs = TABS.filter((item) =>
    mode === "connection" ? CONNECTION_TABS.includes(item.key) : mode === "workflow" ? WORKFLOW_TABS.includes(item.key) : true,
  );
  const firstTab = visibleTabs[0].key;
  const showConnectionActions = mode !== "workflow";
  const showWorkflowActions = mode !== "connection";
  const [view, setView] = useState<View>(
    startWith === "create" ? { name: "create" } : startWith ? { name: "opening" } : { name: "list" },
  );
  const exit = () => (onExit ? onExit() : setView({ name: "list" }));

  // Opened on one integration by the host screen.
  useEffect(() => {
    if (!startWith || startWith === "create") return;
    let active = true;
    getIntegration(startWith.configurationId)
      .then((configuration) => {
        if (active) setView({ name: "workspace", configuration, tab: firstTab });
      })
      .catch((err: unknown) => {
        if (!active) return;
        toastService.error(errorMessage(err, "Could not open the integration."));
        exit();
      });
    return () => {
      active = false;
    };
  }, []);

  const [rows, setRows] = useState<IntegrationConfiguration[]>([]);
  const [units, setUnits] = useState<OrganizationUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  const [testResult, setTestResult] = useState<IntegrationTestResult | null>(null);
  // Bumped after a pull or an import so the run history reloads.
  const [historyVersion, setHistoryVersion] = useState(0);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await getIntegrations());
    } catch (err: unknown) {
      setError(errorMessage(err, "Could not load the integrations."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (view.name === "list") load();
  }, [view.name]);

  // Units only feed the optional "organization unit" choice of the form.
  useEffect(() => {
    getOrganizationUnits().then(setUnits).catch(() => setUnits([]));
  }, []);

  const openWorkspace = (configuration: IntegrationConfiguration, tab: Tab = firstTab) => {
    setTestResult(null);
    setView({ name: "workspace", configuration, tab });
  };

  if (view.name === "opening") {
    return <Loader size={24} message="Opening integration..." />;
  }

  if (view.name === "create") {
    return (
      <div className="ops-section">
        <PageHeader
          className="pud-page-header"
          title="New integration"
          description="Saved as a draft. Test the connection before activating it."
          onBack={exit}
          backLabel="Back to integrations"
        />
        <IntegrationConfigForm
          configuration={null}
          units={units}
          onCancel={exit}
          onSaved={(configuration) => openWorkspace(configuration)}
        />
      </div>
    );
  }

  if (view.name === "workspace") {
    const { configuration, tab } = view;
    const busy = action !== null;
    const isActive = configuration.status === "ACTIVE";
    const canActivate = configuration.status === "TESTED" || configuration.status === "INACTIVE";

    const refresh = async (nextTab: Tab = tab) => {
      try {
        setView({ name: "workspace", configuration: await getIntegration(configuration.id), tab: nextTab });
      } catch (err: unknown) {
        toastService.error(errorMessage(err, "Could not reload the integration."));
      }
    };

    const handleTest = async () => {
      setAction("test");
      try {
        const result = await testIntegration(configuration.id);
        setTestResult(result);
        if (result.success) {
          toastService.success("The connection test passed.");
        } else {
          toastService.error("The connection test failed.");
        }
        setHistoryVersion((current) => current + 1);
        await refresh();
      } catch (err: unknown) {
        toastService.error(errorMessage(err, "The connection test could not be completed."));
      } finally {
        setAction(null);
      }
    };

    const handleActivate = async () => {
      setAction("activate");
      try {
        await setIntegrationActive(configuration.id, !isActive);
        toastService.success(isActive ? "Integration deactivated." : "Integration activated.");
        await refresh();
      } catch (err: unknown) {
        toastService.error(errorMessage(err, "Could not change the integration status."));
      } finally {
        setAction(null);
      }
    };

    const handlePull = async (fullSync: boolean) => {
      setAction(fullSync ? "fullSync" : "pull");
      try {
        const run = await pullIntegration(configuration.id, fullSync);
        const summary = `${run.recordsCreated} created, ${run.recordsUpdated} updated, ${run.recordsFailed} failed.`;
        if (run.status === "SUCCESS") {
          toastService.success(`Pull completed: ${summary}`);
        } else {
          toastService.warning(`Pull ended as ${statusLabel(run.status).toLowerCase()}: ${summary}`);
        }
        setHistoryVersion((current) => current + 1);
        await refresh(visibleTabs.some((item) => item.key === "history") ? "history" : tab);
      } catch (err: unknown) {
        toastService.error(errorMessage(err, "The pull could not be started."));
      } finally {
        setAction(null);
      }
    };

    return (
      <div className="ops-section">
        <PageHeader
          className="pud-page-header"
          title={configuration.name}
          description={`${labelOf(INTEGRATION_PROCESS_TYPES, configuration.processType)} · ${labelOf(INTEGRATION_PROTOCOLS, configuration.protocol)} · entity ${configuration.entityCode}`}
          meta={<span className={statusBadgeClass(configuration.status)}>{statusLabel(configuration.status)}</span>}
          onBack={exit}
          backLabel="Back to integrations"
          actions={(
            <div className="sila-btn-group">
              {showConnectionActions && (
                <button type="button" className="sila-btn sila-btn--secondary" onClick={handleTest} disabled={busy}>
                  {action === "test" ? "Testing..." : "Test connection"}
                </button>
              )}
              {showWorkflowActions && (
                <>
                  <button type="button" className="sila-btn sila-btn--secondary" onClick={handleActivate} disabled={busy || (!isActive && !canActivate)} title={!isActive && !canActivate ? "Run a successful connection test first" : undefined}>
                    {action === "activate" ? "Saving..." : isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button type="button" className="sila-btn sila-btn--secondary" onClick={() => handlePull(true)} disabled={busy || !isActive || configuration.isRunning}>
                    {action === "fullSync" ? "Pulling..." : "Full sync"}
                  </button>
                  <button type="button" className="sila-btn sila-btn--primary" onClick={() => handlePull(false)} disabled={busy || !isActive || configuration.isRunning}>
                    {action === "pull" ? "Pulling..." : "Pull changes"}
                  </button>
                </>
              )}
            </div>
          )}
        />

        <section className="sila-card">
          <div className="sila-card-body ops-stack">
            <dl className="sila-meta-grid">
              <div className="sila-meta-item"><dt className="sila-meta-label">Sign-in</dt><dd className="sila-meta-value">{labelOf(INTEGRATION_AUTH_TYPES, configuration.authenticationType)}</dd></div>
              <div className="sila-meta-item"><dt className="sila-meta-label">Credentials</dt><dd className="sila-meta-value">{statusLabel(configuration.credentialStatus)}</dd></div>
              <div className="sila-meta-item"><dt className="sila-meta-label">Last tested</dt><dd className="sila-meta-value">{formatDateTime(configuration.testedAt)}</dd></div>
              <div className="sila-meta-item"><dt className="sila-meta-label">Last attempt</dt><dd className="sila-meta-value">{formatDateTime(configuration.lastAttemptAt)}</dd></div>
              <div className="sila-meta-item"><dt className="sila-meta-label">Last successful run</dt><dd className="sila-meta-value">{formatDateTime(configuration.lastSuccessfulRunAt)}</dd></div>
              <div className="sila-meta-item"><dt className="sila-meta-label">Next scheduled run</dt><dd className="sila-meta-value">{configuration.scheduleCron ? formatDateTime(configuration.nextRunAt) : "Not scheduled"}</dd></div>
              <div className="sila-meta-item"><dt className="sila-meta-label">Watermark</dt><dd className="sila-meta-value">{formatDateTime(configuration.lastWatermark)}</dd></div>
              <div className="sila-meta-item"><dt className="sila-meta-label">Run state</dt><dd className="sila-meta-value">{configuration.isRunning ? "Running now" : "Idle"}</dd></div>
            </dl>
            {!isActive && (
              <span className="sila-help">
                Pulls are available once the integration is active. {canActivate ? "It can be activated now." : "Run a successful connection test to be able to activate it."}
              </span>
            )}
            {testResult && (
              <div className={`sila-alert ${testResult.success ? "sila-alert--success" : "sila-alert--danger"}`} role="status">
                <div>
                  <div className="sila-alert-title">
                    {testResult.success ? "Connection test passed" : "Connection test failed"}
                    {testResult.httpStatus ? ` (HTTP ${testResult.httpStatus})` : ""}
                  </div>
                  <div className="ops-break">{testResult.message}</div>
                </div>
              </div>
            )}
            {configuration.lastErrorSafe && (
              <div className="sila-alert sila-alert--warning" role="status">
                <div>
                  <div className="sila-alert-title">Last run reported a problem</div>
                  <div className="ops-break">{configuration.lastErrorSafe}</div>
                </div>
              </div>
            )}
          </div>
        </section>

        <div className="sila-tabs" role="tablist" aria-label="Integration sections">
          {visibleTabs.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              className="sila-tab"
              aria-selected={tab === item.key}
              onClick={() => setView({ name: "workspace", configuration, tab: item.key })}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === "configuration" && (
          <IntegrationConfigForm
            key={configuration.id}
            configuration={configuration}
            units={units}
            onCancel={exit}
            onSaved={(saved) => setView({ name: "workspace", configuration: saved, tab: "configuration" })}
          />
        )}
        {tab === "schema" && <IntegrationSchemaPanel configuration={configuration} />}
        {tab === "mapping" && <IntegrationMappingEditor configuration={configuration} />}
        {tab === "data" && (
          <IntegrationDataUpdate configuration={configuration} onImported={() => setHistoryVersion((current) => current + 1)} />
        )}
        {tab === "history" && <IntegrationHistory configurationId={configuration.id} refreshKey={historyVersion} />}
      </div>
    );
  }

  const names: Record<string, string> = {};
  rows.forEach((row) => {
    names[row.id] = row.name;
  });

  return (
    <div className="ops-section">
      <PageHeader
        className="pud-page-header"
        title="Integrations"
        description="Connections to ERP and other systems: purchase orders and suppliers pulled in, goods receipts posted out, and spreadsheet updates."
        actions={<button type="button" className="sila-btn sila-btn--primary" onClick={() => setView({ name: "create" })}>New integration</button>}
      />
      <section className="sila-card">
        {loading ? (
          <Loader size={24} message="Loading integrations..." />
        ) : error ? (
          <EmptyState
            variant="error"
            title="Couldn't load the integrations"
            description={error}
            action={<button type="button" className="sila-btn sila-btn--secondary" onClick={load}>Try again</button>}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No integrations yet"
            description="Create one to pull purchase orders or suppliers, or to import them by spreadsheet."
            action={<button type="button" className="sila-btn sila-btn--primary" onClick={() => setView({ name: "create" })}>New integration</button>}
          />
        ) : (
          <div className="sila-table-wrap">
            <table className="sila-table">
              <thead>
                <tr>
                  <th scope="col">Integration</th>
                  <th scope="col">Process</th>
                  <th scope="col">Protocol</th>
                  <th scope="col">Entity</th>
                  <th scope="col">Status</th>
                  <th scope="col">Last successful run</th>
                  <th scope="col">Next run</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="sila-row-clickable"
                    tabIndex={0}
                    onClick={() => openWorkspace(row)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openWorkspace(row);
                      }
                    }}
                  >
                    <td>
                      <span className="sila-cell-strong">{row.name}</span>
                      <div className="sila-help ops-break">{row.baseUrl}</div>
                      {row.lastErrorSafe && <div className="sila-error-text ops-break">{row.lastErrorSafe}</div>}
                    </td>
                    <td>{labelOf(INTEGRATION_PROCESS_TYPES, row.processType)}</td>
                    <td>{labelOf(INTEGRATION_PROTOCOLS, row.protocol)}</td>
                    <td>{row.entityCode}</td>
                    <td>
                      <span className={statusBadgeClass(row.status)}>{statusLabel(row.status)}</span>
                      {row.isRunning && <div className="sila-help">Running now</div>}
                    </td>
                    <td>{formatDateTime(row.lastSuccessfulRunAt)}</td>
                    <td>{row.scheduleCron ? formatDateTime(row.nextRunAt) : "Not scheduled"}</td>
                    <td onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                      <div className="sila-btn-group">
                        <button type="button" className="sila-btn sila-btn--secondary sila-btn--sm" onClick={() => openWorkspace(row)}>Open</button>
                        <button type="button" className="sila-btn sila-btn--ghost sila-btn--sm" onClick={() => openWorkspace(row, "data")}>Data</button>
                        <button type="button" className="sila-btn sila-btn--ghost sila-btn--sm" onClick={() => openWorkspace(row, "history")}>Runs</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {!loading && !error && rows.length > 0 && <IntegrationHistory names={names} title="Recent runs of all integrations" />}
    </div>
  );
};

export default OperationsIntegrations;
