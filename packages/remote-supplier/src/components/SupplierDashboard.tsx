import React, { useState, useEffect } from "react";
import SilaLogo from "../assets/SILA_Logo.png";
import "./SupplierDashboard.css";
import Catalog from "./Catalog.tsx";
import { CompanyProfile } from '@vosox/shared-ui';
import {
  logoutSupplier,
  fetchRFQMasterData,
  fetchRFQById,
  getSupplierProfile,
  submitSupplierQuotation,
  submitRfqAnswers,
  fetchMetadataReferenceList,
  type RFQMasterDataItem,
  type RFQDetailResponse,
  type SubmitQuotationPayload,
  type RfqDocumentAssetDto
} from "../api/supplierApi";
import { useNavigate, useLocation } from "react-router-dom";

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

const NavIconHome = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <path d="M9 22V12h6v10" />
  </svg>
);

const NavIconMail = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 6-10 7L2 6" />
  </svg>
);

const NavIconFile = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
  </svg>
);

const NavIconUser = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
  </svg>
);

const NavIconBag = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
    <path d="M3 6h18" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);

const NavIconContract = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 2h8l4 4v16H4V2z" />
    <path d="M8 2v4H4" />
  </svg>
);

const NavIconInvoice = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const NavIconPayment = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M2 10h20" />
  </svg>
);

const NavIconMessage = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const NavIconBuilding = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="1" />
    <path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01" />
  </svg>
);

const NavIconSettings = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const LogoutIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const IconCheck = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
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

const navItemsBeforeCatalog = [
  { icon: <NavIconHome />, label: "Dashboard", active: true },
  { icon: <NavIconMail />, label: "Invitations", badge: 2 },
  { icon: <NavIconFile />, label: "RFQs", badge: 2 },
  { icon: <NavIconUser />, label: "Quotations" },
];

const navItemsAfterCatalog = [
  { icon: <NavIconBag />, label: "Purchase Orders" },
  { icon: <NavIconContract />, label: "Contracts" },
  { icon: <NavIconInvoice />, label: "Invoices" },
  { icon: <NavIconPayment />, label: "Payments" },
  { icon: <NavIconMessage />, label: "Messages" },
  { icon: <NavIconBuilding />, label: "Company Profile" },
  { icon: <NavIconSettings />, label: "Settings" },
];

const statCards: StatCard[] = [
  { icon: <IconMail />, label: "INVITATIONS", value: 2, linkText: "Pending review >", colorClass: "pud-stat-icon-blue" },
  { icon: <IconFile />, label: "ACTIVE RFQS", value: 2, linkText: "Bids open >", colorClass: "pud-stat-icon-indigo" },
  { icon: <IconTrend />, label: "BIDS SUBMITTED", value: 3, linkText: "Track outcomes", colorClass: "pud-stat-icon-green" },
  { icon: <IconBag />, label: "PURCHASE ORDER", value: 4, linkText: "Accept orders >", colorClass: "pud-stat-icon-purple" },
  { icon: <IconInvoice />, label: "DUE INVOICES", value: 2, linkText: "Invoice list >", colorClass: "pud-stat-icon-orange" },
  { icon: <IconBell />, label: "NOTIFICATIONS", value: 3, linkText: "Inquiries & Alerts >", colorClass: "pud-stat-icon-teal" },
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

const SupplierDashboard: React.FC = () => {
  const navigate = useNavigate();
  const organizationName =
    sessionStorage.getItem("vosox_organization_name") || "Apex Office & Technology Supp...";
  const firstLetter = organizationName.trim().charAt(0).toUpperCase();

  const [activeView, setActiveView] = useState<"dashboard" | "catalogList" | "companyProfile">("dashboard");
  const [catalogViewContainer, setCatalogViewContainer] = useState<HTMLDivElement | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<MatchCard | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const [supplierId, setSupplierId] = useState<string | null>(
    sessionStorage.getItem("vosox_supplier_id")
  );
  const [rfqs, setRfqs] = useState<RFQMasterDataItem[]>([]);
  const [loadingRfqs, setLoadingRfqs] = useState(true);
  const [rfqsError, setRfqsError] = useState<string | null>(null);
  const [visibleRfqCount, setVisibleRfqCount] = useState(3);
  const [hasMoreRfqs, setHasMoreRfqs] = useState(true);
  const [loadingMoreRfqs, setLoadingMoreRfqs] = useState(false);
  const RFQ_INITIAL_VISIBLE = 3;
  const RFQ_PAGE_SIZE = 5;

  const [selectedRfqId, setSelectedRfqId] = useState<string | null>(null);
  const [selectedRfq, setSelectedRfq] = useState<RFQDetailResponse | null>(null);
  const [loadingRfqDetail, setLoadingRfqDetail] = useState(false);
  const [rfqDetailError, setRfqDetailError] = useState<string | null>(null);

  const [rfqAnswers, setRfqAnswers] = useState<{
    [questionId: string]: {
      rfqQuestionId: string;
      answer: string;
      questionOptionId: string | null;
      questionOptionIds: string[];
      file?: File;
      fileBase64?: string;
      contentType?: string;
    };
  }>({});
  const [submittingAnswers, setSubmittingAnswers] = useState(false);
  const [submitAnswersError, setSubmitAnswersError] = useState<string | null>(null);
  const [submitAnswersSuccess, setSubmitAnswersSuccess] = useState(false);

  // Fetch supplier profile if supplierId is not in sessionStorage
  useEffect(() => {
    const loadSupplierProfile = async () => {
      if (!supplierId) {
        try {
          const profile = await getSupplierProfile();
          if (profile?.id) {
            sessionStorage.setItem("vosox_supplier_id", profile.id);
            setSupplierId(profile.id);
          } else {
            setRfqsError("Supplier profile not found. Please complete onboarding.");
            setLoadingRfqs(false);
          }
        } catch (err: any) {
          console.error("Failed to load supplier profile", err);
          setRfqsError("Failed to load supplier profile details.");
          setLoadingRfqs(false);
        }
      }
    };
    loadSupplierProfile();
  }, [supplierId]);

  // Fetch Recent Sourcing Opportunities
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
        setRfqs(data);
        setVisibleRfqCount(Math.min(RFQ_INITIAL_VISIBLE, data.length));
        setHasMoreRfqs(data.length === initialLimit);
      } catch (err: any) {
        console.error("Failed to load RFQs", err);
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
      setActiveView("companyProfile");
    }
  }, [location.state]);

  const handleViewMoreRfqs = async () => {
    if (loadingMoreRfqs) return;

    if (visibleRfqCount < rfqs.length) {
      setVisibleRfqCount((v) => Math.min(v + RFQ_PAGE_SIZE, rfqs.length));
      return;
    }

    if (!supplierId || !hasMoreRfqs) return;

    setLoadingMoreRfqs(true);
    try {
      const nextPage = await fetchRFQMasterData({
        supplierId,
        index: rfqs.length,
        limit: RFQ_PAGE_SIZE,
      });
      setRfqs((prev) => [...prev, ...nextPage]);
      setVisibleRfqCount((v) => v + nextPage.length);
      setHasMoreRfqs(nextPage.length === RFQ_PAGE_SIZE);
    } catch (err: any) {
      console.error("Failed to load more RFQs", err);
      setRfqsError(err.message || "Failed to load more sourcing opportunities.");
    } finally {
      setLoadingMoreRfqs(false);
    }
  };

  const handleViewRfqDetails = async (rfqId: string) => {
    setSelectedRfqId(rfqId);
    setLoadingRfqDetail(true);
    setRfqDetailError(null);
    setSelectedRfq(null);
    try {
      const data = await fetchRFQById(rfqId);
      setSelectedRfq(data);
    } catch (err: any) {
      console.error("Failed to fetch RFQ details", err);
      setRfqDetailError(err.message || "Failed to load RFQ details.");
    } finally {
      setLoadingRfqDetail(false);
    }
  };

  // Quotation form fields states
  const [quoteQuotationId, setQuoteQuotationId] = useState<string | null>(null);
  const [quoteTotalPrice, setQuoteTotalPrice] = useState<number>(0);
  const [quoteDeliveryCharge, setQuoteDeliveryCharge] = useState<number>(0);
  const [quoteDeliveryType, setQuoteDeliveryType] = useState<string>("PERCENTAGE");
  const [quoteDiscount, setQuoteDiscount] = useState<number>(0);
  const [quoteDiscountType, setQuoteDiscountType] = useState<string>("PERCENTAGE");
  const [quoteTax, setQuoteTax] = useState<number>(0);
  const [quoteTaxType, setQuoteTaxType] = useState<string>("PERCENTAGE");
  const [quoteItemPrices, setQuoteItemPrices] = useState<{ [key: string]: number }>({});

  const [submittingQuote, setSubmittingQuote] = useState(false);
  const [submitQuoteError, setSubmitQuoteError] = useState<string | null>(null);
  const [submitQuoteSuccess, setSubmitQuoteSuccess] = useState(false);

  // Initialize/Populate quotation form state when selectedRfq changes
  useEffect(() => {
    if (selectedRfq) {
      const activeQuote = selectedRfq.supplierQuotation?.[0];
      if (activeQuote) {
        setQuoteQuotationId(activeQuote.qutationId || activeQuote.id || null);
        setQuoteTotalPrice(activeQuote.totalPrice || 0);
        setQuoteDeliveryCharge(activeQuote.deliveryCharge || 0);
        setQuoteDeliveryType(activeQuote.deliveryType || "PERCENTAGE");
        setQuoteDiscount(activeQuote.discount || 0);
        setQuoteDiscountType(activeQuote.discountType || "PERCENTAGE");
        setQuoteTax(activeQuote.tax || 0);
        setQuoteTaxType(activeQuote.taxType || "PERCENTAGE");
      } else {
        setQuoteQuotationId(null);
        setQuoteTotalPrice(0);
        setQuoteDeliveryCharge(0);
        setQuoteDeliveryType("PERCENTAGE");
        setQuoteDiscount(0);
        setQuoteDiscountType("PERCENTAGE");
        setQuoteTax(0);
        setQuoteTaxType("PERCENTAGE");
      }

      const prices: { [key: string]: number } = {};
      selectedRfq.items?.forEach((item, idx) => {
        const itemQuote = selectedRfq.supplierQuotationItems?.[idx];
        const key = item.id || item.buyerRFQItemId || `item-${idx}`;
        prices[key] = itemQuote?.quotedPrice ?? 0;
      });
      setQuoteItemPrices(prices);
      setSubmitQuoteSuccess(false);
      setSubmitQuoteError(null);
      const answers: typeof rfqAnswers = {};
      selectedRfq.questions?.forEach((q) => {
        answers[q.questionId] = {
          rfqQuestionId: q.questionId,
          answer: "",
          questionOptionId: null,
          questionOptionIds: [],
        };
      });
      setRfqAnswers(answers);
      setSubmitAnswersSuccess(false);
      setSubmitAnswersError(null);
    }
  }, [selectedRfq]);

  // Price Calculation helpers
  const handleItemPriceChange = (key: string, value: number) => {
    const updatedPrices = { ...quoteItemPrices, [key]: value };
    setQuoteItemPrices(updatedPrices);
  };

  const handleOtherFieldChange = (field: string, value: any) => {
    if (field === "deliveryCharge") {
      setQuoteDeliveryCharge(Number(value) || 0);
    } else if (field === "tax") {
      setQuoteTax(Number(value) || 0);
    } else if (field === "discount") {
      setQuoteDiscount(Number(value) || 0);
    } else if (field === "deliveryType") {
      setQuoteDeliveryType(value);
    } else if (field === "discountType") {
      setQuoteDiscountType(value);
    } else if (field === "taxType") {
      setQuoteTaxType(value);
    } else if (field === "totalPrice") {
      setQuoteTotalPrice(Number(value) || 0);
    }
  };

  const handleTextAnswerChange = (questionId: string, value: string) => {
    setRfqAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...(prev[questionId] || { rfqQuestionId: questionId, questionOptionId: null, questionOptionIds: [] }),
        rfqQuestionId: questionId,
        answer: value,
      },
    }));
  };

  const handleRadioAnswerChange = (questionId: string, optionId: string) => {
    setRfqAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...(prev[questionId] || { rfqQuestionId: questionId, answer: "" }),
        rfqQuestionId: questionId,
        questionOptionId: optionId,
        questionOptionIds: [optionId],
      },
    }));
  };

  const handleCheckboxAnswerChange = (questionId: string, optionId: string, checked: boolean) => {
    setRfqAnswers((prev) => {
      const current = prev[questionId]?.questionOptionIds || [];
      const updated = checked ? [...current, optionId] : current.filter((id) => id !== optionId);
      return {
        ...prev,
        [questionId]: {
          ...(prev[questionId] || { rfqQuestionId: questionId, answer: "", questionOptionId: null }),
          rfqQuestionId: questionId,
          questionOptionIds: updated,
        },
      };
    });
  };

  const handleFileAnswerChange = (questionId: string, file: File | null) => {
    if (!file) {
      setRfqAnswers((prev) => ({
        ...prev,
        [questionId]: {
          ...(prev[questionId] || { rfqQuestionId: questionId, answer: "", questionOptionId: null, questionOptionIds: [] }),
          rfqQuestionId: questionId,
          answer: "",
          file: undefined,
          fileBase64: "",
          contentType: "",
        },
      }));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1] || result;
      setRfqAnswers((prev) => ({
        ...prev,
        [questionId]: {
          ...(prev[questionId] || { rfqQuestionId: questionId, answer: "", questionOptionId: null, questionOptionIds: [] }),
          rfqQuestionId: questionId,
          answer: file.name,
          file: file,
          fileBase64: base64Data,
          contentType: file.type,
        },
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitRfqAnswers = async () => {
    if (!selectedRfq) return;
    const supplierRFQId = selectedRfq.items?.[0]?.supplierRFQId || null;

    // Basic validation: make sure every required question has been answered
    const unanswered = (selectedRfq.questions || []).find((q) => {
      if (!q.isRequired) return false;
      const a = rfqAnswers[q.questionId];
      if (!a) return true;
      if (q.questionType === "Text") return !a.answer?.trim();
      if (q.questionType === "Radio") return !a.questionOptionId;
      if (q.questionType === "File" || q.questionType === "FILE") return !a.file;
      return (a.questionOptionIds?.length ?? 0) === 0;
    });
    if (unanswered) {
      setSubmitAnswersError(`Please answer the required question: "${unanswered.question}"`);
      return;
    }

    setSubmittingAnswers(true);
    setSubmitAnswersError(null);
    setSubmitAnswersSuccess(false);
    try {
      // Resolve the SUPPLIER entity type/id once for all file answers in this submission
      const entityTypes = await fetchMetadataReferenceList(['ENTITY_TYPE']);
      const supplierEntityId =
        entityTypes.find((e) => e.key === 'SUPPLIER')?.id || '59476530-3c10-438b-b3b3-9db9e96e8d93';
      const entityType = entityTypes.find((e) => e.key === 'SUPPLIER')?.key || 'SUPPLIER';

      const payload = {
        supplierRFQId: supplierRFQId as string,
        answers: Object.values(rfqAnswers).map((a) => {
          const question = selectedRfq.questions?.find(q => q.questionId === a.rfqQuestionId);
          const allOptionIds = question?.options?.map(opt => opt.optionId) || [];

          // Build the attachment from the file the supplier actually uploaded for this answer
          const answerAttachment: RfqDocumentAssetDto | null =
            a.file && a.fileBase64
              ? {
                entityType: entityType,
                entityId: supplierEntityId,
                assetType: "RFQ_ANSWER_ATTACHMENT",
                fileBytes: a.fileBase64,
                fileName: a.file.name,
                contentType: a.contentType || a.file.type,
                isSingletonAsset: true,
              }
              : null;

          return {
            rfqQuestionId: a.rfqQuestionId,
            answer: a.answer || "",
            questionOptionId: a.questionOptionId || (a.questionOptionIds?.length ? a.questionOptionIds[0] : null),
            questionOptionIds: allOptionIds,
            attachment: answerAttachment
          };
        }),
      };

      await submitRfqAnswers(payload);
      setSubmitAnswersSuccess(true);
    } catch (err: any) {
      console.error("Failed to submit RFQ answers", err);
      setSubmitAnswersError(err.message || "Failed to submit answers.");
    } finally {
      setSubmittingAnswers(false);
    }
  };

  const handleSubmitQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRfq) return;

    setSubmittingQuote(true);
    setSubmitQuoteError(null);
    setSubmitQuoteSuccess(false);

    try {
      const supplierRFQId = selectedRfq.items?.[0]?.supplierRFQId || null;

      const payload: SubmitQuotationPayload = {
        supplierQuotationId: quoteQuotationId,
        supplierRFQId: supplierRFQId,
        totalPrice: Number(quoteTotalPrice),
        deliveryCharge: Number(quoteDeliveryCharge),
        deliveryType: quoteDeliveryType,
        discount: Number(quoteDiscount),
        discountType: quoteDiscountType,
        tax: Number(quoteTax),
        taxType: quoteTaxType,
        ...(!selectedRfq.addLotOption ? {
          items: selectedRfq.items.map((item, idx) => {
            const key = item.id || item.buyerRFQItemId || `item-${idx}`;
            const itemQuote = selectedRfq.supplierQuotationItems?.[idx];
            return {
              supplierRFQItemId: itemQuote?.supplierRFQItemId || itemQuote?.id || item.supplierRFQItemId || null,
              buyerRFQItemId: item.id || item.buyerRFQItemId || "",
              quotedPrice: Number(quoteItemPrices[key] ?? 0),
            };
          })
        } : {})
      };

      await submitSupplierQuotation(payload);
      setSubmitQuoteSuccess(true);

      // Refresh the RFQ details
      const updatedDetails = await fetchRFQById(selectedRfqId!);
      setSelectedRfq(updatedDetails);

      // Refresh RFQ list
      if (supplierId) {
        const listData = await fetchRFQMasterData({
          supplierId,
          index: 0,
          limit: 10,
        });
        setRfqs(listData);
      }
    } catch (err: any) {
      console.error("Failed to submit quotation", err);
      setSubmitQuoteError(err.message || "Failed to submit quotation.");
    } finally {
      setSubmittingQuote(false);
    }
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError(null);
    try {
      await logoutSupplier();
    } catch (error: any) {
      setLogoutError(error?.message || "Logout request failed, clearing session locally.");
    } finally {
      sessionStorage.clear();
      window.dispatchEvent(new CustomEvent("session:expired"));
      setLoggingOut(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f4f6f9' }}>
      <header className="pud-header" style={{ width: '100%', zIndex: 10, position: 'relative' }}>
        <div className="pud-header-left">
          <div className="pud-logo">
            <img src={SilaLogo} alt="SILA Logo" className="pud-logo-img" />
          </div>
        </div>
        <div className="pud-header-spacer" />
        <div className="pud-header-right">
          <span className="pud-header-bell">
            <IconBell />
          </span>
          <div className="pud-header-account">
            <span className="pud-header-account-name" title={organizationName}>
              {organizationName}
            </span>
            <span className="pud-header-account-verified">
              <IconCheck /> Verified Vendor
            </span>
          </div>
          <div className="pud-header-avatar">{firstLetter}</div>
        </div>
      </header>

      <div className="pud-shell" style={{ flex: 1, position: 'relative', minHeight: 'calc(100vh - 64px)' }}>
        <aside className="pud-sidebar">
          <nav className="pud-nav" style={{ paddingTop: '40px' }}>
            {navItemsBeforeCatalog.map((item) => {
              const isActive = item.label === "Dashboard" && activeView === "dashboard";
              return (
                <div
                  key={item.label}
                  className={`pud-nav-item${isActive ? " pud-nav-item-active" : ""}`}
                  onClick={() => {
                    if (item.label === "Dashboard") navigate("/supplier/dashboard");
                    if (item.label === "Invitations") navigate("/supplier/invitations");
                  }}
                >
                  <span className="pud-nav-icon">{item.icon}</span>
                  <span className="pud-nav-label">{item.label}</span>
                  {item.badge && <span className="pud-nav-badge">{item.badge}</span>}
                </div>
              );
            })}

            <Catalog
              isAdmin={false}
              onShowCatalogList={() => setActiveView("catalogList")}
              onCloseCatalogList={() => setActiveView("dashboard")}
              fullViewContainer={activeView === "catalogList" ? catalogViewContainer : null}
            />

            {navItemsAfterCatalog.map((item) => {
              const isActive = item.label === "Company Profile" && activeView === "companyProfile";
              return (
                <div
                  key={item.label}
                  className={`pud-nav-item${isActive ? " pud-nav-item-active" : ""}`}
                  onClick={() => {
                    if (item.label === "Company Profile") setActiveView("companyProfile");
                  }}
                >
                  <span className="pud-nav-icon">{item.icon}</span>
                  <span className="pud-nav-label">{item.label}</span>
                </div>
              );
            })}
            <div
              className="pud-nav-item pud-nav-item-logout"
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
              <span className="bad-nav-item-logout" style={{ transform: "rotate(180deg)" }}>
                <LogoutIcon />
              </span>
              <span className="bad-nav-item-logout">{loggingOut ? "Logging out..." : "Log Out"}</span>
            </div>
          </nav>
        </aside>

        <div className="pud-main">
          <main className="pud-content">
            {activeView === "catalogList" ? (
              <div ref={setCatalogViewContainer} />
            ) : activeView === "companyProfile" ? (
              <CompanyProfile
                mode="network-admin"
                entityLabel="Supplier"
                fetchProfile={getSupplierProfile}
              />
            ) : (
              <>
                <h1 className="pud-title">Supplier Operations Command</h1>
                <p className="pud-subtitle">Real-time procurement tracking, bid submittals, and transaction monitoring.</p>

                <div className="pud-status-banner">
                  <span className="pud-status-dot" />
                  <div>
                    <div className="pud-status-title">Active Approved Supplier Portal Status (100%)</div>
                    <div className="pud-status-subtext">
                      Your credentials, certification audit records, and bank routes are verified for secure bidding.
                    </div>
                  </div>
                </div>

                <div className="pud-stats-grid">
                  {statCards.map((stat) => (
                    <div className="pud-stat-card" key={stat.label}>
                      <div className={`pud-stat-icon ${stat.colorClass}`}>{stat.icon}</div>
                      <div className="pud-stat-label">{stat.label}</div>
                      <div className="pud-stat-value">{stat.value}</div>
                      <div className="pud-stat-link">{stat.linkText}</div>
                    </div>
                  ))}
                </div>

                <div className="pud-panels">
                  <section className="pud-panel">
                    <div className="pud-panel-header">
                      <div>
                        <div className="pud-panel-title">Recent Sourcing Opportunities</div>
                        <div className="pud-panel-subtitle">Newly listed RFQs matched to your industry categories</div>
                      </div>
                      {!loadingRfqs && !rfqsError && rfqs.length > 0 && (visibleRfqCount < rfqs.length || hasMoreRfqs) && (
                        <a
                          className="pud-panel-link"
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            handleViewMoreRfqs();
                          }}
                          style={loadingMoreRfqs ? { opacity: 0.6, pointerEvents: "none" } : undefined}
                        >
                          {loadingMoreRfqs ? "Loading..." : "View All RFQs →"}
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
                          <div className="pud-rfq-row" key={rfq.rfqId}>
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
                            <button
                              className="pud-btn pud-btn-outline"
                              onClick={() => handleViewRfqDetails(rfq.rfqId)}
                            >
                              View RFQ Details
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="pud-panel">
                    <div className="pud-panel-header">
                      <div>
                        <div className="pud-panel-title">Recent Purchase Orders</div>
                        <div className="pud-panel-subtitle">New orders requiring attention</div>
                      </div>
                      <a className="pud-panel-link" href="#">View All →</a>
                    </div>
                    <div className="pud-panel-list">
                      {poItems.map((po) => (
                        <div className="pud-po-row" key={po.code}>
                          <div className="pud-po-info">
                            <div className="pud-po-meta">
                              <span className="pud-po-code">{po.code}</span>
                              <span className={`pud-status-badge pud-status-badge-${po.status.toLowerCase()}`}>
                                {po.status}
                              </span>
                            </div>
                            <div className="pud-po-company">{po.company}</div>
                            <div className="pud-po-date"><IconCalendar /> Order Date: {po.orderDate}</div>
                          </div>
                          <div className="pud-po-right">
                            <div className="pud-po-amount">{po.amount}</div>
                            <a className="pud-po-process" href="#">Process →</a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                <section className="pud-matchmaker">
                  <div className="pud-matchmaker-header">
                    <div className="pud-matchmaker-title-row">
                      <span className="pud-matchmaker-icon"><IconSparkles /></span>
                      <div className="pud-matchmaker-title">Smart Sourcing Matchmaker</div>
                    </div>
                    <div className="pud-matchmaker-subtitle">
                      Active enterprise buyers looking for products and services matching your certified categories and registered ship-to locations.
                    </div>
                  </div>

                  <div className="pud-match-grid">
                    {matchCards.map((card) => (
                      <div className="pud-match-card" key={card.name}>
                        <span className="pud-match-location"><IconPin /> {card.location}</span>
                        <div className="pud-match-top">
                          <div className="pud-match-avatar">{card.initials}</div>
                          <div>
                            <div className="pud-match-name">{card.name}</div>
                            <div className="pud-match-seeking"><NavIconBuilding /> Seeking: {card.seeking}</div>
                          </div>
                        </div>
                        <p className="pud-match-desc">{card.description}</p>
                        <div className="pud-match-rep-row">
                          <span className="pud-match-rep-label">Representative:</span>
                          <span className="pud-match-rep-name">{card.representative}</span>
                        </div>
                        <div className="pud-match-actions">
                          <button
                            className="pud-btn pud-btn-outline pud-btn-flex"
                            onClick={() => setSelectedProfile(card)}
                          >
                            <IconEye /> Profile
                          </button>
                          {card.actionVariant === "message" ? (
                            <button className="pud-btn pud-btn-message pud-btn-flex">
                              <IconMessageSquare /> Message
                            </button>
                          ) : (
                            <button className="pud-btn pud-btn-interest pud-btn-flex">
                              <IconSend /> Send Interest
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pud-pagination">
                    <button className="pud-page-btn pud-page-btn-disabled" disabled>
                      <IconChevronLeft />
                    </button>
                    <button className="pud-page-btn pud-page-btn-active">
                      <IconChevronRight />
                    </button>
                  </div>
                </section>
              </>
            )}
          </main>
        </div>

        {selectedProfile && (
          <div className="pud-modal-overlay" onClick={() => setSelectedProfile(null)}>
            <div className="pud-modal" onClick={(e) => e.stopPropagation()}>
              <div className="pud-modal-header">
                <span className="pud-modal-badge">
                  <IconShieldCheck /> Verified Sourcing Partner
                </span>
                <button className="pud-modal-close" onClick={() => setSelectedProfile(null)}>
                  <IconClose />
                </button>
                <h2 className="pud-modal-name">{selectedProfile.name}</h2>
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
                        <div className="pud-modal-analytics-label">Interest Category</div>
                        <div className="pud-modal-analytics-value">{selectedProfile.seeking}</div>
                        <div className="pud-modal-analytics-note">{selectedProfile.categoryNote}</div>
                      </div>
                    </div>
                    <div className="pud-modal-analytics-item">
                      <span className="pud-modal-check"><IconCheckCircle /></span>
                      <div>
                        <div className="pud-modal-analytics-label">Delivery Destination</div>
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
                  <button className="pud-btn pud-btn-message pud-modal-footer-btn">
                    <IconMessageSquare /> Message Buyer
                  </button>
                ) : (
                  <button className="pud-btn pud-btn-interest pud-modal-footer-btn">
                    <IconSend /> Send Interest
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {selectedRfqId && (
          <div className="pud-modal-overlay" onClick={() => setSelectedRfqId(null)}>
            <div className="pud-modal pud-modal-rfq" onClick={(e) => e.stopPropagation()}>

              {/* Modal Header */}
              <div className="pud-modal-header">
                <span className="pud-modal-badge">
                  <IconFile /> RFQ Specification
                </span>
                <button className="pud-modal-close" onClick={() => setSelectedRfqId(null)}>
                  <IconClose />
                </button>
                <h2 className="pud-modal-name">
                  {loadingRfqDetail ? "Loading RFQ Details..." : selectedRfq?.title || "RFQ Details"}
                </h2>
                {selectedRfq && (
                  <div className="pud-modal-meta">
                    <span><IconCalendar /> Closes: {new Date(selectedRfq.endDate).toLocaleDateString()}</span>
                    <span><IconPin /> Delivery: {selectedRfq.deliveryLocation}</span>
                  </div>
                )}
              </div>

              {/* Modal Body & Form */}
              <form onSubmit={handleSubmitQuotation}>
                <div className="pud-modal-body">
                  {loadingRfqDetail && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px', gap: '12px' }}>
                      <div className="pud-spinner" />
                      <span style={{ color: '#64748b', fontSize: '14px' }}>Fetching RFQ data from secure server...</span>
                    </div>
                  )}

                  {rfqDetailError && (
                    <div style={{ padding: '24px 0', textAlign: 'center' }}>
                      <div style={{ color: '#ef4444', fontSize: '15px', marginBottom: '16px' }}>{rfqDetailError}</div>
                      <button
                        type="button"
                        className="pud-btn pud-btn-outline"
                        onClick={() => handleViewRfqDetails(selectedRfqId)}
                      >
                        Retry Loading
                      </button>
                    </div>
                  )}

                  {selectedRfq && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                      {/* General Specs */}
                      <div>
                        <div className="pud-modal-section-title">Description</div>
                        <p className="pud-modal-desc" style={{ whiteSpace: 'pre-wrap' }}>
                          {selectedRfq.description || "No description provided."}
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '12px' }}>
                          <div>
                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Start Date</div>
                            <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 600, marginTop: '2px' }}>
                              {new Date(selectedRfq.startDate).toLocaleString()}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>End Date</div>
                            <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 600, marginTop: '2px' }}>
                              {new Date(selectedRfq.endDate).toLocaleString()}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Add Lot Option</div>
                            <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 600, marginTop: '2px' }}>
                              {selectedRfq.addLotOption ? "Allowed" : "Not Allowed"}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Reference / Bid Documents */}
                      {((selectedRfq.technicalSpecificationDocuments?.length ?? 0) > 0 ||
                        (selectedRfq.termsConditionDocuments?.length ?? 0) > 0) && (
                          <div>
                            <div className="pud-modal-section-title">Reference Documents</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginTop: '8px' }}>

                              {/* Tech Documents */}
                              {selectedRfq.technicalSpecificationDocuments?.map((doc) => (
                                <div key={doc.id} className="pud-rfq-doc-card">
                                  <span className="pud-rfq-doc-icon"><IconFile /></span>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div className="pud-rfq-doc-name" title={doc.fileName}>{doc.fileName}</div>
                                    <div className="pud-rfq-doc-type">Tech Spec • {doc.fileType.toUpperCase()}</div>
                                  </div>
                                </div>
                              ))}

                              {/* Terms Documents */}
                              {selectedRfq.termsConditionDocuments?.map((doc) => (
                                <div key={doc.id} className="pud-rfq-doc-card">
                                  <span className="pud-rfq-doc-icon" style={{ background: '#fef3c7', color: '#d97706' }}><IconFile /></span>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div className="pud-rfq-doc-name" title={doc.fileName}>{doc.fileName}</div>
                                    <div className="pud-rfq-doc-type">Terms & Conditions • {doc.fileType.toUpperCase()}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Sourcing Items Table */}
                      <div>
                        <div className="pud-modal-section-title" style={{ marginBottom: '12px' }}>Required Materials & Services</div>
                        <div className="pud-rfq-table-container">
                          <table className="pud-rfq-items-table">
                            <thead>
                              <tr>
                                <th>Material Info</th>
                                <th>Group / Code</th>
                                <th style={{ textAlign: 'right' }}>Qty Required</th>
                                {!selectedRfq.addLotOption && <th style={{ textAlign: 'right', width: '130px' }}>Your Unit Quote</th>}
                              </tr>
                            </thead>
                            <tbody>
                              {selectedRfq.items?.map((item, idx) => {
                                const key = item.id || item.buyerRFQItemId || `item-${idx}`;
                                const price = quoteItemPrices[key] ?? 0;
                                return (
                                  <tr key={idx}>
                                    <td>
                                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.description}</div>
                                      {item.costCenter && (
                                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                          Cost Center: {item.costCenter}
                                        </div>
                                      )}
                                      {item.attachments?.map((att) => (
                                        <div key={att.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', color: '#475569', fontSize: '11px', padding: '2px 6px', borderRadius: '4px', marginTop: '4px', marginRight: '4px' }}>
                                          <IconFile /> {att.fileName}
                                        </div>
                                      ))}
                                    </td>
                                    <td>
                                      <div style={{ fontSize: '13px', color: '#334155' }}>
                                        {item.materialGroup || "N/A"}
                                      </div>
                                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                        Code: {item.materialCode || "N/A"}
                                      </div>
                                    </td> 
                                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                                      {item.quantity} <span style={{ fontSize: '12px', fontWeight: 400, color: '#64748b' }}>{item.uom}</span>
                                    </td>
                                    {!selectedRfq.addLotOption && (
                                      <td style={{ textAlign: 'right' }}>
                                        <input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          className="pud-rfq-item-input"
                                          value={price || ""}
                                          onChange={(e) => handleItemPriceChange(key, parseFloat(e.target.value) || 0)}
                                          placeholder="0.00"
                                          style={{
                                            width: '110px',
                                            padding: '6px 10px',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '6px',
                                            textAlign: 'right',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            color: '#0f172a'
                                          }}
                                          required
                                        />
                                      </td>
                                    )}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {(selectedRfq.questions?.length ?? 0) > 0 && (
                        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                          <div className="pud-modal-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <IconMessageSquare /> Additional Questions from Buyer
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            {submitAnswersSuccess && (
                              <div style={{ color: '#15803d', fontSize: '13px', fontWeight: 500, background: '#dcfce7', padding: '8px 12px', borderRadius: '6px' }}>
                                <IconCheckCircle /> All answers successfully saved!
                              </div>
                            )}
                            {submitAnswersError && (
                              <div style={{ color: '#ef4444', fontSize: '13px', fontWeight: 500, background: '#fee2e2', padding: '8px 12px', borderRadius: '6px' }}>
                                {submitAnswersError}
                              </div>
                            )}
                            {[...selectedRfq.questions]
                              .sort((a, b) => a.displayOrder - b.displayOrder)
                              .map((q, index) => {
                                const current = rfqAnswers[q.questionId];
                                return (
                                  <div key={q.questionId} style={{ background: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>
                                      <span style={{ color: '#2563eb', marginRight: '4px' }}>Q{index + 1}.</span> {q.question}
                                      {q.isRequired && <span style={{ color: '#ef4444' }}> *</span>}
                                    </div>

                                    {q.questionType === 'Text' && (
                                      <input
                                        type="text"
                                        className="pud-rfq-item-input"
                                        value={current?.answer || ''}
                                        onChange={(e) => handleTextAnswerChange(q.questionId, e.target.value)}
                                        placeholder="Type your answer..."
                                        required={q.isRequired}
                                        style={{
                                          width: '100%',
                                          padding: '8px 12px',
                                          border: '1px solid #cbd5e1',
                                          borderRadius: '6px',
                                          fontSize: '13px',
                                          color: '#0f172a',
                                          background: '#ffffff',
                                        }}
                                      />
                                    )}

                                    {q.questionType === 'Radio' && (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {[...(q.options || [])]
                                          .sort((a, b) => a.displayOrder - b.displayOrder)
                                          .map((opt) => (
                                            <label
                                              key={opt.optionId}
                                              style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155', cursor: 'pointer' }}
                                            >
                                              <input
                                                type="radio"
                                                name={`rfq-question-${q.questionId}`}
                                                checked={current?.questionOptionId === opt.optionId}
                                                onChange={() => handleRadioAnswerChange(q.questionId, opt.optionId)}
                                                required={q.isRequired}
                                              />
                                              {opt.optionText}
                                            </label>
                                          ))}
                                      </div>
                                    )}

                                    {q.questionType === 'FILE' && (
                                      <input
                                        type="file"
                                        className="pud-rfq-item-input"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0] || null;
                                          handleFileAnswerChange(q.questionId, file);
                                        }}
                                        required={q.isRequired}
                                        style={{
                                          width: '100%',
                                          padding: '8px 12px',
                                          border: '1px solid #cbd5e1',
                                          borderRadius: '6px',
                                          fontSize: '13px',
                                          color: '#0f172a',
                                          background: '#ffffff',
                                        }}
                                      />
                                    )}

                                    {q.questionType !== 'Text' && q.questionType !== 'Radio' && q.questionType !== 'File' && (q.options?.length ?? 0) > 0 && (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {[...(q.options || [])]
                                          .sort((a, b) => a.displayOrder - b.displayOrder)
                                          .map((opt) => (
                                            <label
                                              key={opt.optionId}
                                              style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155', cursor: 'pointer' }}
                                            >
                                              <input
                                                type="checkbox"
                                                checked={current?.questionOptionIds?.includes(opt.optionId) || false}
                                                onChange={(e) => handleCheckboxAnswerChange(q.questionId, opt.optionId, e.target.checked)}
                                              />
                                              {opt.optionText}
                                            </label>
                                          ))}
                                      </div>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                                      <button
                                        type="button"
                                        className="pud-btn pud-btn-outline"
                                        onClick={handleSubmitRfqAnswers}
                                        disabled={submittingAnswers}
                                        style={{ padding: '6px 14px', fontSize: '12px' }}
                                      >
                                        {submittingAnswers ? 'Saving...' : 'Save Answer'}
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}


                      {/* Quotation Pricing & Details Form */}
                      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                        <div className="pud-modal-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                          <IconSparkles /> Commercial Proposal / Quotation Details
                        </div>

                        {submitQuoteSuccess && (
                          <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', color: '#15803d', padding: '12px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 500, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <IconCheckCircle /> Quotation submitted successfully!
                          </div>
                        )}

                        {submitQuoteError && (
                          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '12px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 500, marginBottom: '16px' }}>
                            {submitQuoteError}
                          </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', background: '#f8fafc', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>

                          {/* Delivery Charge */}
                          <div>
                            <label style={{ display: 'block', fontSize: '12px', color: '#475569', fontWeight: 600, marginBottom: '6px' }}>
                              Delivery Charge
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              className="pud-rfq-form-input"
                              value={quoteDeliveryCharge || ""}
                              onChange={(e) => handleOtherFieldChange("deliveryCharge", e.target.value)}
                              placeholder="0.00"
                              style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13.5px' }}
                            />
                          </div>

                          {/* Delivery Type */}
                          <div>
                            <label style={{ display: 'block', fontSize: '12px', color: '#475569', fontWeight: 600, marginBottom: '6px' }}>
                              Delivery Type
                            </label>
                            <select
                              className="pud-rfq-form-input"
                              value={quoteDeliveryType}
                              onChange={(e) => handleOtherFieldChange("deliveryType", e.target.value)}
                              style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13.5px', background: '#ffffff' }}
                            >
                              <option value="PERCENTAGE">PERCENATGE</option>
                              <option value="AMOUNT">AMOUNT</option>
                            </select>
                          </div>

                          {/* Discount */}
                          <div>
                            <label style={{ display: 'block', fontSize: '12px', color: '#475569', fontWeight: 600, marginBottom: '6px' }}>
                              Discount
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              className="pud-rfq-form-input"
                              value={quoteDiscount || ""}
                              onChange={(e) => handleOtherFieldChange("discount", e.target.value)}
                              placeholder="0.00"
                              style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13.5px' }}
                            />
                          </div>

                          {/* Discount Type */}
                          <div>
                            <label style={{ display: 'block', fontSize: '12px', color: '#475569', fontWeight: 600, marginBottom: '6px' }}>
                              Discount Type
                            </label>
                            <select
                              className="pud-rfq-form-input"
                              value={quoteDiscountType}
                              onChange={(e) => handleOtherFieldChange("discountType", e.target.value)}
                              style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13.5px', background: '#ffffff' }}
                            >
                              <option value="PERCENTAGE">PERCENTAGE</option>
                              <option value="AMOUNT">AMOUNT</option>
                            </select>
                          </div>

                          {/* Tax */}
                          <div>
                            <label style={{ display: 'block', fontSize: '12px', color: '#475569', fontWeight: 600, marginBottom: '6px' }}>
                              Tax
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              className="pud-rfq-form-input"
                              value={quoteTax || ""}
                              onChange={(e) => handleOtherFieldChange("tax", e.target.value)}
                              placeholder="0.00"
                              style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13.5px' }}
                            />
                          </div>

                          {/* Tax Type */}
                          <div>
                            <label style={{ display: 'block', fontSize: '12px', color: '#475569', fontWeight: 600, marginBottom: '6px' }}>
                              Tax Type
                            </label>
                            <select
                              className="pud-rfq-form-input"
                              value={quoteTaxType}
                              onChange={(e) => handleOtherFieldChange("taxType", e.target.value)}
                              style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13.5px', background: '#ffffff' }}
                            >
                              <option value="PERCENTAGE">PERCENTAGE</option>
                              <option value="AMOUNT">AMOUNT</option>
                            </select>
                          </div>

                          {/* Total Price (Auto calculated but editable) */}
                          <div style={{ gridColumn: 'span 2', borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: 700 }}>Total Price Quote</span>
                            </div>
                            <input
                              type="number"
                              step="0.01"
                              className="pud-rfq-form-input"
                              value={quoteTotalPrice}
                              onChange={(e) => handleOtherFieldChange("totalPrice", e.target.value)}
                              placeholder="0.00"
                              style={{ width: '180px', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '16px', fontWeight: 700, color: '#16a34a', textAlign: 'right' }}
                              required
                            />
                          </div>

                        </div>
                      </div>

                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="pud-modal-footer">
                  <button
                    type="button"
                    className="pud-btn pud-btn-outline"
                    onClick={() => setSelectedRfqId(null)}
                    style={{ marginRight: '10px' }}
                  >
                    Close
                  </button>
                  {selectedRfq && (
                    <button
                      type="submit"
                      className="pud-btn pud-btn-message"
                      disabled={submittingQuote}
                      style={{ background: '#2563eb', color: '#ffffff' }}
                    >
                      {submittingQuote ? "Submitting..." : "Submit Quotation"}
                    </button>
                  )}
                </div>
              </form>

            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupplierDashboard;