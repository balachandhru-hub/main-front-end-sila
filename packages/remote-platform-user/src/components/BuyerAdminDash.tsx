import React, { useState, useEffect } from "react";
import "./BuyerAdminDash.css";
import Header from "../../../remote-buyer/src/components/Header";
import UserAdmin from "../UserAdmin";
import UserTemplate from "./usertemplate";
import { fetchBuyerRFQs, fetchBuyerRFQById } from "../../../remote-buyer/src/api/Buyerapi";
import CreateRFQ from "./UserListTable/CreateRFQ";

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

const NavIconSettings = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const NavIconTemplate = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18" />
    <path d="M9 3v18" />
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

const NavIconFilePlus = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M12 12v6M9 15h6" />
  </svg>
);

const navItems: { key: string; icon: React.ReactNode; label: string; badge?: number }[] = [
  { key: "dashboard", icon: <NavIconHome />, label: "Dashboard" },
  { key: "createRFQ", icon: <NavIconFilePlus />, label: "Create RFQ" },
  { key: "activeRFQs", icon: <IconFile />, label: "Active RFQs" },
  { key: "userList", icon: <NavIconUsers />, label: "User List" },
  { key: "template", icon: <NavIconTemplate />, label: "Template" },
  { key: "purchaseOrders", icon: <IconBag />, label: "Purchase Orders" },
  { key: "messages", icon: <IconMessageSquare />, label: "Messages" },
  { key: "companyProfile", icon: <NavIconBuilding />, label: "Company Profile" },
  { key: "settings", icon: <NavIconSettings />, label: "Settings" },
];

const statCards: StatCard[] = [
  { icon: <IconFile />, label: "ACTIVE RFQS", value: 3, linkText: "Manage RFQs >", colorClass: "bad-stat-icon-blue" },
  { icon: <NavIconFilePlus />, label: "CREATE RFQ", value: 3, linkText: "Manage RFQs >", colorClass: "bad-stat-icon-blue" },
  { icon: <IconMail />, label: "QUOTATIONS RECEIVED", value: 5, linkText: "Review bids >", colorClass: "bad-stat-icon-indigo" },
  { icon: <IconTrend />, label: "SUPPLIERS ENGAGED", value: 8, linkText: "View directory", colorClass: "bad-stat-icon-green" },
  { icon: <IconBag />, label: "PURCHASE ORDERS", value: 4, linkText: "Track orders >", colorClass: "bad-stat-icon-purple" },
  { icon: <IconInvoice />, label: "PENDING INVOICES", value: 2, linkText: "Invoice list >", colorClass: "bad-stat-icon-orange" },
  { icon: <IconBell />, label: "NOTIFICATIONS", value: 3, linkText: "Inquiries & Alerts >", colorClass: "bad-stat-icon-teal" },
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

  const [buyerId] = useState<string | null>(
    sessionStorage.getItem("vosox_buyer_id")
  );
  const [loadingRfqs, setLoadingRfqs] = useState(false);
  const [rfqsError, setRfqsError] = useState<string | null>(null);
  const [rfqs, setRfqs] = useState<any[]>(mockRfqs);
  const [visibleRfqCount, setVisibleRfqCount] = useState(3);
  const RFQ_INITIAL_VISIBLE = 3;

  useEffect(() => {
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
        const finalData = data.length > 0 ? data : mockRfqs;
        setRfqs(finalData);
        setVisibleRfqCount(Math.min(RFQ_INITIAL_VISIBLE, finalData.length));
      } catch (err: any) {
        console.error("Failed to load RFQs", err);
        setRfqsError(err.message || "Failed to load sourcing opportunities.");
      } finally {
        setLoadingRfqs(false);
      }
    };
    loadRfqs();
  }, [buyerId]);

  // const [selectedRfqId, setSelectedRfqId] = useState<string | null>(null);
  // const [selectedRfq, setSelectedRfq] = useState<any | null>(null);
  // const [loadingRfqDetails, setLoadingRfqDetails] = useState<boolean>(false);
  // const [rfqDetailsError, setRfqDetailsError] = useState<string | null>(null);

  /* ---- Full-page "All RFQs" list + full-page RFQ detail view ---- */
  const [rfqPageView, setRfqPageView] = useState<"dashboard" | "allRfqs" | "rfqDetail">("dashboard");

  const [allRfqsList, setAllRfqsList] = useState<any[]>([]);
  const [loadingAllRfqs, setLoadingAllRfqs] = useState(false);
  const [allRfqsError, setAllRfqsError] = useState<string | null>(null);
  const [allRfqsLoaded, setAllRfqsLoaded] = useState(false);

  // const [fullPageRfqId, setFullPageRfqId] = useState<string | null>(null);
  const [fullPageRfq, setFullPageRfq] = useState<any | null>(null);
  const [loadingFullPageRfq, setLoadingFullPageRfq] = useState(false);
  const [fullPageRfqError, setFullPageRfqError] = useState<string | null>(null);

  const handleOpenAllRfqs = async () => {
    setRfqPageView("allRfqs");
    if (allRfqsLoaded || loadingAllRfqs) return;

    setLoadingAllRfqs(true);
    setAllRfqsError(null);
    try {
      if (!buyerId) {
        setAllRfqsList(rfqs.length > 0 ? rfqs : mockRfqs);
      } else {
        const data = await fetchBuyerRFQs({ buyerId, index: 0, limit: 100 });
        setAllRfqsList(data.length > 0 ? data : mockRfqs);
      }
    } catch (err: any) {
      console.error("Failed to load full RFQ list", err);
      setAllRfqsError(err.message || "Failed to load the full RFQ list.");
      setAllRfqsList(rfqs.length > 0 ? rfqs : mockRfqs);
    } finally {
      setLoadingAllRfqs(false);
      setAllRfqsLoaded(true);
    }
  };

  const handleBackToDashboard = () => {
    setRfqPageView("dashboard");
  };

  const handleViewRfqDetailsFullPage = async (rfqId: string) => {
    // setFullPageRfqId(rfqId);
    setRfqPageView("rfqDetail");
    setLoadingFullPageRfq(true);
    setFullPageRfqError(null);

    try {
      const details = await fetchBuyerRFQById(rfqId);
      setFullPageRfq(details);
    } catch (err: any) {
      console.error("Failed to load RFQ details from API", err);
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
    // setFullPageRfqId(null);
    setFullPageRfq(null);
    setFullPageRfqError(null);
  };



  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError(null);
    try {
      sessionStorage.clear();
      window.dispatchEvent(new CustomEvent("session:expired"));
    } catch (error: any) {
      setLogoutError(error?.message || "Logout request failed, clearing session locally.");
    } finally {
      setLoggingOut(false);
    }
  };

  const resolveAnswersForQuestion = (
    rfq: any,
    question: any,
    _index: number
  ): { supplierName: string | null; display: string }[] => {
    const answerList = rfq?.supplierAnswers?.answers;
    if (!Array.isArray(answerList) || !question?.id) return [];

    const match = answerList.find((a: any) => a?.rfqQuestionId === question.id);
    if (!match) return [];

    const resolveOptionLabels = (ids: string[]): string[] => {
      const optionList = question?.questionOptions;
      if (!Array.isArray(optionList)) return [];
      return ids
        .map((id) => optionList.find((opt: any) => opt?.id === id)?.label)
        .filter((label: any): label is string => Boolean(label));
    };

    let display: string | null = null;

    if (match.attachment) {
      display = match.attachment.fileName || match.answer || "Attached file";
    } else if (match.answer) {
      display = match.answer;
    } else if (Array.isArray(match.questionOptionIds) && match.questionOptionIds.length > 0) {
      const labels = resolveOptionLabels(match.questionOptionIds);
      display = labels.length > 0 ? labels.join(", ") : match.questionOptionIds.join(", ");
    } else if (match.questionOptionId) {
      const labels = resolveOptionLabels([match.questionOptionId]);
      display = labels[0] || match.questionOptionId;
    }

    return display ? [{ supplierName: null, display }] : [];
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#f4f6f9" }}>
      <Header />

      <div
        className="bad-shell"
        style={{ flex: 1, position: "relative", minHeight: "calc(100vh - 64px)" }}
      >
        <aside className="bad-sidebar">
          <nav className="bad-nav" style={{ paddingTop: "40px" }}>
            {navItems.map((item) => (
              <div
                key={item.key}
                className={`bad-nav-item${activeNav === item.key ? " bad-nav-item-active" : ""}`}
                onClick={() => setActiveNav(item.key)}
              >
                <span className="bad-nav-icon">{item.icon}</span>
                <span className="bad-nav-label">{item.label}</span>
                {item.badge && <span className="bad-nav-badge">{item.badge}</span>}
              </div>
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
            ) : activeNav === "template" ? (
              <UserTemplate />
            ) : activeNav === "createRFQ" ? (
              <CreateRFQ />
            ) : rfqPageView === "allRfqs" ? (
              <>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '20px' }}>
                  <div>
                    <h1 className="bad-title">All RFQs</h1>
                    <p className="bad-subtitle" style={{ marginBottom: 0 }}>
                      RFQs posted across your organization, awaiting supplier quotations.
                    </p>
                  </div>
                  <button className="bad-btn bad-btn-outline" onClick={handleBackToDashboard}>
                    ← Back to Dashboard
                  </button>
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
                  <div className="bad-rfq-table-container">
                    <table className="bad-rfq-items-table bad-allrfqs-table">
                      <thead>
                        <tr>
                          <th style={{ width: '48px' }}>#</th>
                          <th>RFQ Number</th>
                          <th>Title</th>
                          <th>Organization</th>
                          <th>Delivery Location</th>
                          <th>Closing Date</th>
                          <th style={{ textAlign: 'right' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allRfqsList.map((rfq: any, idx: number) => (
                          <tr key={rfq.rfqId || idx}>
                            <td style={{ color: '#94a3b8', fontWeight: 600 }}>{idx + 1}</td>
                            <td><span className="bad-code-badge">{rfq.rfqNumber}</span></td>
                            <td style={{ fontWeight: 600, color: '#1e293b' }}>{rfq.title}</td>
                            <td>{rfq.organizationName}</td>
                            <td>{rfq.deliveryLocation}</td>
                            <td>
                              {rfq.endDate
                                ? new Date(rfq.endDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                                : "—"}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                className="bad-btn bad-btn-outline"
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
                )}
              </>
            ) : rfqPageView === "rfqDetail" ? (
              <>
                <button
                  className="bad-btn bad-btn-outline"
                  onClick={handleBackToAllRfqs}
                  style={{ marginBottom: '16px' }}
                >
                  ← Back to All RFQs
                </button>

                <div className="bad-modal bad-rfq-fullpage">
                  <div className="bad-modal-header">
                    <span className="bad-modal-badge">
                      <IconFile /> RFQ Specification
                    </span>
                    <button className="bad-modal-close" onClick={handleBackToAllRfqs}>
                      <IconClose />
                    </button>
                    <h2 className="bad-modal-name">
                      {loadingFullPageRfq ? "Loading RFQ Details..." : fullPageRfq?.title || "RFQ Details"}
                    </h2>
                    {fullPageRfq && (
                      <div className="bad-modal-meta">
                        <span><IconCalendar /> Closes: {new Date(fullPageRfq.endDate).toLocaleDateString()}</span>
                        <span><IconPin /> Delivery: {fullPageRfq.deliveryLocation}</span>
                      </div>
                    )}
                  </div>

                  <div className="bad-modal-body">
                    {loadingFullPageRfq ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
                        <div style={{ color: '#64748b', fontSize: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                          <div className="bad-spinner" style={{ width: '32px', height: '32px' }} />
                          <span>Fetching RFQ specification details...</span>
                        </div>
                      </div>
                    ) : fullPageRfqError && !fullPageRfq ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: '#ef4444' }}>
                        {fullPageRfqError}
                      </div>
                    ) : fullPageRfq ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '28px' }}>
                        {/* Left Column: RFQ Specifications & Materials */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                          <div>
                            <div className="bad-modal-section-title">Description</div>
                            <p className="bad-modal-desc" style={{ whiteSpace: 'pre-wrap', fontSize: '13.5px', color: '#334155', lineHeight: '1.6' }}>
                              {fullPageRfq.description || "No description provided."}
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', background: '#f8fafc', padding: '14px 18px', borderRadius: '10px', border: '1px solid #e2e8f0', marginTop: '12px' }}>
                              <div>
                                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>Start Date</div>
                                <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 600, marginTop: '2px' }}>
                                  {new Date(fullPageRfq.startDate).toLocaleString()}
                                </div>
                              </div>
                              <div>
                                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>End Date</div>
                                <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 600, marginTop: '2px' }}>
                                  {new Date(fullPageRfq.endDate).toLocaleString()}
                                </div>
                              </div>
                              <div>
                                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>Add Lot Option</div>
                                <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 600, marginTop: '2px' }}>
                                  {fullPageRfq.addLotOption ? "Allowed" : "Not Allowed"}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Items table */}
                          {fullPageRfq.items && fullPageRfq.items.length > 0 && (
                            <div>
                              <div className="bad-modal-section-title" style={{ marginBottom: '10px' }}>Required Materials & Services</div>
                              <div className="bad-rfq-table-container" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                                <table className="bad-rfq-items-table">
                                  <thead>
                                    <tr>
                                      <th>Material Info</th>
                                      <th>Group / Code</th>
                                      <th style={{ textAlign: 'right' }}>Qty</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {fullPageRfq.items.map((item: any, idx: number) => (
                                      <tr key={idx}>
                                        <td>
                                          <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.description}</div>
                                          {item.costCenter && (
                                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                              Cost Center: {item.costCenter}
                                            </div>
                                          )}
                                        </td>
                                        <td>
                                          <div style={{ fontSize: '12px', color: '#334155' }}>
                                            {item.materialGroup || "N/A"}
                                          </div>
                                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                            Code: {item.materialCode || "N/A"}
                                          </div>
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                                          {item.quantity} <span style={{ fontSize: '11px', fontWeight: 400, color: '#64748b' }}>{item.uom}</span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* Attached Documents */}
                          {((fullPageRfq.technicalSpecificationDocuments && fullPageRfq.technicalSpecificationDocuments.length > 0) ||
                            (fullPageRfq.termsConditionDocuments && fullPageRfq.termsConditionDocuments.length > 0)) && (
                              <div>
                                <div className="bad-modal-section-title" style={{ marginBottom: '10px' }}>Specifications & Terms Documents</div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                                  {fullPageRfq.technicalSpecificationDocuments?.map((doc: any, i: number) => (
                                    <div key={`tech-${i}`} className="bad-rfq-doc-card">
                                      <div className="bad-rfq-doc-icon"><IconFile /></div>
                                      <div style={{ overflow: 'hidden' }}>
                                        <div className="bad-rfq-doc-name" title={doc.fileName}>{doc.fileName}</div>
                                        <div className="bad-rfq-doc-type">Tech Spec Doc</div>
                                      </div>
                                    </div>
                                  ))}
                                  {fullPageRfq.termsConditionDocuments?.map((doc: any, i: number) => (
                                    <div key={`terms-${i}`} className="bad-rfq-doc-card">
                                      <div className="bad-rfq-doc-icon" style={{ background: '#fef3c7', color: '#d97706' }}><IconFile /></div>
                                      <div style={{ overflow: 'hidden' }}>
                                        <div className="bad-rfq-doc-name" title={doc.fileName}>{doc.fileName}</div>
                                        <div className="bad-rfq-doc-type">Terms & Conditions</div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                          {/* Supplier Quotations Received */}
                          <div>
                            <div className="bad-modal-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                              <IconSparkles /> Supplier Quotations Received
                            </div>
                            {fullPageRfq.supplierQuotation &&
                              fullPageRfq.supplierQuotation.filter((q: any) => q.quotationId || q.totalPrice !== null).length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '480px', overflowY: 'auto' }}>
                                {fullPageRfq.supplierQuotation
                                  .filter((q: any) => q.quotationId || q.totalPrice !== null)
                                  .map((quote: any, index: number) => (
                                    <div
                                      key={index}
                                      style={{
                                        background: '#ffffff',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '10px',
                                        padding: '16px',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                                        transition: 'border-color 0.2s ease'
                                      }}
                                    >
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
                                            Quote ID: {quote.quotationId ? `${quote.quotationId.substring(0, 8)}...` : `Quote #${index + 1}`}
                                          </span>
                                          <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                            Delivery: {quote.deliveryType || "Standard"}
                                          </span>
                                        </div>
                                        <span
                                          className={`bad-status-badge`}
                                          style={{
                                            background: quote.status === 'SUBMITTED' ? '#dcfce7' : '#f1f5f9',
                                            color: quote.status === 'SUBMITTED' ? '#15803d' : '#475569',
                                            padding: '3px 8px',
                                            borderRadius: '6px',
                                            fontSize: '11px',
                                            fontWeight: 600
                                          }}
                                        >
                                          {quote.status || "RECEIVED"}
                                        </span>
                                      </div>

                                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #f1f5f9', marginBottom: '12px', fontSize: '12px' }}>
                                        <div>
                                          <span style={{ color: '#64748b' }}>Delivery Charge:</span>
                                          <div style={{ fontWeight: 600, color: '#334155', marginTop: '2px' }}>${quote.deliveryCharge ?? 0}</div>
                                        </div>
                                        <div>
                                          <span style={{ color: '#64748b' }}>Tax:</span>
                                          <div style={{ fontWeight: 600, color: '#334155', marginTop: '2px' }}>${quote.tax ?? 0}</div>
                                        </div>
                                        <div>
                                          <span style={{ color: '#64748b' }}>Discount:</span>
                                          <div style={{ fontWeight: 600, color: '#dc2626', marginTop: '2px' }}>-${quote.discount ?? 0}</div>
                                        </div>
                                        <div>
                                          <span style={{ color: '#64748b' }}>Total Quote:</span>
                                          <div style={{ fontWeight: 700, color: '#16a34a', marginTop: '2px', fontSize: '13px' }}>${quote.totalPrice ?? 0}</div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            ) : (
                              <div className="bad-rfq-no-quote-box" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' }}>
                                <IconMail />
                                <div style={{ fontWeight: 600, color: '#475569', marginTop: '12px' }}>No Quotations Received Yet</div>
                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', lineHeight: '1.5', maxWidth: '240px' }}>
                                  When suppliers submit commercial bids, they will populate here in real-time.
                                </div>
                              </div>
                            )}
                          </div>

                        </div>

                        {/* Right Column: Evaluation Questions & Answers */}
                        <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                          <div className="bad-modal-section-title">Evaluation Questions & Answers</div>

                          {fullPageRfq.questions && fullPageRfq.questions.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '600px', overflowY: 'auto' }}>
                              {fullPageRfq.questions.map((q: any, i: number) => {
                                const answers = resolveAnswersForQuestion(fullPageRfq, q, i);
                                return (
                                  <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                                        Q{i + 1}: {q.question}
                                      </span>
                                      <span style={{ fontSize: '11px', color: '#64748b', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                                        {q.questionType} {q.isRequired ? "(Required)" : ""}
                                      </span>
                                    </div>

                                    {answers.length > 0 ? (
                                      <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {answers.map((ans, ai) => (
                                          <div key={ai} style={{ background: '#ffffff', border: '1px solid #dbeafe', borderRadius: '6px', padding: '8px 10px' }}>
                                            {ans.supplierName && (
                                              <div style={{ fontSize: '10.5px', fontWeight: 600, color: '#2563eb', marginBottom: '3px' }}>
                                                {ans.supplierName}
                                              </div>
                                            )}
                                            <div style={{ fontSize: '12.5px', color: '#334155' }}>
                                              {ans.display}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div style={{ marginTop: '8px', fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                                        No response yet.
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div style={{ fontSize: '13px', color: '#64748b' }}>No evaluation questions were configured for this RFQ.</div>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {fullPageRfq && (
                    <div className="bad-modal-footer">
                      <button
                        className="bad-btn bad-btn-outline"
                        onClick={handleBackToAllRfqs}
                        style={{ marginRight: '10px' }}
                      >
                        Close
                      </button>
                      <button className="bad-btn bad-btn-message" style={{ background: '#2563eb', color: '#ffffff' }}>
                        Evaluate Quotations
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <h1 className="bad-title">Buyer Admin Command Center</h1>
                <p className="bad-subtitle">Manage buyers, track procurement activities, and oversee operations.</p>

                <div className="bad-status-banner">
                  <span className="bad-status-dot" />
                  <div>
                    <div className="bad-status-title">Active Buyer Administration Portal (100%)</div>
                    <div className="bad-status-subtext">
                      You have administrative access to manage buyer operations and user accounts.
                    </div>
                  </div>
                </div>

                <div className="bad-stats-grid">
                  {statCards.map((stat) => (
                    <div className="bad-stat-card" key={stat.label}>
                      <div className={`bad-stat-icon ${stat.colorClass}`}>{stat.icon}</div>
                      <div className="bad-stat-label">{stat.label}</div>
                      <div className="bad-stat-value">{stat.value}</div>
                      <div className="bad-stat-link">{stat.linkText}</div>
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
                          <div className="bad-rfq-row" key={rfq.rfqId}>
                            <div className="bad-rfq-info">
                              <div className="bad-rfq-meta">
                                <span className="bad-code-badge">{rfq.rfqNumber}</span>
                                <span className="bad-dot-sep">•</span>
                                <span className="bad-company">{rfq.organizationName}</span>
                              </div>
                              <div className="bad-rfq-title">{rfq.title}</div>
                              <div className="bad-rfq-details">
                                <span>
                                  <IconCalendar /> Closes: {new Date(rfq.endDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                </span>
                                <span>
                                  <IconPin /> Deliv: {rfq.deliveryLocation}
                                </span>
                              </div>
                            </div>
                            <button
                              className="bad-btn bad-btn-outline"
                              onClick={() => handleViewRfqDetailsFullPage(rfq.rfqId)}
                            >
                              View RFQ Details
                            </button>
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

                  <section className="bad-panel">
                    <div className="bad-panel-header">
                      <div>
                        <div className="bad-panel-title">Quick Stats</div>
                        <div className="bad-panel-subtitle">Buyer administration metrics</div>
                      </div>
                    </div>
                    <div className="bad-panel-list" style={{ padding: "20px 0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #eef0f3" }}>
                        <span style={{ color: "#6b7280", fontWeight: 500 }}>Total Buyers</span>
                        <span style={{ fontWeight: 700, fontSize: "18px", color: "#111827" }}>24</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #eef0f3" }}>
                        <span style={{ color: "#6b7280", fontWeight: 500 }}>Active Users</span>
                        <span style={{ fontWeight: 700, fontSize: "18px", color: "#111827" }}>156</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0" }}>
                        <span style={{ color: "#6b7280", fontWeight: 500 }}>Total RFQs</span>
                        <span style={{ fontWeight: 700, fontSize: "18px", color: "#111827" }}>89</span>
                      </div>
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


      </div>
    </div>
  );
};

export default BuyerAdminDash;