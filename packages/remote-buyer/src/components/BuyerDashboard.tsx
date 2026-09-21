import React, { useState, useEffect, useMemo } from "react";
import "./BuyerDashBoard.css";
import CreateRFQ from "./Create_RFQ.tsx";
import Product from "./Product.tsx";
import Models from "./Models.tsx";
import ItemMasterCatalog from "./ItemMasterCatalog.tsx";
import Header from "./Header";
import QsAns from "./Qsans.tsx";
// import QuotationSummaryTable from "./QuotationSummaryTable.tsx";
import { logoutBuyer, getBuyerProfile, fetchBuyerRFQs, fetchBuyerRFQById, updateRfqStatus, fetchBuyerDashboardAnalytics } from "../api/Buyerapi";
import { useBuyerAuthStore } from "../store/useBuyerAuthStore";
import BuyerRFQChat from "./BuyerRFQChat/BuyerRFQChat";
import UserTemplate from "../../../remote-platform-user/src/components/UserTemplate.tsx";
import QuotationComparisonCard from "../../../remote-platform-user/src/components/QuotationComparisonCard.tsx";
import BidComparisonAwardView from "../../../remote-platform-user/src/components/BidComparisonAwardView.tsx";
import type { PendingMaterialApproval, MaterialApprovalKpi } from "../../../remote-platform-user/src/components/Material/materialApi";
import { fetchPendingMaterialApprovals, fetchMaterialApprovalKpi } from "../../../remote-platform-user/src/components/Material/materialApi";
import MaterialTable from "../../../remote-platform-user/src/components/Material/MaterialTable";
import MaterialApprovalDetail from "../../../remote-platform-user/src/components/Material/MaterialApprovalDetail";
import type { ContractRecord } from "../../../remote-platform-user/src/components/Contract/contractApi";
import { fetchContracts } from "../../../remote-platform-user/src/components/Contract/contractApi";
import ContractTable from "../../../remote-platform-user/src/components/Contract/ContractTable";
import { BuyerAnalytics, CompanyProfile, EmptyState, Loader, StatusBadge, toastService, useAsyncData, useRouteNav, type RouteNavPaths } from '@vosox/shared-ui';
import { useAuth } from '../../../host-app/src/AuthContext.tsx';
import ApprovalManagement from "../../../remote-platform-user/src/components/ApprovalManagement/ApprovalManagement.tsx";

/* ---------------------------------- Icons ---------------------------------- */



interface MatchCard {
  location: string;
  initials: string;
  name: string;
  seeking: string;
  description: string;
  representative: string;
  actionLabel: string;
  actionVariant: "message" | "interest";
  website: string;
  repTitle: string;
  repEmail: string;
  revenue: string;
  employees: string;
  categoryNote: string;
  destinationNote: string;
}

const IconClose = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// const IconMenu = () => (
//   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//     <line x1="3" y1="6" x2="21" y2="6" />
//     <line x1="3" y1="12" x2="21" y2="12" />
//     <line x1="3" y1="18" x2="21" y2="18" />
//   </svg>
// );

const IconFile = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M8 13h8M8 17h8M8 9h2" />
  </svg>
);

const NavIconHome = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <path d="M9 22V12h6v10" />
  </svg>
);

const NavIconBuilding = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="1" />
    <path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01" />
  </svg>
);

const NavIconModels = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const NavIconMore = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
    <circle cx="5" cy="12" r="1" />
  </svg>
);

const IconCalendar = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

const IconPin = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const IconEye = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

// const IconDownload = () => (
//   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//     <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
//     <polyline points="7 10 12 15 17 10" />
//     <line x1="12" y1="15" x2="12" y2="3" />
//   </svg>
// );

const IconMessageSquare = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const IconSend = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
  </svg>
);

// const IconBidCompare = () => (
//   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//     <line x1="12" y1="20" x2="12" y2="10" />
//     <line x1="18" y1="20" x2="18" y2="4" />
//     <line x1="6" y1="20" x2="6" y2="16" />
//   </svg>
// );

// const IconFreezeLock = () => (
//   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//     <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
//     <path d="M7 11V7a5 5 0 0 1 10 0v4" />
//   </svg>
// );

const IconSparkles = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="M5 3v4M3 5h4M19 3v4M17 5h4M5 19v4M3 21h4M19 19v4M17 21h4" />
  </svg>
);

const IconChevronLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const IconChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const IconGlobe = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z" />
  </svg>
);

const IconShieldCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const IconCheckCircle = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const NavIconFilePlus = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M12 12v6M9 15h6" />
  </svg>
);

const NavIconFile = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M8 13h8M8 17h8M8 9h2" />
  </svg>
);

const NavIconFileCheck = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="m9 15 2 2 4-4" />
  </svg>
);

const NavIconTemplate = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18" />
    <path d="M9 3v18" />
  </svg>
);

/* ---------------------------------- Static data ---------------------------------- */

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

const isNavGroup = (entry: NavSubEntry): entry is NavGroup => 'items' in entry;

const collectSubEntryKeys = (entries: NavSubEntry[]): string[] =>
  entries.flatMap((entry) => (isNavGroup(entry) ? collectSubEntryKeys(entry.items) : [entry.key]));

/** Each section's URL (/dashboard, /rfqs …); see useRouteNav. */
const BUYER_NAV_PATHS: RouteNavPaths = {
  dashboard: 'dashboard',
  createRFQ: 'create-rfq',
  allRfqs: 'rfqs',
  activeRFQs: 'rfqs',
  product: 'product-catalog',
  models: 'models',
  template: 'templates',
  approvalManagement: 'approval-management',
  material: 'material-approvals',
  contract: 'contract-approvals',
  materialService: 'material-service',
  companyProfile: 'company-profile',
};

const navItems: { key: string; icon: React.ReactNode; label: string; section?: string; badge?: number; subItems?: NavSubEntry[] }[] = [
  { key: "dashboard", icon: <NavIconHome />, label: "Dashboard" },
  { key: "createRFQ", icon: <NavIconFilePlus />, label: "Create RFQ" },
  { key: "product", icon: <NavIconFileCheck />, label: "Product Catalog" },
  { key: "models", icon: <NavIconModels />, label: "Models" },
  { 
    key: "configuration", 
    icon: <NavIconTemplate />, 
    label: "Configuration",
    subItems: [
      { key: "template", label: "Templates" },
      { key: "approvalManagement", label: "Approval Management" }
    ]
  },
  {
    key: "more",
    icon: <NavIconMore />,
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

// Placeholder purchase orders: the backend has no purchase-order entity yet.
interface POItem {
  code: string;
  status: "ACCEPTED" | "DELIVERED";
  company: string;
  orderDate: string;
  amount: string;
}

const poItems: POItem[] = [
  { code: "PO-2026-90412", status: "ACCEPTED", company: "Meridian Components Ltd.", orderDate: "2026-07-04", amount: "$18,500.00" },
  { code: "PO-2026-88401", status: "ACCEPTED", company: "Northbridge Supply Co.", orderDate: "2026-05-22", amount: "$4,200.00" },
  { code: "PO-2026-80214", status: "DELIVERED", company: "Summit Industrial Traders", orderDate: "2026-04-10", amount: "$9,800.00" },
];

const matchCards: MatchCard[] = [
  {
    location: "Vietnam",
    initials: "PT",
    name: "Precision Tech Manufacturing",
    seeking: "IT Hardware & Accessories",
    description: "Precision Tech is an ISO-certified electronics manufacturer with capacity to fulfill large recurring orders of workstations, peripherals, and monitor systems on short lead times.",
    representative: "Minh Nguyen",
    actionLabel: "Message",
    actionVariant: "message",
    website: "www.precisiontech.vn",
    repTitle: "Head of Sales",
    repEmail: "minh.nguyen@precisiontech.vn",
    revenue: "$18.3M USD",
    employees: "210 Employees",
    categoryNote: "Matches your active sourcing categories",
    destinationNote: "Matches your preferred delivery regions",
  },
  {
    location: "European Union",
    initials: "NF",
    name: "Nordvik Furnishings",
    seeking: "Office Furniture",
    description: "Nordvik designs and manufactures durable, design-forward office furniture and has fulfilled multi-site rollouts for hospitality and corporate clients across Europe.",
    representative: "Freya Larsen",
    actionLabel: "Send Interest",
    actionVariant: "interest",
    website: "www.nordvikfurnishings.eu",
    repTitle: "Key Accounts Manager",
    repEmail: "freya.larsen@nordvikfurnishings.eu",
    revenue: "$27.4M USD",
    employees: "410 Employees",
    categoryNote: "Matches your active sourcing categories",
    destinationNote: "Matches your preferred delivery regions",
  },
  {
    location: "North America",
    initials: "EW",
    name: "Everline Stationery Works",
    seeking: "Stationery",
    description: "Everline supplies FSC certified eco-friendly writing materials, premium notebooks, and recycled paper goods to corporate and administrative buyers.",
    representative: "Daniel Foster",
    actionLabel: "Send Interest",
    actionVariant: "interest",
    website: "www.everlinestationery.com",
    repTitle: "Sourcing Partner Lead",
    repEmail: "daniel.foster@everlinestationery.com",
    revenue: "$6.1M USD",
    employees: "78 Employees",
    categoryNote: "Matches your active sourcing categories",
    destinationNote: "Matches your preferred delivery regions",
  },
  {
    location: "United Kingdom",
    initials: "BR",
    name: "Brightside Roasters & Supply",
    seeking: "Breakroom Supplies",
    description: "Brightside supplies premium organic coffee, snacks, and breakroom essentials in bulk, with distribution coverage across all major UK metro areas.",
    representative: "Olivia Bennett",
    actionLabel: "Send Interest",
    actionVariant: "interest",
    website: "www.brightsideroasters.co.uk",
    repTitle: "Partnerships Director",
    repEmail: "olivia.bennett@brightsideroasters.co.uk",
    revenue: "$9.8M USD",
    employees: "112 Employees",
    categoryNote: "Matches your active sourcing categories",
    destinationNote: "Matches your preferred delivery regions",
  },
];


/* ---------------------------------- Component ---------------------------------- */

const BuyersDashboard: React.FC = () => {

  const [activeNav, setActiveNav] = useRouteNav(BUYER_NAV_PATHS, "dashboard");
  const [loggingOut, setLoggingOut] = useState(false);

  const [selectedProfile, setSelectedProfile] = useState<MatchCard | null>(null);
  const [loadingRfqs, setLoadingRfqs] = useState(false);
  const [rfqsError, setRfqsError] = useState<string | null>(null);

  const [rfqs, setRfqs] = useState<any[]>([]);
  const analytics = useAsyncData(fetchBuyerDashboardAnalytics);
  const [visibleRfqCount, setVisibleRfqCount] = useState(3);
  const RFQ_INITIAL_VISIBLE = 3;


  // STATE FOR QUOTATION COMPARISON
  const [selectedQuotationsRfq, setSelectedQuotationsRfq] = useState<any | null>(null);

  const { auth } = useAuth();
  const [buyerId, setBuyerId] = useState<string | null>(auth?.buyerId ?? null);

  useEffect(() => {
    if (auth?.buyerId) {
      setBuyerId(auth.buyerId);
    }
  }, [auth?.buyerId]);

  useEffect(() => {
    const loadBuyerProfile = async () => {
      if (!buyerId) {
        try {
          const profile = await getBuyerProfile();
          if (profile?.id) {
            setBuyerId(profile.id);
          } else {
            setRfqsError("Buyer profile not found. Please complete onboarding.");
          }
        } catch (err: any) {
          setRfqsError("Failed to load buyer profile details.");
        }
      }
    };
    loadBuyerProfile();
  }, [buyerId]);

  const loadRfqs = async () => {
    if (!buyerId) return;
    setLoadingRfqs(true);
    setRfqsError(null);
    try {
      const data = await fetchBuyerRFQs({
        buyerId,
        index: 0,
        limit: RFQ_INITIAL_VISIBLE,
      });
      if (data.length > 0) {
        setRfqs(data);
        setVisibleRfqCount(Math.min(RFQ_INITIAL_VISIBLE, data.length));
      } else {
        setRfqs([]);
        setVisibleRfqCount(0);
      }
    } catch (err: any) {
      setRfqsError(err.message || "Failed to load sourcing opportunities.");
    } finally {
      setLoadingRfqs(false);
    }
  };

  useEffect(() => {
    loadRfqs();
  }, [buyerId]);

  const refreshRfqs = async () => {
    await loadRfqs();
    await loadAllRfqsPage(1);
  }

  const [rfqPageView, setRfqPageView] = useState<"dashboard" | "allRfqs" | "rfqDetail" | "qsAns" | "quotationComparison">("dashboard");
  const [previousRfqPageView, setPreviousRfqPageView] = useState<"dashboard" | "allRfqs">("dashboard");

  const [allRfqsList, setAllRfqsList] = useState<any[]>([]);
  const [loadingAllRfqs, setLoadingAllRfqs] = useState(false);
  const [allRfqsError, setAllRfqsError] = useState<string | null>(null);
  const [allRfqsLoaded, setAllRfqsLoaded] = useState(false);
  const [allRfqsPage, setAllRfqsPage] = useState(1);
  const [allRfqsHasMore, setAllRfqsHasMore] = useState(true);
  const RFQ_PAGE_SIZE = 10;

  const [fullPageRfq, setFullPageRfq] = useState<any | null>(null);
  const [fullPageRfqId, setFullPageRfqId] = useState<string | null>(null);
  const [loadingFullPageRfq, setLoadingFullPageRfq] = useState(false);
  const [fullPageRfqError, setFullPageRfqError] = useState<string | null>(null);
  const [freezingBid, setFreezingBid] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    const handlePopState = () => {
      if (rfqPageView === "rfqDetail" || rfqPageView === "qsAns" || rfqPageView === "quotationComparison") {
        const targetView = previousRfqPageView || "allRfqs";
        setRfqPageView(targetView);
        setActiveNav(targetView);
        setFullPageRfq(null);
        setFullPageRfqId(null);
        setFullPageRfqError(null);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [rfqPageView, previousRfqPageView]);
  // Known supplier org names from quotation data, used to give the chat a
  // real supplier name instead of an individual invited user's name.
  const chatSupplierNames = useMemo(() => {
    const map: Record<string, string> = {};
    const quotations = Array.isArray(fullPageRfq?.supplierQuotation) ? fullPageRfq.supplierQuotation : [];
    for (const quote of quotations) {
      if (quote?.supplierId && quote?.supplierName) {
        map[quote.supplierId] = quote.supplierName;
      }
    }
    return map;
  }, [fullPageRfq]);

  const handleOpenAllRfqs = async () => {
    setActiveNav("allRfqs");
    setRfqPageView("allRfqs");
    if (allRfqsLoaded || loadingAllRfqs) return;

    await loadAllRfqsPage(1);
  };

  const getRfqPageRange = (page: number) => {
    const index = (page - 1) * RFQ_PAGE_SIZE;
    const limit = RFQ_PAGE_SIZE;
    return { index, limit };
  };

  const loadAllRfqsPage = async (page: number) => {
    // The buyer id may not be known yet (e.g. on a reload of /rfqs); the effect below loads the list once it is.
    if (!buyerId) return;
    if (!buyerId) {
      setAllRfqsList(rfqs.length > 0 ? rfqs : []);
      setAllRfqsHasMore(false);
      setAllRfqsLoaded(true);
      return;
    }

    setLoadingAllRfqs(true);
    setAllRfqsError(null);

    try {
      const { index, limit } = getRfqPageRange(page);
      const data = await fetchBuyerRFQs({ buyerId, index, limit });

      if (data.length === 0 && page > 1) {
        // Nothing on the next page: stay on the current page.
        setAllRfqsHasMore(false);
        return;
      }
      setAllRfqsList(data);
      setAllRfqsList(data.length > 0 ? data : []);
      setAllRfqsPage(page);
      setAllRfqsHasMore(data.length === RFQ_PAGE_SIZE);
    } catch (err: any) {
      setAllRfqsError(err.message || "Failed to load the full RFQ list.");
      setAllRfqsList(rfqs.length > 0 ? rfqs : []);
      setAllRfqsHasMore(false);
    } finally {
      setLoadingAllRfqs(false);
      setAllRfqsLoaded(true);
    }
  };

  // Load the RFQ list as soon as the buyer id is available, or show why it can't be loaded.
  useEffect(() => {
    if (rfqPageView !== "allRfqs" || allRfqsLoaded || loadingAllRfqs) return;
    if (buyerId) {
      loadAllRfqsPage(1);
    } else if (rfqsError) {
      setAllRfqsError(rfqsError);
      setAllRfqsLoaded(true);
    }
  }, [buyerId, rfqPageView, rfqsError]);

  const handleAllRfqsNextPage = () => {
    if (loadingAllRfqs || !allRfqsHasMore) return;
    loadAllRfqsPage(allRfqsPage + 1);
  };

  const handleAllRfqsPrevPage = () => {
    if (loadingAllRfqs || allRfqsPage <= 1) return;
    loadAllRfqsPage(allRfqsPage - 1);
  };

  const handleBackToDashboard = () => {
    setRfqPageView("dashboard");
    setActiveNav("dashboard");
  };

  const currentUserId = useBuyerAuthStore((state) => state.personDetail?.userId || null);
  const buyerProfile = useBuyerAuthStore((state) => state.personDetail);
  const isLoadingBuyerProfile = useBuyerAuthStore((state) => state.personDetailLoading);

  const [materialRecords, setMaterialRecords] = useState<PendingMaterialApproval[]>([]);
  const [loadingMaterial, setLoadingMaterial] = useState(false);
  const [materialError, setMaterialError] = useState<string | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<PendingMaterialApproval | null>(null);

  const [materialStatusFilter, setMaterialStatusFilter] = useState("");
  // materialSearchTerm is the debounced value that drives the API call.
  const [materialSearchInput, setMaterialSearchInput] = useState("");
  const [materialSearchTerm, setMaterialSearchTerm] = useState("");

  const [materialKpi, setMaterialKpi] = useState<MaterialApprovalKpi | null>(null);
  const [loadingMaterialKpi, setLoadingMaterialKpi] = useState(false);

  useEffect(() => {
    const handle = setTimeout(() => setMaterialSearchTerm(materialSearchInput), 400);
    return () => clearTimeout(handle);
  }, [materialSearchInput]);

  const loadMaterialApprovals = () => {
    setLoadingMaterial(true);
    setMaterialError(null);
    fetchPendingMaterialApprovals({ status: materialStatusFilter, searchTerm: materialSearchTerm })
      .then(setMaterialRecords)
      .catch((err: any) => {
        setMaterialError(err.message || "Failed to load material approvals.");
        setMaterialRecords([]);
      })
      .finally(() => setLoadingMaterial(false));
  };

  // Loaded independently so search/status changes don't refetch KPI.
  const loadMaterialKpi = () => {
    setLoadingMaterialKpi(true);
    fetchMaterialApprovalKpi()
      .then(setMaterialKpi)
      .catch((err: any) => toastService.error(err.message || "Failed to load approval summary counts."))
      .finally(() => setLoadingMaterialKpi(false));
  };

  useEffect(() => {
    if (activeNav !== "material") return;
    setSelectedMaterial(null);
    loadMaterialKpi();
  }, [activeNav]);

  useEffect(() => {
    if (activeNav !== "material") return;
    loadMaterialApprovals();
  }, [activeNav, materialStatusFilter, materialSearchTerm]);

  const handleMaterialApprovalSubmitted = () => {
    setSelectedMaterial(null);
    loadMaterialApprovals();
    loadMaterialKpi();
  };

  const [contractRecords, setContractRecords] = useState<ContractRecord[]>([]);
  const [loadingContract, setLoadingContract] = useState(false);
  const [contractError, setContractError] = useState<string | null>(null);

  useEffect(() => {
    if (activeNav !== "contract") return;
    setLoadingContract(true);
    setContractError(null);
    fetchContracts()
      .then(setContractRecords)
      .catch((err: any) => {
        setContractError(err.message || "Failed to load contract approvals.");
        setContractRecords([]);
      })
      .finally(() => setLoadingContract(false));
  }, [activeNav]);

  // The RFQ list has its own URL (/rfqs). When the URL changes by itself (Back/Forward,
  // reload, a shared link), bring the RFQ view in line with it.
  useEffect(() => {
    if (activeNav === "allRfqs" && rfqPageView === "dashboard") {
      handleOpenAllRfqs();
    } else if (activeNav !== "allRfqs" && rfqPageView === "allRfqs") {
      setRfqPageView("dashboard");
    }
  }, [activeNav]);

  const handleNavClick = (key: string) => {
    if (key === "activeRFQs" || key === "allRfqs") {
      handleOpenAllRfqs();
      return;
    }
    if (key === "rfqDetail") {
      setRfqPageView("rfqDetail");
      setActiveNav("rfqDetail");
      return;
    }
    setActiveNav(key);
    setRfqPageView("dashboard");
  };

  const handleViewRfqDetailsFullPage = async (rfqId: string) => {
    if (rfqPageView === "dashboard" || rfqPageView === "allRfqs") {
      setPreviousRfqPageView(rfqPageView);
    }
    window.history.pushState({ rfqPageView: "rfqDetail" }, "");
    setRfqPageView("rfqDetail");
    setActiveNav("rfqDetail");
    setFullPageRfqId(rfqId);
    setLoadingFullPageRfq(true);
    setFullPageRfqError(null);
    try {
      const details = await fetchBuyerRFQById(rfqId);
      setFullPageRfq({ ...details, rfqId });
    } catch (err: any) {
      setFullPageRfqError(err.message || "Failed to fetch details.");
      const found =
        allRfqsList.find((r) => r.rfqId === rfqId) ||
        rfqs.find((r) => r.rfqId === rfqId) ||
        null;
      setFullPageRfq(found);
    } finally {
      setLoadingFullPageRfq(false);
    }
  };

  // const handleDocumentAction = async (doc: any, action: 'preview' | 'download') => {
  //   const assetId = doc.id || doc.assetId;
  //   if (!assetId) {
  //     alert("Document asset ID is missing.");
  //     return;
  //   }

  //   try {
  //     const data = await fetchBuyerAsset(assetId);
  //     if ('statusCode' in data && data.statusCode) {
  //       throw new Error(data.message || 'Failed to fetch document.');
  //     }

  //     const fileBytes = (data as any).fileBytes;
  //     const fileName = (data as any).fileName || doc.fileName || doc.assetName || "document";
  //     const rawType = ((data as any).contentType || (data as any).fileType || doc.fileType || "pdf").toLowerCase();

  //     let mimeType = "application/pdf";
  //     if (rawType.includes("pdf")) mimeType = "application/pdf";
  //     else if (rawType.includes("png")) mimeType = "image/png";
  //     else if (rawType.includes("jpg") || rawType.includes("jpeg")) mimeType = "image/jpeg";
  //     else if (rawType.includes("txt")) mimeType = "text/plain";
  //     else if (rawType.includes("doc")) mimeType = "application/msword";

  //     let url = (data as any).url || (data as any).fileUrl;
  //     let createdBlobUrl = "";

  //     if (fileBytes) {
  //       const cleanBase64 = fileBytes.replace(/^data:.*?;base64,/, '');
  //       const byteCharacters = atob(cleanBase64);
  //       const byteNumbers = new Array(byteCharacters.length);
  //       for (let i = 0; i < byteCharacters.length; i++) {
  //         byteNumbers[i] = byteCharacters.charCodeAt(i);
  //       }
  //       const byteArray = new Uint8Array(byteNumbers);
  //       const blob = new Blob([byteArray], { type: mimeType });
  //       createdBlobUrl = URL.createObjectURL(blob);
  //       url = createdBlobUrl;
  //     }

  //     if (!url) {
  //       throw new Error("Document content not available.");
  //     }

  //     if (action === 'preview') {
  //       window.open(url, '_blank');
  //     } else {
  //       const a = document.createElement('a');
  //       a.href = url;
  //       a.download = fileName;
  //       document.body.appendChild(a);
  //       a.click();
  //       document.body.removeChild(a);
  //     }
  //   } catch (err: any) {
  //     alert(err?.message || "Could not access document.");
  //   }
  // };

  const handleBackToAllRfqs = async () => {
    const targetView = previousRfqPageView || "allRfqs";
    setRfqPageView(targetView);
    setActiveNav(targetView);
    setFullPageRfq(null);
    setFullPageRfqId(null);
    setFullPageRfqError(null);

    if (targetView === "allRfqs" && !allRfqsLoaded && !loadingAllRfqs) {
      await loadAllRfqsPage(1);
    }
  };

  const handleFreezeBid = async () => {
    if (!fullPageRfqId || freezingBid || fullPageRfq?.status === "Freezing") return;
    setFreezingBid(true);
    try {
      await updateRfqStatus({ rfqId: fullPageRfqId, status: "Freezing" });
      const updated = await fetchBuyerRFQById(fullPageRfqId);
      setFullPageRfq({ ...updated, rfqId: fullPageRfqId });
      toastService.success("Bid frozen. Suppliers can no longer submit quotations for this RFQ.");
    } catch (err: any) {
      toastService.error(err?.message || "Failed to freeze the bid.");
    } finally {
      setFreezingBid(false);
    }
  };

  // HANDLER FOR QUOTATION COMPARISON
  // const handleOpenQuotationComparison = (rfq: any) => {
  //   setSelectedQuotationsRfq(rfq);
  //   setRfqPageView("quotationComparison");
  // };

  const handleBackFromQuotationComparison = () => {
    setRfqPageView("rfqDetail");
    setSelectedQuotationsRfq(null);
  };

  const handleOpenQsAns = () => {
    setRfqPageView("qsAns");
  };

  const handleBackToRfqDetail = () => {
    setRfqPageView("rfqDetail");
  };

  // const renderQuoteStatusBadges = (quote: any) => (
  //   <>
  //     {quote.isLead && (
  //       <span
  //         className="pud-status-badge"
  //         style={{
  //           background: '#fef3c7',
  //           color: '#b45309',
  //           border: '1px solid #fde68a',
  //           padding: '3px 8px',
  //           borderRadius: '6px',
  //           fontSize: '11px',
  //           fontWeight: 600
  //         }}
  //       >
  //         Leading
  //       </span>
  //     )}
  //     <span
  //       className="pud-status-badge"
  //       style={{
  //         background: quote.status === 'SUBMITTED' ? '#dcfce7' : '#f1f5f9',
  //         color: quote.status === 'SUBMITTED' ? '#15803d' : '#475569',
  //         padding: '3px 8px',
  //         borderRadius: '6px',
  //         fontSize: '11px',
  //         fontWeight: 600
  //       }}
  //     >
  //       {quote.status || "RECEIVED"}
  //     </span>
  //   </>
  // );

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logoutBuyer();
    } catch {
      // The session is cleared locally below even when the server call fails.
    } finally {
      sessionStorage.clear();
      window.dispatchEvent(new CustomEvent("session:expired"));
      setLoggingOut(false);
    }
  };

  const headerNavItems = React.useMemo(() => {
    const items = [...navItems.filter((item) => item.key !== "activeRFQs")];

    if (rfqPageView === "rfqDetail") {
      const createIndex = items.findIndex((i) => i.key === "createRFQ");
      const rfqLabel = fullPageRfq?.rfqNumber ? `View RFQ (${fullPageRfq.rfqNumber})` : "View RFQ";
      const detailItem = { key: "rfqDetail", icon: <NavIconFile />, label: rfqLabel };
      if (createIndex !== -1) {
        items.splice(createIndex + 1, 0, detailItem);
      } else {
        items.unshift(detailItem);
      }
    }

    return items;
  }, [rfqPageView, fullPageRfq]);

  return (
    <Header navItems={headerNavItems} activeNav={activeNav} onNavClick={handleNavClick} onLogout={handleLogout}>
        <div className="pud-main">
          <div className="pud-content">
            {activeNav === "createRFQ" ? (
              <CreateRFQ onNavClick={handleNavClick} onRfqCreated={refreshRfqs} />
            ) : activeNav === "product" ? (
              <Product />
            ) : activeNav === "models" ? (
              <Models />
            ) : activeNav === "template" ? (
              <UserTemplate />
            ) : activeNav === "materialService" ? (
              <ItemMasterCatalog buyerId={buyerId || ""} />
            ) : activeNav === "material" ? (
              selectedMaterial ? (
                <MaterialApprovalDetail
                  material={selectedMaterial}
                  currentUserId={currentUserId}
                  onBack={() => setSelectedMaterial(null)}
                  onApprovalSubmitted={handleMaterialApprovalSubmitted}
                />
              ) : (
                <MaterialTable
                  records={materialRecords}
                  loading={loadingMaterial}
                  error={materialError}
                  onRowClick={setSelectedMaterial}
                  kpi={materialKpi}
                  loadingKpi={loadingMaterialKpi}
                  statusFilter={materialStatusFilter}
                  onStatusFilterChange={setMaterialStatusFilter}
                  searchInput={materialSearchInput}
                  onSearchInputChange={setMaterialSearchInput}
                  onSearchSubmit={() => setMaterialSearchTerm(materialSearchInput)}
                />
              )
            ) : activeNav === "contract" ? (
              <ContractTable
                records={contractRecords}
                loading={loadingContract}
                error={contractError}
              />
            ) : activeNav === "approvalManagement" ? (
              <ApprovalManagement canCreate={false}/>
            ) : rfqPageView === "allRfqs" ? (
              <section className="pud-allrfqs-card" aria-labelledby="pud-allrfqs-title">
                <div className="pud-allrfqs-header">
                  <button
                    type="button"
                    className="sila-btn sila-btn--ghost sila-btn--icon sila-btn--sm"
                    onClick={handleBackToDashboard}
                    title="Back to Dashboard"
                    aria-label="Back to Dashboard"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div>
                    <h1 className="pud-title" id="pud-allrfqs-title">All RFQs</h1>
                    <p className="pud-subtitle">
                      Complete list of RFQs you've posted, awaiting supplier quotations.
                    </p>
                  </div>
                </div>

                {loadingAllRfqs || !allRfqsLoaded ? (
                  <div className="pud-allrfqs-state">
                    <Loader size={24} message="Loading all sourcing opportunities..." />
                  </div>
                ) : allRfqsError && allRfqsList.length === 0 ? (
                  <EmptyState variant="error" title="Unable to load RFQs" description={allRfqsError} />
                ) : allRfqsList.length === 0 ? (
                  <EmptyState title="No RFQs found." icon={<IconFile />} />
                ) : (
                  <div>
                    <div className="pud-rfq-table-container">
                      <table className="pud-rfq-items-table pud-allrfqs-table">
                        <thead>
                          <tr>
                            <th className="pud-allrfqs-sno sila-num">S.No</th>
                            <th>RFQ Number</th>
                            <th>Title</th>
                            <th>Organization</th>
                            <th>Delivery Location</th>
                            <th>Closing Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allRfqsList.map((rfq: any, idx: number) => (
                            <tr
                              key={rfq.rfqId || idx}
                              onClick={() => handleViewRfqDetailsFullPage(rfq.rfqId)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  handleViewRfqDetailsFullPage(rfq.rfqId);
                                }
                              }}
                              tabIndex={0}
                              aria-label={`Open RFQ ${rfq.rfqNumber ?? ""}`}
                            >
                              <td className="sila-num sila-cell-muted">{(allRfqsPage - 1) * RFQ_PAGE_SIZE + idx + 1}</td>
                              <td><span className="sila-ref">{rfq.rfqNumber}</span></td>
                              <td className="sila-cell-strong">{rfq.title}</td>
                              <td>{rfq.organizationName}</td>
                              <td>{rfq.deliveryLocation}</td>
                              <td className="sila-cell-muted">
                                {rfq.endDate
                                  ? new Date(rfq.endDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                                  : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <nav className="budp-pagination budp-allrfqs-pagination" aria-label="RFQ list pagination">
                      <span>
                        Showing {(allRfqsPage - 1) * RFQ_PAGE_SIZE + 1}–{(allRfqsPage - 1) * RFQ_PAGE_SIZE + allRfqsList.length}
                      </span>
                      <div className="budp-pagination-pages">
                        <button
                          type="button"
                          className={`budp-page-btn${allRfqsPage === 1 || loadingAllRfqs ? " budp-page-btn-disabled" : ""}`}
                          onClick={handleAllRfqsPrevPage}
                          disabled={allRfqsPage <= 1 || loadingAllRfqs}
                          aria-label="Previous RFQ page"
                        >
                          <IconChevronLeft />
                        </button>

                        <span className="budp-page-number" aria-current="page">Page {allRfqsPage}</span>

                        <button
                          type="button"
                          className={`budp-page-btn${!allRfqsHasMore || loadingAllRfqs ? " budp-page-btn-disabled" : ""}`}
                          onClick={handleAllRfqsNextPage}
                          disabled={!allRfqsHasMore || loadingAllRfqs}
                          aria-label="Next RFQ page"
                        >
                          <IconChevronRight />
                        </button>
                      </div>
                    </nav>
                  </div>
                )}
              </section>
            ) : rfqPageView === "rfqDetail" ? (
              // <>
              //   <div className="pud-modal pud-rfq-fullpage">
              //     <div className="pud-modal-header">
              //       <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              //         <span className="pud-modal-badge">
              //           <IconFile /> RFQ Specification
              //         </span>
              //         {fullPageRfq && (
              //           <button
              //             type="button"
              //             className="pud-modal-badge"
              //             style={{ border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.18)', color: '#ffffff' }}
              //             onClick={handleOpenQsAns}
              //           >
              //             <IconFile /> RFQ Question Answers
              //           </button>
              //         )}
              //       </div>
              //       <button className="pud-modal-close" onClick={handleBackToAllRfqs}>
              //         <IconClose />
              //       </button>
              //       <h2 className="pud-modal-name">
              //         {loadingFullPageRfq ? "Loading RFQ Details..." : fullPageRfq?.title || "RFQ Details"}
              //       </h2>
              //       {fullPageRfq && (
              //         <div className="pud-modal-meta">
              //           <span><IconCalendar /> Closes: {new Date(fullPageRfq.endDate).toLocaleDateString()}</span>
              //           <span><IconPin /> Delivery: {fullPageRfq.deliveryLocation}</span>
              //           <div className="pud-rfq-header-actions">
              //             {Array.isArray(fullPageRfq.supplierIds) && fullPageRfq.supplierIds.length > 0 && (
              //               <button
              //                 type="button"
              //                 className="pud-btn pud-btn-outline"
              //                 onClick={() => setIsChatOpen(true)}
              //                 title="Chat with invited suppliers"
              //               >
              //                 <IconMessageSquare /> Chat
              //               </button>
              //             )}
              //             <button
              //               className="pud-btn pud-btn-outline"
              //               onClick={() => handleOpenQuotationComparison(fullPageRfq)}
              //               title="View Supplier Quotations"
              //             >
              //               <IconBidCompare /> Bid Comparison
              //             </button>
              //             <button
              //               type="button"
              //               className="pud-btn pud-btn-freeze"
              //               onClick={handleFreezeBid}
              //               disabled={freezingBid || fullPageRfq.status === "Freezing"}
              //               title={fullPageRfq.status === "Freezing" ? "This RFQ's bid has already been frozen" : "Freeze the bid to stop accepting new quotations"}
              //             >
              //               <IconFreezeLock />
              //               {freezingBid ? "Freezing..." : fullPageRfq.status === "Freezing" ? "Bid Frozen" : "Freeze Bid"}
              //             </button>
              //           </div>
              //         </div>
              //       )}
              //     </div>

              //     <div className="pud-modal-body">
              //       {loadingFullPageRfq ? (
              //         <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
              //           <div style={{ color: '#64748b', fontSize: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              //             <div className="pud-spinner" style={{ width: '32px', height: '32px' }} />
              //             <span>Fetching RFQ specification details...</span>
              //           </div>
              //         </div>
              //       ) : fullPageRfqError && !fullPageRfq ? (
              //         <div style={{ padding: '24px', textAlign: 'center', color: '#ef4444' }}>
              //           {fullPageRfqError}
              //         </div>
              //       ) : fullPageRfq ? (
              //         <div className="pud-rfq-detail-grid pud-rfq-detail-grid-single">
              //           <div className="active-rfq-content-wrapper">
              //             <div>
              //               <div className="pud-modal-section-title">Description</div>
              //               <p className="pud-modal-desc" style={{ whiteSpace: 'pre-wrap', fontSize: '13.5px', color: '#334155', lineHeight: '1.6' }}>
              //                 {fullPageRfq.description || "No description provided."}
              //               </p>

              //               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', background: '#f8fafc', padding: '14px 18px', borderRadius: '10px', border: '1px solid #e2e8f0', marginTop: '12px' }}>
              //                 <div>
              //                   <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>Start Date</div>
              //                   <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 600, marginTop: '2px' }}>
              //                     {new Date(fullPageRfq.startDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
              //                   </div>
              //                 </div>
              //                 <div>
              //                   <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>End Date</div>
              //                   <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 600, marginTop: '2px' }}>
              //                     {new Date(fullPageRfq.endDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
              //                   </div>
              //                 </div>
              //                 <div>
              //                   <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>Add Lot Option</div>
              //                   <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 600, marginTop: '2px' }}>
              //                     {fullPageRfq.addLotOption ? "Allowed" : "Not Allowed"}
              //                   </div>
              //                 </div>
              //               </div>
              //             </div>

              //             <QuotationSummaryTable rfq={fullPageRfq} />

              //             {((fullPageRfq.technicalSpecificationDocuments && fullPageRfq.technicalSpecificationDocuments.length > 0) ||
              //               (fullPageRfq.termsConditionDocuments && fullPageRfq.termsConditionDocuments.length > 0)) && (
              //                 <div>
              //                   <div className="pud-modal-section-title" style={{ marginBottom: '10px' }}>Specifications & Terms Documents</div>
              //                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
              //                     {fullPageRfq.technicalSpecificationDocuments?.map((doc: any, i: number) => (
              //                       <div key={`tech-${i}`} className="pud-rfq-doc-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px' }}>
              //                         <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden', flex: 1 }}>
              //                           <div className="pud-rfq-doc-icon"><IconFile /></div>
              //                           <div style={{ overflow: 'hidden' }}>
              //                             <div className="pud-rfq-doc-name" title={doc.fileName}>{doc.fileName}</div>
              //                             <div className="pud-rfq-doc-type">Tech Spec Doc</div>
              //                           </div>
              //                         </div>
              //                         <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '8px' }}>
              //                           <button
              //                             type="button"
              //                             title="Preview document"
              //                             onClick={() => handleDocumentAction(doc, 'preview')}
              //                             style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', padding: '4px', display: 'inline-flex', borderRadius: '4px' }}
              //                           >
              //                             <IconEye />
              //                           </button>
              //                           <button
              //                             type="button"
              //                             title="Download document"
              //                             onClick={() => handleDocumentAction(doc, 'download')}
              //                             style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: '4px', display: 'inline-flex', borderRadius: '4px' }}
              //                           >
              //                             <IconDownload />
              //                           </button>
              //                         </div>
              //                       </div>
              //                     ))}
              //                     {fullPageRfq.termsConditionDocuments?.map((doc: any, i: number) => (
              //                       <div key={`terms-${i}`} className="pud-rfq-doc-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px' }}>
              //                         <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden', flex: 1 }}>
              //                           <div className="pud-rfq-doc-icon" style={{ background: '#fef3c7', color: '#d97706' }}><IconFile /></div>
              //                           <div style={{ overflow: 'hidden' }}>
              //                             <div className="pud-rfq-doc-name" title={doc.fileName}>{doc.fileName}</div>
              //                             <div className="pud-rfq-doc-type">Terms & Conditions</div>
              //                           </div>
              //                         </div>
              //                         <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '8px' }}>
              //                           <button
              //                             type="button"
              //                             title="Preview document"
              //                             onClick={() => handleDocumentAction(doc, 'preview')}
              //                             style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', padding: '4px', display: 'inline-flex', borderRadius: '4px' }}
              //                           >
              //                             <IconEye />
              //                           </button>
              //                           <button
              //                             type="button"
              //                             title="Download document"
              //                             onClick={() => handleDocumentAction(doc, 'download')}
              //                             style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: '4px', display: 'inline-flex', borderRadius: '4px' }}
              //                           >
              //                             <IconDownload />
              //                           </button>
              //                         </div>
              //                       </div>
              //                     ))}
              //                   </div>
              //                 </div>
              //               )}

              //             {/* {fullPageRfq.addLotOption && (
              //             <div>
              //               <div className="pud-modal-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              //                 <IconSparkles /> Supplier Quotations Received
              //               </div>
              //               {fullPageRfq.supplierQuotation &&
              //                 fullPageRfq.supplierQuotation.filter((q: any) => q.quotationId || q.totalPrice !== null).length > 0 ? (
              //                 <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '480px', overflowY: 'auto' }}>
              //                   {fullPageRfq.supplierQuotation
              //                     .filter((q: any) => q.quotationId || q.totalPrice !== null)
              //                     .map((quote: any, index: number) => (
              //                       <div
              //                         key={index}
              //                         style={{
              //                           background: '#ffffff',
              //                           border: '1px solid #cbd5e1',
              //                           borderRadius: '10px',
              //                           padding: '16px',
              //                           boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
              //                           transition: 'border-color 0.2s ease'
              //                         }}
              //                       >
              //                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              //                           <div style={{ display: 'flex', flexDirection: 'column' }}>
              //                             <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
              //                               Quote ID: {quote.quotationId ? `${quote.quotationId.substring(0, 8)}...` : `Quote #${index + 1}`}
              //                             </span>
              //                             <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              //                               Delivery: {quote.deliveryType || "Standard"}
              //                             </span>
              //                           </div>
              //                           <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              //                             {renderQuoteStatusBadges(quote)}
              //                           </div>
              //                         </div>

              //                         <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #f1f5f9', marginBottom: '12px', fontSize: '12px' }}>
              //                           <div>
              //                             <span style={{ color: '#64748b' }}>Delivery Charge:</span>
              //                             <div style={{ fontWeight: 600, color: '#334155', marginTop: '2px' }}>${quote.deliveryCharge ?? 0}</div>
              //                           </div>
              //                           <div>
              //                             <span style={{ color: '#64748b' }}>Tax:</span>
              //                             <div style={{ fontWeight: 600, color: '#334155', marginTop: '2px' }}>${quote.tax ?? 0}</div>
              //                           </div>
              //                           <div>
              //                             <span style={{ color: '#64748b' }}>Discount:</span>
              //                             <div style={{ fontWeight: 600, color: '#dc2626', marginTop: '2px' }}>-${quote.discount ?? 0}</div>
              //                           </div>
              //                           <div>
              //                             <span style={{ color: '#64748b' }}>Total Quote:</span>
              //                             <div style={{ fontWeight: 700, color: '#16a34a', marginTop: '2px', fontSize: '13px' }}>${quote.totalPrice ?? 0}</div>
              //                           </div>
              //                         </div>
              //                       </div>
              //                     ))}
              //                 </div>
              //               ) : (
              //                 <div className="pud-rfq-no-quote-box" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' }}>
              //                   <IconMail />
              //                   <div style={{ fontWeight: 600, color: '#475569', marginTop: '12px' }}>No Quotations Received Yet</div>
              //                   <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', lineHeight: '1.5', maxWidth: '240px' }}>
              //                     When suppliers submit commercial bids, they will populate here in real-time.
              //                   </div>
              //                 </div>
              //               )}
              //             </div>
              //             )} */}

              //           </div>
              //         </div>
              //       ) : null}
              //     </div>

              //     {fullPageRfq && (
              //       <div className="pud-modal-footer">
              //         <button
              //           className="pud-btn pud-btn-outline"
              //           onClick={handleBackToAllRfqs}
              //           style={{ marginRight: '10px' }}
              //         >
              //           Close
              //         </button>
              //         <button className="pud-btn pud-btn-message" style={{ background: '#2563eb', color: '#ffffff' }}>
              //           Evaluate Quotations
              //         </button>
              //       </div>
              //     )}
              //   </div>
              // </>
              <BidComparisonAwardView
                rfq={fullPageRfq}
                loading={loadingFullPageRfq}
                error={fullPageRfqError}
                freezingBid={freezingBid}
                onFreeze={handleFreezeBid}
                onBack={handleBackToAllRfqs}
                onQsAns={handleOpenQsAns}
                onChatClick={() => setIsChatOpen(true)}
              />
            ) : rfqPageView === "quotationComparison" ? (
              <>
                <div className="pud-modal pud-rfq-fullpage">
                  <div className="pud-modal-header">
                    <span className="pud-modal-badge">
                      <IconSparkles /> Bid Comparison
                    </span>
                    <button
                      type="button"
                      className="pud-modal-close"
                      onClick={handleBackFromQuotationComparison}
                      aria-label="Close bid comparison"
                    >
                      <IconClose />
                    </button>
                    <h2 className="pud-modal-name">
                      {selectedQuotationsRfq?.title || "RFQ Quotations"}
                    </h2>
                    {selectedQuotationsRfq && (
                      <div className="pud-modal-meta">
                        <span><IconFile /> <span className="sila-ref">{selectedQuotationsRfq.rfqNumber}</span></span>
                        <span><IconPin /> {selectedQuotationsRfq.deliveryLocation}</span>
                      </div>
                    )}
                  </div>

                  <div className="pud-modal-body pud-comparison-body">
                    <QuotationComparisonCard
                      rfqId={selectedQuotationsRfq?.rfqId}
                      rfqTitle={selectedQuotationsRfq?.title}
                    />
                  </div>
                </div>
              </>
            ) : rfqPageView === "qsAns" ? (
              <QsAns
                rfq={fullPageRfq}
                loading={loadingFullPageRfq}
                error={fullPageRfqError && !fullPageRfq ? fullPageRfqError : null}
                onBack={handleBackToRfqDetail}
              />
            ) : activeNav === "companyProfile" ? (
              <CompanyProfile
                mode="network-admin"
                entityLabel="Buyer"
                fetchProfile={getBuyerProfile}
              />
            ) : (
              <>
                <div className="pud-dashboard-header sila-page-header">
                  <div>
                    <h1 className="pud-title">Buyer Operations Command</h1>
                    <p className="pud-subtitle">Real-time procurement tracking, bid submittals, and transaction monitoring.</p>
                  </div>
                  <div className="pud-dashboard-actions">
                    <button
                      type="button"
                      className="pud-btn-create-rfq"
                      onClick={() => handleNavClick("createRFQ")}
                    >
                      <NavIconFilePlus />
                      <span>Create RFQ</span>
                    </button>
                  </div>
                </div>

                <BuyerAnalytics
                  state={analytics}
                  onViewRfqs={() => handleNavClick("activeRFQs")}
                  onOpenRfq={handleViewRfqDetailsFullPage}
                />

                <div className="pud-panels">
                  <section className="pud-panel">
                    <div className="pud-panel-header">
                      <div>
                        <h2 className="pud-panel-title">Recent RFQs</h2>
                        <div className="pud-panel-subtitle">RFQs you've posted, awaiting supplier quotations</div>
                      </div>
                      {!loadingRfqs && !rfqsError && rfqs.length > 0 && (
                        <a
                          className="pud-panel-link"
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            handleOpenAllRfqs();
                          }}
                        >
                          View All RFQs →
                        </a>
                      )}
                    </div>
                    {loadingRfqs ? (
                      <div className="pud-panel-list pud-panel-state">
                        <Loader size={24} message="Loading sourcing opportunities..." />
                      </div>
                    ) : rfqsError ? (
                      <div className="pud-panel-list pud-panel-state">
                        <EmptyState variant="error" title="Unable to load RFQs" description={rfqsError} />
                      </div>
                    ) : rfqs.length === 0 ? (
                      <div className="pud-panel-list pud-panel-state">
                        <EmptyState title="No RFQs found." icon={<IconFile />} />
                      </div>
                    ) : (
                      <div className="pud-panel-list">
                        {rfqs.slice(0, visibleRfqCount).map((rfq) => (
                          <div
                            className="pud-rfq-card-item"
                            key={rfq.rfqId}
                            onClick={() => handleViewRfqDetailsFullPage(rfq.rfqId)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleViewRfqDetailsFullPage(rfq.rfqId);
                              }
                            }}
                            role="button"
                            tabIndex={0}
                          >
                            <div className="pud-rfq-meta">
                              <span className="pud-code-badge sila-ref">{rfq.rfqNumber}</span>
                              <span className="pud-dot-sep" aria-hidden="true">•</span>
                              <span className="pud-company">{rfq.organizationName}</span>
                            </div>

                            <div className="pud-rfq-title pud-rfq-link-title">{rfq.title}</div>

                            <div className="pud-rfq-details">
                              <span>
                                <IconCalendar /> Closes: {rfq.endDate ? new Date(rfq.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Open'}
                              </span>
                              <span>
                                <IconPin /> Deliv: {rfq.deliveryLocation}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="pud-panel">
                    <div className="pud-panel-header">
                      <div>
                        <h2 className="pud-panel-title">Recent Purchase Orders</h2>
                        <div className="pud-panel-subtitle">New orders requiring attention</div>
                      </div>
                      <a className="pud-panel-link" href="#" onClick={(e) => e.preventDefault()}>View All →</a>
                    </div>
                    <div className="pud-panel-list">
                      {poItems.map((po) => (
                        <div className="pud-po-row" key={po.code}>
                          <div className="pud-po-info">
                            <div className="pud-po-meta">
                              <span className="pud-po-code sila-ref">{po.code}</span>
                              <StatusBadge status={po.status} size="sm" />
                            </div>
                            <div className="pud-po-company">{po.company}</div>
                            <div className="pud-po-date"><IconCalendar /> Order Date: {po.orderDate}</div>
                          </div>
                          <div className="pud-po-right">
                            <div className="pud-po-amount">{po.amount}</div>
                            <a className="pud-po-process" href="#" onClick={(e) => e.preventDefault()}>Process →</a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                </div>

                <section className="pud-matchmaker" aria-labelledby="pud-matchmaker-title">
                  <div className="pud-matchmaker-header">
                    <div className="pud-matchmaker-title-row">
                      <span className="pud-matchmaker-icon" aria-hidden="true"><IconSparkles /></span>
                      <h2 className="pud-matchmaker-title" id="pud-matchmaker-title">Smart Supplier Matchmaker</h2>
                    </div>
                    <div className="pud-matchmaker-subtitle">
                      Verified suppliers ready to fulfill products and services matching your sourcing categories and delivery regions.
                    </div>
                  </div>

                  <div className="pud-match-grid">
                    {matchCards.map((card) => (
                      <article className="pud-match-card" key={card.name}>
                        <span className="pud-match-location"><IconPin /> {card.location}</span>
                        <div className="pud-match-top">
                          <div className="pud-match-avatar" aria-hidden="true">{card.initials}</div>
                          <div>
                            <h3 className="pud-match-name">{card.name}</h3>
                            <div className="pud-match-seeking"><NavIconBuilding /> Supplies: {card.seeking}</div>
                          </div>
                        </div>
                        <p className="pud-match-desc">{card.description}</p>
                        <div className="pud-match-rep-row">
                          <span className="pud-match-rep-label">Representative:</span>
                          <span className="pud-match-rep-name">{card.representative}</span>
                        </div>
                        <div className="pud-match-actions">
                          <button
                            type="button"
                            className="pud-btn pud-btn-outline pud-btn-flex"
                            onClick={() => setSelectedProfile(card)}
                          >
                            <IconEye /> Profile
                          </button>
                          {card.actionVariant === "message" ? (
                            <button type="button" className="pud-btn pud-btn-message pud-btn-flex">
                              <IconMessageSquare /> Message
                            </button>
                          ) : (
                            <button type="button" className="pud-btn pud-btn-interest pud-btn-flex">
                              <IconSend /> Send Interest
                            </button>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>

                  <nav className="pud-pagination" aria-label="Supplier matches pagination">
                    <button type="button" className="pud-page-btn pud-page-btn-disabled" disabled aria-label="Previous suppliers">
                      <IconChevronLeft />
                    </button>
                    <button type="button" className="pud-page-btn" aria-label="Next suppliers">
                      <IconChevronRight />
                    </button>
                  </nav>
                </section>
              </>
            )}
          </div>
        </div>

        {selectedProfile && (
          <div className="pud-modal-overlay" onClick={() => setSelectedProfile(null)}>
            <div
              className="pud-modal pud-profile-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="pud-profile-modal-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="pud-modal-header">
                <span className="pud-modal-badge">
                  <IconShieldCheck /> Verified Supplier Partner
                </span>
                <button
                  type="button"
                  className="pud-modal-close"
                  onClick={() => setSelectedProfile(null)}
                  aria-label="Close supplier profile"
                >
                  <IconClose />
                </button>
                <h2 className="pud-modal-name" id="pud-profile-modal-title">{selectedProfile.name}</h2>
                <div className="pud-modal-meta">
                  <span><IconPin /> {selectedProfile.location}</span>
                  <span><IconGlobe /> {selectedProfile.website}</span>
                </div>
              </div>

              <div className="pud-modal-body">
                <div className="pud-modal-section-title">Organization Description</div>
                <p className="pud-modal-desc">{selectedProfile.description}</p>

                <div className="pud-modal-analytics">
                  <div className="pud-modal-analytics-title">
                    <IconSparkles /> Verified Match Analytics
                  </div>
                  <div className="pud-modal-analytics-grid">
                    <div className="pud-modal-analytics-item">
                      <span className="pud-modal-check"><IconCheckCircle /></span>
                      <div>
                        <div className="pud-modal-analytics-label">Supply Category</div>
                        <div className="pud-modal-analytics-value">{selectedProfile.seeking}</div>
                        <div className="pud-modal-analytics-note">{selectedProfile.categoryNote}</div>
                      </div>
                    </div>
                    <div className="pud-modal-analytics-item">
                      <span className="pud-modal-check"><IconCheckCircle /></span>
                      <div>
                        <div className="pud-modal-analytics-label">Service Region</div>
                        <div className="pud-modal-analytics-value">{selectedProfile.location}</div>
                        <div className="pud-modal-analytics-note">{selectedProfile.destinationNote}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pud-modal-info-grid">
                  <div>
                    <div className="pud-modal-info-label">Company Representative</div>
                    <div className="pud-modal-info-value">
                      {selectedProfile.representative} ({selectedProfile.repTitle})
                    </div>
                    <a className="pud-modal-info-link" href={`mailto:${selectedProfile.repEmail}`}>
                      {selectedProfile.repEmail}
                    </a>
                  </div>
                  <div>
                    <div className="pud-modal-info-label">Scale of Operations</div>
                    <div className="pud-modal-info-value">Revenue: {selectedProfile.revenue}</div>
                    <div className="pud-modal-info-value">Scale: {selectedProfile.employees}</div>
                  </div>
                </div>
              </div>

              <div className="pud-modal-footer">
                {selectedProfile.actionVariant === "message" ? (
                  <button type="button" className="pud-btn pud-btn-message pud-modal-footer-btn">
                    <IconMessageSquare /> Message Supplier
                  </button>
                ) : (
                  <button type="button" className="pud-btn pud-btn-interest pud-modal-footer-btn">
                    <IconSend /> Send Interest
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {isChatOpen && fullPageRfqId && (
          <BuyerRFQChat
            onClose={() => setIsChatOpen(false)}
            rfqId={fullPageRfqId}
            rfqNumber={fullPageRfq?.rfqNumber}
            rfqTitle={fullPageRfq?.title}
            supplierIds={fullPageRfq?.supplierIds || []}
            supplierNames={chatSupplierNames}
            externalSupplierIds={fullPageRfq?.externalSupplierIds || []}
            buyerProfile={buyerProfile}
            isLoadingBuyerProfile={isLoadingBuyerProfile}
          />
        )}
    </Header>
  );
};

export default BuyersDashboard;