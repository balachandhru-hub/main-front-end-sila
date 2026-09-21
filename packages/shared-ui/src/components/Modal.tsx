import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'md' | 'lg' | 'xl';
  /** Prevents closing from the backdrop or Escape, e.g. while a request is in flight. */
  dismissible?: boolean;
  children?: React.ReactNode;
}

const IconClose = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

/** Accessible dialog: portalled to body, traps initial focus, restores it on close. */
export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  description,
  footer,
  size = 'md',
  dismissible = true,
  children,
}) => {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && dismissible) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.();
    };
  }, [open, dismissible, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="sila-root sila-overlay"
      onMouseDown={(event) => {
        if (dismissible && event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className={`sila-modal${size !== 'md' ? ` sila-modal--${size}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
      >
        <div className="sila-modal-header">
          <div>
            <h2 id={titleId} className="sila-modal-title">{title}</h2>
            {description && <p id={descriptionId} className="sila-card-subtitle">{description}</p>}
          </div>
          {dismissible && (
            <button type="button" className="sila-icon-btn" onClick={onClose} aria-label="Close dialog">
              <IconClose />
            </button>
          )}
        </div>
        <div className="sila-modal-body">{children}</div>
        {footer && <div className="sila-modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
};

export interface ConfirmDialogProps {
  open: boolean;
  title: React.ReactNode;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'primary' | 'danger';
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'primary',
  busy = false,
  onConfirm,
  onCancel,
}) => (
  <Modal
    open={open}
    onClose={onCancel}
    title={title}
    dismissible={!busy}
    footer={
      <>
        <button type="button" className="sila-btn sila-btn--secondary" onClick={onCancel} disabled={busy}>
          {cancelLabel}
        </button>
        <button type="button" className={`sila-btn sila-btn--${tone}`} onClick={onConfirm} disabled={busy}>
          {busy && <span className="sila-spinner" aria-hidden="true" />}
          {confirmLabel}
        </button>
      </>
    }
  >
    {message && <p className="sila-modal-text">{message}</p>}
  </Modal>
);

export default Modal;
