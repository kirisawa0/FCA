import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ConfirmState {
  message: string;
  resolve: (value: boolean) => void;
}

interface ConfirmContextValue {
  confirm: (message: string) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | undefined>(undefined);

function ConfirmOverlay({
  message,
  onAnswer,
}: {
  message: string;
  onAnswer: (value: boolean) => void;
}) {
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => onAnswer(false)}
        aria-hidden
      />
      <div
        role="alertdialog"
        aria-modal="true"
        className="card card-top-accent relative z-10 w-full max-w-md p-6 shadow-2xl"
      >
        <h3 className="text-lg font-semibold text-white">Confirmation</h3>
        <p className="mt-3 text-sm text-zinc-300">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={() => onAnswer(false)}>
            Annuler
          </button>
          <button type="button" className="btn-danger" onClick={() => onAnswer(true)}>
            Confirmer
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<ConfirmState | null>(null);

  const confirm = useCallback((message: string) => {
    return new Promise<boolean>((resolve) => {
      setPending({ message, resolve });
    });
  }, []);

  function handleAnswer(value: boolean) {
    pending?.resolve(value);
    setPending(null);
    document.body.style.overflow = '';
    requestAnimationFrame(() => {
      (document.activeElement as HTMLElement)?.blur?.();
      window.focus();
    });
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {pending && <ConfirmOverlay message={pending.message} onAnswer={handleAnswer} />}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm doit être utilisé dans ConfirmProvider');
  return ctx.confirm;
}

/** Réinitialise l'état UI après navigation (modales, scroll) */
export function resetPageUiState() {
  document.body.style.overflow = '';
}
