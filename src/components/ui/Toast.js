'use client';
import { useState, useEffect } from 'react';

export function useToast() {
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

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
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`${bgColor} text-white px-4 py-3 rounded-lg shadow-lg text-sm font-medium max-w-sm`}>
        {toast.message}
      </div>
    </div>
  );
}
