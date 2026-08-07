import React, { useState, useEffect } from "react";
import "./BuyerDashBoard.css";
import CreateRFQ from "./Create_RFQ.tsx";
import Product from "./Product.tsx";
import Header from "./Header";
import { logoutBuyer, getBuyerProfile, fetchBuyerRFQs, fetchBuyerRFQById } from "../api/Buyerapi";
import UserTemplate from "../../../remote-platform-user/src/components/usertemplate.tsx"; 
import {CompanyProfile} from '@vosox/shared-ui';

/* ---------------------------------- Icons ---------------------------------- */

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


const IconMenu = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="12" x2="21" y2="12"></line>
    <line x1="3" y1="6" x2="21" y2="6"></line>
    <line x1="3" y1="18" x2="21" y2="18"></line>
  </svg>
);

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

const NavIconBag = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
    <path d="M3 6h18" />
    <path d="M16 10a4 4 0 0 1-8 0" />
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

const NavIconUsers = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const NavIconBarChart = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="20" x2="12" y2="10" />
    <line x1="18" y1="20" x2="18" y2="4" />
    <line x1="6" y1="20" x2="6" y2="16" />
  </svg>
);

// <-- ADDED: Template icon for sidebar
const NavIconTemplate = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18" />
    <path d="M9 3v18" />
  </svg>
);

/* ---------------------------------- Static data ---------------------------------- */

const navItems: { key: string; icon: React.ReactNode; label: string; badge?: number }[] = [
  { key: "dashboard", icon: <NavIconHome />, label: "Dashboard" },
  { key: "createRFQ", icon: <NavIconFilePlus />, label: "Create RFQ" },
  { key: "activeRFQs", icon: <NavIconFile />, label: "Active RFQs", badge: 2 },
  { key: "evaluateQuotations", icon: <NavIconFileCheck />, label: "Evaluate Quotations", badge: 2 },
  { key: "product", icon: <NavIconFileCheck />, label: "Product" },
  { key: "purchaseOrders", icon: <NavIconBag />, label: "Purchase Orders" },
  { key: "supplierDirectory", icon: <NavIconUsers />, label: "Supplier Directory" },
  { key: "spendReports", icon: <NavIconBarChart />, label: "Procurement Spend Reports" },
  { key: "messages", icon: <NavIconMessage />, label: "Messages" },
  { key: "companyProfile", icon: <NavIconBuilding />, label: "Company Profile" },
  { key: "template", icon: <NavIconTemplate />, label: "Template" }, // <-- ADDED Template nav item
  { key: "settings", icon: <NavIconSettings />, label: "Settings" },
];

const statCards: StatCard[] = [
  { icon: <IconFile />, label: "ACTIVE RFQS", value: 3, linkText: "Manage RFQs >", colorClass: "pud-stat-icon-blue" },
  { icon: <IconMail />, label: "QUOTATIONS RECEIVED", value: 5, linkText: "Review bids >", colorClass: "pud-stat-icon-indigo" },
  { icon: <IconTrend />, label: "SUPPLIERS ENGAGED", value: 8, linkText: "View directory", colorClass: "pud-stat-icon-green" },
  { icon: <IconBag />, label: "PURCHASE ORDERS", value: 4, linkText: "Track orders >", colorClass: "pud-stat-icon-purple" },
  { icon: <IconInvoice />, label: "PENDING INVOICES", value: 2, linkText: "Invoice list >", colorClass: "pud-stat-icon-orange" },
  { icon: <IconBell />, label: "NOTIFICATIONS", value: 3, linkText: "Inquiries & Alerts >", colorClass: "pud-stat-icon-teal" },
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


/* ---------------------------------- Component ---------------------------------- */

const BuyersDashboard: React.FC = () => {

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeNav, setActiveNav] = useState<string>("dashboard");
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const [selectedProfile, setSelectedProfile] = useState<MatchCard | null>(null);
  const [loadingRfqs, setLoadingRfqs] = useState(false);
  const [rfqsError, setRfqsError] = useState<string | null>(null);

  // const [rfqs, setRfqs] = useState<any[]>([]);
  const [rfqs, setRfqs] = useState<any[]>(mockRfqs);

  const [buyerId, setBuyerId] = useState<string | null>(
    sessionStorage.getItem("vosox_buyer_id")
  );

  useEffect(() => {
    const loadBuyerProfile = async () => {
      if (!buyerId) {
        try {
          const profile = await getBuyerProfile();
          if (profile?.id) {
            sessionStorage.setItem("vosox_buyer_id", profile.id);
            setBuyerId(profile.id);
          } else {
            setRfqsError("Buyer profile not found. Please complete onboarding.");
          }
        } catch (err: any) {
          console.error("Failed to load buyer profile", err);
          setRfqsError("Failed to load buyer profile details.");
        }
      }
    };
    loadBuyerProfile();
  }, [buyerId]);

  const [loadingRfqDetails, setLoadingRfqDetails] = useState<boolean>(false);
  const [rfqDetailsError, setRfqDetailsError] = useState<string | null>(null);

  useEffect(() => {
    const loadRfqs = async () => {
      if (!buyerId) return;
      setLoadingRfqs(true);
      setRfqsError(null);
      try {
        const data = await fetchBuyerRFQs({
          buyerId,
          index: 0,
          limit: 10,
        });
        setRfqs(data.length > 0 ? data : mockRfqs);
      } catch (err: any) {
        console.error("Failed to load RFQs", err);
        setRfqsError(err.message || "Failed to load sourcing opportunities.");
      } finally {
        setLoadingRfqs(false);
      }
    };
    loadRfqs();
  }, [buyerId]);

  const [selectedRfqId, setSelectedRfqId] = useState<string | null>(null);
  const [selectedRfq, setSelectedRfq] = useState<any | null>(null);

  const handleViewRfqDetails = async (rfqId: string) => {
    setSelectedRfqId(rfqId);
    setLoadingRfqDetails(true);
    setRfqDetailsError(null);
    try {
      const details = await fetchBuyerRFQById(rfqId);
      setSelectedRfq(details);
    } catch (err: any) {
      console.error("Failed to load RFQ details from API", err);
      setRfqDetailsError(err.message || "Failed to fetch details.");
      // Fallback to local list element (e.g. for mock items)
      const found = rfqs.find((r) => r.rfqId === rfqId) || null;
      setSelectedRfq(found);
    } finally {
      setLoadingRfqDetails(false);
    }
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError(null);
    try {
      await logoutBuyer();
    } catch (error: any) {
      setLogoutError(error?.message || "Logout request failed, clearing session locally.");
    } finally {
      sessionStorage.clear();
      window.dispatchEvent(new CustomEvent("session:expired"));
      setLoggingOut(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#f4f6f9" }}>
      {/* ---------------- Header ---------------- */}
      <Header />

      {/* ---------------- Body: sidebar + content ---------------- */}
      <div
        className={`pud-shell ${isSidebarOpen ? "" : "pud-sidebar-closed"}`}
        style={{ flex: 1, position: "relative", minHeight: "calc(100vh - 64px)" }}
      >
        <button
          className="pud-sidebar-toggle"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          style={{
            position: "absolute",
            top: "5px",
            left: "5px",
            zIndex: 1001,
            background: "#ffffff",
            border: "1px solid #e6e8ec",
            borderRadius: "6px",
            width: "30px",
            height: "30px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
            padding: 0,
          }}
          title="Toggle Sidebar"
        >
          {isSidebarOpen ? <IconClose /> : <IconMenu />}
        </button>

        <aside className="pud-sidebar">
          <nav className="pud-nav" style={{ paddingTop: "40px" }}>
            {navItems.map((item) => (
              <div
                key={item.key}
                className={`pud-nav-item${activeNav === item.key ? " pud-nav-item-active" : ""}`}
                onClick={() => setActiveNav(item.key)}
              >
                <span className="pud-nav-icon">{item.icon}</span>
                <span className="pud-nav-label">{item.label}</span>
                {item.badge && <span className="pud-nav-badge">{item.badge}</span>}
              </div>
            ))}
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
              <span className="pud-nav-icon" style={{ transform: "rotate(180deg)" }}>
                <LogoutIcon />
              </span>
              <span className="pud-nav-label">{loggingOut ? "Logging out..." : "Log Out"}</span>
            </div>
          </nav>
        </aside>

        <div className="pud-main">
          <main className="pud-content">
            {activeNav === "createRFQ" ? (
              <CreateRFQ />
            ) : activeNav === "product" ? (
              <Product />
            ) : activeNav === "template" ? ( // <-- ADDED: Template route handler
              <UserTemplate />
            ) : activeNav === "companyProfile" ? (
              <CompanyProfile
                mode="network-admin"
                entityLabel="Buyer"
                fetchProfile={getBuyerProfile}
              />
            ) : (
              // Blank page for Dashboard and every other nav item that has no view yet
              <>
                <h1 className="pud-title">Buyer Operations Command</h1>
                <p className="pud-subtitle">Real-time procurement tracking, bid submittals, and transaction monitoring.</p>

                <div className="pud-status-banner">
                  <span className="pud-status-dot" />
                  <div>
                    <div className="pud-status-title">Active Approved Buyer Portal Status (100%)</div>
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
                        <div className="pud-panel-title">Recent RFQs</div>
                        <div className="pud-panel-subtitle">RFQs you've posted, awaiting supplier quotations</div>
                      </div>
                      <a className="pud-panel-link" href="#">View All RFQs →</a>
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
                        {rfqs.map((rfq) => (
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
                      <div className="pud-matchmaker-title">Smart Supplier Matchmaker</div>
                    </div>
                    <div className="pud-matchmaker-subtitle">
                      Verified suppliers ready to fulfill products and services matching your sourcing categories and delivery regions.
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
                  <IconShieldCheck /> Verified Supplier Partner
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
                  <button className="pud-btn pud-btn-message pud-modal-footer-btn">
                    <IconMessageSquare /> Message Supplier
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
                  {selectedRfq?.title || "RFQ Details"}
                </h2>
                {selectedRfq && (
                  <div className="pud-modal-meta">
                    <span><IconCalendar /> Closes: {new Date(selectedRfq.endDate).toLocaleDateString()}</span>
                    <span><IconPin /> Delivery: {selectedRfq.deliveryLocation}</span>
                  </div>
                )}
              </div>

              {/* Modal Body */}
              <div className="pud-modal-body">
                {loadingRfqDetails ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
                    <div style={{ color: '#64748b', fontSize: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                      <div className="pud-spinner" style={{ width: '32px', height: '32px' }} />
                      <span>Fetching RFQ specification details...</span>
                    </div>
                  </div>
                ) : rfqDetailsError && !selectedRfq ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#ef4444' }}>
                    {rfqDetailsError}
                  </div>
                ) : selectedRfq ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '28px' }}>
                    {/* Left Column: RFQ Specifications & Materials */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      <div>
                        <div className="pud-modal-section-title">Description</div>
                        <p className="pud-modal-desc" style={{ whiteSpace: 'pre-wrap', fontSize: '13.5px', color: '#334155', lineHeight: '1.6' }}>
                          {selectedRfq.description || "No description provided."}
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', background: '#f8fafc', padding: '14px 18px', borderRadius: '10px', border: '1px solid #e2e8f0', marginTop: '12px' }}>
                          <div>
                            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>Start Date</div>
                            <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 600, marginTop: '2px' }}>
                              {new Date(selectedRfq.startDate).toLocaleString()}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>End Date</div>
                            <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 600, marginTop: '2px' }}>
                              {new Date(selectedRfq.endDate).toLocaleString()}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>Add Lot Option</div>
                            <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 600, marginTop: '2px' }}>
                              {selectedRfq.addLotOption ? "Allowed" : "Not Allowed"}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Items table */}
                      {selectedRfq.items && selectedRfq.items.length > 0 && (
                        <div>
                          <div className="pud-modal-section-title" style={{ marginBottom: '10px' }}>Required Materials & Services</div>
                          <div className="pud-rfq-table-container" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                            <table className="pud-rfq-items-table">
                              <thead>
                                <tr>
                                  <th>Material Info</th>
                                  <th>Group / Code</th>
                                  <th style={{ textAlign: 'right' }}>Qty</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedRfq.items.map((item: any, idx: number) => (
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
                      {((selectedRfq.technicalSpecificationDocuments && selectedRfq.technicalSpecificationDocuments.length > 0) ||
                        (selectedRfq.termsConditionDocuments && selectedRfq.termsConditionDocuments.length > 0)) && (
                          <div>
                            <div className="pud-modal-section-title" style={{ marginBottom: '10px' }}>Specifications & Terms Documents</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                              {selectedRfq.technicalSpecificationDocuments?.map((doc: any, i: number) => (
                                <div key={`tech-${i}`} className="pud-rfq-doc-card">
                                  <div className="pud-rfq-doc-icon"><IconFile /></div>
                                  <div style={{ overflow: 'hidden' }}>
                                    <div className="pud-rfq-doc-name" title={doc.fileName}>{doc.fileName}</div>
                                    <div className="pud-rfq-doc-type">Tech Spec Doc</div>
                                  </div>
                                </div>
                              ))}
                              {selectedRfq.termsConditionDocuments?.map((doc: any, i: number) => (
                                <div key={`terms-${i}`} className="pud-rfq-doc-card">
                                  <div className="pud-rfq-doc-icon" style={{ background: '#fef3c7', color: '#d97706' }}><IconFile /></div>
                                  <div style={{ overflow: 'hidden' }}>
                                    <div className="pud-rfq-doc-name" title={doc.fileName}>{doc.fileName}</div>
                                    <div className="pud-rfq-doc-type">Terms & Conditions</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Questions */}
                      {selectedRfq.questions && selectedRfq.questions.length > 0 && (
                        <div>
                          <div className="pud-modal-section-title" style={{ marginBottom: '10px' }}>Evaluation Questions Posed</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {selectedRfq.questions.map((q: any, i: number) => (
                              <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                                    Q{i + 1}: {q.question}
                                  </span>
                                  <span style={{ fontSize: '11px', color: '#64748b', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>
                                    {q.questionType} {q.isRequired ? "(Required)" : ""}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Column: Received Supplier Bids / Quotations */}
                    <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div className="pud-modal-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <IconSparkles /> Supplier Quotations Received
                      </div>

                      {/* Filter/check if we have actual valid quotations */}
                      {selectedRfq.supplierQuotation &&
                        selectedRfq.supplierQuotation.filter((q: any) => q.quotationId || q.totalPrice !== null).length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '480px', overflowY: 'auto' }}>
                          {selectedRfq.supplierQuotation
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
                                    className={`pud-status-badge`}
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
                        <div className="pud-rfq-no-quote-box" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' }}>
                          <IconMail />
                          <div style={{ fontWeight: 600, color: '#475569', marginTop: '12px' }}>No Quotations Received Yet</div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', lineHeight: '1.5', maxWidth: '240px' }}>
                            When suppliers submit commercial bids, they will populate here in real-time.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Modal Footer */}
              <div className="pud-modal-footer">
                <button
                  className="pud-btn pud-btn-outline"
                  onClick={() => setSelectedRfqId(null)}
                  style={{ marginRight: '10px' }}
                >
                  Close
                </button>
                <button className="pud-btn pud-btn-message" style={{ background: '#2563eb', color: '#ffffff' }}>
                  Evaluate Quotations
                </button>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BuyersDashboard;