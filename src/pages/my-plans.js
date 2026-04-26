'use client';
import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Header from '@/components/layout/Header';
import { useHeaderController } from '@/features/layout/hooks/useHeaderController';
import Toast from '@/components/ui/Toast';
import { useToast } from '@/components/ui/Toast';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { UI } from '@/styles/ui';
import PlanCard from '@/components/myPlans/PlanCard';

export default function MyPlansPage() {
  const headerCtrl = useHeaderController();
  const { isAuthenticated, loading: authLoading, getAccessToken, requireAuth, user } = useAuthGuard();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const { toast, showToast } = useToast();

  // Track fetched user to prevent refetch on session refresh
  const fetchedUserIdRef = useRef(null);

  // Load plans when authenticated (useAuthGuard handles redirect)
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    // Prevent refetch for same user after tab focus/session refresh
    if (fetchedUserIdRef.current === user.id && plans.length > 0) {
      return;
    }

    let cancelled = false;

    const fetchPlans = async () => {
      if (plans.length === 0) setLoading(true);
      try {
        const token = await getAccessToken();

        const fetchStart = Date.now();
        console.log('[my-plans-page] plans_fetch_start');

        const res = await fetch('/api/user/menus', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        console.log('[my-plans-page] plans_response_received', {
          duration_ms: Date.now() - fetchStart,
          status: res.status
        });

        const data = await res.json();
        const plansData = data?.data?.plans || [];

        console.log('[my-plans-page] plans_json_parsed', {
          duration_ms: Date.now() - fetchStart,
          count: plansData.length
        });

        if (cancelled) return;

        if (data?.success) {
          setPlans(plansData);
          fetchedUserIdRef.current = user.id;
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load plans:', err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchPlans();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id]);

  const handleDelete = async (planId) => {
    if (!requireAuth()) return;
    
    if (!confirm('確定要刪除呢個餐單？')) return;
    
    setDeleting(planId);
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/user/menus/${planId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      
      if (res.ok) {
        setPlans(plans.filter(p => p.id !== planId));
        showToast('已刪除', 'success');
      } else {
        showToast('刪除失敗', 'error');
      }
    } catch (err) {
      showToast('刪除失敗', 'error');
    } finally {
      setDeleting(null);
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <>
        <Header {...headerCtrl} />
        <div className="min-h-screen bg-[#F8F3E8] flex items-center justify-center">
          <p className="text-[#AA7A50]">載入中...</p>
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
            <a href="/generate" className={UI.buttonPrimaryPill}>
              生成新餐單
            </a>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <p className="text-[#AA7A50]">載入中...</p>
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-[#7A746B] mb-4">你仲未生成任何餐單</p>
              <a href="/generate" className={UI.textLink}>
                去生成 →
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <PlanCard 
                  key={plan.id} 
                  plan={plan} 
                  onDelete={handleDelete}
                  isDeleting={deleting === plan.id}
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