import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader, isErrorResponse } from '@vosox/shared-ui';
import {
  FaCheckCircle,
  FaExclamationCircle,
  FaFileAlt,
  FaRegCalendarAlt,
  FaMapMarkerAlt,
  FaClipboardList,
  FaQuestionCircle,
  FaFileInvoiceDollar,
  FaPaperclip,
  FaCircle,
  FaEye,
  FaDownload,
  FaUserPlus,
} from 'react-icons/fa';
import {
  fetchExternalRfqDetails,
  submitExternalQuotation,
  fetchExternalAsset,
} from '../api/externalSupplierApi';
import type {
  ExternalRFQDetailResponse,
  ExternalSubmitQuotationPayload,
} from '../dto/externalSupplierDto';
import SilaLogo from '../assets/SILA_Logo.png';
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

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const getStatusTone = (status?: string | null) => {
  const s = (status || '').toLowerCase();
  if (s === 'open') return 'success';
  if (s === 'freezing') return 'warning';
  if (s === 'closed') return 'danger';
  return 'neutral';
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

  const findUnansweredRequiredQuestion = () => {
    return (rfq?.questions || []).find((q) => {
      if (!q.isRequired) return false;
      const a = answers[q.questionId];
      if (!a) return true;
      if (q.questionType === 'Text') return !a.answer?.trim();
      if (q.questionType === 'Radio') return !a.questionOptionId;
      if (q.questionType === 'FILE' || q.questionType === 'File') return !a.fileName;
      return (a.questionOptionIds?.length ?? 0) === 0;
    });
  };

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

    content = (
      <form className="ebid-form" onSubmit={handleSubmitClick}>
        <section className="ebid-card">
          <div className="ebid-hero-top">
            <div className="ebid-hero-title-group">
              <span className="ebid-hero-icon"><FaFileAlt /></span>
              <h1 className="ebid-rfq-title">{rfq.title}</h1>
            </div>
            {rfq.status && (
              <span className={`ebid-badge ebid-badge-${getStatusTone(rfq.status)}`}>
                <FaCircle className="ebid-badge-dot" />
                {rfq.status}
              </span>
            )}
          </div>

          <div className="ebid-hero-meta">
            <span className="ebid-hero-meta-item">
              <FaRegCalendarAlt /> Closes {formatDate(rfq.endDate)}
            </span>
            <span className="ebid-hero-meta-item">
              <FaMapMarkerAlt /> {rfq.deliveryLocation || '—'}
            </span>
          </div>

          {rfq.description && <p className="ebid-rfq-desc">{rfq.description}</p>}

          <div className="ebid-meta-grid">
            <div className="ebid-meta-item">
              <span className="ebid-meta-label">Start Date</span>
              <span className="ebid-meta-value">{formatDate(rfq.startDate)}</span>
            </div>
            <div className="ebid-meta-item">
              <span className="ebid-meta-label">End Date</span>
              <span className="ebid-meta-value">{formatDate(rfq.endDate)}</span>
            </div>
            <div className="ebid-meta-item">
              <span className="ebid-meta-label">Add Lot Option</span>
              <span className="ebid-meta-value">{rfq.addLotOption ? 'Allowed' : 'Not Allowed'}</span>
            </div>
          </div>

          {hasExistingQuote && (
            <div className="ebid-info-notice">
              You already have a submitted quotation on file for this RFQ. Submitting again will update it.
            </div>
          )}

          {((rfq.technicalSpecificationDocuments?.length ?? 0) > 0 ||
            (rfq.termsConditionDocuments?.length ?? 0) > 0) && (
            <div className="ebid-docs">
              <span className="ebid-section-heading">
                <FaPaperclip /> <span className="ebid-section-label">Reference Documents</span>
              </span>
              <div className="ebid-docs-list">
                {rfq.technicalSpecificationDocuments?.map((doc) => (
                  <div className="ebid-doc-card" key={doc.id}>
                    <span className="ebid-doc-card-icon"><FaFileAlt /></span>
                    <div className="ebid-doc-card-info">
                      <div className="ebid-doc-card-name" title={doc.fileName}>{doc.fileName}</div>
                      <div className="ebid-doc-card-type">Tech Spec &bull; {doc.fileType?.toUpperCase()}</div>
                    </div>
                    <div className="ebid-doc-card-actions">
                      <button
                        type="button"
                        className="ebid-icon-btn"
                        title="View document"
                        onClick={() => handleDocumentAction(doc, 'preview')}
                      >
                        <FaEye />
                      </button>
                      <button
                        type="button"
                        className="ebid-icon-btn"
                        title="Download document"
                        onClick={() => handleDocumentAction(doc, 'download')}
                      >
                        <FaDownload />
                      </button>
                    </div>
                  </div>
                ))}
                {rfq.termsConditionDocuments?.map((doc) => (
                  <div className="ebid-doc-card" key={doc.id}>
                    <span className="ebid-doc-card-icon ebid-doc-card-icon-terms"><FaFileAlt /></span>
                    <div className="ebid-doc-card-info">
                      <div className="ebid-doc-card-name" title={doc.fileName}>{doc.fileName}</div>
                      <div className="ebid-doc-card-type">Terms &amp; Conditions &bull; {doc.fileType?.toUpperCase()}</div>
                    </div>
                    <div className="ebid-doc-card-actions">
                      <button
                        type="button"
                        className="ebid-icon-btn"
                        title="View document"
                        onClick={() => handleDocumentAction(doc, 'preview')}
                      >
                        <FaEye />
                      </button>
                      <button
                        type="button"
                        className="ebid-icon-btn"
                        title="Download document"
                        onClick={() => handleDocumentAction(doc, 'download')}
                      >
                        <FaDownload />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="ebid-card">
          <span className="ebid-section-heading">
            <FaClipboardList /> <span className="ebid-section-label">Quotation Summary</span>
            {rfq.addLotOption && headerRank !== '' && (
              <span className="ebid-rank-badge">
                Rank <strong>{headerRank}</strong>
              </span>
            )}
          </span>

          {rfq.addLotOption ? (
            <div className="ebid-table-card">
              <div className="ebid-table-wrap">
                <table className="ebid-items-table">
                  <thead>
                    <tr>
                      <th>Material Info</th>
                      <th className="ebid-col-code">Code</th>
                      <th className="ebid-col-num">Qty Required</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rfq.items?.map((item, idx) => (
                      <tr key={item.id || item.buyerRFQItemId || `item-${idx}`}>
                        <td>
                          <div className="ebid-item-desc">{item.description}</div>
                        </td>
                        <td className="ebid-col-code">{item.materialCode || 'N/A'}</td>
                        <td className="ebid-col-num">{item.quantity} {item.uom}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <>
              <div className="ebid-table-card">
              <div className="ebid-table-wrap">
                <table className="ebid-items-table">
                  <thead>
                    <tr>
                      <th>Material Info</th>
                      <th className="ebid-col-code">Code</th>
                      <th className="ebid-col-num">Qty</th>
                      <th>Delivery Charge</th>
                      <th>Delivery Type</th>
                      <th>Discount</th>
                      <th>Discount Type</th>
                      <th>Tax</th>
                      <th>Tax Type</th>
                      <th className="ebid-col-price">Quoted Price</th>
                      {showRankColumn && <th className="ebid-col-rank">Rank</th>}
                      <th className="ebid-col-price">Sub Total</th>
                      <th className="ebid-col-price">Quoted Amount</th>
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
                          <td>
                            <div className="ebid-item-desc">{item.description}</div>
                          </td>
                          <td className="ebid-col-code">{item.materialCode || 'N/A'}</td>
                          <td className="ebid-col-num">{item.quantity} {item.uom}</td>
                          <td>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              className="ebid-input"
                              value={line.deliveryCharge || ''}
                              onChange={(e) => handleLineItemFieldChange(itemKey, 'deliveryCharge', e.target.value)}
                              placeholder="0.00"
                            />
                          </td>
                          <td>
                            <select
                              className="ebid-input"
                              value={line.deliveryType}
                              onChange={(e) => handleLineItemFieldChange(itemKey, 'deliveryType', e.target.value)}
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
                              className="ebid-input"
                              value={line.discount || ''}
                              onChange={(e) => handleLineItemFieldChange(itemKey, 'discount', e.target.value)}
                              placeholder="0.00"
                            />
                          </td>
                          <td>
                            <select
                              className="ebid-input"
                              value={line.discountType}
                              onChange={(e) => handleLineItemFieldChange(itemKey, 'discountType', e.target.value)}
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
                              className="ebid-input"
                              value={line.tax || ''}
                              onChange={(e) => handleLineItemFieldChange(itemKey, 'tax', e.target.value)}
                              placeholder="0.00"
                            />
                          </td>
                          <td>
                            <select
                              className="ebid-input"
                              value={line.taxType}
                              onChange={(e) => handleLineItemFieldChange(itemKey, 'taxType', e.target.value)}
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
                              className="ebid-input ebid-input-strong"
                              value={line.quotedPrice || ''}
                              onChange={(e) => handleLineItemFieldChange(itemKey, 'quotedPrice', e.target.value)}
                              placeholder="0.00"
                              required
                            />
                          </td>
                          {showRankColumn && (
                            <td className="ebid-col-rank">{quotationStatus === 'SUBMITTED' ? itemRank : '-'}</td>
                          )}
                          <td className="ebid-readonly-value">{line.subTotal.toFixed(2)}</td>
                          <td className="ebid-readonly-value">{line.quotedAmount.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              </div>

              <div className="ebid-line-total">
                <span>Total Price Quote</span>
                <span className="ebid-line-total-value">{Number(totalPrice).toFixed(2)}</span>
              </div>
            </>
          )}
        </section>

        {(rfq.questions?.length ?? 0) > 0 && (
          <section className="ebid-card">
            <span className="ebid-section-heading">
              <FaQuestionCircle /> <span className="ebid-section-label">Additional Questions from Buyer</span>
            </span>
            <div className="ebid-questions">
              {[...rfq.questions]
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map((q, index) => {
                  const current = answers[q.questionId];
                  return (
                    <div className="ebid-question" key={q.questionId}>
                      <div className="ebid-question-text">
                        <span className="ebid-question-num">Q{index + 1}.</span>
                        <span>
                          {q.question}
                          {q.isRequired && <span className="ebid-required-mark"> *</span>}
                        </span>
                      </div>

                      {q.questionType === 'Text' && (
                        <input
                          type="text"
                          className="ebid-input"
                          value={current?.answer || ''}
                          onChange={(e) => handleTextAnswerChange(q.questionId, e.target.value)}
                          placeholder="Type your answer…"
                        />
                      )}

                      {q.questionType === 'Radio' && (
                        <div className="ebid-option-list">
                          {[...(q.options || [])]
                            .sort((a, b) => a.displayOrder - b.displayOrder)
                            .map((opt) => (
                              <label className="ebid-option" key={opt.optionId}>
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

                      {(q.questionType === 'FILE' || q.questionType === 'File') && (
                        <input
                          type="file"
                          className="ebid-input"
                          onChange={(e) => handleFileAnswerChange(q.questionId, e.target.files?.[0] || null)}
                        />
                      )}

                      {q.questionType !== 'Text' && q.questionType !== 'Radio' &&
                        q.questionType !== 'FILE' && q.questionType !== 'File' &&
                        (q.options?.length ?? 0) > 0 && (
                          <div className="ebid-option-list">
                            {[...(q.options || [])]
                              .sort((a, b) => a.displayOrder - b.displayOrder)
                              .map((opt) => (
                                <label className="ebid-option" key={opt.optionId}>
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
                  );
                })}
            </div>
          </section>
        )}

        {rfq.addLotOption && (
          <section className="ebid-card">
            <span className="ebid-section-heading">
              <FaFileInvoiceDollar /> <span className="ebid-section-label">Commercial Proposal / Quotation Details</span>
            </span>
            <div className="ebid-commercial-grid">
              <div className="ebid-field">
                <label>Delivery Charge</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="ebid-input"
                  value={deliveryCharge || ''}
                  onChange={(e) => setDeliveryCharge(Number(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
              <div className="ebid-field">
                <label>Delivery Type</label>
                <select className="ebid-input" value={deliveryType} onChange={(e) => setDeliveryType(e.target.value)}>
                  <option value="PERCENTAGE">PERCENTAGE</option>
                  <option value="AMOUNT">AMOUNT</option>
                </select>
              </div>
              <div className="ebid-field">
                <label>Discount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="ebid-input"
                  value={discount || ''}
                  onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
              <div className="ebid-field">
                <label>Discount Type</label>
                <select className="ebid-input" value={discountType} onChange={(e) => setDiscountType(e.target.value)}>
                  <option value="PERCENTAGE">PERCENTAGE</option>
                  <option value="AMOUNT">AMOUNT</option>
                </select>
              </div>
              <div className="ebid-field">
                <label>Tax</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="ebid-input"
                  value={tax || ''}
                  onChange={(e) => setTax(Number(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
              <div className="ebid-field">
                <label>Tax Type</label>
                <select className="ebid-input" value={taxType} onChange={(e) => setTaxType(e.target.value)}>
                  <option value="PERCENTAGE">PERCENTAGE</option>
                  <option value="AMOUNT">AMOUNT</option>
                </select>
              </div>
              <div className="ebid-field ebid-field-total">
                <label>Total Price Quote</label>
                <input
                  type="number"
                  step="0.01"
                  className="ebid-input ebid-input-total"
                  value={totalPrice}
                  onChange={(e) => setTotalPrice(Number(e.target.value) || 0)}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>
          </section>
        )}

        {!canSubmit && (
          <div className="ebid-window-notice">
            {notYetOpen
              ? "This RFQ hasn't opened for bidding yet — check back after the start date."
              : frozen
                ? "The buyer has frozen this RFQ's bid. You can no longer submit a quotation."
                : "This RFQ's submission window has closed. You can no longer submit a quotation."}
          </div>
        )}

        {submitError && <div className="ebid-error-banner">{submitError}</div>}

        <div className="ebid-submit-bar">
          <button
            type="submit"
            className="ebid-submit-btn"
            disabled={submitting || !canSubmit}
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
              ? 'Submitting…'
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
