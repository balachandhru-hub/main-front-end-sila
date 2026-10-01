import React, { useEffect, useState } from "react";
import { Loader, toastService } from "@vosox/shared-ui";
import {
  getDocument,
  getDocumentContent,
  getDocumentTransfers,
  retryDocumentTransfer,
  saveBlob,
  type DocumentTransfer,
  type OperationsDocument,
} from "../../api/operationsApi";
import { errorMessage, formatDateTime, formatFileSize, statusBadgeClass, statusLabel } from "./operationsFormat";
import "./Operations.css";

interface InvoiceDocumentPanelProps {
  documentId: string;
}

const RETRYABLE = ["FAILED", "FAILED_AUTHENTICATION", "RETRY_PENDING"];

/** The stored original of an invoice and where it was copied to in external document storage. */
const InvoiceDocumentPanel: React.FC<InvoiceDocumentPanelProps> = ({ documentId }) => {
  const [document, setDocument] = useState<OperationsDocument | null>(null);
  const [transfers, setTransfers] = useState<DocumentTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fetching, setFetching] = useState<"view" | "download" | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const loadTransfers = async () => {
    setTransferError(null);
    try {
      setTransfers(await getDocumentTransfers(documentId));
    } catch (err: unknown) {
      setTransferError(errorMessage(err, "Could not load the document transfers."));
    }
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setPreviewUrl(null);
    getDocument(documentId)
      .then((row) => {
        if (active) setDocument(row);
      })
      .catch((err: unknown) => {
        if (active) setError(errorMessage(err, "Could not load the document."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    loadTransfers();
    return () => {
      active = false;
    };
  }, [documentId]);

  // Release the preview when it is replaced or the panel closes.
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const fetchContent = async (mode: "view" | "download") => {
    setFetching(mode);
    try {
      const blob = await getDocumentContent(documentId);
      if (mode === "download") {
        saveBlob(blob, document?.filename || "invoice-document");
      } else {
        setPreviewUrl(URL.createObjectURL(blob));
      }
    } catch (err: unknown) {
      toastService.error(errorMessage(err, "Could not load the stored document."));
    } finally {
      setFetching(null);
    }
  };

  const handleRetry = async (transfer: DocumentTransfer) => {
    setRetryingId(transfer.destinationId);
    try {
      await retryDocumentTransfer(transfer.destinationId);
      toastService.success("The transfer was queued again.");
      await loadTransfers();
    } catch (err: unknown) {
      toastService.error(errorMessage(err, "Could not retry the transfer."));
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <section className="sila-card">
      <div className="sila-card-header">
        <h2 className="sila-card-title">Stored document</h2>
        {document && <span className={statusBadgeClass(document.status)}>{statusLabel(document.status)}</span>}
      </div>
      <div className="sila-card-body ops-stack">
        {loading ? (
          <Loader size={20} message="Loading document..." />
        ) : error || !document ? (
          <span className="sila-error-text">{error ?? "The document was not returned."}</span>
        ) : (
          <>
            <dl className="sila-meta-grid">
              <div className="sila-meta-item"><dt className="sila-meta-label">File</dt><dd className="sila-meta-value ops-break">{document.filename}</dd></div>
              <div className="sila-meta-item"><dt className="sila-meta-label">Size</dt><dd className="sila-meta-value">{formatFileSize(document.fileSizeBytes)}</dd></div>
              <div className="sila-meta-item"><dt className="sila-meta-label">Pages</dt><dd className="sila-meta-value">{document.pageCount ?? "—"}</dd></div>
              <div className="sila-meta-item"><dt className="sila-meta-label">Source</dt><dd className="sila-meta-value">{statusLabel(document.sourceChannel)}</dd></div>
              <div className="sila-meta-item"><dt className="sila-meta-label">Uploaded</dt><dd className="sila-meta-value">{formatDateTime(document.createdAt)}</dd></div>
            </dl>
            <div className="sila-btn-group">
              <button type="button" className="sila-btn sila-btn--secondary" onClick={() => fetchContent("view")} disabled={fetching !== null}>
                {fetching === "view" ? "Loading..." : previewUrl ? "Reload preview" : "View document"}
              </button>
              <button type="button" className="sila-btn sila-btn--secondary" onClick={() => fetchContent("download")} disabled={fetching !== null}>
                {fetching === "download" ? "Downloading..." : "Download"}
              </button>
            </div>
            {previewUrl && (
              document.contentType.startsWith("image/")
                ? <img className="ops-document-frame" src={previewUrl} alt={`Stored document ${document.filename}`} />
                : <iframe className="ops-document-frame" src={previewUrl} title={`Stored document ${document.filename}`} />
            )}
          </>
        )}

        <h3 className="sila-card-title">External document storage</h3>
        {transferError ? (
          <span className="sila-error-text">{transferError}</span>
        ) : transfers.length === 0 ? (
          <span className="sila-help">
            No external destination applies to this document. The stored original above stays available.
          </span>
        ) : (
          <div className="sila-table-wrap">
            <table className="sila-table">
              <thead>
                <tr>
                  <th scope="col">Provider</th>
                  <th scope="col">Folder</th>
                  <th scope="col">Stored file</th>
                  <th scope="col">Attempts</th>
                  <th scope="col">Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((transfer) => (
                  <tr key={transfer.destinationId}>
                    <td>
                      <span className="sila-cell-strong">{statusLabel(transfer.provider)}</span>
                      <div className="sila-help">{transfer.resolutionSource ? statusLabel(transfer.resolutionSource) : "Configured"}</div>
                    </td>
                    <td className="ops-break">{transfer.folderPath || "Configured destination"}</td>
                    <td className="ops-break">
                      {transfer.externalWebUrl
                        ? <a href={transfer.externalWebUrl} target="_blank" rel="noreferrer">{transfer.externalFileName || "Open file"}</a>
                        : transfer.externalFileName || "—"}
                    </td>
                    <td>{transfer.attemptCount}</td>
                    <td>
                      <span className={statusBadgeClass(transfer.status)}>{statusLabel(transfer.status)}</span>
                      {transfer.lastErrorMessage && <div className="sila-error-text">{transfer.lastErrorMessage}</div>}
                    </td>
                    <td>
                      {RETRYABLE.includes(transfer.status) ? (
                        <button type="button" className="sila-btn sila-btn--secondary sila-btn--sm" onClick={() => handleRetry(transfer)} disabled={retryingId !== null}>
                          {retryingId === transfer.destinationId ? "Retrying..." : "Retry"}
                        </button>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};

export default InvoiceDocumentPanel;
