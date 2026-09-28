import React, { useState, useEffect, useRef } from 'react';
import './EAuctionWidget.css';
import { FaArrowRight, FaBolt, FaDownload, FaEnvelope, FaFileUpload, FaKey, FaTimes } from 'react-icons/fa';
import {
  fetchRFQMasterData,
  fetchRFQById,
  fetchSupplierQuotationBySupplierId,
  submitSupplierQuotation,
  type RFQDetailResponse,
  type SupplierQuotationByIdItem,
  type SubmitQuotationPayload,
} from '../api/supplierApi';
import { QUOTATION_EXCEL_HEADERS, buildCsv, parseCsv, downloadCsv } from '../utils/quotationExcel';
import { toastService } from '@vosox/shared-ui';
import { useOtpVerification, getCookie, deleteCookie, VERIFICATION_TOKEN_COOKIE, VERIFICATION_TOKEN_STORAGE_KEY, OTP_EXPIRY_STORAGE_KEY } from '../hooks/useOtpVerification';

/* ---------------------------------- Interfaces ---------------------------------- */

export interface LiveAuctionItem {
  id: string;
  supplierRFQId?: string;
  name: string;
  itemCode: string;
  organizationName: string;
  deliveryLocation: string;
  endDate: string;
  formattedEndDate: string;
  status?: string | null;
}

interface QuoteLineItem {
  deliveryCharge: number;
  deliveryType: string;
  discount: number;
  discountType: string;
  tax: number;
  taxType: string;
  quotedPrice: number;
  subTotal: number;
  quotedAmount: number;
  isLineitemAvailable: boolean;
}

interface EAuctionWidgetProps {
  supplierId: string | null;
}

const formatEndDateStr = (dateStr?: string) => {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dateFormatted = d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const timeFormatted = d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return `${dateFormatted}, ${timeFormatted}`;
  } catch {
    return dateStr;
  }
};

const IconChevronLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const IconChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const formatRank = (val: any): string => {
  if (val == null || val === "") return "";
  if (typeof val === "object") return String(val.rank ?? val.value ?? "");
  return String(val);
};

const IconBoltFilled = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

/* ---------------------------------- Component ---------------------------------- */

const PAGE_SIZE = 6;
// The rfq-master-data endpoint returns a bare array with no total, so the count is
// resolved with one wide fetch when the board opens.
const TOTAL_COUNT_FETCH_LIMIT = 1000;

export const EAuctionWidget: React.FC<EAuctionWidgetProps> = ({ supplierId }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [auctions, setAuctions] = useState<LiveAuctionItem[]>([]);
  const [selectedLot, setSelectedLot] = useState<LiveAuctionItem | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalAuctions, setTotalAuctions] = useState<number>(0);
  const [hasNextPage, setHasNextPage] = useState<boolean>(false);
  const knownTotalRef = useRef<number>(0);

  const handleCloseEauctionModal = () => {
    setIsModalOpen(false);
    setCurrentPage(1);
    setSelectedLot(null);
  };

  // API State for selected RFQ details & existing quotation
  const [selectedRfqDetails, setSelectedRfqDetails] = useState<RFQDetailResponse | null>(null);
  const [ownQuotation, setOwnQuotation] = useState<SupplierQuotationByIdItem | null>(null);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const [loadingApi, setLoadingApi] = useState<boolean>(false);

  // The RFQ's own currency (e.g. "INR", "USD") — RFQDetailResponse doesn't
  // declare this field, but the supplier's own quotation does, so fall back
  // to that. Left blank (not defaulted to "INR") when neither returns one,
  // since guessing a currency could mislead the supplier.
  const currency = (selectedRfqDetails as any)?.currency || ownQuotation?.currency || "";
  const fmtCurrency = (val: number) => `${(val || 0).toFixed(2)}${currency ? ` ${currency}` : ""}`;

  // Supplier's rank on the current lot (single-lot / addLotOption bidding only)
  const headerRank = React.useMemo(() => formatRank(
    ownQuotation?.rank ??
    (selectedRfqDetails?.supplierQuotation?.[0] as any)?.rank ??
    (selectedRfqDetails as any)?.suppliers?.[0]?.rank ??
    (selectedRfqDetails as any)?.suppliers?.rank
  ), [ownQuotation, selectedRfqDetails]);

  // Per-item ranks (line-item / non-lot bidding only)
  const allQuotationItems = React.useMemo(() => {
    const items: any[] = [];
    const pushItems = (arr: any) => {
      if (Array.isArray(arr)) items.push(...arr);
    };
    pushItems(ownQuotation?.supplierQuotationItems);
    pushItems(selectedRfqDetails?.supplierQuotationItems);
    if (Array.isArray(selectedRfqDetails?.supplierQuotation)) {
      selectedRfqDetails.supplierQuotation.forEach((sq: any) => pushItems(sq?.supplierQuotationItems));
    }
    return items;
  }, [ownQuotation, selectedRfqDetails]);

  // Form State for SUBMIT COMPETITIVE BID
  const [deliveryCharge, setDeliveryCharge] = useState<string>("0.00");
  const [deliveryType, setDeliveryType] = useState<string>("PERCENTAGE");
  const [discount, setDiscount] = useState<string>("0.00");
  const [discountType, setDiscountType] = useState<string>("PERCENTAGE");
  const [tax, setTax] = useState<string>("0.00");
  const [taxType, setTaxType] = useState<string>("PERCENTAGE");
  const [totalPriceQuote, setTotalPriceQuote] = useState<string>("0");
  const [itemPrices, setItemPrices] = useState<{ [key: string]: string }>({});
  const [quoteLineItems, setQuoteLineItems] = useState<{ [supplierRFQItemId: string]: QuoteLineItem }>({});

  const [submittingBid, setSubmittingBid] = useState<boolean>(false);
  const [submitBidError, setSubmitBidError] = useState<string | null>(null);
  const [bidSubmittedMessage, setBidSubmittedMessage] = useState<string | null>(null);

  const fetchLiveBidsData = async (page: number = currentPage) => {
    if (!supplierId) {
      setAuctions([]);
      setSelectedLot(null);
      return;
    }
    setLoadingApi(true);
    const startIndex = (page - 1) * PAGE_SIZE;
    try {
      const res = await fetchRFQMasterData({
        index: startIndex,
        limit: PAGE_SIZE,
        supplierId,
        status: "LIVE",
      });

      const rawList = Array.isArray(res)
        ? res
        : (res as any)?.data && Array.isArray((res as any).data)
          ? (res as any).data
          : (res as any)?.rfqs && Array.isArray((res as any).rfqs)
            ? (res as any).rfqs
            : [];

      const reportedTotal =
        (res as any)?.totalCount ??
        (res as any)?.total ??
        (res as any)?.totalRecords ??
        null;

      if (typeof reportedTotal === 'number') {
        knownTotalRef.current = reportedTotal;
        setTotalAuctions(reportedTotal);
        setHasNextPage(startIndex + rawList.length < reportedTotal);
      } else if (knownTotalRef.current > 0) {
        setHasNextPage(startIndex + rawList.length < knownTotalRef.current);
      } else {
        // No total known yet: a full page means there is more to come
        setHasNextPage(rawList.length === PAGE_SIZE);
        setTotalAuctions((prev) => Math.max(prev, startIndex + rawList.length));
      }

      if (rawList.length > 0) {
        const mapped: LiveAuctionItem[] = rawList.map((item: any, idx: number) => {
          const endDateRaw = item.endDate || item.end_date || item.closingDate || "";
          const orgName = item.organizationName || item.organization_name || item.orgName || item.companyName || "IBM Technologies Pvt ltd";
          const loc = item.deliveryLocation || item.delivery_location || item.location || "N/A";

          return {
            id: item.rfqId || item.id || `live-rfq-${idx}`,
            supplierRFQId: item.supplierRFQId || item.supplier_rfq_id,
            name: item.title || item.rfqTitle || `Live Sourcing Tender #${idx + 1}`,
            itemCode: item.rfqNumber || item.rfq_number || `RFQ-${idx + 1}`,
            organizationName: orgName,
            deliveryLocation: loc,
            endDate: endDateRaw,
            formattedEndDate: formatEndDateStr(endDateRaw),
            status: item.status || null,
          };
        });

        setAuctions(mapped);
        setSelectedLot((prev) => prev ? (mapped.find(m => m.id === prev.id) || mapped[0]) : mapped[0]);
      } else {
        setAuctions([]);
        setSelectedLot(null);
        // Landed on an empty page (rows removed since last fetch) - step back
        if (page > 1) setCurrentPage(page - 1);
      }
    } catch (err) {
      console.error("Error fetching live RFQ master data:", err);
      setAuctions([]);
      setSelectedLot(null);
      setTotalAuctions(0);
      setHasNextPage(false);
    } finally {
      setLoadingApi(false);
    }
  };

  // Resolve the true total tender count (the list endpoint does not report one)
  const fetchLiveBidsTotal = async () => {
    if (!supplierId) return;
    try {
      const res = await fetchRFQMasterData({
        index: 0,
        limit: TOTAL_COUNT_FETCH_LIMIT,
        supplierId,
        status: "LIVE",
      });

      const reportedTotal =
        (res as any)?.totalCount ?? (res as any)?.total ?? (res as any)?.totalRecords ?? null;

      const fullList = Array.isArray(res)
        ? res
        : (res as any)?.data && Array.isArray((res as any).data)
          ? (res as any).data
          : (res as any)?.rfqs && Array.isArray((res as any).rfqs)
            ? (res as any).rfqs
            : [];

      const total = typeof reportedTotal === 'number' ? reportedTotal : fullList.length;
      knownTotalRef.current = total;
      setTotalAuctions(total);
      setHasNextPage((prev) => (total > 0 ? currentPage * PAGE_SIZE < total : prev));
    } catch (err) {
      console.error("Error fetching live RFQ total count:", err);
    }
  };

  useEffect(() => {
    fetchLiveBidsData(currentPage);
  }, [isModalOpen, currentPage, supplierId]);

  useEffect(() => {
    knownTotalRef.current = 0;
    fetchLiveBidsTotal();
  }, [isModalOpen, supplierId]);

  const loadRfqDetailsAndQuotation = async (rfqId: string) => {
    setLoadingDetails(true);
    let isAddLotOption = false;
    try {
      const [detailsRes, quoteRes] = await Promise.all([
        fetchRFQById(rfqId),
        fetchSupplierQuotationBySupplierId(rfqId),
      ]);

      if (detailsRes && !('statusCode' in detailsRes) && 'title' in detailsRes) {
        const det = detailsRes as RFQDetailResponse;
        setSelectedRfqDetails(det);
        isAddLotOption = Boolean(det.addLotOption);

        // Enrich auction list row with detailed RFQ info (delivery location, endDate, orgName)
        setAuctions((prev) =>
          prev.map((auc) => {
            if (auc.id === rfqId) {
              const loc = det.deliveryLocation || auc.deliveryLocation;
              const end = det.endDate || auc.endDate;
              const org = (det as any).organizationName || auc.organizationName;
              return {
                ...auc,
                deliveryLocation: loc,
                organizationName: org,
                endDate: end,
                formattedEndDate: end ? formatEndDateStr(end) : auc.formattedEndDate,
              };
            }
            return auc;
          })
        );

        // Pre-fill item prices if available
        const prices: { [key: string]: string } = {};
        if (det.items) {
          det.items.forEach((item, idx) => {
            const key = item.id || item.buyerRFQItemId || `item-${idx}`;
            const itemQuote = det.supplierQuotationItems?.[idx];
            prices[key] = itemQuote?.quotedPrice ? String(itemQuote.quotedPrice) : "0";
          });
        }
        setItemPrices(prices);

        // Pre-fill per-item line details for line-item (non-lot) bidding
        if (!det.addLotOption) {
          const lineItems: { [supplierRFQItemId: string]: QuoteLineItem } = {};
          det.items?.forEach((item) => {
            const itemKey = item.supplierRFQItemId;
            if (!itemKey) return;
            const source = det.supplierQuotationItems?.find(
              (qi) => qi.supplierRFQItemId === itemKey
            );
            lineItems[itemKey] = {
              deliveryCharge: source?.deliveryCharge ?? 0,
              deliveryType: source?.deliveryType || "PERCENTAGE",
              discount: source?.discount ?? 0,
              discountType: source?.discountType || "PERCENTAGE",
              tax: source?.tax ?? 0,
              taxType: source?.taxType || "PERCENTAGE",
              quotedPrice: source?.quotedPrice ?? 0,
              subTotal: source?.subTotal ?? 0,
              quotedAmount: source?.quotedAmount ?? 0,
              isLineitemAvailable: source?.isLineitemAvailable ?? false,
            };
          });
          setQuoteLineItems(lineItems);
        } else {
          setQuoteLineItems({});
        }

        if (det.supplierQuotation && det.supplierQuotation.length > 0) {
          const sq = det.supplierQuotation[0];
          if (sq.totalPrice) setTotalPriceQuote(String(sq.totalPrice));
          if (sq.deliveryCharge !== null && sq.deliveryCharge !== undefined) setDeliveryCharge(String(sq.deliveryCharge));
          if (sq.deliveryType) setDeliveryType(sq.deliveryType);
          if (sq.discount !== null && sq.discount !== undefined) setDiscount(String(sq.discount));
          if (sq.discountType) setDiscountType(sq.discountType);
          if (sq.tax !== null && sq.tax !== undefined) setTax(String(sq.tax));
          if (sq.taxType) setTaxType(sq.taxType);
        }
      } else {
        setSelectedRfqDetails(null);
      }

      if (quoteRes && !('statusCode' in quoteRes) && 'suppliers' in quoteRes && Array.isArray(quoteRes.suppliers)) {
        const mine = quoteRes.suppliers.find((s) => s.supplierId === supplierId) || quoteRes.suppliers[0] || null;
        if (mine) {
          setOwnQuotation(mine);
          if (mine.totalPrice) setTotalPriceQuote(String(mine.totalPrice));
          if (mine.deliveryCharge !== null && mine.deliveryCharge !== undefined) setDeliveryCharge(String(mine.deliveryCharge));
          if (mine.deliveryType) setDeliveryType(mine.deliveryType);
          if (mine.discount !== null && mine.discount !== undefined) setDiscount(String(mine.discount));
          if (mine.tax !== null && mine.tax !== undefined) setTax(String(mine.tax));
          if (mine.supplierQuotationItems && mine.supplierQuotationItems.length > 0) {
            const prices: { [key: string]: string } = {};
            mine.supplierQuotationItems.forEach((qi, idx) => {
              const key = qi.supplierRFQItemId || qi.buyerRFQItemId || `item-${idx}`;
              prices[key] = String(qi.quotedPrice || 0);
            });
            setItemPrices((prev) => ({ ...prev, ...prices }));

            if (!isAddLotOption) {
              setQuoteLineItems((prev) => {
                const next = { ...prev };
                mine.supplierQuotationItems?.forEach((qi) => {
                  if (!qi.supplierRFQItemId) return;
                  next[qi.supplierRFQItemId] = {
                    deliveryCharge: qi.deliveryCharge ?? 0,
                    deliveryType: qi.deliveryType || "PERCENTAGE",
                    discount: qi.discount ?? 0,
                    discountType: qi.discountType || "PERCENTAGE",
                    tax: qi.tax ?? 0,
                    taxType: qi.taxType || "PERCENTAGE",
                    quotedPrice: qi.quotedPrice ?? 0,
                    subTotal: qi.subTotal ?? 0,
                    quotedAmount: qi.quotedAmount ?? 0,
                    isLineitemAvailable: qi.isLineitemAvailable ?? false,
                  };
                });
                return next;
              });
            }
          }
        }
      }
    } catch (err) {
      console.error("Error loading RFQ details for bidding:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Load RFQ details and supplier quotation when selectedLot changes
  useEffect(() => {
    if (!selectedLot?.id) {
      setSelectedRfqDetails(null);
      setOwnQuotation(null);
      return;
    }
    loadRfqDetailsAndQuotation(selectedLot.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLot?.id]);

  const {
    otpStage,
    setOtpStage,
    otpCode,
    setOtpCode,
    otpError,
    setOtpError,
    sendingOtp,
    verifyingOtp,
    setOtpExpiresAt,
    otpRemaining,
    setOtpRemaining,
    handleSendOtp,
    handleVerifyOtp,
  } = useOtpVerification({ onVerified: (token) => executeSubmitLiveBid(token) });

  const formatOtpTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleLineItemFieldChange = (
    supplierRFQItemId: string,
    field: keyof QuoteLineItem,
    value: string
  ) => {
    setQuoteLineItems((prev) => {
      const existing: QuoteLineItem = prev[supplierRFQItemId] || {
        deliveryCharge: 0,
        deliveryType: "PERCENTAGE",
        discount: 0,
        discountType: "PERCENTAGE",
        tax: 0,
        taxType: "PERCENTAGE",
        quotedPrice: 0,
        subTotal: 0,
        quotedAmount: 0,
        isLineitemAvailable: false,
      };
      const isNumericField = field === "deliveryCharge" || field === "discount" || field === "tax" || field === "quotedPrice";
      return {
        ...prev,
        [supplierRFQItemId]: {
          ...existing,
          [field]: isNumericField ? (Number(value) || 0) : value,
        },
      };
    });
  };

  const handleLineItemAvailabilityChange = (supplierRFQItemId: string, checked: boolean) => {
    setQuoteLineItems((prev) => {
      const existing: QuoteLineItem = prev[supplierRFQItemId] || {
        deliveryCharge: 0,
        deliveryType: "PERCENTAGE",
        discount: 0,
        discountType: "PERCENTAGE",
        tax: 0,
        taxType: "PERCENTAGE",
        quotedPrice: 0,
        subTotal: 0,
        quotedAmount: 0,
        isLineitemAvailable: false,
      };
      return {
        ...prev,
        [supplierRFQItemId]: {
          ...existing,
          isLineitemAvailable: checked,
        },
      };
    });
  };

  // Bulk Apply — line-item (non-lot) bidding only
  const [bulkValue, setBulkValue] = useState<string>("");
  const [bulkValueType, setBulkValueType] = useState<"PERCENTAGE" | "AMOUNT">("PERCENTAGE");
  const [bulkFields, setBulkFields] = useState({
    deliveryCharge: false,
    discount: false,
    tax: false,
    quotedPrice: false,
  });

  const bulkTypeFieldMap: Partial<Record<keyof typeof bulkFields, keyof QuoteLineItem>> = {
    deliveryCharge: "deliveryType",
    discount: "discountType",
    tax: "taxType",
  };

  const handleBulkFieldToggle = (field: keyof typeof bulkFields, checked: boolean) => {
    setBulkFields((prev) => ({ ...prev, [field]: checked }));
  };

  const handleBulkApply = () => {
    if (bulkValue === "" || !selectedRfqDetails?.items) return;

    const fieldKeys = (Object.keys(bulkFields) as (keyof typeof bulkFields)[]).filter(
      (key) => bulkFields[key]
    );
    if (fieldKeys.length === 0) return;

    selectedRfqDetails.items.forEach((item, idx) => {
      const itemKey = item.supplierRFQItemId || `item-${idx}`;
      fieldKeys.forEach((field) => {
        handleLineItemFieldChange(itemKey, field, bulkValue);
        const typeField = bulkTypeFieldMap[field];
        if (typeField) {
          handleLineItemFieldChange(itemKey, typeField, bulkValueType);
        }
      });
    });
  };

  // Excel Apply — line-item (non-lot) bidding only
  const excelFileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDownloadQuotationExcel = () => {
    if (!selectedRfqDetails?.items?.length) return;

    const rows = selectedRfqDetails.items.map((item, idx) => {
      const itemKey = item.supplierRFQItemId || `item-${idx}`;
      const line = quoteLineItems[itemKey];
      return [
        itemKey,
        item.description || "",
        item.materialCode || "",
        item.quantity ?? "",
        item.uom || "",
        line?.deliveryCharge ?? 0,
        line?.deliveryType || "PERCENTAGE",
        line?.discount ?? 0,
        line?.discountType || "PERCENTAGE",
        line?.tax ?? 0,
        line?.taxType || "PERCENTAGE",
        line?.quotedPrice ?? 0,
        // "Available" in the UI is the checkbox state, which is the inverse of isLineitemAvailable.
        line?.isLineitemAvailable ? "No" : "Yes",
      ];
    });

    const csv = buildCsv([[...QUOTATION_EXCEL_HEADERS], ...rows]);
    downloadCsv(csv, `quotation-summary-${selectedLot?.id || "rfq"}.csv`);
  };

  const handleQuotationExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !selectedRfqDetails?.items) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const rows = parseCsv(String(reader.result || ""));
        if (rows.length < 2) {
          toastService.error("The uploaded file has no data rows.");
          return;
        }

        const [headerRow, ...dataRows] = rows;
        const colIndex = (name: string) =>
          headerRow.findIndex((h) => h.trim().toLowerCase() === name.toLowerCase());

        const idxItemKey = colIndex("Item Key");
        const idxCode = colIndex("Code");
        const idxDeliveryCharge = colIndex("Delivery Charge");
        const idxDeliveryType = colIndex("Delivery Type");
        const idxDiscount = colIndex("Discount");
        const idxDiscountType = colIndex("Discount Type");
        const idxTax = colIndex("Tax");
        const idxTaxType = colIndex("Tax Type");
        const idxQuotedPrice = colIndex("Quoted Price");
        const idxAvailable = colIndex("Available");

        if (idxQuotedPrice === -1) {
          toastService.error("The uploaded file is missing the required \"Quoted Price\" column. Please use the downloaded template.");
          return;
        }
        if (idxItemKey === -1 && idxCode === -1) {
          toastService.error("The uploaded file is missing the \"Item Key\" and \"Code\" columns needed to match rows to items. Please use the downloaded template.");
          return;
        }

        const normalizeType = (value: string | undefined, fallback: string) => {
          const v = (value || "").trim().toUpperCase();
          return v === "PERCENTAGE" || v === "AMOUNT" ? v : fallback;
        };
        const parseNumber = (value: string | undefined, fallback: number) => {
          const n = Number((value || "").trim());
          return Number.isFinite(n) ? n : fallback;
        };
        // "Available" column is the checkbox's own Yes/No state, inverse of isLineitemAvailable.
        const parseAvailable = (value: string | undefined, fallback: boolean) => {
          const v = (value || "").trim().toLowerCase();
          if (["yes", "true", "1"].includes(v)) return false;
          if (["no", "false", "0"].includes(v)) return true;
          return fallback;
        };

        const items = selectedRfqDetails.items || [];
        // Match strictly by identity (Item Key, then material Code) - never by row position, since
        // a file re-ordered in Excel or downloaded for a different RFQ would otherwise silently
        // apply the wrong row's values to an item.
        const matches = items.map((item, idx) => {
          const itemKey = item.supplierRFQItemId || `item-${idx}`;
          const matchRow =
            (idxItemKey !== -1 && dataRows.find((r) => r[idxItemKey] === itemKey)) ||
            (idxCode !== -1 && item.materialCode && dataRows.find((r) => r[idxCode] === item.materialCode)) ||
            null;
          return { itemKey, matchRow };
        });

        const matchedCount = matches.filter((m) => m.matchRow).length;
        if (matchedCount === 0) {
          toastService.error("None of the rows in this file match this RFQ's items. Make sure you're uploading the spreadsheet downloaded for this RFQ.");
          return;
        }

        setQuoteLineItems((prev) => {
          const next = { ...prev };
          matches.forEach(({ itemKey, matchRow }) => {
            if (!matchRow) return;

            const existing: QuoteLineItem = next[itemKey] || {
              deliveryCharge: 0,
              deliveryType: "PERCENTAGE",
              discount: 0,
              discountType: "PERCENTAGE",
              tax: 0,
              taxType: "PERCENTAGE",
              quotedPrice: 0,
              subTotal: 0,
              quotedAmount: 0,
              isLineitemAvailable: false,
            };

            next[itemKey] = {
              ...existing,
              deliveryCharge: idxDeliveryCharge !== -1 ? parseNumber(matchRow[idxDeliveryCharge], existing.deliveryCharge) : existing.deliveryCharge,
              deliveryType: idxDeliveryType !== -1 ? normalizeType(matchRow[idxDeliveryType], existing.deliveryType) : existing.deliveryType,
              discount: idxDiscount !== -1 ? parseNumber(matchRow[idxDiscount], existing.discount) : existing.discount,
              discountType: idxDiscountType !== -1 ? normalizeType(matchRow[idxDiscountType], existing.discountType) : existing.discountType,
              tax: idxTax !== -1 ? parseNumber(matchRow[idxTax], existing.tax) : existing.tax,
              taxType: idxTaxType !== -1 ? normalizeType(matchRow[idxTaxType], existing.taxType) : existing.taxType,
              quotedPrice: parseNumber(matchRow[idxQuotedPrice], existing.quotedPrice),
              isLineitemAvailable: idxAvailable !== -1 ? parseAvailable(matchRow[idxAvailable], existing.isLineitemAvailable) : existing.isLineitemAvailable,
            };
          });
          return next;
        });

        toastService.success(
          matchedCount < items.length
            ? `Applied values for ${matchedCount} of ${items.length} items. ${items.length - matchedCount} item(s) in this RFQ weren't found in the file and were left unchanged.`
            : "Spreadsheet values applied. Review the table below, then submit your bid."
        );
      } catch {
        toastService.error("Couldn't read that file. Please upload the downloaded template without changing its columns.");
      }
    };
    reader.onerror = () => toastService.error("Couldn't read that file. Please try again.");
    reader.readAsText(file);
  };

  const executeSubmitLiveBid = async (verificationToken: string) => {
    if (!selectedLot) return;
    setSubmittingBid(true);
    setSubmitBidError(null);
    setBidSubmittedMessage(null);

    try {
      const supplierRFQId =
        selectedRfqDetails?.items?.[0]?.supplierRFQId ||
        selectedLot?.supplierRFQId ||
        ownQuotation?.supplierRFQId ||
        (selectedRfqDetails as any)?.supplierRFQId ||
        null;

      const quotationId =
        ownQuotation?.quotationId ||
        selectedRfqDetails?.supplierQuotation?.[0]?.qutationId ||
        (selectedRfqDetails?.supplierQuotation?.[0] as any)?.quotationId ||
        null;

      const payload: SubmitQuotationPayload = {
        supplierQuotationId: quotationId,
        supplierRFQId: supplierRFQId,
        totalPrice: Number(totalPriceQuote) || 0,
        deliveryCharge: Number(deliveryCharge) || 0,
        deliveryType: deliveryType || "PERCENTAGE",
        discount: Number(discount) || 0,
        discountType: discountType || "PERCENTAGE",
        tax: Number(tax) || 0,
        taxType: taxType || "PERCENTAGE",
        temporaryVerificationToken: verificationToken,
        items: !selectedRfqDetails?.items || selectedRfqDetails.items.length === 0
          ? []
          : selectedRfqDetails.addLotOption
            ? selectedRfqDetails.items.map((item, idx) => {
              const key = item.id || item.buyerRFQItemId || `item-${idx}`;
              const itemQuote = selectedRfqDetails.supplierQuotationItems?.[idx];
              return {
                supplierRFQItemId: item.supplierRFQItemId || itemQuote?.supplierRFQItemId || item.id || null,
                buyerRFQItemId: item.buyerRFQItemId || item.id || "",
                quotedPrice: Number(itemPrices[key] ?? 0),
              };
            })
            : selectedRfqDetails.items.map((item) => {
              const itemKey = item.supplierRFQItemId;
              const line = itemKey ? quoteLineItems[itemKey] : undefined;
              return {
                supplierRFQItemId: itemKey || null,
                buyerRFQItemId: item.id || item.buyerRFQItemId || "",
                quotedPrice: Number(line?.quotedPrice ?? 0),
                deliveryCharge: Number(line?.deliveryCharge ?? 0),
                deliveryType: line?.deliveryType || "PERCENTAGE",
                discount: Number(line?.discount ?? 0),
                discountType: line?.discountType || "PERCENTAGE",
                tax: Number(line?.tax ?? 0),
                taxType: line?.taxType || "PERCENTAGE",
                isLineitemAvailable: Boolean(line?.isLineitemAvailable),
              } as any;
            })
      };

      const res = await submitSupplierQuotation(payload);
      if (res && typeof res === 'object' && 'statusCode' in res && res.statusCode >= 400) {
        throw new Error(res.message || "Failed to submit live bid.");
      }

      const formattedBid = fmtCurrency(Number(totalPriceQuote));
      setBidSubmittedMessage(`Live Bid of ${formattedBid} successfully submitted for ${selectedLot.name}! Your bid has been recorded.`);
      await Promise.all([
        loadRfqDetailsAndQuotation(selectedLot.id),
        fetchLiveBidsData(),
      ]);
      setTimeout(() => setBidSubmittedMessage(null), 6000);
    } catch (err: any) {
      setSubmitBidError(err.message || "Failed to submit live bid.");
    } finally {
      setSubmittingBid(false);
    }
  };

  const handleSubmitLiveBid = async () => {
    if (!selectedLot) return;
    setSubmitBidError(null);

    const verificationToken = getCookie(VERIFICATION_TOKEN_COOKIE) || sessionStorage.getItem(VERIFICATION_TOKEN_STORAGE_KEY);
    if (verificationToken) {
      await executeSubmitLiveBid(verificationToken);
      return;
    }

    const storedExpiry = Number(sessionStorage.getItem(OTP_EXPIRY_STORAGE_KEY) || 0);
    if (storedExpiry && Date.now() < storedExpiry) {
      setOtpCode("");
      setOtpExpiresAt(storedExpiry);
      setOtpRemaining(Math.max(0, Math.round((storedExpiry - Date.now()) / 1000)));
      setOtpStage("verify");
      return;
    }

    sessionStorage.removeItem(OTP_EXPIRY_STORAGE_KEY);
    deleteCookie(VERIFICATION_TOKEN_COOKIE);
    sessionStorage.removeItem(VERIFICATION_TOKEN_STORAGE_KEY);
    setOtpCode("");
    setOtpError(null);
    setOtpStage("send");
  };

  return (
    <>
      {/* Bottom Right Floating Trigger Widget for Supplier Side */}
      <div
        className="eauction-floating-bar"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Hover Popover Preview Card */}
        {isHovered && !isModalOpen && (
          <div className="eauction-preview-popover">
            <div className="eauction-preview-header">
              <div className="eauction-preview-title">
                <FaBolt aria-hidden="true" />
                <span>Live e-Auction Bidding</span>
              </div>
              <span className="eauction-live-status">Live reverse auction</span>
            </div>

            {selectedLot ? (
              <div className="eauction-preview-item">
                <div className="eauction-preview-item-title">{selectedLot.name}</div>
                <div className="eauction-preview-meta">
                  <span>Code: <strong className="eauction-bid-price">{selectedLot.itemCode}</strong></span>
                  <span>Closing: <strong className="eauction-timer">{selectedLot.formattedEndDate}</strong></span>
                </div>
              </div>
            ) : (
              <div className="eauction-preview-item">
                <div className="eauction-preview-item-title eauction-preview-empty">
                  No active live bids available
                </div>
              </div>
            )}

            <button
              type="button"
              className="eauction-enter-btn"
              onClick={() => setIsModalOpen(true)}
            >
              <span>Enter Supplier Bidding Console</span>
              <FaArrowRight aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Floating Bar Button */}
        <button
          type="button"
          className="eauction-trigger-btn"
          onClick={() => setIsModalOpen(true)}
          title="Open Live e-Auction Bidding Console"
        >
          <span className="eauction-pulse-dot" aria-hidden="true" />
          <FaBolt aria-hidden="true" className="eauction-trigger-icon" />
          <span>Live e-Auction</span>
          <span className="eauction-badge-count">{totalAuctions} Live</span>
        </button>
      </div>

      {/* Full Live Portal Modal View */}
      {isModalOpen && (
        <div className="eauction-modal-overlay" onClick={handleCloseEauctionModal}>
          <div
            className="eauction-portal-container"
            role="dialog"
            aria-modal="true"
            aria-labelledby="eauction-portal-title"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Header Bar */}
            <div className="eauction-portal-header">
              <div className="eauction-brand">
                <div className="eauction-logo-icon">
                  <IconBoltFilled />
                </div>
                <div className="eauction-brand-text">
                  <h2 className="eauction-portal-title" id="eauction-portal-title">Live e-Auction Bidding Console</h2>
                  <span className="eauction-portal-subtitle">SILA Procurement · Real-time reverse auction</span>
                </div>
              </div>

              <button
                type="button"
                className="eauction-portal-close"
                onClick={handleCloseEauctionModal}
                title="Close e-Auction Console"
                aria-label="Close e-Auction Console"
              >
                <FaTimes aria-hidden="true" />
              </button>
            </div>

            {/* Main Portal Body */}
            <div className="eauction-portal-body">
              {/* Left Sidebar: Live RFQ List */}
              <aside className="eauction-sidebar">
                <div className="eauction-sidebar-header">
                  <div className="eauction-panel-title-text">My live bid status &amp; ranks</div>
                  <span className="eauction-live-pill"><span className="eauction-live-pill-dot" aria-hidden="true" />Real-time bidding active</span>
                </div>

                <div className="eauction-sidebar-list">
                  {loadingApi ? (
                    <div className="eauction-sidebar-status">Loading live bid status...</div>
                  ) : auctions.length === 0 ? (
                    <div className="eauction-empty-state">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <span className="eauction-empty-title">No live bids found</span>
                      <span className="eauction-empty-subtitle">There are currently no active live auctions available for your account.</span>
                    </div>
                  ) : (
                    auctions.map((auc) => {
                      const isSelected = Boolean(selectedLot && auc.id === selectedLot.id);
                      return (
                        <div
                          key={auc.id}
                          className={`eauction-sidebar-item${isSelected ? ' is-selected' : ''}`}
                          onClick={() => setSelectedLot(auc)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setSelectedLot(auc);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          aria-pressed={isSelected}
                        >
                          <div className="eauction-sidebar-item-title">{auc.name}</div>
                          <div className="eauction-sidebar-item-code sila-ref">{auc.itemCode}</div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Pagination Bar */}
                {auctions.length > 0 && (() => {
                  const startItem = (currentPage - 1) * PAGE_SIZE + 1;
                  const endItem = (currentPage - 1) * PAGE_SIZE + auctions.length;
                  const canGoPrev = currentPage > 1;
                  const canGoNext = hasNextPage;

                  return (
                    <div className="eauction-sidebar-footer">
                      <div className="eauction-pagination-bar">
                        <div className="eauction-pagination-info">
                          <strong>{startItem}</strong>–<strong>{endItem}</strong> of <strong>{Math.max(totalAuctions, endItem)}</strong>
                        </div>

                        <div className="eauction-pagination-controls">
                          <button
                            type="button"
                            className={`eauction-page-btn${!canGoPrev ? ' is-disabled' : ''}`}
                            onClick={() => canGoPrev && setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={!canGoPrev}
                            aria-label="Previous page"
                          >
                            <IconChevronLeft />
                          </button>

                          <span className="eauction-page-btn is-current" aria-current="page">
                            {currentPage}
                          </span>

                          <button
                            type="button"
                            className={`eauction-page-btn${!canGoNext ? ' is-disabled' : ''}`}
                            onClick={() => canGoNext && setCurrentPage((p) => p + 1)}
                            disabled={!canGoNext}
                            aria-label="Next page"
                          >
                            <IconChevronRight />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </aside>

              {/* Main Content Workspace */}
              <div className="eauction-main-content">

                {/* Split Bottom Workspace */}
                <div className={`eauction-grid-split${selectedRfqDetails?.addLotOption === false ? ' is-single-column' : ''}`}>
                  {/* Left Column: Live Bidding View */}
                  <div className="eauction-panel-light eauction-panel-column">
                    <div className="eauction-panel-head">
                      <div className="eauction-panel-title-text">
                        Live bidding view: <span className="eauction-live-lot-name">{selectedLot?.name || "No Active Tender Selected"}</span>
                      </div>
                    </div>

                    {/* RFQ Details Card from rfq-by-id API */}
                    {selectedRfqDetails && (
                      <div className="eauction-details-card">
                        <div className="eauction-details-title">RFQ Details</div>
                        <div className="eauction-details-grid">
                          <div>
                            <div className="eauction-detail-label">RFQ Title</div>
                            <div className="eauction-detail-value">{selectedRfqDetails.title || "—"}</div>
                          </div>

                          <div>
                            <div className="eauction-detail-label">Start Date &amp; Time (UTC)</div>
                            <div className="eauction-detail-value">
                              {selectedRfqDetails.startDate
                                ? new Date(selectedRfqDetails.startDate).toLocaleString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                                : "—"}
                            </div>
                          </div>

                          <div>
                            <div className="eauction-detail-label">End Date &amp; Time (UTC)</div>
                            <div className="eauction-detail-value">
                              {selectedRfqDetails.endDate
                                ? new Date(selectedRfqDetails.endDate).toLocaleString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                                : "—"}
                            </div>
                          </div>

                          <div>
                            <div className="eauction-detail-label">Delivery Location</div>
                            <div className="eauction-detail-value">{selectedRfqDetails.deliveryLocation || "—"}</div>
                          </div>

                          <div className="eauction-details-span-2">
                            <div className="eauction-detail-label">Description</div>
                            <div className="eauction-detail-value">{selectedRfqDetails.description || "—"}</div>
                          </div>

                          <div>
                            <div className="eauction-detail-label">Lot Option</div>
                            {selectedRfqDetails.addLotOption ? (
                              <span className="eauction-lot-badge sila-badge sila-badge--success">Allowed</span>
                            ) : (
                              <span className="eauction-lot-badge-disabled sila-badge sila-badge--neutral">Not Allowed</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Material Details Table from rfq-by-id API */}
                    <div className="eauction-material-details">
                      <div className="eauction-material-details-head">
                        <span className="eauction-material-details-label">
                          Material Details {selectedRfqDetails?.addLotOption ? "(Single Lot Bidding)" : "(Line Item Bidding)"}
                        </span>
                        {selectedRfqDetails?.addLotOption && headerRank !== "" && (
                          <span className="eauction-rank-badge-pill sila-badge sila-badge--info">Rank: {headerRank}</span>
                        )}
                      </div>

                      {loadingDetails ? (
                        <div className="eauction-inline-status">
                          Loading material specification details...
                        </div>
                      ) : selectedRfqDetails?.items && selectedRfqDetails.items.length > 0 ? (
                        selectedRfqDetails.addLotOption ? (
                          <div className="eauction-table-wrap">
                            <table className="eauction-table">
                              <thead>
                                <tr>
                                  <th className="eauction-col-index">#</th>
                                  <th>Description</th>
                                  <th>Code</th>
                                  <th>Qty / UOM</th>
                                  <th>Cost Center</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedRfqDetails.items.map((item, idx) => {
                                  const itemKey = item.id || item.buyerRFQItemId || `item-${idx}`;
                                  return (
                                    <tr key={itemKey}>
                                      <td className="eauction-col-index eauction-cell-muted">{idx + 1}</td>
                                      <td>
                                        <div className="eauction-cell-title">{item.description}</div>
                                        {item.materialGroup && (
                                          <div className="eauction-cell-subtitle">Group: {item.materialGroup}</div>
                                        )}
                                      </td>
                                      <td>
                                        <span className="eauction-code-chip">
                                          {item.materialCode || "N/A"}
                                        </span>
                                      </td>
                                      <td className="eauction-cell-strong">
                                        {item.quantity} <span className="eauction-cell-subtitle">{item.uom}</span>
                                      </td>
                                      <td className="eauction-cell-muted">
                                        {item.costCenterName || item.costCenter || "—"}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <>
                            <div className="eauction-bulk-apply-panel eauction-excel-apply-panel">
                              <div className="eauction-bulk-apply-header">
                                <div className="eauction-bulk-apply-title">Excel Apply</div>
                                <p className="eauction-bulk-apply-subtitle">
                                  Download this table as a spreadsheet, edit the values offline, then upload it to apply your changes.
                                </p>
                              </div>

                              <div className="eauction-bulk-apply-controls">
                                <button
                                  type="button"
                                  className="eauction-bulk-apply-btn eauction-excel-apply-btn"
                                  onClick={handleDownloadQuotationExcel}
                                  title="Download this table as an Excel-compatible spreadsheet"
                                >
                                  <FaDownload aria-hidden="true" /> Download Excel
                                </button>
                                <button
                                  type="button"
                                  className="eauction-bulk-apply-btn eauction-excel-apply-btn"
                                  onClick={() => excelFileInputRef.current?.click()}
                                  title="Upload a filled-in spreadsheet to bulk-update these fields"
                                >
                                  <FaFileUpload aria-hidden="true" /> Upload Excel
                                </button>
                                <input
                                  ref={excelFileInputRef}
                                  type="file"
                                  accept=".csv"
                                  className="eauction-excel-file-input"
                                  onChange={handleQuotationExcelFileChange}
                                  tabIndex={-1}
                                  aria-hidden="true"
                                />
                              </div>
                            </div>

                            <div className="eauction-bulk-apply-panel">
                              <div className="eauction-bulk-apply-header">
                                <div className="eauction-bulk-apply-title">Bulk Apply</div>
                                <p className="eauction-bulk-apply-subtitle">
                                  Enter a value, then toggle the columns you want it applied to.
                                </p>
                              </div>

                              <div className="eauction-bulk-apply-controls">
                                <div className="eauction-bulk-value">
                                  <input
                                    type="number"
                                    className="eauction-bulk-value-input"
                                    aria-label="Bulk value"
                                    value={bulkValue}
                                    onChange={(e) => setBulkValue(e.target.value)}
                                    placeholder="Enter value"
                                  />
                                </div>

                                <div className="eauction-bulk-type-toggle" role="group" aria-label="Bulk value type">
                                  <button
                                    type="button"
                                    className={bulkValueType === "PERCENTAGE" ? "active" : ""}
                                    aria-pressed={bulkValueType === "PERCENTAGE"}
                                    onClick={() => setBulkValueType("PERCENTAGE")}
                                  >
                                    Percentage
                                  </button>
                                  <button
                                    type="button"
                                    className={bulkValueType === "AMOUNT" ? "active" : ""}
                                    aria-pressed={bulkValueType === "AMOUNT"}
                                    onClick={() => setBulkValueType("AMOUNT")}
                                  >
                                    Amount
                                  </button>
                                </div>

                                <div className="eauction-bulk-fields">
                                  <label className="eauction-bulk-toggle">
                                    <span>Delivery Charge</span>
                                    <span className="eauction-switch">
                                      <input
                                        type="checkbox"
                                        checked={bulkFields.deliveryCharge}
                                        onChange={(e) => handleBulkFieldToggle("deliveryCharge", e.target.checked)}
                                      />
                                      <span className="eauction-slider"></span>
                                    </span>
                                  </label>

                                  <label className="eauction-bulk-toggle">
                                    <span>Discount</span>
                                    <span className="eauction-switch">
                                      <input
                                        type="checkbox"
                                        checked={bulkFields.discount}
                                        onChange={(e) => handleBulkFieldToggle("discount", e.target.checked)}
                                      />
                                      <span className="eauction-slider"></span>
                                    </span>
                                  </label>

                                  <label className="eauction-bulk-toggle">
                                    <span>Tax</span>
                                    <span className="eauction-switch">
                                      <input
                                        type="checkbox"
                                        checked={bulkFields.tax}
                                        onChange={(e) => handleBulkFieldToggle("tax", e.target.checked)}
                                      />
                                      <span className="eauction-slider"></span>
                                    </span>
                                  </label>

                                  <label className="eauction-bulk-toggle">
                                    <span>Quoted Price</span>
                                    <span className="eauction-switch">
                                      <input
                                        type="checkbox"
                                        checked={bulkFields.quotedPrice}
                                        onChange={(e) => handleBulkFieldToggle("quotedPrice", e.target.checked)}
                                      />
                                      <span className="eauction-slider"></span>
                                    </span>
                                  </label>
                                </div>

                                <button
                                  type="button"
                                  className="eauction-bulk-apply-btn"
                                  onClick={handleBulkApply}
                                >
                                  Apply
                                </button>
                              </div>
                            </div>

                          <div className="eauction-table-wrap">
                            <table className="eauction-table eauction-table--line-items">
                              <thead>
                                <tr>
                                  <th>Material Info</th>
                                  <th>Code</th>
                                  <th>Qty</th>
                                  <th>Delivery Charge</th>
                                  <th>Delivery Type</th>
                                  <th>Discount</th>
                                  <th>Discount Type</th>
                                  <th>Tax</th>
                                  <th>Tax Type</th>
                                  <th className="eauction-col-right">Quoted Price</th>
                                  <th className="eauction-availability-cell">Available</th>
                                  <th>Rank</th>
                                  <th className="eauction-col-right">Sub Total{currency ? ` (${currency})` : ""}</th>
                                  <th className="eauction-col-right">Quoted Amount{currency ? ` (${currency})` : ""}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedRfqDetails.items.map((item, idx) => {
                                  const itemKey = item.supplierRFQItemId || `item-${idx}`;
                                  const itemId = item.id || item.buyerRFQItemId;
                                  const line = quoteLineItems[itemKey] || {
                                    deliveryCharge: 0,
                                    deliveryType: "PERCENTAGE",
                                    discount: 0,
                                    discountType: "PERCENTAGE",
                                    tax: 0,
                                    taxType: "PERCENTAGE",
                                    quotedPrice: 0,
                                    subTotal: 0,
                                    quotedAmount: 0,
                                    isLineitemAvailable: false,
                                  };
                                  const matchedItem = allQuotationItems.find(
                                    (qi) =>
                                      (qi.supplierRFQItemId && (qi.supplierRFQItemId === itemKey || qi.supplierRFQItemId === itemId)) ||
                                      (qi.buyerRFQItemId && (qi.buyerRFQItemId === itemKey || qi.buyerRFQItemId === itemId)) ||
                                      (qi.id && (qi.id === itemKey || qi.id === itemId))
                                  ) || allQuotationItems[idx];
                                  const itemRank = ownQuotation?.status === "SUBMITTED" ? (formatRank(matchedItem?.rank) || "--") : "-";
                                  return (
                                    <tr key={itemKey}>
                                      <td>
                                        <div className="eauction-cell-title">{item.description}</div>
                                        {item.materialGroup && (
                                          <div className="eauction-cell-subtitle">Group: {item.materialGroup}</div>
                                        )}
                                      </td>
                                      <td>
                                        <span className="eauction-code-chip">
                                          {item.materialCode || "N/A"}
                                        </span>
                                      </td>
                                      <td className="eauction-cell-strong">
                                        {item.quantity} <span className="eauction-cell-subtitle">{item.uom}</span>
                                      </td>
                                      <td>
                                        <input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          value={line.deliveryCharge || ""}
                                          onChange={(e) => handleLineItemFieldChange(itemKey, "deliveryCharge", e.target.value)}
                                          placeholder="0.00"
                                          className="eauction-line-input"
                                        />
                                      </td>
                                      <td>
                                        <select
                                          value={line.deliveryType}
                                          onChange={(e) => handleLineItemFieldChange(itemKey, "deliveryType", e.target.value)}
                                          className="eauction-line-select"
                                        >
                                          <option value="PERCENTAGE">Percentage</option>
                                          <option value="AMOUNT">Amount</option>
                                        </select>
                                      </td>
                                      <td>
                                        <input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          value={line.discount || ""}
                                          onChange={(e) => handleLineItemFieldChange(itemKey, "discount", e.target.value)}
                                          placeholder="0.00"
                                          className="eauction-line-input"
                                        />
                                      </td>
                                      <td>
                                        <select
                                          value={line.discountType}
                                          onChange={(e) => handleLineItemFieldChange(itemKey, "discountType", e.target.value)}
                                          className="eauction-line-select"
                                        >
                                          <option value="PERCENTAGE">Percentage</option>
                                          <option value="AMOUNT">Amount</option>
                                        </select>
                                      </td>
                                      <td>
                                        <input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          value={line.tax || ""}
                                          onChange={(e) => handleLineItemFieldChange(itemKey, "tax", e.target.value)}
                                          placeholder="0.00"
                                          className="eauction-line-input"
                                        />
                                      </td>
                                      <td>
                                        <select
                                          value={line.taxType}
                                          onChange={(e) => handleLineItemFieldChange(itemKey, "taxType", e.target.value)}
                                          className="eauction-line-select"
                                        >
                                          <option value="PERCENTAGE">Percentage</option>
                                          <option value="AMOUNT">Amount</option>
                                        </select>
                                      </td>
                                      <td className="eauction-col-right">
                                        <input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          value={line.quotedPrice || ""}
                                          onChange={(e) => handleLineItemFieldChange(itemKey, "quotedPrice", e.target.value)}
                                          placeholder="0.00"
                                          className="eauction-line-input eauction-line-input--price"
                                        />
                                      </td>
                                      <td className="eauction-availability-cell">
                                        <input
                                          type="checkbox"
                                          className="eauction-availability-checkbox"
                                          checked={!line.isLineitemAvailable}
                                          onChange={(e) => handleLineItemAvailabilityChange(itemKey, !e.target.checked)}
                                          aria-label={`Mark ${item.description || "item"} as available`}
                                        />
                                      </td>
                                      <td className="eauction-cell-strong">
                                        {itemRank}
                                      </td>
                                      <td className="eauction-col-right eauction-cell-strong">
                                        {fmtCurrency(line.subTotal)}
                                      </td>
                                      <td className="eauction-col-right eauction-cell-strong">
                                        {fmtCurrency(line.quotedAmount)}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                          </>
                        )
                      ) : (
                        <div className="eauction-material-empty">
                          No material items listed for this tender.
                        </div>
                      )}
                    </div>

                    {selectedRfqDetails?.addLotOption === false && (
                      <div className="eauction-bid-feedback-stack">
                        {submitBidError && (
                          <div className="eauction-alert eauction-alert--error">
                            {submitBidError}
                          </div>
                        )}

                        {bidSubmittedMessage && (
                          <div className="eauction-alert eauction-alert--success">
                            {bidSubmittedMessage}
                          </div>
                        )}

                        <div className="eauction-line-item-total-bar">
                          <div className="eauction-total-quote-label">Total Price Quote</div>
                          <div className="eauction-total-quote-value-box">
                            <input
                              type="number"
                              value={totalPriceQuote}
                              onChange={(e) => setTotalPriceQuote(e.target.value)}
                              className="eauction-total-quote-input"
                              aria-label="Total price quote"
                            />
                          </div>
                          <button
                            type="button"
                            className={`eauction-btn-submit-bid eauction-btn-submit-bid--inline${submittingBid ? ' is-loading' : ''}`}
                            onClick={handleSubmitLiveBid}
                            disabled={submittingBid}
                          >
                            {submittingBid ? "Submitting Live Bid..." : <><FaBolt aria-hidden="true" /> Submit Live Bid</>}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Supplier Live Bidding Submission Panel (Single Lot Bidding only) */}
                  {selectedRfqDetails?.addLotOption !== false && (
                    <div className="eauction-panel-light eauction-panel-column">
                      <div className="eauction-panel-title-text">Submit competitive bid</div>

                      {submitBidError && (
                        <div className="eauction-alert eauction-alert--error">
                          {submitBidError}
                        </div>
                      )}

                      {bidSubmittedMessage && (
                        <div className="eauction-alert eauction-alert--success">
                          {bidSubmittedMessage}
                        </div>
                      )}

                      {/* Quotation Details Form */}
                      <div className="eauction-supplier-bid-box">
                        <div className="eauction-bid-field-grid">
                          <div className="eauction-bid-field">
                            <label className="eauction-bid-field-label" htmlFor="eauction-bid-delivery-charge">Delivery Charge</label>
                            <input
                              id="eauction-bid-delivery-charge"
                              type="number"
                              className="eauction-bid-field-input"
                              value={deliveryCharge}
                              onChange={(e) => setDeliveryCharge(e.target.value)}
                              placeholder="0.00"
                            />
                          </div>
                          <div className="eauction-bid-field">
                            <label className="eauction-bid-field-label" htmlFor="eauction-bid-delivery-type">Delivery Type</label>
                            <select
                              id="eauction-bid-delivery-type"
                              className="eauction-bid-field-input"
                              value={deliveryType}
                              onChange={(e) => setDeliveryType(e.target.value)}
                            >
                              <option value="PERCENTAGE">Percentage</option>
                              <option value="AMOUNT">Amount</option>
                            </select>
                          </div>
                          <div className="eauction-bid-field">
                            <label className="eauction-bid-field-label" htmlFor="eauction-bid-discount">Discount</label>
                            <input
                              id="eauction-bid-discount"
                              type="number"
                              className="eauction-bid-field-input"
                              value={discount}
                              onChange={(e) => setDiscount(e.target.value)}
                              placeholder="0.00"
                            />
                          </div>
                          <div className="eauction-bid-field">
                            <label className="eauction-bid-field-label" htmlFor="eauction-bid-discount-type">Discount Type</label>
                            <select
                              id="eauction-bid-discount-type"
                              className="eauction-bid-field-input"
                              value={discountType}
                              onChange={(e) => setDiscountType(e.target.value)}
                            >
                              <option value="PERCENTAGE">Percentage</option>
                              <option value="AMOUNT">Amount</option>
                            </select>
                          </div>
                          <div className="eauction-bid-field">
                            <label className="eauction-bid-field-label" htmlFor="eauction-bid-tax">Tax</label>
                            <input
                              id="eauction-bid-tax"
                              type="number"
                              className="eauction-bid-field-input"
                              value={tax}
                              onChange={(e) => setTax(e.target.value)}
                              placeholder="0.00"
                            />
                          </div>
                          <div className="eauction-bid-field">
                            <label className="eauction-bid-field-label" htmlFor="eauction-bid-tax-type">Tax Type</label>
                            <select
                              id="eauction-bid-tax-type"
                              className="eauction-bid-field-input"
                              value={taxType}
                              onChange={(e) => setTaxType(e.target.value)}
                            >
                              <option value="PERCENTAGE">Percentage</option>
                              <option value="AMOUNT">Amount</option>
                            </select>
                          </div>
                        </div>

                        <div className="eauction-total-quote-row">
                          <div className="eauction-total-quote-label">Total Price Quote</div>
                          <div className="eauction-total-quote-value-box">
                            <span className="eauction-total-quote-currency">{currency}</span>
                            <input
                              type="number"
                              value={totalPriceQuote}
                              onChange={(e) => setTotalPriceQuote(e.target.value)}
                              className="eauction-total-quote-input"
                              aria-label="Total price quote"
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          className={`eauction-btn-submit-bid${submittingBid ? ' is-loading' : ''}`}
                          onClick={handleSubmitLiveBid}
                          disabled={submittingBid}
                        >
                          {submittingBid ? "Submitting Live Bid..." : <><FaBolt aria-hidden="true" /> Submit Live Bid</>}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* OTP Verification Modals */}
      {otpStage === "send" && (
        <div className="sila-overlay eauction-otp-overlay" onClick={() => setOtpStage("none")}>
          <div
            className="sila-modal eauction-otp-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="eauction-otp-send-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sila-modal-header">
              <h2 className="sila-modal-title eauction-otp-title" id="eauction-otp-send-title">
                <FaEnvelope aria-hidden="true" /> Verify It's You
              </h2>
              <button
                type="button"
                className="sila-btn sila-btn--ghost sila-btn--icon sila-btn--sm"
                onClick={() => setOtpStage("none")}
                aria-label="Close"
              >
                <FaTimes aria-hidden="true" />
              </button>
            </div>

            <div className="sila-modal-body">
              <h3 className="eauction-otp-heading">Confirm Live Bid Submission</h3>
              <p className="sila-modal-text">
                For security, we'll send a one-time verification code to your registered email before submitting your live competitive bid.
              </p>
              {otpError && (
                <p className="sila-error-text eauction-otp-error" role="alert">{otpError}</p>
              )}
            </div>

            <div className="sila-modal-footer">
              <button type="button" className="sila-btn sila-btn--secondary" onClick={() => setOtpStage("none")}>
                Cancel
              </button>
              <button
                type="button"
                className="sila-btn sila-btn--primary"
                onClick={handleSendOtp}
                disabled={sendingOtp}
              >
                {sendingOtp && <span className="sila-spinner" aria-hidden="true" />}
                {sendingOtp ? "Sending..." : "Send OTP"}
              </button>
            </div>
          </div>
        </div>
      )}

      {otpStage === "verify" && (
        <div className="sila-overlay eauction-otp-overlay" onClick={() => setOtpStage("none")}>
          <div
            className="sila-modal eauction-otp-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="eauction-otp-verify-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sila-modal-header">
              <h2 className="sila-modal-title eauction-otp-title" id="eauction-otp-verify-title">
                <FaKey aria-hidden="true" /> Enter Verification Code
              </h2>
              <button
                type="button"
                className="sila-btn sila-btn--ghost sila-btn--icon sila-btn--sm"
                onClick={() => setOtpStage("none")}
                aria-label="Close"
              >
                <FaTimes aria-hidden="true" />
              </button>
            </div>

            <div className="sila-modal-body">
              <p className="sila-modal-text eauction-otp-intro">
                We've sent a 6-digit verification code to your email. It expires in{" "}
                <strong className={`eauction-otp-timer${otpRemaining <= 30 ? " is-urgent" : ""}`}>
                  {formatOtpTimer(otpRemaining)}
                </strong>.
              </p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                className="sila-input eauction-otp-input"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter OTP Code"
                aria-label="One-time verification code"
                aria-invalid={otpRemaining <= 0 || Boolean(otpError) || undefined}
              />
              {otpRemaining <= 0 ? (
                <p className="sila-error-text eauction-otp-error" role="alert">
                  Code expired. Please resend the OTP.
                </p>
              ) : otpError ? (
                <p className="sila-error-text eauction-otp-error" role="alert">{otpError}</p>
              ) : null}

              <div className="eauction-otp-resend">
                <button
                  type="button"
                  className="sila-btn sila-btn--ghost sila-btn--sm"
                  onClick={handleSendOtp}
                  disabled={sendingOtp || otpRemaining > 0}
                >
                  Resend OTP Code
                </button>
              </div>
            </div>

            <div className="sila-modal-footer">
              <button type="button" className="sila-btn sila-btn--secondary" onClick={() => setOtpStage("none")}>
                Cancel
              </button>
              <button
                type="button"
                className="sila-btn sila-btn--primary"
                onClick={handleVerifyOtp}
                disabled={verifyingOtp || !otpCode.trim()}
              >
                {verifyingOtp && <span className="sila-spinner" aria-hidden="true" />}
                {verifyingOtp ? "Verifying..." : "Verify & Submit Bid"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EAuctionWidget;
