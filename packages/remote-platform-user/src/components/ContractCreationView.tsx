import React, { useState, useMemo, useRef, useEffect } from "react";
import { fetchBuyerAsset } from "../api/platformApi";
import { fetchReferenceList } from "../api/masterdataApi";
import { Button } from "@vosox/shared-ui";
import "./ContractCreationView.css";

export interface RfqAssetAttachment {
  id: string;
  assetType?: string;
  assetName?: string;
  fileType?: string;
  fileName?: string;
}

export interface TermsConditionStatusEntry {
  termsAndCondition: boolean;
  supplierId: string;
  supplierName: string;
  attachments: RfqAssetAttachment[];
}

export interface EsignStatusEntry {
  supplierId: string;
  supplierName: string;
  attachments: RfqAssetAttachment[];
}

function fmtINR(val: number) {
  if (!val && val !== 0) return "—";
  return "₹" + Math.round(val).toLocaleString("en-IN");
}

function nowLabel() {
  const now = new Date();
  return (
    now.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) +
    ", " +
    now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
  );
}

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  txt: "text/plain",
  csv: "text/csv",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

// The asset API's contentType can be missing, generic (octet-stream) or a bare type like "pdf",
// so fall back to the file type / file extension.
function resolveMimeType(contentType: string | undefined, fileName: string): string {
  if (contentType && contentType.includes("/") && contentType !== "application/octet-stream") {
    return contentType;
  }
  const extension = (contentType || fileName.split(".").pop() || "").toLowerCase();
  return MIME_BY_EXTENSION[extension] || MIME_BY_EXTENSION[fileName.split(".").pop()?.toLowerCase() || ""] || "application/octet-stream";
}

export interface ContractCreationViewProps {
  rfq: any;
  lineItems: any[];
  effectiveQuotations: any[];
  displaySuppliers?: any[];
  selections?: Record<string, string>;
  distinctSelected?: string[];
  getQuoteItemForRfqItem?: (quotation: any, rfqItem: any) => any | null;
  onBack: () => void;
  role?: "buyer" | "supplier";
  supplierId?: string;
  supplierName?: string;
  onUploadSupplierTerms?: (payload: { rfqId: string; termsAndCondition: boolean; documents?: any[] }) => Promise<any>;
  onUploadSupplierEsign?: (rfqId: string, payload: {
    entityType?: string;
    entityId?: string;
    assetType?: string;
    fileBytes?: string;
    fileName?: string;
    contentType?: string;
    isSingletonAsset?: boolean;
    id?: string;
  }) => Promise<any>;
  onUploadBuyerEsign?: (rfqId: string, payload: {
    entityType?: string;
    entityId?: string;
    assetType?: string;
    fileBytes?: string;
    fileName?: string;
    contentType?: string;
    isSingletonAsset?: boolean;
    id?: string;
  }) => Promise<any>;
  /** Buyer sets a status (e.g. "ACCEPTED") on the supplier's terms & conditions. Buyer role only. */
  onAcceptSupplierTerms?: (rfqId: string, status: string) => Promise<any>;
  /** Supplier sets a status (e.g. "ACCEPTED") on the buyer's terms & conditions. Supplier role only. */
  onAcceptBuyerTerms?: (rfqId: string, status: string) => Promise<any>;
  /** Fetches the latest per-supplier terms & conditions status/attachments for this RFQ. */
  fetchTermsConditions?: (rfqId: string) => Promise<TermsConditionStatusEntry[] | { statusCode: number }>;
  /** Fetches the latest per-supplier e-signature status/attachments for this RFQ. */
  fetchESigns?: (rfqId: string) => Promise<EsignStatusEntry[] | { statusCode: number }>;
}

export interface SignDetails {
  signerName: string;
  signerDesignation: string;
  signedAt: string;
  method: "e-sign" | "upload";
  fileName?: string;
  drawnSignatureUrl?: string;
}

interface ContractState {
  supplierId: string;
  contractNumber: string;
  itemIds: string[];
  startDate: string;
  endDate: string;
  dateError: boolean;
  step: "details" | "terms" | "sign" | "completed";
  sent: boolean;
  tcContent: string;
  tcEdited: boolean;
  tcLastUpdatedAt: string | null;
  tcEditorOpen: boolean;
  tcDraft: string;
  buyerFinalAccepted: boolean;
  supplierFinalAccepted: boolean;
  supplierFinalRejected?: boolean;
  buyerSigned: boolean;
  supplierSigned: boolean;
  buyerSignDetails?: SignDetails | null;
  supplierSignDetails?: SignDetails | null;
  messages: Array<{ sender: string; text: string; time: string }>;
  draftMessage: string;
}

const SignaturePad: React.FC<{ onDraw: (dataUrl: string | null) => void }> = ({ onDraw }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e && e.touches[0]) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else if ("clientX" in e) {
      return {
        x: (e as React.MouseEvent).clientX - rect.left,
        y: (e as React.MouseEvent).clientY - rect.top,
      };
    }
    return { x: 0, y: 0 };
  };

  const startDrawing = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setIsDrawing(true);
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.strokeStyle = "#1D4ED8";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    if (isEmpty) {
      setIsEmpty(false);
    }
    onDraw(canvas.toDataURL("image/png"));
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    onDraw(null);
  };

  return (
    <div>
      <div className="contract-sigpad-box">
        <canvas
          ref={canvasRef}
          width={640}
          height={220}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="contract-sigpad-canvas"
        />
        {isEmpty && (
          <div className="contract-sigpad-placeholder">
            ✍️ Draw your signature here with cursor / touchpad...
          </div>
        )}
      </div>
      <div className="contract-sigpad-footer">
        <span className="contract-caption">
          {isEmpty ? "Canvas empty" : "Signature captured"}
        </span>
        <button
          type="button"
          onClick={clearCanvas}
          className="contract-sigpad-clear"
        >
          Clear Signature
        </button>
      </div>
    </div>
  );
};

export const ContractCreationView: React.FC<ContractCreationViewProps> = ({
  rfq,
  lineItems,
  effectiveQuotations,
  displaySuppliers = [],
  selections = {},
  distinctSelected = [],
  getQuoteItemForRfqItem,
  onBack,
  role = "buyer",
  supplierId,
  supplierName,
  onUploadSupplierTerms,
  onUploadSupplierEsign,
  onUploadBuyerEsign,
  onAcceptSupplierTerms,
  onAcceptBuyerTerms,
  fetchTermsConditions,
  fetchESigns,
}) => {
  const isSupplier = role === "supplier";
  const rfqId: string | undefined = rfq?.rfqId || rfq?.id || (rfq as any)?._id;

  // Supplier role: the supplier's own Terms & Conditions and e-signature state, as returned by the supplier's rfq-by-id.
  // Read once so the accepted status, T&C documents and e-signature survive leaving and reopening the contract.
  const supplierHasOwnTc = isSupplier && (rfq as any)?.supplierTermsAndCondition === true;
  const supplierOwnTcDocs: RfqAssetAttachment[] = isSupplier ? (rfq as any)?.supplierTermsConditionDocuments || [] : [];
  const supplierHasSigned = isSupplier && ((rfq as any)?.eSignDocuments?.length ?? 0) > 0;
  const supplierAcceptedBuyerTc = isSupplier && (rfq as any)?.buyerTermsAndConditionAccepted === true;

  // Real terms-condition / e-sign status per supplier, sourced from the RFQ payload
  // (buyer's rfq-by-id already includes it) and refreshed via the dedicated status endpoints.
  const [termsConditions, setTermsConditions] = useState<TermsConditionStatusEntry[]>(
    (rfq as any)?.supplierTermsConditions || []
  );
  const [eSigns, setESigns] = useState<EsignStatusEntry[]>((rfq as any)?.supplierESigns || []);

  useEffect(() => {
    setTermsConditions((rfq as any)?.supplierTermsConditions || []);
  }, [(rfq as any)?.supplierTermsConditions]);

  useEffect(() => {
    setESigns((rfq as any)?.supplierESigns || []);
  }, [(rfq as any)?.supplierESigns]);

  const refreshTermsConditions = async () => {
    if (!fetchTermsConditions || !rfqId) return;
    try {
      const res = await fetchTermsConditions(rfqId);
      if (Array.isArray(res)) setTermsConditions(res);
    } catch (err) {
      console.error("Failed to refresh terms & conditions status:", err);
    }
  };

  const refreshESigns = async () => {
    if (!fetchESigns || !rfqId) return;
    try {
      const res = await fetchESigns(rfqId);
      if (Array.isArray(res)) setESigns(res);
    } catch (err) {
      console.error("Failed to refresh e-signature status:", err);
    }
  };

  useEffect(() => {
    refreshTermsConditions();
    refreshESigns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfqId]);

  const [busyAssetId, setBusyAssetId] = useState<string | null>(null);

  // Downloads the asset, or with `preview` opens it in a new tab (the browser itself downloads types it can't display, e.g. Excel).
  const handleDownloadAsset = async (assetId: string, defaultName: string = "Document", preview: boolean = false) => {
    setBusyAssetId(assetId);
    // Open the tab right away, while still inside the click, so the browser doesn't block it after the fetch below.
    const previewTab = preview ? window.open("", "_blank") : null;
    if (previewTab) previewTab.opener = null;
    try {
      const res = await fetchBuyerAsset(assetId);
      if (res && "fileBytes" in res && res.fileBytes) {
        const fileName = (res as any).fileName || defaultName;
        const mime = resolveMimeType((res as any).contentType || (res as any).fileType, fileName);
        const base64Str = (res as any).fileBytes.includes(",") ? (res as any).fileBytes.split(",")[1] : (res as any).fileBytes;
        const byteCharacters = atob(base64Str);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mime });
        const url = URL.createObjectURL(blob);
        if (preview) {
          if (previewTab) {
            previewTab.location.href = url;
          } else {
            window.open(url, "_blank", "noopener,noreferrer");
          }
          setTimeout(() => URL.revokeObjectURL(url), 60000);
        } else {
          const a = document.createElement("a");
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      } else {
        previewTab?.close();
        alert("Document file content not available for download.");
      }
    } catch (err) {
      previewTab?.close();
      console.error("Failed to download document:", err);
      alert(preview ? "Unable to preview document." : "Unable to download document.");
    } finally {
      setBusyAssetId(null);
    }
  };

  const renderTermsDocs = (docs: RfqAssetAttachment[]) => (
    <div className="contract-tc-docs">
      {docs.map((doc, idx) => {
        const docName = doc.fileName || doc.assetName || `Terms_Document_${idx + 1}`;
        return (
          <div key={doc.id || idx} className="contract-tc-doc">
            <span className="contract-doc-icon">📎</span>
            <span className="contract-doc-name">{docName}</span>
            {doc.id && (
              <>
                <button
                  type="button"
                  onClick={() => handleDownloadAsset(doc.id, docName, true)}
                  disabled={busyAssetId === doc.id}
                  className="contract-btn contract-btn--outline contract-btn--xs"
                >
                  Preview
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadAsset(doc.id, docName)}
                  disabled={busyAssetId === doc.id}
                  className="contract-btn contract-btn--soft contract-btn--xs"
                >
                  Download
                </button>
              </>
            )}
          </div>
        );
      })}
    </div>
  );

  // Determine awarded suppliers
  const awardedSupplierIds = useMemo(() => {
    if (distinctSelected && distinctSelected.length > 0) return distinctSelected;
    if (displaySuppliers && displaySuppliers.length > 0) return [displaySuppliers[0].id];
    if (supplierId) return [supplierId];
    if (lineItems && lineItems.length > 0) {
      const itemWithAward = lineItems.find((it: any) => it.awardedSupplierId);
      if (itemWithAward?.awardedSupplierId) return [itemWithAward.awardedSupplierId];
    }
    return ["SUPPLIER-1"];
  }, [distinctSelected, displaySuppliers, supplierId, lineItems]);

  const resolveQuoteItem = (quotation: any, rfqItem: any) => {
    if (getQuoteItemForRfqItem) {
      return getQuoteItemForRfqItem(quotation, rfqItem);
    }
    if (!quotation) return null;
    const rfqItemId = rfqItem?.id || rfqItem?.itemId || rfqItem?._id || rfqItem?.buyerRFQItemId;
    const itemsList = quotation.items || quotation.supplierQuotationItems || rfq?.supplierQuotationItems || [];
    return (
      itemsList.find((qi: any) =>
        (qi.supplierRFQItemId && rfqItem?.supplierRFQItemId && qi.supplierRFQItemId === rfqItem.supplierRFQItemId) ||
        (qi.supplierRFQItemId && rfqItemId && qi.supplierRFQItemId === rfqItemId) ||
        (qi.buyerRFQItemId && rfqItemId && qi.buyerRFQItemId === rfqItemId) ||
        (qi.buyerRFQItemId && rfqItem?.buyerRFQItemId && qi.buyerRFQItemId === rfqItem.buyerRFQItemId) ||
        qi.id === rfqItemId ||
        qi.itemQuotationId === rfqItemId
      ) || null
    );
  };

  // Map of line items for each awarded supplier
  const supplierItemsMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    awardedSupplierIds.forEach((sid) => {
      map[sid] = [];
    });
    lineItems.forEach((item: any) => {
      const itemId = item.id || item.itemId || item._id;

      // In supplier mode (or single-supplier contract view), include all line items quoted by the supplier
      if (isSupplier || awardedSupplierIds.length === 1) {
        const targetSid = awardedSupplierIds[0] || supplierId;
        if (targetSid) {
          if (!map[targetSid]) map[targetSid] = [];
          map[targetSid].push(itemId);
          return;
        }
      }

      let suppId = (selections && selections[itemId]) || item.awardedSupplierId;
      if (!suppId && effectiveQuotations && effectiveQuotations.length > 0) {
        const suppQuotation = effectiveQuotations.find((q: any) =>
          q.supplierId === supplierId || q.quotationId === supplierId
        ) || effectiveQuotations[0];
        const qi = resolveQuoteItem(suppQuotation, item);
        if (qi && qi.isAwarded) {
          suppId = suppQuotation.supplierId || supplierId || awardedSupplierIds[0];
        }
      }
      if (!suppId) suppId = awardedSupplierIds[0];
      if (suppId) {
        if (!map[suppId]) map[suppId] = [];
        map[suppId].push(itemId);
      }
    });
    // Ensure every awarded supplier has at least line items if empty
    awardedSupplierIds.forEach((sid) => {
      if (!map[sid] || map[sid].length === 0) {
        map[sid] = lineItems.map((it: any) => it.id || it.itemId || it._id);
      }
    });
    return map;
  }, [awardedSupplierIds, lineItems, selections, effectiveQuotations, isSupplier, supplierId]);

  // Initialize contracts state per supplier
  const [contracts, setContracts] = useState<Record<string, ContractState>>(() => {
    const initial: Record<string, ContractState> = {};
    awardedSupplierIds.forEach((sid) => {
      initial[sid] = {
        supplierId: sid,
        contractNumber: "CTR-2026-" + (10000 + Math.floor(Math.random() * 89999)).toString().slice(0, 5),
        itemIds: supplierItemsMap[sid] || [],
        startDate: "2026-09-15",
        endDate: "2027-09-14",
        dateError: false,
        step: isSupplier ? (supplierHasSigned || (supplierHasOwnTc && supplierOwnTcDocs.length > 0) ? "sign" : "terms") : "details",
        sent: isSupplier ? true : false,
        tcContent:
          "1. Payment Terms: 45 days from invoice date.\n2. Delivery: Within 30 days of purchase order issuance.\n3. Warranty: 12 months standard warranty on all items from date of delivery.\n4. Penalty: 1% of order value per week of delay, capped at maximum 10%.",
        tcEdited: false,
        tcLastUpdatedAt: null,
        tcEditorOpen: false,
        tcDraft: "",
        buyerFinalAccepted: isSupplier ? true : false,
        supplierFinalAccepted: supplierHasOwnTc || supplierAcceptedBuyerTc,
        buyerSigned: false,
        supplierSigned: supplierHasSigned,
        messages: isSupplier
          ? [
              {
                sender: "Buyer",
                text: "Contract terms issued for supplier review.",
                time: nowLabel(),
              },
            ]
          : [],
        draftMessage: "",
      };
    });
    return initial;
  });

  const [activeContractId, setActiveContractId] = useState<string>(
    isSupplier && supplierId && awardedSupplierIds.includes(supplierId)
      ? supplierId
      : awardedSupplierIds[0] || ""
  );



  // Chat Drawer State
  const [chatOpen, setChatOpen] = useState(false);
  const [chatViewSupplierId, setChatViewSupplierId] = useState<string | null>(null);

  // E-Sign Modal State
  const [eSignModalContractId, setESignModalContractId] = useState<string | null>(null);
  const [signerNameInput, setSignerNameInput] = useState("");
  const [signerDesignationInput, setSignerDesignationInput] = useState("");
  const [declarationChecked, setDeclarationChecked] = useState(true);
  const [drawnSignatureData, setDrawnSignatureData] = useState<string | null>(null);

  // Supplier Terms & Conditions Document Upload State
  const [supplierTcFile, setSupplierTcFile] = useState<File | null>(null);
  // "Is there any Supplier Terms & Conditions?" yes = supplier uploads their own (sent as true), no = proceed with the buyer's (sent as false).
  const [hasSupplierTcChoice, setHasSupplierTcChoice] = useState<"yes" | "no">("no");
  const [includeSupplierTc, setIncludeSupplierTc] = useState(true);
  const [uploadingSupplierTc, setUploadingSupplierTc] = useState(false);
  const [supplierTcStatusMsg, setSupplierTcStatusMsg] = useState<string | null>(null);
  const supplierTcStatusMsgClass = `contract-status-msg${supplierTcStatusMsg?.includes("Success") ? " contract-status-msg--success" : ""}`;

  // The SUPPLIER row of the ENTITY_TYPE reference list: its id is the entityId of the supplier's uploaded assets
  // (terms & conditions, e-signature).
  const getSupplierEntityType = async () => {
    const entityTypes = await fetchReferenceList(["ENTITY_TYPE"]);
    const supplierEntity = Array.isArray(entityTypes)
      ? entityTypes.find((e) => e.key === "SUPPLIER")
      : undefined;
    if (!supplierEntity) {
      throw new Error("SUPPLIER entity type not found.");
    }
    return { entityId: supplierEntity.id as string, entityType: supplierEntity.key as string };
  };

  const handleUploadSupplierTcFileDirect = async (id: string) => {
    if (!supplierTcFile || !onUploadSupplierTerms) return;
    setUploadingSupplierTc(true);
    setSupplierTcStatusMsg(null);
    try {
      const fileBytes = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.includes(",") ? result.split(",")[1] : result;
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(supplierTcFile);
      });

      const rfqId = rfq?.rfqId || rfq?.id || (rfq as any)?._id || id;
      const { entityId, entityType } = await getSupplierEntityType();
      const docAsset = {
        entityId,
        entityType,
        assetType: "SUPPLIER_TERMS_CONDITION",
        fileName: supplierTcFile.name,
        isSingletonAsset: false,
        fileBytes: fileBytes,
      };

      const res = await onUploadSupplierTerms({
        rfqId: rfqId,
        termsAndCondition: true,
        documents: [docAsset],
      });

      if (res && "statusCode" in res && res.statusCode >= 400) {
        setSupplierTcStatusMsg(res.message || "Failed to upload terms document.");
        setUploadingSupplierTc(false);
        return;
      }

      if (onAcceptBuyerTerms && rfqId) {
        try {
          await onAcceptBuyerTerms(rfqId, "REJECT");
        } catch (err) {
          console.error("Failed to update buyer terms status to REJECT:", err);
        }
      }

      setSupplierTcStatusMsg("Success! Supplier terms uploaded & submitted.");
      const c = contracts[id];
      if (c) {
        const timeStr = nowLabel();
        updateContract(id, {
          supplierFinalAccepted: true,
          supplierFinalRejected: false,
          tcEdited: true,
          tcLastUpdatedAt: timeStr,
          messages: [
            ...c.messages,
            {
              sender: "Supplier",
              text: `Supplier submitted custom Terms & Conditions document (${supplierTcFile.name}).`,
              time: timeStr,
            },
          ],
        });
      }
    } catch (err: any) {
      setSupplierTcStatusMsg(err?.message || "Failed to upload document.");
    } finally {
      setUploadingSupplierTc(false);
    }
  };

  const activeContract = contracts[activeContractId];

  const updateContract = (id: string, patch: Partial<ContractState>) => {
    setContracts((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
  };

  // Real terms-condition / e-sign status for the currently active supplier, when the API has data for it.
  const activeTcEntry = activeContract
    ? termsConditions.find((e) => String(e.supplierId) === String(activeContract.supplierId))
    : undefined;
  const activeEsignEntry = activeContract
    ? eSigns.find((e) => String(e.supplierId) === String(activeContract.supplierId))
    : undefined;

  // The buyer's own Terms & Conditions documents attached to the RFQ.
  const buyerTermsDocs: RfqAssetAttachment[] =
    (rfq as any)?.termsConditionDocuments || (rfq as any)?.termsConditionDocument || [];

  // termsAndCondition means "the supplier has their own Terms & Conditions".
  // Buyer: once the supplier's entry is known (true or false) there is no terms review card, the contract goes straight to signing.
  // Supplier: only when they have submitted their own documents.
  const tcDeclined =
    (!isSupplier && activeTcEntry !== undefined) ||
    (supplierHasOwnTc && supplierOwnTcDocs.length > 0);

  // Skip the terms negotiation card & jump straight to signing.
  useEffect(() => {
    if (!activeContract || !tcDeclined) return;
    if (activeContract.step === "terms" || activeContract.step === "details") {
      updateContract(activeContract.supplierId, {
        buyerFinalAccepted: true,
        supplierFinalAccepted: true,
        step: activeContract.buyerSigned && activeContract.supplierSigned ? "completed" : "sign",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeContract?.step, activeContract?.supplierId, tcDeclined]);

  // Buyer: a supplier whose e-signature has been uploaded has signed, so show them as signed / accepted.
  const supplierEsignUploaded = !isSupplier && (activeEsignEntry?.attachments?.length ?? 0) > 0;
  useEffect(() => {
    if (!activeContract || !supplierEsignUploaded || activeContract.supplierSigned) return;
    updateContract(activeContract.supplierId, {
      supplierSigned: true,
      step: activeContract.buyerSigned ? "completed" : "sign",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierEsignUploaded, activeContract?.supplierId, activeContract?.supplierSigned]);

  // Supplier T&C documents to list: the supplier's own (supplier role), or those of a supplier who has
  // their own T&C (buyer role). A supplier without their own T&C has nothing to show.
  const supplierTcDocsToShow: RfqAssetAttachment[] = isSupplier
    ? supplierOwnTcDocs
    : activeTcEntry?.termsAndCondition === true
      ? activeTcEntry.attachments || []
      : [];

  const showTermsAcceptanceCard =
    !tcDeclined &&
    (activeContract?.step === "terms" ||
      activeContract?.step === "completed" ||
      (activeContract?.step === "sign" && !(activeContract.buyerSigned && activeContract.supplierSigned)));

  // Supplier Accept / Reject of the buyer's Terms & Conditions, shown in the "Contract Terms & Conditions" card.
  const showBuyerTermsDecision =
    isSupplier &&
    showTermsAcceptanceCard &&
    activeTcEntry?.termsAndCondition !== true &&
    hasSupplierTcChoice === "no";

  // Helper calculation for contract value per supplier
  const getContractValue = (id: string) => {
    const c = contracts[id];
    if (!c) return 0;
    const itemIdsToCalculate = (supplierItemsMap[id] && supplierItemsMap[id].length > 0)
      ? supplierItemsMap[id]
      : c.itemIds;
    const suppQuotation =
      effectiveQuotations.find(
        (q: any) => (q.quotationId === id || q.supplierId === id || q._id === id)
      ) || effectiveQuotations[0];

    const calculatedSum = itemIdsToCalculate.reduce((sum, itemId) => {
      const item = lineItems.find(
        (x: any) => (x.id || x.itemId || x._id) === itemId
      );
      if (!item) return sum;
      const qi = suppQuotation ? resolveQuoteItem(suppQuotation, item) : null;
      if (!qi) return sum;
      const qty = item.quantity || item.qty || 1;
      const unitPrice = qi?.quotedAmount ?? qi?.quotedPrice ?? 0;
      const discount = qi?.discount ?? (qi as any)?.discountPercentage ?? 0;
      const tax = qi?.tax ?? (qi as any)?.taxPercentage ?? (qi as any)?.gst ?? 0;
      const delivery = qi?.deliveryCharge ?? (qi as any)?.deliveryAmount ?? 0;
      const discAmt = discount > 0 ? Math.round((unitPrice * qty) * (discount / 100)) : 0;
      const taxAmt = tax > 0 ? Math.round((unitPrice * qty - discAmt) * (tax / 100)) : 0;
      return sum + (qi?.subTotal ?? (unitPrice * qty - discAmt + taxAmt + delivery));
    }, 0);

    if (calculatedSum > 0) return calculatedSum;
    if (suppQuotation?.totalPrice) return suppQuotation.totalPrice;
    return 0;
  };

  // Helper for active contract supplier name
  const getSupplierName = (sid: string) => {
    const q = effectiveQuotations.find(
      (x: any) => (x.quotationId === sid || x.supplierId === sid || x._id === sid)
    );
    const supplierIdToMatch = q?.supplierId || sid;

    // Check rfq.supplierIds
    const internalSupp = rfq?.supplierIds?.find(
      (s: any) => s.supplierId === supplierIdToMatch
    );
    if (internalSupp?.supplierName) return internalSupp.supplierName;

    // Check rfq.externalSupplierIds
    const externalSupp = rfq?.externalSupplierIds?.find(
      (s: any) => s.externalSupplierId === supplierIdToMatch
    );
    if (externalSupp?.externalSupplierName) return externalSupp.externalSupplierName;

    // Check quotation attributes
    if (q?.supplierName) return q.supplierName;
    if (q?.organizationName) return q.organizationName;

    const obj = displaySuppliers.find((s: any) => s.id === sid || s.id === supplierIdToMatch);
    return obj?.name || supplierName || "Supplier";
  };

  // Date handlers
  const handleStartDateChange = (id: string, val: string) => {
    const c = contracts[id];
    const patch: Partial<ContractState> = { startDate: val };
    const dateErr = new Date(c.endDate) < new Date(val);
    patch.dateError = dateErr;

    if (c.sent && !dateErr) {
      const sender = isSupplier ? "Supplier" : "Buyer";
      patch.messages = [
        ...c.messages,
        { sender, text: `Updated the contract start date to ${val}.`, time: nowLabel() },
      ];
    }
    updateContract(id, patch);
  };

  const handleEndDateChange = (id: string, val: string) => {
    const c = contracts[id];
    const patch: Partial<ContractState> = { endDate: val };
    const dateErr = new Date(val) < new Date(c.startDate);
    patch.dateError = dateErr;

    if (c.sent && !dateErr) {
      const sender = isSupplier ? "Supplier" : "Buyer";
      patch.messages = [
        ...c.messages,
        { sender, text: `Updated the contract end date to ${val}.`, time: nowLabel() },
      ];
    }
    updateContract(id, patch);
  };

  // T&C Editor Modal handlers
  const openTcEditor = (id: string) => {
    updateContract(id, {
      tcEditorOpen: true,
      tcDraft: contracts[id].tcContent,
    });
  };

  const closeTcEditor = (id: string) => {
    updateContract(id, { tcEditorOpen: false });
  };

  const saveTcEditor = async (id: string) => {
    const c = contracts[id];
    const timeStr = nowLabel();

    if (isSupplier && supplierTcFile && onUploadSupplierTerms) {
      setUploadingSupplierTc(true);
      setSupplierTcStatusMsg(null);
      try {
        const fileBytes = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.includes(",") ? result.split(",")[1] : result;
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(supplierTcFile);
        });

        const rfqId = rfq?.rfqId || rfq?.id || (rfq as any)?._id || id;
        const { entityId, entityType } = await getSupplierEntityType();
        const docAsset = {
          entityId,
          entityType,
          assetType: "SUPPLIER_TERMS_CONDITION",
          fileName: supplierTcFile.name,
          isSingletonAsset: false,
          fileBytes: fileBytes,
        };

        const res = await onUploadSupplierTerms({
          rfqId: rfqId,
          termsAndCondition: includeSupplierTc,
          documents: [docAsset],
        });

        if (res && "statusCode" in res && res.statusCode >= 400) {
          setSupplierTcStatusMsg(res.message || "Failed to upload terms document.");
          setUploadingSupplierTc(false);
          return;
        }

        setSupplierTcStatusMsg("Success! Supplier terms uploaded.");
      } catch (err: any) {
        setSupplierTcStatusMsg(err?.message || "Failed to upload document.");
        setUploadingSupplierTc(false);
        return;
      } finally {
        setUploadingSupplierTc(false);
      }
    }

    const patch: Partial<ContractState> = {
      tcContent: c.tcDraft,
      tcEdited: true,
      tcLastUpdatedAt: timeStr,
      tcEditorOpen: false,
    };
    if (c.sent) {
      const sender = isSupplier ? "Supplier" : "Buyer";
      patch.messages = [
        ...c.messages,
        {
          sender,
          text: supplierTcFile
            ? `Supplier uploaded custom Terms & Conditions document (${supplierTcFile.name}).`
            : `${sender} updated the Terms & Conditions proposed edits.`,
          time: timeStr,
        },
      ];
    }
    updateContract(id, patch);
  };



  // Negotiation Actions
  const handleBuyerAcceptFinal = async (id: string) => {
    const targetRfqId = rfq?.rfqId || rfq?.id || (rfq as any)?._id || id;
    if (onAcceptSupplierTerms && targetRfqId) {
      try {
        await onAcceptSupplierTerms(targetRfqId, "ACCEPTED");
        await refreshTermsConditions();
      } catch (err) {
        console.error("Failed to update supplier terms & conditions status:", err);
      }
    }
    updateContract(id, { buyerFinalAccepted: true });
  };

  const handleSupplierAcceptFinal = async (id: string) => {
    const rfqId = rfq?.rfqId || rfq?.id || (rfq as any)?._id || id;
    setUploadingSupplierTc(true);
    setSupplierTcStatusMsg(null);
    try {
      if (onAcceptBuyerTerms && rfqId) {
        const res = await onAcceptBuyerTerms(rfqId, "APPROVE");
        if (res && "statusCode" in res && res.statusCode >= 400) {
          setSupplierTcStatusMsg(res.message || "Failed to accept buyer terms & conditions.");
          setUploadingSupplierTc(false);
          return;
        }
      }
      setSupplierTcStatusMsg("Success! Buyer terms & conditions accepted.");
      await refreshTermsConditions();
      updateContract(id, { supplierFinalAccepted: true, supplierFinalRejected: false });
    } catch (err: any) {
      console.error("Failed to accept buyer terms & conditions:", err);
      setSupplierTcStatusMsg(err?.message || "Failed to accept terms.");
    } finally {
      setUploadingSupplierTc(false);
    }
  };

  const handleSupplierRejectFinal = async (id: string) => {
    const rfqId = rfq?.rfqId || rfq?.id || (rfq as any)?._id || id;
    setUploadingSupplierTc(true);
    setSupplierTcStatusMsg(null);
    try {
      if (onAcceptBuyerTerms && rfqId) {
        const res = await onAcceptBuyerTerms(rfqId, "REJECT");
        if (res && "statusCode" in res && res.statusCode >= 400) {
          setSupplierTcStatusMsg(res.message || "Failed to reject buyer terms & conditions.");
          setUploadingSupplierTc(false);
          return;
        }
      }
      setSupplierTcStatusMsg("Buyer terms & conditions rejected. You can upload custom terms & conditions below.");
      setHasSupplierTcChoice("yes");
      await refreshTermsConditions();
      updateContract(id, { supplierFinalAccepted: false, supplierFinalRejected: true });
    } catch (err: any) {
      console.error("Failed to reject buyer terms & conditions:", err);
      setSupplierTcStatusMsg(err?.message || "Failed to reject terms.");
    } finally {
      setUploadingSupplierTc(false);
    }
  };

  const handleProceedToSigning = (id: string) => {
    updateContract(id, { step: "sign" });
  };

  // Signing Actions
  const openESignModal = (id: string) => {
    setESignModalContractId(id);
    setDrawnSignatureData(null);
    setSignerNameInput(
      isSupplier
        ? supplierName || getSupplierName(id) || "Supplier Representative"
        : "ABCDEFGH"
    );
    setSignerDesignationInput(
      isSupplier ? "Authorized Representative" : "Procurement Manager"
    );
  };

  const confirmApplyESign = async (id: string) => {
    const c = contracts[id];
    if (!c) return;
    const timeStr = nowLabel();

    if (isSupplier) {
      const isBuyerSigned = c.buyerSigned;
      const signDetails: SignDetails = {
        signerName: signerNameInput.trim() || supplierName || getSupplierName(c.supplierId),
        signerDesignation: signerDesignationInput.trim() || "Authorized Representative",
        signedAt: timeStr,
        method: "e-sign",
        drawnSignatureUrl: drawnSignatureData || undefined,
      };
      const msg = {
        sender: "Supplier",
        text: `Supplier E-Signature applied by ${signDetails.signerName} (${signDetails.signerDesignation}).`,
        time: timeStr,
      };
      updateContract(id, {
        supplierSigned: true,
        supplierSignDetails: signDetails,
        messages: [...c.messages, msg],
        step: isBuyerSigned ? "completed" : "sign",
      });

      if (onUploadSupplierEsign) {
        const targetRfqId = rfq?.rfqId || rfq?.id || activeContractId || id;
        const rawBytes = drawnSignatureData
          ? (drawnSignatureData.includes(",") ? drawnSignatureData.split(",")[1] : drawnSignatureData)
          : "";
        const nameSlug = (signerNameInput.trim() || supplierName || "supplier").toLowerCase().replace(/\s+/g, "_");
        try {
          const { entityId, entityType } = await getSupplierEntityType();
          const payload = {
            entityId,
            entityType,
            assetType: "ESIGN",
            fileName: `${nameSlug}_signature.png`,
            isSingletonAsset: false,
            fileBytes: rawBytes,
          };
          await onUploadSupplierEsign(targetRfqId, payload);
          await refreshESigns();
        } catch (err) {
          console.error("Failed to upload supplier esign:", err);
        }
      }
    } else {
      const isSupplierSigned = c.supplierSigned;
      const signDetails: SignDetails = {
        signerName: signerNameInput.trim() || "ABCDEFGH",
        signerDesignation: signerDesignationInput.trim() || "Procurement Manager",
        signedAt: timeStr,
        method: "e-sign",
        drawnSignatureUrl: drawnSignatureData || undefined,
      };
      const msg = {
        sender: "Buyer",
        text: `Applied E-Signature by ${signDetails.signerName} (${signDetails.signerDesignation}).`,
        time: timeStr,
      };
      updateContract(id, {
        buyerSigned: true,
        buyerSignDetails: signDetails,
        messages: [...c.messages, msg],
        step: isSupplierSigned ? "completed" : "sign",
      });

      if (onUploadBuyerEsign) {
        const targetRfqId = rfq?.rfqId || rfq?.id || activeContractId || id;
        const rawBytes = drawnSignatureData
          ? (drawnSignatureData.includes(",") ? drawnSignatureData.split(",")[1] : drawnSignatureData)
          : "";
        const nameSlug = (signerNameInput.trim() || "buyer").toLowerCase().replace(/\s+/g, "_");
        const payload = {
          entityType: "BuyerEsign",
          entityId: targetRfqId,
          assetType: "BuyerEsign",
          fileBytes: rawBytes,
          fileName: `${nameSlug}_signature.png`,
          contentType: "image/png",
          isSingletonAsset: true,
          id: targetRfqId,
        };
        try {
          await onUploadBuyerEsign(targetRfqId, payload);
          await refreshESigns();
        } catch (err) {
          console.error("Failed to upload buyer esign:", err);
        }
      }
    }
    setESignModalContractId(null);
  };

  const handleUploadSignedContract = (id: string, fileName?: string, fileObj?: File) => {
    const c = contracts[id];
    if (!c) return;
    const timeStr = nowLabel();

    if (isSupplier) {
      const isBuyerSigned = c.buyerSigned;
      const signDetails: SignDetails = {
        signerName: signerNameInput.trim() || supplierName || getSupplierName(c.supplierId),
        signerDesignation: signerDesignationInput.trim() || "Authorized Representative",
        signedAt: timeStr,
        method: "upload",
        fileName: fileName || "Signed_Contract_Supplier.pdf",
      };
      const msg = {
        sender: "Supplier",
        text: `Uploaded signed contract (${signDetails.fileName}).`,
        time: timeStr,
      };
      updateContract(id, {
        supplierSigned: true,
        supplierSignDetails: signDetails,
        messages: [...c.messages, msg],
        step: isBuyerSigned ? "completed" : "sign",
      });

      if (onUploadSupplierEsign && fileObj) {
        const targetRfqId = rfq?.rfqId || rfq?.id || activeContractId || id;
        const reader = new FileReader();
        reader.onload = async () => {
          const result = reader.result as string;
          const fileBytes = result.includes(",") ? result.split(",")[1] : result;
          try {
            const { entityId, entityType } = await getSupplierEntityType();
            const payload = {
              entityId,
              entityType,
              assetType: "ESIGN",
              fileName: fileObj.name || "Signed_Contract_Supplier.pdf",
              isSingletonAsset: false,
              fileBytes: fileBytes,
            };
            await onUploadSupplierEsign(targetRfqId, payload);
            await refreshESigns();
          } catch (err) {
            console.error("Failed to upload supplier esign file:", err);
          }
        };
        reader.readAsDataURL(fileObj);
      }
    } else {
      const isSupplierSigned = c.supplierSigned;
      const signDetails: SignDetails = {
        signerName: signerNameInput.trim() || "ABCDEFGH",
        signerDesignation: signerDesignationInput.trim() || "Procurement Manager",
        signedAt: timeStr,
        method: "upload",
        fileName: fileName || "Signed_Contract_Buyer.pdf",
      };
      const msg = {
        sender: "Buyer",
        text: `Uploaded signed contract (${signDetails.fileName}).`,
        time: timeStr,
      };
      updateContract(id, {
        buyerSigned: true,
        buyerSignDetails: signDetails,
        messages: [...c.messages, msg],
        step: isSupplierSigned ? "completed" : "sign",
      });

      if (onUploadBuyerEsign && fileObj) {
        const targetRfqId = rfq?.rfqId || rfq?.id || activeContractId || id;
        const reader = new FileReader();
        reader.onload = async () => {
          const result = reader.result as string;
          const fileBytes = result.includes(",") ? result.split(",")[1] : result;
          const payload = {
            entityType: "BuyerEsign",
            entityId: targetRfqId,
            assetType: "BuyerEsign",
            fileBytes: fileBytes,
            fileName: fileObj.name || "Signed_Contract_Buyer.pdf",
            contentType: fileObj.type || "application/pdf",
            isSingletonAsset: true,
            id: targetRfqId,
          };
          try {
            await onUploadBuyerEsign(targetRfqId, payload);
            await refreshESigns();
          } catch (err) {
            console.error("Failed to upload buyer esign file:", err);
          }
        };
        reader.readAsDataURL(fileObj);
      }
    }
  };


  // Chat messaging
  const handleSendChatMessage = (id: string) => {
    const c = contracts[id];
    if (!c || !c.draftMessage.trim()) return;
    const currentSender = isSupplier ? "Supplier" : "Buyer";
    const msg = { sender: currentSender, text: c.draftMessage.trim(), time: nowLabel() };
    updateContract(id, {
      messages: [...c.messages, msg],
      draftMessage: "",
    });
  };

  const sentContractIds = awardedSupplierIds.filter((id) => contracts[id]?.sent);
  const activeChatSupplierId = chatViewSupplierId || sentContractIds[0] || activeContractId;
  const activeChatContract = contracts[activeChatSupplierId];

  const stepOrderLabels = ["Details", "Terms", "Sign", "Completed"];
  const activeStepIdx = activeContract
    ? ["details", "terms", "sign", "completed"].indexOf(activeContract.step)
    : 0;

  // Active contract line items table rows calculation
  const activeLineItemRows = useMemo(() => {
    if (!activeContract) return [];
    const itemIdsToDisplay = (supplierItemsMap[activeContract.supplierId] && supplierItemsMap[activeContract.supplierId].length > 0)
      ? supplierItemsMap[activeContract.supplierId]
      : activeContract.itemIds;

    const suppQuotation =
      effectiveQuotations.find(
        (q: any) => (q.quotationId === activeContract.supplierId || q.supplierId === activeContract.supplierId || q._id === activeContract.supplierId)
      ) || effectiveQuotations[0];

    const isLot = Boolean(rfq?.addLotOption);

    return itemIdsToDisplay.map((itemId, idx) => {
      const item = lineItems.find(
        (x: any) => (x.id || x.itemId || x._id) === itemId
      ) || { description: "—", costCenter: "—", qty: 1, uom: "PCS" };

      const qi = suppQuotation ? resolveQuoteItem(suppQuotation, item) : null;
      const qty = item.quantity || item.qty || 1;

      if (qi) {
        const unitPrice = qi.quotedAmount ?? qi.quotedPrice ?? 0;
        const discount = qi.discount ?? (qi as any)?.discountPercentage ?? 0;
        const tax = qi.tax ?? (qi as any)?.taxPercentage ?? (qi as any)?.gst ?? 0;
        const delivery = qi.deliveryCharge ?? (qi as any)?.deliveryAmount ?? 0;

        const discAmt = discount > 0 ? Math.round((unitPrice * qty) * (discount / 100)) : 0;
        const taxAmt = tax > 0 ? Math.round((unitPrice * qty - discAmt) * (tax / 100)) : 0;
        const subtotal = qi.subTotal ?? (unitPrice * qty - discAmt + taxAmt + delivery);

        const parts = [];
        if (tax > 0) parts.push(fmtINR(taxAmt));
        if (discount > 0) parts.push(`-${fmtINR(discAmt)}`);
        if (delivery > 0) parts.push(fmtINR(delivery));
        const breakdownStr = parts.length > 0 ? parts.join(" / ") : "—";

        const cc = item.costCenter || item.costCenterCode || "—";
        const code = item.materialCode || item.code || "—";
        const ccCode = cc !== "—" && code !== "—" ? `${cc} / ${code}` : cc !== "—" ? cc : code;

        return {
          idx: idx + 1,
          material: item.description || item.name || "—",
          costCenterCode: ccCode,
          qty,
          uom: item.uom || item.unit || "PCS",
          unitPrice,
          breakdownStr,
          subtotal,
        };
      } else if (isLot && suppQuotation) {
        const tot = suppQuotation.totalPrice || 0;
        const itemShare = itemIdsToDisplay.length > 0 ? tot / itemIdsToDisplay.length : tot;
        const cc = item.costCenter || item.costCenterCode || "—";
        const code = item.materialCode || item.code || "—";
        const ccCode = cc !== "—" && code !== "—" ? `${cc} / ${code}` : cc !== "—" ? cc : code;

        return {
          idx: idx + 1,
          material: item.description || item.name || "—",
          costCenterCode: ccCode,
          qty,
          uom: item.uom || item.unit || "PCS",
          unitPrice: Math.round(itemShare / qty),
          breakdownStr: "Lump Sum (Lot)",
          subtotal: Math.round(itemShare),
        };
      } else {
        const cc = item.costCenter || item.costCenterCode || "—";
        const code = item.materialCode || item.code || "—";
        const ccCode = cc !== "—" && code !== "—" ? `${cc} / ${code}` : cc !== "—" ? cc : code;

        return {
          idx: idx + 1,
          material: item.description || item.name || "—",
          costCenterCode: ccCode,
          qty,
          uom: item.uom || item.unit || "PCS",
          unitPrice: 0,
          breakdownStr: "—",
          subtotal: 0,
        };
      }
    });
  }, [activeContract, lineItems, effectiveQuotations, getQuoteItemForRfqItem, resolveQuoteItem, rfq]);

  return (
    <div className="bca-contract-workspace">
      {/* Top Back Navigation */}
      <button
        type="button"
        onClick={onBack}
        className="contract-back-btn"
      >
        ← {isSupplier ? "Back to Quotation Summary" : "Back to Bid Comparison & Award"}
      </button>

      {/* Header and Step Chips */}
      <div className="contract-header">
        <div>
          <h1 className="contract-title">
            {isSupplier ? "Contract Review & Execution" : "Contract Creation"}
          </h1>
          <div className="contract-inline-group">
            {stepOrderLabels.map((label, i) => {
              const isActive = i === activeStepIdx;
              const isPast = i < activeStepIdx;
              return (
                <span
                  key={label}
                  className={`contract-step-chip${isActive ? " contract-step-chip--active" : isPast ? " contract-step-chip--past" : ""}`}
                >
                  {label} {isPast && "✓"}
                </span>
              );
            })}
          </div>
        </div>
      </div>



      {/* Supplier Tabs */}
      {!isSupplier && awardedSupplierIds.length > 1 && (
        <div className="contract-supplier-tabs">
          {awardedSupplierIds.map((sid) => {
            const c = contracts[sid];
            const name = getSupplierName(sid);
            const val = getContractValue(sid);
            const isSelected = sid === activeContractId;
            let statusText = "Details";
            if (c?.step === "completed") statusText = "Completed ✓";
            else if (c?.step === "sign") statusText = "Awaiting Signature";
            else if (c?.step === "terms" && c.sent) statusText = "Awaiting Supplier Review";

            return (
              <div key={sid} className="contract-inline-group">
                <button
                  type="button"
                  onClick={() => setActiveContractId(sid)}
                  className={`contract-supplier-tab${isSelected ? " contract-supplier-tab--selected" : ""}`}
                >
                  {name} — {fmtINR(val)}
                  <br />
                  <span className="contract-supplier-tab-status">
                    {statusText}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Main Contract Details Workspace Card */}
      {activeContract && (
        <div className="contract-workspace-card">
          <div className="contract-workspace-title">
            Contract Details {`— ${getSupplierName(activeContract.supplierId)}`}
          </div>

          {/* Details Row Grid */}
          <div className="contract-details-grid">
            <div>
              <div className="contract-field-label">
                RFQ TITLE
              </div>
              <div className="contract-field-value">
                {rfq?.title || rfq?.rfqNo || rfq?.name || "Office IT Equipment Procurement"}
              </div>
            </div>

            <div>
              <div className="contract-field-label">
                RFQ DESCRIPTION
              </div>
              <div className="contract-field-text">
                {rfq?.description || "Procurement of laptops and accessories for the new office."}
              </div>
            </div>

            <div>
              <div className="contract-field-label">
                SUPPLIER
              </div>
              <div className="contract-field-value">
                {getSupplierName(activeContract.supplierId)}
              </div>
            </div>

            <div>
              <div className="contract-field-label">
                CONTRACT START DATE
              </div>
              <input
                type="date"
                value={activeContract.startDate}
                onChange={(e) => handleStartDateChange(activeContract.supplierId, e.target.value)}
                disabled={activeContract.buyerSigned && activeContract.supplierSigned}
                className="contract-date-input"
              />
            </div>

            <div>
              <div className="contract-field-label">
                CONTRACT END DATE
              </div>
              <input
                type="date"
                value={activeContract.endDate}
                onChange={(e) => handleEndDateChange(activeContract.supplierId, e.target.value)}
                disabled={activeContract.buyerSigned && activeContract.supplierSigned}
                className="contract-date-input"
              />
              {activeContract.dateError && (
                <div className="contract-field-error">
                  End date cannot be earlier than start date.
                </div>
              )}
            </div>
          </div>

          {/* Selected Line Items Section */}
          <h4 className="contract-section-title">
            Selected Line Items
          </h4>

          <div className="contract-table-wrap">
            <table className="contract-table">
              <thead>
                <tr className="contract-table-head-row">
                  <th className="contract-th contract-th--index">#</th>
                  <th className="contract-th">Material</th>
                  <th className="contract-th">Cost Center / Code</th>
                  <th className="contract-th contract-th--center">Qty</th>
                  <th className="contract-th contract-th--center">UOM</th>
                  <th className="contract-th contract-th--right">Unit Price</th>
                  <th className="contract-th contract-th--right">Tax / Disc. / Del.</th>
                  <th className="contract-th contract-th--right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {activeLineItemRows.map((row) => (
                  <tr key={row.idx} className="contract-table-row">
                    <td className="contract-td contract-td--muted">{row.idx}</td>
                    <td className="contract-td contract-td--strong">{row.material}</td>
                    <td className="contract-td contract-td--secondary">{row.costCenterCode}</td>
                    <td className="contract-td contract-td--center">{row.qty}</td>
                    <td className="contract-td contract-td--center">{row.uom}</td>
                    <td className="contract-td contract-td--right contract-td--strong">
                      {fmtINR(row.unitPrice)}
                    </td>
                    <td className="contract-td contract-td--right contract-td--breakdown">
                      {row.breakdownStr}
                    </td>
                    <td className="contract-td contract-td--right contract-td--total">
                      {fmtINR(row.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="contract-total-row">
            <div className="contract-total-box">
              Total Contract Value:{" "}
              <span className="contract-total-value">
                {fmtINR(getContractValue(activeContractId))}
              </span>
            </div>
          </div>

          {/* Terms & Conditions Attachment Card */}
          <div className="contract-subsection-title">
            Terms &amp; Conditions
          </div>
          <div className="contract-tc-card">
            <div>
              <div className="contract-tc-name">
                Contract Terms &amp; Conditions
              </div>
              {buyerTermsDocs.length > 0 ? renderTermsDocs(buyerTermsDocs) : (
                <div className="contract-tc-file">
                  Terms_and_Conditions.pdf
                </div>
              )}
              <div className="contract-tc-meta">
                <span
                  className={`contract-tc-updated${activeContract.tcEdited ? " contract-tc-updated--edited" : ""}`}
                >
                  {activeContract.tcEdited
                    ? `Last Updated: ${activeContract.tcLastUpdatedAt}`
                    : "Fetched from RFQ"}
                </span>
              </div>
              {showBuyerTermsDecision && supplierTcStatusMsg && (
                <div className={supplierTcStatusMsgClass}>
                  {supplierTcStatusMsg}
                </div>
              )}
            </div>

            <div className="contract-actions">
              {buyerTermsDocs.length === 0 && (
                <button
                  type="button"
                  onClick={() => alert(activeContract.tcContent)}
                  className="contract-btn contract-btn--outline contract-btn--md"
                >
                  Preview
                </button>
              )}
              <button
                type="button"
                onClick={() => openTcEditor(activeContractId)}
                disabled={
                  (isSupplier ? activeContract.supplierFinalAccepted : activeContract.buyerFinalAccepted) ||
                  (activeContract.buyerSigned && activeContract.supplierSigned)
                }
                className="contract-btn contract-btn--outline contract-btn--md"
              >
                Proposed Edits
              </button>
              {showBuyerTermsDecision && (
                <>
                  {!activeContract.supplierFinalRejected && (
                    <button
                      type="button"
                      onClick={() => handleSupplierAcceptFinal(activeContractId)}
                      disabled={uploadingSupplierTc || activeContract.supplierFinalAccepted}
                      className={`contract-btn contract-btn--md ${activeContract.supplierFinalAccepted ? "contract-btn--accepted" : "contract-btn--accept"}`}
                    >
                      {uploadingSupplierTc && !activeContract.supplierFinalAccepted
                        ? "Submitting..."
                        : activeContract.supplierFinalAccepted
                          ? "✓ Supplier Accepted"
                          : "Accept"}
                    </button>
                  )}
                  {!activeContract.supplierFinalAccepted && (
                    <button
                      type="button"
                      onClick={() => handleSupplierRejectFinal(activeContractId)}
                      disabled={uploadingSupplierTc || activeContract.supplierFinalRejected}
                      className={`contract-btn contract-btn--md ${activeContract.supplierFinalRejected ? "contract-btn--rejected" : "contract-btn--danger"}`}
                    >
                      {uploadingSupplierTc && !activeContract.supplierFinalRejected
                        ? "Submitting..."
                        : activeContract.supplierFinalRejected
                          ? "✕ Supplier Rejected"
                          : "Reject"}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Supplier's own Terms & Conditions documents, from the supplier's rfq-by-id */}
          {supplierTcDocsToShow.length > 0 && (
            <div className="contract-tc-card">
              <div>
                <div className="contract-tc-name">
                  Supplier Terms &amp; Conditions
                </div>
                {renderTermsDocs(supplierTcDocsToShow)}
              </div>
            </div>
          )}

          {/* Edit Terms Modal Overlay */}
          {activeContract.tcEditorOpen && (
            <div className="contract-modal-overlay">
              <div className="contract-modal contract-modal--terms">
                <div className="contract-modal-title">
                  {isSupplier ? "Propose Edits & Upload Supplier Terms" : "Edit Terms & Conditions"}
                </div>
                <div className="contract-modal-subtitle">
                  Terms_and_Conditions.pdf
                </div>
                <textarea
                  rows={6}
                  value={activeContract.tcDraft}
                  onChange={(e) => updateContract(activeContractId, { tcDraft: e.target.value })}
                  className="contract-tc-textarea"
                />
                {isSupplier && (
                  <div className="contract-dashed-box contract-dashed-box--modal">
                    <label className="contract-check-label">
                      <input
                        type="checkbox"
                        checked={includeSupplierTc}
                        onChange={(e) => setIncludeSupplierTc(e.target.checked)}
                      />
                      Include Supplier Terms &amp; Conditions Document
                    </label>
                    <div className="contract-help-text">
                      Attach your company's custom terms and conditions document (PDF/DOCX) for buyer review.
                    </div>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setSupplierTcFile(e.target.files[0]);
                          setSupplierTcStatusMsg(null);
                        }
                      }}
                      className="contract-file-input"
                    />
                    {supplierTcFile && (
                      <div className="contract-selected-file">
                        📄 Selected file: {supplierTcFile.name} ({(supplierTcFile.size / 1024).toFixed(1)} KB)
                      </div>
                    )}
                    {supplierTcStatusMsg && (
                      <div className={supplierTcStatusMsgClass}>
                        {supplierTcStatusMsg}
                      </div>
                    )}
                  </div>
                )}
                <div className="contract-modal-actions">
                  <button
                    type="button"
                    onClick={() => closeTcEditor(activeContractId)}
                    className="contract-btn contract-btn--outline contract-btn--modal"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => saveTcEditor(activeContractId)}
                    className="contract-btn contract-btn--primary contract-btn--modal"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Action Step: Terms Negotiation & Acceptance */}
          {showTermsAcceptanceCard && (
            <div className="contract-step-card">
              <div className="contract-subsection-title contract-subsection-title--tight">
                Contract Terms Review &amp; Acceptance
              </div>
              <div className="contract-step-card-toolbar">
                <div className="contract-btn-group">
                  <button
                    type="button"
                    onClick={() => alert("Previewing Contract Terms...")}
                    className="contract-btn contract-btn--outline contract-btn--sm"
                  >
                    Preview
                  </button>
                </div>
              </div>

              {/* Real Terms & Conditions status/attachments for this supplier, from the RFQ e-sign API */}
              {activeTcEntry?.termsAndCondition === true && (
                <div className="contract-notice--success">
                  ✓ Terms &amp; Conditions accepted by {activeTcEntry.supplierName || getSupplierName(activeContract.supplierId)}.
                </div>
              )}

              {/* Render Uploaded Terms & Conditions Documents */}
              {(() => {
                const apiAttachments = activeTcEntry?.attachments || [];
                const docs = apiAttachments.length > 0 ? apiAttachments : buyerTermsDocs;
                if (!docs || docs.length === 0) return null;
                return (
                  <div className="contract-docs-panel">
                    <div className="contract-panel-heading">
                      📄 Terms &amp; Conditions Documents:
                    </div>
                    <div className="contract-doc-list">
                      {docs.map((doc: any, idx: number) => (
                        <div key={doc.id || idx} className="contract-doc-item">
                          <div className="contract-actions">
                            <span className="contract-doc-icon">📎</span>
                            <div>
                              <div className="contract-doc-name">
                                {doc.fileName || doc.assetName || `Terms_Document_${idx + 1}.pdf`}
                              </div>
                              {(doc.assetType || doc.fileType) && (
                                <div className="contract-doc-type">
                                  {doc.assetType || doc.fileType}
                                </div>
                              )}
                            </div>
                          </div>
                          {doc.id && (
                            <button
                              type="button"
                              onClick={() => handleDownloadAsset(doc.id, doc.fileName || doc.assetName || "Terms_Document.pdf")}
                              className="contract-btn contract-btn--soft contract-btn--xs"
                            >
                              Download
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {activeTcEntry?.termsAndCondition !== true && (
              <div className="contract-chat-hint">
                Use the chat button at bottom right to discuss terms with {isSupplier ? "the buyer" : "the supplier"}.
              </div>
              )}

              {activeTcEntry?.termsAndCondition !== true && (
              <div className="contract-terms-actions">
                {isSupplier ? (
                  <div>
                    {/* Radio Question Prompt */}
                    <div className="contract-panel-heading">
                      Is there any Supplier Terms &amp; Conditions?
                    </div>

                    <div className="contract-radio-group">
                      <label className="contract-radio-label">
                        <input
                          type="radio"
                          name={`hasSupplierTcRadio_${activeContractId}`}
                          value="yes"
                          checked={hasSupplierTcChoice === "yes"}
                          onChange={() => {
                            setHasSupplierTcChoice("yes");
                            setSupplierTcStatusMsg(null);
                          }}
                        />
                        Yes (Upload Supplier Terms &amp; Conditions)
                      </label>
                      <label className="contract-radio-label">
                        <input
                          type="radio"
                          name={`hasSupplierTcRadio_${activeContractId}`}
                          value="no"
                          checked={hasSupplierTcChoice === "no"}
                          onChange={() => {
                            setHasSupplierTcChoice("no");
                            setSupplierTcStatusMsg(null);
                          }}
                        />
                        No (Proceed with Buyer Terms &amp; Conditions)
                      </label>
                    </div>

                    {/* IF NO: No supplier terms - Accept / Reject of the buyer's terms is in the "Contract Terms & Conditions" card above */}
                    {hasSupplierTcChoice === "no" && (
                      <div className="contract-upload-help">
                        Use Accept or Reject in the Contract Terms &amp; Conditions section above to respond to the buyer's terms.
                      </div>
                    )}

                    {/* IF YES: Show File Upload Card - upload sends termsAndCondition=true with the document */}
                    {hasSupplierTcChoice === "yes" && (
                      <div className="contract-dashed-box contract-dashed-box--inline">
                        <div className="contract-upload-title">
                          Upload Supplier Terms &amp; Conditions Document
                        </div>
                        <div className="contract-upload-help">
                          Attach your company's custom terms and conditions document (.pdf, .doc, .docx) to submit to the buyer.
                        </div>
                        <div className="contract-upload-row">
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                setSupplierTcFile(e.target.files[0]);
                                setSupplierTcStatusMsg(null);
                              }
                            }}
                            className="contract-file-input"
                          />
                          <button
                            type="button"
                            onClick={() => handleUploadSupplierTcFileDirect(activeContractId)}
                            disabled={!supplierTcFile || uploadingSupplierTc}
                            className="contract-btn contract-btn--primary contract-btn--lg"
                          >
                            {uploadingSupplierTc ? "Uploading..." : "Upload & Submit Terms"}
                          </button>
                        </div>
                        {supplierTcFile && (
                          <div className="contract-selected-file">
                            📄 Selected file: {supplierTcFile.name} ({(supplierTcFile.size / 1024).toFixed(1)} KB)
                          </div>
                        )}
                        {supplierTcStatusMsg && (
                          <div className={supplierTcStatusMsgClass}>
                            {supplierTcStatusMsg}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleBuyerAcceptFinal(activeContractId)}
                      className={`contract-btn contract-btn--md ${activeContract.buyerFinalAccepted ? "contract-btn--accepted" : "contract-btn--accept"}`}
                    >
                      {activeContract.buyerFinalAccepted ? "✓ Buyer Accepted" : "Accept Terms"}
                    </button>
                  </>
                )}
              </div>
              )}

              {/* Final Terms Acceptance Gate */}
              <div className="contract-accept-summary">
                <span
                  className={`contract-accept-status${activeContract.buyerFinalAccepted ? " contract-accept-status--done" : ""}`}
                >
                  Buyer — {activeContract.buyerFinalAccepted ? "Accepted ✓" : "Awaiting Acceptance"}
                </span>
                <span
                  className={`contract-accept-status${activeContract.supplierFinalAccepted ? " contract-accept-status--done" : activeContract.supplierFinalRejected ? " contract-accept-status--rejected" : ""}`}
                >
                  Supplier — {activeContract.supplierFinalAccepted ? "Accepted ✓" : activeContract.supplierFinalRejected ? "Rejected ✕" : "Awaiting Acceptance"}
                </span>
              </div>

              {activeContract.step === "terms" && (
                <button
                  type="button"
                  onClick={() => handleProceedToSigning(activeContractId)}
                  disabled={!(activeContract.buyerFinalAccepted && activeContract.supplierFinalAccepted)}
                  className="contract-btn contract-btn--primary contract-btn--cta"
                >
                  Proceed to Signing
                </button>
              )}
            </div>
          )}

          {/* Action Step: Signing */}
          {activeContract.step === "sign" && (
            <div className="contract-step-card">
              <div className="contract-subsection-title">
                Contract Signing
              </div>

              {/* Terms & conditions didn't require negotiation for this supplier, so surface the
                  implicit acceptance here since the "Contract Terms Review & Acceptance" card was skipped. */}
              {(isSupplier ? tcDeclined : supplierEsignUploaded) && (
                <div className="contract-implicit-accept">
                  Supplier — Accepted ✓
                </div>
              )}

              {/* Render Uploaded E-Signature Documents */}
              {(() => {
                const apiAttachments = activeEsignEntry?.attachments || [];
                const legacyDocs = (rfq as any)?.eSignDocuments || (rfq as any)?.eSignDocument || [];
                const docs = apiAttachments.length > 0 ? apiAttachments : legacyDocs;
                if (!docs || docs.length === 0) return null;
                return (
                  <div className="contract-docs-panel contract-docs-panel--esign">
                    <div className="contract-panel-heading contract-panel-heading--esign">
                      ✍️ Uploaded E-Signature Documents:
                    </div>
                    <div className="contract-doc-list">
                      {docs.map((doc: any, idx: number) => (
                        <div key={doc.id || idx} className="contract-doc-item contract-doc-item--esign">
                          <div className="contract-actions">
                            <span className="contract-doc-icon">🖋️</span>
                            <div>
                              <div className="contract-doc-name">
                                {doc.fileName || doc.assetName || `E_Sign_Document_${idx + 1}.png`}
                              </div>
                              {(doc.assetType || doc.fileType) && (
                                <div className="contract-doc-type contract-doc-type--esign">
                                  {doc.assetType || doc.fileType}
                                </div>
                              )}
                            </div>
                          </div>
                          {doc.id && (
                            <button
                              type="button"
                              onClick={() => handleDownloadAsset(doc.id, doc.fileName || doc.assetName || "E_Sign_Document.png")}
                              className="contract-btn contract-btn--primary contract-btn--xs"
                            >
                              View / Download
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Hidden File Input for Upload Signed Contract */}
              <input
                type="file"
                id="signed-contract-upload-input"
                className="contract-hidden-input"
                accept=".pdf,.png,.jpg,.doc,.docx"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleUploadSignedContract(activeContractId, file.name, file);
                  }
                }}
              />

              <div className="contract-sign-status-row">
                <div>
                  <div className="contract-sign-label">
                    Buyer Signature
                  </div>
                  <div className={`contract-sign-status${activeContract.buyerSigned ? " contract-sign-status--done" : ""}`}>
                    {activeContract.buyerSigned ? "Signed ✓" : "Awaiting Signature"}
                  </div>
                  {activeContract.buyerSigned && activeContract.buyerSignDetails && (
                    <div className="contract-sign-by">
                      By {activeContract.buyerSignDetails.signerName} ({activeContract.buyerSignDetails.signerDesignation})
                    </div>
                  )}
                </div>

                <div>
                  <div className="contract-sign-label">
                    Supplier Signature
                  </div>
                  <div className={`contract-sign-status${activeContract.supplierSigned ? " contract-sign-status--done" : ""}`}>
                    {activeContract.supplierSigned ? "Signed ✓" : "Awaiting Signature"}
                  </div>
                  {activeContract.supplierSigned && activeContract.supplierSignDetails && (
                    <div className="contract-sign-by">
                      By {activeContract.supplierSignDetails.signerName} ({activeContract.supplierSignDetails.signerDesignation})
                    </div>
                  )}
                </div>
              </div>

              {/* Buyer Signed Badge & Signature Box */}
              {activeContract.buyerSigned && activeContract.buyerSignDetails && (
                <div className="contract-signature-box contract-signature-box--buyer">
                  <div className="contract-signature-header">
                    <span className="contract-signature-title contract-signature-title--buyer">
                      Buyer E-Signature Verified ✓
                    </span>
                    <span className="contract-signature-time">
                      {activeContract.buyerSignDetails.signedAt}
                    </span>
                  </div>
                  {activeContract.buyerSignDetails.drawnSignatureUrl ? (
                    <div className="contract-signature-image-wrap">
                      <img
                        src={activeContract.buyerSignDetails.drawnSignatureUrl}
                        alt="Handwritten Signature"
                        className="contract-signature-image"
                      />
                    </div>
                  ) : (
                    <div className="contract-signature-text contract-signature-text--buyer">
                      /s/ {activeContract.buyerSignDetails.signerName}
                    </div>
                  )}
                  <div className="contract-signature-caption">
                    {activeContract.buyerSignDetails.signerName} ({activeContract.buyerSignDetails.signerDesignation}) • SILA Procurement
                  </div>
                </div>
              )}

              {/* Supplier Signed Badge & Signature Box */}
              {activeContract.supplierSigned && activeContract.supplierSignDetails && (
                <div className="contract-signature-box contract-signature-box--supplier">
                  <div className="contract-signature-header">
                    <span className="contract-signature-title contract-signature-title--supplier">
                      Supplier E-Signature Verified ✓
                    </span>
                    <span className="contract-signature-time">
                      {activeContract.supplierSignDetails.signedAt}
                    </span>
                  </div>
                  {activeContract.supplierSignDetails.drawnSignatureUrl ? (
                    <div className="contract-signature-image-wrap">
                      <img
                        src={activeContract.supplierSignDetails.drawnSignatureUrl}
                        alt="Handwritten Signature"
                        className="contract-signature-image"
                      />
                    </div>
                  ) : (
                    <div className="contract-signature-text contract-signature-text--supplier">
                      /s/ {activeContract.supplierSignDetails.signerName}
                    </div>
                  )}
                  <div className="contract-signature-caption">
                    {activeContract.supplierSignDetails.signerName} ({activeContract.supplierSignDetails.signerDesignation}) • {getSupplierName(activeContract.supplierId)}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="contract-btn-group contract-btn-group--wrap">
                {isSupplier ? (
                  <>
                    <Button
                      variant={activeContract.supplierSigned ? "success" : "primary"}
                      size="sm"
                      onClick={() => openESignModal(activeContractId)}
                      disabled={activeContract.supplierSigned}
                    >
                      {activeContract.supplierSigned ? "✓ Supplier Signed" : "E-Sign Contract"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const input = document.getElementById("signed-contract-upload-input");
                        if (input) input.click();
                      }}
                      disabled={activeContract.supplierSigned}
                    >
                      Upload Signed Contract
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant={activeContract.buyerSigned ? "success" : "primary"}
                      size="sm"
                      onClick={() => openESignModal(activeContractId)}
                      disabled={activeContract.buyerSigned}
                    >
                      {activeContract.buyerSigned ? "✓ Buyer Signed" : "E-Sign Contract"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const input = document.getElementById("signed-contract-upload-input");
                        if (input) input.click();
                      }}
                      disabled={activeContract.buyerSigned}
                    >
                      Upload Signed Contract
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Action Step: Completed */}
          {activeContract.step === "completed" && (
            <div className="contract-completed-card">
              <div className="contract-completed-title">
                Contract Executed Successfully
              </div>
              <div className="contract-completed-summary">
                <div>
                  <div className="contract-completed-label">Contract Number</div>
                  <div className="contract-completed-value">{activeContract.contractNumber}</div>
                </div>
                <div>
                  <div className="contract-completed-label">Supplier</div>
                  <div className="contract-completed-value">{getSupplierName(activeContract.supplierId)}</div>
                </div>
                <div>
                  <div className="contract-completed-label">Contract Value</div>
                  <div className="contract-completed-value">{fmtINR(getContractValue(activeContractId))}</div>
                </div>
                <div>
                  <div className="contract-completed-label">Start Date</div>
                  <div className="contract-completed-value">{activeContract.startDate}</div>
                </div>
                <div>
                  <div className="contract-completed-label">End Date</div>
                  <div className="contract-completed-value">{activeContract.endDate}</div>
                </div>
              </div>
              <div className="contract-completed-actions">
                <button
                  type="button"
                  onClick={() => alert(`Contract ${activeContract.contractNumber} Details:\nSupplier: ${getSupplierName(activeContract.supplierId)}\nValue: ${fmtINR(getContractValue(activeContractId))}`)}
                  className="contract-btn contract-btn--success-outline contract-btn--xl"
                >
                  View Contract
                </button>
                <button
                  type="button"
                  onClick={() => alert(`Downloading final executed contract ${activeContract.contractNumber}.pdf...`)}
                  className="contract-btn contract-btn--success contract-btn--xl"
                >
                  Download Contract
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating Chat Drawer Trigger Button */}
      {sentContractIds.length > 0 && !chatOpen && (
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          className="contract-chat-fab"
        >
          <span>💬 {isSupplier ? "Buyer Chat" : "Supplier Chats"}</span>
          {activeChatContract?.messages.length ? (
            <span className="contract-chat-badge">
              {activeChatContract.messages.length}
            </span>
          ) : null}
        </button>
      )}

      {/* Supplier / Buyer Chat Sidebar Drawer */}
      {chatOpen && (
        <>
          <div
            onClick={() => setChatOpen(false)}
            className="contract-chat-backdrop"
          />
          <div className="contract-chat-drawer">
            <div className="contract-chat-header">
              <div className="contract-chat-title">
                {isSupplier ? "Buyer Chat" : "Supplier Chats"}
              </div>
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                className="contract-chat-close"
              >
                ×
              </button>
            </div>
            <div className="contract-chat-body">
              {/* Supplier Thread List (Buyer View) */}
              {!isSupplier && (
                <div className="contract-chat-threads">
                  {sentContractIds.map((sid) => {
                    const c = contracts[sid];
                    const suppName = getSupplierName(sid);
                    const isSel = sid === activeChatSupplierId;
                    return (
                      <div
                        key={sid}
                        onClick={() => setChatViewSupplierId(sid)}
                        className={`contract-chat-thread${isSel ? " contract-chat-thread--selected" : ""}`}
                      >
                        <div className="contract-chat-thread-name">
                          {suppName}
                        </div>
                        <div className="contract-caption">
                          {c?.contractNumber || sid}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Chat Conversation Pane */}
              <div className="contract-chat-pane">
                <div className="contract-chat-pane-header">
                  Chatting with {isSupplier ? "Buyer (Procurement Team)" : getSupplierName(activeChatSupplierId)}
                </div>
                <div className="contract-chat-messages">
                  {activeChatContract?.messages.map((m: any, idx: number) => {
                    const isSelf = m.sender === (isSupplier ? "Supplier" : "Buyer");
                    return (
                      <div
                        key={idx}
                        className={`contract-chat-bubble${isSelf ? " contract-chat-bubble--self" : ""}`}
                      >
                        <div className="contract-chat-sender">
                          {m.sender}
                        </div>
                        <div className="contract-chat-text">{m.text}</div>
                        <div className="contract-chat-time">
                          {m.time}
                        </div>
                      </div>
                    );
                  })}
                  {(!activeChatContract || activeChatContract.messages.length === 0) && (
                    <div className="contract-chat-empty">
                      No messages yet. Start the conversation.
                    </div>
                  )}
                </div>
                <div className="contract-chat-composer">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={activeChatContract?.draftMessage || ""}
                    onChange={(e) => updateContract(activeChatSupplierId, { draftMessage: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSendChatMessage(activeChatSupplierId);
                    }}
                    className="contract-chat-input"
                  />
                  <button
                    type="button"
                    onClick={() => handleSendChatMessage(activeChatSupplierId)}
                    className="contract-btn contract-btn--primary contract-btn--chat-send"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      {/* E-Sign Modal Overlay */}
      {eSignModalContractId && (
        <div className="contract-modal-overlay contract-modal-overlay--esign">
          <div className="contract-modal contract-modal--esign">
            <div className="contract-modal-title contract-modal-title--dark">
              E-Sign Contract ({isSupplier ? "Supplier" : "Buyer"})
            </div>
            <div className="contract-esign-subtitle">
              Draw your signature in the box below to sign this contract.
            </div>

            {/* Signature Drawing Pad Canvas */}
            <div className="contract-esign-pad">
              <SignaturePad onDraw={setDrawnSignatureData} />
            </div>

            {/* Declaration Checkbox */}
            <label className="contract-declaration">
              <input
                type="checkbox"
                checked={declarationChecked}
                onChange={(e) => setDeclarationChecked(e.target.checked)}
                className="contract-declaration-checkbox"
              />
              <span>I declare that I am authorized to sign this contract on behalf of {isSupplier ? (supplierName || getSupplierName(eSignModalContractId)) : "Buyer"} and agree to all terms and conditions specified herein.</span>
            </label>

            {/* Actions */}
            <div className="contract-modal-actions contract-modal-actions--flush">
              <button
                type="button"
                onClick={() => setESignModalContractId(null)}
                className="contract-btn contract-btn--outline contract-btn--modal"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmApplyESign(eSignModalContractId)}
                disabled={!declarationChecked || !drawnSignatureData}
                className="contract-btn contract-btn--primary contract-btn--cta"
              >
                Confirm &amp; Apply E-Signature
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractCreationView;
