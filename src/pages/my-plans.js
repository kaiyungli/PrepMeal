'use client';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Header from '@/components/layout/Header';
import { useHeaderController } from '@/features/layout/hooks/useHeaderController';
import Toast from '@/components/ui/Toast';
import { useToast } from '@/components/ui/Toast';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { UI } from '@/styles/ui';
import PlanCard from '@/components/myPlans/PlanCard';
import { clearMyPlans, isMyPlansStale, loadMyPlans, peekMyPlans, setMyPlans } from '@/features/plans/myPlansCache';

export default function MyPlansPage() {
  const auth = useAuthGuard();
  // Remount account-owned state before rendering a different auth scope.
  // Logout -> login must also discard the earlier list, delete locks and toast.
  const accountKey = JSON.stringify([auth.isAuthenticated, auth.user?.id]);
  // Signed out: forget the cached list so the next sign-in reloads it.
  if (!auth.loading && !auth.isAuthenticated) clearMyPlans();
  return <AccountPlansPage key={accountKey} auth={auth} />;
}

function AccountPlansPage({ auth }) {
  const headerCtrl = useHeaderController();
  const { isAuthenticated, loading: authLoading, getAccessToken, requireAuth, user } = auth;
  // A list shown earlier in this tab appears at once; it is refreshed below.
  // After a save (stale) the old list is not shown, so it can't look like
  // the new plan is missing.
  const [initialPlans] = useState(() => (isMyPlansStale(user?.id) ? null : peekMyPlans(user?.id)));
  const [plans, setPlans] = useState(() => initialPlans || []);
  const [loading, setLoading] = useState(() => !initialPlans);
  const [loadError, setLoadError] = useState(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [deletingIds, setDeletingIds] = useState(() => new Set());
  const { toast, showToast } = useToast();

  const tokenGetterRef = useRef(getAccessToken);
  useEffect(() => { tokenGetterRef.current = getAccessToken; }, [getAccessToken]);

  // Plan ids with a DELETE in flight, updated synchronously so a repeat
  // click handled before the next render cannot send a second request
  const deleteRequestsRef = useRef(new Map());
  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
    const requests = deleteRequestsRef.current;
    return () => {
      mountedRef.current = false;
      for (const request of requests.values()) {
        request.active = false;
        request.controller.abort();
      }
      requests.clear();
    };
  }, []);

  // Load plans when authenticated (useAuthGuard handles redirect)
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    let cancelled = false;

    const fetchPlans = async () => {
      // Keep showing the cached list while refreshing; only spin when empty.
      const hasShownList = !isMyPlansStale(user.id);
      if (!hasShownList) setLoading(true);
      setLoadError(null);
      try {
        const token = await tokenGetterRef.current();
        if (cancelled) return;
        if (!token) throw new Error('Missing access token');

        // Shares a request already started by hovering the "我的餐單" link.
        const plansData = await loadMyPlans(user.id, token);
        if (cancelled) return;
        setPlans(plansData);
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load plans:', err);
          if (!hasShownList) setLoadError('餐單載入失敗，請重試');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchPlans();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id, loadAttempt]);

  const handleDelete = async (planId) => {
    if (!mountedRef.current || deleteRequestsRef.current.has(planId)) return;
    if (!requireAuth()) return;
    
    if (!confirm('確定要刪除呢個餐單？')) return;
    
    const request = { active: true, controller: new AbortController() };
    deleteRequestsRef.current.set(planId, request);
    setDeletingIds(prev => new Set(prev).add(planId));
    try {
      const token = await tokenGetterRef.current();
      if (!request.active) return;
      if (!token) throw new Error('Missing access token');
      const res = await fetch(`/api/user/menus/${planId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
        signal: request.controller.signal
      });
      if (!request.active) return;
      
      // A 2xx transport response is not sufficient: require the API success
      // contract before hiding a plan or showing a success toast.
      const payload = res.ok ? await res.json() : null;
      if (!request.active) return;
      if (res.ok && payload?.success === true && payload?.data?.deleted === true) {
        setPlans(prev => {
          const next = prev.filter(p => p.id !== planId);
          if (user?.id) setMyPlans(user.id, next);
          return next;
        });
        showToast('已刪除', 'success');
      } else {
        showToast('刪除失敗', 'error');
      }
    } catch {
      if (request.active) showToast('刪除失敗', 'error');
    } finally {
      if (request.active) {
        deleteRequestsRef.current.delete(planId);
        request.active = false;
        setDeletingIds(prev => {
          const next = new Set(prev);
          next.delete(planId);
          return next;
        });
      }
    }
  };

  if (authLoading) {
    return (
      <>
        <Header {...headerCtrl} />
        <div className="min-h-screen bg-[#F8F3E8] flex items-center justify-center">
          <p className="text-[#AA7A50]">載入中...</p>
        </div>
      </>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <Header {...headerCtrl} />
        <div className="min-h-screen bg-[#F8F3E8] flex items-center justify-center">
          <p className="text-[#AA7A50]">登入後可查看你的餐單</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Header {...headerCtrl} />
      
      <Head><title>我的餐單 - 今晚食乜</title></Head>
      <div className="min-h-screen bg-[#F8F3E8] py-8">
        <div className="max-w-[1200px] mx-auto px-4">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-[#3A2010]">我的餐單</h1>
            <Link href="/generate" className={UI.buttonPrimaryPill}>
              生成新餐單
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" role="status">
              <span className="sr-only">正在載入餐單...</span>
              {[0, 1, 2].map(i => (
                <div key={i} className="bg-white rounded-xl border border-[#E5E5E5] shadow-sm p-5 animate-pulse" aria-hidden="true">
                  <div className="h-5 w-2/3 rounded bg-[#F1E9DA] mb-4" />
                  <div className="flex gap-2 mb-4">
                    <div className="h-5 w-10 rounded bg-[#F8F3E8]" />
                    <div className="h-5 w-12 rounded bg-[#F8F3E8]" />
                  </div>
                  <div className="h-4 w-full rounded bg-[#F8F3E8] mb-2" />
                  <div className="h-4 w-4/5 rounded bg-[#F8F3E8] mb-5" />
                  <div className="h-9 w-full rounded-lg bg-[#EEF1E0]" />
                </div>
              ))}
            </div>
          ) : loadError ? (
            <div className="text-center py-20" role="alert">
              <p className="text-red-600 mb-4">{loadError}</p>
              <button className={UI.textLink} onClick={() => setLoadAttempt(attempt => attempt + 1)}>
                重試
              </button>
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-[#7A746B] mb-4">你仲未生成任何餐單</p>
              <Link href="/generate" className={UI.textLink}>
                去生成 →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <PlanCard 
                  key={plan.id} 
                  plan={plan} 
                  onDelete={handleDelete}
                  isDeleting={deletingIds.has(plan.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {toast && <Toast toast={toast} />}
    </>
  );
}
