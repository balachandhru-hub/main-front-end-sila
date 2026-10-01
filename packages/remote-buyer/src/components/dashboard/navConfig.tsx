import React from "react";
import type { RouteNavPaths } from "@vosox/shared-ui";
import {
  FileCheckIcon,
  FilePlusIcon,
  FileTextIcon,
  GlobeIcon,
  HomeIcon,
  LayoutGridIcon,
  LayoutTemplateIcon,
  MoreHorizontalIcon,
} from "@vosox/shared-ui";
import type { RfqPageView } from "./types";
import { OPERATIONS_NAV_PATHS } from "../operations/operationsMenu";

// subItems can be a flat leaf or a non-clickable group with nested leaves.
interface NavLeaf {
  key: string;
  label: string;
}
interface NavGroup {
  label: string;
  items: NavLeaf[];
}
type NavSubEntry = NavLeaf | NavGroup;

interface BuyerNavItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  section?: string;
  badge?: number;
  subItems?: NavSubEntry[];
}

/** Each section's URL (/dashboard, /rfqs …); see useRouteNav. */
export const BUYER_NAV_PATHS: RouteNavPaths = {
  dashboard: 'dashboard',
  createRFQ: 'create-rfq',
  allRfqs: 'rfqs',
  activeRFQs: 'rfqs',
  product: 'product-catalog',
  models: 'models',
  template: 'templates',
  contractTemplate: 'contract-templates',
  approvalManagement: 'approval-management',
  material: 'material-approvals',
  contract: 'contract-approvals',
  materialService: 'material-service',
  companyProfile: 'company-profile',
  wishlistApprovals: 'wishlist-approvals',
  wishlist: 'wishlist',
  cart: 'cart',
  apiConfiguration: 'integration',
  workflowConfiguration: 'workflow-configuration',
  ...OPERATIONS_NAV_PATHS,
};

/** Role name of the Outlet Manager: a buyer user who also manages wishlists. */
export const OUTLET_MANAGER_ROLE = 'OUTLET_MANAGER';

// Outlet Manager extras: catalog -> cart -> wishlist, and the API integration (view only).
const wishlistNavItem: BuyerNavItem = { key: "wishlist", icon: <FilePlusIcon />, label: "Wishlist" };
const cartNavItem: BuyerNavItem = { key: "cart", icon: <FileCheckIcon />, label: "Cart" };
// Integration connects the external APIs; Workflow & Configuration decides how the connected ones are used.
const integrationNavItem: BuyerNavItem = { key: "apiConfiguration", icon: <GlobeIcon />, label: "Integration" };
const workflowNavItem: BuyerNavItem = { key: "workflowConfiguration", icon: <LayoutTemplateIcon />, label: "Workflow & Configuration" };

const navItems: BuyerNavItem[] = [
  { key: "dashboard", icon: <HomeIcon />, label: "Dashboard" },
  { key: "createRFQ", icon: <FilePlusIcon />, label: "Create RFQ" },
  { key: "product", icon: <FileCheckIcon />, label: "Product Catalog" },
  { key: "models", icon: <LayoutGridIcon />, label: "Models" },
  {
    key: "configuration",
    icon: <LayoutTemplateIcon />,
    label: "Configuration",
    subItems: [
      { key: "template", label: "Templates" },
      { key: "contractTemplate", label: "Contract Templates" },
      { key: "approvalManagement", label: "Approval Management" },
    ]
  },
  {
    key: "more",
    icon: <MoreHorizontalIcon />,
    label: "More",
    subItems: [
      {
        label: "Approval",
        items: [
          { key: "material", label: "Material" },
          { key: "contract", label: "Contract" },
          { key: "wishlistApprovals", label: "Wishlist" },
        ],
      },
      { key: "materialService", label: "Material & Service" },
    ],
  },
];

/**
 * Sidebar items, plus a "View RFQ" entry while an RFQ's detail page is open.
 * An Outlet Manager gets the buyer user's items plus Wishlist, Cart, and (view only) Integration
 * and Workflow & Configuration. The SILA ME workspace is opened from Models and has its own menu.
 */
export const buildHeaderNavItems = (
  rfqPageView: RfqPageView,
  rfqNumber: string | undefined,
  isOutletManager = false,
): BuyerNavItem[] => {
  const items = [...navItems.filter((item) => item.key !== "activeRFQs")];

  if (isOutletManager) {
    const configurationIndex = items.findIndex((i) => i.key === "configuration");
    items.splice(configurationIndex + 1, 0, integrationNavItem, workflowNavItem);
    const productIndex = items.findIndex((i) => i.key === "product");
    items.splice(productIndex + 1, 0, cartNavItem);
    const dashboardIndex = items.findIndex((i) => i.key === "dashboard");
    items.splice(dashboardIndex + 1, 0, wishlistNavItem);
  }

  if (rfqPageView === "rfqDetail") {
    const createIndex = items.findIndex((i) => i.key === "createRFQ");
    const rfqLabel = rfqNumber ? `View RFQ (${rfqNumber})` : "View RFQ";
    const detailItem = { key: "rfqDetail", icon: <FileTextIcon />, label: rfqLabel };
    if (createIndex !== -1) {
      items.splice(createIndex + 1, 0, detailItem);
    } else {
      items.unshift(detailItem);
    }
  }

  return items;
};
