import React, { useState, useEffect, useMemo } from "react";
import "./BuyerAdminDash.css";
import Header from "./Header";
import UserAdmin from "../UserAdmin";
import Invitations from "../../../remote-supplier/src/components/Invitations";
import Product from "../../../remote-buyer/src/components/Product";
import CompanyProfile from "./CompanyProfile/CompanyProfile";
import { useNetworkAdminAuthStore } from "../store/useAuthStore";
import {
  getBuyerProfile,
  fetchBuyerRFQs,
  fetchBuyerRFQById,
  fetchBuyerVerificationTemplates,
  updateRfqStatus,
  type VerificationTemplate
} from "../../../remote-buyer/src/api/Buyerapi";
import CreateRFQ from "./UserListTable/CreateRFQ";
import { logoutPlatformUser } from "../api/platformApi";
import { toastService } from "@vosox/shared-ui";
import UserTemplate from "./usertemplate"
import ApprovalManagement from "./ApprovalManagement/ApprovalManagement";
import { ToastContainer } from "@vosox/shared-ui";
import AdminQsAns from "../../../remote-buyer/src/components/Qsans";
import QuotationComparisonCard from "./QuotationComparisonCard";
import BidComparisonAwardView from "./BidComparisonAwardView";
import BuyerRFQChat from "../../../remote-buyer/src/components/BuyerRFQChat/BuyerRFQChat";
import ItemMasterCatalog from "../../../remote-buyer/src/components/ItemMasterCatalog";

interface StatCard {
  icon: React.ReactNode;
  label: string;
  value: number;
  linkText: string;
  colorClass: string;
  isClickable?: boolean; 
  navKey?:string;
}

interface POItem {
  code: string;
  status: "ACCEPTED" | "DELIVERED";
  company: string;
  orderDate: string;
  amount: string;
}

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

const IconMail = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 6-10 7L2 6" />
  </svg>
);

const IconFile = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M8 13h8M8 17h8M8 9h2" />
  </svg>
);

const IconTrend = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
    <polyline points="16 7 22 7 22 13" />
  </svg>
);

const IconBag = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
    <path d="M3 6h18" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);

const IconInvoice = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 2h11l5 5v15H4z" />
    <path d="M15 2v5h5" />
    <path d="M9 13h1M9 17h6" />
  </svg>
);

const IconBell = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

const IconMenu = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const NavIconHome = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <path d="M9 22V12h6v10" />
  </svg>
);

const NavIconUsers = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const NavIconBuilding = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="1" />
    <path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01" />
  </svg>
);

const NavIconTemplate = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18" />
    <path d="M9 3v18" />
  </svg>
);

const NavIconFileCheck = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="m9 15 2 2 4-4" />
  </svg>
);

const LogoutIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
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

const IconMore = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
    <circle cx="5" cy="12" r="1" />
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

const navItems: { key: string; icon: React.ReactNode; label: string; section?: string; badge?: number; subItems?: { key: string; label: string }[] }[] = [
  { key: "dashboard", icon: <NavIconHome />, label: "Dashboard", section: "MAIN" },
  { key: "invitations", icon: <IconMail />, label: "Invitations", section: "SOURCING & ORDERS" },
  { key: "createRFQ", icon: <NavIconFilePlus />, label: "Create RFQ" },
  { key: "product", icon: <NavIconFileCheck />, label: "Product Catalog", section: "DIRECTORY & CATALOG" },
  { key: "userList", icon: <NavIconUsers />, label: "User List" },
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
    icon: <IconMore />,
    label: "More",
    subItems: [
      { key: "material", label: "Material" },
    ],
  },
];

const statCards: StatCard[] = [
  { icon: <IconFile />, navKey: "activeRFQs", label: "ACTIVE RFQS", value: 3, linkText: "Manage RFQs >", colorClass: "bad-stat-icon-blue" },
  { icon: <NavIconFilePlus />, navKey: "createRFQ", label: "CREATE RFQ", value: 0, linkText: "Create RFQ >", colorClass: "bad-stat-icon-blue" },
  { icon: <IconMail />, navKey: "quotationsReceived", label: "QUOTATIONS RECEIVED", value: 5, linkText: "Review bids >", colorClass: "bad-stat-icon-indigo" },
  { icon: <IconTrend />, navKey: "suppliersEngaged", label: "SUPPLIERS ENGAGED", value: 8, linkText: "View directory", colorClass: "bad-stat-icon-green" },
  { icon: <IconBag />, navKey: "purchaseOrders", label: "PURCHASE ORDERS", value: 4, linkText: "Track orders >", colorClass: "bad-stat-icon-purple" },
  { icon: <IconInvoice />, navKey: "pendingInvoices", label: "PENDING INVOICES", value: 2, linkText: "Invoice list >", colorClass: "bad-stat-icon-orange" },
  { icon: <IconBell />, navKey: "notifications", label: "NOTIFICATIONS", value: 3, linkText: "Inquiries & Alerts >", colorClass: "bad-stat-icon-teal" },
];

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

const mockRfqs = [
  {
    rfqId: "rfq-1001",
    rfqNumber: "RFQ-2026-1104",
    organizationName: "Your Organization",
    title: "Supply of Laptops & Docking Stations",
    endDate: "2026-08-12",
    deliveryLocation: "Indore, India",
    description: "Sourcing 120 business laptops with docking stations and monitor arms for the new engineering wing.",
    startDate: "2026-07-10",
    addLotOption: true,
  }
];

const BuyerAdminDash: React.FC = () => {
  const [activeNav, setActiveNav] = useState<string>("dashboard");
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<MatchCard | null>(null);

  const [loadingRfqs, setLoadingRfqs] = useState(false);
  const [rfqsError, setRfqsError] = useState<string | null>(null);
  const [rfqs, setRfqs] = useState<any[]>(mockRfqs);
  const [visibleRfqCount, setVisibleRfqCount] = useState(3);
  const RFQ_INITIAL_VISIBLE = 3;
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [templates, setTemplates] = useState<VerificationTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  const currentUser = useNetworkAdminAuthStore((state) => state.currentUser);
  const [buyerId, setBuyerId] = useState<string | null>(currentUser?.buyerId || null);

  useEffect(() => {
    if (currentUser?.buyerId) {
      setBuyerId(currentUser.buyerId);
    }
  }, [currentUser?.buyerId]);


  // STATE FOR QUOTATION COMPARISON
  const [selectedQuotationsRfq, setSelectedQuotationsRfq] = useState<any | null>(null);

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

  useEffect(() => {
    const loadRfqs = async () => {
      if (!buyerId) {
        setRfqs(mockRfqs);
        setVisibleRfqCount(Math.min(RFQ_INITIAL_VISIBLE, mockRfqs.length));
        return;
      }

      setLoadingRfqs(true);
      setRfqsError(null);

      try {
        const data = await fetchBuyerRFQs({
          buyerId,
          index: 0,
          limit: RFQ_INITIAL_VISIBLE,
        });

        const finalData = data.length > 0 ? data : mockRfqs;

        setRfqs(finalData);
        setVisibleRfqCount(
          Math.min(RFQ_INITIAL_VISIBLE, finalData.length)
        );
      } catch (err: any) {

        setRfqsError(
          err?.message || "Failed to load sourcing opportunities."
        );

        setRfqs(mockRfqs);
        setVisibleRfqCount(
          Math.min(RFQ_INITIAL_VISIBLE, mockRfqs.length)
        );
      } finally {
        setLoadingRfqs(false);
      }
    };

    loadRfqs();
  }, [buyerId]);

  useEffect(() => {
    const loadTemplates = async () => {
      setLoadingTemplates(true);
      setTemplatesError(null);
      try {
        const data = await fetchBuyerVerificationTemplates();

        if ('statusCode' in data) {
          setTemplatesError(data.message || 'Failed to load templates');
          setTemplates([]);
        } else {
          setTemplates(Array.isArray(data) ? data : []);
        }
      } catch (err: any) {
        setTemplatesError(err.message || "Failed to load verification templates.");
        setTemplates([]);
      } finally {
        setLoadingTemplates(false);
      }
    };

    if (activeNav === "template") {
      loadTemplates();
    }
  }, [activeNav]);


  const [rfqPageView, setRfqPageView] = useState<"dashboard" | "allRfqs" | "rfqDetail" | "qsAns" | "quotationComparison">("dashboard");

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
    setActiveNav("activeRFQs");
    setRfqPageView("allRfqs");
    if (allRfqsLoaded || loadingAllRfqs) return;

    // load page 1 when opening
    await loadAllRfqsPage(1);
  };

  const getRfqPageRange = (page: number) => {
    const index = (page - 1) * RFQ_PAGE_SIZE;
    const limit = RFQ_PAGE_SIZE;
    return { index, limit };
  };

  const loadAllRfqsPage = async (page: number) => {
    if (!buyerId) {
      setAllRfqsList(rfqs.length > 0 ? rfqs : mockRfqs);
      setAllRfqsHasMore(false);
      setAllRfqsLoaded(true);
      return;
    }

    setLoadingAllRfqs(true);
    setAllRfqsError(null);

    try {
      const { index, limit } = getRfqPageRange(page);

      const data = await fetchBuyerRFQs({ buyerId, index, limit });

      setAllRfqsList(data.length > 0 ? data : mockRfqs);
      setAllRfqsPage(page);
      setAllRfqsHasMore(data.length === RFQ_PAGE_SIZE);
    } catch (err: any) {
      setAllRfqsError(err.message || "Failed to load the full RFQ list.");
      setAllRfqsList(rfqs.length > 0 ? rfqs : mockRfqs);
      setAllRfqsHasMore(false);
    } finally {
      setLoadingAllRfqs(false);
      setAllRfqsLoaded(true);
    }
  };

  const handleAllRfqsNextPage = () => {
    if (loadingAllRfqs || !allRfqsHasMore) return;
    loadAllRfqsPage(allRfqsPage + 1);
  };

  const handleAllRfqsPrevPage = () => {
    if (loadingAllRfqs || allRfqsPage <= 1) return;
    loadAllRfqsPage(allRfqsPage - 1);
  };

  const handleNavClick = (key: string) => {
    setIsMobileSidebarOpen(false);
    if (key === "activeRFQs") {
      handleOpenAllRfqs();
      return;
    }
    setActiveNav(key);
    setRfqPageView("dashboard");
  };

  const handleCardClick = (navKey?: string, label?: string) => {
    if (navKey === "activeRFQs" || label === "ACTIVE RFQs") {
      handleOpenAllRfqs(); // Redirects to All/Manage RFQs table
    } else if (navKey === "createRFQ" || label === "CREATE RFQ") {
      handleNavClick("createRFQ"); // Redirects to Create RFQ form
    } else if (navKey) {
      handleNavClick(navKey);
  }
};

  // const handleBackToDashboard = () => {
  //   setRfqPageView("dashboard");
  //   setActiveNav("dashboard");
  // };

  const handleViewRfqDetailsFullPage = async (rfqId: string) => {
    setRfqPageView("rfqDetail");
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

  const handleBackToAllRfqs = () => {
    setRfqPageView("allRfqs");
    setFullPageRfq(null);
    setFullPageRfqId(null);
    setFullPageRfqError(null);
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

  // HANDLER FOR QUOTATION COMPARISON - FULL PAGE VIEW
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

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError(null);
    try {
      await logoutPlatformUser();
    } catch (error: any) {
      setLogoutError(error?.message || "Logout request failed, clearing session locally.");
    } finally {
      useNetworkAdminAuthStore.getState().logout();
      sessionStorage.clear();
      window.dispatchEvent(new CustomEvent("session:expired"));
      setLoggingOut(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#edeff0", paddingTop: "5.25rem" }}>
      <ToastContainer />
      <Header navItems={navItems} activeNav={activeNav} onNavClick={handleNavClick} onLogout={handleLogout} />
      <div
        className={`bad-shell${isMobileSidebarOpen ? " bad-sidebar-open-mobile" : ""}`}
        style={{ flex: 1, position: "relative", minHeight: "calc(100vh - 64px)" }}
      >
        <button
          type="button"
          className="bad-mobile-sidebar-toggle"
          onClick={() => setIsMobileSidebarOpen((prev) => !prev)}
          aria-label={isMobileSidebarOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMobileSidebarOpen}
        >
          {isMobileSidebarOpen ? <IconClose /> : <IconMenu />}
        </button>

        <div
          className="bad-sidebar-backdrop"
          onClick={() => setIsMobileSidebarOpen(false)}
          aria-hidden="true"
        />
        <aside className="bad-sidebar">
          <nav className="bad-nav" >
            {navItems.map((item) => (
              <React.Fragment key={item.key}>
                {item.section && (
                  <div className="bad-nav-section-title">{item.section}</div>
                )}
                {item.subItems ? (
                  <div className="bad-nav-dropdown-container">
                    <div
                      className={`bad-nav-item${activeNav === item.key || item.subItems.some(sub => sub.key === activeNav) ? " bad-nav-item-active" : ""}`}
                    >
                      <span className="bad-nav-icon">{item.icon}</span>
                      <span className="bad-nav-label">{item.label}</span>
                      <span className="bad-nav-chevron">
                        <IconChevronRight />
                      </span>
                    </div>
                    <div className="bad-nav-dropdown-menu">
                      {item.subItems.map(subItem => (
                        <div
                          key={subItem.key}
                          onClick={() => handleNavClick(subItem.key)}
                          className={`bad-nav-subitem${activeNav === subItem.key ? " bad-nav-subitem-active" : ""}`}
                        >
                          {subItem.label}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div
                    className={`bad-nav-item${activeNav === item.key ? " bad-nav-item-active" : ""}`}
                    onClick={() => handleNavClick(item.key)}
                  >
                    <span className="bad-nav-icon">{item.icon}</span>
                    <span className="bad-nav-label">{item.label}</span>
                    {item.badge && <span className="bad-nav-badge">{item.badge}</span>}
                  </div>
                )}
              </React.Fragment>
            ))}
            <div
              className="bad-nav-item bad-nav-item-logout"
              style={{
                marginTop: "auto",
                opacity: loggingOut ? 0.6 : 1,
                cursor: loggingOut ? "not-allowed" : "pointer",
                pointerEvents: loggingOut ? "none" : "auto",
              }}
              onClick={handleLogout}
              role="button"
              aria-disabled={loggingOut}
              title={logoutError || undefined}
            >
              <span className="bad-nav-icon" style={{ transform: "rotate(180deg)" }}>
                <LogoutIcon />
              </span>
              <span className="bad-nav-label">{loggingOut ? "Logging out..." : "Log Out"}</span>
            </div>
          </nav>
        </aside>

        <div className="bad-main">
          <main className="bad-content">
            {activeNav === "userList" ? (
              <UserAdmin />
            ) : activeNav === "invitations" ? (
              <Invitations isAdmin adminRole="buyer" />
            ) : activeNav === "companyProfile" ? (
              <CompanyProfile mode="network-admin" showHeader={false} />
            ) : activeNav === "template" ? (
              <div>
                {loadingTemplates ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
                    <div style={{ color: '#64748b', fontSize: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                      <div className="bad-spinner" style={{ width: '32px', height: '32px' }} />
                      <span>Loading verification templates...</span>
                    </div>
                  </div>
                ) : templatesError ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#ef4444' }}>
                    <h3>Error Loading Templates</h3>
                    <p>{templatesError}</p>
                  </div>
                ) : (
                  <UserTemplate templates={templates} />
                )}
              </div>
            ) : activeNav === "approvalManagement" ? (
              <ApprovalManagement />
            ) : activeNav === "material" ? (
              <ItemMasterCatalog buyerId={buyerId || ""} />
            ) : activeNav === "createRFQ" ? (
              <CreateRFQ />
            ) : activeNav === "product" ? (
              <Product />
            ) : rfqPageView === "allRfqs" ? (
              <>
              <div className="bad-table">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '1.25rem', }}>
                  <div>
                    <h1 className="bad-title">All RFQs</h1>
                    <p className="bad-subtitle" style={{ marginBottom: 0 }}>
                      RFQs posted across your organization, awaiting supplier quotations.
                    </p>
                  </div>
                </div>

                {loadingAllRfqs ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '240px' }}>
                    <div style={{ color: '#64748b', fontSize: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      <div className="bad-spinner" />
                      <span>Loading all sourcing opportunities...</span>
                    </div>
                  </div>
                ) : allRfqsError && allRfqsList.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#ef4444' }}>{allRfqsError}</div>
                ) : allRfqsList.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                    No RFQs found.
                  </div>
                ) : (
                  <div>
                    <div className="bad-rfq-table-container">
                      <table className="bad-rfq-items-table bad-allrfqs-table">
                        <thead>
                          <tr>
                            <th style={{ width: '48px' }}>S.No</th>
                            <th>RFQ Number</th>
                            <th>Title</th>
                            <th>Organization</th>
                            <th>Delivery Location</th>
                            <th>Closing Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allRfqsList.map((rfq: any, idx: number) => (
                            <tr key={rfq.rfqId || idx}
                            onClick={()=> handleViewRfqDetailsFullPage(rfq.rfqId)}>
                              <td style={{ color: '#94a3b8', fontWeight: 600 }}>{(allRfqsPage - 1) * RFQ_PAGE_SIZE + idx + 1}</td>
                              <td><span className="bad-code-badge">{rfq.rfqNumber}</span></td>
                              <td style={{ fontWeight: 600, color: '#1e293b' }}>{rfq.title}</td>
                              <td>{rfq.organizationName}</td>
                              <td>{rfq.deliveryLocation}</td>
                              <td>
                                {rfq.endDate
                                  ? new Date(rfq.endDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                                  : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="badp-pagination badp-allrfqs-pagination">
                      <button
                        type="button"
                        className={`badp-page-btn${allRfqsPage === 1 || loadingAllRfqs ? " badp-page-btn-disabled" : ""}`}
                        onClick={handleAllRfqsPrevPage}
                        disabled={allRfqsPage <= 1 || loadingAllRfqs}
                        aria-label="Previous RFQ page"
                      >
                        <IconChevronLeft />
                      </button>

                      <span className="badp-page-number">Page {allRfqsPage}</span>

                      <button
                        type="button"
                        className={`badp-page-btn${!allRfqsHasMore || loadingAllRfqs ? " badp-page-btn-disabled" : ""}`}
                        onClick={handleAllRfqsNextPage}
                        disabled={!allRfqsHasMore || loadingAllRfqs}
                        aria-label="Next RFQ page"
                      >
                        <IconChevronRight />
                      </button>
                    </div>
                  </div>
                )}
              </div>
              </>
            ) : rfqPageView === "rfqDetail" ? (
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
                <div className="bad-modal bad-rfq-fullpage">
                  <div className="bad-modal-header">
                    <span className="bad-modal-badge">
                      <IconSparkles /> Bid Comparison
                    </span>
                    <button className="bad-modal-close" onClick={handleBackFromQuotationComparison}>
                      <IconClose />
                    </button>
                    <h2 className="bad-modal-name">
                      {selectedQuotationsRfq?.title || "RFQ Quotations"}
                    </h2>
                    {selectedQuotationsRfq && (
                      <div className="bad-modal-meta">
                        <span><IconFile /> {selectedQuotationsRfq.rfqNumber}</span>
                        <span><IconPin /> {selectedQuotationsRfq.deliveryLocation}</span>
                      </div>
                    )}
                  </div>

                  <div className="bad-modal-body" style={{ maxHeight: 'calc(100% - 120px)', overflowY: 'auto', padding: '24px' }}>
                    <QuotationComparisonCard
                      rfqId={selectedQuotationsRfq?.rfqId}
                      rfqTitle={selectedQuotationsRfq?.title}
                    />
                  </div>

                </div>
              </>
            ) : rfqPageView === "qsAns" ? (
              <AdminQsAns
                rfq={fullPageRfq}
                loading={loadingFullPageRfq}
                error={fullPageRfqError && !fullPageRfq ? fullPageRfqError : null}
                onBack={handleBackToRfqDetail}
              />
            ) : (
              <>
              <div>
                <h1 className="bad-title" style={{ fontSize: '20px', fontWeight: 500 }}>Buyer Admin Command Center</h1>
                <p className="bad-subtitle">Manage buyers, track procurement activities, and oversee operations.</p>
              </div>

                <div className="bad-stats-grid">
                  {statCards.map((stat) => (
                    <div className="bad-stat-card" key={stat.label}>
                      <div className={`bad-stat-icon ${stat.colorClass}`}>{stat.icon}</div>
                      <div className="bad-stat-label">{stat.label}</div>
                      <div className="bad-stat-value">{stat.value}</div>
                      <a className="bad-stat-link" href="#" onClick={(e) => {
                            e.preventDefault();
                            handleCardClick(stat.navKey,stat.label);
                          }}> 
                        {stat.linkText}
                      </a>
                    </div>
                  ))}
                </div>

                <div className="bad-panels">
                  <section className="bad-panel">
                    <div className="bad-panel-header">
                      <div>
                        <div className="bad-panel-title">Recent RFQs</div>
                        <div className="bad-panel-subtitle">RFQs posted across your organization, awaiting supplier quotations</div>
                      </div>
                      {!loadingRfqs && !rfqsError && rfqs.length > 0 && (
                        <a
                          className="bad-panel-link"
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
                      <div className="bad-panel-list" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '180px' }}>
                        <div style={{ color: '#64748b', fontSize: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                          <div className="bad-spinner" />
                          <span>Loading sourcing opportunities...</span>
                        </div>
                      </div>
                    ) : rfqsError ? (
                      <div className="bad-panel-list" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '180px', padding: '16px' }}>
                        <div style={{ color: '#ef4444', fontSize: '14px', textAlign: 'center' }}>
                          {rfqsError}
                        </div>
                      </div>
                    ) : rfqs.length === 0 ? (
                      <div className="bad-panel-list" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '180px', padding: '16px' }}>
                        <div style={{ color: '#64748b', fontSize: '14px', textAlign: 'center' }}>
                          No recent sourcing opportunities found.
                        </div>
                      </div>
                    ) : (
                      <div className="bad-panel-list">
                        {rfqs.slice(0, visibleRfqCount).map((rfq) => (
                          <div
                            className="bad-rfq-card-item"
                            key={rfq.rfqId}
                            onClick={() => handleViewRfqDetailsFullPage(rfq.rfqId)}
                            role="button"
                            tabIndex={0}
                          >
                            <div className="bad-rfq-meta">
                              <span className="bad-code-badge">{rfq.rfqNumber}</span>
                              <span className="bad-dot-sep">•</span>
                              <span className="bad-company">{rfq.organizationName}</span>
                            </div>

                            <div className="bad-rfq-title bad-rfq-link-title">{rfq.title}</div>

                            <div className="bad-rfq-details">
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

                  <section className="bad-panel">
                    <div className="bad-panel-header">
                      <div>
                        <div className="bad-panel-title">Recent Purchase Orders</div>
                        <div className="bad-panel-subtitle">Buyer orders requiring attention</div>
                      </div>
                      <a className="bad-panel-link" href="#">View All →</a>
                    </div>
                    <div className="bad-panel-list">
                      {poItems.map((po) => (
                        <div className="bad-po-row" key={po.code}>
                          <div className="bad-po-info">
                            <div className="bad-po-meta">
                              <span className="bad-po-code">{po.code}</span>
                              <span className={`bad-status-badge bad-status-badge-${po.status.toLowerCase()}`}>
                                {po.status}
                              </span>
                            </div>
                            <div className="bad-po-company">{po.company}</div>
                            <div className="bad-po-date"><IconCalendar /> Order Date: {po.orderDate}</div>
                          </div>
                          <div className="bad-po-right">
                            <div className="bad-po-amount">{po.amount}</div>
                            <a className="bad-po-process" href="#">Process →</a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                <section className="bad-matchmaker">
                  <div className="bad-matchmaker-header">
                    <div className="bad-matchmaker-title-row">
                      <span className="bad-matchmaker-icon"><IconSparkles /></span>
                      <div className="bad-matchmaker-title">Supplier Network Overview</div>
                    </div>
                    <div className="bad-matchmaker-subtitle">
                      Monitor connected suppliers and their engagement with your buyers.
                    </div>
                  </div>

                  <div className="bad-match-grid">
                    {matchCards.map((card) => (
                      <div className="bad-match-card" key={card.name}>
                        <span className="bad-match-location"><IconPin /> {card.location}</span>
                        <div className="bad-match-top">
                          <div className="bad-match-avatar">{card.initials}</div>
                          <div>
                            <div className="bad-match-name">{card.name}</div>
                            <div className="bad-match-seeking"><NavIconBuilding /> Supplies: {card.seeking}</div>
                          </div>
                        </div>
                        <p className="bad-match-desc">{card.description}</p>
                        <div className="bad-match-rep-row">
                          <span className="bad-match-rep-label">Representative:</span>
                          <span className="bad-match-rep-name">{card.representative}</span>
                        </div>
                        <div className="bad-match-actions">
                          <button
                            className="bad-btn bad-btn-outline bad-btn-flex"
                            onClick={() => setSelectedProfile(card)}
                          >
                            <IconEye /> Profile
                          </button>
                          {card.actionVariant === "message" ? (
                            <button className="bad-btn bad-btn-message bad-btn-flex">
                              <IconMessageSquare /> Message
                            </button>
                          ) : (
                            <button className="bad-btn bad-btn-interest bad-btn-flex">
                              <IconSend /> Send Interest
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bad-pagination">
                    <button className="bad-page-btn bad-page-btn-disabled" disabled>
                      <IconChevronLeft />
                    </button>
                    <button className="bad-page-btn bad-page-btn-active">
                      <IconChevronRight />
                    </button>
                  </div>
                </section>
              </>
            )}
          </main>
        </div>

        {selectedProfile && (
          <div className="bad-modal-overlay" onClick={() => setSelectedProfile(null)}>
            <div className="bad-modal" onClick={(e) => e.stopPropagation()}>
              <div className="bad-modal-header">
                <span className="bad-modal-badge">
                  <IconShieldCheck /> Verified Supplier Partner
                </span>
                <button className="bad-modal-close" onClick={() => setSelectedProfile(null)}>
                  <IconClose />
                </button>
                <h2 className="bad-modal-name">{selectedProfile.name}</h2>
                <div className="bad-modal-meta">
                  <span><IconPin /> {selectedProfile.location}</span>
                  <span><IconGlobe /> {selectedProfile.website}</span>
                </div>
              </div>

              <div className="bad-modal-body">
                <div className="bad-modal-section-title">Organization Description</div>
                <p className="bad-modal-desc">{selectedProfile.description}</p>

                <div className="bad-modal-analytics">
                  <div className="bad-modal-analytics-title">
                    <IconSparkles /> Verified Match Analytics
                  </div>
                  <div className="bad-modal-analytics-grid">
                    <div className="bad-modal-analytics-item">
                      <span className="bad-modal-check"><IconCheckCircle /></span>
                      <div>
                        <div className="bad-modal-analytics-label">Supply Category</div>
                        <div className="bad-modal-analytics-value">{selectedProfile.seeking}</div>
                        <div className="bad-modal-analytics-note">{selectedProfile.categoryNote}</div>
                      </div>
                    </div>
                    <div className="bad-modal-analytics-item">
                      <span className="bad-modal-check"><IconCheckCircle /></span>
                      <div>
                        <div className="bad-modal-analytics-label">Service Region</div>
                        <div className="bad-modal-analytics-value">{selectedProfile.location}</div>
                        <div className="bad-modal-analytics-note">{selectedProfile.destinationNote}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bad-modal-info-grid">
                  <div>
                    <div className="bad-modal-info-label">Company Representative</div>
                    <div className="bad-modal-info-value">
                      {selectedProfile.representative} ({selectedProfile.repTitle})
                    </div>
                    <a className="bad-modal-info-link" href={`mailto:${selectedProfile.repEmail}`}>
                      {selectedProfile.repEmail}
                    </a>
                  </div>
                  <div>
                    <div className="bad-modal-info-label">Scale of Operations</div>
                    <div className="bad-modal-info-value">Revenue: {selectedProfile.revenue}</div>
                    <div className="bad-modal-info-value">Scale: {selectedProfile.employees}</div>
                  </div>
                </div>
              </div>

              <div className="bad-modal-footer">
                {selectedProfile.actionVariant === "message" ? (
                  <button className="bad-btn bad-btn-message bad-modal-footer-btn">
                    <IconMessageSquare /> Message Supplier
                  </button>
                ) : (
                  <button className="bad-btn bad-btn-interest bad-modal-footer-btn">
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
          />
        )}
      </div>
    </div>
  );
};

export default BuyerAdminDash;