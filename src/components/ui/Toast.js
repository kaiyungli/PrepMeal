'use client';
import { useState, useCallback, useRef, useEffect } from 'react';

export function useToast() {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  // Stable across renders so hooks can list it as a dependency. A newer toast
  // replaces the current one and restarts the timer.
  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    clearTimeout(timerRef.current);
    setToast({ message, type });
    timerRef.current = setTimeout(() => setToast(null), duration);
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return { toast, showToast };
}

export default function Toast({ toast }) {
  if (!toast) return null;

  const bgColor = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-[#9B6035]',
  }[toast.type] || 'bg-[#9B6035]';

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-50 flex justify-end" role="status" aria-live="polite">
      <div className={`${bgColor} text-white px-4 py-3 rounded-lg shadow-lg text-sm font-medium max-w-sm`}>
        {toast.message}
      </div>
    </div>
  );
}
