import { describe, it, expect } from 'vitest';
import { buildImportMetadata, IMPORT_METADATA_FIELDS } from '@/lib/adminRecipeImportMetadata';
import { buildRecipeExport, buildExportEnvelope } from '@/lib/adminRecipeExportShape';
import { parseImportEnvelope } from '@/lib/adminRecipeImportResolve';

const metadata = { protein: ['fish', 'custom-tag'], diet: [], flavor: ['savory'], protein_g: 23.5, carbs_g: null, fat_g: 0, total_time_minutes: 42 };
describe('catalogue metadata transport', () => {
  it('preserves all seven fields through export, JSON serialization and v2 validation', () => {
    const recipe = buildRecipeExport({ name: 'Fish', slug: 'fish', ...metadata }, [], []);
    const envelope = JSON.parse(JSON.stringify(buildExportEnvelope([recipe], 't')));
    expect(parseImportEnvelope(envelope).version).toBe(2);
    expect(buildImportMetadata(envelope.recipes[0], 2)).toEqual({ value: metadata });
  });
  it('keeps legacy v1 with no metadata, and rejects metadata it would silently lose', () => {
    expect(parseImportEnvelope({ format: 'prepmeal.recipe-export', version: 1, recipes: [{}] }).version).toBe(1);
    expect(buildImportMetadata({}, 1)).toEqual({ value: null });
    expect(buildImportMetadata(metadata, 1).error).toMatch(/Version 1 cannot preserve/);
  });
  it.each(IMPORT_METADATA_FIELDS)('rejects missing v2 field %s', (field) => {
    const incomplete: Record<string, unknown> = { ...metadata }; delete incomplete[field];
    expect(buildImportMetadata(incomplete, 2).error).toMatch(/Missing version 2 field/);
  });
  it.each([
    ['protein', null], ['diet', ['']], ['flavor', [1]], ['protein_g', '23'],
    ['carbs_g', -1], ['fat_g', Infinity], ['fat_g', NaN],
    ['total_time_minutes', 1.5], ['total_time_minutes', 2147483648],
  ])('rejects malformed %s', (field, value) => {
    expect(buildImportMetadata({ ...metadata, [field as string]: value }, 2).error).toMatch(/Invalid value/);
  });
});
