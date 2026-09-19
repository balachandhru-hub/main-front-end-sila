import React, { useState, useEffect } from "react";
import "./SupplierAdminDash.css";
import "../../../remote-supplier/src/components/SupplierDashboard.css"
import Header from "./Header";
import UserAdmin from "../UserAdmin";
import CompanyProfile from "./CompanyProfile/CompanyProfile";
import Catalog from "../../../remote-supplier/src/components/Catalog";
import Invitations from "../../../remote-supplier/src/components/Invitations";
import SupplierRfqQuotationSummary from "../../../remote-supplier/src/components/SupplierRfqQuotationSummary";
import { useNetworkAdminAuthStore } from "../store/useAuthStore";
import {
  fetchRFQMasterData,
  fetchRFQById,
  fetchSupplierQuotationBySupplierId,
  getSupplierProfile,
  type RFQMasterDataItem,
  type RFQDetailResponse,
  type SupplierQuotationByIdItem,
  fetchSupplierDashboardAnalytics,
} from "../../../remote-supplier/src/api/supplierApi";
import { logoutPlatformUser } from "../api/platformApi";
import { StatusBadge, SupplierAnalytics, isErrorResponse, useAsyncData, useRouteNav, type RouteNavPaths } from "@vosox/shared-ui";
import EAuctionWidget from "../../../remote-supplier/src/components/EAuctionWidget.tsx";

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
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconMail = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 6-10 7L2 6" />
  </svg>
);

const NavIconHome = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <path d="M9 22V12h6v10" />
  </svg>
);

const NavIconUsers = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const NavIconBuilding = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="4" y="2" width="16" height="20" rx="1" />
    <path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01" />
  </svg>
);

const NavIconFile = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
  </svg>
);

const NavIconCatalog = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
  </svg>
);

const IconCalendar = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

const IconPin = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const IconEye = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconMessageSquare = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const IconSend = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
  </svg>
);

const IconSparkles = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="M5 3v4M3 5h4M19 3v4M17 5h4M5 19v4M3 21h4M19 19v4M17 21h4" />
  </svg>
);

const IconChevronLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const IconChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const IconGlobe = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z" />
  </svg>
);

const IconShieldCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const IconCheckCircle = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

/** Each section's URL (/dashboard, /rfqs …); see useRouteNav. */
const SUPPLIER_ADMIN_NAV_PATHS: RouteNavPaths = {
  dashboard: "dashboard",
  userList: "users",
  rfqs: "rfqs",
  catalogList: "catalog",
  invitations: "invitations",
  companyProfile: "company-profile",
};

const headerNavItems: { key: string; icon: React.ReactNode; label: string; badge?: number }[] = [
  { key: "dashboard", icon: <NavIconHome />, label: "Dashboard" },
  { key: "userList", icon: <NavIconUsers />, label: "User List" },
  { key: "rfqs", icon: <NavIconFile />, label: "RFQs" },
  { key: "catalogList", icon: <NavIconCatalog />, label: "Catalog" },
  { key: "invitations", icon: <IconMail />, label: "Invitations" },
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
  const [activeNav, setActiveNav] = useRouteNav(SUPPLIER_ADMIN_NAV_PATHS, "dashboard");
  const [catalogViewContainer, setCatalogViewContainer] = useState<HTMLDivElement | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
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
  const analytics = useAsyncData(fetchSupplierDashboardAnalytics);
  const [loadingRfqs, setLoadingRfqs] = useState(true);
  const [rfqsError, setRfqsError] = useState<string | null>(null);
  const [visibleRfqCount, setVisibleRfqCount] = useState(3);
  const RFQ_INITIAL_VISIBLE = 3;

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

  // The RFQ list has its own URL (/rfqs). When the URL changes by itself (Back/Forward,
  // reload, a shared link), bring the RFQ view in line with it.
  useEffect(() => {
    if (activeNav === "rfqs" && rfqPageView === "dashboard") {
      handleOpenAllRfqs();
    } else if (activeNav !== "rfqs" && rfqPageView === "allRfqs") {
      setRfqPageView("dashboard");
    }
  }, [activeNav]);

  const handleNavClick = (key: string) => {
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
    try {
      await logoutPlatformUser();
    } catch {
      // The session is cleared locally below even when the server call fails.
    } finally {
      sessionStorage.clear();
      deleteCookie(VERIFICATION_TOKEN_COOKIE);
      window.dispatchEvent(new CustomEvent("session:expired"));
      setLoggingOut(false);
    }
  };

  return (
    <Header navItems={headerNavItems} activeNav={activeNav} onNavClick={handleNavClick} onLogout={handleLogout}>
        {/* Catalog renders the catalog page (portalled into catalogViewContainer) and its modals.
            Its own nav widget stays hidden, as before: "Catalog" is already a sidebar entry. */}
        <div hidden>
          <Catalog
            isAdmin={true}
            onShowCatalogList={() => setActiveNav("catalogList")}
            fullViewContainer={activeNav === "catalogList" ? catalogViewContainer : null}
          />
        </div>

        <div className="sad-main">
          <div className="sad-content">
            {activeNav === "catalogList" ? (
              <div ref={setCatalogViewContainer} className="sad-catalog-view" />
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
                    <div className="sad-table-header">
                      <h1 className="pud-title sad-title">All RFQs</h1>
                      <span className="pud-subtitle sad-subtitle">
                        Sourcing opportunities matched to your industry categories.
                      </span>
                    </div>

                    {loadingAllRfqs ? (
                      <div className="sad-state-box">
                        <div className="sad-state-inner">
                          <div className="pud-spinner" aria-hidden="true" />
                          <span>Loading all sourcing opportunities...</span>
                        </div>
                      </div>
                    ) : allRfqsError && allRfqsList.length === 0 ? (
                      <div className="sad-state-message sad-state-error" role="alert">{allRfqsError}</div>
                    ) : allRfqsList.length === 0 ? (
                      <div className="sad-state-message">
                        No RFQs found.
                      </div>
                    ) : (
                      <>
                        <div className="pud-rfq-table-container">
                          <table className="pud-rfq-items-table pud-allrfqs-table">
                            <thead className="ua-table">
                              <tr>
                                <th className="sad-col-sno">S.No</th>
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
                                <tr
                                  key={rfq.rfqId || idx}
                                  className="sad-row-clickable"
                                  tabIndex={0}
                                  onClick={() => handleViewRfqDetailsFullPage(rfq.rfqId)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleViewRfqDetailsFullPage(rfq.rfqId);
                                  }}
                                >
                                  <td className="sad-cell-sno">{(allRfqsPage - 1) * RFQ_PAGE_SIZE + idx + 1}</td>
                                  <td><span className="pud-code-badge sila-ref">{rfq.rfqNumber}</span></td>
                                  <td className="sad-cell-strong">{rfq.title}</td>
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
                <div className="sad-dashboard">
                  <div className="sad-page-header">
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

                  <SupplierAnalytics
                    state={analytics}
                    onViewRfqs={() => handleNavClick("rfqs")}
                    onOpenRfq={handleViewRfqDetailsFullPage}
                  />

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
                        <div className="pud-panel-list sad-panel-state">
                          <div className="sad-state-inner">
                            <div className="pud-spinner" aria-hidden="true" />
                            <span>Loading sourcing opportunities...</span>
                          </div>
                        </div>
                      ) : rfqsError ? (
                        <div className="pud-panel-list sad-panel-state">
                          <div className="sad-state-inner sad-state-error" role="alert">
                            {rfqsError}
                          </div>
                        </div>
                      ) : rfqs.length === 0 ? (
                        <div className="pud-panel-list sad-panel-state">
                          <div className="sad-state-inner">
                            No recent sourcing opportunities found.
                          </div>
                        </div>
                      ) : (
                        <div className="pud-panel-list">
                          {rfqs.slice(0, visibleRfqCount).map((rfq) => (
                            <div
                              className="pud-rfq-row sad-rfq-row"
                              key={rfq.rfqId}
                              role="button"
                              tabIndex={0}
                              onClick={() => handleViewRfqDetailsFullPage(rfq.rfqId)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleViewRfqDetailsFullPage(rfq.rfqId);
                              }}
                            >
                              <div className="pud-rfq-info">
                                <div className="pud-rfq-meta">
                                  <span className="pud-code-badge sila-ref">{rfq.rfqNumber}</span>
                                  <span className="pud-dot-sep" aria-hidden="true">•</span>
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
                          <h2 className="sad-panel-title">Recent Purchase Orders</h2>
                          <div className="sad-panel-subtitle">Supplier orders requiring attention</div>
                        </div>
                        <a className="sad-panel-link" href="#" onClick={(e) => e.preventDefault()}>View All →</a>
                      </div>
                      <div className="sad-panel-list">
                        {poItems.map((po) => (
                          <div className="sad-po-row" key={po.code}>
                            <div className="sad-po-info">
                              <div className="sad-po-meta">
                                <span className="sad-po-code sila-ref">{po.code}</span>
                                <StatusBadge status={po.status} size="sm" />
                              </div>
                              <div className="sad-po-company">{po.company}</div>
                              <div className="sad-po-date"><IconCalendar /> Order Date: {po.orderDate}</div>
                            </div>
                            <div className="sad-po-right">
                              <div className="sad-po-amount">{po.amount}</div>
                              <a className="sad-po-process" href="#" onClick={(e) => e.preventDefault()}>Process →</a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                  </div>

                  <section className="sad-matchmaker">
                    <div className="sad-matchmaker-header">
                      <div className="sad-matchmaker-title-row">
                        <span className="sad-matchmaker-icon" aria-hidden="true"><IconSparkles /></span>
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
                            <div className="sad-match-avatar" aria-hidden="true">{card.initials}</div>
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
                              type="button"
                              className="sad-btn sad-btn-outline sad-btn-flex"
                              onClick={() => setSelectedProfile(card)}
                            >
                              <IconEye /> Profile
                            </button>
                            {card.actionVariant === "message" ? (
                              <button type="button" className="sad-btn sad-btn-message sad-btn-flex">
                                <IconMessageSquare /> Message
                              </button>
                            ) : (
                              <button type="button" className="sad-btn sad-btn-interest sad-btn-flex">
                                <IconSend /> Send Interest
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="sad-pagination">
                      <button type="button" className="sad-page-btn sad-page-btn-disabled" disabled aria-label="Previous page">
                        <IconChevronLeft />
                      </button>
                      <button type="button" className="sad-page-btn sad-page-btn-active" aria-label="Next page">
                        <IconChevronRight />
                      </button>
                    </div>
                  </section>
                </div>
              )}
          </div>
        </div>

        {selectedProfile && (
          <div className="sad-modal-overlay" onClick={() => setSelectedProfile(null)}>
            <div className="sad-modal" role="dialog" aria-modal="true" aria-label={selectedProfile.name} onClick={(e) => e.stopPropagation()}>
              <div className="sad-modal-header">
                <span className="sad-modal-badge">
                  <IconShieldCheck /> Verified Buyer Partner
                </span>
                <button type="button" className="sad-modal-close" onClick={() => setSelectedProfile(null)} aria-label="Close profile">
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
                  <button type="button" className="sad-btn sad-btn-message sad-modal-footer-btn">
                    <IconMessageSquare /> Message Buyer
                  </button>
                ) : (
                  <button type="button" className="sad-btn sad-btn-interest sad-modal-footer-btn">
                    <IconSend /> Send Interest
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

      <EAuctionWidget />
    </Header>
  );
};

export default SupplierAdminDash;
