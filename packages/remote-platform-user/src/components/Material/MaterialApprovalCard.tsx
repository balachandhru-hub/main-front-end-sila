import React, { useState } from 'react';
import { toastService } from '@vosox/shared-ui';
import type { StatusTone } from './materialApi';

const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const IconX = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

interface MaterialApprovalCardProps {
  approverName: string;
  approverEmail: string;
  position: number;
  isCurrentUser: boolean;
  canAct: boolean;
  submitting: boolean;
  onDecision: (action: 'APPROVE' | 'REJECT', comment: string) => void;
  // No per-approver status available, so every card shares the record's tone.
  statusTone: StatusTone;
}

const MaterialApprovalCard: React.FC<MaterialApprovalCardProps> = ({
  approverName,
  approverEmail,
  position,
  isCurrentUser,
  canAct,
  submitting,
  onDecision,
  statusTone,
}) => {
  const [comment, setComment] = useState('');
  const [commentTouched, setCommentTouched] = useState(false);
  const trimmedComment = comment.trim();
  const commentInvalid = commentTouched && trimmedComment.length === 0;

  const handleSubmit = (action: 'APPROVE' | 'REJECT') => {
    if (submitting) return;
    if (trimmedComment.length === 0) {
      setCommentTouched(true);
      toastService.error('Please add a comment before submitting.');
      return;
    }
    onDecision(action, trimmedComment);
  };

  return (
    <div className={`matap-card matap-status-${statusTone}`}>
      <div className="matap-card-head">
        <span className="matap-card-order-label">Approver {position}</span>
        <span className="matap-card-order-badge">{position}</span>
      </div>

      <div className="matap-card-body">
        <div className="matap-card-name" title={approverName}>
          {approverName}
          {isCurrentUser && <span className="matap-card-you">You</span>}
        </div>
        {approverEmail && <div className="matap-card-email" title={approverEmail}>{approverEmail}</div>}

        {canAct && (
          <div className="matap-card-actions">
            <label className="matap-card-comment-label">
              Comment <span className="matap-required-mark">*</span>
            </label>
            <textarea
              className={`matap-card-comment-input${commentInvalid ? ' matap-card-comment-input-invalid' : ''}`}
              placeholder="Add a comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onBlur={() => setCommentTouched(true)}
              disabled={submitting}
              rows={2}
            />
            {commentInvalid && <span className="matap-comment-error">Comment is required.</span>}
            <div className="matap-card-buttons">
              <button
                type="button"
                className="bad-btn matap-btn-approve"
                disabled={submitting}
                onClick={() => handleSubmit('APPROVE')}
              >
                <IconCheck /> {submitting ? 'Submitting...' : 'Approve'}
              </button>
              <button
                type="button"
                className="bad-btn matap-btn-reject"
                disabled={submitting}
                onClick={() => handleSubmit('REJECT')}
              >
                <IconX /> {submitting ? 'Submitting...' : 'Reject'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MaterialApprovalCard;
