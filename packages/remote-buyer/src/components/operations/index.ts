import React from "react";
import OperationsDocumentStorage from "./OperationsDocumentStorage";
import OperationsExtractionSettings from "./OperationsExtractionSettings";
import OperationsGoodsReceipts from "./OperationsGoodsReceipts";
import OperationsIntegrations from "./OperationsIntegrations";
import OperationsInvoices from "./OperationsInvoices";
import OperationsOverview from "./OperationsOverview";
import OperationsPurchaseOrders from "./OperationsPurchaseOrders";
import OperationsSuppliers from "./OperationsSuppliers";
import OperationsUnits from "./OperationsUnits";

export {
  OperationsDocumentStorage,
  OperationsExtractionSettings,
  OperationsGoodsReceipts,
  OperationsIntegrations,
  OperationsInvoices,
  OperationsOverview,
  OperationsPurchaseOrders,
  OperationsSuppliers,
  OperationsUnits,
};

export type OperationsNavGroup = "Receiving" | "Master Data" | "Integration" | "Configuration";

export interface OperationsNavItem {
  key: string;
  label: string;
  path: string;
  group: OperationsNavGroup;
}

/** The operations sections, in menu order, for the host menu. */
export const OPERATIONS_NAV: OperationsNavItem[] = [
  { key: "opsOverview", label: "Receiving Overview", path: "operations-overview", group: "Receiving" },
  { key: "opsInvoices", label: "Invoices & Documents", path: "operations-invoices", group: "Receiving" },
  { key: "opsPurchaseOrders", label: "Purchase Orders", path: "operations-purchase-orders", group: "Receiving" },
  { key: "opsGoodsReceipts", label: "Goods Receipts", path: "operations-goods-receipts", group: "Receiving" },
  { key: "opsSuppliers", label: "Supplier Master", path: "operations-suppliers", group: "Master Data" },
  { key: "opsIntegrations", label: "Integrations", path: "operations-integrations", group: "Integration" },
  { key: "opsExtractionSettings", label: "Document Extraction", path: "operations-document-extraction", group: "Configuration" },
  { key: "opsDocumentStorage", label: "Document Storage", path: "operations-document-storage", group: "Configuration" },
  { key: "opsUnits", label: "Organization Units", path: "operations-units", group: "Configuration" },
];

/**
 * The section for a nav key, or null for a key that is not an operations section.
 * `onNavigate` is optional: the overview uses it to open another section by its key.
 */
export const renderOperationsSection = (key: string, onNavigate?: (key: string) => void): React.ReactNode | null => {
  switch (key) {
    case "opsOverview":
      return React.createElement(OperationsOverview, { onNavigate });
    case "opsInvoices":
      return React.createElement(OperationsInvoices);
    case "opsPurchaseOrders":
      return React.createElement(OperationsPurchaseOrders);
    case "opsGoodsReceipts":
      return React.createElement(OperationsGoodsReceipts);
    case "opsSuppliers":
      return React.createElement(OperationsSuppliers);
    case "opsIntegrations":
      return React.createElement(OperationsIntegrations);
    case "opsExtractionSettings":
      return React.createElement(OperationsExtractionSettings);
    case "opsDocumentStorage":
      return React.createElement(OperationsDocumentStorage);
    case "opsUnits":
      return React.createElement(OperationsUnits);
    default:
      return null;
  }
};
