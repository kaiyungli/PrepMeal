import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve('supabase/migrations/20260909050201_atomic_saved_plan_write.sql'),
  'utf8',
);

describe('atomic saved-plan migration contract', () => {
  it('uses invoker rights and exposes execution only to authenticated users', () => {
    expect(migration).toMatch(/SECURITY INVOKER/i);
    expect(migration).toMatch(/REVOKE ALL[\s\S]*FROM PUBLIC, anon, service_role/i);
    expect(migration).toMatch(/GRANT EXECUTE[\s\S]*TO authenticated/i);
  });

  it('keeps plan, items, and cached summary writes inside one function', () => {
    expect(migration).toMatch(/INSERT INTO public\.menu_plans/i);
    expect(migration).toMatch(/INSERT INTO public\.menu_plan_items/i);
    expect(migration).toMatch(/UPDATE public\.menu_plans/i);
  });

  it('bounds the accepted plan and item inputs', () => {
    expect(migration).toContain('p_days_count < 1 OR p_days_count > 7');
    expect(migration).toContain('jsonb_array_length(p_items) > 100');
    expect(migration).toContain("(item->>'day_index')::integer >= p_days_count");
    expect(migration).toContain("(item->>'servings')::numeric > 100");
    expect(migration).toContain('r.is_public IS TRUE');
    expect(migration).toContain('SELECT min(first_item.date)');
  });
});
