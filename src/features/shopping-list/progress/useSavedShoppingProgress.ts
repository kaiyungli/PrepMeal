import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { emptyProgress, validProgress, type ShoppingProgress } from './model';
import { parseOfflineProgress, progressFingerprint, shoppingOfflineKey, type OfflineProgress } from './offlineStore';

type State = { scope: string; progress: ShoppingProgress; ready: boolean; status: string; conflict: boolean; needsRetry: boolean };
class LocalConflict extends Error {}
class StorageFailure extends Error {}
const CONFLICT = '另一裝置或分頁已更改採購進度。此頁修改仍顯示供核對，請選擇是否載入雲端進度。';

export function useSavedShoppingProgress(planId: string | undefined, enabled: boolean) {
  const { user, getAccessToken } = useAuth();
  const scope = JSON.stringify([user?.id || 'guest', planId || '']);
  const storageKey = shoppingOfflineKey(user?.id || 'guest', planId || '');
  const active = useRef(scope); active.current = scope;
  const initialized = useRef('');
  const revision = useRef(0);
  const pending = useRef(false);
  const attempt = useRef<OfflineProgress['attempt']>(undefined);
  const writing = useRef<string | null>(null);
  const cachedAvailable = useRef(false);
  const durable = useRef(true);
  const blocked = useRef(false);
  const latest = useRef<ShoppingProgress>(emptyProgress());
  const lastRaw = useRef<string | null>(null);
  const [state, setState] = useState<State>({ scope, progress: emptyProgress(), ready: false, status: '', conflict: false, needsRetry: false });
  const publish = useCallback((patch: Partial<State>) => {
    if (active.current === scope) setState(prev => ({ ...prev, scope, progress: latest.current, ...patch }));
  }, [scope]);
  const persist = useCallback(() => {
    if (active.current !== scope) return;
    durable.current = false;
    try {
      if (localStorage.getItem(storageKey) !== lastRaw.current) throw new LocalConflict();
      const value: OfflineProgress = { version: 1, scope, savedAt: Date.now(), revision: revision.current,
        progress: latest.current, pending: pending.current, ...(attempt.current ? { attempt: attempt.current } : {}) };
      const raw = JSON.stringify(value);
      localStorage.setItem(storageKey, raw);
      lastRaw.current = raw; cachedAvailable.current = true; durable.current = true;
    } catch (error) { if (error instanceof LocalConflict) throw error; throw new StorageFailure(); }
  }, [scope, storageKey]);
  const request = useCallback(async (method: 'GET' | 'PUT', progress?: ShoppingProgress, expected?: number) => {
    const token = await getAccessToken();
    if (active.current !== scope || !token) throw new Error('Authentication unavailable');
    return fetch(`/api/user/menus/${planId}/shopping`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(method === 'PUT' ? { body: JSON.stringify({ progress, revision: expected }) } : {}) });
  }, [getAccessToken, planId, scope]);

  const synchronize = useCallback(async (discardLocal = false) => {
    if (!planId || !user?.id || writing.current === scope || (blocked.current && !discardLocal)) return;
    writing.current = scope;
    try {
      if (!discardLocal && typeof navigator !== 'undefined' && navigator.onLine === false) {
        publish({ ready: cachedAvailable.current, needsRetry: pending.current,
          status: pending.current ? '離線修改已保存在此瀏覽器，連線後會重試。' : cachedAvailable.current ? '目前離線，顯示上次保存的進度。' : '目前離線，尚未有可用的採購快取；請連線後重試。' });
        return;
      }
      const res = await request('GET');
      const data = await res.json();
      if (active.current !== scope || (blocked.current && !discardLocal)) return;
      if (!res.ok || !Number.isSafeInteger(data.revision) || data.revision < 0 || data.revision >= 2147483647 ||
        (data.progress !== null && !validProgress(data.progress))) throw new Error('Read failed');
      const remote = data.progress || emptyProgress();
      if (discardLocal) {
        // Only discard after a successful read and the user's explicit choice.
        lastRaw.current = localStorage.getItem(storageKey);
        blocked.current = false; pending.current = false; attempt.current = undefined;
      }
      if (!pending.current) {
        revision.current = data.revision; latest.current = remote; attempt.current = undefined;
      } else if (data.revision !== revision.current) {
        if (progressFingerprint(remote) === progressFingerprint(latest.current)) {
          revision.current = data.revision; pending.current = false; attempt.current = undefined;
        } else if (attempt.current && data.revision === attempt.current.revision + 1 &&
          progressFingerprint(remote) === progressFingerprint(attempt.current.progress)) {
          // A previous PUT committed but its response was lost. Keep newer edits.
          revision.current = data.revision; attempt.current = undefined;
        } else {
          blocked.current = true;
          publish({ ready: false, conflict: true, needsRetry: false, status: CONFLICT });
          return;
        }
      }
      persist();
      publish({ ready: true, conflict: false, needsRetry: false, status: pending.current ? '保存採購進度…' : '採購進度已從帳戶載入。' });
      while (pending.current && active.current === scope && !blocked.current) {
        if (navigator.onLine === false) {
          publish({ ready: true, needsRetry: true, status: '離線修改已保存在此瀏覽器，連線後會重試。' }); return;
        }
        const sent = latest.current;
        const expected = revision.current;
        attempt.current = { progress: sent, revision: expected };
        persist();
        const saved = await request('PUT', sent, expected);
        const result = await saved.json();
        if (active.current !== scope || blocked.current) return;
        if (saved.status === 409) {
          blocked.current = true;
          publish({ ready: false, conflict: true, needsRetry: false, status: CONFLICT }); return;
        }
        if (!saved.ok || result.revision !== expected + 1) throw new Error('Write failed');
        revision.current = result.revision; attempt.current = undefined;
        pending.current = progressFingerprint(latest.current) !== progressFingerprint(sent);
        persist();
        publish({ ready: true, needsRetry: false, status: pending.current ? '保存採購進度…' : '採購進度已保存到帳戶。' });
      }
    } catch (error) {
      if (active.current !== scope) return;
      if (error instanceof LocalConflict) {
        blocked.current = true; publish({ ready: false, conflict: true, needsRetry: false, status: CONFLICT });
      } else if (error instanceof StorageFailure) {
        publish({ ready: false, needsRetry: true, status: '離線保存失敗，修改只在此頁；請勿關頁，並重試保存。' });
      } else {
        // A read/write failure never erases the durable pending snapshot.
        publish({ ready: cachedAvailable.current, needsRetry: pending.current, status: pending.current
          ? '未能保存到帳戶；修改已保存在此瀏覽器，連線後會重試。'
          : cachedAvailable.current ? '未能讀取帳戶進度，顯示此瀏覽器上次保存的資料；可重試。' : '未能讀取採購進度，請連線後重試。' });
      }
    } finally { if (writing.current === scope) writing.current = null; }
  }, [scope, planId, user?.id, storageKey, request, persist, publish]);

  useEffect(() => {
    if (!enabled || !planId || !user?.id || initialized.current === scope) return;
    initialized.current = scope;
    revision.current = 0; pending.current = false; attempt.current = undefined;
    latest.current = emptyProgress(); lastRaw.current = null; blocked.current = false;
    cachedAvailable.current = false; durable.current = true;
    publish({ ready: false, conflict: false, needsRetry: false, status: '讀取採購進度…' });
    try {
      lastRaw.current = localStorage.getItem(storageKey);
      const local = parseOfflineProgress(lastRaw.current, scope);
      if (local) {
        cachedAvailable.current = true;
        revision.current = local.revision; latest.current = local.progress;
        pending.current = local.pending; attempt.current = local.attempt;
        publish({ ready: true, status: local.pending ? '已還原尚未同步的採購修改。' : '正在核對帳戶進度…' });
      } else { lastRaw.current = localStorage.getItem(storageKey); }
    } catch {
      publish({ ready: false, status: '此瀏覽器未能保存離線資料，請勿關頁。' });
    }
    void synchronize();
  }, [enabled, planId, user?.id, scope, storageKey, publish, synchronize]);
  useEffect(() => {
    const online = () => { if (initialized.current === scope) void synchronize(); };
    const storage = (event: StorageEvent) => {
      if (event.storageArea === localStorage && (event.key === storageKey || event.key === null)) {
        blocked.current = true;
        publish({ ready: false, conflict: true, needsRetry: false, status: CONFLICT });
      }
    };
    const warn = (event: BeforeUnloadEvent) => { if (pending.current && !durable.current) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('online', online); window.addEventListener('storage', storage); window.addEventListener('beforeunload', warn);
    return () => { window.removeEventListener('online', online); window.removeEventListener('storage', storage); window.removeEventListener('beforeunload', warn); };
  }, [scope, storageKey, publish, synchronize]);
  const change = useCallback((progress: ShoppingProgress) => {
    if (active.current !== scope || blocked.current || !validProgress(progress)) return;
    latest.current = progress; pending.current = true;
    try { persist(); }
    catch (error) {
      if (error instanceof LocalConflict) {
        blocked.current = true; publish({ ready: false, conflict: true, status: CONFLICT });
      } else publish({ ready: false, needsRetry: true, status: '離線保存失敗，修改只在此頁；請勿關頁，並重試保存。' });
      return;
    }
    publish({ ready: true, conflict: false, needsRetry: false, status: navigator.onLine === false ? '離線修改已保存在此瀏覽器，連線後會重試。' : '保存採購進度…' });
    void synchronize();
  }, [scope, persist, publish, synchronize]);
  const reload = async () => {
    if (blocked.current) {
      if (!window.confirm('載入雲端進度會取代此頁尚未同步的修改，確定繼續？')) return;
      await synchronize(true);
    } else await synchronize();
  };
  const retrySave = () => {
    try { persist(); } catch { publish({ ready: false, needsRetry: true, status: '離線保存失敗，請勿關頁，稍後重試。' }); return; }
    void synchronize();
  };
  const current = state.scope === scope ? state : { scope, progress: emptyProgress(), ready: false, status: '', conflict: false, needsRetry: false };
  return { ...current, change, reload, retrySave };
}
