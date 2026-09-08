import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader, isErrorResponse } from '@vosox/shared-ui';
import { FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import { fetchExternalRfqDetails, submitExternalQuotation } from '../api/externalSupplierApi';
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
  if (!rfq) return { notYetOpen: false, closed: false, canSubmit: false };
  const startMs = parseAsUtcMs(rfq.startDate);
  const endMs = parseAsUtcMs(rfq.endDate);
  const nowMs = Date.now();

  const notYetOpen = startMs !== null && nowMs < startMs;
  const closed = endMs !== null && nowMs > endMs;

  return { notYetOpen, closed, canSubmit: !notYetOpen && !closed };
};

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

// The backend can return an all-zero placeholder GUID for an unset id — that string is
// still "truthy" in JS, so it must be filtered out explicitly rather than relying on `||`
// alone (this caused a "Supplier RFQ Item not found" submission failure previously).
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
  const [quotationId, setQuotationId] = useState<string | null>(null);
  const [hasExistingQuote, setHasExistingQuote] = useState(false);

  // Buyer questions are validated as required, but there is currently no backend
  // endpoint to submit external-supplier answers — only the quotation itself is sent.
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
        setHasExistingQuote(true);
        setQuotationId(existingQuote.qutationId || existingQuote.id || null);
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

      const initialAnswers: typeof answers = {};
      data.questions?.forEach((q) => {
        initialAnswers[q.questionId] = { answer: '', questionOptionId: null, questionOptionIds: [] };
      });
      setAnswers(initialAnswers);

      setLoading(false);
    };

    load();
  }, [rfqId, sessionToken]);

  const { notYetOpen, canSubmit } = useMemo(
    () => getSubmissionWindowStatus(rfq),
    [rfq, windowTick]
  );

  const handleItemPriceChange = (key: string, value: number) => {
    setItemPrices((prev) => ({ ...prev, [key]: value }));
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
      const payload: ExternalSubmitQuotationPayload = {
        supplierQuotationId: quotationId,
        totalPrice: Number(totalPrice),
        deliveryCharge: Number(deliveryCharge),
        deliveryType,
        discount: Number(discount),
        discountType,
        tax: Number(tax),
        taxType,
        ...(!rfq.addLotOption
          ? {
              items: rfq.items.map((item, idx) => {
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
              }),
            }
          : {}),
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
          <button type="button" className="ebid-submit-btn" onClick={() => navigate('/')}>
            Register
          </button>
        </div>
      </div>
    );
  } else if (rfq) {
    content = (
      <form className="ebid-form" onSubmit={handleSubmitClick}>
        <section className="ebid-card">
          <div className="ebid-card-header">
            <h1 className="ebid-rfq-title">{rfq.title}</h1>
            {rfq.status && <span className="ebid-badge">{rfq.status}</span>}
          </div>
          {rfq.description && <p className="ebid-rfq-desc">{rfq.description}</p>}

          <div className="ebid-meta-grid">
            <div className="ebid-meta-item">
              <span className="ebid-meta-label">Delivery Location</span>
              <span className="ebid-meta-value">{rfq.deliveryLocation || '—'}</span>
            </div>
            <div className="ebid-meta-item">
              <span className="ebid-meta-label">Opens</span>
              <span className="ebid-meta-value">{formatDate(rfq.startDate)}</span>
            </div>
            <div className="ebid-meta-item">
              <span className="ebid-meta-label">Closes</span>
              <span className="ebid-meta-value">{formatDate(rfq.endDate)}</span>
            </div>
          </div>

          {hasExistingQuote && (
            <div className="ebid-info-notice">
              You already have a quotation on file for this RFQ. Submitting again will update it.
            </div>
          )}

          {((rfq.technicalSpecificationDocuments?.length ?? 0) > 0 ||
            (rfq.termsConditionDocuments?.length ?? 0) > 0) && (
            <div className="ebid-docs">
              <span className="ebid-section-label">Reference Documents</span>
              <div className="ebid-docs-list">
                {rfq.technicalSpecificationDocuments?.map((doc) => (
                  <div className="ebid-doc-chip" key={doc.id}>
                    {doc.fileName} <span className="ebid-doc-chip-type">Tech Spec</span>
                  </div>
                ))}
                {rfq.termsConditionDocuments?.map((doc) => (
                  <div className="ebid-doc-chip" key={doc.id}>
                    {doc.fileName} <span className="ebid-doc-chip-type">Terms &amp; Conditions</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="ebid-card">
          <span className="ebid-section-label">Required Materials &amp; Services</span>
          <div className="ebid-table-wrap">
            <table className="ebid-items-table">
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Code</th>
                  <th>Qty</th>
                  {!rfq.addLotOption && <th className="ebid-col-price">Your Unit Quote</th>}
                </tr>
              </thead>
              <tbody>
                {rfq.items?.map((item, idx) => {
                  const key = item.id || item.buyerRFQItemId || `item-${idx}`;
                  return (
                    <tr key={key}>
                      <td>
                        <div className="ebid-item-cell">
                          <div className="ebid-item-desc">{item.description}</div>
                          {item.costCenterName && (
                            <div className="ebid-item-sub">Cost Center: {item.costCenterName}</div>
                          )}
                          {(item.attachments?.length ?? 0) > 0 && (
                            <div className="ebid-item-attachments">
                              {item.attachments!.map((att) => (
                                <span className="ebid-doc-chip" key={att.id}>{att.fileName}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>{item.materialCode || 'N/A'}</td>
                      <td>{item.quantity} {item.uom}</td>
                      {!rfq.addLotOption && (
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="ebid-input"
                            value={itemPrices[key] || ''}
                            onChange={(e) => handleItemPriceChange(key, parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            required
                          />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {(rfq.questions?.length ?? 0) > 0 && (
          <section className="ebid-card">
            <span className="ebid-section-label">Additional Questions from Buyer</span>
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

        <section className="ebid-card">
          <span className="ebid-section-label">Commercial Proposal</span>
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

        {!canSubmit && (
          <div className="ebid-window-notice">
            {notYetOpen
              ? "This RFQ hasn't opened for bidding yet — check back after the start date."
              : "This RFQ's submission window has closed. You can no longer submit a quotation."}
          </div>
        )}

        {submitError && <div className="ebid-error-banner">{submitError}</div>}

        <div className="ebid-submit-bar">
          <button type="submit" className="ebid-submit-btn" disabled={submitting || !canSubmit}>
            {submitting ? 'Submitting…' : 'Submit Quotation'}
          </button>
        </div>
      </form>
    );
  }

  const isStatusView = loading || !!loadErrorKind || submitSuccess;

  return (
    <div className="ebid-page">
      <header className="ebid-header">
        <img src={SilaLogo} alt="SILA" className="ebid-header-logo" />
        <span className="ebid-header-title">Request for Quotation</span>
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
