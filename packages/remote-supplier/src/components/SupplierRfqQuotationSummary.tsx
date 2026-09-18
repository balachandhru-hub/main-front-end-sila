import React, { useEffect, useMemo, useRef, useState } from "react";
import "./SupplierRfqQuotationSummary.css";
import SupplierRFQChat from "./SupplierRFQChat/SupplierRFQChat";
import {
  fetchRFQById,
  fetchSupplierQuotationBySupplierId,
  getSupplierProfile,
  submitSupplierQuotation,
  submitRfqAnswers,
  fetchMetadataReferenceList,
  sendOtp,
  verifyOtp,
  type RFQDetailResponse,
  type SubmitQuotationPayload,
  type RfqDocumentAssetDto,
  type SupplierQuotationByIdItem,
  fetchBuyerAsset,
} from "../api/supplierApi";
import { Button, isErrorResponse } from "@vosox/shared-ui";

const IconClose = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconMail = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 6-10 7L2 6" />
  </svg>
);

const IconFile = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M8 13h8M8 17h8M8 9h2" />
  </svg>
);

const IconEye = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
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

const IconMessageSquare = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const IconCheckCircle = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const IconAlertCircle = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

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

interface SupplierRfqQuotationSummaryProps {
  selectedRfq: RFQDetailResponse | null;
  selectedRfqId: string | null;
  ownQuotation: SupplierQuotationByIdItem | null;
  loadingRfqDetail: boolean;
  rfqDetailError: string | null;
  supplierId: string | null;
  onClose: () => void;
  onRetry: () => void;
  setSelectedRfq: React.Dispatch<React.SetStateAction<RFQDetailResponse | null>>;
  setOwnQuotation: React.Dispatch<React.SetStateAction<SupplierQuotationByIdItem | null>>;
  onRfqsRefresh: () => void;
}

const SupplierRfqQuotationSummary: React.FC<SupplierRfqQuotationSummaryProps> = ({
  selectedRfq,
  selectedRfqId,
  ownQuotation,
  loadingRfqDetail,
  rfqDetailError,
  supplierId,
  onClose,
  onRetry,
  setSelectedRfq,
  setOwnQuotation,
  onRfqsRefresh,
}) => {
  const [isChatOpen, setIsChatOpen] = useState(false);

  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [otpStage, setOtpStage] = useState<"none" | "send" | "verify">("none");
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null);
  const [otpRemaining, setOtpRemaining] = useState(600);
  const supplierEmailRef = useRef<string | null>(null);

  const OTP_WINDOW_MS = 10 * 60 * 1000;

  const formatOtpTimer = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const parseAsUtcMs = (dateStr?: string | null): number | null => {
    if (!dateStr) return null;
    const hasTz = /Z$|[+-]\d{2}:\d{2}$/.test(dateStr);
    const ms = Date.parse(hasTz ? dateStr : `${dateStr}Z`);
    return Number.isNaN(ms) ? null : ms;
  };

  const getRfqSubmissionWindowStatus = (rfq: RFQDetailResponse | null) => {
    if (!rfq) return { notYetOpen: false, closed: false, frozen: false, canSubmit: false };
    const startMs = parseAsUtcMs(rfq.startDate);
    const endMs = parseAsUtcMs(rfq.endDate);
    const nowMs = Date.now();

    const notYetOpen = startMs !== null && nowMs < startMs;
    const closed = endMs !== null && nowMs > endMs;
    const frozen = rfq.status === "Freezing";

    return { notYetOpen, closed, frozen, canSubmit: !notYetOpen && !closed && !frozen };
  };

  useEffect(() => {
    if (otpStage !== "verify" || !otpExpiresAt) return;
    const tick = () => {
      const left = Math.max(0, Math.round((otpExpiresAt - Date.now()) / 1000));
      setOtpRemaining(left);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [otpStage, otpExpiresAt]);

  const [rfqAnswers, setRfqAnswers] = useState<{
    [questionId: string]: {
      rfqQuestionId: string;
      answer: string;
      questionOptionId: string | null;
      questionOptionIds: string[];
      file?: File;
      fileBase64?: string;
      contentType?: string;
    };
  }>({});
  const [submittingAnswers, setSubmittingAnswers] = useState(false);
  const [submitAnswersError, setSubmitAnswersError] = useState<string | null>(null);
  const [submitAnswersSuccess, setSubmitAnswersSuccess] = useState(false);
  const [rfqWindowTick, setRfqWindowTick] = useState(0);

  useEffect(() => {
    if (!selectedRfq) return;
    const t = setInterval(() => setRfqWindowTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, [selectedRfq]);

  const { notYetOpen, closed, frozen, canSubmit } = useMemo(
    () => getRfqSubmissionWindowStatus(selectedRfq),
    [selectedRfq, rfqWindowTick],
  );

  const [quoteQuotationId, setQuoteQuotationId] = useState<string | null>(null);
  const [quoteTotalPrice, setQuoteTotalPrice] = useState<number>(0);
  const [quoteDeliveryCharge, setQuoteDeliveryCharge] = useState<number>(0);
  const [quoteDeliveryType, setQuoteDeliveryType] = useState<string>("PERCENTAGE");
  const [quoteDiscount, setQuoteDiscount] = useState<number>(0);
  const [quoteDiscountType, setQuoteDiscountType] = useState<string>("PERCENTAGE");
  const [quoteTax, setQuoteTax] = useState<number>(0);
  const [quoteTaxType, setQuoteTaxType] = useState<string>("PERCENTAGE");
  const [quoteItemPrices, setQuoteItemPrices] = useState<{ [key: string]: number }>({});

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
  const [quoteLineItems, setQuoteLineItems] = useState<{ [supplierRFQItemId: string]: QuoteLineItem }>({});

  const [submittingQuote, setSubmittingQuote] = useState(false);
  const [submitQuoteError, setSubmitQuoteError] = useState<string | null>(null);
  const [submitQuoteSuccess, setSubmitQuoteSuccess] = useState(false);

  useEffect(() => {
    if (selectedRfq) {
      const rfqQuote = selectedRfq.supplierQuotation?.[0];
      const activeQuote = ownQuotation || rfqQuote;

      if (activeQuote) {
        setQuoteQuotationId(
          ownQuotation?.quotationId ||
          rfqQuote?.qutationId ||
          rfqQuote?.id ||
          null
        );
        setQuoteTotalPrice(activeQuote.totalPrice || 0);
        setQuoteDeliveryCharge(activeQuote.deliveryCharge || 0);
        setQuoteDeliveryType(activeQuote.deliveryType || "PERCENTAGE");
        setQuoteDiscount(activeQuote.discount || 0);
        setQuoteDiscountType(rfqQuote?.discountType || "PERCENTAGE");
        setQuoteTax(activeQuote.tax || 0);
        setQuoteTaxType(rfqQuote?.taxType || "PERCENTAGE");
      } else {
        setQuoteQuotationId(null);
        setQuoteTotalPrice(0);
        setQuoteDeliveryCharge(0);
        setQuoteDeliveryType("PERCENTAGE");
        setQuoteDiscount(0);
        setQuoteDiscountType("PERCENTAGE");
        setQuoteTax(0);
        setQuoteTaxType("PERCENTAGE");
      }

      const prices: { [key: string]: number } = {};
      selectedRfq.items?.forEach((item, idx) => {
        const ownItemQuote = ownQuotation?.supplierQuotationItems?.[idx];
        const key = item.id || item.buyerRFQItemId || `item-${idx}`;
        prices[key] = ownItemQuote?.quotedPrice ?? 0;
      });
      setQuoteItemPrices(prices);
      if (!selectedRfq.addLotOption) {
        const lineItems: { [supplierRFQItemId: string]: QuoteLineItem } = {};
        selectedRfq.items?.forEach((item) => {
          const itemKey = item.supplierRFQItemId;
          if (!itemKey) return;
          const matchedOwnItem = ownQuotation?.supplierQuotationItems?.find(
            (qi) => qi.supplierRFQItemId === itemKey
          );
          const matchedRfqItem = selectedRfq.supplierQuotationItems?.find(
            (qi) => qi.supplierRFQItemId === itemKey
          );
          const source = matchedOwnItem || matchedRfqItem;
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

      setSubmitQuoteSuccess(false);
      setSubmitQuoteError(null);
      const answers: typeof rfqAnswers = {};
      selectedRfq.questions?.forEach((q) => {
        answers[q.questionId] = {
          rfqQuestionId: q.questionId,
          answer: "",
          questionOptionId: null,
          questionOptionIds: [],
        };
      });
      setRfqAnswers(answers);
      setSubmitAnswersSuccess(false);
      setSubmitAnswersError(null);
    }
  }, [selectedRfq, ownQuotation]);

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

  const handleOtherFieldChange = (field: string, value: any) => {
    if (field === "deliveryCharge") {
      setQuoteDeliveryCharge(Number(value) || 0);
    } else if (field === "tax") {
      setQuoteTax(Number(value) || 0);
    } else if (field === "discount") {
      setQuoteDiscount(Number(value) || 0);
    } else if (field === "deliveryType") {
      setQuoteDeliveryType(value);
    } else if (field === "discountType") {
      setQuoteDiscountType(value);
    } else if (field === "taxType") {
      setQuoteTaxType(value);
    } else if (field === "totalPrice") {
      setQuoteTotalPrice(Number(value) || 0);
    }
  };

  const [bulkValue, setBulkValue] = useState("");
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
    if (bulkValue === "" || !selectedRfq?.items) return;

    const fieldKeys = (Object.keys(bulkFields) as (keyof typeof bulkFields)[]).filter(
      (key) => bulkFields[key]
    );
    if (fieldKeys.length === 0) return;

    selectedRfq.items.forEach((item, idx) => {
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

  const handleTextAnswerChange = (questionId: string, value: string) => {
    setRfqAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...(prev[questionId] || { rfqQuestionId: questionId, questionOptionId: null, questionOptionIds: [] }),
        rfqQuestionId: questionId,
        answer: value,
      },
    }));
  };

  const handleRadioAnswerChange = (questionId: string, optionId: string) => {
    setRfqAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...(prev[questionId] || { rfqQuestionId: questionId, answer: "" }),
        rfqQuestionId: questionId,
        questionOptionId: optionId,
        questionOptionIds: [optionId],
      },
    }));
  };

  const handleCheckboxAnswerChange = (questionId: string, optionId: string, checked: boolean) => {
    setRfqAnswers((prev) => {
      const current = prev[questionId]?.questionOptionIds || [];
      const updated = checked ? [...current, optionId] : current.filter((id) => id !== optionId);
      return {
        ...prev,
        [questionId]: {
          ...(prev[questionId] || { rfqQuestionId: questionId, answer: "", questionOptionId: null }),
          rfqQuestionId: questionId,
          questionOptionIds: updated,
        },
      };
    });
  };

  const handleFileAnswerChange = (questionId: string, file: File | null) => {
    if (!file) {
      setRfqAnswers((prev) => ({
        ...prev,
        [questionId]: {
          ...(prev[questionId] || { rfqQuestionId: questionId, answer: "", questionOptionId: null, questionOptionIds: [] }),
          rfqQuestionId: questionId,
          answer: "",
          file: undefined,
          fileBase64: "",
          contentType: "",
        },
      }));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1] || result;
      setRfqAnswers((prev) => ({
        ...prev,
        [questionId]: {
          ...(prev[questionId] || { rfqQuestionId: questionId, answer: "", questionOptionId: null, questionOptionIds: [] }),
          rfqQuestionId: questionId,
          answer: file.name,
          file: file,
          fileBase64: base64Data,
          contentType: file.type,
        },
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitRfqAnswers = async () => {
    if (!selectedRfq) return;
    const supplierRFQId = selectedRfq.items?.[0]?.supplierRFQId || null;

    const unanswered = (selectedRfq.questions || []).find((q) => {
      if (!q.isRequired) return false;
      const a = rfqAnswers[q.questionId];
      if (!a) return true;
      if (q.questionType === "Text") return !a.answer?.trim();
      if (q.questionType === "Radio") return !a.questionOptionId;
      if (q.questionType === "File" || q.questionType === "FILE") return !a.file;
      return (a.questionOptionIds?.length ?? 0) === 0;
    });
    if (unanswered) {
      setSubmitAnswersError(`Please answer the required question: "${unanswered.question}"`);
      return;
    }

    setSubmittingAnswers(true);
    setSubmitAnswersError(null);
    setSubmitAnswersSuccess(false);
    try {
      const entityTypes = await fetchMetadataReferenceList(['ENTITY_TYPE']);

      // ✅ ADD ERROR CHECK HERE
      if (isErrorResponse(entityTypes)) {
        setSubmitAnswersError(entityTypes.description || entityTypes.message || "Failed to fetch metadata.");
        setSubmittingAnswers(false);
        return;
      }

      const supplierEntityId =
        entityTypes.find((e) => e.key === 'SUPPLIER')?.id || '59476530-3c10-438b-b3b3-9db9e96e8d93';
      const entityType = entityTypes.find((e) => e.key === 'SUPPLIER')?.key || 'SUPPLIER';

      const payload = {
        supplierRFQId: supplierRFQId as string,
        supplierId: supplierId as string,
        answers: Object.values(rfqAnswers).map((a) => {
          const question = selectedRfq.questions?.find(q => q.questionId === a.rfqQuestionId);
          const allOptionIds = question?.options?.map(opt => opt.optionId) || [];

          const answerAttachment: RfqDocumentAssetDto | null =
            a.file && a.fileBase64
              ? {
                entityType: entityType,
                entityId: supplierEntityId,
                assetType: "RFQ_ANSWER_ATTACHMENT",
                fileBytes: a.fileBase64,
                fileName: a.file.name,
                contentType: a.contentType || a.file.type,
                isSingletonAsset: true,
              }
              : null;

          return {
            rfqQuestionId: a.rfqQuestionId,
            answer: a.answer || "",
            questionOptionId: a.questionOptionId || (a.questionOptionIds?.length ? a.questionOptionIds[0] : null),
            questionOptionIds: allOptionIds,
            attachment: answerAttachment
          };
        }),
      };

      await submitRfqAnswers(payload);
      setSubmitAnswersSuccess(true);
    } catch (err: any) {
      setSubmitAnswersError(err.message || "Failed to submit answers.");
    } finally {
      setSubmittingAnswers(false);
    }
  };

  const handleDocumentAction = async (doc: any, action: 'preview' | 'download') => {
    const assetId = doc.id || doc.assetId;
    if (!assetId) {
      alert("Document asset ID is missing.");
      return;
    }

    try {
      const data = await fetchBuyerAsset(assetId);
      if ('statusCode' in data && data.statusCode) {
        throw new Error(data.message || 'Failed to fetch document.');
      }

      const fileBytes = (data as any).fileBytes;
      const fileName = (data as any).fileName || doc.fileName || doc.assetName || "document";
      const rawType = ((data as any).contentType || (data as any).fileType || doc.fileType || "pdf").toLowerCase();

      let mimeType = "application/pdf";
      if (rawType.includes("pdf")) mimeType = "application/pdf";
      else if (rawType.includes("png")) mimeType = "image/png";
      else if (rawType.includes("jpg") || rawType.includes("jpeg")) mimeType = "image/jpeg";
      else if (rawType.includes("txt")) mimeType = "text/plain";
      else if (rawType.includes("doc")) mimeType = "application/msword";

      let url = (data as any).url || (data as any).fileUrl;
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
        window.open(url, '_blank');
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
    }
  };

  // ✅ UPDATED: Handle submit button click - shows confirmation modal
  const handleSubmitQuotationClick = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setOtpError(null);

    const { canSubmit: withinWindow } = getRfqSubmissionWindowStatus(selectedRfq);
    if (!withinWindow) {
      setSubmitQuoteError("This RFQ is outside its active submission window and can no longer accept quotations.");
      return;
    }

    const verificationToken = getCookie(VERIFICATION_TOKEN_COOKIE);

    if (verificationToken) {
      setShowConfirmSubmit(true);
      return;
    }

    sessionStorage.removeItem("vsx_otp_expiry");
    setOtpCode("");
    setOtpStage("send");
  };

  const handleSendOtp = async () => {
    setOtpError(null);
    setSendingOtp(true);
    try {
      if (!supplierEmailRef.current) {
        const profile = await getSupplierProfile();
        if (!isErrorResponse(profile) && profile && "businessProfile" in profile) {
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
        // Backend already has a live OTP for this supplier — let them verify the one they have
        // instead of dead-ending on this error. If it's since expired server-side, verifyOtp
        // will reject it and the supplier can hit Resend once our local countdown runs out.
      }
      const expiry = Date.now() + OTP_WINDOW_MS;
      sessionStorage.setItem("vsx_otp_expiry", String(expiry));
      deleteCookie(VERIFICATION_TOKEN_COOKIE);
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
      setOtpStage("none");
      setShowConfirmSubmit(true);
    } catch (err: any) {
      setOtpError(err?.message || "That code didn't match, try again.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleConfirmSubmitQuotation = async () => {
    if (!selectedRfq) return;

    const { canSubmit: withinWindow } = getRfqSubmissionWindowStatus(selectedRfq);
    if (!withinWindow) {
      setShowConfirmSubmit(false);
      setSubmitQuoteError("This RFQ's submission window has closed. You can no longer submit a quotation.");
      return;
    }

    const verificationToken = getCookie(VERIFICATION_TOKEN_COOKIE);
    if (!verificationToken) {
      setShowConfirmSubmit(false);
      setOtpCode("");
      setOtpError(null);
      setOtpStage("send");
      return;
    }

    setShowConfirmSubmit(false);
    setSubmittingQuote(true);
    setSubmitQuoteError(null);
    setSubmitQuoteSuccess(false);

    try {
      const supplierRFQId = selectedRfq.items?.[0]?.supplierRFQId || null;

      const payload: SubmitQuotationPayload = {
        supplierQuotationId: quoteQuotationId,
        supplierRFQId: supplierRFQId,
        totalPrice: Number(quoteTotalPrice),
        deliveryCharge: Number(quoteDeliveryCharge),
        deliveryType: quoteDeliveryType,
        discount: Number(quoteDiscount),
        discountType: quoteDiscountType,
        tax: Number(quoteTax),
        taxType: quoteTaxType,
        temporaryVerificationToken: verificationToken,
        ...(selectedRfq.addLotOption ? {
          items: selectedRfq.items.map((item, idx) => {
            const key = item.id || item.buyerRFQItemId || `item-${idx}`;
            const itemQuote = selectedRfq.supplierQuotationItems?.[idx];
            // supplierQuotationItems can hold an empty draft-quotation stub whose IDs are
            // the all-zero placeholder GUID — that string is still "truthy" in JS, so it
            // must be filtered out explicitly rather than relying on `||` alone.
            const validId = (id?: string | null) =>
              id && id !==  "00000000-0000-0000-0000-000000000000" ? id : null;
            return {
              supplierRFQItemId: validId(item.supplierRFQItemId) || validId(itemQuote?.supplierRFQItemId) || validId(itemQuote?.id) || null,
              buyerRFQItemId: item.id || item.buyerRFQItemId || "",
              quotedPrice: Number(quoteItemPrices[key] ?? 0),
            };
          })
        } : {
          items: selectedRfq.items.map((item) => {
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
        })
      };

      const result = await submitSupplierQuotation(payload);
      if (result && "statusCode" in result && (result as any).statusCode >= 400) {
        const statusCode = (result as any).statusCode;
        const message = (result as any).message || "";
        const isTokenExpired = statusCode === 400 && /expired/i.test(message);
        if (isTokenExpired) {
          deleteCookie(VERIFICATION_TOKEN_COOKIE);
          setOtpCode("");
          setOtpError("Your verification has expired, please verify again.");
          setOtpStage("send");
          return;
        }
        setSubmitQuoteError(message || "Failed to submit quotation.");
        return;
      }
      sessionStorage.removeItem("vsx_otp_expiry");
      setSubmitQuoteSuccess(true);

      const updatedDetails = await fetchRFQById(selectedRfqId!);

      if (!isErrorResponse(updatedDetails)) {
        setSelectedRfq(updatedDetails);
      } else {
        setSubmitQuoteError(updatedDetails.description || updatedDetails.message || "Failed to refresh RFQ details.");
      }

      if (selectedRfqId) {
        try {
          const updatedQuotation = await fetchSupplierQuotationBySupplierId(selectedRfqId);
          if (
            !isErrorResponse(updatedQuotation) &&
            updatedQuotation &&
            'suppliers' in updatedQuotation &&
            Array.isArray(updatedQuotation.suppliers)
          ) {
            const mine =
              updatedQuotation.suppliers.find((s) => s.supplierId === supplierId) ||
              updatedQuotation.suppliers[0] ||
              null;
            setOwnQuotation(mine);
          }
        } catch {
        }
      }

      onRfqsRefresh();
    } catch (err: any) {
      setSubmitQuoteError(err.message || "Failed to submit quotation.");
    } finally {
      setSubmittingQuote(false);
    }
  };

  const isLeadQuote = Boolean(
    (ownQuotation?.isLead === true || (ownQuotation as any)?.isLead === "true") &&
    ownQuotation?.status === "SUBMITTED"
  );

  return (
    <>
      <div>
        {/* Modal Header */}
        <div id="pud-modal-header" >
          <div className="pud-header-left">

            <button
              id="pud-modal-close"
              onClick={onClose}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 15L7 10L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div>
              <h2 id="pud-modal-name">
                {/* {loadingRfqDetail
                  ? "Loading RFQ Details..."
                  : selectedRfq?.title || "RFQ Details"} */}
                <IconFile /> RFQ Specification
              </h2>
              <p className="pud-modal-subtitle"> Request supplier quotations and manage your procurement requirements.</p>

            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
            }}>
              {/* <span className="pud-modal-badge">

                </span> */}

              {isLeadQuote && (
                <span className="pud-modal-badge">
                  Leading
                </span>
              )}
            </div>


          </div>
          <div className="pud-header-right">

            {selectedRfq && (
              <div className="pud-modal-meta">
                {/* <span><IconCalendar /> Closes: {new Date(selectedRfq.endDate).toLocaleDateString()}</span>
                <span><IconPin /> Delivery: {selectedRfq.deliveryLocation}</span> */}
                {supplierId && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto', flexWrap: 'wrap' }}>
                    <Button
                      variant="primary"
                      type="button"
                      className="pud-btn pud-btn-outline pud-btn-chat"
                      onClick={() => setIsChatOpen(true)}
                      title="Chat with the buyer"
                    >
                      <IconMessageSquare /> Chat
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

        <form onSubmit={handleSubmitQuotationClick}>
          <div className="pud-modal-body pud-rfq-page-body">
            {loadingRfqDetail && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px', gap: '12px' }}>
                <div className="pud-spinner" />
                <span style={{ color: '#64748b', fontSize: '14px' }}>Fetching RFQ data from secure server...</span>
              </div>
            )}

            {rfqDetailError && (
              <div style={{ padding: '24px 0', textAlign: 'center' }}>
                <div style={{ color: '#ef4444', fontSize: '15px', marginBottom: '16px' }}>{rfqDetailError}</div>
                <button
                  type="button"
                  className="pud-btn pud-btn-outline"
                  onClick={onRetry}
                >
                  Retry Loading
                </button>
              </div>
            )}

            {selectedRfq && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                <div id="pud-details-card">
                  <div id="pud-details-title">RFQ Details</div>

                  <div id="pud-details-grid">
                    <div>
                      <div id="pud-detail-label">RFQ TITLE</div>
                      <div id="pud-detail-value">{selectedRfq.title || "—"}</div>
                    </div>

                    <div>
                      <div id="pud-detail-label">RFQ START DATE &amp; TIME</div>
                      <div id="pud-detail-value">
                        {selectedRfq.startDate
                          ? new Date(selectedRfq.startDate).toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                          : "—"}
                      </div>
                    </div>

                    <div>
                      <div id="pud-detail-label">RFQ CLOSE DATE &amp; TIME</div>
                      <div id="pud-detail-value">
                        {selectedRfq.endDate
                          ? new Date(selectedRfq.endDate).toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                          : "—"}
                      </div>
                    </div>

                    <div>
                      <div id="pud-detail-label">DELIVERY LOCATION</div>
                      <div id="pud-detail-value">{selectedRfq.deliveryLocation || "—"}</div>
                    </div>

                    <div id="pud-details-two">
                      <div id="pud-detail-label">DESCRIPTION</div>
                      <div id="pud-detail-value">{selectedRfq.description || "—"}</div>
                    </div>

                    <div>
                      <div id="pud-detail-label">LOT</div>
                      {selectedRfq.addLotOption ? (
                        <span id="pud-lot-badge">Allowed</span>
                      ) : (
                        <span id="pud-lot-badge-disabled">Not Allowed</span>
                      )}
                    </div>
                  </div>
                </div>



                {/* Sourcing Items Table */}
                <div>
                  {(() => {
                    const formatRank = (val: any): string => {
                      if (val == null || val === "") return "";
                      if (typeof val === "object") return String(val.rank ?? val.value ?? "");
                      return String(val);
                    };

                    const allQuotationItems: any[] = [];
                    const pushItems = (arr: any) => {
                      if (Array.isArray(arr)) allQuotationItems.push(...arr);
                    };

                    pushItems(ownQuotation?.supplierQuotationItems);
                    pushItems(selectedRfq?.supplierQuotationItems);

                    if (Array.isArray(selectedRfq?.supplierQuotation)) {
                      selectedRfq.supplierQuotation.forEach((sq: any) => pushItems(sq?.supplierQuotationItems));
                    } else if ((selectedRfq as any)?.supplierQuotation) {
                      pushItems((selectedRfq as any).supplierQuotation.supplierQuotationItems);
                    }

                    const rawSuppliers = (selectedRfq as any)?.suppliers;
                    if (Array.isArray(rawSuppliers)) {
                      rawSuppliers.forEach((s: any) => {
                        pushItems(s?.supplierQuotationItems);
                        if (Array.isArray(s?.supplierQuotation)) {
                          s.supplierQuotation.forEach((sq: any) => pushItems(sq?.supplierQuotationItems));
                        } else if (s?.supplierQuotation) {
                          pushItems(s.supplierQuotation.supplierQuotationItems);
                        }
                      });
                    } else if (rawSuppliers) {
                      pushItems(rawSuppliers.supplierQuotationItems);
                      pushItems(rawSuppliers.supplierQuotation?.supplierQuotationItems);
                    }

                    const showRankColumn = !selectedRfq.addLotOption;

                    const headerRank = formatRank(
                      ownQuotation?.rank ??
                      (selectedRfq?.supplierQuotation?.[0] as any)?.rank ??
                      (selectedRfq as any)?.suppliers?.[0]?.rank ??
                      (selectedRfq as any)?.suppliers?.rank
                    );

                    return (
                      <>
                        <div id="pud-items-count-card">
                          <div id="pud-items-count-label">Sourcing Items</div>
                          <div id="pud-items-count-value">
                            {selectedRfq.items?.length || 0}
                          </div>
                        </div>
                        <div className="quotation-summary-table">
                          <div style={{ display: 'grid', alignItems: 'center', justifyContent: 'space-between', gridTemplateColumns: 'repeat(2,1fr)' }}>
                            <div className="pud-modal-section-title" style={{ marginBottom: '12px', fontSize: "1.125rem", fontWeight: 700 }}>Quotation Summary</div>

                            <div className="pud-modal-section-title" style={{ marginBottom: '12px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                              {selectedRfq.addLotOption && headerRank !== "" && (
                                <span style={{ fontWeight: 600, fontSize: '15px', color: '#2060c6ff', background: '#ffffffff', borderRadius: '6px', padding: "0.5rem" }}>
                                  Rank: {headerRank}
                                </span>
                              )}
                            </div>
                            <p className="quotation-summary-subtitle">Review item pricing and enter applicable delivery charges, discounts, taxes, and quoted amounts.</p>
                          </div>

                          {!selectedRfq.addLotOption && (
                            <div id="pud-bulk-apply-panel">
                              <div id="pud-bulk-apply-header">
                                <div id="pud-bulk-apply-title">Bulk Apply</div>
                                <p id="pud-bulk-apply-subtitle">
                                  Enter a value, then toggle the columns you want it applied to.
                                </p>
                              </div>

                              <div id="pud-bulk-apply-controls">
                                {/* Bulk Value */}
                                <div id="pud-bulk-value">
                                  <input
                                    id="pud-bulk-value-input"
                                    type="number"
                                    value={bulkValue}
                                    onChange={(e) => setBulkValue(e.target.value)}
                                    placeholder="Enter value"
                                  />
                                </div>

                                {/* Bulk Value Type */}
                                <div id="pud-bulk-type-toggle" role="group" aria-label="Bulk value type">
                                  <button
                                    type="button"
                                    className={bulkValueType === "PERCENTAGE" ? "active" : ""}
                                    onClick={() => setBulkValueType("PERCENTAGE")}
                                  >
                                    Percentage
                                  </button>
                                  <button
                                    type="button"
                                    className={bulkValueType === "AMOUNT" ? "active" : ""}
                                    onClick={() => setBulkValueType("AMOUNT")}
                                  >
                                    Amount
                                  </button>
                                </div>

                                <div id="pud-bulk-fields">
                                  {/* Delivery Charge */}
                                  <label className="pud-bulk-toggle">
                                    <span>Delivery Charge</span>
                                    <span className="pud-switch">
                                      <input
                                        type="checkbox"
                                        checked={bulkFields.deliveryCharge}
                                        onChange={(e) =>
                                          handleBulkFieldToggle("deliveryCharge", e.target.checked)
                                        }
                                      />
                                      <span className="pud-slider"></span>
                                    </span>
                                  </label>

                                  {/* Discount */}
                                  <label className="pud-bulk-toggle">
                                    <span>Discount</span>
                                    <span className="pud-switch">
                                      <input
                                        type="checkbox"
                                        checked={bulkFields.discount}
                                        onChange={(e) =>
                                          handleBulkFieldToggle("discount", e.target.checked)
                                        }
                                      />
                                      <span className="pud-slider"></span>
                                    </span>
                                  </label>

                                  {/* Tax */}
                                  <label className="pud-bulk-toggle">
                                    <span>Tax</span>
                                    <span className="pud-switch">
                                      <input
                                        type="checkbox"
                                        checked={bulkFields.tax}
                                        onChange={(e) =>
                                          handleBulkFieldToggle("tax", e.target.checked)
                                        }
                                      />
                                      <span className="pud-slider"></span>
                                    </span>
                                  </label>

                                  {/* Quoted Price */}
                                  <label className="pud-bulk-toggle">
                                    <span>Quoted Price</span>
                                    <span className="pud-switch">
                                      <input
                                        type="checkbox"
                                        checked={bulkFields.quotedPrice}
                                        onChange={(e) =>
                                          handleBulkFieldToggle("quotedPrice", e.target.checked)
                                        }
                                      />
                                      <span className="pud-slider"></span>
                                    </span>
                                  </label>
                                </div>

                                {/* Apply */}
                                <Button
                                  variant="primary"
                                  type="button"
                                  id="pud-bulk-apply-btn"
                                  onClick={handleBulkApply}
                                >
                                  Apply
                                </Button>
                              </div>
                            </div>
                          )}


                          {selectedRfq.addLotOption ? (
                            <>
                              <div className="pud-rfq-table-container">
                                <table className="pud-rfq-items-table">
                                  <thead>
                                    <tr>
                                      <th>Material Info</th>
                                      <th>Code</th>
                                      <th style={{ textAlign: 'left' }}>Qty Required</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {selectedRfq.items?.map((item, idx) => {
                                      return (
                                        <tr key={idx}>
                                          <td>
                                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.description}</div>
                                          </td>
                                          <td>
                                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                              {item.materialCode || "N/A"}
                                            </div>
                                          </td>
                                          <td style={{ textAlign: 'left', fontWeight: 600, color: '#0f172a' }}>
                                            {item.quantity} <span style={{ fontSize: '12px', fontWeight: 400, color: '#64748b' }}>{item.uom}</span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>

                              <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
                                {isLeadQuote && (
                                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
                                    <span
                                      style={{
                                        background: '#fef3c7',
                                        color: '#b45309',
                                        border: '1px solid #fde68a',
                                        padding: '3px 8px',
                                        borderRadius: '6px',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                      }}
                                    >
                                      Leading
                                    </span>
                                  </div>
                                )}

                                {submitQuoteSuccess && (
                                  <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', color: '#15803d', padding: '12px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 500, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <IconCheckCircle /> Quotation submitted successfully!
                                  </div>
                                )}

                                {submitQuoteError && (
                                  <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '12px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 500, marginBottom: '16px' }}>
                                    {submitQuoteError}
                                  </div>
                                )}

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', background: '#f8fafc', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>

                                  {/* Delivery Charge */}
                                  <div>
                                    <label style={{ display: 'block', fontSize: '12px', color: '#475569', fontWeight: 600, marginBottom: '6px' }}>
                                      Delivery Charge
                                    </label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      className="pud-rfq-form-input"
                                      value={quoteDeliveryCharge || ""}
                                      onChange={(e) => handleOtherFieldChange("deliveryCharge", e.target.value)}
                                      placeholder="0.00"
                                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.75rem' }}
                                    />
                                  </div>

                                  {/* Delivery Type */}
                                  <div>
                                    <label style={{ display: 'block', fontSize: '12px', color: '#475569', fontWeight: 600, marginBottom: '6px' }}>
                                      Delivery Type
                                    </label>
                                    <select
                                      className="pud-rfq-form-input"
                                      value={quoteDeliveryType}
                                      onChange={(e) => handleOtherFieldChange("deliveryType", e.target.value)}
                                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.75rem', background: '#ffffff' }}
                                    >
                                      <option value="PERCENTAGE">PERCENATGE</option>
                                      <option value="AMOUNT">AMOUNT</option>
                                    </select>
                                  </div>

                                  {/* Discount */}
                                  <div>
                                    <label style={{ display: 'block', fontSize: '12px', color: '#475569', fontWeight: 600, marginBottom: '6px' }}>
                                      Discount
                                    </label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      className="pud-rfq-form-input"
                                      value={quoteDiscount || ""}
                                      onChange={(e) => handleOtherFieldChange("discount", e.target.value)}
                                      placeholder="0.00"
                                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.75rem' }}
                                    />
                                  </div>

                                  {/* Discount Type */}
                                  <div>
                                    <label style={{ display: 'block', fontSize: '12px', color: '#475569', fontWeight: 600, marginBottom: '6px' }}>
                                      Discount Type
                                    </label>
                                    <select
                                      className="pud-rfq-form-input"
                                      value={quoteDiscountType}
                                      onChange={(e) => handleOtherFieldChange("discountType", e.target.value)}
                                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.75rem', background: '#ffffff' }}
                                    >
                                      <option value="PERCENTAGE">PERCENTAGE</option>
                                      <option value="AMOUNT">AMOUNT</option>
                                    </select>
                                  </div>

                                  {/* Tax */}
                                  <div>
                                    <label style={{ display: 'block', fontSize: '12px', color: '#475569', fontWeight: 600, marginBottom: '6px' }}>
                                      Tax
                                    </label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      className="pud-rfq-form-input"
                                      value={quoteTax || ""}
                                      onChange={(e) => handleOtherFieldChange("tax", e.target.value)}
                                      placeholder="0.00"
                                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.75rem' }}
                                    />
                                  </div>

                                  {/* Tax Type */}
                                  <div>
                                    <label style={{ display: 'block', fontSize: '12px', color: '#475569', fontWeight: 600, marginBottom: '6px' }}>
                                      Tax Type
                                    </label>
                                    <select
                                      className="pud-rfq-form-input"
                                      value={quoteTaxType}
                                      onChange={(e) => handleOtherFieldChange("taxType", e.target.value)}
                                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.75rem', background: '#ffffff' }}
                                    >
                                      <option value="PERCENTAGE">PERCENTAGE</option>
                                      <option value="AMOUNT">AMOUNT</option>
                                    </select>
                                  </div>

                                  <div style={{ gridColumn: 'span 2', borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                      <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: 700 }}>Total Price Quote</span>
                                    </div>
                                    <input
                                      type="number"
                                      step="0.01"
                                      className="pud-rfq-form-input"
                                      value={quoteTotalPrice}
                                      onChange={(e) => handleOtherFieldChange("totalPrice", e.target.value)}
                                      placeholder="0.00"
                                      style={{ width: '180px', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '16px', fontWeight: 700, color: '#16a34a', textAlign: 'right' }}
                                      required
                                    />
                                  </div>

                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="pud-rfq-table-container">
                                <table className="pud-rfq-items-table">
                                  <thead>
                                    <tr>
                                      <th>Material Info</th>
                                      <th>Code</th>
                                      <th style={{ textAlign: "left" }}>Qty</th>
                                      <th style={{ textAlign: "left" }}>Delivery Charge</th>
                                      <th style={{ textAlign: "left" }}>Delivery Type</th>
                                      <th style={{ textAlign: "left" }}>Discount</th>
                                      <th style={{ textAlign: "left" }}>Discount Type</th>
                                      <th style={{ textAlign: "left" }}>Tax</th>
                                      <th style={{ textAlign: "left" }}>Tax Type</th>
                                      <th style={{ textAlign: "left", width: "110px" }}>Quoted Price</th>

                                      {showRankColumn && (
                                        <th style={{ textAlign: "left" }}>Rank</th>
                                      )}

                                      <th style={{ textAlign: "left", width: "110px" }}>Sub Total</th>
                                      <th style={{ textAlign: "left", width: "110px" }}>Quoted Amount</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {selectedRfq.items?.map((item, idx) => {
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
                                      };
                                      const matchedItem = allQuotationItems.find(
                                        (qi) =>
                                          (qi.supplierRFQItemId && (qi.supplierRFQItemId === itemKey || qi.supplierRFQItemId === itemId)) ||
                                          (qi.buyerRFQItemId && (qi.buyerRFQItemId === itemKey || qi.buyerRFQItemId === itemId)) ||
                                          (qi.id && (qi.id === itemKey || qi.id === itemId))
                                      ) || allQuotationItems[idx];
                                      const itemRank = formatRank(matchedItem?.rank) || "--";
                                      const quotationStatus = ownQuotation?.status

                                      return (
                                        <tr key={itemKey}>
                                          <td>
                                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.description}</div>
                                          </td>
                                          <td>
                                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                              {item.materialCode || "N/A"}
                                            </div>
                                          </td>
                                          <td style={{ textAlign: 'left', fontWeight: 600, color: '#0f172a' }}>
                                            {item.quantity} <span style={{ fontSize: '12px', fontWeight: 400, color: '#64748b' }}>{item.uom}</span>
                                          </td>
                                          <td>
                                            <input
                                              type="number"
                                              step="0.01"
                                              min="0"
                                              className="pud-rfq-item-input"
                                              value={line.deliveryCharge || ""}
                                              onChange={(e) => handleLineItemFieldChange(itemKey, "deliveryCharge", e.target.value)}
                                              placeholder="0.00"
                                              style={{ width: '100px', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px' }}
                                            />
                                          </td>
                                          <td>
                                            <select
                                              value={line.deliveryType}
                                              onChange={(e) => handleLineItemFieldChange(itemKey, "deliveryType", e.target.value)}
                                              style={{ width: '110px', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', background: '#ffffff' }}
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
                                              className="pud-rfq-item-input"
                                              value={line.discount || ""}
                                              onChange={(e) => handleLineItemFieldChange(itemKey, "discount", e.target.value)}
                                              placeholder="0.00"
                                              style={{ width: '100px', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px' }}
                                            />
                                          </td>
                                          <td>
                                            <select
                                              value={line.discountType}
                                              onChange={(e) => handleLineItemFieldChange(itemKey, "discountType", e.target.value)}
                                              style={{ width: '110px', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', background: '#ffffff' }}
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
                                              className="pud-rfq-item-input"
                                              value={line.tax || ""}
                                              onChange={(e) => handleLineItemFieldChange(itemKey, "tax", e.target.value)}
                                              placeholder="0.00"
                                              style={{ width: '100px', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px' }}
                                            />
                                          </td>
                                          <td>
                                            <select
                                              value={line.taxType}
                                              onChange={(e) => handleLineItemFieldChange(itemKey, "taxType", e.target.value)}
                                              style={{ width: '110px', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', background: '#ffffff' }}
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
                                              className="pud-rfq-item-input"
                                              value={line.quotedPrice || ""}
                                              onChange={(e) => handleLineItemFieldChange(itemKey, "quotedPrice", e.target.value)}
                                              placeholder="0.00"
                                              style={{ width: '110px', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: '#0f172a' }}
                                              required
                                            />
                                          </td>
                                          {showRankColumn && (
                                            <td style={{ textAlign: 'left', fontWeight: 600, color: '#0f172a' }}>
                                              {quotationStatus === 'SUBMITTED' ? itemRank : "-"}
                                            </td>
                                          )}
                                          <td style={{ fontWeight: 600, color: '#0f172a', fontSize: '13px' }}>
                                            {line.subTotal.toFixed(2)}
                                          </td>
                                          <td style={{ fontWeight: 600, color: '#0f172a', fontSize: '13px' }}>
                                            {line.quotedAmount.toFixed(2)}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', background: '#f8fafc', padding: '16px 20px', borderRadius: '10px', border: '1px solid #e2e8f0', marginTop: '16px' }}>
                                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: 700 }}>Total Price Quote</span>
                                <span style={{ fontSize: '16px', fontWeight: 700, color: '#16a34a' }}>
                                  {Number(quoteTotalPrice).toFixed(2)}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>

                {((selectedRfq.technicalSpecificationDocuments?.length ?? 0) > 0 ||
                  (selectedRfq.termsConditionDocuments?.length ?? 0) > 0) && (
                    <div id="pud-documents-card">
                      <div id="pud-documents-header">
                        <h3 id="pud-documents-title">Reference Documents</h3>
                        <p id="pud-documents-sub">
                          Technical specifications, requirements, and Terms &amp; Conditions
                          documents attached to this RFQ.
                        </p>
                      </div>

                      {selectedRfq.technicalSpecificationDocuments?.length > 0 && (
                        <div id="pud-technical-documents">
                          <div id="pud-doc-group-title">
                            <span id="pud-doc-icon-blue">
                              <IconFile />
                            </span>
                            Technical Requirements
                          </div>

                          <div id="pud-documents-grid">
                            {selectedRfq.technicalSpecificationDocuments.map((doc) => (
                              <div key={doc.id} id="pud-doc-card">
                                <div id="pud-doc-info">
                                  <div id="pud-doc-icon-blue">
                                    <IconFile />
                                  </div>

                                  <div id="pud-doc-name-wrapper">
                                    <div id="pud-doc-name" title={doc.fileName}>
                                      {doc.fileName}
                                    </div>
                                    <div id="pud-doc-type">
                                      Tech Spec • {doc.fileType.toUpperCase()}
                                    </div>
                                  </div>
                                </div>

                                <div id="pud-doc-actions">
                                  <button
                                    type="button"
                                    id="pud-doc-eye"
                                    title="Preview document"
                                    onClick={() => handleDocumentAction(doc, "preview")}
                                  >
                                    <IconEye />
                                  </button>

                                  <button
                                    type="button"
                                    id="pud-doc-download"
                                    title="Download document"
                                    onClick={() => handleDocumentAction(doc, "download")}
                                  >
                                    <IconDownload />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedRfq.termsConditionDocuments?.length > 0 && (
                        <div id="pud-terms-documents">
                          <div id="pud-doc-group-title">
                            <span id="pud-doc-icon-amber">
                              <IconFile />
                            </span>
                            Terms &amp; Conditions
                          </div>

                          <div id="pud-documents-grid">
                            {selectedRfq.termsConditionDocuments.map((doc) => (
                              <div key={doc.id} id="pud-doc-card">
                                <div id="pud-doc-info">
                                  <div id="pud-doc-icon-amber">
                                    <IconFile />
                                  </div>

                                  <div id="pud-doc-name-wrapper">
                                    <div id="pud-doc-name" title={doc.fileName}>
                                      {doc.fileName}
                                    </div>
                                    <div id="pud-doc-type">
                                      Terms &amp; Conditions • {doc.fileType.toUpperCase()}
                                    </div>
                                  </div>
                                </div>

                                <div id="pud-doc-actions">
                                  <button
                                    type="button"
                                    id="pud-doc-eye"
                                    title="Preview document"
                                    onClick={() => handleDocumentAction(doc, "preview")}
                                  >
                                    <IconEye />
                                  </button>

                                  <button
                                    type="button"
                                    id="pud-doc-download"
                                    title="Download document"
                                    onClick={() => handleDocumentAction(doc, "download")}
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

                {(selectedRfq.questions?.length ?? 0) > 0 && (
                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div className="pud-modal-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px'}}>
                        <IconMessageSquare /> Additional Questions from Buyer

                      </div>

                      {submitAnswersSuccess && (
                        <div style={{ color: '#15803d', fontSize: '13px', fontWeight: 500, background: '#dcfce7', padding: '8px 12px', borderRadius: '6px' }}>
                          <IconCheckCircle /> All answers successfully saved!
                        </div>
                      )}
                      {submitAnswersError && (
                        <div style={{ color: '#ef4444', fontSize: '13px', fontWeight: 500, background: '#fee2e2', padding: '8px 12px', borderRadius: '6px' }}>
                          {submitAnswersError}
                        </div>
                      )}
                      {[...selectedRfq.questions]
                        .sort((a, b) => a.displayOrder - b.displayOrder)
                        .map((q, index) => {
                          const current = rfqAnswers[q.questionId];
                          return (
                            <div key={q.questionId} style={{ background: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                              <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>
                                <span style={{ color: '#2563eb', marginRight: '4px' }}>Q{index + 1}.</span> {q.question}
                                {q.isRequired && <span style={{ color: '#ef4444' }}> *</span>}
                              </div>

                              {q.questionType === 'Text' && (
                                <input
                                  type="text"
                                  className="pud-rfq-item-input"
                                  value={current?.answer || ''}
                                  onChange={(e) => handleTextAnswerChange(q.questionId, e.target.value)}
                                  placeholder="Type your answer..."
                                  required={q.isRequired}
                                  style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    color: '#0f172a',
                                    background: '#ffffff',
                                  }}
                                />
                              )}

                              {q.questionType === 'Radio' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {[...(q.options || [])]
                                    .sort((a, b) => a.displayOrder - b.displayOrder)
                                    .map((opt) => (
                                      <label
                                        key={opt.optionId}
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155', cursor: 'pointer' }}
                                      >
                                        <input
                                          type="radio"
                                          name={`rfq-question-${q.questionId}`}
                                          checked={current?.questionOptionId === opt.optionId}
                                          onChange={() => handleRadioAnswerChange(q.questionId, opt.optionId)}
                                          required={q.isRequired}
                                        />
                                        {opt.optionText}
                                      </label>
                                    ))}
                                </div>
                              )}

                              {q.questionType === 'FILE' && (
                                <input
                                  type="file"
                                  className="pud-rfq-item-input"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0] || null;
                                    handleFileAnswerChange(q.questionId, file);
                                  }}
                                  required={q.isRequired}
                                  style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    color: '#0f172a',
                                    background: '#ffffff',
                                  }}
                                />
                              )}

                              {q.questionType !== 'Text' && q.questionType !== 'Radio' && q.questionType !== 'File' && (q.options?.length ?? 0) > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {[...(q.options || [])]
                                    .sort((a, b) => a.displayOrder - b.displayOrder)
                                    .map((opt) => (
                                      <label
                                        key={opt.optionId}
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155', cursor: 'pointer' }}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={current?.questionOptionIds?.includes(opt.optionId) || false}
                                          onChange={(e) => handleCheckboxAnswerChange(q.questionId, opt.optionId, e.target.checked)}
                                        />
                                        {opt.optionText}
                                      </label>
                                    ))}
                                </div>
                              )}
                              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                                <button
                                  type="button"
                                  className="pud-btn pud-btn-outline"
                                  onClick={handleSubmitRfqAnswers}
                                  disabled={submittingAnswers}
                                  style={{ padding: '6px 14px', fontSize: '12px' }}
                                >
                                  {submittingAnswers ? 'Saving...' : 'Save Answer'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}


              </div>
            )}
          </div>

          {selectedRfq && !canSubmit && (
            <div style={{
              background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e',
              padding: '10px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
              marginTop: '16px', textAlign: 'center'
            }}>
              {notYetOpen
                ? "This RFQ hasn't opened for bidding yet — check back after the start date."
                : frozen
                  ? "The buyer has frozen this RFQ's bid. You can no longer submit a quotation."
                  : "This RFQ's submission window has closed. You can no longer submit a quotation."}
            </div>
          )}

          {/* Modal Footer */}
          <div className="pud-modal-footer pud-rfq-page-footer">
            <button
              type="button"
              className="pud-btn pud-btn-outline"
              onClick={onClose}
              style={{ marginRight: '10px' }}
            >
              Close
            </button>
            {selectedRfq && (
              <button
                type="submit"
                className="pud-btn pud-btn-message"
                disabled={submittingQuote || !canSubmit}
                style={{ background: '#2563eb', color: '#ffffff' }}
                title={
                  notYetOpen
                    ? "This RFQ hasn't opened for bidding yet."
                    : frozen
                      ? "The buyer has frozen this RFQ's bid."
                      : closed
                        ? "This RFQ's submission window has closed."
                        : undefined
                }
              >
                {submittingQuote
                  ? "Submitting..."
                  : notYetOpen
                    ? "Not Yet Open"
                    : frozen
                      ? "Bid Frozen"
                      : closed
                        ? "Submission Closed"
                        : "Submit Quotation"}
              </button>
            )}
          </div>
        </form>
      </div>

      {otpStage === "send" && (
        <div className="pud-modal-overlay" onClick={() => setOtpStage("none")} style={{ zIndex: 9999 }}>
          <div className="pud-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', zIndex: 10000 }}>
            <div className="pud-modal-header" style={{ paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
              <span className="pud-modal-badge">
                <IconMail /> Verify It's You
              </span>
              <button className="pud-modal-close" onClick={() => setOtpStage("none")}>
                <IconClose />
              </button>
            </div>

            <div className="pud-modal-body" style={{ textAlign: 'center', paddingTop: '24px', paddingBottom: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>
                Confirm Your Quotation
              </h3>
              <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '0', lineHeight: '1.5' }}>
                For security, we'll send a one-time code to your registered email before this quotation goes to the buyer.
              </p>
              {otpError && (
                <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '14px' }}>{otpError}</div>
              )}
            </div>

            <div className="pud-modal-footer" style={{ borderTop: '1px solid #e2e8f0', gap: '10px' }}>
              <button type="button" className="pud-btn pud-btn-outline" onClick={() => setOtpStage("none")} style={{ flex: 1 }}>
                Cancel
              </button>
              <button
                type="button"
                className="pud-btn pud-btn-message"
                onClick={handleSendOtp}
                disabled={sendingOtp}
                style={{ flex: 1, background: '#2563eb', color: '#ffffff' }}
              >
                {sendingOtp ? "Sending..." : "Send OTP"}
              </button>
            </div>
          </div>
        </div>
      )}

      {otpStage === "verify" && (
        <div className="pud-modal-overlay" onClick={() => setOtpStage("none")} style={{ zIndex: 9999 }}>
          <div className="pud-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', zIndex: 10000 }}>
            <div className="pud-modal-header" style={{ paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
              <span className="pud-modal-badge">
                <IconMail /> Enter Verification Code
              </span>
              <button className="pud-modal-close" onClick={() => setOtpStage("none")}>
                <IconClose />
              </button>
            </div>

            <div className="pud-modal-body" style={{ paddingTop: '20px', paddingBottom: '8px' }}>
              <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px', textAlign: 'center' }}>
                We've sent a 6-digit code to your email. It expires in{" "}
                <strong style={{ color: otpRemaining <= 30 ? '#ef4444' : '#1e293b' }}>
                  {formatOtpTimer(otpRemaining)}
                </strong>.
              </p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                className="pud-rfq-item-input"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter OTP"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '18px',
                  letterSpacing: '4px',
                  textAlign: 'center',
                  fontWeight: 700,
                  color: '#0f172a'
                }}
              />
              {otpRemaining <= 0 ? (
                <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '10px', textAlign: 'center' }}>
                  Code expired. Please resend the OTP.
                </div>
              ) : otpError ? (
                <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '10px', textAlign: 'center' }}>{otpError}</div>
              ) : null}
              <div style={{ textAlign: 'center', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={sendingOtp || otpRemaining > 0}
                  style={{
                    background: 'none', border: 'none', padding: 0,
                    color: otpRemaining > 0 ? '#94a3b8' : '#2563eb',
                    fontSize: '13px',
                    cursor: otpRemaining > 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  Resend OTP
                </button>
              </div>
            </div>

            <div className="pud-modal-footer" style={{ borderTop: '1px solid #e2e8f0', gap: '10px' }}>
              <button type="button" className="pud-btn pud-btn-outline" onClick={() => setOtpStage("none")} style={{ flex: 1 }}>
                Cancel
              </button>
              <button
                type="button"
                className="pud-btn pud-btn-message"
                onClick={handleVerifyOtp}
                disabled={verifyingOtp || otpRemaining <= 0}
                style={{ flex: 1, background: '#2563eb', color: '#ffffff' }}
              >
                {verifyingOtp ? "Verifying..." : "Verify OTP"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirmSubmit && (
        <div className="pud-modal-overlay" onClick={() => setShowConfirmSubmit(false)} style={{ zIndex: 9999 }}>
          <div className="pud-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', zIndex: 10000 }}>
            <div className="pud-modal-header" style={{ paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
              <span className="pud-modal-badge" style={{ background: '#fef3c7', color: '#d97706' }}>
                <IconAlertCircle /> Confirmation Required
              </span>
              <button
                className="pud-modal-close"
                onClick={() => setShowConfirmSubmit(false)}
              >
                <IconClose />
              </button>
            </div>

            <div className="pud-modal-body" style={{ textAlign: 'center', paddingTop: '24px', paddingBottom: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>
                Submit Quotation?
              </h3>
              <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '0', lineHeight: '1.5' }}>
                Are you sure you want to submit this quotation? Once submitted, it will be sent to the buyer and cannot be easily modified.
              </p>
            </div>

            <div className="pud-modal-footer" style={{ borderTop: '1px solid #e2e8f0', gap: '10px' }}>
              <button
                type="button"
                className="pud-btn pud-btn-outline"
                onClick={() => setShowConfirmSubmit(false)}
                style={{ flex: 1 }}
              >
                No, Cancel
              </button>
              <button
                type="button"
                className="pud-btn pud-btn-message"
                onClick={handleConfirmSubmitQuotation}
                disabled={submittingQuote}
                style={{ flex: 1, background: '#2563eb', color: '#ffffff' }}
              >
                {submittingQuote ? "Submitting..." : "Yes, Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isChatOpen && selectedRfqId && supplierId && (
        <SupplierRFQChat
          onClose={() => setIsChatOpen(false)}
          rfqId={selectedRfqId}
          rfqTitle={selectedRfq?.title}
          supplierId={supplierId}
          buyerId={selectedRfq?.buyerId}
          buyerName={selectedRfq?.buyerName}
        />
      )}
    </>
  );
};

export default SupplierRfqQuotationSummary;
