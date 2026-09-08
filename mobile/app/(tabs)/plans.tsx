/**
 * 餐單 tab — saved meal plans.
 *
 * Thin route: delegates to the plans feature screen, which owns the auth gate
 * (`useAuthSession`), data loading (`useMyPlans` -> `fetchMyPlans` -> Supabase)
 * and every list / loading / error / empty / signed-out state. See
 * `src/features/plans/`.
 */
import { PlansListScreen } from '@/features/plans';

export default function PlansScreen() {
  return <PlansListScreen />;
}
