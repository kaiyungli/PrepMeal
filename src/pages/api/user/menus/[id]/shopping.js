import { requireAuth } from '../../_auth';
import { createUserSupabaseClient } from '@/lib/supabaseUserClient';
import { validProgress } from '@/features/shopping-list/progress/model';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const config = { api: { bodyParser: { sizeLimit: '250kb' } } };

export default async function handler(req, res) {
  if (!['GET', 'PUT'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  const userId = await requireAuth(req, res);
  if (!userId) return;
  const planId = req.query.id;
  if (typeof planId !== 'string' || !UUID.test(planId)) return res.status(404).json({ error: 'Plan not found' });
  const client = createUserSupabaseClient({ supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, token: req.headers.authorization.substring(7) });
  try {
    const { data: plan, error: planError } = await client.from('menu_plans').select('id').eq('id', planId).eq('user_id', userId).maybeSingle();
    if (planError) throw planError;
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    if (req.method === 'GET') {
      const { data, error } = await client.from('menu_plan_shopping_progress').select('progress,revision').eq('plan_id', planId).maybeSingle();
      if (error) throw error;
      return res.status(200).json({ progress: data?.progress ?? null, revision: data?.revision ?? 0 });
    }
    const { progress, revision } = req.body || {};
    if (!validProgress(progress) || !Number.isSafeInteger(revision) || revision < 0 || revision >= 2147483647 || JSON.stringify(progress).length > 200000)
      return res.status(400).json({ error: 'Invalid progress' });
    if (revision === 0) {
      const { error } = await client.from('menu_plan_shopping_progress').insert({ plan_id: planId, progress, revision: 1 });
      if (error?.code === '23505') return res.status(409).json({ error: 'Progress changed' });
      if (error) throw error;
    } else {
      const { data, error } = await client.from('menu_plan_shopping_progress').update({ progress, revision: revision + 1, updated_at: new Date().toISOString() })
        .eq('plan_id', planId).eq('revision', revision).select('revision');
      if (error) throw error;
      if (!data?.length) return res.status(409).json({ error: 'Progress changed' });
    }
    return res.status(200).json({ revision: revision + 1 });
  } catch (error) {
    console.error('[shopping-progress]', error?.code);
    return res.status(500).json({ error: '未能保存或讀取採購進度，請重試。' });
  }
}
