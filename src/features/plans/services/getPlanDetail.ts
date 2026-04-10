export async function getPlanDetail(planId: string, token?: string) {
  const res = await fetch(`/api/user/menus/${planId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });

  const data = await res.json();

  if (!res.ok || data.success === false) {
    throw new Error(data.error || 'Failed to load plan');
  }

  return {
    plan: data.data?.plan || data.plan,
    items: data.data?.items || data.items || []
  };
}