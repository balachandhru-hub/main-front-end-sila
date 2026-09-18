import React, { useState, useEffect } from "react";
import "./SupplierAdminDash.css";
import "../../../remote-supplier/src/components/SupplierDashboard.css"
import Header from "./Header";
import UserAdmin from "../UserAdmin";
import CompanyProfile from "./CompanyProfile/CompanyProfile";
import Catalog from "../../../remote-supplier/src/components/Catalog";
import Invitations from "../../../remote-supplier/src/components/Invitations";
import SupplierRfqQuotationSummary from "./SupplierRfqQuotationSummary";
import { useNetworkAdminAuthStore } from "../store/useAuthStore";
import {
  fetchRFQMasterData,
  fetchRFQById,
  fetchSupplierQuotationBySupplierId,
  getSupplierProfile,
  type RFQMasterDataItem,
  type RFQDetailResponse,
  type SupplierQuotationByIdItem,
} from "../../../remote-supplier/src/api/supplierApi";
import { logoutPlatformUser } from "../api/platformApi";
import { isErrorResponse } from "@vosox/shared-ui";
import EAuctionWidget from "../../../remote-supplier/src/components/EAuctionWidget.tsx";

interface StatCard {
  icon: React.ReactNode;
  label: string;
  value: number;
  linkText: string;
  colorClass: string;
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

// const IconMenu = () => (
//   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//     <line x1="3" y1="6" x2="21" y2="6" />
//     <line x1="3" y1="12" x2="21" y2="12" />
//     <line x1="3" y1="18" x2="21" y2="18" />
//   </svg>
// );

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

const NavIconFile = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
  </svg>
);

const NavIconCatalog = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
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

const navItemsBeforeCatalog: { key: string; icon: React.ReactNode; label: string; badge?: number }[] = [
  { key: "dashboard", icon: <NavIconHome />, label: "Dashboard" },
  { key: "userList", icon: <NavIconUsers />, label: "User List" },
  { key: "rfqs", icon: <NavIconFile />, label: "RFQs" },
];

const navItemsAfterCatalog: { key: string; icon: React.ReactNode; label: string; badge?: number }[] = [
  { key: "invitations", icon: <IconMail />, label: "Invitations" },
];

const headerNavItems: { key: string; icon: React.ReactNode; label: string; badge?: number }[] = [
  { key: "dashboard", icon: <NavIconHome />, label: "Dashboard" },
  { key: "userList", icon: <NavIconUsers />, label: "User List" },
  { key: "rfqs", icon: <NavIconFile />, label: "RFQs" },
  { key: "catalogList", icon: <NavIconCatalog />, label: "Catalog" },
  { key: "invitations", icon: <IconMail />, label: "Invitations" },
];

const statCards: StatCard[] = [
  { icon: <IconMail />, label: "INVITATIONS", value: 2, linkText: "Pending review >", colorClass: "sad-stat-icon-blue" },
  { icon: <IconFile />, label: "ACTIVE RFQS", value: 2, linkText: "Bids open >", colorClass: "sad-stat-icon-indigo" },
  { icon: <IconTrend />, label: "BIDS SUBMITTED", value: 3, linkText: "Track outcomes", colorClass: "sad-stat-icon-green" },
  { icon: <IconBag />, label: "PURCHASE ORDER", value: 4, linkText: "Accept orders >", colorClass: "sad-stat-icon-purple" },
  { icon: <IconInvoice />, label: "DUE INVOICES", value: 2, linkText: "Invoice list >", colorClass: "sad-stat-icon-orange" },
  { icon: <IconBell />, label: "NOTIFICATIONS", value: 3, linkText: "Inquiries & Alerts >", colorClass: "sad-stat-icon-teal" },
];

const poItems: POItem[] = [
  { code: "PO-2026-90412", status: "ACCEPTED", company: "Global Tech Solutions Inc.", orderDate: "2026-07-04", amount: "$18,500.00" },
  { code: "PO-2026-88401", status: "ACCEPTED", company: "Apex Partners", orderDate: "2026-05-22", amount: "$4,200.00" },
  { code: "PO-2026-80214", status: "DELIVERED", company: "ABC Manufacturing Inc.", orderDate: "2026-04-10", amount: "$9,800.00" },
];

const matchCards: MatchCard[] = [
  {
    location: "Singapore",
    initials: "VL",
    name: "Vertex Labs Singapore",
    seeking: "IT Hardware & Accessories",
    description: "Vertex Labs is a cutting-edge deep tech incubator looking to outfit their brand-new engineering office space with state-of-the-art workstations.",
    representative: "Dr. Adrian Cheng",
    actionLabel: "Message",
    actionVariant: "message",
    website: "www.vertexlabs.com",
    repTitle: "VP Operations",
    repEmail: "adrian.cheng@vertexlabs.sg",
    revenue: "$12.5M USD",
    employees: "145 Employees",
    categoryNote: "Matches your catalog listings",
    destinationNote: "Matches your active service regions",
  },
  {
    location: "European Union",
    initials: "SH",
    name: "Starlight Hospitality Group",
    seeking: "Office Furniture",
    description: "Starlight Group coordinates multi-location boutique hotel lounges and business centers across Europe.",
    representative: "Evelyn Carter",
    actionLabel: "Send Interest",
    actionVariant: "interest",
    website: "www.starlighthospitality.eu",
    repTitle: "Procurement Lead",
    repEmail: "evelyn.carter@starlightgroup.eu",
    revenue: "$34.2M USD",
    employees: "620 Employees",
    categoryNote: "Matches your catalog listings",
    destinationNote: "Matches your active service regions",
  },
  {
    location: "North America",
    initials: "VS",
    name: "Vanguard Sourcing Partners",
    seeking: "Stationery",
    description: "Vanguard supplies administrative desks and corporate centers with specialized FSC certified eco-friendly writing materials.",
    representative: "Robert Miller",
    actionLabel: "Send Interest",
    actionVariant: "interest",
    website: "www.vanguardsourcing.com",
    repTitle: "Sourcing Manager",
    repEmail: "robert.miller@vanguardsourcing.com",
    revenue: "$8.9M USD",
    employees: "95 Employees",
    categoryNote: "Matches your catalog listings",
    destinationNote: "Matches your active service regions",
  },
  {
    location: "United Kingdom",
    initials: "HB",
    name: "Horizon BioTech",
    seeking: "Breakroom Supplies",
    description: "Horizon BioTech operates premium research facilities and corporate office buildings requiring high-volume supplies.",
    representative: "Claire Johnston",
    actionLabel: "Send Interest",
    actionVariant: "interest",
    website: "www.horizonbiotech.co.uk",
    repTitle: "Facilities Director",
    repEmail: "claire.johnston@horizonbiotech.co.uk",
    revenue: "$21.7M USD",
    employees: "310 Employees",
    categoryNote: "Matches your catalog listings",
    destinationNote: "Matches your active service regions",
  },
];

const VERIFICATION_TOKEN_COOKIE = "vsx_verification_token";

const deleteCookie = (name: string) => {
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
};

const SupplierAdminDash: React.FC = () => {
  const [activeNav, setActiveNav] = useState<string>("dashboard");
  const [catalogViewContainer, setCatalogViewContainer] = useState<HTMLDivElement | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<MatchCard | null>(null);

  /* ---------------------------------- RFQ management (ported from SupplierDashboard) ---------------------------------- */

  const currentUser = useNetworkAdminAuthStore((state) => state.currentUser);
  const [supplierId, setSupplierId] = useState<string | null>(currentUser?.supplierId || null);

  useEffect(() => {
    if (currentUser?.supplierId) {
      setSupplierId(currentUser.supplierId);
    }
  }, [currentUser?.supplierId]);

  const [rfqs, setRfqs] = useState<RFQMasterDataItem[]>([]);
  const [loadingRfqs, setLoadingRfqs] = useState(true);
  const [rfqsError, setRfqsError] = useState<string | null>(null);
  const [visibleRfqCount, setVisibleRfqCount] = useState(3);
  const RFQ_INITIAL_VISIBLE = 3;
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [ownQuotation, setOwnQuotation] = useState<SupplierQuotationByIdItem | null>(null);

  const [selectedRfqId, setSelectedRfqId] = useState<string | null>(null);
  const [selectedRfq, setSelectedRfq] = useState<RFQDetailResponse | null>(null);
  const [loadingRfqDetail, setLoadingRfqDetail] = useState(false);
  const [rfqDetailError, setRfqDetailError] = useState<string | null>(null);

  useEffect(() => {
    if (!supplierId) {
      setRfqsError("Supplier ID not found in session.");
      setLoadingRfqs(false);
    }
  }, [supplierId]);

  useEffect(() => {
    const loadSupplierProfile = async () => {
      if (!supplierId) {
        try {
          const profile = await getSupplierProfile();

          if (isErrorResponse(profile)) {
            setRfqsError("Supplier profile not found. Please complete onboarding.");
            setLoadingRfqs(false);
            return;
          }

          if (profile && profile.id) {
            setSupplierId(profile.id);
          } else {
            setRfqsError("Supplier profile not found. Please complete onboarding.");
            setLoadingRfqs(false);
          }
        } catch (err: any) {
          setRfqsError("Failed to load supplier profile details.");
          setLoadingRfqs(false);
        }
      }
    };
    loadSupplierProfile();
  }, [supplierId]);

  useEffect(() => {
    const loadRfqs = async () => {
      if (!supplierId) return;

      setLoadingRfqs(true);
      setRfqsError(null);

      try {
        const initialLimit = RFQ_INITIAL_VISIBLE;
        const data = await fetchRFQMasterData({
          supplierId,
          index: 0,
          limit: initialLimit,
        });

        // ✅ ADD ERROR CHECK HERE
        if (isErrorResponse(data)) {
          setRfqsError(data.description || data.message || "Failed to load sourcing opportunities.");
          setRfqs([]);
          setLoadingRfqs(false);
          return;
        }

        setRfqs(data);
        setVisibleRfqCount(Math.min(RFQ_INITIAL_VISIBLE, data.length));
      } catch (err: any) {
        setRfqsError(err.message || "Failed to load sourcing opportunities.");
      } finally {
        setLoadingRfqs(false);
      }
    };
    loadRfqs();
  }, [supplierId]);

  const handleViewRfqDetails = async (rfqId: string) => {
    setSelectedRfqId(rfqId);
    setLoadingRfqDetail(true);
    setRfqDetailError(null);
    setSelectedRfq(null);
    setOwnQuotation(null);
    try {
      const data = await fetchRFQById(rfqId);

      // ✅ ADD ERROR CHECK HERE
      if (isErrorResponse(data)) {
        setRfqDetailError(data.description || data.message || "Failed to load RFQ details.");
        setSelectedRfq(null);
        setLoadingRfqDetail(false);
        return;
      }

      setSelectedRfq(data);
    } catch (err: any) {
      setRfqDetailError(err.message || "Failed to load RFQ details.");
    } finally {
      setLoadingRfqDetail(false);
    }

    try {
      const quotationData = await fetchSupplierQuotationBySupplierId(rfqId);
      if (
        !isErrorResponse(quotationData) &&
        quotationData &&
        'suppliers' in quotationData &&
        Array.isArray(quotationData.suppliers)
      ) {
        const mine =
          quotationData.suppliers.find((s) => s.supplierId === supplierId) ||
          quotationData.suppliers[0] ||
          null;
        setOwnQuotation(mine);
      }
    } catch {
    }
  };

  const [rfqPageView, setRfqPageView] = useState<"dashboard" | "allRfqs" | "rfqDetail">("dashboard");
  const [previousRfqPageView, setPreviousRfqPageView] = useState<"dashboard" | "allRfqs">("dashboard");

  useEffect(() => {
    const handlePopState = () => {
      if (rfqPageView === "rfqDetail") {
        const targetView = previousRfqPageView || "allRfqs";
        setRfqPageView(targetView);
        if (targetView === "dashboard") {
          setActiveNav("dashboard");
        } else {
          setActiveNav("rfqs");
        }
        setSelectedRfqId(null);
        setSelectedRfq(null);
        setRfqDetailError(null);
        setOwnQuotation(null);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [rfqPageView, previousRfqPageView]);

  const [allRfqsList, setAllRfqsList] = useState<RFQMasterDataItem[]>([]);
  const [loadingAllRfqs, setLoadingAllRfqs] = useState(false);
  const [allRfqsError, setAllRfqsError] = useState<string | null>(null);
  const [allRfqsLoaded, setAllRfqsLoaded] = useState(false);
  const [allRfqsPage, setAllRfqsPage] = useState(1);
  const [allRfqsHasMore, setAllRfqsHasMore] = useState(true);
  const RFQ_PAGE_SIZE = 10;
  const getRfqPageRange = (page: number) => {
    const index = (page - 1) * RFQ_PAGE_SIZE;
    const limit = RFQ_PAGE_SIZE;
    return { index, limit };
  };

  const loadAllRfqsPage = async (page: number) => {
    if (!supplierId) {
      setAllRfqsList(rfqs);
      setAllRfqsHasMore(false);
      setAllRfqsLoaded(true);
      return;
    }

    setLoadingAllRfqs(true);
    setAllRfqsError(null);

    try {
      const { index, limit } = getRfqPageRange(page);

      const data = await fetchRFQMasterData({
        supplierId,
        index,
        limit,
      });

      if (isErrorResponse(data)) {
        setAllRfqsError(
          data.description ||
          data.message ||
          "Failed to load the full RFQ list."
        );
        setAllRfqsList([]);
        setAllRfqsHasMore(false);
        return;
      }

      setAllRfqsList(data);
      setAllRfqsPage(page);

      setAllRfqsHasMore(data.length === RFQ_PAGE_SIZE);
    } catch (err: any) {
      setAllRfqsError(
        err.message || "Failed to load the full RFQ list."
      );
      setAllRfqsList([]);
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

  const handleOpenAllRfqs = async () => {
    setActiveNav("rfqs");
    setRfqPageView("allRfqs");
    if (allRfqsLoaded || loadingAllRfqs) return;
    await loadAllRfqsPage(1);
  };

  // const handleBackToDashboard = () => {
  //   setRfqPageView("dashboard");
  //   setActiveNav("dashboard");
  //   setSelectedRfqId(null);
  //   setSelectedRfq(null);
  //   setRfqDetailError(null);
  // };

  const handleNavClick = (key: string) => {
    setIsMobileSidebarOpen(false);
    if (key === "rfqs") {
      handleOpenAllRfqs();
      return;
    }
    setActiveNav(key);
    setRfqPageView("dashboard");
    setSelectedRfqId(null);
    setSelectedRfq(null);
    setRfqDetailError(null);
  };

  const handleViewRfqDetailsFullPage = (rfqId: string) => {
    if (rfqPageView === "dashboard" || rfqPageView === "allRfqs") {
      setPreviousRfqPageView(rfqPageView);
    }
    window.history.pushState({ rfqPageView: "rfqDetail" }, "");
    setRfqPageView("rfqDetail");
    handleViewRfqDetails(rfqId);
  };

  const closeRfqDetail = () => {
    const targetView = previousRfqPageView || "allRfqs";
    setRfqPageView(targetView);
    if (targetView === "dashboard") {
      setActiveNav("dashboard");
    } else {
      setActiveNav("rfqs");
    }
    setSelectedRfqId(null);
    setSelectedRfq(null);
    setRfqDetailError(null);
    setOwnQuotation(null);
    if (targetView === "allRfqs" && !allRfqsLoaded && !loadingAllRfqs) {
      loadAllRfqsPage(1);
    }
  };


  const handleRetryRfqDetail = () => {
    if (selectedRfqId) handleViewRfqDetails(selectedRfqId);
  };

  const refreshRfqsList = async () => {
    if (!supplierId) return;
    const listData = await fetchRFQMasterData({
      supplierId,
      index: 0,
      limit: 10,
    });
    if (!isErrorResponse(listData)) {
      setRfqs(listData);
    }
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
      sessionStorage.clear();
      deleteCookie(VERIFICATION_TOKEN_COOKIE);
      window.dispatchEvent(new CustomEvent("session:expired"));
      setLoggingOut(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#ffffff", paddingTop: "5.25rem" }}>
      <Header
        navItems={headerNavItems}
        activeNav={activeNav}
        onNavClick={handleNavClick}
        onLogout={handleLogout}
      />

      <div
        className={`sad-shell${isMobileSidebarOpen ? " sad-sidebar-open-mobile" : ""}`}
        style={{ flex: 1, position: "relative", minHeight: "calc(100vh - 64px)" }}
      >
        <div
          className="sad-sidebar-backdrop"
          onClick={() => setIsMobileSidebarOpen(false)}
          aria-hidden="true"
        />

        <aside className="sad-sidebar">
          <nav className="sad-nav">
            {navItemsBeforeCatalog.map((item) => (
              <div
                key={item.key}
                className={`sad-nav-item${activeNav === item.key ? " sad-nav-item-active" : ""}`}
                onClick={() => handleNavClick(item.key)}
              >
                <span className="sad-nav-icon">{item.icon}</span>
                <span className="sad-nav-label">{item.label}</span>
                {item.badge && <span className="sad-nav-badge">{item.badge}</span>}
              </div>
            ))}

            <Catalog
              isAdmin={true}
              onShowCatalogList={() => setActiveNav("catalogList")}
              fullViewContainer={activeNav === "catalogList" ? catalogViewContainer : null}
            />

            {navItemsAfterCatalog.map((item) => (
              <div
                key={item.key}
                className={`sad-nav-item${activeNav === item.key ? " sad-nav-item-active" : ""}`}
                onClick={() => handleNavClick(item.key)}
              >
                <span className="sad-nav-icon">{item.icon}</span>
                <span className="sad-nav-label">{item.label}</span>
                {item.badge && <span className="sad-nav-badge">{item.badge}</span>}
              </div>
            ))}
            <div
              className="sad-nav-item sad-nav-item-logout"
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
              <span className="sad-nav-icon" style={{ transform: "rotate(180deg)" }}>
                <LogoutIcon />
              </span>
              <span className="sad-nav-label">{loggingOut ? "Logging out..." : "Log Out"}</span>
            </div>
          </nav>
        </aside>

        <div className="sad-main">
          <main className="sad-content">
            {activeNav === "catalogList" ? (
              <div ref={setCatalogViewContainer} style={{ padding: "0.5rem 1.5rem" }} />
            )
              : activeNav === "userList" ? (
                <UserAdmin />
              ) : activeNav === "companyProfile" ? (
                <CompanyProfile mode="network-admin" showHeader={false} />
              ) : activeNav === "invitations" ? (
                <Invitations isAdmin adminRole="supplier" />
              ) : rfqPageView === "allRfqs" ? (
                <>
                  <div className="sad-border">
                    <div style={{ display: 'grid', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
                      <h1 className="pud-title">All RFQs</h1>
                      <span className="pud-subtitle" style={{ marginBottom: 0 }}>
                        Sourcing opportunities matched to your industry categories.
                      </span>
                    </div>

                    {loadingAllRfqs ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '240px' }}>
                        <div style={{ color: '#64748b', fontSize: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                          <div className="pud-spinner" />
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
                      <>
                        <div className="pud-rfq-table-container">
                          <table className="pud-rfq-items-table pud-allrfqs-table">
                            <thead className="ua-table">
                              <tr>
                                <th style={{ width: '48px' }}>S.No</th>
                                <th>RFQ Number</th>
                                <th>Title</th>
                                <th>Organization</th>
                                <th>Delivery Location</th>
                                <th>Closing Date</th>
                                {/* <th>Action</th> */}
                              </tr>
                            </thead>
                            <tbody className="ua-table-body">
                              {allRfqsList.map((rfq: any, idx: number) => (
                                <tr key={rfq.rfqId || idx} onClick={() => handleViewRfqDetailsFullPage(rfq.rfqId)}>
                                  <td style={{ color: '#94a3b8', fontWeight: 600 }}>{(allRfqsPage - 1) * RFQ_PAGE_SIZE + idx + 1}</td>
                                  <td><span className="pud-code-badge">{rfq.rfqNumber}</span></td>
                                  <td style={{ fontWeight: 600, color: '#1e293b' }}>{rfq.title}</td>
                                  <td>{rfq.organizationName}</td>
                                  <td>{rfq.deliveryLocation}</td>
                                  <td>
                                    {rfq.endDate
                                      ? new Date(rfq.endDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                                      : "—"}
                                  </td>
                                  {/* <td>
                                  <button
                                    className="pud-btn pud-btn-outline"
                                    onClick={() => handleViewRfqDetailsFullPage(rfq.rfqId)}
                                  >
                                    View RFQ Details
                                  </button>
                                </td> */}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="pud-pagination pud-allrfqs-pagination">
                          <button
                            type="button"
                            className={`pud-page-btn${allRfqsPage === 1 || loadingAllRfqs ? " pud-page-btn-disabled" : ""}`}
                            onClick={handleAllRfqsPrevPage}
                            disabled={allRfqsPage <= 1 || loadingAllRfqs}
                            aria-label="Previous RFQ page"
                          >
                            <IconChevronLeft />
                          </button>

                          <span className="pud-page-number">Page {allRfqsPage}</span>

                          <button
                            type="button"
                            className={`pud-page-btn${!allRfqsHasMore || loadingAllRfqs ? " pud-page-btn-disabled" : ""}`}
                            onClick={handleAllRfqsNextPage}
                            disabled={!allRfqsHasMore || loadingAllRfqs}
                            aria-label="Next RFQ page"
                          >
                            <IconChevronRight />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </>
              ) : rfqPageView === "rfqDetail" ? (
                <div className="pud-rfq-fullpage-view">
                  <SupplierRfqQuotationSummary
                    selectedRfq={selectedRfq}
                    selectedRfqId={selectedRfqId}
                    ownQuotation={ownQuotation}
                    loadingRfqDetail={loadingRfqDetail}
                    rfqDetailError={rfqDetailError}
                    supplierId={supplierId}
                    onClose={closeRfqDetail}
                    onRetry={handleRetryRfqDetail}
                    setSelectedRfq={setSelectedRfq}
                    setOwnQuotation={setOwnQuotation}
                    onRfqsRefresh={refreshRfqsList}
                  />
                </div>
              ) : (
                <div style={{ padding: "0.5rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                  <div>
                    <h1 className="sad-title">Supplier Admin Command Center</h1>
                    <p className="sad-subtitle">Manage suppliers, track sourcing activities, and oversee operations.</p>
                  </div>
                  {/* 
                  <div className="sad-status-banner">
                    <span className="sad-status-dot" />
                    <div>
                      <div className="sad-status-title">Active Supplier Administration Portal (100%)</div>
                      <div className="sad-status-subtext">
                        You have administrative access to manage supplier operations and user accounts.
                      </div>
                    </div>
                  </div> */}

                  <div className="sad-stats-grid">
                    {statCards.map((stat) => (
                      <div className="sad-stat-card" key={stat.label}>
                        <div className={`sad-stat-icon ${stat.colorClass}`}>{stat.icon}</div>
                        <div className="sad-stat-label">{stat.label}</div>
                        <div className="sad-stat-value">{stat.value}</div>
                        <div className="sad-stat-link">{stat.linkText}</div>
                      </div>
                    ))}
                  </div>

                  <div className="sad-panels">
                    <section className="pud-panel">
                      <div className="pud-panel-header">
                        <div>
                          <div className="pud-panel-title">Recent Sourcing Opportunities</div>
                          <div className="pud-panel-subtitle">Newly listed RFQs matched to your industry categories</div>
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
                        <div className="pud-panel-list" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '180px' }}>
                          <div style={{ color: '#64748b', fontSize: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                            <div className="pud-spinner" />
                            <span>Loading sourcing opportunities...</span>
                          </div>
                        </div>
                      ) : rfqsError ? (
                        <div className="pud-panel-list" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '180px', padding: '16px' }}>
                          <div style={{ color: '#ef4444', fontSize: '14px', textAlign: 'center' }}>
                            {rfqsError}
                          </div>
                        </div>
                      ) : rfqs.length === 0 ? (
                        <div className="pud-panel-list" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '180px', padding: '16px' }}>
                          <div style={{ color: '#64748b', fontSize: '14px', textAlign: 'center' }}>
                            No recent sourcing opportunities found.
                          </div>
                        </div>
                      ) : (
                        <div className="pud-panel-list">
                          {rfqs.slice(0, visibleRfqCount).map((rfq) => (
                            <div className="pud-rfq-row" key={rfq.rfqId} onClick={() => handleViewRfqDetailsFullPage(rfq.rfqId)}>
                              <div className="pud-rfq-info">
                                <div className="pud-rfq-meta">
                                  <span className="pud-code-badge">{rfq.rfqNumber}</span>
                                  <span className="pud-dot-sep">•</span>
                                  <span className="pud-company">{rfq.organizationName}</span>
                                </div>
                                <div className="pud-rfq-title">{rfq.title}</div>
                                <div className="pud-rfq-details">
                                  <span>
                                    <IconCalendar /> Closes: {new Date(rfq.endDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                  </span>
                                  <span>
                                    <IconPin /> Deliv: {rfq.deliveryLocation}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>

                    <section className="sad-panel">
                      <div className="sad-panel-header">
                        <div>
                          <div className="sad-panel-title">Recent Purchase Orders</div>
                          <div className="sad-panel-subtitle">Supplier orders requiring attention</div>
                        </div>
                        <a className="sad-panel-link" href="#">View All →</a>
                      </div>
                      <div className="sad-panel-list">
                        {poItems.map((po) => (
                          <div className="sad-po-row" key={po.code}>
                            <div className="sad-po-info">
                              <div className="sad-po-meta">
                                <span className="sad-po-code">{po.code}</span>
                                <span className={`sad-status-badge sad-status-badge-${po.status.toLowerCase()}`}>
                                  {po.status}
                                </span>
                              </div>
                              <div className="sad-po-company">{po.company}</div>
                              <div className="sad-po-date"><IconCalendar /> Order Date: {po.orderDate}</div>
                            </div>
                            <div className="sad-po-right">
                              <div className="sad-po-amount">{po.amount}</div>
                              <a className="sad-po-process" href="#">Process →</a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>

                  <section className="sad-matchmaker">
                    <div className="sad-matchmaker-header">
                      <div className="sad-matchmaker-title-row">
                        <span className="sad-matchmaker-icon"><IconSparkles /></span>
                        <div className="sad-matchmaker-title">Buyer Network Overview</div>
                      </div>
                      <div className="sad-matchmaker-subtitle">
                        Monitor connected buyers and their engagement with your suppliers.
                      </div>
                    </div>

                    <div className="sad-match-grid">
                      {matchCards.map((card) => (
                        <div className="sad-match-card" key={card.name}>
                          <span className="sad-match-location"><IconPin /> {card.location}</span>
                          <div className="sad-match-top">
                            <div className="sad-match-avatar">{card.initials}</div>
                            <div>
                              <div className="sad-match-name">{card.name}</div>
                              <div className="sad-match-seeking"><NavIconBuilding /> Seeking: {card.seeking}</div>
                            </div>
                          </div>
                          <p className="sad-match-desc">{card.description}</p>
                          <div className="sad-match-rep-row">
                            <span className="sad-match-rep-label">Representative:</span>
                            <span className="sad-match-rep-name">{card.representative}</span>
                          </div>
                          <div className="sad-match-actions">
                            <button
                              className="sad-btn sad-btn-outline sad-btn-flex"
                              onClick={() => setSelectedProfile(card)}
                            >
                              <IconEye /> Profile
                            </button>
                            {card.actionVariant === "message" ? (
                              <button className="sad-btn sad-btn-message sad-btn-flex">
                                <IconMessageSquare /> Message
                              </button>
                            ) : (
                              <button className="sad-btn sad-btn-interest sad-btn-flex">
                                <IconSend /> Send Interest
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="sad-pagination">
                      <button className="sad-page-btn sad-page-btn-disabled" disabled>
                        <IconChevronLeft />
                      </button>
                      <button className="sad-page-btn sad-page-btn-active">
                        <IconChevronRight />
                      </button>
                    </div>
                  </section>
                </div>
              )}
          </main>
        </div>

        {selectedProfile && (
          <div className="sad-modal-overlay" onClick={() => setSelectedProfile(null)}>
            <div className="sad-modal" onClick={(e) => e.stopPropagation()}>
              <div className="sad-modal-header">
                <span className="sad-modal-badge">
                  <IconShieldCheck /> Verified Buyer Partner
                </span>
                <button className="sad-modal-close" onClick={() => setSelectedProfile(null)}>
                  <IconClose />
                </button>
                <h2 className="sad-modal-name">{selectedProfile.name}</h2>
                <div className="sad-modal-meta">
                  <span><IconPin /> {selectedProfile.location}</span>
                  <span><IconGlobe /> {selectedProfile.website}</span>
                </div>
              </div>

              <div className="sad-modal-body">
                <div className="sad-modal-section-title">Organization Description</div>
                <p className="sad-modal-desc">{selectedProfile.description}</p>

                <div className="sad-modal-analytics">
                  <div className="sad-modal-analytics-title">
                    <IconSparkles /> Verified Match Analytics
                  </div>
                  <div className="sad-modal-analytics-grid">
                    <div className="sad-modal-analytics-item">
                      <span className="sad-modal-check"><IconCheckCircle /></span>
                      <div>
                        <div className="sad-modal-analytics-label">Interest Category</div>
                        <div className="sad-modal-analytics-value">{selectedProfile.seeking}</div>
                        <div className="sad-modal-analytics-note">{selectedProfile.categoryNote}</div>
                      </div>
                    </div>
                    <div className="sad-modal-analytics-item">
                      <span className="sad-modal-check"><IconCheckCircle /></span>
                      <div>
                        <div className="sad-modal-analytics-label">Delivery Destination</div>
                        <div className="sad-modal-analytics-value">{selectedProfile.location}</div>
                        <div className="sad-modal-analytics-note">{selectedProfile.destinationNote}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="sad-modal-info-grid">
                  <div>
                    <div className="sad-modal-info-label">Company Representative</div>
                    <div className="sad-modal-info-value">
                      {selectedProfile.representative} ({selectedProfile.repTitle})
                    </div>
                    <a className="sad-modal-info-link" href={`mailto:${selectedProfile.repEmail}`}>
                      {selectedProfile.repEmail}
                    </a>
                  </div>
                  <div>
                    <div className="sad-modal-info-label">Scale of Operations</div>
                    <div className="sad-modal-info-value">Revenue: {selectedProfile.revenue}</div>
                    <div className="sad-modal-info-value">Scale: {selectedProfile.employees}</div>
                  </div>
                </div>
              </div>

              <div className="sad-modal-footer">
                {selectedProfile.actionVariant === "message" ? (
                  <button className="sad-btn sad-btn-message sad-modal-footer-btn">
                    <IconMessageSquare /> Message Buyer
                  </button>
                ) : (
                  <button className="sad-btn sad-btn-interest sad-modal-footer-btn">
                    <IconSend /> Send Interest
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
      <EAuctionWidget />
    </div>
  );
};

export default SupplierAdminDash;
