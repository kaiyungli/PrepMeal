export type NavLink = { label: string; path: string };

export const PRIMARY_LINKS: NavLink[] = [
  { label: '一週餐單', path: '/generate' },
  { label: '搜尋食譜', path: '/recipes' },
  { label: '晚餐指南', path: '/#home-guides' },
];
export const TOOL_LINKS: NavLink[] = [
  { label: '收藏', path: '/favorites' }, { label: '我的餐單', path: '/my-plans' },
];
export const GUIDE_LINKS: NavLink[] = [
  { label: '30分鐘快手菜', path: '/30-minute-dinner-recipes' },
  { label: '家常菜靈感', path: '/50-classic-hk-recipes' },
  { label: '一週晚餐示例', path: '/7-day-dinner-plan' },
  { label: '買餸攻略', path: '/hong-kong-market-shopping-guide' },
  { label: '健康晚餐', path: '/healthy-dinner-guide' },
  { label: '按材料揀菜', path: '/ingredient-pairing-guide' },
];
export const ACCOUNT_LINKS: NavLink[] = [{ label: '個人資料', path: '/profile' }];
export const TRUST_LINKS: NavLink[] = [
  { label: '關於我們', path: '/about' }, { label: '聯絡我們', path: '/contact' },
  { label: '常見問題', path: '/faq' }, { label: '私隱政策', path: '/privacy' },
  { label: '使用條款', path: '/terms' },
];

/** Section anchors do not mark the whole homepage as a separate current page. */
export function isNavigationRouteActive(pathname: string | null, path: string): boolean {
  if (!pathname || path.includes('#')) return false;
  return path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`);
}
