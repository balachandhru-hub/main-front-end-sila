import React from 'react';

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'accent' | 'neutral';

/* Tones for the workflow states the backend actually returns. Keys are normalised to
   UPPER_SNAKE so "Pending Review", "pending-review" and "PENDING_REVIEW" all match. */
const STATUS_TONES: Record<string, StatusTone> = {
  // Live / in-market
  OPEN: 'success',
  LIVE: 'success',
  ACTIVE: 'success',
  // Positive outcomes
  APPROVED: 'success',
  ACCEPTED: 'success',
  AWARDED: 'success',
  VERIFIED: 'success',
  COMPLETED: 'success',
  DELIVERED: 'success',
  FULFILLED: 'success',
  // Awaiting someone's action
  PENDING: 'warning',
  PENDING_REVIEW: 'warning',
  PENDING_VERIFICATION: 'warning',
  // Handed over / received
  SUBMITTED: 'info',
  SENT: 'info',
  RECEIVED: 'info',
  // Locked for evaluation
  FREEZING: 'accent',
  FROZEN: 'accent',
  // Negative outcomes
  REJECTED: 'danger',
  DECLINED: 'danger',
  CANCELLED: 'danger',
  // Not in play
  DRAFT: 'neutral',
  CLOSED: 'neutral',
  INACTIVE: 'neutral',
};

const normalise = (status: string) => status.trim().toUpperCase().replace(/[\s-]+/g, '_');

export const getStatusTone = (status: string | null | undefined): StatusTone =>
  status ? STATUS_TONES[normalise(status)] ?? 'neutral' : 'neutral';

/** "PENDING_REVIEW" → "Pending review" */
export const formatStatusLabel = (status: string) => {
  const words = status.trim().replace(/[_-]+/g, ' ').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

export interface StatusBadgeProps {
  status: string | null | undefined;
  /** Text to show instead of the formatted status. */
  label?: React.ReactNode;
  /** Forces a tone when the status string alone is not enough. */
  tone?: StatusTone;
  size?: 'sm' | 'md';
  /** Leading dot, useful for "live" states in dense tables. */
  dot?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, tone, size = 'md', dot = false, className = '' }) => {
  if (!status && !label) return null;
  const resolvedTone = tone ?? getStatusTone(status);
  const classes = ['sila-badge', `sila-badge--${resolvedTone}`, size === 'sm' && 'sila-badge--sm', className]
    .filter(Boolean)
    .join(' ');
  return (
    <span className={classes}>
      {dot && <span className="sila-badge-dot" aria-hidden="true" />}
      {label ?? formatStatusLabel(status ?? '')}
    </span>
  );
};

export default StatusBadge;
