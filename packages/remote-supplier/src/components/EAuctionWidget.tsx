import React, { useState, useEffect } from 'react';
import './EAuctionWidget.css';
import {
  fetchRFQMasterData,
  fetchRFQById,
  fetchSupplierQuotationBySupplierId,
  submitSupplierQuotation,
  sendOtp,
  verifyOtp,
  getSupplierProfile,
  type RFQDetailResponse,
  type SupplierQuotationByIdItem,
  type SubmitQuotationPayload,
} from '../api/supplierApi';

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
}

const DEFAULT_SUPPLIER_ID = "60fb0677-bd04-4caf-8467-8b5bdcdd0b8b";

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

const VERIFICATION_TOKEN_COOKIE = "vsx_verification_token";
const VERIFICATION_TOKEN_TTL_SECONDS = 30 * 60;

const getCookie = (name: string): string | null => {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

const setCookie = (name: string, value: string, maxAgeSeconds: number) => {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
};

const deleteCookie = (name: string) => {
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
};

/* ---------------------------------- Component ---------------------------------- */

const PAGE_SIZE = 5;

export const EAuctionWidget: React.FC = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [auctions, setAuctions] = useState<LiveAuctionItem[]>([]);
  const [selectedLot, setSelectedLot] = useState<LiveAuctionItem | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // API State for selected RFQ details & existing quotation
  const [selectedRfqDetails, setSelectedRfqDetails] = useState<RFQDetailResponse | null>(null);
  const [ownQuotation, setOwnQuotation] = useState<SupplierQuotationByIdItem | null>(null);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const [loadingApi, setLoadingApi] = useState<boolean>(false);

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

  const fetchLiveBidsData = async () => {
    setLoadingApi(true);
    try {
      const res = await fetchRFQMasterData({
        index: 0,
        limit: 10,
        supplierId: DEFAULT_SUPPLIER_ID,
        status: "LIVE",
      });

      const rawList = Array.isArray(res)
        ? res
        : (res as any)?.data && Array.isArray((res as any).data)
          ? (res as any).data
          : (res as any)?.rfqs && Array.isArray((res as any).rfqs)
            ? (res as any).rfqs
            : [];

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
      }
    } catch (err) {
      console.error("Error fetching live RFQ master data:", err);
      setAuctions([]);
      setSelectedLot(null);
    } finally {
      setLoadingApi(false);
    }
  };

  useEffect(() => {
    fetchLiveBidsData();
  }, [isModalOpen]);

  // Load RFQ details and supplier quotation when selectedLot changes
  useEffect(() => {
    if (!selectedLot?.id) {
      setSelectedRfqDetails(null);
      setOwnQuotation(null);
      return;
    }

    const loadRfqDetailsAndQuotation = async () => {
      setLoadingDetails(true);
      let isAddLotOption = false;
      try {
        const [detailsRes, quoteRes] = await Promise.all([
          fetchRFQById(selectedLot.id),
          fetchSupplierQuotationBySupplierId(selectedLot.id),
        ]);

        if (detailsRes && !('statusCode' in detailsRes) && 'title' in detailsRes) {
          const det = detailsRes as RFQDetailResponse;
          setSelectedRfqDetails(det);
          isAddLotOption = Boolean(det.addLotOption);

          // Enrich auction list row with detailed RFQ info (delivery location, endDate, orgName)
          setAuctions((prev) =>
            prev.map((auc) => {
              if (auc.id === selectedLot.id) {
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
          const mine = quoteRes.suppliers.find((s) => s.supplierId === DEFAULT_SUPPLIER_ID) || quoteRes.suppliers[0] || null;
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

    loadRfqDetailsAndQuotation();
  }, [selectedLot?.id]);

  // OTP Verification States
  const [otpStage, setOtpStage] = useState<"none" | "send" | "verify">("none");
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null);
  const [otpRemaining, setOtpRemaining] = useState(600);
  const supplierEmailRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (otpStage !== "verify" || !otpExpiresAt) return;
    const interval = setInterval(() => {
      const left = Math.max(0, Math.round((otpExpiresAt - Date.now()) / 1000));
      setOtpRemaining(left);
      if (left <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [otpStage, otpExpiresAt]);

  const formatOtpTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSendOtp = async () => {
    setOtpError(null);
    setSendingOtp(true);
    try {
      if (!supplierEmailRef.current) {
        const profile = await getSupplierProfile();
        if (profile && "businessProfile" in profile) {
          supplierEmailRef.current = (profile as any).businessProfile?.email || null;
        }
      }
      const res = await sendOtp();
      if (res && "statusCode" in res && (res as any).statusCode >= 400) {
        const message = (res as any).message || "";
        const description = (res as any).description || "";
        const otpAlreadySent = /already.*sent/i.test(message) || /already.*sent/i.test(description);
        if (!otpAlreadySent) {
          setOtpError(message || "Couldn't send the code, try again.");
          return;
        }
      }
      const expiry = Date.now() + 10 * 60 * 1000;
      sessionStorage.setItem("vsx_otp_expiry", String(expiry));
      deleteCookie(VERIFICATION_TOKEN_COOKIE);
      sessionStorage.removeItem("vsx_verification_token");
      setOtpExpiresAt(expiry);
      setOtpRemaining(600);
      setOtpCode("");
      setOtpStage("verify");
    } catch (err: any) {
      setOtpError(err?.message || "Couldn't send the code, try again.");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim()) {
      setOtpError("Enter the code we emailed you.");
      return;
    }
    if (otpRemaining <= 0) {
      setOtpError("Code expired. Please resend the OTP.");
      return;
    }
    setVerifyingOtp(true);
    setOtpError(null);
    try {
      const res = await verifyOtp({ email: supplierEmailRef.current || "", otp: otpCode.trim() });
      if (!res || (res as any).success === false || ("statusCode" in res && (res as any).statusCode >= 400)) {
        setOtpError((res as any)?.message || "That code didn't match, try again.");
        return;
      }
      const token = (res as any).token;
      if (!token) {
        setOtpError("Verification failed, please retry.");
        return;
      }
      setCookie(VERIFICATION_TOKEN_COOKIE, token, VERIFICATION_TOKEN_TTL_SECONDS);
      sessionStorage.setItem("vsx_verification_token", token);
      setOtpStage("none");
      await executeSubmitLiveBid(token);
    } catch (err: any) {
      setOtpError(err?.message || "That code didn't match, try again.");
    } finally {
      setVerifyingOtp(false);
    }
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
              } as any;
            })
      };

      const res = await submitSupplierQuotation(payload);
      if (res && typeof res === 'object' && 'statusCode' in res && res.statusCode >= 400) {
        throw new Error(res.message || "Failed to submit live bid.");
      }

      const formattedBid = `$${Number(totalPriceQuote).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
      setBidSubmittedMessage(`✅ Live Bid of ${formattedBid} successfully submitted for ${selectedLot.name}! Your bid has been recorded.`);
      await fetchLiveBidsData();
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

    const verificationToken = getCookie(VERIFICATION_TOKEN_COOKIE) || sessionStorage.getItem("vsx_verification_token");
    if (verificationToken) {
      await executeSubmitLiveBid(verificationToken);
      return;
    }

    const storedExpiry = Number(sessionStorage.getItem("vsx_otp_expiry") || 0);
    if (storedExpiry && Date.now() < storedExpiry) {
      setOtpCode("");
      setOtpExpiresAt(storedExpiry);
      setOtpRemaining(Math.max(0, Math.round((storedExpiry - Date.now()) / 1000)));
      setOtpStage("verify");
      return;
    }

    sessionStorage.removeItem("vsx_otp_expiry");
    deleteCookie(VERIFICATION_TOKEN_COOKIE);
    sessionStorage.removeItem("vsx_verification_token");
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
                <span>⚡ Live e-Auction Bidding</span>
              </div>
              <span className="eauction-live-status">LIVE REVERSE AUCTION</span>
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
                <div className="eauction-preview-item-title" style={{ color: '#64748b', fontSize: '0.8125rem' }}>
                  No active live bids available
                </div>
              </div>
            )}

            <button
              className="eauction-enter-btn"
              onClick={() => setIsModalOpen(true)}
            >
              <span>Enter Supplier Bidding Console</span>
              <span>➔</span>
            </button>
          </div>
        )}

        {/* Floating Bar Button */}
        <button
          className="eauction-trigger-btn"
          onClick={() => setIsModalOpen(true)}
          title="Open SAP Ariba Live e-Auction Supplier Console"
        >
          <span className="eauction-pulse-dot" />
          <span>⚡ Live e-Auction</span>
          <span className="eauction-badge-count">{auctions.length} Live</span>
        </button>
      </div>

      {/* Full Live Portal Modal View */}
      {isModalOpen && (
        <div className="eauction-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div
            className="eauction-portal-container"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Header Bar */}
            <div className="eauction-portal-header">
              <div className="eauction-brand">
                <div className="eauction-logo-icon">e</div>
                <div>
                  <div className="eauction-portal-title">Supplier Live Bidding Console</div>
                  <div style={{ fontSize: '0.71875rem', color: '#e0f2fe' }}>SAP Ariba Live Sourcing v2.1</div>
                </div>
              </div>

              <div className="eauction-project-banner">
                <span style={{ fontSize: '0.75rem', color: '#e0f2fe', textTransform: 'uppercase' }}>Sourcing Event:</span>
                <span className="eauction-project-name">{selectedLot?.name || "Global IT Hardware Refresh"}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '0.8125rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  👤 Supplier: <strong>CompUSA Direct (Lead Bidder)</strong>
                </span>
                <button
                  className="eauction-portal-close"
                  onClick={() => setIsModalOpen(false)}
                  title="Close e-Auction Console"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Main Portal Body */}
            <div className="eauction-portal-body">
              {/* Left Sidebar Filters */}
              <div className="eauction-left-sidebar">
                <div>
                  <div className="eauction-section-header">Live Auctions</div>
                  <div className="eauction-sidebar-menu">
                    <div className="eauction-sidebar-item active">⚡ Active Tenders</div>
                    <div className="eauction-sidebar-item">📦 Quick Lots</div>
                    <div className="eauction-sidebar-item">📊 My Bidding History</div>
                    <div className="eauction-sidebar-item">📇 Buyer Contacts</div>
                  </div>
                </div>

                <div>
                  <div className="eauction-section-header">Filters</div>
                  <div className="eauction-filter-group">
                    <label className="eauction-filter-checkbox">
                      <input type="checkbox" defaultChecked /> Closing In
                    </label>
                    <label className="eauction-filter-checkbox">
                      <input type="checkbox" /> My Lead Bids
                    </label>
                    <label className="eauction-filter-checkbox">
                      <input type="checkbox" /> Flashing Item
                    </label>
                    <label className="eauction-filter-checkbox">
                      <input type="checkbox" /> Outbid Lots
                    </label>
                  </div>
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                  <div className="eauction-section-header">Active Tenders</div>
                  <div style={{ fontSize: '0.78125rem', color: '#64748b' }}>
                    {auctions.length} Live e-Auctions In Progress
                  </div>
                </div>
              </div>

              {/* Main Content Workspace */}
              <div className="eauction-main-content">
                {/* Active Bids & Rank Grid */}
                <div className="eauction-panel-light">
                  <div className="eauction-panel-head">
                    <div className="eauction-panel-title-text">MY LIVE BID STATUS & RANKS</div>
                    <span style={{ fontSize: '0.75rem', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '0.2rem 0.6rem', borderRadius: '0.375rem', fontWeight: 700 }}>
                      REAL-TIME BIDDING ACTIVE
                    </span>
                  </div>

                  <table className="eauction-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>RFQ Title & Code</th>
                        <th>Organization</th>
                        <th>Delivery Location</th>
                        <th>Closing Date & Time</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingApi ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>
                            Loading live bid status...
                          </td>
                        </tr>
                      ) : auctions.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748b' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#94a3b8' }}>
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                              </svg>
                              <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#1e293b' }}>No live bids found</span>
                              <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>There are currently no active live auctions available for your account.</span>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        (() => {
                          const paginatedAuctions = auctions.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

                          return paginatedAuctions.map((auc, idx) => {
                            const globalIdx = (currentPage - 1) * PAGE_SIZE + idx + 1;
                            return (
                              <tr
                                key={auc.id}
                                style={{
                                  background: selectedLot && auc.id === selectedLot.id ? '#eff6ff' : 'transparent',
                                  cursor: 'pointer',
                                }}
                                onClick={() => setSelectedLot(auc)}
                              >
                                <td>{globalIdx}</td>
                                <td>
                                  <div style={{ fontWeight: 600, color: '#0f172a' }}>{auc.name}</div>
                                  <div style={{ fontSize: '0.71875rem', color: '#64748b' }}>{auc.itemCode}</div>
                                </td>
                                <td style={{ color: '#334155', fontWeight: 500 }}>{auc.organizationName}</td>
                                <td style={{ color: '#334155' }}>{auc.deliveryLocation}</td>
                                <td>
                                  <span className="eauction-timer">{auc.formattedEndDate}</span>
                                </td>
                                <td>
                                  <button
                                    className="eauction-action-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedLot(auc);
                                    }}
                                  >
                                    PLACE BID
                                  </button>
                                </td>
                              </tr>
                            );
                          });
                        })()
                      )}
                    </tbody>
                  </table>

                  {/* Pagination Bar */}
                  {auctions.length > 0 && (() => {
                    const totalPages = Math.ceil(auctions.length / PAGE_SIZE) || 1;
                    const startItem = (currentPage - 1) * PAGE_SIZE + 1;
                    const endItem = Math.min(currentPage * PAGE_SIZE, auctions.length);

                    return (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.875rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '0.78125rem', color: '#64748b' }}>
                          Showing <strong style={{ color: '#0f172a' }}>{startItem}</strong> to <strong style={{ color: '#0f172a' }}>{endItem}</strong> of <strong style={{ color: '#0f172a' }}>{auctions.length}</strong> live tenders
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            style={{
                              padding: '0.3rem 0.6rem',
                              border: '1px solid #cbd5e1',
                              borderRadius: '0.375rem',
                              background: currentPage === 1 ? '#f8fafc' : '#ffffff',
                              color: currentPage === 1 ? '#94a3b8' : '#0f172a',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                            }}
                          >
                            ‹ Prev
                          </button>

                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                            <button
                              key={pg}
                              onClick={() => setCurrentPage(pg)}
                              style={{
                                padding: '0.3rem 0.6rem',
                                border: pg === currentPage ? '1px solid #0057b8' : '1px solid #cbd5e1',
                                borderRadius: '0.375rem',
                                background: pg === currentPage ? '#0057b8' : '#ffffff',
                                color: pg === currentPage ? '#ffffff' : '#0f172a',
                                fontWeight: 700,
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                              }}
                            >
                              {pg}
                            </button>
                          ))}

                          <button
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages || totalPages === 0}
                            style={{
                              padding: '0.3rem 0.6rem',
                              border: '1px solid #cbd5e1',
                              borderRadius: '0.375rem',
                              background: (currentPage === totalPages || totalPages === 0) ? '#f8fafc' : '#ffffff',
                              color: (currentPage === totalPages || totalPages === 0) ? '#94a3b8' : '#0f172a',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              cursor: (currentPage === totalPages || totalPages === 0) ? 'not-allowed' : 'pointer',
                            }}
                          >
                            Next ›
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Split Bottom Workspace */}
                <div
                  className="eauction-grid-split"
                  style={selectedRfqDetails?.addLotOption === false ? { gridTemplateColumns: '1fr' } : undefined}
                >
                  {/* Left Column: Live Bidding View */}
                  <div className="eauction-panel-light" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="eauction-panel-head">
                      <div className="eauction-panel-title-text">
                        LIVE BIDDING VIEW: <span style={{ color: '#0057b8' }}>{selectedLot?.name || "No Active Tender Selected"}</span>
                      </div>
                    </div>

                    {/* Material Details Table from rfq-by-id API */}
                    <div style={{ marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Material Details {selectedRfqDetails?.addLotOption ? "(Single Lot Bidding)" : "(Line Item Bidding)"}
                        </span>
                        {selectedRfqDetails && (
                          <span style={{ fontSize: '0.71875rem', color: selectedRfqDetails.addLotOption ? '#0284c7' : '#16a34a', fontWeight: 600 }}>
                            {selectedRfqDetails.addLotOption ? "Single Lot Quote Allowed" : "Item-Wise Line Bidding Enabled"}
                          </span>
                        )}
                      </div>

                      {loadingDetails ? (
                        <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b', fontSize: '0.8125rem' }}>
                          Loading material specification details...
                        </div>
                      ) : selectedRfqDetails?.items && selectedRfqDetails.items.length > 0 ? (
                        selectedRfqDetails.addLotOption ? (
                          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '0.5rem', background: '#ffffff' }}>
                            <table className="eauction-table" style={{ margin: 0 }}>
                              <thead>
                                <tr style={{ background: '#f8fafc' }}>
                                  <th style={{ width: '36px' }}>#</th>
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
                                      <td style={{ color: '#94a3b8', fontWeight: 600 }}>{idx + 1}</td>
                                      <td>
                                        <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.8125rem' }}>{item.description}</div>
                                        {item.materialGroup && (
                                          <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>Group: {item.materialGroup}</div>
                                        )}
                                      </td>
                                      <td>
                                        <span style={{ background: '#f1f5f9', color: '#334155', padding: '2px 6px', borderRadius: '4px', fontSize: '0.6875rem', fontFamily: 'monospace', fontWeight: 600 }}>
                                          {item.materialCode || "N/A"}
                                        </span>
                                      </td>
                                      <td style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.8125rem' }}>
                                        {item.quantity} <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>{item.uom}</span>
                                      </td>
                                      <td style={{ fontSize: '0.75rem', color: '#475569' }}>
                                        {item.costCenterName || item.costCenter || "—"}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '0.5rem', background: '#ffffff' }}>
                            <table className="eauction-table" style={{ margin: 0 }}>
                              <thead>
                                <tr style={{ background: '#f8fafc' }}>
                                  <th>Material Info</th>
                                  <th>Code</th>
                                  <th>Qty</th>
                                  <th style={{ width: '100px' }}>Delivery Charge</th>
                                  <th style={{ width: '110px' }}>Delivery Type</th>
                                  <th style={{ width: '100px' }}>Discount</th>
                                  <th style={{ width: '110px' }}>Discount Type</th>
                                  <th style={{ width: '100px' }}>Tax</th>
                                  <th style={{ width: '110px' }}>Tax Type</th>
                                  <th style={{ width: '110px', textAlign: 'right' }}>Quoted Price</th>
                                  <th style={{ width: '100px', textAlign: 'right' }}>Sub Total</th>
                                  <th style={{ width: '110px', textAlign: 'right' }}>Quoted Amount</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedRfqDetails.items.map((item, idx) => {
                                  const itemKey = item.supplierRFQItemId || `item-${idx}`;
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
                                  };
                                  return (
                                    <tr key={itemKey}>
                                      <td>
                                        <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.8125rem' }}>{item.description}</div>
                                        {item.materialGroup && (
                                          <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>Group: {item.materialGroup}</div>
                                        )}
                                      </td>
                                      <td>
                                        <span style={{ background: '#f1f5f9', color: '#334155', padding: '2px 6px', borderRadius: '4px', fontSize: '0.6875rem', fontFamily: 'monospace', fontWeight: 600 }}>
                                          {item.materialCode || "N/A"}
                                        </span>
                                      </td>
                                      <td style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.8125rem' }}>
                                        {item.quantity} <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>{item.uom}</span>
                                      </td>
                                      <td>
                                        <input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          value={line.deliveryCharge || ""}
                                          onChange={(e) => handleLineItemFieldChange(itemKey, "deliveryCharge", e.target.value)}
                                          placeholder="0.00"
                                          style={{ width: '90px', padding: '4px 6px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.75rem' }}
                                        />
                                      </td>
                                      <td>
                                        <select
                                          value={line.deliveryType}
                                          onChange={(e) => handleLineItemFieldChange(itemKey, "deliveryType", e.target.value)}
                                          style={{ width: '100px', padding: '4px 6px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.75rem', background: '#ffffff' }}
                                        >
                                          <option value="PERCENTAGE">PERCENTAGE</option>
                                          <option value="AMOUNT">AMOUNT</option>
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
                                          style={{ width: '90px', padding: '4px 6px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.75rem' }}
                                        />
                                      </td>
                                      <td>
                                        <select
                                          value={line.discountType}
                                          onChange={(e) => handleLineItemFieldChange(itemKey, "discountType", e.target.value)}
                                          style={{ width: '100px', padding: '4px 6px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.75rem', background: '#ffffff' }}
                                        >
                                          <option value="PERCENTAGE">PERCENTAGE</option>
                                          <option value="AMOUNT">AMOUNT</option>
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
                                          style={{ width: '90px', padding: '4px 6px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.75rem' }}
                                        />
                                      </td>
                                      <td>
                                        <select
                                          value={line.taxType}
                                          onChange={(e) => handleLineItemFieldChange(itemKey, "taxType", e.target.value)}
                                          style={{ width: '100px', padding: '4px 6px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.75rem', background: '#ffffff' }}
                                        >
                                          <option value="PERCENTAGE">PERCENTAGE</option>
                                          <option value="AMOUNT">AMOUNT</option>
                                        </select>
                                      </td>
                                      <td style={{ textAlign: 'right' }}>
                                        <input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          value={line.quotedPrice || ""}
                                          onChange={(e) => handleLineItemFieldChange(itemKey, "quotedPrice", e.target.value)}
                                          placeholder="0.00"
                                          style={{ width: '100px', padding: '4px 6px', border: '1px solid #cbd5e1', borderRadius: '6px', textAlign: 'right', fontWeight: 700, color: '#047857', fontSize: '0.75rem', outline: 'none' }}
                                        />
                                      </td>
                                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#0f172a', fontSize: '0.75rem' }}>
                                        {line.subTotal.toFixed(2)}
                                      </td>
                                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#0f172a', fontSize: '0.75rem' }}>
                                        {line.quotedAmount.toFixed(2)}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )
                      ) : (
                        <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '0.375rem', fontSize: '0.75rem', color: '#64748b' }}>
                          No material items listed for this tender.
                        </div>
                      )}
                    </div>

                    {selectedRfqDetails?.addLotOption === false && (
                      <>
                        {submitBidError && (
                          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', padding: '0.625rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                            {submitBidError}
                          </div>
                        )}

                        {bidSubmittedMessage && (
                          <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', padding: '0.625rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.75rem' }}>
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
                              style={{
                                border: 'none',
                                background: 'transparent',
                                outline: 'none',
                                fontSize: '1.125rem',
                                fontWeight: 800,
                                color: '#047857',
                                textAlign: 'right',
                                width: '110px',
                              }}
                            />
                          </div>
                          <button
                            className="eauction-btn-submit-bid eauction-btn-submit-bid--inline"
                            onClick={handleSubmitLiveBid}
                            disabled={submittingBid}
                            style={{ opacity: submittingBid ? 0.7 : 1 }}
                          >
                            {submittingBid ? "Submitting Live Bid..." : "⚡ SUBMIT LIVE BID"}
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Right Column: Supplier Live Bidding Submission Panel (Single Lot Bidding only) */}
                  {selectedRfqDetails?.addLotOption !== false && (
                    <div className="eauction-panel-light" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div className="eauction-panel-title-text">SUBMIT COMPETITIVE BID</div>

                      {submitBidError && (
                        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', padding: '0.625rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 600 }}>
                          {submitBidError}
                        </div>
                      )}

                      {bidSubmittedMessage && (
                        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', padding: '0.625rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 600 }}>
                          {bidSubmittedMessage}
                        </div>
                      )}

                      {/* Quotation Details Form */}
                      <div className="eauction-supplier-bid-box">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                          <div>
                            <label className="eauction-bid-field-label">Delivery Charge</label>
                            <input
                              type="number"
                              className="eauction-bid-field-input"
                              value={deliveryCharge}
                              onChange={(e) => setDeliveryCharge(e.target.value)}
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <label className="eauction-bid-field-label">Delivery Type</label>
                            <select
                              className="eauction-bid-field-input"
                              value={deliveryType}
                              onChange={(e) => setDeliveryType(e.target.value)}
                            >
                              <option value="PERCENTAGE">PERCENTAGE</option>
                              <option value="AMOUNT">AMOUNT</option>
                            </select>
                          </div>
                          <div>
                            <label className="eauction-bid-field-label">Discount</label>
                            <input
                              type="number"
                              className="eauction-bid-field-input"
                              value={discount}
                              onChange={(e) => setDiscount(e.target.value)}
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <label className="eauction-bid-field-label">Discount Type</label>
                            <select
                              className="eauction-bid-field-input"
                              value={discountType}
                              onChange={(e) => setDiscountType(e.target.value)}
                            >
                              <option value="PERCENTAGE">PERCENTAGE</option>
                              <option value="AMOUNT">AMOUNT</option>
                            </select>
                          </div>
                          <div>
                            <label className="eauction-bid-field-label">Tax</label>
                            <input
                              type="number"
                              className="eauction-bid-field-input"
                              value={tax}
                              onChange={(e) => setTax(e.target.value)}
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <label className="eauction-bid-field-label">Tax Type</label>
                            <select
                              className="eauction-bid-field-input"
                              value={taxType}
                              onChange={(e) => setTaxType(e.target.value)}
                            >
                              <option value="PERCENTAGE">PERCENTAGE</option>
                              <option value="AMOUNT">AMOUNT</option>
                            </select>
                          </div>
                        </div>

                        <div className="eauction-total-quote-row">
                          <div className="eauction-total-quote-label">Total Price Quote</div>
                          <div className="eauction-total-quote-value-box">
                            <span style={{ fontSize: '1rem', fontWeight: 800, color: '#047857' }}>$</span>
                            <input
                              type="number"
                              value={totalPriceQuote}
                              onChange={(e) => setTotalPriceQuote(e.target.value)}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                outline: 'none',
                                fontSize: '1.125rem',
                                fontWeight: 800,
                                color: '#047857',
                                textAlign: 'right',
                                width: '110px',
                              }}
                            />
                          </div>
                        </div>

                        <button
                          className="eauction-btn-submit-bid"
                          onClick={handleSubmitLiveBid}
                          disabled={submittingBid}
                          style={{ opacity: submittingBid ? 0.7 : 1 }}
                        >
                          {submittingBid ? "Submitting Live Bid..." : "⚡ SUBMIT LIVE BID"}
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
        <div className="eauction-modal-overlay" onClick={() => setOtpStage("none")} style={{ zIndex: 99999 }}>
          <div className="eauction-portal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', height: 'auto', background: '#ffffff', borderRadius: '0.75rem', padding: '1.5rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0057b8', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                ✉️ Verify It's You
              </span>
              <button style={{ background: 'none', border: 'none', fontSize: '1.125rem', cursor: 'pointer', color: '#64748b' }} onClick={() => setOtpStage("none")}>
                ✕
              </button>
            </div>

            <div style={{ textAlign: 'center', paddingTop: '1.25rem', paddingBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>
                Confirm Live Bid Submission
              </h3>
              <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                For security, we'll send a one-time verification code to your registered email before submitting your live competitive bid.
              </p>
              {otpError && (
                <div style={{ color: '#ef4444', fontSize: '0.8125rem', marginTop: '0.75rem', fontWeight: 600 }}>{otpError}</div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.625rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
              <button
                type="button"
                onClick={() => setOtpStage("none")}
                style={{ flex: 1, padding: '0.5rem', border: '1px solid #cbd5e1', background: '#ffffff', borderRadius: '0.375rem', fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={sendingOtp}
                style={{ flex: 1, padding: '0.5rem', border: 'none', background: '#0057b8', color: '#ffffff', borderRadius: '0.375rem', fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer' }}
              >
                {sendingOtp ? "Sending..." : "Send OTP"}
              </button>
            </div>
          </div>
        </div>
      )}

      {otpStage === "verify" && (
        <div className="eauction-modal-overlay" onClick={() => setOtpStage("none")} style={{ zIndex: 99999 }}>
          <div className="eauction-portal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', height: 'auto', background: '#ffffff', borderRadius: '0.75rem', padding: '1.5rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0057b8', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                🔑 Enter Verification Code
              </span>
              <button style={{ background: 'none', border: 'none', fontSize: '1.125rem', cursor: 'pointer', color: '#64748b' }} onClick={() => setOtpStage("none")}>
                ✕
              </button>
            </div>

            <div style={{ paddingTop: '1.25rem', paddingBottom: '0.5rem' }}>
              <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1rem', textAlign: 'center', lineHeight: 1.4 }}>
                We've sent a 6-digit verification code to your email. It expires in{" "}
                <strong style={{ color: otpRemaining <= 30 ? '#ef4444' : '#1e293b' }}>
                  {formatOtpTimer(otpRemaining)}
                </strong>.
              </p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter OTP Code"
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '0.375rem',
                  fontSize: '1.25rem',
                  letterSpacing: '4px',
                  textAlign: 'center',
                  fontWeight: 700,
                  color: '#0f172a',
                  outline: 'none',
                }}
              />
              {otpRemaining <= 0 ? (
                <div style={{ color: '#ef4444', fontSize: '0.8125rem', marginTop: '0.625rem', textAlign: 'center' }}>
                  Code expired. Please resend the OTP.
                </div>
              ) : otpError ? (
                <div style={{ color: '#ef4444', fontSize: '0.8125rem', marginTop: '0.625rem', textAlign: 'center' }}>{otpError}</div>
              ) : null}

              <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={sendingOtp || otpRemaining > 0}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: otpRemaining > 0 ? '#94a3b8' : '#0057b8',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: otpRemaining > 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  Resend OTP Code
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.625rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setOtpStage("none")}
                style={{ flex: 1, padding: '0.5rem', border: '1px solid #cbd5e1', background: '#ffffff', borderRadius: '0.375rem', fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={verifyingOtp || !otpCode.trim()}
                style={{ flex: 1, padding: '0.5rem', border: 'none', background: '#047857', color: '#ffffff', borderRadius: '0.375rem', fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer', opacity: (verifyingOtp || !otpCode.trim()) ? 0.7 : 1 }}
              >
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
