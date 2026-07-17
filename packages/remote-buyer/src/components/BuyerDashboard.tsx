import React, { useState } from "react";
import SilaLogo from "../../../host-app/public/assets/SILA_Logo.png";
import "./BuyerDashBoard.css";
import CreateRFQ from "./Create_RFQ.tsx";
import { useAuthStore } from "../../../host-app/src/store/useAuthStore";
import { logoutBuyer } from "../api/Buyerapi";

/* ---------------------------------- Icons ---------------------------------- */

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

const IconBell = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

const IconCheck = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const NavIconHome = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <path d="M9 22V12h6v10" />
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

const NavIconBag = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
    <path d="M3 6h18" />
    <path d="M16 10a4 4 0 0 1-8 0" />
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

/* ---------------------------------- Static data ---------------------------------- */

const navItems: { key: string; icon: React.ReactNode; label: string; badge?: number }[] = [
  { key: "dashboard", icon: <NavIconHome />, label: "Dashboard" },
  { key: "createRFQ", icon: <NavIconFilePlus />, label: "Create RFQ" },
  { key: "activeRFQs", icon: <NavIconFile />, label: "Active RFQs", badge: 2 },
  { key: "evaluateQuotations", icon: <NavIconFileCheck />, label: "Evaluate Quotations", badge: 2 },
  { key: "purchaseOrders", icon: <NavIconBag />, label: "Purchase Orders" },
  { key: "supplierDirectory", icon: <NavIconUsers />, label: "Supplier Directory" },
  { key: "spendReports", icon: <NavIconBarChart />, label: "Procurement Spend Reports" },
  { key: "messages", icon: <NavIconMessage />, label: "Messages" },
  { key: "companyProfile", icon: <NavIconBuilding />, label: "Company Profile" },
  { key: "settings", icon: <NavIconSettings />, label: "Settings" },
];

/* ---------------------------------- Component ---------------------------------- */

const BuyersDashboard: React.FC = () => {
  const organizationName =
    (typeof window !== "undefined" && sessionStorage.getItem("vosox_organization_name")) ||
    "Apex Office & Technology Supp...";
  const firstLetter = organizationName.trim().charAt(0).toUpperCase();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeNav, setActiveNav] = useState<string>("dashboard");
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

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
      useAuthStore.getState().logout();
      window.dispatchEvent(new CustomEvent("session:expired"));
      setLoggingOut(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#f4f6f9" }}>
      {/* ---------------- Header ---------------- */}
      <header className="pud-header" style={{ width: "100%", zIndex: 10, position: "relative" }}>
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
            ) : (
              // Blank page for Dashboard and every other nav item that has no view yet
              <div className="bd-blank-page" />
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default BuyersDashboard;