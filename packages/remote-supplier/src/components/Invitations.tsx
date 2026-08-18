import React, { useState, useEffect, useMemo } from "react";
import "./SupplierDashboard.css";
import "./Invitations.css";
import {
    fetchBuyerInvitations,
    fetchSupplierInvitations,
    updateSupplierInvitationStatus,
    fetchInvitationAnswers,
    type BuyerInvitationItem,
    type InvitationAnswersResponse,
} from "../api/supplierApi";
import { isErrorResponse } from "@vosox/shared-ui";

/* ---------------- Types ---------------- */

type InvitationStatus = "open" | "accepted" | "declined" | "closed";

interface Invitation {
    code: string;
    category?: string;
    status: InvitationStatus;
    title: string;
    company: string;
    description: string;
    closing: string;
    rfqId?: string;
    id?: string;
}

type TabKey = "all" | "open" | "accepted" | "declined";

interface InvitationsProps {
    isAdmin?: boolean;
    adminRole?: "buyer" | "supplier";
}

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

const IconClose = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

const IconFile = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M8 13h8M8 17h8M8 9h2" />
    </svg>
);

/* ---------------- Sample data (used when isAdmin is false) ---------------- */

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

const mockInvitations: Invitation[] = [
    officeFurniture,
    enterpriseLaptops,
    recycledStationeryAccepted,
    breakroomSupplies,
    recycledStationeryDeclined,
];

const tabs: { key: TabKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "open", label: "Open" },
    { key: "accepted", label: "Accepted" },
    { key: "declined", label: "Declined" },
];

/* ---------------- Helpers ---------------- */

const mapApiStatus = (status: string): InvitationStatus => {
    const normalized = (status || "").toUpperCase();
    if (normalized === "ACCEPTED" || normalized === "ACCEPT") return "accepted";
    if (normalized === "DECLINED" || normalized === "REJECT" || normalized === "REJECTED") return "declined";
    if (normalized === "CLOSED") return "closed";
    return "open"; // PENDING and anything else defaults to open
};

const mapApiItemToInvitation = (item: BuyerInvitationItem): Invitation => ({
    code: item.rfqNumber,
    status: mapApiStatus(item.status),
    title: item.title,
    company: item.organizationName,
    description: item.description,
    closing: item.endDate ? new Date(item.endDate).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—",
    rfqId: item.rfqId,
    id: item.id,
});

/* ===== INVITATION CARD ===== */
const InvitationCard: React.FC<{
    invitation: Invitation;
    showActions: boolean;
    canViewDetails: boolean;
    onAccept: (invitation: Invitation) => void;
    onDecline: (invitation: Invitation) => void;
    onViewDetails: (invitation: Invitation) => void;
    actionLoading: "accept" | "decline" | null;
    actionError: string | null;
}> = ({ invitation, showActions, canViewDetails, onAccept, onDecline, onViewDetails, actionLoading, actionError }) => {
    const { category, status, code, title, company, description, closing } = invitation;

    return (
        <div className={`inv-card inv-card-${status}`}>
            <div className="inv-card-top">
                {category && (
                    <span className={`inv-category inv-category-${status}`}>
                        <IconTag /> {category}
                    </span>
                )}
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

                <div className="inv-card-title">{title}</div>
                <div className="inv-company">
                    <IconBuildingSmall /> {company}
                </div>
                <p className="inv-description">{description}</p>

                {actionError && (
                    <div className="inv-action-error">{actionError}</div>
                )}
            </div>

            <div className="inv-card-footer">
                {showActions && status === "open" && (
                    <div className="inv-footer-left">
                        <button
                            className="inv-btn inv-btn-accept"
                            onClick={() => onAccept(invitation)}
                            disabled={actionLoading !== null}
                        >
                            {actionLoading === "accept" ? "Accepting..." : "Accept"}
                        </button>
                        <button
                            className="inv-btn inv-btn-decline"
                            onClick={() => onDecline(invitation)}
                            disabled={actionLoading !== null}
                        >
                            {actionLoading === "decline" ? "Declining..." : "Decline"}
                        </button>
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
                {(!showActions && status === "open") || status === "closed" ? <div className="inv-footer-left" /> : null}

                <button
                    className="inv-btn inv-btn-view"
                    onClick={() => onViewDetails(invitation)}
                    disabled={!canViewDetails}
                    title={!canViewDetails ? "Details unavailable" : undefined}
                >
                    View Details <IconArrowRight />
                </button>
            </div>
        </div>
    );
};

const Invitations: React.FC<InvitationsProps> = ({ isAdmin = false, adminRole }) => {
    const [activeTab, setActiveTab] = useState<TabKey>("all");
    const [searchQuery, setSearchQuery] = useState("");

    const [invitations, setInvitations] = useState<Invitation[]>(mockInvitations);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
    const [actionKind, setActionKind] = useState<"accept" | "decline" | null>(null);
    const [actionErrors, setActionErrors] = useState<{ [id: string]: string }>({});

    const [viewingDetail, setViewingDetail] = useState<InvitationAnswersResponse | null>(null);
    const [detailInvitation, setDetailInvitation] = useState<Invitation | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);

    const loadInvitations = async () => {
        if (!isAdmin) {
            setInvitations(mockInvitations);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const fetcher = adminRole === "supplier" ? fetchSupplierInvitations : fetchBuyerInvitations;
            const data = await fetcher({ index: 0, limit: 100 });

            if (isErrorResponse(data)) {
                setError(data.description || data.message || "Failed to load invitations.");
                setInvitations([]);
                return;
            }

            setInvitations(data.map(mapApiItemToInvitation));
        } catch (err: any) {
            setError(err.message || "Failed to load invitations.");
            setInvitations([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInvitations();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAdmin, adminRole]);

    const showActions = isAdmin && adminRole === "buyer";

    const handleAccept = async (invitation: Invitation) => {
        if (!invitation.id) return;
        setActionLoadingId(invitation.id);
        setActionKind("accept");
        setActionErrors((prev) => ({ ...prev, [invitation.id!]: "" }));
        try {
            const result = await updateSupplierInvitationStatus({
                requestId: invitation.id,
                status: "accept",
            });
            if (isErrorResponse(result)) {
                setActionErrors((prev) => ({ ...prev, [invitation.id!]: result.description || result.message || "Failed to accept invitation." }));
                return;
            }
            setInvitations((prev) =>
                prev.map((inv) => (inv.id === invitation.id ? { ...inv, status: "accepted" } : inv))
            );
        } catch (err: any) {
            setActionErrors((prev) => ({ ...prev, [invitation.id!]: err.message || "Failed to accept invitation." }));
        } finally {
            setActionLoadingId(null);
            setActionKind(null);
        }
    };

    const handleDecline = async (invitation: Invitation) => {
        if (!invitation.id) return;
        setActionLoadingId(invitation.id);
        setActionKind("decline");
        setActionErrors((prev) => ({ ...prev, [invitation.id!]: "" }));
        try {
            const result = await updateSupplierInvitationStatus({
                requestId: invitation.id,
                status: "reject",
            });
            if (isErrorResponse(result)) {
                setActionErrors((prev) => ({ ...prev, [invitation.id!]: result.description || result.message || "Failed to decline invitation." }));
                return;
            }
            setInvitations((prev) =>
                prev.map((inv) => (inv.id === invitation.id ? { ...inv, status: "declined" } : inv))
            );
        } catch (err: any) {
            setActionErrors((prev) => ({ ...prev, [invitation.id!]: err.message || "Failed to decline invitation." }));
        } finally {
            setActionLoadingId(null);
            setActionKind(null);
        }
    };

    const handleViewDetails = async (invitation: Invitation) => {
        if (!invitation.id) return;
        setDetailInvitation(invitation);
        setViewingDetail(null);
        setDetailError(null);
        setLoadingDetail(true);
        try {
            const result = await fetchInvitationAnswers(invitation.id);
            if (isErrorResponse(result)) {
                setDetailError(result.description || result.message || "Failed to load invitation details.");
                return;
            }
            setViewingDetail(result);
        } catch (err: any) {
            setDetailError(err.message || "Failed to load invitation details.");
        } finally {
            setLoadingDetail(false);
        }
    };

    const closeDetail = () => {
        setViewingDetail(null);
        setDetailInvitation(null);
        setDetailError(null);
    };

    const tabCounts = useMemo(() => {
        return {
            all: invitations.length,
            open: invitations.filter((inv) => inv.status === "open").length,
            accepted: invitations.filter((inv) => inv.status === "accepted").length,
            declined: invitations.filter((inv) => inv.status === "declined").length,
        };
    }, [invitations]);

    const query = searchQuery.trim().toLowerCase();
    const filteredInvitations = invitations
        .filter((inv) => (activeTab === "all" ? true : inv.status === activeTab))
        .filter((inv) => {
            if (!query) return true;
            return (
                inv.company.toLowerCase().includes(query) ||
                inv.code.toLowerCase().includes(query) ||
                (inv.category || "").toLowerCase().includes(query)
            );
        });

    return (
        <>
            <h1 className="inv-title">Sourcing Invitations</h1>
            <p className="inv-subtitle">Direct invitations from buyers asking you to submit price bids and proposals.</p>

            <div className="inv-tabs-bar">
                <div className="inv-tabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            className={`inv-tab${activeTab === tab.key ? " inv-tab-active" : ""}`}
                            onClick={() => setActiveTab(tab.key)}
                        >
                            {tab.label} ({tabCounts[tab.key]})
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

            {loading ? (
                <div className="inv-loading-wrap">
                    <div className="inv-loading-inner">
                        <div className="inv-spinner" />
                        <span>Loading invitations...</span>
                    </div>
                </div>
            ) : error ? (
                <div className="inv-error-text">{error}</div>
            ) : filteredInvitations.length > 0 ? (
                <div className="inv-grid">
                    {filteredInvitations.map((inv, idx) => (
                        <InvitationCard
                            key={`${inv.code}-${idx}`}
                            invitation={inv}
                            showActions={showActions}
                            canViewDetails={Boolean(inv.id)}
                            onAccept={handleAccept}
                            onDecline={handleDecline}
                            onViewDetails={handleViewDetails}
                            actionLoading={actionLoadingId === inv.id ? actionKind : null}
                            actionError={inv.id ? actionErrors[inv.id] || null : null}
                        />
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

            {detailInvitation && (
                <div className="inv-modal-overlay" onClick={closeDetail}>
                    <div className="inv-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="inv-modal-header">
                            <span className="inv-modal-badge">
                                <IconFile /> Invitation Details
                            </span>
                            <button className="inv-modal-close" onClick={closeDetail}>
                                <IconClose />
                            </button>
                            <h2 className="inv-modal-name">
                                {loadingDetail ? "Loading..." : viewingDetail?.rfqNumber || detailInvitation.title}
                            </h2>
                            {viewingDetail && (
                                <div className="inv-modal-meta">
                                    <span><IconCalendar /> Due: {new Date(viewingDetail.dueDate).toLocaleString()}</span>
                                    <span><IconBuildingSmall /> {viewingDetail.organizationName}</span>
                                </div>
                            )}
                        </div>

                        <div className="inv-modal-body">
                            {loadingDetail ? (
                                <div className="inv-loading-wrap">
                                    <div className="inv-loading-inner">
                                        <div className="inv-spinner" />
                                        <span>Fetching invitation details...</span>
                                    </div>
                                </div>
                            ) : detailError ? (
                                <div className="inv-error-text">
                                    {detailError}
                                </div>
                            ) : viewingDetail ? (
                                <div className="inv-modal-detail">
                                    <div>
                                        <div className="inv-modal-section-title">Description</div>
                                        <p className="inv-modal-desc">
                                            {viewingDetail.description || "No description provided."}
                                        </p>
                                    </div>

                                    <div className="inv-modal-stats-grid">
                                        <div>
                                            <div className="inv-modal-stat-label">Status</div>
                                            <div className="inv-modal-stat-value">
                                                {viewingDetail.status}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="inv-modal-stat-label">Reference No.</div>
                                            <div className="inv-modal-stat-value">
                                                {viewingDetail.snid || "—"}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="inv-modal-stat-label">Remarks</div>
                                            <div className="inv-modal-stat-value">
                                                {viewingDetail.remarks || "—"}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="inv-modal-qa-block">
                                        <div className="inv-modal-section-title">Questions & Answers</div>
                                        {viewingDetail.questions && viewingDetail.questions.length > 0 ? (
                                            <div className="inv-modal-qa-list">
                                                {viewingDetail.questions.map((q: any, i: number) => (
                                                    <div key={q.id || q.questionId || i} className="inv-modal-qa-item">
                                                        <div className="inv-modal-qa-question">
                                                            Q{i + 1}: {q.question || q.questionText || "Untitled question"}
                                                        </div>
                                                        <div className="inv-modal-qa-answer">
                                                            {q.answer || q.answerText || "No response yet."}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="inv-modal-qa-empty">
                                                No questions were configured for this invitation.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        <div className="inv-modal-footer">
                            <button className="inv-btn inv-btn-outline" onClick={closeDetail}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Invitations;