import React, { useState } from "react";
import SilaLogo from "../assets/SILA - Logo.png";
import "./SupplierDashboard.css";
import "./Invitations.css";
import { useAuthStore } from "../../../host-app/src/store/useAuthStore";
import { logoutSupplier } from "../api/supplierApi";
import { useNavigate } from "react-router-dom";

/* ---------------- Types ---------------- */

type InvitationStatus = "open" | "accepted" | "declined" | "closed";

interface Invitation {
    code: string;
    category: string;
    status: InvitationStatus;
    title: string;
    company: string;
    description: string;
    closing: string;
}

type TabKey = "all" | "open" | "accepted" | "declined";

/* ---------------- Icons (shared header / sidebar) ---------------- */

const IconMenu = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="12" x2="21" y2="12"></line>
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <line x1="3" y1="18" x2="21" y2="18"></line>
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

const IconClose = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
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

/* ---------------- Icons (page content) ---------------- */

const IconTag = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42Z" />
        <circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" stroke="none" />
    </svg>
);

const IconClock = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);

const IconCalendar = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
);

const IconBuildingSmall = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="1" />
        <path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01" />
    </svg>
);

const IconSearch = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
    </svg>
);

const IconArrowRight = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
    </svg>
);

const IconCheckCircle = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
);

const IconXCircle = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="m15 9-6 6" />
        <path d="m9 9 6 6" />
    </svg>
);

const IconBookOpen = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
);

/* ---------------- Static data ---------------- */

const navItems = [
    { icon: <NavIconHome />, label: "Dashboard" },
    { icon: <NavIconMail />, label: "Invitations", badge: 2, active: true },
    { icon: <NavIconFile />, label: "RFQs", badge: 2 },
    { icon: <NavIconUser />, label: "Quotations" },
    { icon: <NavIconBag />, label: "Purchase Orders" },
    { icon: <NavIconContract />, label: "Contracts" },
    { icon: <NavIconInvoice />, label: "Invoices" },
    { icon: <NavIconPayment />, label: "Payments" },
    { icon: <NavIconMessage />, label: "Messages" },
    { icon: <NavIconBuilding />, label: "Company Profile" },
    { icon: <NavIconSettings />, label: "Settings" },
];

const officeFurniture: Invitation = {
    code: "RFQ-1024",
    category: "Office Furniture",
    status: "open",
    title: "Office Furniture",
    company: "ABC Manufacturing",
    description:
        "Supply and installation of ergonomic office desks, chairs, and conference room layouts for the newly renovated corporate headquarters.",
    closing: "2026-07-25",
};

const enterpriseLaptops: Invitation = {
    code: "RFQ-1025",
    category: "IT Hardware & Accessories",
    status: "open",
    title: "Enterprise Laptops & Keyboards",
    company: "Global Tech Solutions Inc.",
    description:
        "Annual replenishment of standard developer workstations, ergonomic mice, mechanical keyboards, and 27-inch monitors.",
    closing: "2026-08-05",
};

const recycledStationeryAccepted: Invitation = {
    code: "RFQ-1021",
    category: "IT Hardware & Accessories",
    status: "accepted",
    title: "Recycled Stationery Bulk",
    company: "Eco-Friendly Logistics Ltd",
    description:
        "Corporate-wide distribution of recycled writing pads, notebooks, biodegradable pens, and storage folders.",
    closing: "2026-07-12",
};

const breakroomSupplies: Invitation = {
    code: "RFQ-1020",
    category: "Breakroom Supplies",
    status: "closed",
    title: "Premium Coffee & Breakroom Amenities",
    company: "Nexus Capital",
    description:
        "Sourcing high-quality organic coffee beans, tea selection, and eco-friendly disposable mugs for five regional offices.",
    closing: "2026-06-30",
};

const recycledStationeryDeclined: Invitation = {
    code: "RFQ-1019",
    category: "IT Hardware & Accessories",
    status: "declined",
    title: "Recycled Stationery Bulk",
    company: "Eco-Friendly Logistics Ltd",
    description:
        "Corporate-wide distribution of recycled writing pads, notebooks, biodegradable pens, and storage folders.",
    closing: "2026-06-07",
};

/* Card lists per tab — matched exactly to the reference screenshots */
const tabInvitations: Record<TabKey, Invitation[]> = {
    all: [
        officeFurniture,
        enterpriseLaptops,
        recycledStationeryAccepted,
        breakroomSupplies,
        recycledStationeryDeclined,
    ],
    open: [officeFurniture, enterpriseLaptops],
    accepted: [recycledStationeryAccepted],
    declined: [],
};

const tabs: { key: TabKey; label: string }[] = [
    { key: "all", label: "All Invitations (4)" },
    { key: "open", label: "Open Invitations (2)" },
    { key: "accepted", label: "Accepted Invitations (1)" },
    { key: "declined", label: "Declined Invitations (0)" },
];

/* ---------------- Invitation card ---------------- */

const InvitationCard: React.FC<{ invitation: Invitation }> = ({ invitation }) => {
    const { code, category, status, title, company, description, closing } = invitation;

    return (
        <div className={`inv-card inv-card-${status}`}>
            <div className="inv-card-top">
                <span className={`inv-category inv-category-${status}`}>
                    <IconTag /> {category}
                </span>
                {status === "open" && (
                    <span className="inv-status inv-status-open">
                        <IconClock /> OPEN
                    </span>
                )}
                {status === "accepted" && (
                    <span className="inv-status inv-status-accepted">
                        <IconCheckCircle /> ACCEPTED
                    </span>
                )}
                {status === "declined" && <span className="inv-status inv-status-declined">DECLINED</span>}
                {status === "closed" && <span className="inv-status inv-status-closed">CLOSED</span>}
            </div>

            <div className="inv-card-body">
                <div className="inv-card-meta-row">
                    <span className="inv-code-badge">{code}</span>
                    <span className="inv-closing">
                        <IconCalendar /> Closing: {closing}
                    </span>
                </div>

                <div className="inv-title">{title}</div>
                <div className="inv-company">
                    <IconBuildingSmall /> {company}
                </div>
                <p className="inv-description">{description}</p>
            </div>

            <div className="inv-card-footer">
                {status === "open" && (
                    <div className="inv-footer-left">
                        <button className="inv-btn inv-btn-accept">Accept</button>
                        <button className="inv-btn inv-btn-decline">Decline</button>
                    </div>
                )}
                {status === "accepted" && (
                    <div className="inv-footer-left">
                        <span className="inv-footer-status inv-footer-status-accepted">
                            <IconCheckCircle /> Invitation Accepted
                        </span>
                    </div>
                )}
                {status === "declined" && (
                    <div className="inv-footer-left">
                        <span className="inv-footer-status inv-footer-status-declined">
                            <IconXCircle /> Invitation Declined
                        </span>
                    </div>
                )}
                {status === "closed" && <div className="inv-footer-left" />}

                <button className="inv-btn inv-btn-view">
                    View Details <IconArrowRight />
                </button>
            </div>
        </div>
    );
};

/* ---------------- Page ---------------- */

const Invitations: React.FC = () => {
    const navigate = useNavigate();
    const organizationName =
        sessionStorage.getItem("vosox_organization_name") || "Apex Office & Technology Supp...";
    const firstLetter = organizationName.trim().charAt(0).toUpperCase();

    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [activeTab, setActiveTab] = useState<TabKey>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [loggingOut, setLoggingOut] = useState(false);
    const [logoutError, setLogoutError] = useState<string | null>(null);

    const handleLogout = async () => {
        if (loggingOut) return;
        setLoggingOut(true);
        setLogoutError(null);
        try {
            await logoutSupplier();
        } catch (error: any) {
            setLogoutError(error?.message || "Logout request failed, clearing session locally.");
        } finally {
            sessionStorage.removeItem("vosox_organization_name");
            useAuthStore.getState().logout();
            window.dispatchEvent(new CustomEvent("session:expired"));
            setLoggingOut(false);
        }
    };

    const query = searchQuery.trim().toLowerCase();
    const invitations = tabInvitations[activeTab].filter((inv) => {
        if (!query) return true;
        return (
            inv.company.toLowerCase().includes(query) ||
            inv.code.toLowerCase().includes(query) ||
            inv.category.toLowerCase().includes(query)
        );
    });

    return (
        <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#f4f6f9" }}>
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
                                key={item.label}
                                className={`pud-nav-item${item.active ? " pud-nav-item-active" : ""}`}
                                onClick={() => {
                                if (item.label === "Dashboard") navigate("/dashboard");
                                if (item.label === "Invitations") navigate("/invitations");
                                if (item.label === "Company Profile") navigate("/dashboard", { state: { view: "companyProfile" } });
                                }}
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
                        <h1 className="pud-title">Sourcing Invitations</h1>
                        <p className="pud-subtitle">Direct invitations from buyers asking you to submit price bids and proposals.</p>

                        <div className="inv-tabs-bar">
                            <div className="inv-tabs">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.key}
                                        className={`inv-tab${activeTab === tab.key ? " inv-tab-active" : ""}`}
                                        onClick={() => setActiveTab(tab.key)}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                            <div className="inv-search">
                                <IconSearch />
                                <input
                                    type="text"
                                    placeholder="Search buyer, ID or category..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        {invitations.length > 0 ? (
                            <div className="inv-grid">
                                {invitations.map((inv) => (
                                    <InvitationCard key={inv.code} invitation={inv} />
                                ))}
                            </div>
                        ) : (
                            <div className="inv-empty">
                                <span className="inv-empty-icon">
                                    <IconBookOpen />
                                </span>
                                <div className="inv-empty-title">No Invitations Found</div>
                                <div className="inv-empty-subtitle">
                                    There are no sourcing invitations matching your search criteria or filter at this time.
                                </div>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
};

export default Invitations;