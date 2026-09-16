import React, { useState, useMemo, useEffect } from "react";
import "./BidComparisonAward.css";
import { Button } from "@vosox/shared-ui";
import { fetchBuyerAsset } from "../api/platformApi";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList
} from "recharts";

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

const ChartTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bca-chart-tooltip">
      <div className="bca-chart-tooltip-name">{d.fullName}</div>
      <div className="bca-chart-tooltip-price">₹{d.price.toLocaleString('en-IN')}</div>
      {d.isLowest && <div className="bca-chart-tooltip-badge">✓ Lowest Price</div>}
    </div>
  );
};

interface BidComparisonAwardViewProps {
  rfq: any;
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
  rfq, loading, error, freezingBid, onFreeze, onBack, onChatClick
}) => {
  const [viewMode, setViewMode] = useState<"summary" | "comparison" | "by-supplier">("summary");
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState("all");
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [autoSelected, setAutoSelected] = useState(false);
  const [expandedSuppliers, setExpandedSuppliers] = useState<Record<string, boolean>>({});
  const [viewingDoc, setViewingDoc] = useState<{ fileName: string; url: string; contentType: string } | null>(null);
  const [loadingDocId, setLoadingDocId] = useState<string | null>(null);

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
    if (rfq?.items && rfq.items.length > 0) {
      return rfq.items.map((item: any) => ({
        id: item.id || item.itemId || item._id,
        description: item.description || item.materialName || item.name || '—',
        costCenter: item.costCenter || item.costCenterCode || '—',
        quantity: item.quantity || item.qty || 1,
        uom: item.uom || item.unit || 'PCS',
        materialCode: item.materialCode || item.code || '',
      }));
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

  const selectAllForSupplier = (suppId: string) => {
    const newSel: Record<string, string> = {};
    lineItems.forEach((item: any) => { newSel[item.id || item.itemId] = suppId; });
    setSelections(newSel);
  };

  if (loading) {
    return (<div className="bca-loading"><div className="bca-spinner" /><span>Loading Bid Comparison...</span></div>);
  }
  if (error && !rfq) {
    return (<div className="bca-error"><p>{error}</p><button className="bca-btn bca-btn-outline" onClick={onBack}>Back to RFQs</button></div>);
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
          <button className="bca-back-circle-btn" onClick={onBack} title="Back to RFQs">
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
          <Button variant="primary" className="bca-btn-icon-gap" onClick={() => setShowFreezeModal(true)} disabled={freezingBid || isBidFrozen}>
            <span className="bca-icon-lock">
              <span className="bca-icon-lock-shackle"></span>
              <span className="bca-icon-lock-body"></span>
            </span>
            <span>{freezingBid ? "Freezing..." : isBidFrozen ? "Bid Frozen" : "Freeze Bid"}</span>
          </Button>
          {Array.isArray(rfq?.supplierIds) && rfq.supplierIds.length > 0 && (
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
                  <option key={m.id || m.itemId || m._id} value={m.id || m.itemId || m._id}>
                    {m.description || m.name || `Item ${m.id}`}
                  </option>
                ))}
              </select>
            </div>
            <div className="bca-chart-body">
              <ResponsiveContainer width="100%" height={Math.max(220, chartData.length * 56)}>
                <BarChart
                  layout="vertical"
                  data={chartData}
                  margin={{ top: 12, right: 64, left: 16, bottom: 12 }}
                  barCategoryGap="25%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={(v: number) => v >= 1000 ? `₹${(v/1000).toFixed(0)}k` : `₹${v}`}
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 12, fill: '#6b7280', fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                    width={130}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(37,99,235,0.04)' }} />
                  <Bar dataKey="price" radius={[0, 6, 6, 0] as any} maxBarSize={32}>
                    <LabelList
                      dataKey="price"
                      position="right"
                      formatter={(v: any) => v > 0 ? (v >= 1000 ? `₹${(v/1000).toFixed(1)}k` : `₹${v}`) : ''}
                      style={{ fontSize: 11, fontWeight: 600, fill: '#374151' }}
                    />
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.isLowest ? '#059669' : entry.color}
                        opacity={entry.isLowest ? 1 : 0.82}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bca-chart-legend">
              {chartSuppliers.map((s, i) => {
                const isLow = chartData[i]?.isLowest;
                return (
                  <div key={s.id} className="bca-chart-legend-item">
                    <span className="bca-chart-legend-dot" style={{ background: isLow ? '#059669' : s.color }} />
                    <span style={{ color: isLow ? '#059669' : undefined, fontWeight: isLow ? 600 : undefined }}>
                      {s.name}{isLow ? ' ✓ Lowest' : ''}
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
              : isLotOption
                ? "Bid Comparison"
                : viewMode === "comparison"
                  ? "Bid Comparison"
                  : "Select by Supplier"}
          </h2>
          <p className="bca-award-subtitle">
            {viewMode === "summary"
              ? "Lowest-priced supplier auto-selected for every line item. Compare manually or award one supplier for all items."
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
        </div>
      </div>

      <div className="bca-award-subbar">
        <div className="bca-award-chips">
          <span className="bca-award-chip">
            {viewMode === "summary" ? "Award Selection" : viewMode === "comparison" ? "Bid Comparison" : "Select by Supplier"}
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
            const vs = (q.verificationStatus || q.status || '').toLowerCase();
            let badgeType = 'external';
            if (vs.includes('verified') && !vs.includes('required')) badgeType = 'verified';
            else if (vs.includes('required') || vs.includes('pending')) badgeType = 'warning';
            else if (vs.includes('review')) badgeType = 'review';
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
                          {s.badgeType === "verified" && <span className="bca-stag bca-stag-verified">✓ VERIFIED</span>}
                          {s.badgeType === "warning"  && <span className="bca-stag bca-stag-warning">⚠ VERIFICATION REQUIRED</span>}
                          {s.badgeType === "external" && <span className="bca-stag bca-stag-external">⊙ EXTERNAL</span>}
                          {s.badgeType === "review"   && <span className="bca-stag bca-stag-review">⊙ UNDER REVIEW</span>}
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


        {viewMode === "by-supplier" && (() => {
          const supps = effectiveQuotations.map((q: any) => {
            const id = q.quotationId || q.supplierId || q._id || 'unknown';
            const name = q.supplierName || q.organizationName || 'Supplier';
            const vs = (q.verificationStatus || q.status || '').toLowerCase();
            let badgeType = 'external';
            if (vs.includes('verified') && !vs.includes('required')) badgeType = 'verified';
            else if (vs.includes('required') || vs.includes('pending')) badgeType = 'warning';
            else if (vs.includes('review')) badgeType = 'review';

            const itemsCount = (q.supplierQuotationItems && q.supplierQuotationItems.length > 0)
              ? q.supplierQuotationItems.length
              : lineItems.length;

            const total = (q.totalPrice !== undefined && q.totalPrice !== null)
              ? q.totalPrice
              : (q.supplierQuotationItems || []).reduce(
                  (sum: number, qi: any) => sum + (qi.subTotal ?? (qi.quotedAmount ?? qi.quotedPrice ?? 0) * (qi.quantity ?? 1)), 0
                );

            return { id, name, badgeType, itemsCount, total };
          });

          const validTotals = supps.map(s => s.total).filter(t => t > 0);
          const minTotal = validTotals.length > 0 ? Math.min(...validTotals) : 0;
          const lowestSupp = supps.find(s => s.total > 0 && s.total === minTotal) || supps[0];

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

                  return (
                    <div
                      key={s.id}
                      className={`bca-supplier-row${isSelected ? " bca-supplier-row-selected" : ""} bca-supplier-row-expanded`}
                    >
                      <div className="bca-supplier-row-header">
                        <div className="bca-supplier-row-left">
                          <div className="bca-supplier-row-name">{s.name}</div>
                          <div className="bca-supplier-row-tags">
                            {s.badgeType === "verified"  && <span className="bca-stag bca-stag-verified">✓ VERIFIED</span>}
                            {s.badgeType === "warning"   && <span className="bca-stag bca-stag-warning">⚠ VERIFICATION REQUIRED</span>}
                            {s.badgeType === "external"  && <span className="bca-stag bca-stag-external">⊙ EXTERNAL</span>}
                            {s.badgeType === "review"    && <span className="bca-stag bca-stag-review">⊙ UNDER REVIEW</span>}
                            {isLowest && <span className="bca-stag bca-stag-lowest">LOWEST OVERALL</span>}
                          </div>
                        </div>
                        <div className="bca-supplier-row-right">
                          <div className="bca-supplier-row-total-block">
                            <div className="bca-supplier-row-total-label">TOTAL ({s.itemsCount} ITEMS)</div>
                            <div className="bca-supplier-row-total">{s.total > 0 ? fmtINR(s.total) : '—'}</div>
                          </div>
                          {isLotOption && (
                            <button
                              className="bca-btn-expand-toggle"
                              onClick={() => setExpandedSuppliers(prev => ({ ...prev, [s.id]: !prev[s.id] }))}
                            >
                              <span>{isExpanded ? "Collapse" : "Expand"}</span>
                              <span className={`bca-expand-arrow${isExpanded ? " bca-expand-arrow-open" : ""}`}>▼</span>
                            </button>
                          )}
                          <button
                            className={`bca-btn ${isSelected ? "bca-btn-selected" : "bca-btn-outline"}`}
                            onClick={() => selectAllForSupplier(s.id)}
                          >
                            {isSelected ? "✓ Selected" : "Select All Items"}
                          </button>
                        </div>
                      </div>

                      {isLotOption && isExpanded && (() => {
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
      {questions.length > 0 && qaSuppliers.length > 0 && (
        <div className="bca-section-card">
          <div className="bca-section-header">
            <h3 className="bca-section-title">Evaluation Questions &amp; Answers</h3>
            <p className="bca-section-sub">Responses submitted by each supplier for this RFQ.</p>
          </div>

          <div className="bca-qa-suppliers">
            {qaSuppliers.map((supplier: any, sIdx: number) => {
              const displayName = supplier?.supplierName || supplier?.organizationName || `Supplier ${sIdx + 1}`;
              const answeredCount = questions.filter((q: any) => {
                const match = getAnswerForQuestion(supplier, q);
                return Boolean(
                  (match?.answer && String(match.answer).trim() !== "") || match?.attachment?.fileName || match?.attachment?.id
                );
              }).length;

              return (
                <div
                  className="bca-qa-supplier-card"
                  key={supplier?.supplierRFQId ? `${supplier.supplierRFQId}-${sIdx}` : sIdx}
                >
                  <div className="bca-qa-supplier-header">
                    <div className="bca-qa-supplier-left">
                      <span className="bca-qa-supplier-avatar">{getInitials(displayName)}</span>
                      <span className="bca-qa-supplier-name">{displayName}</span>
                    </div>
                    <span className="bca-qa-supplier-badge">
                      {answeredCount}/{questions.length} answered
                    </span>
                  </div>

                  <div className="bca-qa-list">
                    {questions.map((q: any, qIdx: number) => {
                      const match = getAnswerForQuestion(supplier, q);
                      const display =
                        match?.answer && String(match.answer).trim() !== ""
                          ? match.answer
                          : match?.attachment?.fileName || "";

                      return (
                        <div className="bca-qa-item" key={q.id || qIdx}>
                          <div className="bca-qa-question-row">
                            <div className="bca-qa-question-left">
                              <span className="bca-qa-index">Q{qIdx + 1}</span>
                              <span className="bca-qa-question-text">{q.question}</span>
                            </div>
                            <div className="bca-qa-tags">
                              {q.isRequired && <span className="bca-qa-req-badge">Required</span>}
                              <span className="bca-qa-type-badge">{formatQuestionType(q.questionType)}</span>
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
                                    onClick={() => handleDocumentAction(match.attachment, 'preview')}
                                  >
                                    <IconEye />
                                  </button>
                                  <button
                                    type="button"
                                    className="bca-doc-action-btn bca-doc-download"
                                    title="Download attachment"
                                    onClick={() => handleDocumentAction(match.attachment, 'download')}
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
              <span className="bca-doc-viewer-title">{viewingDoc.fileName}</span>
              <button
                className="bca-back-circle-btn"
                onClick={() => {
                  if (viewingDoc.url.startsWith('blob:')) {
                    URL.revokeObjectURL(viewingDoc.url);
                  }
                  setViewingDoc(null);
                }}
              >
                <IconClose />
              </button>
            </div>
            <iframe
              src={viewingDoc.url}
              title={viewingDoc.fileName}
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

      {showAwardModal && (
        <div className="bca-modal-overlay">
          <div className="bca-modal-content bca-modal-lg">
            <h2 className="bca-modal-title bca-modal-title-lg">Complete Verification to Reward</h2>
            <p className="bca-modal-text bca-modal-text-lg">
              One or more selected suppliers require verification or registration before the reward can be processed.
            </p>
            
            <div className="bca-award-veri-card">
              <div className="bca-award-veri-header">
                <div>
                  <div className="bca-award-veri-name">Global Supplies</div>
                  <div className="bca-stag bca-stag-external bca-mt-sm">&#8857; EXTERNAL SUPPLIER</div>
                </div>
                <div className="bca-award-veri-totals">
                  <div className="bca-award-veri-items">6 Items</div>
                  <div className="bca-award-veri-price">₹16,23,271</div>
                </div>
              </div>
              
              <div className="bca-award-veri-body">
                <p>This supplier is not registered on the portal. Registration and verification will be requested by email at <strong>contact@globalsupplies.com</strong>.</p>
                <div className="bca-award-veri-steps">
                  <span>1. Send Link</span> <span className="bca-step-sep">&mdash;</span> 
                  <span>2. Registers</span> <span className="bca-step-sep">&mdash;</span> 
                  <span>3. Verification</span> <span className="bca-step-sep">&mdash;</span> 
                  <span>4. Review</span> <span className="bca-step-sep">&mdash;</span> 
                  <span>5. Reward</span>
                </div>
                
                <div className="bca-award-veri-form">
                  <label className="bca-award-veri-label">Verification Template</label>
                  <select className="bca-award-veri-select">
                    <option>Standard Supplier Verification</option>
                  </select>
                </div>
                
                <button className="bca-btn bca-btn-primary bca-btn-block bca-mt-md">
                  Send Registration &amp; Verification
                </button>
              </div>
            </div>

            <div className="bca-modal-footer">
              <div className="bca-modal-footer-left">
                <span className="bca-total-award">Total Award Value: <strong>{fmtINR(totalAwardValue)}</strong></span>
              </div>
              <div className="bca-modal-actions">
                <button className="bca-btn bca-btn-ghost bca-modal-cancel" onClick={() => setShowAwardModal(false)}>Cancel</button>
                <button className="bca-btn bca-btn-disabled" disabled>Confirm Award</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BidComparisonAwardView;
