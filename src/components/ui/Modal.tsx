import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
}

export function Modal({ open, title, onClose, children, maxWidth = 'max-w-lg' }: Props) {
  useEffect(() => {
    if (!open) {
      document.body.style.overflow = '';
      return;
    }

    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className={`card card-top-accent relative z-10 my-auto w-full ${maxWidth} max-h-[min(90vh,calc(100vh-3rem))] overflow-y-auto shadow-2xl`}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-fca-border bg-surface-gradient px-6 py-4">
            <h3 id="modal-title" className="text-lg font-semibold text-white">
              {title}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-zinc-500 transition hover:bg-fca-gray hover:text-brand-300"
              aria-label="Fermer"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-6">{children}</div>
        </div>
      </div>
    </div>,
    document.body
  );
}
