import { useId, useState } from 'react';

type GooglePrivacyApi = {
  callbackQueue?: { push: (callback: () => void) => unknown };
  showRevocationMessage?: () => void;
};

/** Use the existing Google CMP only; never load advertising to open settings. */
export default function PrivacyOptionsButton({ className = '' }: { className?: string }) {
  const [message, setMessage] = useState('');
  const messageId = useId();

  function openOptions() {
    const api = (window as Window & { googlefc?: GooglePrivacyApi }).googlefc;
    if (!api?.callbackQueue || typeof api.showRevocationMessage !== 'function') {
      setMessage('此頁暫未能開啟廣告私隱選項，可能是服務未載入或不適用於你目前的地區。這不代表你已同意或撤回選擇；你仍可繼續使用網站，或聯絡我們查詢。');
      return;
    }
    const unavailable = () => setMessage('暫時無法開啟廣告私隱選項，請稍後重試或聯絡我們。你的選擇尚未確認更改。');
    try {
      setMessage('已要求 Google 顯示私隱選項。請在顯示的視窗內完成選擇；如未出現，可稍後重試或聯絡我們。');
      // Google documents callbackQueue as the supported invocation mechanism.
      api.callbackQueue.push(() => {
        try {
          if (typeof api.showRevocationMessage !== 'function') { unavailable(); return; }
          api.showRevocationMessage();
        } catch { unavailable(); }
      });
    } catch { unavailable(); }
  }

  return (
    <div className="min-w-0">
      <button type="button" className={`cursor-pointer underline underline-offset-4 ${className}`} onClick={openOptions} aria-describedby={message ? messageId : undefined}>
        管理私隱選項
      </button>
      <p id={messageId} role="status" className={message ? 'mt-2 max-w-prose text-sm leading-relaxed' : 'sr-only'}>{message}</p>
    </div>
  );
}
