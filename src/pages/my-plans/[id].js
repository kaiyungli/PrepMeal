'use client';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import { useAuth } from '@/hooks/useAuth';
import { UI } from '@/styles/ui';
import PlanDaySection from '@/components/myPlans/PlanDaySection';
import { formatDate } from '@/utils/planUtils';
import ShoppingListSection from '@/components/myPlans/ShoppingListSection';

export default function PlanDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { isAuthenticated, loading: authLoading, getAccessToken } = useAuth();
  const [plan, setPlan] = useState(null);
  const [items, setItems] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated || !id) return;

    const fetchPlan = async () => {
      setDataLoading(true);
      try {
        const token = await getAccessToken();
        const res = await fetch(`/api/user/menus/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const data = await res.json();
        
        
        
        // Handle both old and new response format
        if (data.success === false && data.error) {
          setError(data.error || '載入失敗');
        } else {
          setPlan(data.data?.plan || data.plan);
          setItems(data.data?.items || data.items || []);
        }
      } catch (err) {
        console.error('Failed to load plan:', err);
        router.push('/my-plans');
      } finally {
        setDataLoading(false);
      }
    };

    fetchPlan();
  }, [isAuthenticated, id, router]);

  // Transform items - compute day_index from date
  const startDate = plan?.week_start_date ? new Date(plan.week_start_date) : null;
  const groupedItems = {};
  
  if (Array.isArray(items)) items.forEach((item) => {
    const itemDate = new Date(item.date);
    const diffDays = startDate ? Math.floor((itemDate - startDate) / (1000 * 60 * 60 * 24)) : 0;
    const dayIndex = Math.min(Math.max(diffDays >= 0 ? diffDays : 0), (plan?.days_count || 7) - 1);
    
    if (!groupedItems[dayIndex]) groupedItems[dayIndex] = [];
    groupedItems[dayIndex].push(item);
  });

  // Extract unique recipe IDs for shopping list
  const recipeIds = [...new Set(items.map(i => i.recipe_id).filter(Boolean))];
  // Average servings for shopping list
  const avgServings = items.length > 0 
    ? Math.round(items.reduce((sum, i) => sum + (i.servings || 1), 0) / items.length)
    : 1;

  if (authLoading || !isAuthenticated) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-[#F8F3E8] flex items-center justify-center">
          <p className="text-[var(--color-text-muted)]">載入中...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <Head><title>{plan?.name || '餐單詳情'} - 今晚食乜</title></Head>
      <div className="min-h-screen bg-[#F8F3E8] py-8">
        <div className="max-w-[800px] mx-auto px-4">
          {/* Back button */}
          <Link
            href="/my-plans"
            className={UI.textSubtleAction}
          >
            ← 返回我的餐單
          </Link>

          {dataLoading ? (
            <div className="text-center py-20">
              <p className="text-[var(--color-text-muted)]">載入中...</p>
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-red-600">{error}</p>
            </div>
          ) : !plan ? (
            <div className="text-center py-20">
              <p className="text-[var(--color-text-muted)]">搵唔到呢個餐單</p>
            </div>
          ) : (
            <>
              {/* Plan header */}
              <div className={UI.card + " p-6 mb-6"}>
                <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{plan.name}</h1>
                <p className="text-sm text-[var(--color-text-muted)] mt-2">
                  {plan.days_count}天 · 開始日期: {formatDate(plan.week_start_date)}
                </p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  建立於: {formatDate(plan.created_at)}
                </p>
              </div>

              {/* Shopping List CTA */}
              {items.length > 0 && (
                <ShoppingListSection recipeIds={recipeIds} servings={avgServings} />
              )}

              {/* Days */}
              {Array.from({ length: plan.days_count || 7 }).map((_, dayIndex) => (
                <PlanDaySection
                  key={dayIndex}
                  dayIndex={dayIndex}
                  items={groupedItems[dayIndex] || []}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </>
  );
}
