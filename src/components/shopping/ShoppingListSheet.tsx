import { useEffect, useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useDialogFocus } from '@/hooks/useDialogFocus';

/** One scroll surface: the interactive list owns its scrolling body. */
export default function ShoppingListSheet({ isOpen, onClose, children }: {
  isOpen: boolean; onClose: () => void; children: ReactNode;
}) {
  const titleId = useId();
  const dialogRef = useDialogFocus(isOpen);
  useEffect(() => {
    if (!isOpen) return;
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [isOpen, onClose]);
  if (!isOpen || typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#271D17]/40 sm:p-6" onClick={onClose}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
        onClick={event => event.stopPropagation()}
        className="flex h-dvh max-h-dvh w-full flex-col overflow-hidden bg-[#FFFEFB] text-[#30271F] shadow-2xl sm:h-[min(800px,90dvh)] sm:max-w-[560px] sm:rounded-2xl">
        <header className="flex shrink-0 items-center justify-between border-b border-[#EDE8DF] px-5 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-6 sm:pt-3">
          <h2 id={titleId} className="text-xl font-semibold tracking-tight">購物清單</h2>
          <button type="button" aria-label="關閉購物清單" onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full text-[#75695C] hover:bg-[#F3EFE8] focus-visible:outline-2 focus-visible:outline-[#9B6035]">
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </header>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </div>, document.body,
  );
}
