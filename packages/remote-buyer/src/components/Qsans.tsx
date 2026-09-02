import React, { useState } from "react";
import "./Qsans.css";
import { downloadBuyerAsset } from "../api/Buyerapi";

/* ---------------------------------- Icons ---------------------------------- */

const IconClose = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

const IconFile = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M8 13h8M8 17h8M8 9h2" />
    </svg>
);

/* ---------------------------------- Types ---------------------------------- */

interface QsAnsProps {
    rfq: any;
    onBack: () => void;
    loading?: boolean;
    error?: string | null;
}

/* ---------------------------------- Component ---------------------------------- */

const QsAns: React.FC<QsAnsProps> = ({ rfq, onBack, loading = false, error = null }) => {
    const [downloadingAssetId, setDownloadingAssetId] = useState<string | null>(null);
    const [downloadAssetError, setDownloadAssetError] = useState<string | null>(null);

    const [viewingAssetId, setViewingAssetId] = useState<string | null>(null);
    const [viewAssetError, setViewAssetError] = useState<string | null>(null);
    const [viewingAttachment, setViewingAttachment] = useState<{ fileName: string; url: string; contentType: string } | null>(null);

    const closeAttachmentViewer = () => {
        if (viewingAttachment?.url) {
            window.URL.revokeObjectURL(viewingAttachment.url);
        }
        setViewingAttachment(null);
    };

    const handleDownloadAnswerAttachment = async (attachment: any) => {
        if (!attachment?.id || downloadingAssetId) return;
        setDownloadingAssetId(attachment.id);
        setDownloadAssetError(null);
        try {
            const asset = await downloadBuyerAsset(attachment.id);
            if ("statusCode" in asset) {
                throw new Error((asset as any).message || "Failed to download document");
            }
            const byteCharacters = atob(asset.fileBytes);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: asset.contentType || "application/octet-stream" });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = asset.fileName || attachment.fileName || "download";
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err: any) {
            setDownloadAssetError(err.message || "Failed to download the document.");
        } finally {
            setDownloadingAssetId(null);
        }
    };

    const handleViewAnswerAttachment = async (attachment: any) => {
        if (!attachment?.id || viewingAssetId) return;
        setViewingAssetId(attachment.id);
        setViewAssetError(null);
        try {
            const asset = await downloadBuyerAsset(attachment.id);
            if ("statusCode" in asset) {
                throw new Error((asset as any).message || "Failed to download document");
            }
            const byteCharacters = atob(asset.fileBytes);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const resolvedFileName = asset.fileName || attachment.fileName || "Document";
            const extension = resolvedFileName.split(".").pop()?.toLowerCase() || "";
            const extensionMimeMap: Record<string, string> = {
                pdf: "application/pdf",
                png: "image/png",
                jpg: "image/jpeg",
                jpeg: "image/jpeg",
                gif: "image/gif",
                webp: "image/webp",
                svg: "image/svg+xml",
                txt: "text/plain",
            };
            const viewContentType =
                extensionMimeMap[extension] ||
                (asset.contentType && asset.contentType !== "application/octet-stream" ? asset.contentType : "application/pdf");

            const blob = new Blob([byteArray], { type: viewContentType });
            const url = window.URL.createObjectURL(blob);
            setViewingAttachment({
                fileName: resolvedFileName,
                url,
                contentType: viewContentType,
            });
        } catch (err: any) {
            setViewAssetError(err.message || "Failed to load the document.");
        } finally {
            setViewingAssetId(null);
        }
    };

    const questions: any[] = Array.isArray(rfq?.questions) ? rfq.questions : [];
    const suppliers: any[] = Array.isArray(rfq?.supplierAnswers?.suppliers) ? rfq.supplierAnswers.suppliers : [];

    const getAnswerForQuestion = (supplier: any, question: any) => {
        const questionId = question?.id ?? question?.rfqQuestionId;
        const answerList = Array.isArray(supplier?.answers) ? supplier.answers : [];
        return answerList.find((a: any) => a?.rfqQuestionId === questionId) || null;
    };

    return (
        <div className="qsans-page">
            <div className="qsans-header">
                <span className="qsans-badge">
                    <IconFile /> RFQ Question Answers
                </span>
                <button
                    className="qsans-close"
                    onClick={() => (viewingAttachment ? closeAttachmentViewer() : onBack())}
                    aria-label="Close"
                >
                    <IconClose />
                </button>
                <h2 className="qsans-title">
                    {loading ? "Loading Q&A..." : rfq?.title || "RFQ Question Answers"}
                </h2>
            </div>

            <div className="qsans-body">
                {viewingAttachment ? (
                    <div className="qsans-attachment-viewer">
                        <div className="qsans-attachment-toolbar">
                            <button type="button" className="qsans-btn qsans-btn-outline" onClick={closeAttachmentViewer}>
                                ← Back
                            </button>
                            <span className="qsans-attachment-name">{viewingAttachment.fileName}</span>
                            <span style={{ width: "4.375rem" }} />
                        </div>
                        <iframe
                            src={viewingAttachment.url}
                            title={viewingAttachment.fileName}
                            className="qsans-attachment-frame"
                        />
                    </div>
                ) : loading ? (
                    <div className="qsans-loading">
                        <div className="qsans-spinner" />
                        <span>Fetching questions and answers...</span>
                    </div>
                ) : error ? (
                    <div className="qsans-error">{error}</div>
                ) : (
                    <>
                        <div className="qsans-section-title">Evaluation Questions &amp; Answers</div>

                        {questions.length === 0 ? (
                            <div className="qsans-empty">No evaluation questions were configured for this RFQ.</div>
                        ) : suppliers.length === 0 ? (
                            <div className="qsans-empty">No supplier responses have been submitted yet.</div>
                        ) : (
                            <div className="qsans-suppliers">
                                {suppliers.map((supplier: any, sIdx: number) => {
                                    const displayName = supplier?.supplierName || `Supplier ${sIdx + 1}`;

                                    return (
                                        <div
                                            className="qsans-supplier-block"
                                            key={supplier?.supplierRFQId ? `${supplier.supplierRFQId}-${supplier.supplierId}-${sIdx}` : sIdx}
                                        >
                                            <div className="qsans-supplier-header">
                                                <span className="qsans-supplier-name">{displayName}</span>
                                            </div>

                                            <div className="qsans-questions-list">
                                                {questions.map((q: any, qIdx: number) => {
                                                    const match = getAnswerForQuestion(supplier, q);
                                                    const display =
                                                        match?.answer && String(match.answer).trim() !== ""
                                                            ? match.answer
                                                            : match?.attachment?.fileName || "";

                                                    return (
                                                        <div className="qsans-qa-card" key={q.id || qIdx}>
                                                            <div className="qsans-qa-question-row">
                                                                <span className="qsans-qa-question">
                                                                    Q{qIdx + 1}: {q.question}
                                                                </span>
                                                                <span className="qsans-qa-type">
                                                                    {q.questionType} {q.isRequired ? "(Required)" : ""}
                                                                </span>
                                                            </div>

                                                            {display ? (
                                                                <div className="qsans-qa-answer-row">
                                                                    <span className="qsans-qa-answer">{display}</span>
                                                                    {match?.attachment && (
                                                                        <div className="qsans-qa-actions">
                                                                            <button
                                                                                type="button"
                                                                                className="qsans-btn qsans-btn-outline"
                                                                                disabled={viewingAssetId === match.attachment.id}
                                                                                onClick={() => handleViewAnswerAttachment(match.attachment)}
                                                                            >
                                                                                {viewingAssetId === match.attachment.id ? "Loading..." : "View"}
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                className="qsans-btn qsans-btn-outline"
                                                                                disabled={downloadingAssetId === match.attachment.id}
                                                                                onClick={() => handleDownloadAnswerAttachment(match.attachment)}
                                                                            >
                                                                                {downloadingAssetId === match.attachment.id ? "Downloading..." : "Download"}
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <div className="qsans-qa-empty">No response yet.</div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}

                                {(downloadAssetError || viewAssetError) && (
                                    <div className="qsans-asset-error">{downloadAssetError || viewAssetError}</div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            <div className="qsans-footer">
                <button
                    className="qsans-btn qsans-btn-outline"
                    onClick={() => (viewingAttachment ? closeAttachmentViewer() : onBack())}
                >
                    {viewingAttachment ? "Back" : "Close"}
                </button>
            </div>
        </div>
    );
};

export default QsAns;