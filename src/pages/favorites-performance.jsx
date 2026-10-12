import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Header from '@/components/layout/Header';
import { useHeaderController } from '@/features/layout/hooks/useHeaderController';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { benchmarkSummary, runFavoritesBenchmark } from '@/features/favorites/services/favoritesBenchmark';

export default function FavoritesPerformancePage() {
  const auth = useAuthGuard(); const header = useHeaderController();
  return <><Head><title>收藏效能量度 - 今晚食乜</title></Head><Header {...header} />
    <main className="min-h-screen bg-[#F8F3E8] px-4 py-8">
      <div className="mx-auto max-w-xl">
        <h1 className="text-2xl font-bold text-[#3A2010] mb-4">收藏效能量度</h1>
        {auth.loading ? <p>確認登入中…</p> : auth.isAuthenticated ?
          <BenchmarkPanel key={JSON.stringify([auth.user?.id, auth.favoritesEpoch])} auth={auth} /> : <p>請先登入。</p>}
      </div>
    </main></>;
}
export function BenchmarkPanel({ auth }) {
  const [samples, setSamples] = useState([]); const [running, setRunning] = useState(false);
  const [label, setLabel] = useState('準備好後，撳開始量度。');
  const active = useRef(null); const currentAuth = useRef(auth);
  useEffect(() => { currentAuth.current = auth; }, [auth]);
  useEffect(() => () => { active.current?.abort(); active.current = null; }, []);
  const start = async () => {
    if (active.current) return;
    const controller = new AbortController(); active.current = controller;
    const userId = auth.user?.id; const epoch = auth.favoritesEpoch;
    const current = () => active.current === controller && currentAuth.current.isAuthenticated &&
      !currentAuth.current.loading && currentAuth.current.user?.id === userId && currentAuth.current.favoritesEpoch === epoch;
    setSamples([]); setRunning(true);
    try {
      await runFavoritesBenchmark({ signal: controller.signal, isCurrent: current,
        getToken: () => currentAuth.current.getAccessToken(),
        onSample: sample => { if (current()) setSamples(previous => [...previous, sample]); },
        onPhase: value => { if (current()) setLabel(value); },
      });
    } catch (error) { if (current()) setLabel(error.message); }
    finally { if (active.current === controller) { active.current = null; setRunning(false); } }
  };
  const stop = () => { active.current?.abort(); setLabel('已停止；仍可匯出已完成嘅樣本。'); };
  const exportResults = () => {
    const payload = { schema: 'prepmeal-favorites-benchmark-v1', complete: samples.length === 22,
      note: 'Direct GET tests; first is first test request, not proof of a cold start. No credentials or recipe data.', samples };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const file = new File([blob], 'PrepMeal_Favorites_Measurement.json', { type: blob.type });
    // Native file sharing is convenient on phones; download remains available.
    if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
      navigator.share({ files: [file] }).catch(() => setLabel('分享未完成；可以再匯出，或截圖下方摘要。')); return;
    }
    const url = URL.createObjectURL(blob); const link = document.createElement('a');
    link.href = url; link.download = file.name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <section className="rounded-xl border border-[#DDD0B0] bg-[#FFFDF8] p-4 space-y-4">
    <p>量度首次測試、連續請求同閒置 5 分鐘後嘅等待。只讀取收藏，唔會新增或取消收藏。</p>
    <p className="text-sm text-[#7A746B]">全程約 5–6 分鐘。請留喺呢頁並保持螢幕開啟；切換 App 可能令手機暫停計時。首次測試唔等同冷啟動。</p>
    <div className="flex flex-wrap gap-3">
      <button type="button" onClick={start} disabled={running} className="min-h-12 rounded-lg bg-[#9B6035] text-white px-4 disabled:opacity-50">開始量度</button>
      <button type="button" onClick={stop} disabled={!running} className="min-h-12 rounded-lg border px-4 disabled:opacity-50">停止</button>
      <button type="button" onClick={exportResults} disabled={running || samples.length === 0} className="min-h-12 rounded-lg border px-4 disabled:opacity-50">匯出結果</button>
    </div>
    <p role="status" className="break-words">{label}（{samples.length}/22）</p>
    {samples.length > 0 && <div className="space-y-3" aria-label="量度摘要">
      <p>伺服器區域：{[...new Set(samples.map(sample => sample.runtime?.region).filter(Boolean))].join('、') || '未有區域標記'}</p>
      {benchmarkSummary(samples).filter(group => group.count > 0).map(group => <div key={group.phase} className="rounded-lg border p-3">
        <p className="font-medium">{{ first: '第一個測試請求', consecutive: '連續請求', after_idle: '閒置後第一個請求', after_idle_consecutive: '閒置後連續請求' }[group.phase]}（{group.count} 次）</p>
        <p>GET 等待中位數：{group.headers_ms}ms</p>
        <p className="text-sm text-[#7A746B]">認證：{group.auth_ms ?? '未量度'}{group.auth_ms === null ? '' : 'ms'} · 資料 REST：{group.db_ms ?? '未量度'}{group.db_ms === null ? '' : 'ms'}</p>
      </div>)}
      <p className="text-sm">匯出唔方便，可以截圖呢個摘要傳返嚟。REST 時間包含資料服務往返，唔係純 SQL 時間。</p>
    </div>}
    <p className="text-sm">結果只含耗時、HTTP 狀態、伺服器區域同請求次序；唔含密碼、登入 token、帳戶或收藏內容。匯出後可以將檔案傳返呢個對話。</p>
  </section>;
}
