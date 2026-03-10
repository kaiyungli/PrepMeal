// Menu Plans Service
const API_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hivnajhqqvaokthzhugx.supabase.co'
const API_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

interface PlanData {
  name?: string
  daysPerWeek: number
  dishesPerDay: number
  servings: number
  weeklyPlan: any
  settings: any
}

export async function saveMenuPlan(planData: PlanData) {
  const response = await fetch(`${API_URL}/rest/v1/menus`, {
    method: 'POST',
    headers: {
      'apikey': API_KEY,
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({
      name: planData.name || `Menu ${new Date().toLocaleDateString('zh-HK')}`,
      menu_data: {
        daysPerWeek: planData.daysPerWeek,
        dishesPerDay: planData.dishesPerDay,
        servings: planData.servings,
        weeklyPlan: planData.weeklyPlan,
        settings: planData.settings
      }
    })
  })
  
  if (!response.ok) {
    throw new Error('Failed to save menu plan')
  }
  
  return { success: true }
}

export async function getMenuPlans() {
  const response = await fetch(`${API_URL}/rest/v1/menus?select=*&order=created_at.desc`, {
    headers: {
      'apikey': API_KEY,
      'Authorization': `Bearer ${API_KEY}`
    }
  })
  
  const data = await response.json()
  return data || []
}

export async function deleteMenuPlan(id: string) {
  const response = await fetch(`${API_URL}/rest/v1/menus?id=eq.${id}`, {
    method: 'DELETE',
    headers: {
      'apikey': API_KEY,
      'Authorization': `Bearer ${API_KEY}`
    }
  })
  
  return response.ok
}
