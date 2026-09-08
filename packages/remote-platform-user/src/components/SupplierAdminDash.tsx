import React, { useState, useEffect, useRef, useMemo } from "react";
import "./SupplierAdminDash.css";
import "../../../remote-supplier/src/components/SupplierDashboard.css"
import Header from "./Header";
import UserAdmin from "../UserAdmin";
import CompanyProfile from "./CompanyProfile/CompanyProfile";
import Catalog from "../../../remote-supplier/src/components/Catalog";
import Invitations from "../../../remote-supplier/src/components/Invitations";
import { useNetworkAdminAuthStore } from "../store/useAuthStore";
import {
  fetchRFQMasterData,
  fetchRFQById,
  fetchSupplierQuotationBySupplierId,
  getSupplierProfile,
  submitSupplierQuotation,
  submitRfqAnswers,
  fetchMetadataReferenceList,
  sendOtp,
  verifyOtp,
  type RFQMasterDataItem,
  type RFQDetailResponse,
  type SubmitQuotationPayload,
  type RfqDocumentAssetDto,
  type SupplierQuotationByIdItem,
  fetchBuyerAsset
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

const IconDownload = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
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

const IconAlertCircle = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
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
const VERIFICATION_TOKEN_TTL_SECONDS = 30 * 60;

const getCookie = (name: string): string | null => {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

const setCookie = (name: string, value: string, maxAgeSeconds: number) => {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
};

const deleteCookie = (name: string) => {
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
};

const SupplierAdminDash: React.FC = () => {
  const [activeNav, setActiveNav] = useState<string>("dashboard");
  const [catalogViewContainer, setCatalogViewContainer] = useState<HTMLDivElement | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<MatchCard | null>(null);

  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [otpStage, setOtpStage] = useState<"none" | "send" | "verify">("none");
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null);
  const [otpRemaining, setOtpRemaining] = useState(600);
  const supplierEmailRef = useRef<string | null>(null);

  const OTP_WINDOW_MS = 10 * 60 * 1000;

  const formatOtpTimer = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const parseAsUtcMs = (dateStr?: string | null): number | null => {
    if (!dateStr) return null;
    const hasTz = /Z$|[+-]\d{2}:\d{2}$/.test(dateStr);
    const ms = Date.parse(hasTz ? dateStr : `${dateStr}Z`);
    return Number.isNaN(ms) ? null : ms;
  };

  const getRfqSubmissionWindowStatus = (rfq: RFQDetailResponse | null) => {
    if (!rfq) return { notYetOpen: false, closed: false, frozen: false, canSubmit: false };
    const startMs = parseAsUtcMs(rfq.startDate);
    const endMs = parseAsUtcMs(rfq.endDate);
    const nowMs = Date.now();

    const notYetOpen = startMs !== null && nowMs < startMs;
    const closed = endMs !== null && nowMs > endMs;
    const frozen = rfq.status === "Freezing";

    return { notYetOpen, closed, frozen, canSubmit: !notYetOpen && !closed && !frozen };
  };



  useEffect(() => {
    if (otpStage !== "verify" || !otpExpiresAt) return;
    const tick = () => {
      const left = Math.max(0, Math.round((otpExpiresAt - Date.now()) / 1000));
      setOtpRemaining(left);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [otpStage, otpExpiresAt]);

  useEffect(() => {
    useNetworkAdminAuthStore.getState().initializeFromSession();
  }, []);

  /* ---------------------------------- RFQ management (ported from SupplierDashboard) ---------------------------------- */

  const [supplierId, setSupplierId] = useState<string | null>(
    sessionStorage.getItem("vosox_supplier_id")
  );
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
  const [rfqWindowTick, setRfqWindowTick] = useState(0);

  useEffect(() => {
    if (!selectedRfq) return;
    const t = setInterval(() => setRfqWindowTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, [selectedRfq]);

  const { notYetOpen, closed, frozen, canSubmit } = useMemo(
    () => getRfqSubmissionWindowStatus(selectedRfq),
    [selectedRfq, rfqWindowTick],
  );
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
            sessionStorage.setItem("vosox_supplier_id", profile.id);
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

  const handleDocumentAction = async (doc: any, action: 'preview' | 'download') => {
    const assetId = doc.id || doc.assetId;
    if (!assetId) {
      alert("Document asset ID is missing.");
      return;
    }

    try {
      const data = await fetchBuyerAsset(assetId);
      if ('statusCode' in data && data.statusCode) {
        throw new Error(data.message || 'Failed to fetch document.');
      }

      const fileBytes = (data as any).fileBytes;
      const fileName = (data as any).fileName || doc.fileName || doc.assetName || "document";
      const rawType = ((data as any).contentType || (data as any).fileType || doc.fileType || "pdf").toLowerCase();

      let mimeType = "application/pdf";
      if (rawType.includes("pdf")) mimeType = "application/pdf";
      else if (rawType.includes("png")) mimeType = "image/png";
      else if (rawType.includes("jpg") || rawType.includes("jpeg")) mimeType = "image/jpeg";
      else if (rawType.includes("txt")) mimeType = "text/plain";
      else if (rawType.includes("doc")) mimeType = "application/msword";

      let url = (data as any).url || (data as any).fileUrl;
      let createdBlobUrl = "";

      if (fileBytes) {
        const cleanBase64 = fileBytes.replace(/^data:.*?;base64,/, '');
        const byteCharacters = atob(cleanBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });
        createdBlobUrl = URL.createObjectURL(blob);
        url = createdBlobUrl;
      }

      if (!url) {
        throw new Error("Document content not available.");
      }

      if (action === 'preview') {
        window.open(url, '_blank');
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err: any) {
      alert(err?.message || "Could not access document.");
    }
  };

  const [rfqPageView, setRfqPageView] = useState<"dashboard" | "allRfqs" | "rfqDetail">("dashboard");

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

  const handleBackToDashboard = () => {
    setRfqPageView("dashboard");
    setActiveNav("dashboard");
    setSelectedRfqId(null);
    setSelectedRfq(null);
    setRfqDetailError(null);
  };

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
    setRfqPageView("rfqDetail");
    handleViewRfqDetails(rfqId);
  };

  const closeRfqDetail = () => {
    if (rfqPageView === "rfqDetail") {
      setRfqPageView("allRfqs");
    }
    setSelectedRfqId(null);
    setSelectedRfq(null);
    setRfqDetailError(null);
    setOwnQuotation(null);
  };

  const [quoteQuotationId, setQuoteQuotationId] = useState<string | null>(null);
  const [quoteTotalPrice, setQuoteTotalPrice] = useState<number>(0);
  const [quoteDeliveryCharge, setQuoteDeliveryCharge] = useState<number>(0);
  const [quoteDeliveryType, setQuoteDeliveryType] = useState<string>("PERCENTAGE");
  const [quoteDiscount, setQuoteDiscount] = useState<number>(0);
  const [quoteDiscountType, setQuoteDiscountType] = useState<string>("PERCENTAGE");
  const [quoteTax, setQuoteTax] = useState<number>(0);
  const [quoteTaxType, setQuoteTaxType] = useState<string>("PERCENTAGE");
  const [quoteItemPrices, setQuoteItemPrices] = useState<{ [key: string]: number }>({});

  interface QuoteLineItem {
    deliveryCharge: number;
    deliveryType: string;
    discount: number;
    discountType: string;
    tax: number;
    taxType: string;
    quotedPrice: number;
    subTotal: number;
    quotedAmount: number;
  }
  const [quoteLineItems, setQuoteLineItems] = useState<{ [supplierRFQItemId: string]: QuoteLineItem }>({});

  const [submittingQuote, setSubmittingQuote] = useState(false);
  const [submitQuoteError, setSubmitQuoteError] = useState<string | null>(null);
  const [submitQuoteSuccess, setSubmitQuoteSuccess] = useState(false);

  useEffect(() => {
    if (selectedRfq) {
      const rfqQuote = selectedRfq.supplierQuotation?.[0];
      const activeQuote = ownQuotation || rfqQuote;

      if (activeQuote) {
        setQuoteQuotationId(
          ownQuotation?.quotationId ||
          rfqQuote?.qutationId ||
          rfqQuote?.id ||
          null
        );
        setQuoteTotalPrice(activeQuote.totalPrice || 0);
        setQuoteDeliveryCharge(activeQuote.deliveryCharge || 0);
        setQuoteDeliveryType(activeQuote.deliveryType || "PERCENTAGE");
        setQuoteDiscount(activeQuote.discount || 0);
        setQuoteDiscountType(rfqQuote?.discountType || "PERCENTAGE");
        setQuoteTax(activeQuote.tax || 0);
        setQuoteTaxType(rfqQuote?.taxType || "PERCENTAGE");
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
        const ownItemQuote = ownQuotation?.supplierQuotationItems?.[idx];
        const key = item.id || item.buyerRFQItemId || `item-${idx}`;
        prices[key] = ownItemQuote?.quotedPrice ?? 0;
      });
      setQuoteItemPrices(prices);
      if (!selectedRfq.addLotOption) {
        const lineItems: { [supplierRFQItemId: string]: QuoteLineItem } = {};
        selectedRfq.items?.forEach((item) => {
          const itemKey = item.supplierRFQItemId;
          if (!itemKey) return;
          const matchedOwnItem = ownQuotation?.supplierQuotationItems?.find(
            (qi) => qi.supplierRFQItemId === itemKey
          );
          const matchedRfqItem = selectedRfq.supplierQuotationItems?.find(
            (qi) => qi.supplierRFQItemId === itemKey
          );
          const source = matchedOwnItem || matchedRfqItem;
          lineItems[itemKey] = {
            deliveryCharge: source?.deliveryCharge ?? 0,
            deliveryType: source?.deliveryType || "PERCENTAGE",
            discount: source?.discount ?? 0,
            discountType: source?.discountType || "PERCENTAGE",
            tax: source?.tax ?? 0,
            taxType: source?.taxType || "PERCENTAGE",
            quotedPrice: source?.quotedPrice ?? 0,
            subTotal: source?.subTotal ?? 0,
            quotedAmount: source?.quotedAmount ?? 0,
          };
        });
        setQuoteLineItems(lineItems);
      } else {
        setQuoteLineItems({});
      }

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
  }, [selectedRfq, ownQuotation]);

  const handleLineItemFieldChange = (
    supplierRFQItemId: string,
    field: keyof QuoteLineItem,
    value: string
  ) => {
    setQuoteLineItems((prev) => {
      const existing: QuoteLineItem = prev[supplierRFQItemId] || {
        deliveryCharge: 0,
        deliveryType: "PERCENTAGE",
        discount: 0,
        discountType: "PERCENTAGE",
        tax: 0,
        taxType: "PERCENTAGE",
        quotedPrice: 0,
        subTotal: 0,
        quotedAmount: 0,
      };
      const isNumericField = field === "deliveryCharge" || field === "discount" || field === "tax" || field === "quotedPrice";
      return {
        ...prev,
        [supplierRFQItemId]: {
          ...existing,
          [field]: isNumericField ? (Number(value) || 0) : value,
        },
      };
    });
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
      const entityTypes = await fetchMetadataReferenceList(['ENTITY_TYPE']);

      // ✅ ADD ERROR CHECK HERE
      if (isErrorResponse(entityTypes)) {
        setSubmitAnswersError(entityTypes.description || entityTypes.message || "Failed to fetch metadata.");
        setSubmittingAnswers(false);
        return;
      }

      const supplierEntityId =
        entityTypes.find((e) => e.key === 'SUPPLIER')?.id || '59476530-3c10-438b-b3b3-9db9e96e8d93';
      const entityType = entityTypes.find((e) => e.key === 'SUPPLIER')?.key || 'SUPPLIER';

      const payload = {
        supplierRFQId: supplierRFQId as string,
        supplierId: supplierId as string,
        answers: Object.values(rfqAnswers).map((a) => {
          const question = selectedRfq.questions?.find(q => q.questionId === a.rfqQuestionId);
          const allOptionIds = question?.options?.map(opt => opt.optionId) || [];

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
      setSubmitAnswersError(err.message || "Failed to submit answers.");
    } finally {
      setSubmittingAnswers(false);
    }
  };

  // ✅ UPDATED: Handle submit button click - shows confirmation modal
  const handleSubmitQuotationClick = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setOtpError(null);

    const { canSubmit: withinWindow } = getRfqSubmissionWindowStatus(selectedRfq);
    if (!withinWindow) {
      setSubmitQuoteError("This RFQ is outside its active submission window and can no longer accept quotations.");
      return;
    }

    const verificationToken = getCookie(VERIFICATION_TOKEN_COOKIE);

    if (verificationToken) {
      setShowConfirmSubmit(true);
      return;
    }

    sessionStorage.removeItem("vsx_otp_expiry");
    setOtpCode("");
    setOtpStage("send");
  };

  const handleSendOtp = async () => {
    setOtpError(null);
    setSendingOtp(true);
    try {
      if (!supplierEmailRef.current) {
        const profile = await getSupplierProfile();
        if (!isErrorResponse(profile) && profile && "businessProfile" in profile) {
          supplierEmailRef.current = (profile as any).businessProfile?.email || null;
        }
      }
      const res = await sendOtp();
      if (res && "statusCode" in res && (res as any).statusCode >= 400) {
        const message = (res as any).message || "";
        const description = (res as any).description || "";
        const otpAlreadySent = /already.*sent/i.test(message) || /already.*sent/i.test(description);
        if (!otpAlreadySent) {
          setOtpError(message || "Couldn't send the code, try again.");
          return;
        }
        // Backend already has a live OTP for this supplier — let them verify the one they have
        // instead of dead-ending on this error. If it's since expired server-side, verifyOtp
        // will reject it and the supplier can hit Resend once our local countdown runs out.
      }
      const expiry = Date.now() + OTP_WINDOW_MS;
      sessionStorage.setItem("vsx_otp_expiry", String(expiry));
      deleteCookie(VERIFICATION_TOKEN_COOKIE);
      setOtpExpiresAt(expiry);
      setOtpRemaining(600);
      setOtpCode("");
      setOtpStage("verify");
    } catch (err: any) {
      setOtpError(err?.message || "Couldn't send the code, try again.");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim()) {
      setOtpError("Enter the code we emailed you.");
      return;
    }
    if (otpRemaining <= 0) {
      setOtpError("Code expired. Please resend the OTP.");
      return;
    }
    setVerifyingOtp(true);
    setOtpError(null);
    try {
      const res = await verifyOtp({ email: supplierEmailRef.current || "", otp: otpCode.trim() });
      if (!res || (res as any).success === false || ("statusCode" in res && (res as any).statusCode >= 400)) {
        setOtpError((res as any)?.message || "That code didn't match, try again.");
        return;
      }
      const token = (res as any).token;
      if (!token) {
        setOtpError("Verification failed, please retry.");
        return;
      }
      setCookie(VERIFICATION_TOKEN_COOKIE, token, VERIFICATION_TOKEN_TTL_SECONDS);
      setOtpStage("none");
      setShowConfirmSubmit(true);
    } catch (err: any) {
      setOtpError(err?.message || "That code didn't match, try again.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleConfirmSubmitQuotation = async () => {
    if (!selectedRfq) return;

    const { canSubmit: withinWindow } = getRfqSubmissionWindowStatus(selectedRfq);
    if (!withinWindow) {
      setShowConfirmSubmit(false);
      setSubmitQuoteError("This RFQ's submission window has closed. You can no longer submit a quotation.");
      return;
    }

    const verificationToken = getCookie(VERIFICATION_TOKEN_COOKIE);
    if (!verificationToken) {
      setShowConfirmSubmit(false);
      setOtpCode("");
      setOtpError(null);
      setOtpStage("send");
      return;
    }

    setShowConfirmSubmit(false);
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
        temporaryVerificationToken: verificationToken,
        ...(selectedRfq.addLotOption ? {
          items: selectedRfq.items.map((item, idx) => {
            const key = item.id || item.buyerRFQItemId || `item-${idx}`;
            const itemQuote = selectedRfq.supplierQuotationItems?.[idx];
            // supplierQuotationItems can hold an empty draft-quotation stub whose IDs are
            // the all-zero placeholder GUID — that string is still "truthy" in JS, so it
            // must be filtered out explicitly rather than relying on `||` alone.
            const validId = (id?: string | null) =>
              id && id !== "00000000-0000-0000-0000-000000000000" ? id : null;
            return {
              supplierRFQItemId: validId(item.supplierRFQItemId) || validId(itemQuote?.supplierRFQItemId) || validId(itemQuote?.id) || null,
              buyerRFQItemId: item.id || item.buyerRFQItemId || "",
              quotedPrice: Number(quoteItemPrices[key] ?? 0),
            };
          })
        } : {
          items: selectedRfq.items.map((item) => {
            const itemKey = item.supplierRFQItemId;
            const line = itemKey ? quoteLineItems[itemKey] : undefined;
            return {
              supplierRFQItemId: itemKey || null,
              buyerRFQItemId: item.id || item.buyerRFQItemId || "",
              quotedPrice: Number(line?.quotedPrice ?? 0),
              deliveryCharge: Number(line?.deliveryCharge ?? 0),
              deliveryType: line?.deliveryType || "PERCENTAGE",
              discount: Number(line?.discount ?? 0),
              discountType: line?.discountType || "PERCENTAGE",
              tax: Number(line?.tax ?? 0),
              taxType: line?.taxType || "PERCENTAGE",
            } as any;
          })
        })
      };

      const result = await submitSupplierQuotation(payload);
      if (result && "statusCode" in result && (result as any).statusCode >= 400) {
        const statusCode = (result as any).statusCode;
        const message = (result as any).message || "";
        const isTokenExpired = statusCode === 400 && /expired/i.test(message);
        if (isTokenExpired) {
          deleteCookie(VERIFICATION_TOKEN_COOKIE);
          setOtpCode("");
          setOtpError("Your verification has expired, please verify again.");
          setOtpStage("send");
          return;
        }
        setSubmitQuoteError(message || "Failed to submit quotation.");
        return;
      }
      sessionStorage.removeItem("vsx_otp_expiry");
      setSubmitQuoteSuccess(true);

      const updatedDetails = await fetchRFQById(selectedRfqId!);

      if (!isErrorResponse(updatedDetails)) {
        setSelectedRfq(updatedDetails);
      } else {
        setSubmitQuoteError(updatedDetails.description || updatedDetails.message || "Failed to refresh RFQ details.");
      }

      if (selectedRfqId) {
        try {
          const updatedQuotation = await fetchSupplierQuotationBySupplierId(selectedRfqId);
          if (
            !isErrorResponse(updatedQuotation) &&
            updatedQuotation &&
            'suppliers' in updatedQuotation &&
            Array.isArray(updatedQuotation.suppliers)
          ) {
            const mine =
              updatedQuotation.suppliers.find((s) => s.supplierId === supplierId) ||
              updatedQuotation.suppliers[0] ||
              null;
            setOwnQuotation(mine);
          }
        } catch {
        }
      }

      if (supplierId) {
        const listData = await fetchRFQMasterData({
          supplierId,
          index: 0,
          limit: 10,
        });

        if (!isErrorResponse(listData)) {
          setRfqs(listData);
        }
      }
    } catch (err: any) {
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


  const renderRfqDetailInner = () => {
    const isLeadQuote = Boolean(
      (ownQuotation?.isLead === true || (ownQuotation as any)?.isLead === "true") &&
      ownQuotation?.status === "SUBMITTED"
    );

    return (
      <>

        {/* Modal Header */}
        <div className="pud-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <span className="pud-modal-badge">
              <IconFile /> RFQ Specification
            </span>
            {isLeadQuote && (
              <span
                className="pud-modal-badge"
                style={{
                  background: '#fef3c7',
                  color: '#b45309',
                  border: '1px solid #fde68a',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                Leading
              </span>
            )}
          </div>
          <button className="pud-modal-close" onClick={closeRfqDetail}>
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

        <form onSubmit={handleSubmitQuotationClick}>
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
                  onClick={() => { if (selectedRfqId) handleViewRfqDetails(selectedRfqId); }}
                >
                  Retry Loading
                </button>
              </div>
            )}

            {selectedRfq && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                <div>
                  <div className="pud-modal-section-title">Description</div>
                  <p className="pud-modal-desc" style={{ whiteSpace: 'pre-wrap' }}>
                    {selectedRfq.description || "No description provided."}
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '12px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Start Date</div>
                      <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 600, marginTop: '2px' }}>
                        {new Date(selectedRfq.startDate).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>End Date</div>
                      <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 600, marginTop: '2px' }}>
                        {new Date(selectedRfq.endDate).toLocaleDateString()}
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

                {((selectedRfq.technicalSpecificationDocuments?.length ?? 0) > 0 ||
                  (selectedRfq.termsConditionDocuments?.length ?? 0) > 0) && (
                    <div>
                      <div className="pud-modal-section-title">Reference Documents</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginTop: '8px' }}>

                        {selectedRfq.technicalSpecificationDocuments?.map((doc) => (
                          <div key={doc.id} className="pud-rfq-doc-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden', flex: 1 }}>
                              <span className="pud-rfq-doc-icon"><IconFile /></span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div className="pud-rfq-doc-name" title={doc.fileName}>{doc.fileName}</div>
                                <div className="pud-rfq-doc-type">Tech Spec • {doc.fileType.toUpperCase()}</div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '8px' }}>
                              <button
                                type="button"
                                title="Preview document"
                                onClick={() => handleDocumentAction(doc, 'preview')}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', padding: '4px', display: 'inline-flex', borderRadius: '4px' }}
                              >
                                <IconEye />
                              </button>
                              <button
                                type="button"
                                title="Download document"
                                onClick={() => handleDocumentAction(doc, 'download')}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: '4px', display: 'inline-flex', borderRadius: '4px' }}
                              >
                                <IconDownload />
                              </button>
                            </div>
                          </div>
                        ))}

                        {selectedRfq.termsConditionDocuments?.map((doc) => (
                          <div key={doc.id} className="pud-rfq-doc-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden', flex: 1 }}>
                              <span className="pud-rfq-doc-icon" style={{ background: '#fef3c7', color: '#d97706' }}><IconFile /></span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div className="pud-rfq-doc-name" title={doc.fileName}>{doc.fileName}</div>
                                <div className="pud-rfq-doc-type">Terms & Conditions • {doc.fileType.toUpperCase()}</div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '8px' }}>
                              <button
                                type="button"
                                title="Preview document"
                                onClick={() => handleDocumentAction(doc, 'preview')}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', padding: '4px', display: 'inline-flex', borderRadius: '4px' }}
                              >
                                <IconEye />
                              </button>
                              <button
                                type="button"
                                title="Download document"
                                onClick={() => handleDocumentAction(doc, 'download')}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: '4px', display: 'inline-flex', borderRadius: '4px' }}
                              >
                                <IconDownload />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Sourcing Items Table */}
                <div>
                  <div className="pud-modal-section-title" style={{ marginBottom: '12px' }}>Required Materials & Services</div>
                  {selectedRfq.addLotOption ? (
                    <div className="pud-rfq-table-container">
                      <table className="pud-rfq-items-table">
                        <thead>
                          <tr>
                            <th>Material Info</th>
                            <th>Code</th>
                            <th style={{ textAlign: 'left' }}>Qty Required</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedRfq.items?.map((item, idx) => {
                            return (
                              <tr key={idx}>
                                <td>
                                  <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.description}</div>
                                </td>
                                <td>
                                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                    {item.materialCode || "N/A"}
                                  </div>
                                </td>
                                <td style={{ textAlign: 'left', fontWeight: 600, color: '#0f172a' }}>
                                  {item.quantity} <span style={{ fontSize: '12px', fontWeight: 400, color: '#64748b' }}>{item.uom}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <>
                      <div className="pud-rfq-table-container">
                        <table className="pud-rfq-items-table">
                          <thead>
                            <tr>
                              <th>Material Info</th>
                              <th>Code</th>
                              <th style={{ textAlign: 'left' }}>Qty</th>
                              <th style={{ textAlign: 'left' }}>Delivery Charge</th>
                              <th style={{ textAlign: 'left' }}>Delivery Type</th>
                              <th style={{ textAlign: 'left' }}>Discount</th>
                              <th style={{ textAlign: 'left' }}>Discount Type</th>
                              <th style={{ textAlign: 'left' }}>Tax</th>
                              <th style={{ textAlign: 'left' }}>Tax Type</th>
                              <th style={{ textAlign: 'left', width: '110px' }}>Quoted Price</th>
                              <th style={{ textAlign: 'left', width: '110px' }}>Sub Total</th>
                              <th style={{ textAlign: 'left', width: '110px' }}>Quoted Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedRfq.items?.map((item, idx) => {
                              const itemKey = item.supplierRFQItemId || `item-${idx}`;
                              const line = quoteLineItems[itemKey] || {
                                deliveryCharge: 0,
                                deliveryType: "PERCENTAGE",
                                discount: 0,
                                discountType: "PERCENTAGE",
                                tax: 0,
                                taxType: "PERCENTAGE",
                                quotedPrice: 0,
                                subTotal: 0,
                                quotedAmount: 0,
                              };
                              return (
                                <tr key={itemKey}>
                                  <td>
                                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.description}</div>
                                  </td>
                                  <td>
                                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                      {item.materialCode || "N/A"}
                                    </div>
                                  </td>
                                  <td style={{ textAlign: 'left', fontWeight: 600, color: '#0f172a' }}>
                                    {item.quantity} <span style={{ fontSize: '12px', fontWeight: 400, color: '#64748b' }}>{item.uom}</span>
                                  </td>
                                  <td>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      className="pud-rfq-item-input"
                                      value={line.deliveryCharge || ""}
                                      onChange={(e) => handleLineItemFieldChange(itemKey, "deliveryCharge", e.target.value)}
                                      placeholder="0.00"
                                      style={{ width: '100px', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px' }}
                                    />
                                  </td>
                                  <td>
                                    <select
                                      value={line.deliveryType}
                                      onChange={(e) => handleLineItemFieldChange(itemKey, "deliveryType", e.target.value)}
                                      style={{ width: '110px', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', background: '#ffffff' }}
                                    >
                                      <option value="PERCENTAGE">PERCENTAGE</option>
                                      <option value="AMOUNT">AMOUNT</option>
                                    </select>
                                  </td>
                                  <td>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      className="pud-rfq-item-input"
                                      value={line.discount || ""}
                                      onChange={(e) => handleLineItemFieldChange(itemKey, "discount", e.target.value)}
                                      placeholder="0.00"
                                      style={{ width: '100px', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px' }}
                                    />
                                  </td>
                                  <td>
                                    <select
                                      value={line.discountType}
                                      onChange={(e) => handleLineItemFieldChange(itemKey, "discountType", e.target.value)}
                                      style={{ width: '110px', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', background: '#ffffff' }}
                                    >
                                      <option value="PERCENTAGE">PERCENTAGE</option>
                                      <option value="AMOUNT">AMOUNT</option>
                                    </select>
                                  </td>
                                  <td>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      className="pud-rfq-item-input"
                                      value={line.tax || ""}
                                      onChange={(e) => handleLineItemFieldChange(itemKey, "tax", e.target.value)}
                                      placeholder="0.00"
                                      style={{ width: '100px', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px' }}
                                    />
                                  </td>
                                  <td>
                                    <select
                                      value={line.taxType}
                                      onChange={(e) => handleLineItemFieldChange(itemKey, "taxType", e.target.value)}
                                      style={{ width: '110px', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', background: '#ffffff' }}
                                    >
                                      <option value="PERCENTAGE">PERCENTAGE</option>
                                      <option value="AMOUNT">AMOUNT</option>
                                    </select>
                                  </td>
                                  <td>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      className="pud-rfq-item-input"
                                      value={line.quotedPrice || ""}
                                      onChange={(e) => handleLineItemFieldChange(itemKey, "quotedPrice", e.target.value)}
                                      placeholder="0.00"
                                      style={{ width: '110px', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: '#0f172a' }}
                                      required
                                    />
                                  </td>
                                  <td style={{ fontWeight: 600, color: '#0f172a', fontSize: '13px' }}>
                                    {line.subTotal.toFixed(2)}
                                  </td>
                                  <td style={{ fontWeight: 600, color: '#0f172a', fontSize: '13px' }}>
                                    {line.quotedAmount.toFixed(2)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', background: '#f8fafc', padding: '16px 20px', borderRadius: '10px', border: '1px solid #e2e8f0', marginTop: '16px' }}>
                        <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: 700 }}>Total Price Quote</span>
                        <span style={{ fontSize: '16px', fontWeight: 700, color: '#16a34a' }}>
                          {Number(quoteTotalPrice).toFixed(2)}
                        </span>
                      </div>
                    </>
                  )}
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


                {selectedRfq.addLotOption && (
                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                    <div className="pud-modal-section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <IconSparkles /> Commercial Proposal / Quotation Details
                      </div>
                      {isLeadQuote && (
                        <span
                          style={{
                            background: '#fef3c7',
                            color: '#b45309',
                            border: '1px solid #fde68a',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          Leading
                        </span>
                      )}
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
                          style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.75rem' }}
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
                          style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.75rem', background: '#ffffff' }}
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
                          style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.75rem' }}
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
                          style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.75rem', background: '#ffffff' }}
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
                          style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.75rem' }}
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
                          style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.75rem', background: '#ffffff' }}
                        >
                          <option value="PERCENTAGE">PERCENTAGE</option>
                          <option value="AMOUNT">AMOUNT</option>
                        </select>
                      </div>

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
                )}

              </div>
            )}
          </div>

          {selectedRfq && !canSubmit && (
            <div style={{
              background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e',
              padding: '10px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
              marginTop: '16px', textAlign: 'center'
            }}>
              {notYetOpen
                ? "This RFQ hasn't opened for bidding yet — check back after the start date."
                : frozen
                  ? "The buyer has frozen this RFQ's bid. You can no longer submit a quotation."
                  : "This RFQ's submission window has closed. You can no longer submit a quotation."}
            </div>
          )}

          {/* Modal Footer */}
          <div className="pud-modal-footer">
            <button
              type="button"
              className="pud-btn pud-btn-outline"
              onClick={closeRfqDetail}
              style={{ marginRight: '10px' }}
            >
              Close
            </button>
            {selectedRfq && (
              <button
                type="submit"
                className="pud-btn pud-btn-message"
                disabled={submittingQuote || !canSubmit}
                style={{ background: '#2563eb', color: '#ffffff' }}
                title={
                  notYetOpen
                    ? "This RFQ hasn't opened for bidding yet."
                    : frozen
                      ? "The buyer has frozen this RFQ's bid."
                      : closed
                        ? "This RFQ's submission window has closed."
                        : undefined
                }
              >
                {submittingQuote
                  ? "Submitting..."
                  : notYetOpen
                    ? "Not Yet Open"
                    : frozen
                      ? "Bid Frozen"
                      : closed
                        ? "Submission Closed"
                        : "Submit Quotation"}
              </button>
            )}
          </div>
        </form>

      </>
    );
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
        <button
          type="button"
          className="sad-mobile-sidebar-toggle"
          onClick={() => setIsMobileSidebarOpen((prev) => !prev)}
          aria-label={isMobileSidebarOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMobileSidebarOpen}
        >
          {isMobileSidebarOpen ? <IconClose /> : <IconMenu />}
        </button>

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
              onCloseCatalogList={() => {
                setActiveNav("dashboard");
                setRfqPageView("dashboard");
                setSelectedRfqId(null);
                setSelectedRfq(null);
                setRfqDetailError(null);
              }}
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
              <div ref={setCatalogViewContainer} />
            )
              : activeNav === "userList" ? (
                <UserAdmin />
              ) : activeNav === "companyProfile" ? (
                <CompanyProfile mode="network-admin" showHeader={false} />
              ) : activeNav === "invitations" ? (
                <Invitations isAdmin adminRole="supplier" />
              ) : rfqPageView === "allRfqs" ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '20px' }}>
                    <div>
                      <h1 className="pud-title">All RFQs</h1>
                      <p className="pud-subtitle" style={{ marginBottom: 0 }}>
                        Sourcing opportunities matched to your industry categories.
                      </p>
                    </div>
                    <button className="pud-btn pud-btn-outline" onClick={handleBackToDashboard}>
                      ← Back to Dashboard
                    </button>
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
                          <thead>
                            <tr>
                              <th style={{ width: '48px' }}>S.No</th>
                              <th>RFQ Number</th>
                              <th>Title</th>
                              <th>Organization</th>
                              <th>Delivery Location</th>
                              <th>Closing Date</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {allRfqsList.map((rfq: any, idx: number) => (
                              <tr key={rfq.rfqId || idx}>
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
                                <td>
                                  <button
                                    className="pud-btn pud-btn-outline"
                                    onClick={() => handleViewRfqDetailsFullPage(rfq.rfqId)}
                                  >
                                    View RFQ Details
                                  </button>
                                </td>
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
                </>
              ) : rfqPageView === "rfqDetail" ? (
                <>
                  <div className="pud-rfq-fullpage">
                    {renderRfqDetailInner()}
                  </div>
                </>
              ) : (
                <>
                  <h1 className="sad-title">Supplier Admin Command Center</h1>
                  <p className="sad-subtitle">Manage suppliers, track sourcing activities, and oversee operations.</p>

                  <div className="sad-status-banner">
                    <span className="sad-status-dot" />
                    <div>
                      <div className="sad-status-title">Active Supplier Administration Portal (100%)</div>
                      <div className="sad-status-subtext">
                        You have administrative access to manage supplier operations and user accounts.
                      </div>
                    </div>
                  </div>

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
                </>
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

        {otpStage === "send" && (
          <div className="pud-modal-overlay" onClick={() => setOtpStage("none")} style={{ zIndex: 9999 }}>
            <div className="pud-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', zIndex: 10000 }}>
              <div className="pud-modal-header" style={{ paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
                <span className="pud-modal-badge">
                  <IconMail /> Verify It's You
                </span>
                <button className="pud-modal-close" onClick={() => setOtpStage("none")}>
                  <IconClose />
                </button>
              </div>

              <div className="pud-modal-body" style={{ textAlign: 'center', paddingTop: '24px', paddingBottom: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>
                  Confirm Your Quotation
                </h3>
                <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '0', lineHeight: '1.5' }}>
                  For security, we'll send a one-time code to your registered email before this quotation goes to the buyer.
                </p>
                {otpError && (
                  <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '14px' }}>{otpError}</div>
                )}
              </div>

              <div className="pud-modal-footer" style={{ borderTop: '1px solid #e2e8f0', gap: '10px' }}>
                <button type="button" className="pud-btn pud-btn-outline" onClick={() => setOtpStage("none")} style={{ flex: 1 }}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="pud-btn pud-btn-message"
                  onClick={handleSendOtp}
                  disabled={sendingOtp}
                  style={{ flex: 1, background: '#2563eb', color: '#ffffff' }}
                >
                  {sendingOtp ? "Sending..." : "Send OTP"}
                </button>
              </div>
            </div>
          </div>
        )}

        {otpStage === "verify" && (
          <div className="pud-modal-overlay" onClick={() => setOtpStage("none")} style={{ zIndex: 9999 }}>
            <div className="pud-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', zIndex: 10000 }}>
              <div className="pud-modal-header" style={{ paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
                <span className="pud-modal-badge">
                  <IconMail /> Enter Verification Code
                </span>
                <button className="pud-modal-close" onClick={() => setOtpStage("none")}>
                  <IconClose />
                </button>
              </div>

              <div className="pud-modal-body" style={{ paddingTop: '20px', paddingBottom: '8px' }}>
                <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px', textAlign: 'center' }}>
                  We've sent a 6-digit code to your email. It expires in{" "}
                  <strong style={{ color: otpRemaining <= 30 ? '#ef4444' : '#1e293b' }}>
                    {formatOtpTimer(otpRemaining)}
                  </strong>.
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  className="pud-rfq-item-input"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="Enter OTP"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '18px',
                    letterSpacing: '4px',
                    textAlign: 'center',
                    fontWeight: 700,
                    color: '#0f172a'
                  }}
                />
                {otpRemaining <= 0 ? (
                  <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '10px', textAlign: 'center' }}>
                    Code expired. Please resend the OTP.
                  </div>
                ) : otpError ? (
                  <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '10px', textAlign: 'center' }}>{otpError}</div>
                ) : null}
                <div style={{ textAlign: 'center', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={sendingOtp || otpRemaining > 0}
                    style={{
                      background: 'none', border: 'none', padding: 0,
                      color: otpRemaining > 0 ? '#94a3b8' : '#2563eb',
                      fontSize: '13px',
                      cursor: otpRemaining > 0 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Resend OTP
                  </button>
                </div>
              </div>

              <div className="pud-modal-footer" style={{ borderTop: '1px solid #e2e8f0', gap: '10px' }}>
                <button type="button" className="pud-btn pud-btn-outline" onClick={() => setOtpStage("none")} style={{ flex: 1 }}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="pud-btn pud-btn-message"
                  onClick={handleVerifyOtp}
                  disabled={verifyingOtp || otpRemaining <= 0}
                  style={{ flex: 1, background: '#2563eb', color: '#ffffff' }}
                >
                  {verifyingOtp ? "Verifying..." : "Verify OTP"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showConfirmSubmit && (
          <div className="pud-modal-overlay" onClick={() => setShowConfirmSubmit(false)} style={{ zIndex: 9999 }}>
            <div className="pud-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', zIndex: 10000 }}>
              <div className="pud-modal-header" style={{ paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
                <span className="pud-modal-badge" style={{ background: '#fef3c7', color: '#d97706' }}>
                  <IconAlertCircle /> Confirmation Required
                </span>
                <button
                  className="pud-modal-close"
                  onClick={() => setShowConfirmSubmit(false)}
                >
                  <IconClose />
                </button>
              </div>

              <div className="pud-modal-body" style={{ textAlign: 'center', paddingTop: '24px', paddingBottom: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>
                  Submit Quotation?
                </h3>
                <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '0', lineHeight: '1.5' }}>
                  Are you sure you want to submit this quotation? Once submitted, it will be sent to the buyer and cannot be easily modified.
                </p>
              </div>

              <div className="pud-modal-footer" style={{ borderTop: '1px solid #e2e8f0', gap: '10px' }}>
                <button
                  type="button"
                  className="pud-btn pud-btn-outline"
                  onClick={() => setShowConfirmSubmit(false)}
                  style={{ flex: 1 }}
                >
                  No, Cancel
                </button>
                <button
                  type="button"
                  className="pud-btn pud-btn-message"
                  onClick={handleConfirmSubmitQuotation}
                  disabled={submittingQuote}
                  style={{ flex: 1, background: '#2563eb', color: '#ffffff' }}
                >
                  {submittingQuote ? "Submitting..." : "Yes, Submit"}
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedRfqId && rfqPageView === "dashboard" && (
          <div className="pud-modal-overlay" onClick={closeRfqDetail}>
            <div className="pud-modal pud-modal-rfq" onClick={(e) => e.stopPropagation()}>
              {renderRfqDetailInner()}
            </div>
          </div>
        )}
      </div>
      <EAuctionWidget />
    </div>
  );
};

export default SupplierAdminDash;