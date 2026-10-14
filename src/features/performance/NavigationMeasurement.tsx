import { useEffect, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { useFavoritesPrefetch } from '@/hooks/useFavorites';
import type { FavoritesReader } from './favoritesLoadTrace';
import { beginNavigationStep, cancelNavigationStep, clearNavigationMeasurement, exportNavigationMeasurement,
  getNavigationMeasurement, getServerNavigationMeasurement, measurementScope, navigationRouteCompleted,
  navigationRouteStarted, startNavigationMeasurement, STEPS, subscribeNavigationMeasurement, validateNavigationScope } from './navigationMeasurement';

export function NavigationMeasurementLauncher({ userId, epoch = 0, disabled = false }: { userId: string; epoch?: number; disabled?: boolean }) {
  const [mode, setMode] = useState<'desktop' | 'phone'>('desktop');
  const [reader, setReader] = useState<FavoritesReader>('default');
  return <section className="rounded-xl border p-4 space-y-3" aria-label="頁面導航量度">
    <h2 className="font-semibold">桌面／手機導航量度</h2>
    <p>開始後，跟底部面板依次進入收藏、食譜、返回收藏、首頁。每一步請等資料就緒。只讀取資料，唔會改收藏或餐單。</p>
    <p className="text-sm">請保持同一分頁同螢幕開啟；首次係本輪首次測試，唔代表空快取。結果記錄資料就緒時間，唔等同畫面繪製完成。</p>
    <label>今次裝置 <select value={mode} onChange={e => setMode(e.target.value as 'desktop' | 'phone')} className="border rounded ml-2 p-2">
      <option value="desktop">桌面</option><option value="phone">手機</option>
    </select></label>
    <label className="block">收藏對照 <select value={reader} onChange={e => setReader(e.target.value as FavoritesReader)} className="border rounded ml-2 p-2">
      <option value="default">正常讀取</option><option value="rest">REST 對照</option><option value="rpc">RPC 對照</option>
    </select></label>
    <p className="text-sm">對照前請先匯出，再重新整理呢頁，清除上一輪記憶體快取。交替做 REST、RPC、RPC、REST；保持同一裝置及網絡。重新整理唔代表伺服器冷啟動。選擇只影響本輪新收藏讀取；冇新請求嘅快取結果唔可用作讀取方式比較。</p>
    <button type="button" disabled={disabled} onClick={() => startNavigationMeasurement(mode, measurementScope(userId, epoch), reader)} className="block min-h-12 rounded border px-4 disabled:opacity-50">開始導航量度</button>
  </section>;
}

export default function NavigationMeasurementOverlay() {
  const router = useRouter(); const auth = useAuth();
  const onFavoritesIntent = useFavoritesPrefetch(auth);
  const state = useSyncExternalStore(subscribeNavigationMeasurement, getNavigationMeasurement, getServerNavigationMeasurement);
  const [message, setMessage] = useState('');
  const [exported, setExported] = useState<{ text: string; viewport: typeof state.viewport } | null>(null);
  const accountScope = auth.isAuthenticated && auth.user?.id ? measurementScope(auth.user.id, auth.favoritesEpoch || 0) : null;
  useEffect(() => { validateNavigationScope(auth.loading ? null : accountScope); }, [auth.loading, accountScope]);
  useEffect(() => {
    if (!state.enabled) return;
    const error = () => cancelNavigationStep();
    const visibility = () => { if (document.visibilityState === 'hidden') cancelNavigationStep('hidden'); };
    router.events.on('routeChangeStart', navigationRouteStarted);
    router.events.on('routeChangeComplete', navigationRouteCompleted);
    router.events.on('routeChangeError', error);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      router.events.off('routeChangeStart', navigationRouteStarted);
      router.events.off('routeChangeComplete', navigationRouteCompleted);
      router.events.off('routeChangeError', error);
      document.removeEventListener('visibilitychange', visibility);
      cancelNavigationStep();
    };
  }, [state.enabled, router.events]);
  if (!state.enabled) return null;
  const next = STEPS[state.samples.length];
  const navigate = async () => {
    const page = beginNavigationStep(); if (!page) return;
    try { if (!await router.push(page === 'home' ? '/' : `/${page}`)) cancelNavigationStep(); }
    catch { cancelNavigationStep(); }
  };
  const downloadResults = (text: string) => {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `PrepMeal_Navigation_${state.mode}.json`;
    document.body.appendChild(a);
    try { a.click(); }
    finally { a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30_000); }
  };
  const exportFile = async () => {
    const text = JSON.stringify(exportNavigationMeasurement(), null, 2);
    // Always expose a text fallback before invoking browser download/share APIs.
    setExported({ text, viewport: state.viewport });
    try {
      if (state.mode === 'phone' && typeof File !== 'undefined' && navigator.share) {
        const file = new File([text], `PrepMeal_Navigation_${state.mode}.json`, { type: 'application/json' });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file] });
          setMessage('分享完成；下方亦保留 JSON。'); return;
        }
      }
      downloadResults(text);
      setMessage('已提出下載；如果未見檔案，可以用下方 JSON。');
    } catch { setMessage('分享／下載未完成，結果仍保留喺下方；可另按下載或複製 JSON。'); }
  };
  return <aside className="fixed bottom-0 inset-x-0 z-50 border-t bg-white p-3 shadow-lg max-h-[45vh] overflow-auto" aria-label="導航量度控制">
    <p role="status">{state.mode === 'phone' ? '手機' : '桌面'} · {state.samples.length}/4 · {state.running ? '等待資料就緒…' : next ? '準備下一步' : '本輪完成'}</p>
    <ol className="text-sm">{state.samples.map(s => <li key={s.step}>{STEPS[s.step - 1].label}：{s.outcome === 'ready' ? `${s.data_ready_ms}ms` : { error: '載入失敗', cancelled: '已中斷', timeout: '超時', hidden: '切換背景，中斷' }[s.outcome]}</li>)}</ol>
    <div className="flex flex-wrap gap-2 mt-2">
      {next && <button type="button" disabled={state.running} onClick={navigate}
        onPointerEnter={!state.running && next.page === 'favorites' ? onFavoritesIntent : undefined}
        onTouchStart={!state.running && next.page === 'favorites' ? onFavoritesIntent : undefined}
        onFocus={!state.running && next.page === 'favorites' ? onFavoritesIntent : undefined}
        className="min-h-12 border rounded px-3 disabled:opacity-50">{next.label}</button>}
      <button type="button" disabled={state.running || !state.samples.length} onClick={exportFile} className="min-h-12 border rounded px-3 disabled:opacity-50">匯出導航結果</button>
      <button type="button" onClick={clearNavigationMeasurement} className="min-h-12 border rounded px-3">結束量度</button>
    </div><p className="text-sm">{message} 首頁只量食譜列表；結果唔含帳戶、網址或食譜內容。重新整理會清除本輪記錄。</p>
    {exported && exported.viewport === state.viewport && <section aria-label="導航 JSON 備用匯出" className="mt-2 space-y-2">
      <button type="button" className="min-h-12 border rounded px-3" onClick={() => {
        try { downloadResults(exported.text); setMessage('已再次提出下載。'); }
        catch { setMessage('下載被阻擋；請選取下方 JSON，複製傳返對話。'); }
      }}>直接下載 JSON</button>
      <label className="block">備用 JSON（點一下全選，可複製傳返對話）
        <textarea aria-label="導航結果 JSON" readOnly value={exported.text} onFocus={event => event.currentTarget.select()} className="block w-full h-28 border rounded p-2 text-xs" />
      </label>
    </section>}
  </aside>;
}
