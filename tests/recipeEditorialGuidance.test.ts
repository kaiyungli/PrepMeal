import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { editorialRecipeFingerprint, recipeEditorialGuidance } from '../src/features/recipes/mappers/recipeEditorialGuidance';
import { normalizeRecipeDetail } from '../src/features/recipes/mappers/normalizeRecipeDetail';
import type { RecipeDetailRow } from '../src/features/recipes/services/getRecipeDetail';
import { generateCookingTips, generatePairingSuggestions } from '../src/lib/recipes/recipeGuidance';

const root = 'docs/qa/editorial-guidance-20261113/';
const originals = JSON.parse(readFileSync(root + 'recipe-snapshot.json', 'utf8'));
const payload = JSON.parse(readFileSync(root + 'payload.json', 'utf8'));
const targets = payload.map((patch: { id: string; recipe_updates: object; changed_steps: { step_no: number; text: string }[];
  ingredient_changes: { new: { id: string } }[]; guidance: object }) => {
  const target = structuredClone(originals.find((r: { id: string }) => r.id === patch.id));
  Object.assign(target, patch.recipe_updates);
  for (const step of patch.changed_steps) target.steps.find((s: { step_no: number }) => s.step_no === step.step_no).text = step.text;
  for (const ingredient of patch.ingredient_changes) {
    target.ingredients = target.ingredients.filter((i: { id: string }) => i.id !== ingredient.new.id);
    target.ingredients.push(ingredient.new);
  }
  return { target, guidance: patch.guidance };
});
function row(entry = targets[0]): RecipeDetailRow {
  const r = structuredClone(entry.target);
  return { ...r, source_data: { internal_ledger: 'private', editorial_guidance: entry.guidance },
    ingredients: r.ingredients.map((i: { id: string; name: string; quantity: number; unit: string; note: string; optional: boolean }) =>
      ({ ...i, unit: { code: i.unit, name: i.unit }, prep_note: i.note, is_optional: i.optional })),
  } as RecipeDetailRow;
}

describe('reviewed recipe guidance', () => {
  it('binds all 303 reviewed entries to their actual materials, steps and recipe roles', () => {
    expect(targets).toHaveLength(303);
    for (const entry of targets) {
      const r = row(entry);
      expect(editorialRecipeFingerprint(r), entry.target.name).toBe(entry.guidance.source_fingerprint);
      const normalized = normalizeRecipeDetail(r);
      expect(normalized.cooking_tips, entry.target.name).toEqual(entry.guidance.cooking_tips);
      expect(normalized.pairing_suggestions).toEqual(entry.guidance.pairing_suggestions);
      expect(normalized.cooking_tips).toHaveLength(2);
      expect(normalized.pairing_suggestions).toHaveLength(1);
      expect(generateCookingTips(normalized)).toEqual(entry.guidance.cooking_tips);
      expect(generatePairingSuggestions(normalized)).toEqual(entry.guidance.pairing_suggestions);
      expect(normalized).not.toHaveProperty('source_data');
      expect(JSON.stringify(normalized)).not.toMatch(/internal_ledger|source_fingerprint|desk_review_not_test_cooked/);
    }
  });
  it('ignores database ingredient order and unit labels', () => {
    const r = row(), hash = editorialRecipeFingerprint(r);
    r.ingredients.reverse();
    r.ingredients[0].unit!.name = 'display label';
    expect(editorialRecipeFingerprint(r)).toBe(hash);
  });
  it.each(['quantity', 'step', 'method', 'role'])('rejects stale editorial guidance after a %s change', field => {
    const r = row();
    if (field === 'quantity') r.ingredients[0].quantity += 1;
    if (field === 'step') r.steps[0].text += ' changed';
    if (field === 'method') r.method = 'steamed';
    if (field === 'role') r.meal_role = 'veg_side';
    expect(recipeEditorialGuidance(r)).toEqual({});
    expect(generateCookingTips(normalizeRecipeDetail(r))).not.toEqual(targets[0].guidance.cooking_tips);
  });
  it.each([null, [], { version: 2 }, { cooking_tips: [''] }, { pairing_suggestions: [1] }])('handles malformed metadata: %j', patch => {
    const r = row();
    r.source_data = { editorial_guidance: patch && !Array.isArray(patch) ? { ...targets[0].guidance, ...patch } : patch };
    expect(recipeEditorialGuidance(r)).toEqual({});
  });
  it('allows only valid HTTPS cooking references without exposing other metadata', () => {
    const r = row();
    r.source_data = { editorial_guidance: { ...targets[0].guidance, references: [
      { title: 'Valid', url: 'https://www.cfs.gov.hk/' }, { title: 'Unsafe', url: 'javascript:alert(1)' },
      { title: 'Insecure', url: 'http://example.com/' }, { title: '', url: 'https://example.com/' }, null,
    ] } };
    expect(recipeEditorialGuidance(r).editorial_sources).toEqual([{ title: 'Valid', url: 'https://www.cfs.gov.hk/' }]);
  });
});
