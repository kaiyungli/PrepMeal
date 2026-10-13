import { useEffect, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { useFavoritesPrefetch } from '@/hooks/useFavorites';
import { beginNavigationStep, cancelNavigationStep, clearNavigationMeasurement, exportNavigationMeasurement,
  getNavigationMeasurement, getServerNavigationMeasurement, measurementScope, navigationRouteCompleted,
  navigationRouteStarted, startNavigationMeasurement, STEPS, subscribeNavigationMeasurement, validateNavigationScope } from './navigationMeasurement';

export function NavigationMeasurementLauncher({ userId, epoch = 0, disabled = false }: { userId: string; epoch?: number; disabled?: boolean }) {
  const [mode, setMode] = useState<'desktop' | 'phone'>('desktop');
  return <section className="rounded-xl border p-4 space-y-3" aria-label="頁面導航量度">
    <h2 className="font-semibold">桌面／手機導航量度</h2>
    <p>開始後，跟底部面板依次進入收藏、食譜、返回收藏、首頁。每一步請等資料就緒。只讀取資料，唔會改收藏或餐單。</p>
    <p className="text-sm">請保持同一分頁同螢幕開啟；首次係本輪首次測試，唔代表空快取。結果記錄資料就緒時間，唔等同畫面繪製完成。</p>
    <label>今次裝置 <select value={mode} onChange={e => setMode(e.target.value as 'desktop' | 'phone')} className="border rounded ml-2 p-2">
      <option value="desktop">桌面</option><option value="phone">手機</option>
    </select></label>
    <button type="button" disabled={disabled} onClick={() => startNavigationMeasurement(mode, measurementScope(userId, epoch))} className="block min-h-12 rounded border px-4 disabled:opacity-50">開始導航量度</button>
  </section>;
}

export default function NavigationMeasurementOverlay() {
  const router = useRouter(); const auth = useAuth();
  const onFavoritesIntent = useFavoritesPrefetch(auth);
  const state = useSyncExternalStore(subscribeNavigationMeasurement, getNavigationMeasurement, getServerNavigationMeasurement);
  const [message, setMessage] = useState('');
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
  const exportFile = async () => {
    try {
      const file = new File([JSON.stringify(exportNavigationMeasurement(), null, 2)], `PrepMeal_Navigation_${state.mode}.json`, { type: 'application/json' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file] });
      else {
        const url = URL.createObjectURL(file); const a = document.createElement('a'); a.href = url; a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      setMessage('已匯出。');
    } catch { setMessage('匯出未完成，可以再試。'); }
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
  </aside>;
}
