'use client';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Header from '@/components/layout/Header';


import { Toast, useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';

export default function MyPlansPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const { toast, showToast } = useToast();

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/my-plans');
    }
  }, [authLoading, isAuthenticated, router]);

  // Load plans
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchPlans = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/user/menus');
        const data = await res.json();
        if (data.plans) {
          setPlans(data.plans);
        }
      } catch (err) {
        console.error('Failed to load plans:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, [isAuthenticated]);

  const handleDelete = async (planId) => {
    if (!confirm('確定要刪除呢個餐單嗎？')) return;
    
    setDeleting(planId);
    try {
      const res = await fetch(`/api/user/menus/${planId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.error) {
        showToast('刪除失敗: ' + data.error, 'error');
      } else {
        setPlans(plans.filter(p => p.id !== planId));
      }
    } catch (err) {
      alert('刪除失敗: ' + err.message);
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('zh-HK');
  };

  if (authLoading || !isAuthenticated) {
    return (
      <>
        <Header />
      
        <div className="min-h-screen bg-[#F8F3E8] flex items-center justify-center">
          <p className="text-[#AA7A50]">載入中...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      
      <Head><title>我的餐單 - 今晚食乜</title></Head>
      <div className="min-h-screen bg-[#F8F3E8] py-8">
        <div className="max-w-[1200px] mx-auto px-4">
          <h1 className="text-2xl font-bold text-[#3A2010] mb-6">我的餐單</h1>

          {loading ? (
            <div className="text-center py-20">
              <p className="text-[#AA7A50]">載入中...</p>
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-[#7A746B] mb-4">你仲未儲存任何餐單</p>
              <a href="/generate" className="text-[#9B6035] font-medium hover:underline">
                去生成一個餐單 →
              </a>
            </div>
          ) : (
            <div className="grid gap-4">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className="bg-white rounded-xl border border-[#E5DCC8] p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-[#3A2010]">{plan.name}</h3>
                      <p className="text-sm text-[#AA7A50] mt-1">
                        {plan.days_count}天 · 開始日期: {formatDate(plan.week_start_date)}
                      </p>
                      <p className="text-xs text-[#7A746B] mt-1">
                        建立於: {formatDate(plan.created_at)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(plan.id)}
                        disabled={deleting === plan.id}
                        className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {deleting === plan.id ? '刪除中...' : '刪除'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
