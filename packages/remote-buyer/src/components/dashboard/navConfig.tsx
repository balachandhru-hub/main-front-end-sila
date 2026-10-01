import React from "react";
import type { RouteNavPaths } from "@vosox/shared-ui";
import {
  FileCheckIcon,
  FilePlusIcon,
  FileTextIcon,
  HomeIcon,
  LayoutGridIcon,
  LayoutTemplateIcon,
  MoreHorizontalIcon,
} from "@vosox/shared-ui";
import type { RfqPageView } from "./types";

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
  wishlist: 'wishlist',
  purchaseOrderApi: 'purchase-order-api',
};

const navItems: BuyerNavItem[] = [
  { key: "dashboard", icon: <HomeIcon />, label: "Dashboard" },
  { key: "wishlist", icon: <FileTextIcon />, label: "Wishlist" },
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
      { key: "purchaseOrderApi", label: "Purchase Order API" },
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
        ],
      },
      { key: "materialService", label: "Material & Service" },
    ],
  },
];

/** Sidebar items, plus a "View RFQ" entry while an RFQ's detail page is open. */
export const buildHeaderNavItems = (
  rfqPageView: RfqPageView,
  rfqNumber: string | undefined,
): BuyerNavItem[] => {
  const items = [...navItems.filter((item) => item.key !== "activeRFQs")];

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
