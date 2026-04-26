export async function getPlanDetail(planId: string, token?: string) {
  const fetchStart = Date.now();
  console.log('[plan-detail-fetch] request_start', { planId });

  const res = await fetch(`/api/user/menus/${planId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });

  console.log('[plan-detail-fetch] response_received', {
    duration_ms: Date.now() - fetchStart,
    status: res.status
  });

  const data = await res.json();

  console.log('[plan-detail-fetch] json_parsed', {
    duration_ms: Date.now() - fetchStart,
    itemCount: (data?.data?.items || data?.items || []).length,
    hasPlan: Boolean(data?.data?.plan || data?.plan)
  });

  if (!res.ok || data.success === false) {
    throw new Error(data.error || 'Failed to load plan');
  }

  return {
    plan: data.data?.plan || data.plan,
    items: data.data?.items || data.items || []
  };
}