import React, { useState, useEffect } from "react";
import "./SupplierDashboard.css";
import "./Invitations.css";
import {
    DEFAULT_VERIFICATION_TEMPLATE_ID,
    INVITATION_STATUS,
    INVITATION_TABS,
    INVITATION_STATUS_BACKEND_MAP,
} from "../common";
import {
    getSupplierProfileByOrgId,
    type SupplierProfileResponse
} from "../api/supplierApi";
import { useSupplierAuthStore } from "../store/useSupplierAuthStore";
import {
    fetchBuyerInvitations,
    fetchSupplierInvitations,
    fetchInvitationSummary,
    updateSupplierInvitationStatus,
    fetchInvitationAnswers,
    submitVerificationAnswers,
    fetchSupplierAsset,
    type BuyerInvitationItem,
    type InvitationAnswersResponse,
    type VerificationQuestion,
    type SubmitVerificationPayload,
} from "../api/supplierApi";
import {
    Card,
    Choice,
    ChoiceGroup,
    EmptyState,
    Loader,
    PageHeader,
    Pagination,
    QuestionAnswer,
    QuestionItem,
    QuestionList,
    QuestionProgress,
    StatusBadge,
    isErrorResponse,
    toastService,
} from "@vosox/shared-ui";
import { FaCheck, FaFileAlt } from "react-icons/fa";


type InvitationStatus = "open" | "submitted" | "accepted" | "declined" | "closed";

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

type TabKey = "all" | "open" | "submitted" | "accepted" | "declined";

interface InvitationsProps {
    isAdmin?: boolean;
    adminRole?: "buyer" | "supplier";
}

interface VerificationAnswer {
    textAnswer: string;
    selectedOptionId: string | null;
    selectedOptionIds: string[];
    file: File | null;
    fileBase64: string;
}


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

const IconSend = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
);


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

const tabs = INVITATION_TABS;


const mapApiStatus = (status: string): InvitationStatus => {
    const normalized = (status || "").toUpperCase();
    if (normalized === "ACCEPTED" || normalized === "ACCEPT") return "accepted";
    if (normalized === "DECLINED" || normalized === "REJECT" || normalized === "REJECTED") return "declined";
    if (normalized === "SUBMITTED") return "submitted";
    if (normalized === "CLOSED") return "closed";
    return "open";
};


type QuestionKind = "text" | "radio" | "checkbox" | "file" | "label" | "other";

const getQuestionKind = (rawType: string): QuestionKind => {
    const t = (rawType || "").toUpperCase().replace(/[\s_-]/g, "");
    if (t === "TEXT" || t === "INPUT") return "text";
    if (t === "RADIOBUTTON" || t === "RADIO") return "radio";
    if (t === "CHECKBOX") return "checkbox";
    if (t === "FILE" || t === "ATTACHMENT") return "file";
    if (t === "LABEL") return "label";
    return "other";
};

const QUESTION_KIND_LABELS: Record<QuestionKind, string> = {
    text: "Text",
    radio: "Single choice",
    checkbox: "Multiple choice",
    file: "File upload",
    label: "Information",
    other: "Other",
};

/** Whether a submitted/saved answer exists on the question itself (read-only views). */
const hasSavedAnswer = (question: VerificationQuestion): boolean => {
    const kind = getQuestionKind(question.questionType);
    if (kind === "file") return Boolean(question.assetId);
    if (kind === "radio") return Boolean(question.verificationTemplateQuestionOptionId);
    return Boolean(question.answer && question.answer.trim());
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

const BUSINESS_PROFILE_FIELD_MAP: { match: string; getValue: (p: SupplierProfileResponse) => string }[] = [
    { match: "bank name", getValue: (p) => p.bankAccounts?.[0]?.bankName || "" },
    { match: "account number", getValue: (p) => p.bankAccounts?.[0]?.accountNumber || "" },
    { match: "ifsc", getValue: (p) => p.bankAccounts?.[0]?.ifscCode || "" },
    { match: "bank branch", getValue: (p) => p.bankAccounts?.[0]?.branchName || "" },
    { match: "company name", getValue: (p) => p.businessProfile?.organizationName || "" },
    { match: "email", getValue: (p) => p.businessProfile?.email || "" },
    { match: "phone", getValue: (p) => p.businessProfile?.phone || "" },
    { match: "country", getValue: (p) => p.businessProfile?.country || "" },
    { match: "state", getValue: (p) => p.businessProfile?.state || "" },
    { match: "city", getValue: (p) => p.businessProfile?.city || "" },
    {
        match: "address",
        getValue: (p) =>
            [p.businessProfile?.addressLine1, p.businessProfile?.addressLine2].filter(Boolean).join(", "),
    },
];

const getDefaultAnswerForQuestion = (
    question: VerificationQuestion,
    profile: SupplierProfileResponse
): string => {
    const kind = getQuestionKind(question.questionType);
    const matchedReg = profile.registrations?.find((r) =>
        question.question.toUpperCase().includes(r.registrationType.toUpperCase())
    );

    if (matchedReg) {
        if (kind === "file") {
            return matchedReg.asset?.fileName || "Not submitted";
        }
        return matchedReg.registrationNumber || "N/A";
    }

    if (kind === "file") {
        return "Not submitted";
    }

    const questionLower = question.question.toLowerCase();
    const fieldMatch = BUSINESS_PROFILE_FIELD_MAP.find((f) => questionLower.includes(f.match));
    if (fieldMatch) {
        return fieldMatch.getValue(profile) || "N/A";
    }

    return "N/A";
};


const STATUS_ICON: Partial<Record<InvitationStatus, React.ReactNode>> = {
    open: <IconClock />,
    submitted: <IconSend />,
    accepted: <IconCheckCircle />,
    declined: <IconXCircle />,
};

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
    const canRespond = showActions && (status === "open" || status === "submitted");

    return (
        <article className={`inv-card inv-card-${status}`}>
            <div className="inv-card-top">
                <span className="sila-ref">{code}</span>
                <StatusBadge
                    status={status}
                    size="sm"
                    label={<>{STATUS_ICON[status] && <span className="inv-status-icon" aria-hidden="true">{STATUS_ICON[status]}</span>}{status.charAt(0).toUpperCase() + status.slice(1)}</>}
                />
            </div>

            <div className="inv-card-body">
                <h3 className="inv-card-title">{title}</h3>
                <div className="inv-card-meta-row">
                    <span className="inv-meta-item">
                        <IconBuildingSmall /> {company}
                    </span>
                    <span className="inv-meta-item">
                        <IconCalendar /> Closing: {closing}
                    </span>
                    {category && (
                        <span className="inv-meta-item">
                            <IconTag /> {category}
                        </span>
                    )}
                </div>
                <p className="inv-description">{description}</p>

                {actionError && (
                    <div className="sila-error-text inv-action-error" role="alert">{actionError}</div>
                )}
            </div>

            <div className="inv-card-footer">
                <div className="inv-footer-left">
                    {canRespond && (
                        <>
                            <button
                                type="button"
                                className="sila-btn sila-btn--primary sila-btn--sm"
                                onClick={() => onAccept(invitation)}
                                disabled={actionLoading !== null}
                            >
                                {actionLoading === "accept" && <span className="sila-spinner" aria-hidden="true" />}
                                {actionLoading === "accept" ? "Accepting..." : "Accept"}
                            </button>
                            <button
                                type="button"
                                className="sila-btn sila-btn--secondary sila-btn--sm inv-btn-decline"
                                onClick={() => onDecline(invitation)}
                                disabled={actionLoading !== null}
                            >
                                {actionLoading === "decline" && <span className="sila-spinner" aria-hidden="true" />}
                                {actionLoading === "decline" ? "Declining..." : "Decline"}
                            </button>
                        </>
                    )}
                    {status === "accepted" && (
                        <span className="inv-footer-status inv-footer-status-accepted">
                            <IconCheckCircle /> Invitation Accepted
                        </span>
                    )}
                    {status === "declined" && (
                        <span className="inv-footer-status inv-footer-status-declined">
                            <IconXCircle /> Invitation Declined
                        </span>
                    )}
                </div>

                <button
                    type="button"
                    className="sila-btn sila-btn--ghost sila-btn--sm inv-btn-view"
                    onClick={() => onViewDetails(invitation)}
                    disabled={!canViewDetails}
                    title={!canViewDetails ? "Details unavailable" : undefined}
                >
                    View Details <IconArrowRight />
                </button>
            </div>
        </article>
    );
};

const Invitations: React.FC<InvitationsProps> = ({ isAdmin = false, adminRole }) => {
    const [activeTab, setActiveTab] = useState<TabKey>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [appliedSearchQuery, setAppliedSearchQuery] = useState("");

    const PAGE_SIZE = 10;
    const [currentPage, setCurrentPage] = useState(0);
    const [hasNextPage, setHasNextPage] = useState(false);

    const [invitationCounts, setInvitationCounts] = useState({
        all: 0,
        open: 0,
        submitted: 0,
        accepted: 0,
        declined: 0,
    });

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

    const [verificationAnswers, setVerificationAnswers] = useState<{
        [questionId: string]: VerificationAnswer;
    }>({});
    const [submittingVerification, setSubmittingVerification] = useState(false);
    const [verificationError, setVerificationError] = useState<string | null>(null);
    const [verificationSuccess, setVerificationSuccess] = useState(false);
    const [defaultAnswers, setDefaultAnswers] = useState<Record<string, string>>({});
    const [hasConfirmedDetails, setHasConfirmedDetails] = useState(false);

    const [supplierProfile, setSupplierProfile] = useState<SupplierProfileResponse | null>(null);
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [profileError, setProfileError] = useState<string | null>(null);

    const loadInvitations = async (
        page = currentPage,
        tab: TabKey = activeTab,
        search: string = appliedSearchQuery
    ) => {
        if (!isAdmin) {
            setInvitations(mockInvitations);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const fetcher = adminRole === "supplier" ? fetchSupplierInvitations : fetchBuyerInvitations;

            const status = tab === INVITATION_STATUS.ALL
                ? undefined
                : INVITATION_STATUS_BACKEND_MAP[tab];

            const trimmedSearch = search.trim();

            const data = await fetcher({
                index: page * PAGE_SIZE,
                limit: PAGE_SIZE,
                ...(status ? { status } : {}),
                ...(trimmedSearch ? { search: trimmedSearch } : {}),
            });

            if (isErrorResponse(data)) {
                setError(data.description || data.message || "Failed to load invitations.");
                setInvitations([]);
                setHasNextPage(false);
                return;
            }

            setInvitations(data.map(mapApiItemToInvitation));
            setHasNextPage(data.length === PAGE_SIZE);
        } catch (err: any) {
            setError(err.message || "Failed to load invitations.");
            setInvitations([]);
            setHasNextPage(false);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const loadInitialData = async () => {
            if (!isAdmin) {
                setInvitations(mockInvitations);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const summary = await fetchInvitationSummary();

                if (isErrorResponse(summary)) {
                    setError(summary.description || summary.message || "Failed to load invitation summary.");
                    setInvitations([]);
                    return;
                }

                setInvitationCounts({
                    all: summary.all || 0,
                    open: summary.pending || 0,
                    submitted: summary.submitted || 0,
                    accepted: summary.accepted || 0,
                    declined: summary.declined || 0,
                });

                const fetcher = adminRole === "supplier" ? fetchSupplierInvitations : fetchBuyerInvitations;

                const data = await fetcher({
                    index: 0,
                    limit: PAGE_SIZE,
                });

                if (isErrorResponse(data)) {
                    setError(data.description || data.message || "Failed to load invitations.");
                    setInvitations([]);
                    setHasNextPage(false);
                    return;
                }

                setInvitations(data.map(mapApiItemToInvitation));
                setHasNextPage(data.length === PAGE_SIZE);
                setCurrentPage(0);
            } catch (err: any) {
                setError(err.message || "Failed to load invitations.");
                setInvitations([]);
                setHasNextPage(false);
            } finally {
                setLoading(false);
            }
        };

        loadInitialData();
    }, [isAdmin, adminRole]);

    const handleTabChange = (tab: TabKey) => {
        setActiveTab(tab);
        setCurrentPage(0);
        setInvitations([]);
        loadInvitations(0, tab, appliedSearchQuery);
    };

    const handleSearch = () => {
        const search = searchQuery.trim();

        setAppliedSearchQuery(search);
        setCurrentPage(0);
        setInvitations([]);

        loadInvitations(0, activeTab, search);
    };

    const handleClearSearch = () => {
        setSearchQuery("");
        setAppliedSearchQuery("");
        setCurrentPage(0);
        setInvitations([]);

        loadInvitations(0, activeTab, "");
    };

    const showActions = isAdmin && adminRole === "buyer";

    const refreshInvitationSummary = async () => {
        try {
            const summary = await fetchInvitationSummary();

            if (isErrorResponse(summary)) {
                return;
            }

            setInvitationCounts({
                all: summary.all || 0,
                open: summary.pending || 0,
                submitted: summary.submitted || 0,
                accepted: summary.accepted || 0,
                declined: summary.declined || 0,
            });
        } catch {
        }
    };

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

            await refreshInvitationSummary();
            setInvitations([]);
            await loadInvitations(currentPage, activeTab, appliedSearchQuery);
        } catch (err: any) {
            setActionErrors((prev) => ({ ...prev, [invitation.id!]: err.message || "Failed to accept invitation." }));
        } finally {
            setActionLoadingId(null);
            setActionKind(null);
        }
    };

    const loadDefaultAnswers = async (detail: InvitationAnswersResponse) => {
        setLoadingProfile(true);
        setProfileError(null);

        try {
            const person = useSupplierAuthStore.getState().personDetail;

            if (!person) {
                const msg = "Failed to identify organization.";
                setProfileError(msg);
                toastService.error(msg);
                return;
            }

            const result = await getSupplierProfileByOrgId(person.organizationId);

            if (isErrorResponse(result)) {
                const msg = result.description || result.message || "Failed to load supplier profile.";
                setProfileError(msg);
                toastService.error(msg);
                return;
            }

            setSupplierProfile(result);

            const answers: Record<string, string> = {};

            detail.questions.forEach((q) => {
                answers[q.verificationTemplateQuestionId] = getDefaultAnswerForQuestion(q, result);
            });

            setDefaultAnswers(answers);
        } catch (err: any) {
            const msg = err.message || "Failed to load supplier profile.";
            setProfileError(msg);
            toastService.error(msg);
        } finally {
            setLoadingProfile(false);
        }
    };

    const handleSubmitDefault = async () => {
        if (!viewingDetail || !detailInvitation) return;

        setVerificationError(null);
        setVerificationSuccess(false);
        setSubmittingVerification(true);

        try {
            const payload: SubmitVerificationPayload = {
                verificationRequestId: viewingDetail.requestId,
                supplierId: viewingDetail.supplierOrganizationId,
                answers: null,
                status: "SUBMITTED",
            };

            const result = await submitVerificationAnswers(payload);

            if (isErrorResponse(result)) {
                const msg = result.description || result.message || "Failed to submit.";
                setVerificationError(msg);
                toastService.error(msg);
                return;
            }

            setVerificationSuccess(true);
            toastService.success("Verification submitted successfully!");

            setTimeout(() => closeDetail(), 1500);
        } catch (err: any) {
            const msg = err.message || "Failed to submit.";
            setVerificationError(msg);
            toastService.error(msg);
        } finally {
            setSubmittingVerification(false);
        }
    };

    const handleDownloadAsset = async (assetId: string) => {
        try {
            const result = await fetchSupplierAsset(assetId);

            if (isErrorResponse(result)) {
                toastService.error(result.description || result.message || "Failed to load file.");
                return;
            }

            const url = result.url || result.fileUrl;

            if (url) {
                window.open(url, "_blank");
                return;
            }

            if (result.fileBytes && result.contentType) {
                const byteChars = atob(result.fileBytes);
                const byteNumbers = new Array(byteChars.length);

                for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);

                const blob = new Blob([new Uint8Array(byteNumbers)], { type: result.contentType });
                const blobUrl = URL.createObjectURL(blob);
                const a = document.createElement("a");

                a.href = blobUrl;
                a.download = result.fileName || result.assetName || "file";
                a.click();

                URL.revokeObjectURL(blobUrl);
                return;
            }

            toastService.error("File data unavailable.");
        } catch (err: any) {
            toastService.error(err.message || "Failed to load file.");
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

            await refreshInvitationSummary();
            setInvitations([]);
            await loadInvitations(currentPage, activeTab, appliedSearchQuery);
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
        window.scrollTo({ top: 0 });
        setViewingDetail(null);
        setDetailError(null);
        setVerificationAnswers({});
        setVerificationError(null);
        setVerificationSuccess(false);
        setLoadingDetail(true);

        try {
            const result = await fetchInvitationAnswers(invitation.id);

            if (isErrorResponse(result)) {
                setDetailError(result.description || result.message || "Failed to load invitation details.");
                return;
            }

            setViewingDetail(result);

            const isDefault = result.templateId?.toLowerCase() === DEFAULT_VERIFICATION_TEMPLATE_ID.toLowerCase();

            if (isDefault && adminRole === "supplier") {
                loadDefaultAnswers(result);
            } else if (!isDefault) {
                const initialAnswers: { [questionId: string]: VerificationAnswer } = {};

                result.questions?.forEach((q) => {
                    const kind = getQuestionKind(q.questionType);

                    const savedOptionIds = kind === "checkbox" && q.answer
                        ? q.answer.split(",").map((s) => s.trim()).filter(Boolean)
                        : [];

                    initialAnswers[q.verificationTemplateQuestionId] = {
                        textAnswer: q.answer || "",
                        selectedOptionId: q.verificationTemplateQuestionOptionId || null,
                        selectedOptionIds: savedOptionIds,
                        file: null,
                        fileBase64: "",
                    };
                });

                setVerificationAnswers(initialAnswers);
            }
        } catch (err: any) {
            setDetailError(err.message || "Failed to load invitation details.");
        } finally {
            setLoadingDetail(false);
        }
    };

    const isAlreadySubmitted = viewingDetail?.status === "SUBMITTED";
    const isDefaultTemplate = viewingDetail?.templateId?.toLowerCase() === DEFAULT_VERIFICATION_TEMPLATE_ID.toLowerCase();

    const closeDetail = () => {
        setViewingDetail(null);
        setDetailInvitation(null);
        setDetailError(null);
        setVerificationAnswers({});
        setSupplierProfile(null);
        setDefaultAnswers({});
        setProfileError(null);
        setHasConfirmedDetails(false);
    };

    const handleTextAnswerChange = (questionId: string, value: string) => {
        setVerificationAnswers((prev) => ({
            ...prev,
            [questionId]: {
                ...(prev[questionId] || { textAnswer: "", selectedOptionId: null, selectedOptionIds: [], file: null, fileBase64: "" }),
                textAnswer: value,
            },
        }));
    };

    const handleRadioChange = (questionId: string, optionId: string) => {
        setVerificationAnswers((prev) => ({
            ...prev,
            [questionId]: {
                ...(prev[questionId] || { textAnswer: "", selectedOptionId: null, selectedOptionIds: [], file: null, fileBase64: "" }),
                selectedOptionId: optionId,
                selectedOptionIds: [optionId],
            },
        }));
    };

    const handleCheckboxChange = (questionId: string, optionId: string, checked: boolean) => {
        setVerificationAnswers((prev) => {
            const current = prev[questionId]?.selectedOptionIds || [];
            const updated = checked ? [...current, optionId] : current.filter((id) => id !== optionId);

            return {
                ...prev,
                [questionId]: {
                    ...(prev[questionId] || { textAnswer: "", selectedOptionId: null, selectedOptionIds: [], file: null, fileBase64: "" }),
                    selectedOptionIds: updated,
                },
            };
        });
    };


    const handleFileChange = (questionId: string, file: File | null) => {
        if (!file) {
            setVerificationAnswers((prev) => ({
                ...prev,
                [questionId]: {
                    ...(prev[questionId] || { textAnswer: "", selectedOptionId: null, selectedOptionIds: [], file: null, fileBase64: "" }),
                    file: null,
                    fileBase64: "",
                },
            }));
            return;
        }

        const reader = new FileReader();

        reader.onloadend = () => {
            const result = reader.result as string;
            const base64Data = result.split(",")[1] || result;

            setVerificationAnswers((prev) => ({
                ...prev,
                [questionId]: {
                    ...(prev[questionId] || { textAnswer: "", selectedOptionId: null, selectedOptionIds: [], file: null, fileBase64: "" }),
                    file,
                    fileBase64: base64Data,
                    textAnswer: file.name,
                },
            }));
        };

        reader.readAsDataURL(file);
    };

    const validateAnswers = (): boolean => {
        if (!viewingDetail?.questions) return true;

        for (const question of viewingDetail.questions) {
            if (!question.isRequired) continue;

            const answer = verificationAnswers[question.verificationTemplateQuestionId];
            const kind = getQuestionKind(question.questionType);

            if (kind === "text") {
                if (!answer?.textAnswer?.trim()) {
                    setVerificationError(`Please answer the required question: "${question.question}"`);
                    return false;
                }
            } else if (kind === "radio") {
                if (!answer?.selectedOptionId) {
                    setVerificationError(`Please select an option for: "${question.question}"`);
                    return false;
                }
            } else if (kind === "checkbox") {
                if (!answer?.selectedOptionIds || answer.selectedOptionIds.length === 0) {
                    setVerificationError(`Please select at least one option for: "${question.question}"`);
                    return false;
                }
            } else if (kind === "file") {
                if (!answer?.file && !question.assetId) {
                    setVerificationError(`Please upload a file for: "${question.question}"`);
                    return false;
                }
            }
        }

        return true;
    };

    const handleSubmitAnswers = async (status: "SUBMITTED" | "DRAFT") => {
        if (!viewingDetail || !detailInvitation) return;

        setVerificationError(null);
        setVerificationSuccess(false);

        if (status === "SUBMITTED" && !validateAnswers()) {
            return;
        }

        setSubmittingVerification(true);

        try {
            const answers = viewingDetail.questions?.map((question) => {
                const answer = verificationAnswers[question.verificationTemplateQuestionId];
                const kind = getQuestionKind(question.questionType);

                let answerText = "";
                let selectedOptionId: string | null = null;

                if (kind === "text") {
                    answerText = answer?.textAnswer || "";
                } else if (kind === "radio") {
                    selectedOptionId = answer?.selectedOptionId || null;
                    answerText = answer?.textAnswer || "";
                } else if (kind === "checkbox") {
                    answerText = answer?.selectedOptionIds?.join(", ") || "";
                } else if (kind === "file") {
                    answerText = answer?.file?.name || "";
                }

                return {
                    verificationTemplateQuestionId: question.verificationTemplateQuestionId,
                    templateId: viewingDetail.templateId,
                    answer: answerText || null,
                    verificationTemplateQuestionOptionId: selectedOptionId,
                    attachment: answer?.file && answer?.fileBase64
                        ? {
                            entityType: "SUPPLIER",
                            // Stored against this verification request and never as a singleton: a
                            // singleton upload deactivates the supplier's files for every other question.
                            entityId: viewingDetail.supplierOrganizationId,
                            assetType: "VERIFICATION_ATTACHMENT",
                            fileBytes: answer.fileBase64,
                            fileName: answer.file.name,
                            contentType: answer.file.type,
                            isSingletonAsset: false,
                        }
                        : null,
                };
            }) || [];

            const payload: SubmitVerificationPayload = {
                verificationRequestId: viewingDetail.requestId,
                supplierId: viewingDetail.supplierOrganizationId,
                answers,
                status,
            };

            const result = await submitVerificationAnswers(payload);

            if (isErrorResponse(result)) {
                const msg = result.description || result.message || `Failed to ${status === "SUBMITTED" ? "submit" : "save"} answers.`;
                setVerificationError(msg);
                toastService.error(msg);
                return;
            }

            setVerificationSuccess(true);
            toastService.success(status === "SUBMITTED" ? "Answers submitted successfully!" : "Draft saved successfully!");

            setTimeout(() => {
                closeDetail();
            }, 1500);
        } catch (err: any) {
            const msg = err.message || `Failed to ${status === "SUBMITTED" ? "submit" : "save"} answers.`;
            setVerificationError(msg);
            toastService.error(msg);
        } finally {
            setSubmittingVerification(false);
        }
    };

    const tabCounts = invitationCounts;

    /* ---------------------------------------------------------------- Detail page */

    const renderReadOnlyAnswer = (question: VerificationQuestion) => {
        const kind = getQuestionKind(question.questionType);

        if (kind === "file") {
            return (
                <QuestionAnswer emptyText="No file uploaded">
                    {question.assetId && (
                        <button
                            type="button"
                            className="sila-btn sila-btn--secondary sila-btn--sm"
                            onClick={() => handleDownloadAsset(question.assetId!)}
                        >
                            <FaFileAlt aria-hidden="true" /> View uploaded file
                        </button>
                    )}
                </QuestionAnswer>
            );
        }

        if (kind === "radio") {
            const selected = question.options?.find((option) => option.id === question.verificationTemplateQuestionOptionId);
            return <QuestionAnswer value={selected?.optionText || question.answer || ""} />;
        }

        if (kind === "checkbox") {
            const ids = (question.answer || "").split(",").map((id) => id.trim()).filter(Boolean);
            const labels = ids.map((id) => question.options?.find((option) => option.id === id)?.optionText || id);
            return <QuestionAnswer value={labels} />;
        }

        return <QuestionAnswer value={question.answer || ""} />;
    };

    const isDraftAnswered = (question: VerificationQuestion): boolean => {
        const answer = verificationAnswers[question.verificationTemplateQuestionId];
        switch (getQuestionKind(question.questionType)) {
            case "file":
                return Boolean(answer?.file || question.assetId);
            case "radio":
                return Boolean(answer?.selectedOptionId);
            case "checkbox":
                return Boolean(answer?.selectedOptionIds?.length);
            default:
                return Boolean(answer?.textAnswer?.trim());
        }
    };

    const renderAnswerControl = (question: VerificationQuestion, inputId: string) => {
        const answer = verificationAnswers[question.verificationTemplateQuestionId];
        const questionId = question.verificationTemplateQuestionId;

        switch (getQuestionKind(question.questionType)) {
            case "text":
                return (
                    <input
                        id={inputId}
                        type="text"
                        className="sila-input"
                        placeholder="Enter your answer..."
                        value={answer?.textAnswer || ""}
                        onChange={(e) => handleTextAnswerChange(questionId, e.target.value)}
                        required={question.isRequired}
                    />
                );

            case "radio":
                return question.options && question.options.length > 0 ? (
                    <ChoiceGroup type="radio" labelledBy={`${inputId}-label`}>
                        {question.options.map((option) => (
                            <Choice
                                key={option.id}
                                type="radio"
                                name={`radio-${questionId}`}
                                label={option.optionText}
                                checked={answer?.selectedOptionId === option.id}
                                onChange={() => handleRadioChange(questionId, option.id)}
                                required={question.isRequired}
                            />
                        ))}
                    </ChoiceGroup>
                ) : null;

            case "checkbox":
                return question.options && question.options.length > 0 ? (
                    <ChoiceGroup type="checkbox" labelledBy={`${inputId}-label`}>
                        {question.options.map((option) => (
                            <Choice
                                key={option.id}
                                type="checkbox"
                                label={option.optionText}
                                checked={answer?.selectedOptionIds?.includes(option.id) || false}
                                onChange={(e) => handleCheckboxChange(questionId, option.id, e.target.checked)}
                            />
                        ))}
                    </ChoiceGroup>
                ) : null;

            case "file":
                if (question.assetId) return renderReadOnlyAnswer(question);
                return (
                    <div className="inv-file-upload">
                        <input
                            id={inputId}
                            type="file"
                            className="sila-input inv-file-input"
                            onChange={(e) => handleFileChange(questionId, e.target.files?.[0] || null)}
                            required={question.isRequired}
                        />
                        {answer?.file && (
                            <div className="sila-help inv-file-name">
                                <FaFileAlt aria-hidden="true" /> {answer.file.name}
                            </div>
                        )}
                    </div>
                );

            default:
                return renderReadOnlyAnswer(question);
        }
    };

    if (detailInvitation) {
        const questions = viewingDetail?.questions ?? [];
        const isBuyer = adminRole === "buyer";
        const isEditable = !isBuyer && !isDefaultTemplate && !isAlreadySubmitted;
        const answeredCount = questions.filter((q) => (isEditable ? isDraftAnswered(q) : hasSavedAnswer(q))).length;

        const qaSubtitle = isDefaultTemplate
            ? isBuyer
                ? "Details the supplier confirmed from their company profile."
                : "Pulled from your company profile. Review them before accepting."
            : isBuyer
                ? "The supplier's responses to your verification questions."
                : "Answer the buyer's verification questions. You can save a draft and come back later.";

        return (
            <div className="sad-border inv-page">
                <PageHeader
                    className="inv-page-header"
                    title={detailInvitation.title || viewingDetail?.rfqNumber || "Invitation"}
                    meta={viewingDetail && <StatusBadge status={viewingDetail.status} size="sm" />}
                    description={
                        viewingDetail && (
                            <span className="inv-detail-meta">
                                <span><IconBuildingSmall /> {viewingDetail.organizationName || "Organization"}</span>
                                <span><IconCalendar /> Due {new Date(viewingDetail.dueDate).toLocaleString()}</span>
                            </span>
                        )
                    }
                    onBack={closeDetail}
                    backLabel="Back to invitations"
                />

                {loadingDetail ? (
                    <Card><Loader size={24} message="Fetching invitation details..." /></Card>
                ) : detailError ? (
                    <Card><EmptyState variant="error" title="Couldn't load invitation" description={detailError} /></Card>
                ) : viewingDetail ? (
                    <>
                        <Card title="Invitation Details">
                            <div className="inv-detail-summary">
                                {viewingDetail.description && <p className="inv-detail-desc">{viewingDetail.description}</p>}

                                <dl className="sila-meta-grid">
                                    <div className="sila-meta-item">
                                        <dt className="sila-meta-label">RFQ Number</dt>
                                        <dd className="sila-meta-value">
                                            {viewingDetail.rfqNumber ? <span className="sila-ref">{viewingDetail.rfqNumber}</span> : "—"}
                                        </dd>
                                    </div>
                                    <div className="sila-meta-item">
                                        <dt className="sila-meta-label">Reference No.</dt>
                                        <dd className="sila-meta-value">
                                            {viewingDetail.snid ? <span className="sila-ref">{viewingDetail.snid}</span> : "—"}
                                        </dd>
                                    </div>
                                    <div className="sila-meta-item">
                                        <dt className="sila-meta-label">Remarks</dt>
                                        <dd className="sila-meta-value">{viewingDetail.remarks || "—"}</dd>
                                    </div>
                                </dl>
                            </div>
                        </Card>

                        {questions.length > 0 && (
                            <Card
                                title={isDefaultTemplate ? "Company Details" : "Questions & Answers"}
                                subtitle={qaSubtitle}
                                actions={!isDefaultTemplate && <QuestionProgress answered={answeredCount} total={questions.length} />}
                            >
                                <div className="inv-detail-qa">
                                    {!isBuyer && isDefaultTemplate && (
                                        <>
                                            {loadingProfile && <Loader size={20} message="Loading your details..." />}
                                            {profileError && !loadingProfile && (
                                                <div className="sila-alert sila-alert--danger inv-alert" role="alert">{profileError}</div>
                                            )}
                                            {supplierProfile && !loadingProfile && !isAlreadySubmitted && (
                                                <div className="sila-alert inv-alert inv-alert--info">
                                                    Review the details below. If everything is correct, click <strong>Accept</strong>, then <strong>Submit</strong> to finalize.
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {verificationError && (
                                        <div className="sila-alert sila-alert--danger inv-alert" role="alert">{verificationError}</div>
                                    )}

                                    {verificationSuccess && (
                                        <div className="sila-alert sila-alert--success inv-alert inv-alert--success" role="status">
                                            <IconCheckCircle /> Answers submitted successfully!
                                        </div>
                                    )}

                                    <QuestionList aria-label="Verification questions">
                                        {questions.map((question, index) => {
                                            const kind = getQuestionKind(question.questionType);
                                            const inputId = `inv-q-${question.verificationTemplateQuestionId}`;
                                            const labelsControl = isEditable && (kind === "text" || (kind === "file" && !question.assetId));

                                            return (
                                                <QuestionItem
                                                    key={question.verificationTemplateQuestionId}
                                                    index={index + 1}
                                                    question={question.question}
                                                    typeLabel={isDefaultTemplate ? undefined : QUESTION_KIND_LABELS[kind]}
                                                    required={!isDefaultTemplate && question.isRequired}
                                                    inputId={labelsControl ? inputId : undefined}
                                                    labelId={`${inputId}-label`}
                                                >
                                                    {isDefaultTemplate ? (
                                                        <QuestionAnswer
                                                            value={
                                                                isBuyer
                                                                    ? question.answer || ""
                                                                    : supplierProfile
                                                                        ? defaultAnswers[question.verificationTemplateQuestionId] || ""
                                                                        : ""
                                                            }
                                                            emptyText={isBuyer ? "Not yet submitted" : "Not available"}
                                                        />
                                                    ) : isEditable ? (
                                                        renderAnswerControl(question, inputId)
                                                    ) : (
                                                        renderReadOnlyAnswer(question)
                                                    )}
                                                </QuestionItem>
                                            );
                                        })}
                                    </QuestionList>
                                </div>
                            </Card>
                        )}

                        {!isBuyer && (
                            <div className="sila-card inv-detail-actions">
                                <span className="inv-detail-actions-hint">
                                    {isAlreadySubmitted
                                        ? "These answers have been submitted to the buyer."
                                        : isDefaultTemplate
                                            ? "Accept the details, then submit them to the buyer."
                                            : `${answeredCount} of ${questions.length} questions answered`}
                                </span>

                                <div className="sila-btn-group">
                                    {isDefaultTemplate ? (
                                        <>
                                            <button
                                                type="button"
                                                className="sila-btn sila-btn--secondary"
                                                onClick={() => setHasConfirmedDetails(true)}
                                                disabled={loadingProfile || !supplierProfile || isAlreadySubmitted || hasConfirmedDetails}
                                            >
                                                {hasConfirmedDetails ? <><FaCheck aria-hidden="true" /> Accepted</> : "Accept"}
                                            </button>
                                            <button
                                                type="button"
                                                className="sila-btn sila-btn--primary"
                                                onClick={handleSubmitDefault}
                                                disabled={submittingVerification || isAlreadySubmitted || !hasConfirmedDetails}
                                            >
                                                {submittingVerification ? "Submitting..." : "Submit"}
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                type="button"
                                                className="sila-btn sila-btn--secondary"
                                                onClick={() => handleSubmitAnswers("DRAFT")}
                                                disabled={submittingVerification || isAlreadySubmitted}
                                            >
                                                {submittingVerification ? "Saving..." : "Save as Draft"}
                                            </button>
                                            <button
                                                type="button"
                                                className="sila-btn sila-btn--primary"
                                                onClick={() => handleSubmitAnswers("SUBMITTED")}
                                                disabled={submittingVerification || isAlreadySubmitted}
                                            >
                                                {submittingVerification ? "Submitting..." : "Submit Answers"}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                ) : null}
            </div>
        );
    }

    return (
        <>
            <div className="sad-border inv-page">
            <PageHeader
                className="inv-page-header"
                title="Sourcing Invitations"
                description="Direct invitations from buyers asking you to submit price bids and proposals."
            />

            <section className="sila-card inv-list-card">
            <div className="inv-tabs-bar">
                <div className="sila-tabs inv-tabs" role="tablist" aria-label="Invitation status">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === tab.key}
                            className={`sila-tab inv-tab${activeTab === tab.key ? " inv-tab-active" : ""}`}
                            onClick={() => handleTabChange(tab.key)}
                        >
                            {tab.label}
                            <span className="sila-count sila-count--neutral">{tabCounts[tab.key]}</span>
                        </button>
                    ))}
                </div>

                <div className="inv-search-wrapper">
                    <div className="sila-search inv-search">
                        <span className="sila-search-icon" aria-hidden="true"><IconSearch /></span>

                        <input
                            type="text"
                            className="sila-input"
                            placeholder="Search buyer, ID or category..."
                            aria-label="Search invitations"
                            value={searchQuery}
                            onChange={(e) => {
                              const value = e.target.value;
                              setSearchQuery(value);

                              if (value.trim() === "") {
                                handleClearSearch();
                              }
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    handleSearch();
                                }
                            }}
                        />

                        {searchQuery.trim() && (
                            <button
                                type="button"
                                className="inv-search-clear"
                                onClick={handleClearSearch}
                                title="Clear search"
                                aria-label="Clear search"
                            >
                                <IconClose />
                            </button>
                        )}
                    </div>

                    <button
                        type="button"
                        className="sila-btn sila-btn--secondary"
                        onClick={handleSearch}
                        disabled={loading || !searchQuery.trim()}
                    >
                        Search
                    </button>
                </div>
            </div>

            <div className="inv-list-body">
            {loading ? (
                <Loader size={24} message="Loading invitations..." />
            ) : error ? (
                <EmptyState variant="error" title="Couldn't load invitations" description={error} />
            ) : invitations.length > 0 ? (
                <div className="inv-grid">
                    {invitations.map((inv, idx) => (
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
                <EmptyState
                    icon={<IconBookOpen />}
                    title="No Invitations Found"
                    description="There are no sourcing invitations matching your search criteria or filter at this time."
                />
            )}
            </div>

            {isAdmin && !loading && !error && (
                <Pagination
                    page={currentPage + 1}
                    hasNext={hasNextPage}
                    onPrevious={() => {
                        const previousPage = currentPage - 1;

                        setCurrentPage(previousPage);
                        setInvitations([]);
                        loadInvitations(previousPage, activeTab, appliedSearchQuery);
                    }}
                    onNext={() => {
                        const nextPage = currentPage + 1;

                        setCurrentPage(nextPage);
                        setInvitations([]);
                        loadInvitations(nextPage, activeTab, appliedSearchQuery);
                    }}
                />
            )}
            </section>

        </div>
        </>
    );
};

export default Invitations;