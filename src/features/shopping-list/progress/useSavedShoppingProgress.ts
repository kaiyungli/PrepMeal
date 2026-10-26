import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { emptyProgress, validProgress, type ShoppingProgress } from './model';

export function useSavedShoppingProgress(planId: string | undefined, enabled: boolean) {
  const { user, getAccessToken } = useAuth();
  const scope = `${user?.id || 'guest'}:${planId || ''}`;
  const active = useRef(scope);
  active.current = scope;
  const [state, setState] = useState<{ scope: string; progress: ShoppingProgress; ready: boolean; status: string; conflict: boolean }>({ scope, progress: emptyProgress(), ready: false, status: '', conflict: false });
  const version = useRef(0);
  const revision = useRef(0);
  const queue = useRef<ShoppingProgress | null>(null);
  const writing = useRef(false);
  const latest = useRef<ShoppingProgress>(emptyProgress());
  const request = useCallback(async (method: 'GET' | 'PUT', progress?: ShoppingProgress, expected?: number) => {
    const token = await getAccessToken();
    if (!token) throw new Error('請先登入');
    return fetch(`/api/user/menus/${planId}/shopping`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(method === 'PUT' ? { body: JSON.stringify({ progress, revision: expected }) } : {}) });
  }, [getAccessToken, planId]);
  const reload = useCallback(async () => {
    if (!planId || !user?.id) return;
    const v = ++version.current;
    queue.current = null;
    setState(prev => ({ ...prev, scope, ready: false, status: '讀取採購進度…', conflict: false }));
    try {
      const res = await request('GET');
      const data = await res.json();
      if (active.current !== scope || version.current !== v) return;
      if (!res.ok || !Number.isSafeInteger(data.revision) || data.revision < 0 || (data.progress !== null && !validProgress(data.progress))) throw new Error();
      revision.current = data.revision;
      latest.current = data.progress || emptyProgress();
      setState({ scope, progress: latest.current, ready: true, status: '採購進度已從帳戶載入。', conflict: false });
    } catch {
      if (active.current === scope && version.current === v) setState(prev => ({ ...prev, ready: false, status: '未能讀取採購進度，請重試。' }));
    }
  }, [scope, planId, user?.id, request]);
  useEffect(() => {
    if (enabled && planId && (!state.ready || state.scope !== scope) && (state.scope !== scope || !state.status)) void reload();
  }, [enabled, planId, scope, state.ready, state.scope, state.status, reload]);
  // The parent is keyed by account and plan. Let an already queued save drain
  // after closing/navigating; token-scoped RLS still protects its captured plan.
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (writing.current || queue.current || (!state.ready && state.status.includes('未能保存'))) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [state.ready, state.status]);

  const flush = useCallback(async () => {
    if (writing.current) return;
    writing.current = true;
    const v = version.current;
    try {
      while (queue.current && active.current === scope && version.current === v) {
        const progress = queue.current;
        queue.current = null;
        const res = await request('PUT', progress, revision.current);
        const data = await res.json();
        if (active.current !== scope || version.current !== v) return;
        if (res.status === 409) {
          queue.current = null;
          setState(prev => ({ ...prev, ready: false, conflict: true, status: '另一裝置已更改採購進度。請重新載入後再修改；此頁尚未保存的改動仍顯示供核對。' }));
          return;
        }
        if (!res.ok || !Number.isSafeInteger(data.revision)) throw new Error();
        revision.current = data.revision;
        setState(prev => ({ ...prev, status: queue.current ? '保存採購進度…' : '採購進度已保存到帳戶。' }));
      }
    } catch {
      if (active.current === scope && version.current === v) setState(prev => ({ ...prev, ready: false, status: '採購進度未能保存；此頁改動仍保留，請重試保存。' }));
    } finally { writing.current = false; }
  }, [scope, request]);
  const change = useCallback((progress: ShoppingProgress) => {
    if (active.current !== scope || !validProgress(progress)) return;
    latest.current = progress;
    setState({ scope, progress, ready: true, status: '保存採購進度…', conflict: false });
    queue.current = progress;
    void flush();
  }, [scope, flush]);
  const retrySave = () => { queue.current = latest.current; setState(prev => ({ ...prev, ready: true, status: '保存採購進度…' })); void flush(); };
  const current = state.scope === scope ? state : { scope, progress: emptyProgress(), ready: false, status: '', conflict: false };
  return { ...current, change, reload, retrySave };
}
