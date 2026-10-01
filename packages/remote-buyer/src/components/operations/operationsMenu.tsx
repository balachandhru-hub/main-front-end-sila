import React from "react";
import type { RouteNavPaths } from "@vosox/shared-ui";
import {
  ArrowLeftIcon,
  BuildingIcon,
  EmptyState,
  FileCheckIcon,
  FilePlusIcon,
  FileTextIcon,
  HomeIcon,
  LayoutGridIcon,
  LayoutTemplateIcon,
  PageHeader,
  ShieldCheckIcon,
} from "@vosox/shared-ui";
import IntegrationHub from "../integration/IntegrationHub";
import { OPERATIONS_NAV, renderOperationsSection } from "./index";

/**
 * Menu of the SILA ME workspace (hospitality operations), following the structure of the SILA ME
 * application: Menu Engineering, Inventory, Receiving, Purchasing, Documents, Control, Administration.
 * A section with `section` opens a built screen; the others are announced but not available yet,
 * exactly as in SILA ME itself. Users and roles are managed in the procurement application.
 */
interface WorkspaceLeaf {
  key: string;
  label: string;
  /** Text of the "not available yet" page; absent for a built screen. */
  description?: string;
}

interface WorkspaceGroup {
  key: string;
  label: string;
  icon: React.ReactNode;
  items: WorkspaceLeaf[];
}

/** First screen of the workspace, opened from the Models page. */
export const OPERATIONS_HOME_KEY = "opsOverview";

/** Workflow & configuration of the connected APIs, inside the workspace. */
const OPERATIONS_WORKFLOW_KEY = "opsWorkflow";

const soon = (slug: string, label: string, description: string): WorkspaceLeaf => ({
  key: `opsSoon-${slug}`,
  label,
  description,
});

const WORKSPACE_GROUPS: WorkspaceGroup[] = [
  {
    key: "opsMenuEngineering",
    label: "Menu Engineering",
    icon: <LayoutGridIcon />,
    items: [
      soon("menu-planning", "Menu planning", "Plan the service periods, menus, and operating units that shape demand."),
      soon("recipes", "Recipes", "Connect recipe definitions to ingredient cost and portion logic."),
      soon("ingredients", "Ingredients", "Maintain the material language used across recipes, procurement, and stock."),
      soon("portion-planning", "Portion planning", "Plan yields and portions with operational clarity."),
      soon("demand-forecast", "Demand forecast", "Prepare future demand views for a connected planning service."),
      soon("menu-performance", "Menu performance", "Compare menu performance once the analytics connection is available."),
    ],
  },
  {
    key: "opsInventory",
    label: "Inventory",
    icon: <FileCheckIcon />,
    items: [
      soon("stock", "Stock", "See current stock position across your operating units."),
      soon("count", "Count", "Prepare count sessions and reconcile what is physically on hand."),
      soon("transfers", "Transfers", "Track material moving between operating units."),
      soon("goods-issue", "Goods issue", "Record controlled issues from stores to the operation."),
      soon("damage-waste", "Damage / waste", "Keep damage and write-off activity visible and accountable."),
      soon("batches", "Batches", "Monitor batch identity and expiry exposure."),
    ],
  },
  {
    key: "opsReceiving",
    label: "Receiving",
    icon: <FilePlusIcon />,
    items: [
      soon("receive", "Receive", "Prepare the receiving workspace for delivery checks and receipt posting."),
      { key: "opsInvoices", label: "Invoices" },
      { key: "opsGoodsReceipts", label: "Goods receipts" },
      soon("exceptions", "Exceptions", "Surface mismatches that need operational attention."),
    ],
  },
  {
    key: "opsPurchasing",
    label: "Purchasing",
    icon: <FileTextIcon />,
    items: [
      soon("requirements", "Requirements", "Turn operating demand into a connected procurement requirement."),
      soon("suggestions", "Suggestions", "Review suggested orders once procurement recommendations are connected."),
      { key: "opsPurchaseOrders", label: "Purchase orders" },
      { key: "opsSuppliers", label: "Suppliers" },
    ],
  },
  {
    key: "opsDocuments",
    label: "Documents",
    icon: <LayoutTemplateIcon />,
    items: [
      soon("inbox", "Inbox", "Triage incoming operational documents."),
      soon("invoice-capture", "Invoice capture", "Capture invoices from connected sources."),
      soon("extraction", "Extraction", "Review document extraction readiness and structured results."),
      soon("archive", "Archive", "Find the operational documents that have already been processed."),
    ],
  },
  {
    key: "opsControl",
    label: "Control",
    icon: <ShieldCheckIcon />,
    items: [
      soon("approvals", "Approvals", "Review decisions waiting for the right operational owner."),
      soon("analytics", "Analytics", "A measured view of operating performance is being connected."),
      soon("master-data", "Master data", "The shared reference model for hospitality operations."),
    ],
  },
  {
    key: "opsAdministration",
    label: "Administration",
    icon: <BuildingIcon />,
    items: [
      { key: "opsUnits", label: "Properties & units" },
      { key: "opsExtractionSettings", label: "Document extraction" },
      { key: "opsDocumentStorage", label: "Document storage" },
      { key: "opsIntegrations", label: "Integrations" },
      { key: OPERATIONS_WORKFLOW_KEY, label: "Workflow & configuration" },
      soon("audit", "Audit", "Trace important changes across the operating model."),
    ],
  },
];

const WORKSPACE_LEAVES: WorkspaceLeaf[] = WORKSPACE_GROUPS.flatMap((group) => group.items);

const pathOf = (key: string): string => {
  if (key === OPERATIONS_WORKFLOW_KEY) return "operations-workflow";
  return OPERATIONS_NAV.find((item) => item.key === key)?.path ?? key.replace("opsSoon-", "operations-");
};

/** URL of each workspace section, to merge into a dashboard's route map (see useRouteNav). */
export const OPERATIONS_NAV_PATHS: RouteNavPaths = Object.fromEntries([
  [OPERATIONS_HOME_KEY, pathOf(OPERATIONS_HOME_KEY)],
  ...WORKSPACE_LEAVES.map((leaf) => [leaf.key, pathOf(leaf.key)]),
]);

/** True for a nav key that belongs to the SILA ME workspace. */
export const isOperationsNavKey = (key: string): boolean => key in OPERATIONS_NAV_PATHS;

/**
 * Header menu while the workspace is open. `exitKey` is the host dashboard's nav key to go back to
 * the procurement application.
 */
export const buildOperationsWorkspaceNav = (exitKey: string) => [
  { key: exitKey, icon: <ArrowLeftIcon />, label: "Procurement" },
  { key: OPERATIONS_HOME_KEY, icon: <HomeIcon />, label: "Dashboard" },
  ...WORKSPACE_GROUPS.map((group) => ({
    key: group.key,
    icon: group.icon,
    label: group.label,
    subItems: group.items.map((item) => ({ key: item.key, label: item.label })),
  })),
];

interface WorkspaceOptions {
  /** The signed-in role only views integrations (not the buyer administrator). */
  readOnlyIntegrations?: boolean;
}

/** The screen of a workspace nav key. */
export const renderOperationsWorkspace = (
  key: string,
  onNavigate: (key: string) => void,
  options: WorkspaceOptions = {},
): React.ReactNode => {
  // The application has one Integration screen and one Workflow & Configuration screen;
  // the workspace opens the same ones.
  if (key === "opsIntegrations") {
    return <IntegrationHub variant="integration" hasOperations readOnly={options.readOnlyIntegrations} />;
  }
  if (key === OPERATIONS_WORKFLOW_KEY) {
    return <IntegrationHub variant="workflow" hasOperations readOnly={options.readOnlyIntegrations} />;
  }

  const leaf = WORKSPACE_LEAVES.find((item) => item.key === key);
  if (leaf?.description) {
    return (
      <>
        <PageHeader className="pud-page-header" title={leaf.label} />
        <section className="sila-card">
          <EmptyState title="Not available yet" description={leaf.description} />
        </section>
      </>
    );
  }

  return renderOperationsSection(key, onNavigate);
};
