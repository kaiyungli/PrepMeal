// v2 preserves catalogue tags and nutrition without changing the admin CRUD RPC.
export const IMPORT_METADATA_FIELDS = [
  'protein', 'diet', 'flavor', 'protein_g', 'carbs_g', 'fat_g', 'total_time_minutes',
];

export function buildImportMetadata(recipe, version) {
  if (version === 1) {
    if (IMPORT_METADATA_FIELDS.some((field) => Object.hasOwn(recipe, field))) {
      return { error: 'Version 1 cannot preserve catalogue metadata. Use version 2 with all metadata fields.' };
    }
    return { value: null };
  }
  const value = {};
  for (const field of IMPORT_METADATA_FIELDS) {
    if (!Object.hasOwn(recipe, field)) return { error: `Missing version 2 field "${field}"` };
    const raw = recipe[field];
    const valid = ['protein', 'diet', 'flavor'].includes(field)
      ? Array.isArray(raw) && raw.every((tag) => typeof tag === 'string' && tag.trim() !== '')
      : raw === null || (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0
        && (field !== 'total_time_minutes' || (Number.isInteger(raw) && raw <= 2147483647)));
    if (!valid) return { error: `Invalid value for "${field}"` };
    value[field] = raw;
  }
  return { value };
}
