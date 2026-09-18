import React, { useState, useMemo, useEffect } from "react";
import "./BidComparisonAward.css";
import { Button } from "@vosox/shared-ui";
import { fetchBuyerAsset, getBidComparisonData, isBidComparisonError, awardRfq } from "../api/platformApi";
import type { BidComparisonResponseDto } from "../api/platformApi";


const IconMessageSquare = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const IconEye = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconDownload = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const IconFile = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M8 13h8M8 17h8M8 9h2" />
  </svg>
);

const IconClose = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const getInitials = (name: string) =>
  (name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || "")
    .join("") || "?";

const formatQuestionType = (type?: string) => {
  if (!type) return "Text";
  const normalized = String(type).toLowerCase();
  const labels: Record<string, string> = {
    text: "Text",
    textarea: "Long text",
    checkbox: "Checkbox",
    radio: "Single choice",
    select: "Dropdown",
    file: "File",
    number: "Number",
    date: "Date",
  };
  return labels[normalized] || normalized.charAt(0).toUpperCase() + normalized.slice(1);
};


interface BidComparisonAwardViewProps {
  rfq: any;
  rfqId?: string;
  loading: boolean;
  error: string | null;
  freezingBid: boolean;
  onFreeze: () => void;
  onBack: () => void;
  onQsAns: () => void;
  onChatClick: () => void;
}

function fmtINR(val: number) {
  if (!val && val !== 0) return "—";
  return "₹" + val.toLocaleString("en-IN");
}

const BidComparisonAwardView: React.FC<BidComparisonAwardViewProps> = ({
  rfq, rfqId, loading, error, freezingBid, onFreeze, onBack, onChatClick
}) => {
  const [viewMode, setViewMode] = useState<"summary" | "comparison" | "by-supplier" | "bid-history">("summary");
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState("all");
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [autoSelected, setAutoSelected] = useState(false);
  const [expandedSuppliers, setExpandedSuppliers] = useState<Record<string, boolean>>({});
  const [viewingDoc, setViewingDoc] = useState<{ fileName: string; url: string; contentType: string } | null>(null);
  const [loadingDocId, setLoadingDocId] = useState<string | null>(null);

  // Bid History API state
  const [bidHistoryApiData, setBidHistoryApiData] = useState<BidComparisonResponseDto | null>(null);
  const [bidHistoryLoading, setBidHistoryLoading] = useState(false);
  const [bidHistoryError, setBidHistoryError] = useState<string | null>(null);

  const [awardingRfq, setAwardingRfq] = useState(false);
  const [awardSuccess, setAwardSuccess] = useState(false);
  const [awardError, setAwardError] = useState<string | null>(null);

  const questions: any[] = useMemo(() => Array.isArray(rfq?.questions) ? rfq.questions : [], [rfq]);

  const qaSuppliers: any[] = useMemo(() => {
    if (Array.isArray(rfq?.supplierAnswers?.suppliers) && rfq.supplierAnswers.suppliers.length > 0) {
      return rfq.supplierAnswers.suppliers;
    }
    if (Array.isArray(rfq?.supplierQuotation)) {
      return rfq.supplierQuotation;
    }
    return [];
  }, [rfq]);

  const getAnswerForQuestion = (supplier: any, question: any) => {
    const questionId = question?.id ?? question?.rfqQuestionId;
    const answerList = Array.isArray(supplier?.answers) ? supplier.answers : Array.isArray(supplier?.supplierAnswers) ? supplier.supplierAnswers : [];
    return answerList.find((a: any) => a?.rfqQuestionId === questionId || a?.questionId === questionId) || null;
  };

  const handleDocumentAction = async (doc: any, action: 'preview' | 'download') => {
    const assetId = doc.id || doc.assetId;
    if (!assetId) {
      alert("Document asset ID is missing.");
      return;
    }
    try {
      setLoadingDocId(assetId);
      const data: any = await fetchBuyerAsset(assetId);
      if (data && 'statusCode' in data && data.statusCode) {
        throw new Error(data.message || 'Failed to fetch document.');
      }

      const fileBytes = data.fileBytes;
      const fileName = data.fileName || doc.fileName || doc.assetName || "document";
      const rawType = (data.contentType || data.fileType || doc.fileType || "pdf").toLowerCase();

      let mimeType = "application/pdf";
      if (rawType.includes("pdf")) mimeType = "application/pdf";
      else if (rawType.includes("png")) mimeType = "image/png";
      else if (rawType.includes("jpg") || rawType.includes("jpeg")) mimeType = "image/jpeg";
      else if (rawType.includes("txt")) mimeType = "text/plain";
      else if (rawType.includes("doc")) mimeType = "application/msword";

      let url = data.url || data.fileUrl;
      let createdBlobUrl = "";

      if (fileBytes) {
        const cleanBase64 = fileBytes.replace(/^data:.*?;base64,/, '');
        const byteCharacters = atob(cleanBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });
        createdBlobUrl = URL.createObjectURL(blob);
        url = createdBlobUrl;
      }

      if (!url) {
        throw new Error("Document content not available.");
      }

      if (action === 'preview') {
        setViewingDoc({ fileName, url, contentType: mimeType });
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err: any) {
      alert(err?.message || "Could not access document.");
    } finally {
      setLoadingDocId(null);
    }
  };
  const isBidFrozen = rfq?.status === "Freezing" || rfq?.status === "Frozen";
  const isLotOption = !!rfq?.addLotOption;
  const quotations: any[] = useMemo(() => {
    if (!rfq?.supplierQuotation) return [];
    return rfq.supplierQuotation.filter(
      (q: any) => q.quotationId || q.totalPrice !== null
    );
  }, [rfq]);
  const suppliers: { id: string; name: string; total: number }[] = useMemo(() => {
    const seen = new Map<string, { id: string; name: string; total: number }>();
    quotations.forEach((q: any) => {
      const id = q.quotationId || q.supplierId || "unknown";
      const name = q.supplierName || q.organizationName || `Supplier`;
      const total = q.totalPrice || 0;
      if (!seen.has(id)) seen.set(id, { id, name, total });
    });
    return Array.from(seen.values());
  }, [quotations]);

  const lineItems: any[] = useMemo(() => {
    const isUuidStr = (val?: string) => Boolean(val && val.includes('-') && val.length > 20);
    if (rfq?.items && rfq.items.length > 0) {
      return rfq.items.map((item: any) => {
        let cc = item.costCenterCode || item.costCenterName || item.costCenter || '—';
        if (isUuidStr(cc)) {
          if (item.costCenterCode && !isUuidStr(item.costCenterCode)) cc = item.costCenterCode;
          else if (item.costCenterName && !isUuidStr(item.costCenterName)) cc = item.costCenterName;
        }
        return {
          id: item.id || item.itemId || item._id,
          description: item.description || item.materialName || item.name || '—',
          costCenter: cc || '—',
          quantity: item.quantity || item.qty || 1,
          uom: item.uom || item.unit || 'PCS',
          materialCode: item.materialCode || item.code || '',
        };
      });
    }
    return [];
  }, [rfq]);

  const effectiveQuotations: any[] = useMemo(() => {
    if (rfq?.supplierQuotation && rfq.supplierQuotation.length > 0) {
      const filtered = rfq.supplierQuotation.filter(
        (q: any) => (q.supplierQuotationItems && q.supplierQuotationItems.length > 0) || (q.items && q.items.length > 0)
      );
      if (filtered.length > 0) return filtered;
      return rfq.supplierQuotation;
    }

    return [];
  }, [rfq]);

  const suppliersWithTotals = useMemo(() => {
    return effectiveQuotations.map((q: any) => {
      const id = q.quotationId || q.supplierId || 'unknown';
      const name = q.supplierName || q.organizationName || 'Supplier';
      const total = (q.totalPrice !== undefined && q.totalPrice !== null)
        ? q.totalPrice
        : (q.supplierQuotationItems || []).reduce(
            (sum: number, qi: any) => sum + (qi.subTotal ?? (qi.quotedPrice ?? 0) * (qi.quantity ?? 1)), 0
          );
      return { id, name, total };
    });
  }, [effectiveQuotations]);

  const displaySuppliers = suppliersWithTotals.length > 0 ? suppliersWithTotals : suppliers;
  const validSupplierTotals = displaySuppliers.map(s => s.total).filter(t => t > 0);
  const lowestBid = validSupplierTotals.length > 0 ? Math.min(...validSupplierTotals) : 0;
  const highestBid = validSupplierTotals.length > 0 ? Math.max(...validSupplierTotals) : 0;
  const selectedItemCount = Object.keys(selections).length;
  const distinctSelected = [...new Set(Object.values(selections))];

  const getQuoteItemForRfqItem = (quotation: any, rfqItem: any): any | null => {
    const rfqItemId = rfqItem.id;
    if (!rfqItemId || !quotation.supplierQuotationItems) return null;
    return quotation.supplierQuotationItems.find(
      (qi: any) => qi.buyerRFQItemId === rfqItemId || qi.supplierRFQItemId === rfqItemId
    ) || null;
  };

  const isRankL1 = (qi: any) => {
    if (!qi) return false;
    const r = (qi.rank ?? qi.ranking ?? '').toString().toUpperCase().trim();
    return r === 'L1' || r === '1';
  };

  const totalAwardValue = useMemo(() => {
    if (effectiveQuotations.length === 0) return 0;
    return lineItems.reduce((sum, item) => {
      const itemId = item.id || item.itemId || item._id;
      const suppId = selections[itemId];
      const q = suppId
        ? effectiveQuotations.find((q: any) => (q.quotationId || q.supplierId || q._id) === suppId)
        : (
          effectiveQuotations.find((q: any) => {
            const qi = getQuoteItemForRfqItem(q, item);
            return isRankL1(qi);
          }) || effectiveQuotations[0]
        );
      const qi = q && item ? getQuoteItemForRfqItem(q, item) : null;
      const qty = item?.quantity || item?.qty || 1;
      const rawSubtotal = qi?.subTotal ?? null;
      const rawUnitPrice = qi?.quotedAmount ?? qi?.quotedPrice ?? 0;
      const subtotal = rawSubtotal ?? (rawUnitPrice * qty);
      return sum + subtotal;
    }, 0);
  }, [selections, lineItems, effectiveQuotations]);

  const autoSelectLowest = () => {
    const newSel: Record<string, string> = {};
    lineItems.forEach((item: any) => {
      const itemId = item.id || item.rfqItemId;
      let selectedQ: any = null;

      effectiveQuotations.forEach((q: any) => {
        const qi = getQuoteItemForRfqItem(q, item);
        if (isRankL1(qi)) selectedQ = q;
      });

      if (!selectedQ) {
        let lowestPrice = Infinity;
        effectiveQuotations.forEach((q: any) => {
          const qi = getQuoteItemForRfqItem(q, item);
          const price = qi?.quotedAmount ?? qi?.quotedPrice ?? 0;
          if (price > 0 && price < lowestPrice) {
            lowestPrice = price;
            selectedQ = q;
          }
        });
      }

      if (selectedQ) newSel[itemId] = selectedQ.quotationId || selectedQ.supplierId;
    });
    setSelections(newSel);
  };

  useEffect(() => {
    setAutoSelected(false);
    setSelections({});
  }, [rfq?.id, rfq?._id]);

  useEffect(() => {
    if (!autoSelected && lineItems.length > 0 && effectiveQuotations.length > 0) {
      autoSelectLowest();
      setAutoSelected(true);
    }
  }, [lineItems, effectiveQuotations, autoSelected]);

  useEffect(() => {
    if (isLotOption && viewMode === "comparison") {
      setViewMode("by-supplier");
    }
  }, [isLotOption, viewMode]);

  // Fetch Bid History data from API when tab is activated
  useEffect(() => {
    const effectiveRfqId = rfqId || rfq?.rfqId || rfq?.id || rfq?._id;
    if (viewMode !== 'bid-history' || !effectiveRfqId) return;
    // Don't re-fetch if we already have data for this RFQ
    if (bidHistoryApiData?.rfqId === effectiveRfqId) return;

    let cancelled = false;
    setBidHistoryLoading(true);
    setBidHistoryError(null);

    getBidComparisonData(effectiveRfqId)
      .then((response) => {
        if (cancelled) return;
        if (isBidComparisonError(response)) {
          setBidHistoryError(response.message || response.description || 'Failed to load bid history.');
        } else {
          setBidHistoryApiData(response);
        }
      })
      .catch((err: any) => {
        if (!cancelled) setBidHistoryError(err?.message || 'Failed to load bid history.');
      })
      .finally(() => {
        if (!cancelled) setBidHistoryLoading(false);
      });

    return () => { cancelled = true; };
  }, [viewMode, rfqId, rfq?.rfqId, rfq?.id, rfq?._id]);

  // Reset bid history when rfq changes
  useEffect(() => {
    setBidHistoryApiData(null);
    setBidHistoryError(null);
  }, [rfq?.rfqId, rfq?.id, rfq?._id]);

  // Handle RFQ Award API call
  const handleConfirmAward = async () => {
    const effectiveRfqId = rfqId || rfq?.rfqId || rfq?.id || rfq?._id;
    if (!effectiveRfqId) {
      setAwardError("RFQ ID is missing.");
      return;
    }

    const selectionsArray = Object.entries(selections)
      .filter(([_, sid]) => Boolean(sid))
      .map(([itemId, sid]) => ({
        rfqItemId: itemId,
        supplierId: sid,
      }));

    if (selectionsArray.length === 0) {
      setAwardError("Please select at least one item to award.");
      return;
    }

    setAwardingRfq(true);
    setAwardError(null);

    try {
      const res = await awardRfq({
        rfqId: effectiveRfqId,
        // selectionMode: "ITEM_WISE",
        remarks: "", 
        selections: selectionsArray,
      });

      if ('statusCode' in res && res.statusCode && res.statusCode >= 400) {
        setAwardError(res.message || res.description || "Failed to award RFQ.");
      } else {
        setAwardSuccess(true);
      }
    } catch (err: any) {
      setAwardError(err?.message || "An error occurred while awarding the RFQ.");
    } finally {
      setAwardingRfq(false);
    }
  };

  const bidHistoryData = useMemo(() => {
    if (!bidHistoryApiData) return [];
    return (bidHistoryApiData.suppliers || []).map((supplier) => {
      const { supplierId, supplierName, firstVersion, latestVersion } = supplier;

      const firstItemMap = new Map(
        (firstVersion?.items || []).map((qi) => [qi.buyerRFQItemId, qi])
      );
      const latestItemMap = new Map(
        (latestVersion?.items || []).map((qi) => [qi.buyerRFQItemId, qi])
      );

      const isUuidStr = (val?: string) => Boolean(val && val.includes('-') && val.length > 20);
      const resolvedItems = (bidHistoryApiData.rfqItems && bidHistoryApiData.rfqItems.length > 0)
        ? bidHistoryApiData.rfqItems.map((apiItem: any) => {
            const matchInLineItems = lineItems.find((li: any) =>
              li.id === apiItem.id ||
              (li.materialCode && apiItem.materialCode && li.materialCode === apiItem.materialCode) ||
              (li.description && apiItem.description && li.description.toLowerCase() === apiItem.description.toLowerCase())
            );

            let cc = apiItem.costCenterCode || apiItem.costCenterName || apiItem.costCenter || '';
            if (!cc || isUuidStr(cc)) {
              if (matchInLineItems?.costCenter && !isUuidStr(matchInLineItems.costCenter)) {
                cc = matchInLineItems.costCenter;
              } else if (apiItem.costCenterCode && !isUuidStr(apiItem.costCenterCode)) {
                cc = apiItem.costCenterCode;
              } else if (apiItem.costCenterName && !isUuidStr(apiItem.costCenterName)) {
                cc = apiItem.costCenterName;
              }
            }

            return {
              ...apiItem,
              description: apiItem.description || apiItem.name || matchInLineItems?.description || '—',
              costCenter: (cc && !isUuidStr(cc)) ? cc : (matchInLineItems?.costCenter || '—'),
              materialCode: apiItem.materialCode || apiItem.code || matchInLineItems?.materialCode || '—',
              quantity: apiItem.quantity || apiItem.qty || matchInLineItems?.quantity || 1,
              uom: apiItem.uom || apiItem.unit || matchInLineItems?.uom || '—',
            };
          })
        : lineItems.map((li: any) => ({
            id: li.id,
            description: li.description || li.name || '—',
            quantity: li.quantity || li.qty || 1,
            uom: li.uom || li.unit || '',
            costCenter: li.costCenter || li.costCenterCode || '',
            materialCode: li.materialCode || li.code || '',
          }));

      const itemPrices: Record<string, {
        firstBid: number;
        currentBid: number;
        firstBreakdown: { discount: number; tax: number; delivery: number };
        currentBreakdown: { discount: number; tax: number; delivery: number };
      }> = {};

      resolvedItems.forEach((rfqItem: any) => {
        const firstQi = firstItemMap.get(rfqItem.id);
        const latestQi = latestItemMap.get(rfqItem.id);

        const effQuotation = effectiveQuotations.find(
          (q: any) => (q.quotationId || q.supplierId || q._id) === supplierId
        );
        const effQi = effQuotation ? getQuoteItemForRfqItem(effQuotation, rfqItem) : null;

        itemPrices[rfqItem.id] = {
          firstBid: firstQi?.quotedAmount ?? firstQi?.quotedPrice ?? effQi?.quotedAmount ?? effQi?.quotedPrice ?? 0,
          currentBid: latestQi?.quotedAmount ?? latestQi?.quotedPrice ?? effQi?.quotedAmount ?? effQi?.quotedPrice ?? 0,
          firstBreakdown: {
            discount: firstQi?.discount ?? (firstQi as any)?.discountPercentage ?? effQi?.discount ?? effQi?.discountPercentage ?? 0,
            tax: firstQi?.tax ?? (firstQi as any)?.taxPercentage ?? (firstQi as any)?.gst ?? effQi?.tax ?? effQi?.taxPercentage ?? effQi?.gst ?? 0,
            delivery: firstQi?.deliveryCharge ?? (firstQi as any)?.deliveryAmount ?? effQi?.deliveryCharge ?? effQi?.deliveryAmount ?? 0,
          },
          currentBreakdown: {
            discount: latestQi?.discount ?? (latestQi as any)?.discountPercentage ?? effQi?.discount ?? effQi?.discountPercentage ?? 0,
            tax: latestQi?.tax ?? (latestQi as any)?.taxPercentage ?? (latestQi as any)?.gst ?? effQi?.tax ?? effQi?.taxPercentage ?? effQi?.gst ?? 0,
            delivery: latestQi?.deliveryCharge ?? (latestQi as any)?.deliveryAmount ?? effQi?.deliveryCharge ?? effQi?.deliveryAmount ?? 0,
          },
        };
      });

      return {
        id: supplierId,
        name: supplierName,
        badgeType: 'external' as string,
        itemPrices,
        firstTotal: firstVersion?.totalPrice ?? 0,
        currentTotal: latestVersion?.totalPrice ?? 0,
        firstLotBreakdown: {
          discount: firstVersion?.discount ?? 0,
          discountType: firstVersion?.discountType || 'PERCENTAGE',
          tax: firstVersion?.tax ?? 0,
          taxType: firstVersion?.taxType || 'PERCENTAGE',
          delivery: firstVersion?.deliveryCharge ?? 0,
          deliveryType: firstVersion?.deliveryType || 'AMOUNT',
        },
        currentLotBreakdown: {
          discount: latestVersion?.discount ?? 0,
          discountType: latestVersion?.discountType || 'PERCENTAGE',
          tax: latestVersion?.tax ?? 0,
          taxType: latestVersion?.taxType || 'PERCENTAGE',
          delivery: latestVersion?.deliveryCharge ?? 0,
          deliveryType: latestVersion?.deliveryType || 'AMOUNT',
        },
        resolvedItems,
      };
    });
  }, [bidHistoryApiData, lineItems]);

  const selectAllForSupplier = (suppId: string) => {
    const newSel: Record<string, string> = {};
    lineItems.forEach((item: any) => { newSel[item.id || item.itemId] = suppId; });
    setSelections(newSel);
  };

  if (loading) {
    return (<div className="bca-loading"><div className="bca-spinner" /><span>Loading Bid Comparison...</span></div>);
  }
  if (error && !rfq) {
    return (<div className="bca-error"><p>{error}</p><button className="bca-btn bca-btn-outline" onClick={onBack}>Back</button></div>);
  }
  if (!rfq) return null;

  const kpis = [
    { label: "Suppliers Participated", value: displaySuppliers.length, iconColor: "#2563EB", iconBg: "#EFF6FF", icon: "◉" },
    { label: "Line Items", value: lineItems.length, iconColor: "#2563EB", iconBg: "#EFF6FF", icon: "≡" },
    { label: "Lowest Bid", value: lowestBid > 0 ? fmtINR(lowestBid) : "—", iconColor: "#059669", iconBg: "#ECFDF5", icon: "↓" },
    { label: "Highest Bid", value: highestBid > 0 ? fmtINR(highestBid) : "—", iconColor: "#D97706", iconBg: "#FFFBEB", icon: "↑" },
    { label: "Bid Status", value: rfq?.status || "Active", iconColor: "#059669", iconBg: "#ECFDF5", icon: "●" },
  ];

  const barButtonDisabled = !isBidFrozen || selectedItemCount === 0;
  const barButtonLabel = !isBidFrozen ? "Freeze Bid to Continue" : selectedItemCount === 0 ? "Select Supplier(s)" : "Award Selected";

  return (
    <div className="bca-page">
      <div className="bca-page-header">
        <div className="bca-header-left">
          <button className="bca-back-circle-btn" onClick={onBack} title="Back">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 15L7 10L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div>
            <h1 className="bca-page-title">Bid Comparison &amp; Award</h1>
            <p className="bca-page-subtitle">Compare supplier quotations, evaluate line-item pricing, and award the RFQ.</p>
          </div>
        </div>
        <div className="bca-page-header-right">
          <span className={`bca-status-badge ${isBidFrozen ? "bca-status-frozen" : "bca-status-active"}`}>
            &#9679; {isBidFrozen ? "BID FROZEN" : "BIDDING ACTIVE"}
          </span>
          {isBidFrozen ? (
            <button
              type="button"
              className="bca-btn-frozen-pill"
              disabled
            >
              <span className="bca-icon-lock" style={{ opacity: 0.8 }}>
                <span className="bca-icon-lock-shackle"></span>
                <span className="bca-icon-lock-body"></span>
              </span>
              <span>Bid Frozen</span>
            </button>
          ) : (
            <Button variant="primary" className="bca-btn-icon-gap" onClick={() => setShowFreezeModal(true)} disabled={freezingBid}>
              <span className="bca-icon-lock">
                <span className="bca-icon-lock-shackle"></span>
                <span className="bca-icon-lock-body"></span>
              </span>
              <span>{freezingBid ? "Freezing..." : "Freeze Bid"}</span>
            </Button>
          )}
          {Array.isArray(rfq?.supplierIds) && rfq?.supplierIds?.length > 0 && (
            <Button
              type="button"
              variant="outline"
              className="bca-btn-icon-gap"
              onClick={onChatClick}
              title="Chat with invited suppliers"
            >
              <IconMessageSquare /> Chat
            </Button>
          )}
        </div>
      </div>

      <div className="bca-details-card">
        <div className="bca-details-title">RFQ Details</div>
        <div className="bca-details-grid">
          <div><div className="bca-detail-label">RFQ TITLE</div><div className="bca-detail-value">{rfq.title || "—"}</div></div>
          <div>
            <div className="bca-detail-label">RFQ START DATE &amp; TIME</div>
            <div className="bca-detail-value">{rfq.startDate ? new Date(rfq.startDate).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}</div>
          </div>
          <div>
            <div className="bca-detail-label">RFQ CLOSE DATE &amp; TIME</div>
            <div className="bca-detail-value">{rfq.endDate ? new Date(rfq.endDate).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}</div>
          </div>
          <div><div className="bca-detail-label">DELIVERY LOCATION</div><div className="bca-detail-value">{rfq.deliveryLocation || "—"}</div></div>
          <div className="bca-details-two"><div className="bca-detail-label">DESCRIPTION</div><div className="bca-detail-value">{rfq.description || "—"}</div></div>
          <div>
            <div className="bca-detail-label">LOT</div>
            {rfq.addLotOption ? <span className="bca-lot-badge">LOT Enabled</span> : <span className="bca-lot-badge-disabled">Not Enabled</span>}
          </div>
        </div>
      </div>

      <div className="bca-kpi-row">
        {kpis.map((k) => (
          <div key={k.label} className="bca-kpi-card">
            <div className="bca-kpi-top">
              <div className="bca-kpi-icon" style={{ color: k.iconColor, background: k.iconBg }}>{k.icon}</div>
              <div className="bca-kpi-label">{k.label}</div>
            </div>
            <div className="bca-kpi-value">{String(k.value)}</div>
          </div>
        ))}
      </div>

      {effectiveQuotations.length > 0 && (() => {
        const colors = ["#2563EB", "#7C3AED", "#059669", "#D97706", "#DC2626", "#0891B2", "#4F46E5"];
        const chartSuppliers = effectiveQuotations.map((q: any, idx: number) => {
          const id = q.quotationId || q.supplierId || q._id || `s${idx}`;
          const name = q.supplierName || q.organizationName || `Supplier ${idx + 1}`;
          const total = (q.totalPrice !== undefined && q.totalPrice !== null)
            ? q.totalPrice
            : (q.supplierQuotationItems || []).reduce(
                (sum: number, qi: any) => sum + (qi.subTotal ?? (qi.quotedPrice ?? 0) * (qi.quantity ?? 1)), 0
              );
          return { id, name, color: colors[idx % colors.length], quotation: q, total };
        });

        const isAllSelected = selectedMaterial === "all" || !lineItems.some((m: any) => (m.id || m.itemId || m._id) === selectedMaterial);
        const selMat = isAllSelected ? null : lineItems.find((m: any) => (m.id || m.itemId || m._id) === selectedMaterial);

        const rawChartData = chartSuppliers.map(s => {
          let price = 0;
          if (isAllSelected) {
            price = s.total;
          } else if (selMat) {
            const qi = getQuoteItemForRfqItem(s.quotation, selMat);
            price = qi?.quotedAmount ?? qi?.quotedPrice ?? qi?.subTotal ?? 0;
          }
          return {
            id: s.id,
            name: s.name.length > 14 ? `${s.name.substring(0, 12)}...` : s.name,
            fullName: s.name,
            price,
            color: s.color,
            isLowest: false,
          };
        });

        const validPrices = rawChartData.map(d => d.price).filter(p => p > 0);
        const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : 0;
        const chartData = rawChartData.map(d => ({
          ...d,
          isLowest: d.price > 0 && d.price === minPrice,
        }));

        return (
          <div className="bca-chart-card">
            <div className="bca-chart-header">
              <div>
                <div className="bca-chart-title">Price Comparison by Supplier</div>
                <div className="bca-chart-subtitle">
                  {isAllSelected 
                    ? "Total quotation price comparison across all participating suppliers" 
                    : `Unit price comparison for "${selMat?.description || 'selected item'}"`}
                </div>
              </div>
              <select
                className="bca-chart-dropdown"
                value={isAllSelected ? "all" : selectedMaterial}
                onChange={e => setSelectedMaterial(e.target.value)}
              >
                <option value="all">All Items (Total Price)</option>
                {lineItems.map((m: any) => (
                  <option key={m?.id || m?.itemId || m?._id} value={m?.id || m?.itemId || m?._id}>
                    {m?.description || m?.name || `Item ${m?.id}`}
                  </option>
                ))}
              </select>
            </div>
            <div className="bca-chart-body" style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {chartData?.map((item: any, idx: number) => {
                const maxVal = Math.max(...(chartData?.map((d: any) => d?.price || 0) || []), 1);
                const percentage = item?.price > 0 ? Math.max((item.price / maxVal) * 100, 3) : 0;
                const formattedPrice = item?.price > 0 
                  ? `₹${item.price.toLocaleString('en-IN')}` 
                  : 'No Quote';

                return (
                  <div key={item?.id || idx} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div 
                      style={{ width: '130px', minWidth: '130px', fontSize: '12px', fontWeight: 600, color: '#475569', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} 
                      title={item?.fullName}
                    >
                      {item?.name}
                    </div>
                    <div style={{ flex: 1, position: 'relative', background: '#f1f5f9', borderRadius: '6px', height: '32px', display: 'flex', alignItems: 'center', padding: '0 4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${percentage}%`,
                          height: '100%',
                          background: item?.isLowest ? 'linear-gradient(90deg, #10b981, #059669)' : item?.color || '#2563eb',
                          borderRadius: '6px',
                          transition: 'width 0.4s ease-in-out',
                          opacity: item?.isLowest ? 1 : 0.85,
                        }}
                      />
                      <span style={{ marginLeft: '10px', fontSize: '12px', fontWeight: 700, color: item?.isLowest ? '#047857' : '#1e293b', whiteSpace: 'nowrap', zIndex: 1 }}>
                        {formattedPrice}
                        {item?.isLowest && (
                          <span style={{ marginLeft: '8px', fontSize: '11px', background: '#d1fae5', color: '#065f46', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                            ✓ Lowest Bid
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="bca-chart-legend">
              {chartSuppliers?.map((s, i) => {
                const isLow = chartData[i]?.isLowest;
                return (
                  <div key={s?.id} className="bca-chart-legend-item">
                    <span className="bca-chart-legend-dot" style={{ background: isLow ? '#059669' : s.color }} />
                    <span style={{ color: isLow ? '#059669' : undefined, fontWeight: isLow ? 600 : undefined }}>
                      {s?.name}{isLow ? ' ✓ Lowest' : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      <div className="bca-award-header">
        <div>
          <h2 className="bca-award-title">
            {viewMode === "summary"
              ? "Award Selection"
              : viewMode === "bid-history"
                ? "Bid History"
                : isLotOption
                  ? "Bid Comparison"
                  : viewMode === "comparison"
                    ? "Bid Comparison"
                    : "Select by Supplier"}
          </h2>
          <p className="bca-award-subtitle">
            {viewMode === "summary"
              ? "Lowest-priced supplier auto-selected for every line item. Compare manually or award one supplier for all items."
              : viewMode === "bid-history"
                ? "Track supplier bid progression — compare First Bid vs Current Bid for each line item."
                : isLotOption
                  ? "Compare supplier quotations before awarding the RFQ."
                  : viewMode === "comparison"
                    ? "Compare supplier quotations across each line item before awarding the RFQ."
                    : "Award all line items to a single supplier at once."}
          </p>
        </div>
        <div className="bca-tabs">
          <button
            className={`bca-tab${viewMode === "summary" ? " bca-tab-active" : ""}`}
            onClick={() => setViewMode("summary")}
          >
            Award Selection
          </button>
          {!isLotOption && (
            <button
              className={`bca-tab${viewMode === "comparison" ? " bca-tab-active" : ""}`}
              onClick={() => setViewMode("comparison")}
            >
              Bid Comparison
            </button>
          )}
          <button
            className={`bca-tab${viewMode === "by-supplier" ? " bca-tab-active" : ""}`}
            onClick={() => setViewMode("by-supplier")}
          >
            {isLotOption ? "Bid Comparison" : "Select by Supplier"}
          </button>
          <button
            className={`bca-tab${viewMode === "bid-history" ? " bca-tab-active" : ""}`}
            onClick={() => setViewMode("bid-history")}
          >
            Bid History
          </button>
        </div>
      </div>

      <div className="bca-award-subbar">
        <div className="bca-award-chips">
          <span className="bca-award-chip">
            {viewMode === "summary" ? "Award Selection" : viewMode === "comparison" ? "Bid Comparison" : viewMode === "bid-history" ? "Bid History" : "Select by Supplier"}
          </span>
          {effectiveQuotations.length > 0 && (() => {
            const supplierItemCount: Record<string, number> = {};
            Object.values(selections).forEach(sid => {
              supplierItemCount[sid] = (supplierItemCount[sid] || 0) + 1;
            });
            const supplierNameMap: Record<string, string> = {};
            effectiveQuotations.forEach((q: any) => {
              const sid = q.quotationId || q.supplierId || q._id || 'unknown';
              supplierNameMap[sid] = q.supplierName || q.organizationName || 'Supplier';
            });
            return Object.entries(supplierItemCount).map(([sid, cnt]) => (
              <span key={sid} className="bca-award-chip bca-award-chip-supplier">
                {supplierNameMap[sid] || sid} — {cnt} {cnt === 1 ? 'Item' : 'Items'}
              </span>
            ));
          })()}
        </div>
        <div className="bca-total-award">
          Total Award Value: <strong>{effectiveQuotations.length > 0 && totalAwardValue > 0 ? fmtINR(totalAwardValue) : "—"}</strong>
        </div>
      </div>

      <div className="bca-award-section">
        {viewMode === "summary" && (
          <div className="bca-table-wrap">
            {lineItems.length === 0 || effectiveQuotations.length === 0 ? (
              <div className="bca-empty">
                {lineItems.length === 0 ? "No line items found for this RFQ." : "No supplier quotations submitted yet for this RFQ."}
              </div>
            ) : (
              <table className="bca-table">
                <thead>
                  <tr>
                    <th className="bca-th-num">#</th>
                    <th>Material</th>
                    <th>Cost Center</th>
                    <th>Qty</th>
                    <th>Selected Supplier</th>
                    <th className="bca-th-right">Unit Price</th>
                    <th className="bca-th-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                   {lineItems.map((item: any, idx: number) => {
                    const itemId = item.id;
                    const selSuppId = selections[itemId];
                    const selQuotation = selSuppId
                      ? effectiveQuotations.find((q: any) => (q.quotationId || q.supplierId) === selSuppId)
                      : effectiveQuotations[0];
                    const selSupp = selSuppId
                      ? displaySuppliers.find((s) => s.id === selSuppId)
                      : displaySuppliers[0];
                    const selQI = selQuotation ? getQuoteItemForRfqItem(selQuotation, item) : null;

                    const qty = item.quantity || item.qty || 1;
                    const rawUnitPrice = selQI?.quotedAmount ?? selQI?.quotedPrice ?? null;
                    const rawSubtotal  = selQI?.subTotal ?? null;
                    const fallbackTotal  = selQuotation?.totalPrice ?? 0;
                    const fallbackUnit   = fallbackTotal > 0 && lineItems.length > 0
                      ? Math.round(fallbackTotal / lineItems.length / qty)
                      : 0;
                    const unitPrice = rawUnitPrice ?? fallbackUnit;
                    const subtotal  = rawSubtotal  ?? (unitPrice * qty);

                    const itemPrices = effectiveQuotations.map((q: any) => {
                      const qi = getQuoteItemForRfqItem(q, item);
                      return qi?.quotedAmount ?? qi?.quotedPrice ?? 0;
                    }).filter(p => p > 0);
                    const onlyOneSupplier = effectiveQuotations.length === 1;
                    const lowestItemPrice = itemPrices.length > 0 ? Math.min(...itemPrices) : 0;
                    const isLowest = onlyOneSupplier || (unitPrice > 0 && unitPrice <= lowestItemPrice);

                    return (
                      <tr key={itemId}>
                        <td className="bca-td-num">{idx + 1}</td>
                        <td>{item.description || item.name || item.materialName || '—'}</td>
                        <td>{item.costCenter || item.costCenterCode || '—'}</td>
                        <td>{qty}</td>
                        <td>
                          <span className="bca-supplier-cell">
                            {selSupp?.name || '—'}
                            {selSupp && isLowest && <span className="bca-lowest-badge">LOWEST</span>}
                          </span>
                        </td>
                        <td className="bca-td-price">{unitPrice > 0 ? fmtINR(unitPrice) : '—'}</td>
                        <td className="bca-td-price bca-td-subtotal">{subtotal > 0 ? fmtINR(subtotal) : '—'}</td>
                      </tr>
                    );
                  })}
                 </tbody>
              </table>
            )}
          </div>
        )}

        {viewMode === "comparison" && (() => {
          if (lineItems.length === 0 || effectiveQuotations.length === 0) {
            return (
              <div className="bca-empty">
                {lineItems.length === 0 ? "No line items found for this RFQ." : "No supplier quotations submitted yet for this RFQ."}
              </div>
            );
          }
          const cmpSuppliers = effectiveQuotations.map((q: any) => {
            const id = q.quotationId || q.supplierId || q._id || 'unknown';
            const name = q.supplierName || q.organizationName || 'Supplier';
            const vs = (q.verificationStatus || q.status || '').toLowerCase().trim();
            let badgeType = 'external';
            if (vs === 'verified' || (vs.includes('verified') && !vs.includes('unverified') && !vs.includes('required') && !vs.includes('not'))) {
              badgeType = 'verified';
            } else if (vs.includes('unverified') || vs.includes('not verified')) {
              badgeType = 'unverified';
            } else if (vs.includes('required') || vs.includes('pending')) {
              badgeType = 'warning';
            } else if (vs.includes('review')) {
              badgeType = 'review';
            }
            const total = (q.totalPrice !== undefined && q.totalPrice !== null)
              ? q.totalPrice
              : (q.supplierQuotationItems || []).reduce(
                  (sum: number, qi: any) => sum + (qi.subTotal ?? (qi.quotedAmount ?? qi.quotedPrice ?? 0) * (qi.quantity ?? 1)), 0
                );
            return { id, name, badgeType, total };
          });

          const cmpItems = lineItems.map((item: any) => {
            const prices: Record<string, number> = {};
            const ranks: Record<string, string> = {};
            const breakdown: Record<string, { discount: number; tax: number; delivery: number }> = {};
            effectiveQuotations.forEach((q: any) => {
              const suppId = q.quotationId || q.supplierId || q._id || 'unknown';
              const qi = getQuoteItemForRfqItem(q, item);
              prices[suppId] = qi?.quotedAmount ?? qi?.quotedPrice ?? 0;
              ranks[suppId] = (qi?.rank ?? qi?.ranking ?? '').toString().toUpperCase().trim();
              breakdown[suppId] = {
                discount: qi?.discount ?? qi?.discountPercentage ?? 0,
                tax: qi?.tax ?? qi?.taxPercentage ?? qi?.gst ?? 0,
                delivery: qi?.deliveryCharge ?? qi?.deliveryAmount ?? 0,
              };
            });
            return {
              id: item.id,
              name: item.description || item.name || '—',
              cc: item.costCenter || '—',
              code: item.materialCode || item.code || '—',
              qty: item.quantity || item.qty || 1,
              uom: item.uom || item.unit || '—',
              prices,
              ranks,
              breakdown,
            };
          });

          const minTotal = cmpSuppliers.length > 0 ? Math.min(...cmpSuppliers.map(s => s.total)) : 0;

          return (
            <div className="bca-cmp-wrap">
              <table className="bca-cmp-table">
                <thead>
                  <tr>
                    <th className="bca-cmp-th-fixed bca-cmp-th-num">#</th>
                    <th className="bca-cmp-th-fixed bca-cmp-th-mat">Material</th>
                    <th className="bca-cmp-th-fixed">Cost Center</th>
                    <th className="bca-cmp-th-fixed">Code</th>
                    <th className="bca-cmp-th-fixed bca-cmp-th-sm">Qty</th>
                    <th className="bca-cmp-th-fixed bca-cmp-th-sm">UOM</th>
                    {cmpSuppliers.map(s => (
                      <th key={s.id} className={`bca-cmp-th-supp${Object.values(selections).includes(s.id) ? " bca-cmp-th-selected" : ""}`}>
                        <div className="bca-cmp-supp-name">{s.name}</div>
                        <div className="bca-cmp-supp-badge">
                          {s.badgeType === "verified"   && <span className="bca-stag bca-stag-verified">✓ VERIFIED</span>}
                          {s.badgeType === "unverified" && <span className="bca-stag bca-stag-external">⊙ UNVERIFIED</span>}
                          {s.badgeType === "warning"    && <span className="bca-stag bca-stag-warning">⚠ VERIFICATION REQUIRED</span>}
                          {s.badgeType === "external"   && <span className="bca-stag bca-stag-external">⊙ EXTERNAL</span>}
                          {s.badgeType === "review"     && <span className="bca-stag bca-stag-review">⊙ UNDER REVIEW</span>}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cmpItems.map((item, idx) => {
                    const priceValues = Object.values(item.prices as Record<string, number>).filter(p => p > 0);
                    const minPrice = priceValues.length > 0 ? Math.min(...priceValues) : 0;
                    return (
                      <tr key={item.id} className="bca-cmp-row">
                        <td className="bca-cmp-td-fixed bca-td-num">{idx + 1}</td>
                        <td className="bca-cmp-td-fixed bca-cmp-td-mat">
                          <div className="bca-cmp-mat-name">{item.name}</div>
                        </td>
                        <td className="bca-cmp-td-fixed bca-cmp-td-muted">{item.cc}</td>
                        <td className="bca-cmp-td-fixed bca-cmp-td-muted">{item.code}</td>
                        <td className="bca-cmp-td-fixed bca-cmp-td-muted bca-cmp-td-center">{item.qty}</td>
                        <td className="bca-cmp-td-fixed bca-cmp-td-muted bca-cmp-td-center">{item.uom}</td>
                        {cmpSuppliers.map(s => {
                          const price = (item.prices as Record<string, number>)[s.id] ?? 0;
                          const bd = (item.breakdown as Record<string, any>)[s.id] ?? { discount: 0, tax: 0, delivery: 0 };
                          const rankLabel = (item.ranks as Record<string, string>)?.[s.id] ?? '';
                          const hasRankData = Object.values((item.ranks as Record<string, string>) ?? {}).some(r => r !== '');
                          const isLowest = hasRankData ? (rankLabel === 'L1') : (price > 0 && price === minPrice);
                          const hasManualSelection = !!selections[item.id];
                          const isSelected = hasManualSelection
                            ? selections[item.id] === s.id
                            : isLowest;
                          const discAmt = bd.discount > 0 ? Math.round(price * bd.discount / 100) : 0;
                          const taxAmt  = bd.tax > 0 ? Math.round((price - discAmt) * bd.tax / 100) : 0;
                          const rank = rankLabel || (price > 0 ? String([...Object.values(item.prices as Record<string, number>)].filter(p => p > 0).sort((a, b) => a - b).indexOf(price) + 1) : '');

                          return (
                            <td key={s.id} className={`bca-cmp-td-supp${isSelected ? " bca-cmp-td-selected" : ""}`}>
                              <div className="bca-cmp-price-row">
                                <span className="bca-cmp-price">{price > 0 ? fmtINR(price) : '—'}</span>
                                {isLowest && <span className="bca-lowest-badge">LOWEST</span>}
                              </div>
                              <div className="bca-cmp-per-unit">per unit</div>
                              <button
                                className={`bca-btn bca-cmp-sel-btn ${isSelected ? "bca-btn-selected" : "bca-btn-outline"}`}
                                onClick={() => setSelections(prev => ({ ...prev, [item.id]: s.id }))}
                              >
                                {isSelected ? "✓ Selected" : "Select"}
                              </button>
                              <div className="bca-cmp-breakdown">
                                <div className="bca-cmp-breakdown-title">BREAKDOWN</div>
                                <div className="bca-cmp-breakdown-row"><span>Unit Price</span><span>{price > 0 ? fmtINR(price) : '—'}</span></div>
                                {bd.discount > 0 && <div className="bca-cmp-breakdown-row bca-cmp-disc"><span>Discount</span><span>{bd.discount}% — <span className="bca-discount">-{fmtINR(discAmt)}</span></span></div>}
                                {bd.tax > 0 && <div className="bca-cmp-breakdown-row"><span>Tax</span><span>{bd.tax}% → {fmtINR(taxAmt)}</span></div>}
                                {bd.delivery > 0 && <div className="bca-cmp-breakdown-row"><span>Delivery Charge</span><span>{fmtINR(bd.delivery)}</span></div>}
                                {rank && <div className={`bca-cmp-breakdown-rank${rank === 'L1' ? ' bca-cmp-rank-l1' : ''}`}>
                                  Rank {rank} of {cmpSuppliers.length}
                                </div>}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bca-cmp-total-row">
                    <td className="bca-cmp-td-fixed" colSpan={6}><strong>Total</strong></td>
                    {cmpSuppliers.map(s => (
                      <td key={s.id} className={`bca-cmp-td-supp${s.total === minTotal && minTotal > 0 ? " bca-cmp-td-selected" : ""}`}>
                        <div className="bca-cmp-total-price">{s.total > 0 ? fmtINR(s.total) : '—'}</div>
                        {s.total === minTotal && minTotal > 0 && <div className="bca-stag bca-stag-lowest bca-mt-xs">LOWEST OVERALL</div>}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
          );
        })()}


        {viewMode === "bid-history" && (() => {
          if (bidHistoryLoading) {
            return (
              <div className="bca-loading" style={{ minHeight: '200px' }}>
                <div className="bca-spinner" />
                <span>Loading Bid History...</span>
              </div>
            );
          }

          if (bidHistoryError) {
            return (
              <div className="bca-empty" style={{ color: '#ef4444' }}>
                ⚠ {bidHistoryError}
              </div>
            );
          }

          if (bidHistoryData.length === 0) {
            return (
              <div className="bca-empty">No bid history found for this RFQ.</div>
            );
          }

          // Use resolvedItems from first supplier (all suppliers share same rfqItems)
          const historyItems = bidHistoryData[0]?.resolvedItems || [];

          const allCurrentTotals = bidHistoryData.map(s => s.currentTotal).filter(t => t > 0);
          const minCurrentTotal = allCurrentTotals.length > 0 ? Math.min(...allCurrentTotals) : 0;

          const isLotOptionEffective = isLotOption || !!bidHistoryApiData?.addLotOption;

          return (
            <div className="bca-cmp-wrap">
              <table className="bca-cmp-table">
                <thead>
                  <tr>
                    <th className="bca-cmp-th-fixed bca-cmp-th-num">#</th>
                    <th className="bca-cmp-th-fixed bca-cmp-th-mat">Material</th>
                    <th className="bca-cmp-th-fixed">Cost Center</th>
                    <th className="bca-cmp-th-fixed">Code</th>
                    <th className="bca-cmp-th-fixed bca-cmp-th-sm">Qty</th>
                    <th className="bca-cmp-th-fixed bca-cmp-th-sm">UOM</th>
                    {bidHistoryData.map(s => (
                      <th key={s.id} className="bca-cmp-th-supp" colSpan={2}>
                        <div className="bca-cmp-supp-name">{s.name}</div>
                      </th>
                    ))}
                  </tr>
                  <tr>
                    <th className="bca-cmp-th-fixed" colSpan={6} style={{ borderTop: 'none', background: '#f8fafc' }} />
                    {bidHistoryData.map(s => (
                      <React.Fragment key={s.id}>
                        <th className="bca-hist-sub-th bca-hist-first">First Bid</th>
                        <th className="bca-hist-sub-th bca-hist-current">Current Bid</th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {historyItems.map((item: any, idx: number) => {
                    return (
                      <tr key={item.id} className="bca-cmp-row">
                        <td className="bca-cmp-td-fixed bca-td-num">{idx + 1}</td>
                        <td className="bca-cmp-td-fixed bca-cmp-td-mat">
                          <div className="bca-cmp-mat-name">{item.description || item.name || '—'}</div>
                        </td>
                        <td className="bca-cmp-td-fixed bca-cmp-td-muted">{item.costCenter || '—'}</td>
                        <td className="bca-cmp-td-fixed bca-cmp-td-muted">{item.materialCode || '—'}</td>
                        <td className="bca-cmp-td-fixed bca-cmp-td-muted bca-cmp-td-center">{item.quantity || 1}</td>
                        <td className="bca-cmp-td-fixed bca-cmp-td-muted bca-cmp-td-center">{item.uom || '—'}</td>
                        {bidHistoryData.map(s => {
                          if (isLotOptionEffective) {
                            return (
                              <React.Fragment key={s.id}>
                                <td className="bca-hist-td bca-hist-first-td">
                                  <span className="bca-cmp-td-muted">NA</span>
                                </td>
                                <td className="bca-hist-td bca-hist-current-td">
                                  <span className="bca-cmp-td-muted">NA</span>
                                </td>
                              </React.Fragment>
                            );
                          }

                          const itemData = s.itemPrices[item.id] || {
                            firstBid: 0,
                            currentBid: 0,
                            firstBreakdown: { discount: 0, tax: 0, delivery: 0 },
                            currentBreakdown: { discount: 0, tax: 0, delivery: 0 },
                          };
                          const firstPrice = itemData.firstBid;
                          const currentPrice = itemData.currentBid;
                          const firstBd = itemData.firstBreakdown || { discount: 0, tax: 0, delivery: 0 };
                          const currentBd = itemData.currentBreakdown || { discount: 0, tax: 0, delivery: 0 };

                          const firstDiscAmt = firstBd.discount > 0 ? Math.round(firstPrice * firstBd.discount / 100) : 0;
                          const firstTaxAmt  = firstBd.tax > 0 ? Math.round((firstPrice - firstDiscAmt) * firstBd.tax / 100) : 0;

                          const currentDiscAmt = currentBd.discount > 0 ? Math.round(currentPrice * currentBd.discount / 100) : 0;
                          const currentTaxAmt  = currentBd.tax > 0 ? Math.round((currentPrice - currentDiscAmt) * currentBd.tax / 100) : 0;

                          const decreased = firstPrice > 0 && currentPrice > 0 && currentPrice < firstPrice;
                          const increased = firstPrice > 0 && currentPrice > 0 && currentPrice > firstPrice;
                          const pctChange = firstPrice > 0
                            ? Math.round(((currentPrice - firstPrice) / firstPrice) * 100)
                            : 0;

                          return (
                            <React.Fragment key={s.id}>
                              <td className="bca-hist-td bca-hist-first-td">
                                <span className="bca-cmp-price">{firstPrice > 0 ? fmtINR(firstPrice) : '—'}</span>
                                <div className="bca-cmp-breakdown" style={{ marginTop: '6px' }}>
                                  <div className="bca-cmp-breakdown-title">BREAKDOWN</div>
                                  <div className="bca-cmp-breakdown-row"><span>Unit Price</span><span>{firstPrice > 0 ? fmtINR(firstPrice) : '—'}</span></div>
                                  {firstBd.discount > 0 && <div className="bca-cmp-breakdown-row bca-cmp-disc"><span>Discount</span><span>{firstBd.discount}% — <span className="bca-discount">-{fmtINR(firstDiscAmt)}</span></span></div>}
                                  {firstBd.tax > 0 && <div className="bca-cmp-breakdown-row"><span>Tax</span><span>{firstBd.tax}% → {fmtINR(firstTaxAmt)}</span></div>}
                                  {firstBd.delivery > 0 && <div className="bca-cmp-breakdown-row"><span>Delivery</span><span>{fmtINR(firstBd.delivery)}</span></div>}
                                </div>
                              </td>
                              <td className="bca-hist-td bca-hist-current-td">
                                <div className="bca-hist-current-row">
                                  <span className="bca-cmp-price">{currentPrice > 0 ? fmtINR(currentPrice) : '—'}</span>
                                  {firstPrice > 0 && currentPrice > 0 && (
                                    <span className={`bca-hist-delta ${decreased ? 'bca-hist-delta-down' : increased ? 'bca-hist-delta-up' : 'bca-hist-delta-same'}`}>
                                      {decreased ? '▼' : increased ? '▲' : '='} {Math.abs(pctChange)}%
                                    </span>
                                  )}
                                </div>
                                <div className="bca-cmp-breakdown" style={{ marginTop: '6px' }}>
                                  <div className="bca-cmp-breakdown-title">BREAKDOWN</div>
                                  <div className="bca-cmp-breakdown-row"><span>Unit Price</span><span>{currentPrice > 0 ? fmtINR(currentPrice) : '—'}</span></div>
                                  {currentBd.discount > 0 && <div className="bca-cmp-breakdown-row bca-cmp-disc"><span>Discount</span><span>{currentBd.discount}% — <span className="bca-discount">-{fmtINR(currentDiscAmt)}</span></span></div>}
                                  {currentBd.tax > 0 && <div className="bca-cmp-breakdown-row"><span>Tax</span><span>{currentBd.tax}% → {fmtINR(currentTaxAmt)}</span></div>}
                                  {currentBd.delivery > 0 && <div className="bca-cmp-breakdown-row"><span>Delivery</span><span>{fmtINR(currentBd.delivery)}</span></div>}
                                </div>
                              </td>
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bca-cmp-total-row">
                    <td className="bca-cmp-td-fixed" colSpan={6}><strong>Total</strong></td>
                    {bidHistoryData.map(s => {
                      const isLowest = s.currentTotal > 0 && s.currentTotal === minCurrentTotal;
                      const fLot = s.firstLotBreakdown || { discount: 0, tax: 0, delivery: 0 };
                      const cLot = s.currentLotBreakdown || { discount: 0, tax: 0, delivery: 0 };

                      return (
                        <React.Fragment key={s.id}>
                          <td className="bca-hist-td bca-hist-first-td">
                            <div className="bca-cmp-total-price">{s.firstTotal > 0 ? fmtINR(s.firstTotal) : '—'}</div>
                            {isLotOptionEffective && s.firstTotal > 0 && (
                              <div className="bca-cmp-breakdown" style={{ marginTop: '6px' }}>
                                <div className="bca-cmp-breakdown-title">BREAKDOWN</div>
                                {fLot.discount > 0 && (
                                  <div className="bca-cmp-breakdown-row bca-cmp-disc">
                                    <span>Discount</span>
                                    <span>{fLot.discountType === 'PERCENTAGE' ? `${fLot.discount}%` : fmtINR(fLot.discount)}</span>
                                  </div>
                                )}
                                {fLot.tax > 0 && (
                                  <div className="bca-cmp-breakdown-row">
                                    <span>Tax</span>
                                    <span>{fLot.taxType === 'PERCENTAGE' ? `${fLot.tax}%` : fmtINR(fLot.tax)}</span>
                                  </div>
                                )}
                                {fLot.delivery > 0 && (
                                  <div className="bca-cmp-breakdown-row">
                                    <span>Delivery Charge</span>
                                    <span>{fmtINR(fLot.delivery)}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className={`bca-hist-td bca-hist-current-td${isLowest ? ' bca-cmp-td-selected' : ''}`}>
                            <div className="bca-cmp-total-price">{s.currentTotal > 0 ? fmtINR(s.currentTotal) : '—'}</div>
                            {isLowest && <div className="bca-stag bca-stag-lowest bca-mt-xs">LOWEST CURRENT</div>}
                            {isLotOptionEffective && s.currentTotal > 0 && (
                              <div className="bca-cmp-breakdown" style={{ marginTop: '6px' }}>
                                <div className="bca-cmp-breakdown-title">BREAKDOWN</div>
                                {cLot.discount > 0 && (
                                  <div className="bca-cmp-breakdown-row bca-cmp-disc">
                                    <span>Discount</span>
                                    <span>{cLot.discountType === 'PERCENTAGE' ? `${cLot.discount}%` : fmtINR(cLot.discount)}</span>
                                  </div>
                                )}
                                {cLot.tax > 0 && (
                                  <div className="bca-cmp-breakdown-row">
                                    <span>Tax</span>
                                    <span>{cLot.taxType === 'PERCENTAGE' ? `${cLot.tax}%` : fmtINR(cLot.tax)}</span>
                                  </div>
                                )}
                                {cLot.delivery > 0 && (
                                  <div className="bca-cmp-breakdown-row">
                                    <span>Delivery Charge</span>
                                    <span>{fmtINR(cLot.delivery)}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                </tfoot>
              </table>
            </div>
          );
        })()}


        {viewMode === "by-supplier" && (() => {
          const isLotOptionEffective = isLotOption || !!bidHistoryApiData?.addLotOption;

          const supps = effectiveQuotations.map((q: any, index: number) => {
            const id = q.quotationId || q.supplierId || q._id || 'unknown';
            const rawName = (q.supplierName || q.organizationName || '').trim();
            const isMissingOrGeneric = !rawName || rawName.toLowerCase() === 'null' || rawName.toLowerCase() === 'undefined' || rawName.toLowerCase() === 'supplier';

            let name = rawName;
            if (isLotOptionEffective && isMissingOrGeneric) {
              name = effectiveQuotations.length > 1 ? `Supplier ${index + 1}` : 'Supplier';
            } else if (!name) {
              name = 'Supplier';
            }

            const vs = (q.verificationStatus || q.status || '').toLowerCase().trim();
            let badgeType = 'external';
            if (vs === 'verified' || (vs.includes('verified') && !vs.includes('unverified') && !vs.includes('required') && !vs.includes('not'))) {
              badgeType = 'verified';
            } else if (vs.includes('unverified') || vs.includes('not verified')) {
              badgeType = 'unverified';
            } else if (vs.includes('required') || vs.includes('pending')) {
              badgeType = 'warning';
            } else if (vs.includes('review')) {
              badgeType = 'review';
            }

            const itemsCount = (q.supplierQuotationItems && q.supplierQuotationItems.length > 0)
              ? q.supplierQuotationItems.length
              : lineItems.length;

            const total = (q.totalPrice !== undefined && q.totalPrice !== null)
              ? q.totalPrice
              : (q.supplierQuotationItems || []).reduce(
                  (sum: number, qi: any) => sum + (qi.subTotal ?? (qi.quotedAmount ?? qi.quotedPrice ?? 0) * (qi.quantity ?? 1)), 0
                );

            const outerRankRaw = (q.rank !== undefined && q.rank !== null && q.rank !== '')
              ? String(q.rank).trim().toUpperCase()
              : (q.supplierQuotationRank !== undefined && q.supplierQuotationRank !== null && q.supplierQuotationRank !== '')
                ? String(q.supplierQuotationRank).trim().toUpperCase()
                : '';

            return { id, name, badgeType, itemsCount, total, outerRankRaw, rawQuotation: q };
          });

          const validTotals = supps.map(s => s.total).filter(t => t > 0);
          const minTotal = validTotals.length > 0 ? Math.min(...validTotals) : 0;
          const lowestSupp = supps.find(s => s.total > 0 && s.total === minTotal) || supps[0];
          const sortedTotals = [...supps].filter(s => s.total > 0).sort((a, b) => a.total - b.total);

          return (
            <div className="bca-supplier-list">
              {supps.length === 0 ? (
                <div className="bca-empty">No supplier quotations found for this RFQ.</div>
              ) : (
                supps.map((s) => {
                  const isLowest = minTotal > 0 && s.total === minTotal;
                  const hasSelections = Object.keys(selections).length > 0;
                  const isSelected = hasSelections
                    ? (lineItems.length > 0 && lineItems.every((i: any) => selections[i.id || i.itemId || i._id] === s.id))
                    : (lowestSupp && lowestSupp.id === s.id);

                  const isExpanded = !!expandedSuppliers[s.id];

                  // Determine rank label strictly from supplierQuotation level rank (q.rank)
                  let rankLabel = '';
                  let isL1 = isLowest;
                  if (s.outerRankRaw) {
                    let cleanR = s.outerRankRaw;
                    if (!cleanR.startsWith('L') && !cleanR.startsWith('RANK')) {
                      cleanR = `L${cleanR}`;
                    }
                    rankLabel = cleanR.startsWith('RANK') ? cleanR : `Rank ${cleanR}`;
                    isL1 = s.outerRankRaw === 'L1' || s.outerRankRaw === '1' || cleanR === 'L1';
                  } else if (!isLotOptionEffective && s.total > 0) {
                    const idx = sortedTotals.findIndex(st => st.id === s.id);
                    if (idx >= 0) {
                      rankLabel = `Rank L${idx + 1}`;
                      isL1 = idx === 0;
                    }
                  }

                  return (
                    <div
                      key={s.id}
                      className={`bca-supplier-row${isSelected ? " bca-supplier-row-selected" : ""} bca-supplier-row-expanded`}
                    >
                      <div className="bca-supplier-row-header">
                        <div className="bca-supplier-row-left">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {isLotOptionEffective && (
                              <button
                                type="button"
                                className="bca-expand-plus-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedSuppliers(prev => ({ ...prev, [s.id]: !prev[s.id] }));
                                }}
                                title={isExpanded ? "Collapse item details" : "Expand item details"}
                              >
                                {isExpanded ? "−" : "+"}
                              </button>
                            )}
                            <div className="bca-supplier-row-name">{s.name}</div>
                            {isLotOptionEffective && rankLabel && (
                              <span className={`bca-stag ${isL1 ? 'bca-stag-lowest' : 'bca-stag-verified'}`} style={{ fontSize: '11px', fontWeight: 700 }}>
                                {rankLabel}
                              </span>
                            )}
                          </div>
                          <div className="bca-supplier-row-tags" style={{ marginTop: '4px' }}>
                            {s.badgeType === "verified"   && <span className="bca-stag bca-stag-verified">✓ VERIFIED</span>}
                            {s.badgeType === "unverified" && <span className="bca-stag bca-stag-external">⊙ UNVERIFIED</span>}
                            {s.badgeType === "warning"    && <span className="bca-stag bca-stag-warning">⚠ VERIFICATION REQUIRED</span>}
                            {s.badgeType === "external"   && <span className="bca-stag bca-stag-external">⊙ EXTERNAL</span>}
                            {s.badgeType === "review"     && <span className="bca-stag bca-stag-review">⊙ UNDER REVIEW</span>}
                            {isLowest && <span className="bca-stag bca-stag-lowest">LOWEST OVERALL</span>}
                          </div>
                        </div>
                        <div className="bca-supplier-row-right">
                          <div className="bca-supplier-row-total-block">
                            <div className="bca-supplier-row-total-label">TOTAL ({s.itemsCount} ITEMS)</div>
                            <div className="bca-supplier-row-total">{s.total > 0 ? fmtINR(s.total) : '—'}</div>
                          </div>
                          <button
                            className={`bca-btn ${isSelected ? "bca-btn-selected" : "bca-btn-outline"}`}
                            onClick={() => selectAllForSupplier(s.id)}
                          >
                            {isSelected ? "✓ Selected" : "Select All Items"}
                          </button>
                        </div>
                      </div>

                      {isLotOptionEffective && isExpanded && (() => {
                        const q = effectiveQuotations.find((qItem: any) => (qItem.quotationId || qItem.supplierId || qItem._id) === s.id);
                        return (
                          <div className="bca-supplier-expanded-content">
                            <div className="bca-supplier-expanded-title">
                              Items &amp; Breakdown for {s.name}
                            </div>
                            <div className="bca-table-wrap">
                              <table className="bca-table bca-expanded-table">
                                <thead>
                                  <tr>
                                    <th className="bca-th-num">#</th>
                                    <th>Material</th>
                                    <th>Cost Center</th>
                                    <th>Code</th>
                                    <th className="bca-td-center-text">Qty</th>
                                    <th className="bca-td-center-text">UOM</th>
                                    <th className="bca-th-right">Unit Price</th>
                                    <th className="bca-th-right">Subtotal</th>
                                    <th>Breakdown &amp; Rank</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {lineItems.map((item: any, idx: number) => {
                                    const qi = q ? getQuoteItemForRfqItem(q, item) : null;
                                    const price = qi?.quotedAmount ?? qi?.quotedPrice ?? 0;
                                    const qty = item.quantity || item.qty || 1;
                                    const subtotal = qi?.subTotal ?? (price * qty);
                                    const discount = qi?.discount ?? qi?.discountPercentage ?? 0;
                                    const tax = qi?.tax ?? qi?.taxPercentage ?? qi?.gst ?? 0;
                                    const delivery = qi?.deliveryCharge ?? qi?.deliveryAmount ?? 0;
                                    const rank = (qi?.rank ?? qi?.ranking ?? '').toString().toUpperCase().trim();

                                    const discAmt = (price * qty) * (discount / 100);
                                    const taxAmt = (price * qty) * (tax / 100);

                                    return (
                                      <tr key={item.id || idx}>
                                        <td className="bca-td-num">{idx + 1}</td>
                                        <td className="bca-td-material-bold">{item.description || item.name || '—'}</td>
                                        <td className="bca-cmp-td-muted">{item.costCenter || '—'}</td>
                                        <td className="bca-cmp-td-muted">{item.materialCode || item.code || '—'}</td>
                                        <td className="bca-td-center-text">{qty}</td>
                                        <td className="bca-td-center-text">{item.uom || '—'}</td>
                                        <td className="bca-td-price">{price > 0 ? fmtINR(price) : '—'}</td>
                                        <td className="bca-td-price bca-td-subtotal">{subtotal > 0 ? fmtINR(subtotal) : '—'}</td>
                                        <td>
                                          <div className="bca-expanded-breakdown">
                                            {discount > 0 && <span>Discount: {discount}% (-{fmtINR(discAmt)})</span>}
                                            {tax > 0 && <span>Tax: {tax}% (+{fmtINR(taxAmt)})</span>}
                                            {delivery > 0 && <span>Delivery: {fmtINR(delivery)}</span>}
                                            {rank && (
                                              <span className={`bca-cmp-breakdown-rank${rank === 'L1' ? ' bca-cmp-rank-l1' : ''} bca-rank-fit`}>
                                                Rank {rank}
                                              </span>
                                            )}
                                            {!discount && !tax && !delivery && !rank && <span className="bca-mono">—</span>}
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })
              )}
            </div>
          );
        })()}
      </div>

      {/* RFQ Documents Section */}
      {((rfq?.technicalSpecificationDocuments && rfq.technicalSpecificationDocuments.length > 0) ||
        (rfq?.termsConditionDocuments && rfq.termsConditionDocuments.length > 0)) && (
        <div className="bca-section-card">
          <div className="bca-section-header">
            <h3 className="bca-section-title">RFQ Documents</h3>
            <p className="bca-section-sub">Technical specifications, requirements, and Terms &amp; Conditions documents attached to this RFQ.</p>
          </div>

          {/* Technical Specification Documents */}
          {rfq?.technicalSpecificationDocuments && rfq.technicalSpecificationDocuments.length > 0 && (
            <div style={{ marginBottom: rfq?.termsConditionDocuments && rfq.termsConditionDocuments.length > 0 ? '24px' : '0' }}>
              <div className="bca-doc-group-title">
                <span className="bca-doc-icon bca-doc-icon-blue" style={{ width: '28px', height: '28px' }}><IconFile /></span>
                Technical Specification Documents
              </div>
              <div className="bca-docs-grid" style={{ marginTop: '12px' }}>
                {rfq.technicalSpecificationDocuments.map((doc: any, i: number) => (
                  <div key={`tech-${i}`} className="bca-doc-card">
                    <div className="bca-doc-info">
                      <div className="bca-doc-icon bca-doc-icon-blue"><IconFile /></div>
                      <div style={{ overflow: 'hidden' }}>
                        <div className="bca-doc-name" title={doc.fileName || doc.assetName}>{doc.fileName || doc.assetName || `Tech Spec Document ${i + 1}`}</div>
                        <div className="bca-doc-type">Tech Spec Doc</div>
                      </div>
                    </div>
                    <div className="bca-doc-actions">
                      <button
                        type="button"
                        className="bca-doc-action-btn bca-doc-eye"
                        title="Preview document"
                        disabled={loadingDocId === (doc.id || doc.assetId)}
                        onClick={() => handleDocumentAction(doc, 'preview')}
                      >
                        <IconEye />
                      </button>
                      <button
                        type="button"
                        className="bca-doc-action-btn bca-doc-download"
                        title="Download document"
                        disabled={loadingDocId === (doc.id || doc.assetId)}
                        onClick={() => handleDocumentAction(doc, 'download')}
                      >
                        <IconDownload />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Terms & Conditions Documents */}
          {rfq?.termsConditionDocuments && rfq.termsConditionDocuments.length > 0 && (
            <div>
              <div className="bca-doc-group-title">
                <span className="bca-doc-icon bca-doc-icon-amber" style={{ width: '28px', height: '28px' }}><IconFile /></span>
                Terms &amp; Conditions Documents
              </div>
              <div className="bca-docs-grid" style={{ marginTop: '12px' }}>
                {rfq.termsConditionDocuments.map((doc: any, i: number) => (
                  <div key={`terms-${i}`} className="bca-doc-card">
                    <div className="bca-doc-info">
                      <div className="bca-doc-icon bca-doc-icon-amber"><IconFile /></div>
                      <div style={{ overflow: 'hidden' }}>
                        <div className="bca-doc-name" title={doc.fileName || doc.assetName}>{doc.fileName || doc.assetName || `Terms Document ${i + 1}`}</div>
                        <div className="bca-doc-type">Terms &amp; Conditions</div>
                      </div>
                    </div>
                    <div className="bca-doc-actions">
                      <button
                        type="button"
                        className="bca-doc-action-btn bca-doc-eye"
                        title="Preview document"
                        disabled={loadingDocId === (doc.id || doc.assetId)}
                        onClick={() => handleDocumentAction(doc, 'preview')}
                      >
                        <IconEye />
                      </button>
                      <button
                        type="button"
                        className="bca-doc-action-btn bca-doc-download"
                        title="Download document"
                        disabled={loadingDocId === (doc.id || doc.assetId)}
                        onClick={() => handleDocumentAction(doc, 'download')}
                      >
                        <IconDownload />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Evaluation Questions & Answers Section */}
      {questions?.length > 0 && qaSuppliers?.length > 0 && (
        <div className="bca-section-card">
          <div className="bca-section-header">
            <h3 className="bca-section-title">Evaluation Questions &amp; Answers</h3>
            <p className="bca-section-sub">Responses submitted by each supplier for this RFQ.</p>
          </div>

          <div className="bca-qa-suppliers">
            {qaSuppliers?.map((supplier: any, sIdx: number) => {
              const displayName = supplier?.supplierName || supplier?.organizationName || `Supplier ${sIdx + 1}`;
              const answeredCount = questions?.filter((q: any) => {
                const match = getAnswerForQuestion(supplier, q);
                return Boolean(
                  (match?.answer && String(match.answer).trim() !== "") || match?.attachment?.fileName || match?.attachment?.id
                );
              }).length;

              return (
                <div
                  className="bca-qa-supplier-card"
                  key={supplier?.supplierRFQId ? `${supplier?.supplierRFQId}-${sIdx}` : sIdx}
                >
                  <div className="bca-qa-supplier-header">
                    <div className="bca-qa-supplier-left">
                      <span className="bca-qa-supplier-avatar">{getInitials(displayName)}</span>
                      <span className="bca-qa-supplier-name">{displayName}</span>
                    </div>
                    <span className="bca-qa-supplier-badge">
                      {answeredCount}/{questions?.length} answered
                    </span>
                  </div>

                  <div className="bca-qa-list">
                    {questions?.map((q: any, qIdx: number) => {
                      const match = getAnswerForQuestion(supplier, q);
                      const display =
                        match?.answer && String(match?.answer).trim() !== ""
                          ? match?.answer
                          : match?.attachment?.fileName || "";

                      return (
                        <div className="bca-qa-item" key={q?.id || qIdx}>
                          <div className="bca-qa-question-row">
                            <div className="bca-qa-question-left">
                              <span className="bca-qa-index">Q{qIdx + 1}</span>
                              <span className="bca-qa-question-text">{q?.question}</span>
                            </div>
                            <div className="bca-qa-tags">
                              {q?.isRequired && <span className="bca-qa-req-badge">Required</span>}
                              <span className="bca-qa-type-badge">{formatQuestionType(q?.questionType)}</span>
                            </div>
                          </div>

                          {display || match?.attachment ? (
                            <div className="bca-qa-answer-box">
                              <span>{display}</span>
                              {match?.attachment && (
                                <div className="bca-doc-actions">
                                  <button
                                    type="button"
                                    className="bca-doc-action-btn bca-doc-eye"
                                    title="Preview attachment"
                                    onClick={() => handleDocumentAction(match?.attachment, 'preview')}
                                  >
                                    <IconEye />
                                  </button>
                                  <button
                                    type="button"
                                    className="bca-doc-action-btn bca-doc-download"
                                    title="Download attachment"
                                    onClick={() => handleDocumentAction(match?.attachment, 'download')}
                                  >
                                    <IconDownload />
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="bca-qa-empty-text">No response yet.</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Document Preview Overlay Modal */}
      {viewingDoc && (
        <div className="bca-modal-overlay">
          <div className="bca-doc-viewer-modal">
            <div className="bca-doc-viewer-header">
              <span className="bca-doc-viewer-title">{viewingDoc?.fileName}</span>
              <button
                className="bca-back-circle-btn"
                onClick={() => {
                  if (viewingDoc?.url?.startsWith('blob:')) {
                    URL.revokeObjectURL(viewingDoc.url);
                  }
                  setViewingDoc(null);
                }}
              >
                <IconClose />
              </button>
            </div>
            <iframe
              src={viewingDoc?.url}
              title={viewingDoc?.fileName}
              className="bca-doc-viewer-iframe"
            />
          </div>
        </div>
      )}

      <div className="bca-bottom-bar">
        <div className="bca-bottom-left">
          <span className={`bca-bar-status ${isBidFrozen ? "bca-bar-frozen" : "bca-bar-active"}`}>{isBidFrozen ? "Bid Frozen" : "Bidding Active"}</span>
          <span className="bca-bar-text">{selectedItemCount} of {lineItems.length} Line Items Selected</span>
          <span className="bca-bar-text">{distinctSelected.length} Supplier{distinctSelected.length !== 1 ? "s" : ""}</span>
          {totalAwardValue > 0 && <span className="bca-total-award">Total Award Value: <strong>{fmtINR(totalAwardValue)}</strong></span>}
        </div>
        <button 
          className={`bca-btn ${barButtonDisabled ? "bca-btn-disabled" : "bca-btn-primary"}`} 
          disabled={barButtonDisabled}
          onClick={() => {
            if (isBidFrozen) setShowAwardModal(true);
            else setShowFreezeModal(true);
          }}
        >
          {barButtonLabel}
        </button>
      </div>

      {showFreezeModal && (
        <div className="bca-modal-overlay">
          <div className="bca-modal-content">
            <h2 className="bca-modal-title">Freeze Bidding?</h2>
            <p className="bca-modal-text">
              Freezing the bid will stop suppliers from submitting or modifying quotations.
              You can then compare the final bids and proceed with the award.
            </p>
            <div className="bca-modal-stats">
              <div className="bca-modal-stat">
                <div className="bca-modal-stat-label">CURRENT PARTICIPANTS</div>
                <div className="bca-modal-stat-value">{displaySuppliers.length}</div>
              </div>
              <div className="bca-modal-stat">
                <div className="bca-modal-stat-label">LINE ITEMS</div>
                <div className="bca-modal-stat-value">{lineItems.length}</div>
              </div>
            </div>
            <div className="bca-modal-actions">
              <button className="bca-btn bca-btn-ghost bca-modal-cancel" onClick={() => setShowFreezeModal(false)}>Cancel</button>
              <button className="bca-btn bca-btn-primary bca-modal-confirm" onClick={() => { setShowFreezeModal(false); onFreeze(); }}>Freeze Bid</button>
            </div>
          </div>
        </div>
      )}

      {showAwardModal && (() => {
        // Group selections by supplier ID to calculate totals and item counts per selected supplier
        const supplierSummaryMap: Record<string, { name: string; itemsCount: number; totalValue: number }> = {};

        lineItems.forEach((item: any) => {
          const itemId = item.id || item.itemId || item._id;
          const sid = selections[itemId];
          if (!sid) return;

          const quotation = effectiveQuotations.find(
            (q: any) => (q.quotationId || q.supplierId || q._id) === sid
          );
          const sName = quotation?.supplierName || quotation?.organizationName || 'Supplier';

          const qi = quotation ? getQuoteItemForRfqItem(quotation, item) : null;
          const qty = item?.quantity || item?.qty || 1;
          const rawSubtotal = qi?.subTotal ?? null;
          const rawUnitPrice = qi?.quotedAmount ?? qi?.quotedPrice ?? 0;
          const subtotal = rawSubtotal ?? (rawUnitPrice * qty);

          if (!supplierSummaryMap[sid]) {
            supplierSummaryMap[sid] = { name: sName, itemsCount: 0, totalValue: 0 };
          }
          supplierSummaryMap[sid].itemsCount += 1;
          supplierSummaryMap[sid].totalValue += subtotal;
        });

        const selectedSuppliersList = Object.values(supplierSummaryMap);
        const displayList = selectedSuppliersList.length > 0
          ? selectedSuppliersList
          : displaySuppliers.slice(0, 1).map((s: any) => ({
              name: s.name || 'Global Supplies',
              itemsCount: lineItems.length || 1,
              totalValue: s.total || totalAwardValue,
            }));

        return (
          <div className="bca-modal-overlay">
            <div className="bca-modal-content bca-modal-lg">
              {awardSuccess ? (
                <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>✅</div>
                  <h2 className="bca-modal-title" style={{ color: '#059669' }}>RFQ Awarded Successfully!</h2>
                  <p className="bca-modal-text">The award has been processed. Selected suppliers have been notified.</p>
                  <div className="bca-modal-stats" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '2rem' }}>
                    <div className="bca-modal-stat">
                      <div className="bca-modal-stat-label">AWARDED VALUE</div>
                      <div className="bca-modal-stat-value" style={{ color: '#059669', fontSize: '1.25rem', fontWeight: 700 }}>{fmtINR(totalAwardValue)}</div>
                    </div>
                    <div className="bca-modal-stat">
                      <div className="bca-modal-stat-label">ITEMS AWARDED</div>
                      <div className="bca-modal-stat-value" style={{ fontSize: '1.25rem', fontWeight: 700 }}>{selectedItemCount}</div>
                    </div>
                  </div>
                  <div className="bca-modal-actions" style={{ justifyContent: 'center', marginTop: '1.5rem' }}>
                    <button
                      className="bca-btn bca-btn-primary"
                      onClick={() => { setShowAwardModal(false); setAwardSuccess(false); }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="bca-modal-title bca-modal-title-lg">Confirm Award Selection</h2>
                  <p className="bca-modal-text bca-modal-text-lg">
                    Review the selected supplier(s) and confirm the award for this RFQ.
                  </p>
                  
                  {displayList.map((sup, idx) => (
                    <div key={idx} className="bca-award-veri-card" style={{ marginBottom: '1rem' }}>
                      <div className="bca-award-veri-header">
                        <div>
                          <div className="bca-award-veri-name">{sup.name}</div>
                          <div className="bca-stag bca-stag-external bca-mt-sm">&#8857; SELECTED SUPPLIER</div>
                        </div>
                        <div className="bca-award-veri-totals">
                          <div className="bca-award-veri-items">{sup.itemsCount} {sup.itemsCount === 1 ? 'Item' : 'Items'}</div>
                          <div className="bca-award-veri-price">{fmtINR(sup.totalValue)}</div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {awardError && (
                    <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', margin: '1rem 0', color: '#dc2626', fontSize: '13px' }}>
                      ⚠ {awardError}
                    </div>
                  )}

                  <div className="bca-modal-footer">
                    <div className="bca-modal-footer-left">
                      <span className="bca-total-award">Total Award Value: <strong>{fmtINR(totalAwardValue)}</strong></span>
                    </div>
                    <div className="bca-modal-actions">
                      <button
                        className="bca-btn bca-btn-ghost bca-modal-cancel"
                        onClick={() => { setShowAwardModal(false); setAwardError(null); }}
                        disabled={awardingRfq}
                      >
                        Cancel
                      </button>
                      <button
                        className={`bca-btn ${awardingRfq ? 'bca-btn-disabled' : 'bca-btn-primary'} bca-modal-confirm`}
                        onClick={handleConfirmAward}
                        disabled={awardingRfq}
                      >
                        {awardingRfq ? 'Awarding...' : 'Confirm Award'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default BidComparisonAwardView;
