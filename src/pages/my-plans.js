'use client';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Header from '@/components/layout/Header';
import Toast from '@/components/ui/Toast';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { useAuthGuard } from '@/hooks/useAuthGuard';

export default function MyPlansPage() {
  // Use centralized auth guard - handles redirect automatically
  const { isAuthenticated, loading: authLoading, requireAuth } = useAuthGuard();
  const { getAccessToken } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const { toast, showToast } = useToast();

  // Load plans when authenticated (useAuthGuard handles redirect)
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchPlans = async () => {
      setLoading(true);
      try {
        const token = await getAccessToken();
        
        const res = await fetch('/api/user/menus', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const data = await res.json();
        
        if (data?.success) {
          setPlans(data?.data?.menus || []);
        }
      } catch (err) {
        console.error('Failed to load plans:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, [isAuthenticated, getAccessToken]);

  const handleDelete = async (planId) => {
    if (!requireAuth()) return;
    
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
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-[#3A2010]">我的餐單</h1>
            <a href="/generate" className="px-6 py-3 rounded-full bg-[#9B6035] text-white font-medium hover:opacity-95">
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
              <a href="/generate" className="text-[#9B6035] font-medium hover:underline">
                去生成 →
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <div key={plan.id} className="bg-white rounded-2xl p-6 shadow-sm border border-[#DDD0B0]">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-[#3A2010]">{plan.name || '未命名餐單'}</h3>
                    <button 
                      onClick={() => handleDelete(plan.id)}
                      disabled={deleting === plan.id}
                      className="text-[#AA7A50] hover:text-red-500 text-sm"
                    >
                      {deleting === plan.id ? '刪除中...' : '刪除'}
                    </button>
                  </div>
                  <p className="text-sm text-[#AA7A50] mb-4">
                    {plan.days?.length || 0} 日餐單
                  </p>
                  <a 
                    href={`/my-plans/${plan.id}`}
                    className="block text-center py-2 rounded-lg bg-[#C8D49A] text-[#3A2010] font-medium hover:bg-[#B8C489]"
                  >
                    查看詳情
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {toast && <Toast toast={toast} />}
    </>
  );
}