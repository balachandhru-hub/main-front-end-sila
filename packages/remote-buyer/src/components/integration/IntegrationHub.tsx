import React, { useEffect, useState } from "react";
import { EmptyState, Loader, PageHeader } from "@vosox/shared-ui";
import { ERP_API_TYPES, getBuyerErpIntegrations, type ErpIntegration } from "../../api/erpIntegrationApi";
import {
  INTEGRATION_PROCESS_TYPES,
  INTEGRATION_PROTOCOLS,
  getIntegrations,
  type IntegrationConfiguration,
} from "../../api/operationsApi";
import BuyerErpConfiguration from "../erp/BuyerErpConfiguration";
import OperationsIntegrations from "../operations/OperationsIntegrations";
import { statusBadgeClass, statusLabel } from "../operations/operationsFormat";

interface IntegrationHubProps {
  /**
   * "integration": connect APIs — every API in one list, with its URL, sign-in, schema and connection test.
   * "workflow": use the connected APIs — for each one, how it is called, its field mapping, data update,
   * runs and activation.
   */
  variant?: "integration" | "workflow";
  /** View only: APIs can be opened but not created or changed. */
  readOnly?: boolean;
  /** The organization is licensed for the operations module, which adds the ERP data exchange APIs. */
  hasOperations?: boolean;
}

/** Sentinel for the "New integration" choice that opens the ERP data exchange form. */
const NEW_DATA_INTEGRATION = "DATA_INTEGRATION";

// Statuses of an ERP data exchange API whose connection test has passed.
const CONNECTED_STATUSES = ["TESTED", "ACTIVE", "INACTIVE"];

// One row of the list, whichever service stores the API.
interface IntegrationRow {
  key: string;
  name: string;
  purpose: string;
  system: string;
  target: string;
  status: string;
  connected: boolean;
  open: View;
}

type View =
  | { name: "list" }
  | { name: "api"; process: string }
  | { name: "data"; startWith: "create" | { configurationId: string } };

const labelOf = (options: { value: string; label: string }[], value: string): string =>
  options.find((option) => option.value === value)?.label ?? statusLabel(value);

const apiRow = (integration: ErpIntegration): IntegrationRow => ({
  key: `api-${integration.id}`,
  name: integration.apiName,
  purpose: ERP_API_TYPES.find((type) => type.process === integration.process?.toUpperCase())?.label ?? integration.process,
  system: integration.erpType,
  target: integration.baseUrl,
  status: integration.isActive ? "ACTIVE" : "INACTIVE",
  // These APIs have no connection test; a saved API is usable.
  connected: true,
  open: { name: "api", process: integration.process?.toUpperCase() },
});

const dataRow = (integration: IntegrationConfiguration): IntegrationRow => ({
  key: `data-${integration.id}`,
  name: integration.name,
  purpose: labelOf(INTEGRATION_PROCESS_TYPES, integration.processType),
  system: labelOf(INTEGRATION_PROTOCOLS, integration.protocol),
  target: `Entity ${integration.entityCode}`,
  status: integration.status,
  connected: CONNECTED_STATUSES.includes(integration.status),
  open: { name: "data", startWith: { configurationId: integration.id } },
});

/**
 * The application's single place for external APIs. Integration connects and tests them; Workflow &
 * Configuration decides how the connected ones are used. Both read the same list.
 */
const IntegrationHub: React.FC<IntegrationHubProps> = ({ variant = "integration", readOnly = false, hasOperations = false }) => {
  const isWorkflow = variant === "workflow";
  const [view, setView] = useState<View>({ name: "list" });
  const [rows, setRows] = useState<IntegrationRow[]>([]);
  const [configuredProcesses, setConfiguredProcesses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newType, setNewType] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [apiIntegrations, dataIntegrations] = await Promise.all([
        getBuyerErpIntegrations(),
        // The ERP data exchange APIs are administered by the buyer administrator only.
        hasOperations && !readOnly ? getIntegrations() : Promise.resolve<IntegrationConfiguration[]>([]),
      ]);
      setConfiguredProcesses(apiIntegrations.map((integration) => integration.process?.toUpperCase()));
      setRows([...apiIntegrations.map(apiRow), ...dataIntegrations.map(dataRow)]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not load the integrations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (view.name === "list") load();
  }, [view.name, hasOperations, variant]);

  // Leaving one screen for the other starts on its list.
  useEffect(() => {
    setView({ name: "list" });
  }, [variant]);

  const backToList = () => setView({ name: "list" });

  if (view.name === "api") {
    return (
      <BuyerErpConfiguration
        readOnly={readOnly}
        process={view.process}
        onExit={backToList}
        section={isWorkflow ? "request" : "connection"}
      />
    );
  }

  if (view.name === "data") {
    return (
      <OperationsIntegrations
        startWith={view.startWith}
        onExit={backToList}
        mode={isWorkflow ? "workflow" : "connection"}
      />
    );
  }

  // Workflow & Configuration works only with APIs that are connected.
  const visibleRows = isWorkflow ? rows.filter((row) => row.connected) : rows;

  // Each API type holds one integration, so only the types not configured yet can be added.
  const availableApiTypes = ERP_API_TYPES.filter((type) => !configuredProcesses.includes(type.process));
  const canCreate = !isWorkflow && !readOnly && (availableApiTypes.length > 0 || hasOperations);

  const handleCreate = () => {
    if (!newType) return;
    setView(newType === NEW_DATA_INTEGRATION ? { name: "data", startWith: "create" } : { name: "api", process: newType });
    setNewType("");
  };

  return (
    <>
      <PageHeader
        className="pud-page-header"
        title={isWorkflow ? "Workflow & Configuration" : "Integrations"}
        actions={canCreate ? (
          <div className="sila-btn-group">
            <select
              className="sila-select"
              aria-label="Integration type"
              value={newType}
              onChange={(event) => setNewType(event.target.value)}
            >
              <option value="">Select integration type</option>
              {availableApiTypes.map((type) => (
                <option key={type.process} value={type.process}>{type.label}</option>
              ))}
              {hasOperations && <option value={NEW_DATA_INTEGRATION}>ERP data exchange (orders, suppliers, receipts)</option>}
            </select>
            <button type="button" className="sila-btn sila-btn--primary" onClick={handleCreate} disabled={!newType}>
              New integration
            </button>
          </div>
        ) : undefined}
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
        ) : visibleRows.length === 0 ? (
          <EmptyState
            title={isWorkflow ? "No connected APIs yet" : "No integrations yet"}
            description={isWorkflow
              ? "Connect an API under Integration and pass its connection test. It then appears here to be configured."
              : readOnly
                ? "Your buyer administrator sets up the integrations of the organization."
                : "Select an integration type and choose New integration."}
          />
        ) : (
          <div className="sila-table-wrap">
            <table className="sila-table">
              <thead>
                <tr>
                  <th scope="col">{isWorkflow ? "Workflow" : "Purpose"}</th>
                  <th scope="col">API</th>
                  <th scope="col">System</th>
                  <th scope="col">Target</th>
                  <th scope="col">Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={row.key}>
                    <td className="sila-cell-strong">{row.purpose}</td>
                    <td>{row.name}</td>
                    <td>{row.system || "—"}</td>
                    <td>{row.target || "—"}</td>
                    <td><span className={statusBadgeClass(row.status)}>{statusLabel(row.status)}</span></td>
                    <td>
                      <button type="button" className="sila-btn sila-btn--secondary sila-btn--sm" onClick={() => setView(row.open)}>
                        {readOnly ? "View" : isWorkflow ? "Configure" : "Open"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
};

export default IntegrationHub;
