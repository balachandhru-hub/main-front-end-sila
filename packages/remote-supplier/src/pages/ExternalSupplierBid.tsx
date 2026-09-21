import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader, isErrorResponse, Button } from '@vosox/shared-ui';
import { FaCheckCircle, FaExclamationCircle, FaUserPlus } from 'react-icons/fa';
import {
  fetchExternalRfqDetails,
  submitExternalQuotation,
  fetchExternalAsset,
} from '../api/externalSupplierApi';
import type {
  ExternalRFQDetailResponse,
  ExternalSubmitQuotationPayload,
} from '../dto/externalSupplierDto';
import type { RFQQuestion } from '../dto/supplierDto';
import ExternalSupplierChat from '../components/ExternalSupplierChat/ExternalSupplierChat';
import { IconMessageSquare } from '../../../remote-buyer/src/components/BuyerRFQChat/ChatIcons';
import SilaLogo from '../assets/SILA_Logo.png';
import '../components/SupplierDashboard.css';
import './ExternalSupplierBid.css';

const parseAsUtcMs = (dateStr?: string | null): number | null => {
  if (!dateStr) return null;
  const hasTz = /Z$|[+-]\d{2}:\d{2}$/.test(dateStr);
  const ms = Date.parse(hasTz ? dateStr : `${dateStr}Z`);
  return Number.isNaN(ms) ? null : ms;
};

const getSubmissionWindowStatus = (rfq: ExternalRFQDetailResponse | null) => {
  if (!rfq) return { notYetOpen: false, closed: false, frozen: false, canSubmit: false };
  const startMs = parseAsUtcMs(rfq.startDate);
  const endMs = parseAsUtcMs(rfq.endDate);
  const nowMs = Date.now();

  const notYetOpen = startMs !== null && nowMs < startMs;
  const closed = endMs !== null && nowMs > endMs;
  const frozen = rfq.status === 'Freezing';

  return { notYetOpen, closed, frozen, canSubmit: !notYetOpen && !closed && !frozen };
};

// Same inline icons as the supplier dashboard's RFQ detail view, so both screens look identical.
const IconFile = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M8 13h8M8 17h8M8 9h2" />
  </svg>
);

const IconCalendar = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

const IconPin = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
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

const IconSparkles = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="M5 3v4M3 5h4M19 3v4M17 5h4M5 19v4M3 21h4M19 19v4M17 21h4" />
  </svg>
);

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || '')
    .join('') || '?';

const QUESTION_TYPE_LABELS: Record<string, string> = {
  text: 'Text',
  textarea: 'Long text',
  checkbox: 'Checkbox',
  radio: 'Single choice',
  select: 'Dropdown',
  file: 'File',
  number: 'Number',
  date: 'Date',
};

const formatQuestionType = (type?: string) => {
  if (!type) return '';
  const normalized = type.toLowerCase();
  return QUESTION_TYPE_LABELS[normalized] || normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const validId = (id?: string | null): string | null =>
  id && id !== '00000000-0000-0000-0000-000000000000' ? id : null;

type LoadErrorKind = 'invalid-link' | 'forbidden' | 'not-found' | 'generic';

const classifyLoadError = (statusCode: number): LoadErrorKind => {
  if (statusCode === 401) return 'invalid-link';
  if (statusCode === 403) return 'forbidden';
  if (statusCode === 404) return 'not-found';
  return 'generic';
};

const LOAD_ERROR_TITLES: Record<LoadErrorKind, string> = {
  'invalid-link': 'This link is invalid or has expired',
  forbidden: "You don't have access to this RFQ",
  'not-found': 'RFQ not found',
  generic: 'Something went wrong',
};

interface QuestionAnswerState {
  answer: string;
  questionOptionId: string | null;
  questionOptionIds: string[];
  fileName?: string;
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

const isQuestionAnswered = (q: RFQQuestion, a?: QuestionAnswerState) => {
  if (!a) return false;
  if (q.questionType === 'Text') return !!a.answer?.trim();
  if (q.questionType === 'Radio') return !!a.questionOptionId;
  if (q.questionType === 'FILE' || q.questionType === 'File') return !!a.fileName;
  return (a.questionOptionIds?.length ?? 0) > 0;
};

const EMPTY_LINE_ITEM: QuoteLineItem = {
  deliveryCharge: 0,
  deliveryType: 'PERCENTAGE',
  discount: 0,
  discountType: 'PERCENTAGE',
  tax: 0,
  taxType: 'PERCENTAGE',
  quotedPrice: 0,
  subTotal: 0,
  quotedAmount: 0,
};

const ExternalSupplierBid: React.FC = () => {
  const { rfqId, sessionToken } = useParams<{ rfqId: string; sessionToken: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [loadErrorKind, setLoadErrorKind] = useState<LoadErrorKind | null>(null);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);
  const [rfq, setRfq] = useState<ExternalRFQDetailResponse | null>(null);

  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [deliveryCharge, setDeliveryCharge] = useState<number>(0);
  const [deliveryType, setDeliveryType] = useState<string>('PERCENTAGE');
  const [discount, setDiscount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<string>('PERCENTAGE');
  const [tax, setTax] = useState<number>(0);
  const [taxType, setTaxType] = useState<string>('PERCENTAGE');
  const [itemPrices, setItemPrices] = useState<{ [key: string]: number }>({});
  const [lineItems, setLineItems] = useState<{ [supplierRFQItemId: string]: QuoteLineItem }>({});
  const [quotationId, setQuotationId] = useState<string | null>(null);
  const [hasExistingQuote, setHasExistingQuote] = useState(false);

  const [answers, setAnswers] = useState<{ [questionId: string]: QuestionAnswerState }>({});

  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [isChatOpen, setIsChatOpen] = useState(false);

  const [windowTick, setWindowTick] = useState(0);

  useEffect(() => {
    if (!rfq) return;
    const t = setInterval(() => setWindowTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, [rfq]);

  useEffect(() => {
    document.title = rfq ? `Quote: ${rfq.title}` : 'Request for Quotation';
  }, [rfq]);

  useEffect(() => {
    const load = async () => {
      if (!rfqId || !sessionToken) {
        setLoadErrorKind('invalid-link');
        setLoadErrorMessage('This link is missing required information and cannot be opened.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadErrorKind(null);
      setLoadErrorMessage(null);

      const data = await fetchExternalRfqDetails(rfqId, sessionToken);

      if (isErrorResponse(data)) {
        setLoadErrorKind(classifyLoadError(data.statusCode));
        setLoadErrorMessage(data.message || data.description || null);
        setLoading(false);
        return;
      }

      setRfq(data);

      const existingQuote = data.supplierQuotation?.[0];
      if (existingQuote) {
        setQuotationId(existingQuote.qutationId || existingQuote.id || null);
        setHasExistingQuote(existingQuote.status === 'SUBMITTED');
        setTotalPrice(existingQuote.totalPrice || 0);
        setDeliveryCharge(existingQuote.deliveryCharge || 0);
        setDeliveryType(existingQuote.deliveryType || 'PERCENTAGE');
        setDiscount(existingQuote.discount || 0);
        setDiscountType(existingQuote.discountType || 'PERCENTAGE');
        setTax(existingQuote.tax || 0);
        setTaxType(existingQuote.taxType || 'PERCENTAGE');
      }

      const prices: { [key: string]: number } = {};
      data.items?.forEach((item, idx) => {
        const key = item.id || item.buyerRFQItemId || `item-${idx}`;
        const existingItemQuote = data.supplierQuotationItems?.[idx];
        prices[key] = existingItemQuote?.quotedPrice ?? 0;
      });
      setItemPrices(prices);

      if (!data.addLotOption) {
        const nextLineItems: { [supplierRFQItemId: string]: QuoteLineItem } = {};
        data.items?.forEach((item) => {
          const itemKey = item.supplierRFQItemId;
          if (!itemKey) return;
          const source = data.supplierQuotationItems?.find((qi) => qi.supplierRFQItemId === itemKey);
          nextLineItems[itemKey] = {
            deliveryCharge: source?.deliveryCharge ?? 0,
            deliveryType: source?.deliveryType || 'PERCENTAGE',
            discount: source?.discount ?? 0,
            discountType: source?.discountType || 'PERCENTAGE',
            tax: source?.tax ?? 0,
            taxType: source?.taxType || 'PERCENTAGE',
            quotedPrice: source?.quotedPrice ?? 0,
            subTotal: source?.subTotal ?? 0,
            quotedAmount: source?.quotedAmount ?? 0,
          };
        });
        setLineItems(nextLineItems);
      } else {
        setLineItems({});
      }

      const initialAnswers: typeof answers = {};
      data.questions?.forEach((q) => {
        initialAnswers[q.questionId] = { answer: '', questionOptionId: null, questionOptionIds: [] };
      });
      setAnswers(initialAnswers);

      setLoading(false);
    };

    load();
  }, [rfqId, sessionToken]);

  const { notYetOpen, closed, frozen, canSubmit } = useMemo(
    () => getSubmissionWindowStatus(rfq),
    [rfq, windowTick]
  );

  // Both chat identity values come from the route's sessionId alone (the
  // second /external-supplier/bid/{rfqId}/{sessionId} segment, captured above
  // as `sessionToken`) — invitedUsers isn't a reliable source of supplierId
  // for an external contact and must not be used here.
  const canChat = !!(rfqId && sessionToken);

  const handleLineItemFieldChange = (
    supplierRFQItemId: string,
    field: keyof QuoteLineItem,
    value: string
  ) => {
    setLineItems((prev) => {
      const existing = prev[supplierRFQItemId] || EMPTY_LINE_ITEM;
      const isNumericField =
        field === 'deliveryCharge' || field === 'discount' || field === 'tax' || field === 'quotedPrice';
      return {
        ...prev,
        [supplierRFQItemId]: {
          ...existing,
          [field]: isNumericField ? Number(value) || 0 : value,
        },
      };
    });
  };

  const handleTextAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], answer: value } }));
  };

  const handleRadioAnswerChange = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], questionOptionId: optionId, questionOptionIds: [optionId] },
    }));
  };

  const handleCheckboxAnswerChange = (questionId: string, optionId: string, checked: boolean) => {
    setAnswers((prev) => {
      const current = prev[questionId]?.questionOptionIds || [];
      const updated = checked ? [...current, optionId] : current.filter((id) => id !== optionId);
      return { ...prev, [questionId]: { ...prev[questionId], questionOptionIds: updated } };
    });
  };

  const handleFileAnswerChange = (questionId: string, file: File | null) => {
    setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], fileName: file?.name || '' } }));
  };

  const handleDocumentAction = async (doc: { id?: string; fileName?: string; fileType?: string }, action: 'preview' | 'download') => {
    const assetId = doc.id;
    if (!assetId || !rfqId || !sessionToken) {
      alert('Document asset ID is missing.');
      return;
    }

    try {
      const data = await fetchExternalAsset(assetId, rfqId, sessionToken);
      if (isErrorResponse(data)) {
        throw new Error(data.message || 'Failed to fetch document.');
      }

      const fileBytes = data.fileBytes;
      const fileName = data.fileName || doc.fileName || 'document';
      const rawType = (data.contentType || doc.fileType || 'pdf').toLowerCase();

      if (!fileBytes) {
        throw new Error('Document content not available.');
      }

      let mimeType = 'application/pdf';
      if (rawType.includes('pdf')) mimeType = 'application/pdf';
      else if (rawType.includes('png')) mimeType = 'image/png';
      else if (rawType.includes('jpg') || rawType.includes('jpeg')) mimeType = 'image/jpeg';
      else if (rawType.includes('txt')) mimeType = 'text/plain';
      else if (rawType.includes('doc')) mimeType = 'application/msword';

      const cleanBase64 = fileBytes.replace(/^data:.*?;base64,/, '');
      const byteCharacters = atob(cleanBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      const url = URL.createObjectURL(blob);

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
      alert(err?.message || 'Could not access document.');
    }
  };

  const findUnansweredRequiredQuestion = () =>
    (rfq?.questions || []).find((q) => q.isRequired && !isQuestionAnswered(q, answers[q.questionId]));

  const handleSubmitClick = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!canSubmit) {
      setSubmitError(
        notYetOpen
          ? "This RFQ hasn't opened for bidding yet."
          : frozen
            ? "The buyer has frozen this RFQ's bid. You can no longer submit a quotation."
            : "This RFQ's submission window has closed. You can no longer submit a quotation."
      );
      return;
    }

    const unanswered = findUnansweredRequiredQuestion();
    if (unanswered) {
      setSubmitError(`Please answer the required question: "${unanswered.question}"`);
      return;
    }

    setShowConfirm(true);
  };

  const handleConfirmSubmit = async () => {
    if (!rfq || !rfqId || !sessionToken || submitting) return;

    setShowConfirm(false);
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      const supplierRFQId = rfq.items?.[0]?.supplierRFQId || null;

      const payload: ExternalSubmitQuotationPayload = {
        supplierQuotationId: quotationId,
        supplierRFQId,
        totalPrice: Number(totalPrice),
        deliveryCharge: Number(deliveryCharge),
        deliveryType,
        discount: Number(discount),
        discountType,
        tax: Number(tax),
        taxType,
        temporaryVerificationToken: null,
        items: rfq.addLotOption
          ? rfq.items.map((item, idx) => {
              const key = item.id || item.buyerRFQItemId || `item-${idx}`;
              const existingItemQuote = rfq.supplierQuotationItems?.[idx];
              return {
                supplierRFQItemId:
                  validId(item.supplierRFQItemId) ||
                  validId(existingItemQuote?.supplierRFQItemId) ||
                  null,
                buyerRFQItemId: item.id || item.buyerRFQItemId || '',
                quotedPrice: Number(itemPrices[key] ?? 0),
              };
            })
          : rfq.items.map((item) => {
              const itemKey = item.supplierRFQItemId;
              const line = itemKey ? lineItems[itemKey] : undefined;
              return {
                supplierRFQItemId: itemKey || null,
                buyerRFQItemId: item.id || item.buyerRFQItemId || '',
                quotedPrice: Number(line?.quotedPrice ?? 0),
                deliveryCharge: Number(line?.deliveryCharge ?? 0),
                deliveryType: line?.deliveryType || 'PERCENTAGE',
                discount: Number(line?.discount ?? 0),
                discountType: line?.discountType || 'PERCENTAGE',
                tax: Number(line?.tax ?? 0),
                taxType: line?.taxType || 'PERCENTAGE',
              };
            }),
      };

      const result = await submitExternalQuotation(rfqId, sessionToken, payload);

      if (isErrorResponse(result)) {
        setSubmitError(result.message || 'Failed to submit quotation. Please try again.');
        return;
      }

      setSubmitSuccess(true);
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to submit quotation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  let content: React.ReactNode;

  if (loading) {
    content = <Loader message="Loading RFQ details…" theme="light" color="#2f6feb" />;
  } else if (loadErrorKind) {
    const fallbackBody: Record<LoadErrorKind, string> = {
      'invalid-link': 'Please check the link you were sent, or contact the buyer for a new one.',
      forbidden: 'This link does not grant access to this RFQ. Please contact the buyer.',
      'not-found': "We couldn't find this RFQ. It may have been removed or the link is incorrect.",
      generic: 'Please try again in a few minutes. If this keeps happening, contact the buyer.',
    };

    content = (
      <div className="ebid-status-card ebid-status-error">
        <FaExclamationCircle className="ebid-status-icon ebid-status-icon-error" />
        <h1>{LOAD_ERROR_TITLES[loadErrorKind]}</h1>
        <p>{loadErrorMessage || fallbackBody[loadErrorKind]}</p>
      </div>
    );
  } else if (submitSuccess) {
    content = (
      <div className="ebid-status-card ebid-status-success">
        <FaCheckCircle className="ebid-status-icon ebid-status-icon-success" />
        <h1>Quotation Submitted Successfully</h1>
        <p>Your quotation for <strong>{rfq?.title}</strong> has been sent to the buyer. You can close this page now.</p>
        <div className="ebid-register-prompt">
          <p>Want to continue using the platform? Register now to create your account and access more features.</p>
          <button type="button" className="ebid-submit-btn ebid-btn-with-icon" onClick={() => navigate('/')}>
            <FaUserPlus /> Register
          </button>
        </div>
      </div>
    );
  } else if (rfq) {
    const formatRank = (val: unknown): string => {
      if (val === null || val === undefined || val === '') return '';
      return String(val);
    };

    const quotationStatus = rfq.supplierQuotation?.[0]?.status;
    const headerRank = formatRank(rfq.supplierQuotation?.[0]?.rank);
    const showRankColumn = !rfq.addLotOption;

    const labelStyle: React.CSSProperties = { display: 'block', fontSize: '12px', color: '#475569', fontWeight: 600, marginBottom: '6px' };
    const formInputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.75rem' };
    const formSelectStyle: React.CSSProperties = { ...formInputStyle, background: '#ffffff' };
    const cellInputStyle: React.CSSProperties = { width: '100px', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px' };
    const cellSelectStyle: React.CSSProperties = { width: '110px', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', background: '#ffffff' };
    const docIconBtnStyle = (color: string): React.CSSProperties => ({ background: 'none', border: 'none', cursor: 'pointer', color, padding: '4px', display: 'inline-flex', borderRadius: '4px' });

    const typeOptions = (
      <>
        <option value="PERCENTAGE">PERCENTAGE</option>
        <option value="AMOUNT">AMOUNT</option>
      </>
    );

    const renderDocCard = (
      doc: { id: string; fileName: string; fileType: string },
      typeLabel: string,
      iconStyle?: React.CSSProperties
    ) => (
      <div key={doc.id} className="pud-rfq-doc-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden', flex: 1 }}>
          <span className="pud-rfq-doc-icon" style={iconStyle}><IconFile /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="pud-rfq-doc-name" title={doc.fileName}>{doc.fileName}</div>
            <div className="pud-rfq-doc-type">{typeLabel} • {doc.fileType?.toUpperCase()}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '8px' }}>
          <button type="button" title="Preview document" onClick={() => handleDocumentAction(doc, 'preview')} style={docIconBtnStyle('#2563eb')}>
            <IconEye />
          </button>
          <button type="button" title="Download document" onClick={() => handleDocumentAction(doc, 'download')} style={docIconBtnStyle('#475569')}>
            <IconDownload />
          </button>
        </div>
      </div>
    );

    const renderMaterialInfo = (item: ExternalRFQDetailResponse['items'][number]) => (
      <>
        <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.description}</div>
        {item.costCenter && (
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
            Cost Center: {item.costCenterName}
          </div>
        )}
        {item.attachments?.map((att) => (
          <div key={att.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', color: '#475569', fontSize: '11px', padding: '2px 6px', borderRadius: '4px', marginTop: '4px', marginRight: '4px' }}>
            <IconFile /> {att.fileName}
          </div>
        ))}
      </>
    );

    content = (
      <div className="pud-rfq-fullpage">
        <div className="pud-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <span className="pud-modal-badge">
              <IconFile /> RFQ Specification
            </span>
          </div>
          <h2 className="pud-modal-name">{rfq.title}</h2>
          <div className="pud-modal-meta">
            <span><IconCalendar /> Closes: {new Date(rfq.endDate).toLocaleDateString()}</span>
            <span><IconPin /> Delivery: {rfq.deliveryLocation}</span>
            {canChat && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto', flexWrap: 'wrap' }}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="ebid-chat-btn"
                  style={{ ['--primary-color' as string]: '#2f6feb' } as React.CSSProperties}
                  onClick={() => setIsChatOpen(true)}
                  title="Chat with the buyer"
                >
                  <IconMessageSquare /> Chat
                </Button>
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmitClick}>
          <div className="pud-modal-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <div className="pud-modal-section-title">Description</div>
                <p className="pud-modal-desc" style={{ whiteSpace: 'pre-wrap' }}>
                  {rfq.description || 'No description provided.'}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '12px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Start Date</div>
                    <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 600, marginTop: '2px' }}>
                      {new Date(rfq.startDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>End Date</div>
                    <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 600, marginTop: '2px' }}>
                      {new Date(rfq.endDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Add Lot Option</div>
                    <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 600, marginTop: '2px' }}>
                      {rfq.addLotOption ? 'Allowed' : 'Not Allowed'}
                    </div>
                  </div>
                </div>

                {hasExistingQuote && (
                  <div style={{ background: '#eff6ff', border: '1px solid #dbeafe', color: '#1d4ed8', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, marginTop: '12px' }}>
                    You already have a submitted quotation on file for this RFQ. Submitting again will update it.
                  </div>
                )}
              </div>

              {((rfq.technicalSpecificationDocuments?.length ?? 0) > 0 ||
                (rfq.termsConditionDocuments?.length ?? 0) > 0) && (
                <div>
                  <div className="pud-modal-section-title">Reference Documents</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginTop: '8px' }}>
                    {rfq.technicalSpecificationDocuments?.map((doc) => renderDocCard(doc, 'Tech Spec'))}
                    {rfq.termsConditionDocuments?.map((doc) =>
                      renderDocCard(doc, 'Terms & Conditions', { background: '#fef3c7', color: '#d97706' })
                    )}
                  </div>
                </div>
              )}

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="pud-modal-section-title" style={{ marginBottom: '12px' }}>Quotation Summary</div>
                  <div className="pud-modal-section-title" style={{ marginBottom: '12px' }}>
                    {rfq.addLotOption && quotationStatus === 'SUBMITTED' && headerRank !== '' && (
                      <span style={{ fontWeight: 600, fontSize: '15px', color: '#2060c6', background: '#ffffff', borderRadius: '6px' }}>
                        Rank: {headerRank}
                      </span>
                    )}
                  </div>
                </div>

                {rfq.addLotOption ? (
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
                        {rfq.items?.map((item, idx) => (
                          <tr key={item.id || item.buyerRFQItemId || `item-${idx}`}>
                            <td>{renderMaterialInfo(item)}</td>
                            <td><div>{item.materialCode || 'N/A'}</div></td>
                            <td>{item.quantity} <span>{item.uom}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <>
                    <div className="pud-rfq-table-container">
                      <table className="pud-rfq-items-table">
                        <thead>
                          <tr>
                            <th>Material Info</th>
                            <th>Code</th>
                            <th style={{ textAlign: 'left' }}>Qty</th>
                            <th style={{ textAlign: 'left' }}>Delivery Charge</th>
                            <th style={{ textAlign: 'left' }}>Delivery Type</th>
                            <th style={{ textAlign: 'left' }}>Discount</th>
                            <th style={{ textAlign: 'left' }}>Discount Type</th>
                            <th style={{ textAlign: 'left' }}>Tax</th>
                            <th style={{ textAlign: 'left' }}>Tax Type</th>
                            <th style={{ textAlign: 'left', width: '110px' }}>Quoted Price</th>
                            {showRankColumn && <th style={{ textAlign: 'left' }}>Rank</th>}
                            <th style={{ textAlign: 'left', width: '110px' }}>Sub Total</th>
                            <th style={{ textAlign: 'left', width: '110px' }}>Quoted Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rfq.items?.map((item, idx) => {
                            const itemKey = item.supplierRFQItemId || `item-${idx}`;
                            const itemId = item.id || item.buyerRFQItemId;
                            const line = lineItems[itemKey] || EMPTY_LINE_ITEM;
                            const matchedItem =
                              rfq.supplierQuotationItems?.find(
                                (qi) =>
                                  (qi.supplierRFQItemId && (qi.supplierRFQItemId === itemKey || qi.supplierRFQItemId === itemId)) ||
                                  (qi.buyerRFQItemId && (qi.buyerRFQItemId === itemKey || qi.buyerRFQItemId === itemId))
                              ) || rfq.supplierQuotationItems?.[idx];
                            const itemRank = formatRank(matchedItem?.rank) || '--';
                            return (
                              <tr key={itemKey}>
                                <td>{renderMaterialInfo(item)}</td>
                                <td>
                                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                    {item.materialCode || 'N/A'}
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
                                    value={line.deliveryCharge || ''}
                                    onChange={(e) => handleLineItemFieldChange(itemKey, 'deliveryCharge', e.target.value)}
                                    placeholder="0.00"
                                    style={cellInputStyle}
                                  />
                                </td>
                                <td>
                                  <select
                                    value={line.deliveryType}
                                    onChange={(e) => handleLineItemFieldChange(itemKey, 'deliveryType', e.target.value)}
                                    style={cellSelectStyle}
                                  >
                                    {typeOptions}
                                  </select>
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="pud-rfq-item-input"
                                    value={line.discount || ''}
                                    onChange={(e) => handleLineItemFieldChange(itemKey, 'discount', e.target.value)}
                                    placeholder="0.00"
                                    style={cellInputStyle}
                                  />
                                </td>
                                <td>
                                  <select
                                    value={line.discountType}
                                    onChange={(e) => handleLineItemFieldChange(itemKey, 'discountType', e.target.value)}
                                    style={cellSelectStyle}
                                  >
                                    {typeOptions}
                                  </select>
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="pud-rfq-item-input"
                                    value={line.tax || ''}
                                    onChange={(e) => handleLineItemFieldChange(itemKey, 'tax', e.target.value)}
                                    placeholder="0.00"
                                    style={cellInputStyle}
                                  />
                                </td>
                                <td>
                                  <select
                                    value={line.taxType}
                                    onChange={(e) => handleLineItemFieldChange(itemKey, 'taxType', e.target.value)}
                                    style={cellSelectStyle}
                                  >
                                    {typeOptions}
                                  </select>
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="pud-rfq-item-input"
                                    value={line.quotedPrice || ''}
                                    onChange={(e) => handleLineItemFieldChange(itemKey, 'quotedPrice', e.target.value)}
                                    placeholder="0.00"
                                    style={{ ...cellInputStyle, width: '110px', fontWeight: 600, color: '#0f172a' }}
                                    required
                                  />
                                </td>
                                {showRankColumn && (
                                  <td style={{ textAlign: 'left', fontWeight: 600, color: '#0f172a' }}>
                                    {quotationStatus === 'SUBMITTED' ? itemRank : '-'}
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
                        {Number(totalPrice).toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {(rfq.questions?.length ?? 0) > 0 && (() => {
                const sortedQuestions = [...rfq.questions].sort((a, b) => a.displayOrder - b.displayOrder);
                const answeredCount = sortedQuestions.filter((q) => isQuestionAnswered(q, answers[q.questionId])).length;
                const supplierName = rfq.invitedUsers?.[0]?.name || rfq.invitedUsers?.[0]?.userName || 'Your Responses';

                return (
                  <div className="ebid-qa-section">
                    <div className="ebid-qa-section-header">
                      <h3 className="ebid-qa-section-title">Evaluation Questions &amp; Answers</h3>
                      <p className="ebid-qa-section-sub">Please answer the questions below from the buyer for this RFQ.</p>
                    </div>

                    <div className="ebid-qa-supplier-card">
                      <div className="ebid-qa-supplier-header">
                        <div className="ebid-qa-supplier-left">
                          <span className="ebid-qa-supplier-avatar">{getInitials(supplierName)}</span>
                          <span className="ebid-qa-supplier-name">{supplierName}</span>
                        </div>
                        <span className={`ebid-qa-supplier-badge${answeredCount === sortedQuestions.length ? ' is-complete' : ''}`}>
                          {answeredCount}/{sortedQuestions.length} answered
                        </span>
                      </div>

                      <div className="ebid-qa-list">
                        {sortedQuestions.map((q, index) => {
                          const current = answers[q.questionId];
                          const isFile = q.questionType === 'FILE' || q.questionType === 'File';
                          const sortedOptions = [...(q.options || [])].sort((a, b) => a.displayOrder - b.displayOrder);

                          return (
                            <div className="ebid-qa-item" key={q.questionId}>
                              <div className="ebid-qa-question-row">
                                <div className="ebid-qa-question-left">
                                  <span className="ebid-qa-index">Q{index + 1}</span>
                                  <span className="ebid-qa-question-text">{q.question}</span>
                                </div>
                                <div className="ebid-qa-tags">
                                  {q.isRequired && <span className="ebid-qa-req-badge">Required</span>}
                                  <span className="ebid-qa-type-badge">{formatQuestionType(q.questionType)}</span>
                                </div>
                              </div>

                              <div className="ebid-qa-answer-box">
                                {q.questionType === 'Text' && (
                                  <input
                                    type="text"
                                    className="ebid-qa-input"
                                    value={current?.answer || ''}
                                    onChange={(e) => handleTextAnswerChange(q.questionId, e.target.value)}
                                    placeholder="Type your answer..."
                                  />
                                )}

                                {q.questionType === 'Radio' && (
                                  <div className="ebid-qa-options">
                                    {sortedOptions.map((opt) => (
                                      <label key={opt.optionId} className="ebid-qa-option">
                                        <input
                                          type="radio"
                                          name={`ebid-question-${q.questionId}`}
                                          checked={current?.questionOptionId === opt.optionId}
                                          onChange={() => handleRadioAnswerChange(q.questionId, opt.optionId)}
                                        />
                                        {opt.optionText}
                                      </label>
                                    ))}
                                  </div>
                                )}

                                {isFile && (
                                  <>
                                    <span className="ebid-qa-file-name">
                                      <IconFile /> {current?.fileName || 'No file chosen'}
                                    </span>
                                    <label className="ebid-qa-file-btn">
                                      {current?.fileName ? 'Change file' : 'Choose file'}
                                      <input
                                        type="file"
                                        hidden
                                        onChange={(e) => handleFileAnswerChange(q.questionId, e.target.files?.[0] || null)}
                                      />
                                    </label>
                                  </>
                                )}

                                {q.questionType !== 'Text' && q.questionType !== 'Radio' && !isFile && sortedOptions.length > 0 && (
                                  <div className="ebid-qa-options">
                                    {sortedOptions.map((opt) => (
                                      <label key={opt.optionId} className="ebid-qa-option">
                                        <input
                                          type="checkbox"
                                          checked={current?.questionOptionIds?.includes(opt.optionId) || false}
                                          onChange={(e) =>
                                            handleCheckboxAnswerChange(q.questionId, opt.optionId, e.target.checked)
                                          }
                                        />
                                        {opt.optionText}
                                      </label>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {rfq.addLotOption && (
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                  <div className="pud-modal-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <IconSparkles /> Commercial Proposal / Quotation Details
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', background: '#f8fafc', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div>
                      <label style={labelStyle}>Delivery Charge</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="pud-rfq-form-input"
                        value={deliveryCharge || ''}
                        onChange={(e) => setDeliveryCharge(Number(e.target.value) || 0)}
                        placeholder="0.00"
                        style={formInputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Delivery Type</label>
                      <select className="pud-rfq-form-input" value={deliveryType} onChange={(e) => setDeliveryType(e.target.value)} style={formSelectStyle}>
                        {typeOptions}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Discount</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="pud-rfq-form-input"
                        value={discount || ''}
                        onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                        placeholder="0.00"
                        style={formInputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Discount Type</label>
                      <select className="pud-rfq-form-input" value={discountType} onChange={(e) => setDiscountType(e.target.value)} style={formSelectStyle}>
                        {typeOptions}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Tax</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="pud-rfq-form-input"
                        value={tax || ''}
                        onChange={(e) => setTax(Number(e.target.value) || 0)}
                        placeholder="0.00"
                        style={formInputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Tax Type</label>
                      <select className="pud-rfq-form-input" value={taxType} onChange={(e) => setTaxType(e.target.value)} style={formSelectStyle}>
                        {typeOptions}
                      </select>
                    </div>

                    <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: 700 }}>Total Price Quote</span>
                      <input
                        type="number"
                        step="0.01"
                        className="pud-rfq-form-input"
                        value={totalPrice}
                        onChange={(e) => setTotalPrice(Number(e.target.value) || 0)}
                        placeholder="0.00"
                        style={{ width: '180px', maxWidth: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '16px', fontWeight: 700, color: '#16a34a', textAlign: 'right' }}
                        required
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {!canSubmit && (
            <div style={{
              background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e',
              padding: '10px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
              margin: '16px 1.75rem 0', textAlign: 'center'
            }}>
              {notYetOpen
                ? "This RFQ hasn't opened for bidding yet — check back after the start date."
                : frozen
                  ? "The buyer has frozen this RFQ's bid. You can no longer submit a quotation."
                  : "This RFQ's submission window has closed. You can no longer submit a quotation."}
            </div>
          )}

          {submitError && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '12px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 500, margin: '16px 1.75rem 0' }}>
              {submitError}
            </div>
          )}

          <div className="pud-modal-footer">
            <button
              type="submit"
              className="pud-btn pud-btn-message"
              disabled={submitting || !canSubmit}
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
              {submitting
                ? 'Submitting...'
                : notYetOpen
                  ? 'Not Yet Open'
                  : frozen
                    ? 'Bid Frozen'
                    : closed
                      ? 'Submission Closed'
                      : 'Submit Quotation'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  const isStatusView = loading || !!loadErrorKind || submitSuccess;

  return (
    <div className="ebid-page">
      <header className="ebid-header">
        <div className="ebid-header-inner">
          <img src={SilaLogo} alt="SILA" className="ebid-header-logo" />
        </div>
      </header>

      <main className={`ebid-main${isStatusView ? ' ebid-main-centered' : ''}`}>
        {content}
      </main>

      {isChatOpen && canChat && (
        <ExternalSupplierChat
          onClose={() => setIsChatOpen(false)}
          rfqId={rfqId!}
          sessionToken={sessionToken!}
          rfqTitle={rfq?.title}
          buyerName={rfq?.buyerName}
          externalSupplierName={rfq?.externalSupplierName}
        />
      )}

      {showConfirm && (
        <div className="ebid-modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="ebid-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Submit Quotation?</h2>
            <p>Once submitted, your quotation will be sent to the buyer and cannot be easily modified.</p>
            <div className="ebid-modal-actions">
              <button type="button" className="ebid-btn-outline" onClick={() => setShowConfirm(false)}>
                Cancel
              </button>
              <button type="button" className="ebid-submit-btn" onClick={handleConfirmSubmit}>
                Yes, Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExternalSupplierBid;
