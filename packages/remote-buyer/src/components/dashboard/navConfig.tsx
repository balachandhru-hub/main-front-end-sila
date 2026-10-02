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
  weeklyBucketApprovals: 'weekly-bucket-approvals',
  wishlist: 'wishlist',
  weeklyBucket: 'weekly-bucket',
  cart: 'cart',
  ...OPERATIONS_NAV_PATHS,
};

/** Role name of the Outlet Manager: a buyer user who also requests products for his outlets. */
export const OUTLET_MANAGER_ROLE = 'OUTLET_MANAGER';

/** Role name of the Store Manager: a buyer user who reviews and freezes the weekly bucket of a property. */
export const STORE_MANAGER_ROLE = 'STORE_MANAGER';

// Outlet Manager extras: catalog -> cart -> personal wishlist / weekly bucket.
const wishlistNavItem: BuyerNavItem = { key: "wishlist", icon: <FilePlusIcon />, label: "Wishlist" };
const weeklyBucketNavItem: BuyerNavItem = { key: "weeklyBucket", icon: <FileTextIcon />, label: "Weekly Bucket" };
const cartNavItem: BuyerNavItem = { key: "cart", icon: <FileCheckIcon />, label: "Cart" };

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
          { key: "weeklyBucketApprovals", label: "Weekly Bucket" },
        ],
      },
      { key: "materialService", label: "Material & Service" },
    ],
  },
];

/**
 * Sidebar items, plus a "View RFQ" entry while an RFQ's detail page is open.
 * An Outlet Manager gets the buyer user's items plus Wishlist, Weekly Bucket and Cart.
 * A Store Manager gets the buyer user's items plus Weekly Bucket.
 * The SILA ME workspace is opened from Models and has its own menu.
 */
export const buildHeaderNavItems = (
  rfqPageView: RfqPageView,
  rfqNumber: string | undefined,
  isOutletManager = false,
  isStoreManager = false,
): BuyerNavItem[] => {
  const items = [...navItems.filter((item) => item.key !== "activeRFQs")];

  if (isOutletManager) {
    const productIndex = items.findIndex((i) => i.key === "product");
    items.splice(productIndex + 1, 0, cartNavItem);
    const dashboardIndex = items.findIndex((i) => i.key === "dashboard");
    items.splice(dashboardIndex + 1, 0, wishlistNavItem, weeklyBucketNavItem);
  }

  if (isStoreManager) {
    const dashboardIndex = items.findIndex((i) => i.key === "dashboard");
    items.splice(dashboardIndex + 1, 0, weeklyBucketNavItem);
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
