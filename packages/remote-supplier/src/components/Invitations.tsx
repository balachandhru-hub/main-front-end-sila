import React, { useState } from "react";
import "./SupplierDashboard.css";
import "./Invitations.css";

/* ---------------- Types ---------------- */

/* Types */
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

/* ---------------- Sample data ---------------- */

const officeFurniture: Invitation = {
    code: "RFQ-1024",
    category: "Office Furniture",
    status: "open",
    title: "Office Furniture",
    company: "ABC Manufacturing",
    description: "Supply and installation of ergonomic office desks, chairs, and conference room layouts for the newly renovated corporate headquarters.",
    closing: "2026-07-25",
};

const enterpriseLaptops: Invitation = {
    code: "RFQ-1025",
    category: "IT Hardware & Accessories",
    status: "open",
    title: "Enterprise Laptops & Keyboards",
    company: "Global Tech Solutions Inc.",
    description: "Annual replenishment of standard developer workstations, ergonomic mice, mechanical keyboards, and 27-inch monitors.",
    closing: "2026-08-05",
};

const recycledStationeryAccepted: Invitation = {
    code: "RFQ-1021",
    category: "IT Hardware & Accessories",
    status: "accepted",
    title: "Recycled Stationery Bulk",
    company: "Eco-Friendly Logistics Ltd",
    description: "Corporate-wide distribution of recycled writing pads, notebooks, biodegradable pens, and storage folders.",
    closing: "2026-07-12",
};

const breakroomSupplies: Invitation = {
    code: "RFQ-1020",
    category: "Breakroom Supplies",
    status: "closed",
    title: "Premium Coffee & Breakroom Amenities",
    company: "Nexus Capital",
    description: "Sourcing high-quality organic coffee beans, tea selection, and eco-friendly disposable mugs for five regional offices.",
    closing: "2026-06-30",
};

const recycledStationeryDeclined: Invitation = {
    code: "RFQ-1019",
    category: "IT Hardware & Accessories",
    status: "declined",
    title: "Recycled Stationery Bulk",
    company: "Eco-Friendly Logistics Ltd",
    description: "Corporate-wide distribution of recycled writing pads, notebooks, biodegradable pens, and storage folders.",
    closing: "2026-06-07",
};

const tabInvitations: Record<TabKey, Invitation[]> = {
    all: [officeFurniture, enterpriseLaptops, recycledStationeryAccepted, breakroomSupplies, recycledStationeryDeclined],
    open: [officeFurniture, enterpriseLaptops],
    accepted: [recycledStationeryAccepted],
    declined: [recycledStationeryDeclined],
};

const tabs: { key: TabKey; label: string }[] = [
    { key: "all", label: "All Invitations (4)" },
    { key: "open", label: "Open Invitations (2)" },
    { key: "accepted", label: "Accepted Invitations (1)" },
    { key: "declined", label: "Declined Invitations (1)" },
];

/* ===== INVITATION CARD ===== */
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

/* ---------------- Page content ---------------- */
/*
 * NOTE: This component renders ONLY the page content (title, tabs, search,
 * invitation grid). It is embedded inside SupplierDashboard's existing
 * <main className="pud-content"> area — the same way <CompanyProfile /> and
 * <UserTemplate /> are — so it must NOT render its own Header, sidebar, or
 * page shell. Doing so would nest a second sidebar inside the dashboard.
 */

/* ===== CONTENT ONLY (NO HEADER/SIDEBAR) ===== */
const Invitations: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabKey>("all");
    const [searchQuery, setSearchQuery] = useState("");

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
        <>
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
        </>
    );
};

export default Invitations;