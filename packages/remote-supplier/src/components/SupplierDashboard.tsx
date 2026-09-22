import React, { useState, useEffect } from "react";
import "./SupplierDashboard.css";
import Catalog from "./Catalog.tsx";
import { CompanyProfile, EmptyState, Loader, PageHeader, Pagination, StatusBadge, SupplierAnalytics, useAsyncData, useRouteNav, type RouteNavPaths } from '@vosox/shared-ui';
// import Invitations from "./Invitations.tsx";
import {
  logoutSupplier,
  fetchRFQMasterData,
  fetchRFQById,
  fetchSupplierQuotationBySupplierId,
  getSupplierProfile,
  type RFQMasterDataItem,
  type RFQDetailResponse,
  type SupplierQuotationByIdItem,
  fetchSupplierDashboardAnalytics,
} from "../api/supplierApi";
import { useLocation } from "react-router-dom";
import Header from "./Header.tsx";
import { useAuth } from '../../../host-app/src/AuthContext.tsx';
import EAuctionWidget from "./EAuctionWidget.tsx";
import SupplierRfqQuotationSummary from "./SupplierRfqQuotationSummary";
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

const NavIconHome = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <path d="M9 22V12h6v10" />
  </svg>
);

const NavIconFile = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
  </svg>
);

const NavIconBuilding = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="1" />
    <path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01" />
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

const IconClose = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
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

const NavIconCatalog = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
  </svg>
);

/** Each section's URL (/dashboard, /rfqs …); see useRouteNav. */
const SUPPLIER_NAV_PATHS: RouteNavPaths = {
  dashboard: 'dashboard',
  rfqs: 'rfqs',
  catalogList: 'catalog',
  invitations: 'invitations',
  companyProfile: 'company-profile',
};

const navItems: { key: string; icon: React.ReactNode; label: string; badge?: number }[] = [
  { key: "dashboard", icon: <NavIconHome />, label: "Dashboard" },
  { key: "rfqs", icon: <NavIconFile />, label: "RFQs" },
  { key: "catalogList", icon: <NavIconCatalog />, label: "Catalog" },
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
    description: "Vertex Labs is a cutting-edge deep tech incubator looking to outfit their brand-new engineering office space with state-of-the-art workstations, high-end developer peripherals, and responsive monitor systems.",
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
    description: "Starlight Group coordinates multi-location boutique hotel lounges and business centers across Europe. Currently expanding common areas across three new properties and sourcing durable, design-forward furniture.",
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
    description: "Vanguard supplies administrative desks and corporate centers with specialized FSC certified eco-friendly writing materials, premium notebooks, and recycled paper goods.",
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
    description: "Horizon BioTech operates premium research facilities and corporate office buildings. They require high-volume premium organic coffee, snacks, and breakroom essentials across all sites.",
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

const SupplierDashboard: React.FC = () => {


  const [activeNav, setActiveNav] = useRouteNav(SUPPLIER_NAV_PATHS, "dashboard");
  const [selectedProfile, setSelectedProfile] = useState<MatchCard | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [catalogViewContainer, setCatalogViewContainer] = useState<HTMLDivElement | null>(null);

  const { auth } = useAuth();
  const [supplierId, setSupplierId] = useState<string | null>(auth?.supplierId ?? null);

  useEffect(() => {
    if (auth?.supplierId) {
      setSupplierId(auth.supplierId);
    }
  }, [auth?.supplierId]);
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
    const loadSupplierProfile = async () => {
      if (!supplierId) {
        try {
          const profile = await getSupplierProfile();
          if (profile && 'id' in profile && profile.id) {
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
        if (Array.isArray(data)) {
          setRfqs(data);
          setVisibleRfqCount(Math.min(RFQ_INITIAL_VISIBLE, data.length));
        }
      } catch (err: any) {

        setRfqsError(err.message || "Failed to load sourcing opportunities.");
      } finally {
        setLoadingRfqs(false);
      }
    };
    loadRfqs();
  }, [supplierId]);

  const location = useLocation();

  useEffect(() => {
    const intendedView = (location.state as { view?: string })?.view;
    if (intendedView === "companyProfile") {
      setActiveNav("companyProfile");
    }
  }, [location.state]);



  const handleViewRfqDetails = async (rfqId: string) => {
    setSelectedRfqId(rfqId);
    setLoadingRfqDetail(true);
    setRfqDetailError(null);
    setSelectedRfq(null);
    setOwnQuotation(null);
    try {
      const data = await fetchRFQById(rfqId);
      if (data && 'title' in data) {
        setSelectedRfq(data);
      } else {
        setRfqDetailError("Failed to load RFQ details.");
      }
    } catch (err: any) {
      setRfqDetailError(err.message || "Failed to load RFQ details.");
    } finally {
      setLoadingRfqDetail(false);
    }

    // Independently fetch this supplier's own quotation for this RFQ.
    // Multiple suppliers can quote on the same RFQ, so rfq-by-id's
    try {
      const quotationData = await fetchSupplierQuotationBySupplierId(rfqId);
      if (quotationData && 'suppliers' in quotationData && Array.isArray(quotationData.suppliers)) {
        const mine =
          quotationData.suppliers.find((s) => s.supplierId === supplierId) ||
          quotationData.suppliers[0] ||
          null;
        setOwnQuotation(mine);
      }
    } catch {
      // non-fatal — form will just fall back to defaults
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

  const RFQ_PAGE_SIZE = 10;
  const [allRfqsList, setAllRfqsList] = useState<RFQMasterDataItem[]>([]);
  const [loadingAllRfqs, setLoadingAllRfqs] = useState(false);
  const [allRfqsError, setAllRfqsError] = useState<string | null>(null);
  const [allRfqsPage, setAllRfqsPage] = useState(1);
  const [hasNextRfqPage, setHasNextRfqPage] = useState(false);

  const getAllRfqsRange = (page: number) => {
    const index = (page - 1) * RFQ_PAGE_SIZE;
    const limit = RFQ_PAGE_SIZE;
    return { index, limit };
  };

  const fetchAllRfqsPage = async (page: number, overrideSupplierId?: string | null): Promise<boolean> => {
    const targetSuppId = overrideSupplierId !== undefined ? overrideSupplierId : supplierId;

    if (!targetSuppId) {
      if (rfqs.length > 0) {
        const start = (page - 1) * RFQ_PAGE_SIZE;
        const pageData = rfqs.slice(start, start + RFQ_PAGE_SIZE);
        setAllRfqsList(pageData);
        setHasNextRfqPage(start + RFQ_PAGE_SIZE < rfqs.length);
        return pageData.length > 0;
      }
      setLoadingAllRfqs(true);
      return false;
    }

    setLoadingAllRfqs(true);
    setAllRfqsError(null);

    try {
      const { index, limit } = getAllRfqsRange(page);

      const data = await fetchRFQMasterData({
        supplierId: targetSuppId,
        index,
        limit,
      });

      if (!Array.isArray(data)) {
        setAllRfqsError("Failed to load RFQs.");
        setAllRfqsList([]);
        setHasNextRfqPage(false);
        return false;
      }

      setAllRfqsList(data);
      setHasNextRfqPage(data.length >= RFQ_PAGE_SIZE);

      return data.length > 0;
    } catch (err: any) {
      setAllRfqsError(err?.message || "Failed to load the RFQ page.");
      setAllRfqsList([]);
      setHasNextRfqPage(false);
      return false;
    } finally {
      setLoadingAllRfqs(false);
    }
  };

  const handleOpenAllRfqs = async () => {
    setActiveNav("rfqs");
    setRfqPageView("allRfqs");

    if (loadingAllRfqs) return;

    setAllRfqsPage(1);
    await fetchAllRfqsPage(1);
  };

  const handleNextRfqPage = async () => {
    if (loadingAllRfqs || !hasNextRfqPage) return;

    const currentPage = allRfqsPage;
    const nextPage = currentPage + 1;
    const currentPageData = allRfqsList;

    const loaded = await fetchAllRfqsPage(nextPage);

    if (loaded) {
      setAllRfqsPage(nextPage);
    } else {
      setAllRfqsList(currentPageData);
      setHasNextRfqPage(false);
    }
  };

  const handlePreviousRfqPage = async () => {
    if (loadingAllRfqs || allRfqsPage <= 1) return;

    const previousPage = allRfqsPage - 1;
    const loaded = await fetchAllRfqsPage(previousPage);

    if (loaded) {
      setAllRfqsPage(previousPage);
      setHasNextRfqPage(true);
    }
  };

  const handleBackToDashboard = () => {
    setRfqPageView("dashboard");
    setActiveNav("dashboard");
    setSelectedRfqId(null);
    setSelectedRfq(null);
    setRfqDetailError(null);
  };

  // The RFQ list has its own URL (/rfqs). When the URL changes by itself (Back/Forward,
  // reload, a shared link), bring the RFQ view in line with it.
  useEffect(() => {
    if (activeNav === "rfqs") {
      if (rfqPageView === "dashboard") {
        setRfqPageView("allRfqs");
      }
      if (supplierId) {
        fetchAllRfqsPage(allRfqsPage > 0 ? allRfqsPage : 1, supplierId);
      }
    } else if (activeNav !== "rfqs" && rfqPageView === "allRfqs") {
      setRfqPageView("dashboard");
    }
  }, [activeNav, supplierId]);

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
  };

  const handleRetryRfqDetail = () => {
    if (selectedRfqId) handleViewRfqDetails(selectedRfqId);
  };

  const refreshRfqsList = async () => {
    if (!supplierId) return;
    const listData = await fetchRFQMasterData({ supplierId, index: 0, limit: 10 });
    if (Array.isArray(listData)) {
      setRfqs(listData);
    }
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logoutSupplier();
    } catch {
      // The session is cleared locally below even when the server call fails.
    } finally {
      sessionStorage.clear();
      deleteCookie(VERIFICATION_TOKEN_COOKIE);
      window.dispatchEvent(new CustomEvent("session:expired"));
      setLoggingOut(false);
    }
  };

  const formatShortDate = (value?: string | null) =>
    value ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : null;

  const onActivateKey = (event: React.KeyboardEvent, action: () => void) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      action();
    }
  };

  return (
    <Header navItems={navItems} activeNav={activeNav} onNavClick={handleNavClick} onLogout={handleLogout}>
        {/* Catalog renders the catalog page (portalled into catalogViewContainer) and its modals.
            Its own nav widget stays hidden, as before: "Catalog" is already a sidebar entry. */}
        <div hidden>
          <Catalog
            onShowCatalogList={() => setActiveNav("catalogList")}
            fullViewContainer={activeNav === "catalogList" ? catalogViewContainer : null}
          />
        </div>

        <div className="pud-main">
          <div className="pud-content">
            {activeNav === "catalogList" ? (
              <div ref={setCatalogViewContainer} />
            ) : rfqPageView === "allRfqs" ? (
              <>
                <PageHeader
                  className="pud-page-header"
                  title="All RFQs"
                  description="Sourcing opportunities matched to your industry categories."
                  onBack={handleBackToDashboard}
                  backLabel="Back to Dashboard"
                />

                <section className="sila-card pud-allrfqs-card">
                  {loadingAllRfqs ? (
                    <Loader size={24} message="Loading all sourcing opportunities..." />
                  ) : allRfqsError && allRfqsList.length === 0 ? (
                    <EmptyState variant="error" title="Couldn't load RFQs" description={allRfqsError} />
                  ) : allRfqsList.length === 0 ? (
                    <EmptyState title="No RFQs found." />
                  ) : (
                    <>
                      <div className="sila-table-wrap">
                        <table className="sila-table pud-allrfqs-table">
                          <thead>
                            <tr>
                              <th className="pud-col-index" scope="col">S.No</th>
                              <th scope="col">RFQ Number</th>
                              <th scope="col">Title</th>
                              <th scope="col">Organization</th>
                              <th scope="col">Delivery Location</th>
                              <th scope="col">Closing Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {allRfqsList.map((rfq: any, idx: number) => (
                              <tr
                                key={rfq.rfqId || idx}
                                className="sila-row-clickable"
                                tabIndex={0}
                                onClick={() => handleViewRfqDetailsFullPage(rfq.rfqId)}
                                onKeyDown={(e) => onActivateKey(e, () => handleViewRfqDetailsFullPage(rfq.rfqId))}
                              >
                                <td className="sila-cell-muted pud-col-index">
                                  {(allRfqsPage - 1) * RFQ_PAGE_SIZE + idx + 1}
                                </td>
                                <td><span className="sila-ref">{rfq.rfqNumber}</span></td>
                                <td className="sila-cell-strong pud-allrfqs-title">{rfq.title}</td>
                                <td>{rfq.organizationName}</td>
                                <td>{rfq.deliveryLocation}</td>
                                <td className="pud-allrfqs-date">{formatShortDate(rfq.endDate) ?? "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <Pagination
                        page={allRfqsPage}
                        hasNext={hasNextRfqPage}
                        onPrevious={handlePreviousRfqPage}
                        onNext={handleNextRfqPage}
                        disabled={loadingAllRfqs}
                      />
                    </>
                  )}
                </section>
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
            ) : activeNav === "companyProfile" ? (
              <CompanyProfile
                mode="network-admin"
                entityLabel="Supplier"
                fetchProfile={async () => {
                  const profile = await getSupplierProfile();
                  if (profile && 'id' in profile) {
                    return profile as any;
                  }
                  return null;
                }}
              />) : (
              // ) : activeNav === "invitations" ? (
              //   <Invitations />
              // ) : (
              <>
                <PageHeader
                  className="pud-page-header"
                  title="Supplier Operations Command"
                  description="Real-time procurement tracking, bid submittals, and transaction monitoring."
                />

                <SupplierAnalytics
                  state={analytics}
                  onViewRfqs={() => handleNavClick("rfqs")}
                  onOpenRfq={handleViewRfqDetailsFullPage}
                />

                <div className="pud-panels">
                  <section className="sila-card pud-dash-card">
                    <div className="sila-card-header">
                      <div>
                        <h2 className="sila-card-title">Recent Sourcing Opportunities</h2>
                        <p className="sila-card-subtitle">Newly listed RFQs matched to your industry categories</p>
                      </div>
                      {!loadingRfqs && !rfqsError && rfqs.length > 0 && (
                        <button
                          type="button"
                          className="sila-btn sila-btn--ghost sila-btn--sm pud-card-link"
                          onClick={() => handleOpenAllRfqs()}
                        >
                          View all RFQs <IconChevronRight />
                        </button>
                      )}
                    </div>
                    {loadingRfqs ? (
                      <Loader size={24} message="Loading sourcing opportunities..." />
                    ) : rfqsError ? (
                      <EmptyState variant="error" title="Couldn't load sourcing opportunities" description={rfqsError} />
                    ) : rfqs.length === 0 ? (
                      <EmptyState
                        title="No matching RFQs right now"
                        icon={
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.3-4.3" />
                          </svg>
                        }
                      />
                    ) : (
                      <ul className="pud-panel-list pud-dash-list">
                        {rfqs.slice(0, visibleRfqCount).map((rfq) => (
                          <li key={rfq.rfqId}>
                            <div
                              className="pud-rfq-card-item"
                              onClick={() => handleViewRfqDetailsFullPage(rfq.rfqId)}
                              onKeyDown={(e) => onActivateKey(e, () => handleViewRfqDetailsFullPage(rfq.rfqId))}
                              role="button"
                              tabIndex={0}
                            >
                              <div className="pud-rfq-meta">
                                <span className="sila-ref">{rfq.rfqNumber}</span>
                                <span className="pud-dot-sep" aria-hidden="true">·</span>
                                <span className="pud-company">{rfq.organizationName}</span>
                              </div>
                              <div className="pud-rfq-title pud-rfq-link-title">{rfq.title}</div>
                              <div className="pud-rfq-details">
                                <span>
                                  <IconCalendar /> Closes: {formatShortDate(rfq.endDate) ?? 'Open'}
                                </span>
                                <span>
                                  <IconPin /> Deliv: {rfq.deliveryLocation}
                                </span>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  <section className="sila-card pud-dash-card">
                    <div className="sila-card-header">
                      <div>
                        <h2 className="sila-card-title">Recent Purchase Orders</h2>
                        <p className="sila-card-subtitle">New orders requiring attention</p>
                      </div>
                      <button type="button" className="sila-btn sila-btn--ghost sila-btn--sm pud-card-link">
                        View all <IconChevronRight />
                      </button>
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

                <section className="sila-card pud-matchmaker-card">
                  <div className="sila-card-header">
                    <div className="pud-matchmaker-title-row">
                      <span className="pud-matchmaker-icon" aria-hidden="true"><IconSparkles /></span>
                      <div>
                        <h2 className="sila-card-title">Smart Sourcing Matchmaker</h2>
                        <p className="sila-card-subtitle">
                          Active enterprise buyers looking for products and services matching your certified categories and registered ship-to locations.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="sila-card-body">
                    <div className="pud-match-grid">
                      {matchCards.map((card) => (
                        <article className="pud-match-card" key={card.name}>
                          <div className="pud-match-top">
                            <div className="pud-match-avatar" aria-hidden="true">{card.initials}</div>
                            <div className="pud-match-heading">
                              <h3 className="pud-match-name">{card.name}</h3>
                              <div className="pud-match-seeking"><NavIconBuilding /> Seeking: {card.seeking}</div>
                            </div>
                            <span className="pud-match-location"><IconPin /> {card.location}</span>
                          </div>
                          <p className="pud-match-desc">{card.description}</p>
                          <div className="pud-match-rep-row">
                            <span className="pud-match-rep-label">Representative</span>
                            <span className="pud-match-rep-name">{card.representative}</span>
                          </div>
                          <div className="pud-match-actions">
                            <button
                              type="button"
                              className="sila-btn sila-btn--secondary sila-btn--sm"
                              onClick={() => setSelectedProfile(card)}
                            >
                              <IconEye /> Profile
                            </button>
                            {card.actionVariant === "message" ? (
                              <button type="button" className="sila-btn sila-btn--primary sila-btn--sm">
                                <IconMessageSquare /> Message
                              </button>
                            ) : (
                              <button type="button" className="sila-btn sila-btn--primary sila-btn--sm">
                                <IconSend /> Send Interest
                              </button>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>

                  <div className="sila-pagination pud-match-pagination">
                    <span />
                    <div className="sila-pagination-pages">
                      <button type="button" className="sila-page-btn" disabled aria-label="Previous matches">
                        <IconChevronLeft />
                      </button>
                      <button type="button" className="sila-page-btn" aria-label="Next matches">
                        <IconChevronRight />
                      </button>
                    </div>
                  </div>
                </section>
              </>
            )}
          </div>
        </div>

        {selectedProfile && (
          <div className="sila-overlay pud-profile-overlay" onClick={() => setSelectedProfile(null)}>
            <div
              className="sila-modal sila-modal--lg pud-profile-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="pud-profile-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sila-modal-header">
                <div className="pud-profile-heading">
                  <StatusBadge
                    status="Verified"
                    size="sm"
                    label={<><IconShieldCheck /> Verified Sourcing Partner</>}
                  />
                  <h2 className="sila-modal-title" id="pud-profile-title">{selectedProfile.name}</h2>
                  <div className="pud-profile-meta">
                    <span><IconPin /> {selectedProfile.location}</span>
                    <span><IconGlobe /> {selectedProfile.website}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="sila-btn sila-btn--ghost sila-btn--icon sila-btn--sm"
                  onClick={() => setSelectedProfile(null)}
                  aria-label="Close profile"
                >
                  <IconClose />
                </button>
              </div>

              <div className="sila-modal-body">
                <h3 className="pud-profile-section-title">Organization Description</h3>
                <p className="pud-profile-desc">{selectedProfile.description}</p>

                <div className="pud-profile-analytics">
                  <h3 className="pud-profile-section-title">
                    <IconSparkles /> Verified Match Analytics
                  </h3>
                  <div className="pud-profile-analytics-grid">
                    <div className="pud-profile-analytics-item">
                      <span className="pud-profile-check" aria-hidden="true"><IconCheckCircle /></span>
                      <div>
                        <div className="sila-meta-label">Interest Category</div>
                        <div className="sila-meta-value">{selectedProfile.seeking}</div>
                        <div className="pud-profile-note">{selectedProfile.categoryNote}</div>
                      </div>
                    </div>
                    <div className="pud-profile-analytics-item">
                      <span className="pud-profile-check" aria-hidden="true"><IconCheckCircle /></span>
                      <div>
                        <div className="sila-meta-label">Delivery Destination</div>
                        <div className="sila-meta-value">{selectedProfile.location}</div>
                        <div className="pud-profile-note">{selectedProfile.destinationNote}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <dl className="sila-meta-grid pud-profile-info">
                  <div className="sila-meta-item">
                    <dt className="sila-meta-label">Company Representative</dt>
                    <dd className="sila-meta-value">
                      {selectedProfile.representative} ({selectedProfile.repTitle})
                    </dd>
                    <dd className="pud-profile-link-row">
                      <a className="pud-profile-link" href={`mailto:${selectedProfile.repEmail}`}>
                        {selectedProfile.repEmail}
                      </a>
                    </dd>
                  </div>
                  <div className="sila-meta-item">
                    <dt className="sila-meta-label">Scale of Operations</dt>
                    <dd className="sila-meta-value">Revenue: {selectedProfile.revenue}</dd>
                    <dd className="sila-meta-value">Scale: {selectedProfile.employees}</dd>
                  </div>
                </dl>
              </div>

              <div className="sila-modal-footer">
                {selectedProfile.actionVariant === "message" ? (
                  <button type="button" className="sila-btn sila-btn--primary">
                    <IconMessageSquare /> Message Buyer
                  </button>
                ) : (
                  <button type="button" className="sila-btn sila-btn--primary">
                    <IconSend /> Send Interest
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

      <EAuctionWidget supplierId={supplierId} />
    </Header>
  );
};

export default SupplierDashboard;
