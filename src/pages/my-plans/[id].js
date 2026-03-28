'use client';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import { useAuth } from '@/hooks/useAuth';

const DAY_NAMES = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'];
const MEAL_TYPES = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐' };

export default function PlanDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { isAuthenticated, loading, getAccessToken } = useAuth();
  const [plan, setPlan] = useState(null);
  const [items, setItems] = useState([]);
  const [loading: dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

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
        
        console.log('DEBUG items response:', data);
        
        // Handle both old and new response format
        if (data.success === false && data.error) {
          alert(data.error);
          router.push('/my-plans');
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

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('zh-HK');
  };

  // Transform items - compute day_index from date
  const startDate = plan?.start_date ? new Date(plan.start_date) : null;
  const groupedItems = {};
  
  Array.isArray(items) ? items.forEach((item) => {
    const itemDate = new Date(item.date);
    const diffDays = startDate ? Math.floor((itemDate - startDate) / (1000 * 60 * 60 * 24)) : 0;
    const dayIndex = diffDays >= 0 ? diffDays : 0;
    
    if (!groupedItems[dayIndex]) groupedItems[dayIndex] = [];
    groupedItems[dayIndex].push(item);
  });

  if (loading || !isAuthenticated) {
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
      <Head><title>{plan?.name || '餐單詳情'} - 今晚食乜</title></Head>
      <div className="min-h-screen bg-[#F8F3E8] py-8">
        <div className="max-w-[800px] mx-auto px-4">
          {/* Back button */}
          <Link
            href="/my-plans"
            className="inline-flex items-center gap-1 text-[#9B6035] font-medium mb-4 hover:underline"
          >
            ← 返回我的餐單
          </Link>

          {dataLoading ? (
            <div className="text-center py-20">
              <p className="text-[#AA7A50]">載入中...</p>
            </div>
          ) : !plan ? (
            <div className="text-center py-20">
              <p className="text-[#7A746B]">搵唔到呢個餐單</p>
            </div>
          ) : (
            <>
              {/* Plan header */}
              <div className="bg-white rounded-xl border border-[#E5DCC8] p-6 mb-6">
                <h1 className="text-2xl font-bold text-[#3A2010]">{plan.name}</h1>
                <p className="text-sm text-[#AA7A50] mt-2">
                  {plan.days_count}天 · 開始日期: {formatDate(plan.week_start_date)}
                </p>
                <p className="text-xs text-[#7A746B] mt-1">
                  建立於: {formatDate(plan.created_at)}
                </p>
              </div>

              {/* Days */}
              {Array.from({ length: plan.days_count || 7 }).map((_, dayIndex) => (
                <div key={dayIndex} className="bg-white rounded-xl border border-[#E5DCC8] p-4 mb-4">
                  <h3 className="text-lg font-semibold text-[#9B6035] mb-3">
                    {DAY_NAMES[dayIndex] || `Day ${dayIndex + 1}`}
                  </h3>
                  
                  {groupedItems[dayIndex]?.length > 0 ? (
                    <div className="space-y-3">
                      {(groupedItems[dayIndex] || []).map((item) => (
                        <div key={item.id} className="flex items-center gap-3 p-2 bg-[#F8F3E8] rounded-lg">
                          {item.recipe?.image_url ? (
                            <img
                              src={item.recipe.image_url}
                              alt={item.recipe.name}
                              className="w-16 h-16 object-cover rounded"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-[#E5DCC8] rounded flex items-center justify-center text-2xl">
                              🍽️
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="font-medium text-[#3A2010]">
                              {item.recipe?.name || '未知食譜'}
                            </p>
                            <p className="text-sm text-[#AA7A50]">
                              {MEAL_TYPES[item.meal_type] || item.meal_type} · {item.servings}人份
                            </p>
                            {item.recipe && (
                              <p className="text-xs text-[#7A746B] mt-1">
                                {item.recipe.total_time_minutes}分鐘 · {item.recipe.calories_per_serving}卡
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#AA7A50]">無安排</p>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </>
  );
}