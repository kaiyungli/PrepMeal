// Shared recipe identity contract used by both the Generate catalogue API and
// the client verifier.
import { describe, expect, it } from 'vitest';
import { findCatalogueIdProblem, isUsableRecipeId, recipeIdentityKey } from '@/features/generate/services/catalogueIdentity';

describe('isUsableRecipeId', () => {
  it.each([['uuid string', 'a1b2'], ['"0"', '0'], ['whitespace string', ' '], ['0', 0], ['negative', -3], ['float', 1.5]])(
    'accepts %s', (_label, id) => {
      expect(isUsableRecipeId(id)).toBe(true);
    },
  );

  it.each([
    ['empty string', ''], ['null', null], ['undefined', undefined], ['NaN', NaN],
    ['Infinity', Infinity], ['-Infinity', -Infinity], ['boolean', true], ['object', {}], ['array', [1]], ['bigint', BigInt(1)],
  ])('rejects %s', (_label, id) => {
    expect(isUsableRecipeId(id)).toBe(false);
  });
});

describe('recipeIdentityKey', () => {
  it('canonicalises numbers and strings by their string form', () => {
    expect(recipeIdentityKey(1)).toBe(recipeIdentityKey('1'));
    expect(recipeIdentityKey(-0)).toBe(recipeIdentityKey(0));
    expect(recipeIdentityKey('1.0')).not.toBe(recipeIdentityKey(1));
  });
});

describe('findCatalogueIdProblem', () => {
  it('returns null for usable unique ids, including an empty catalogue', () => {
    expect(findCatalogueIdProblem([])).toBeNull();
    expect(findCatalogueIdProblem([{ id: 0 }, { id: 'a' }, { id: 2 }])).toBeNull();
  });

  it('reports missing ids, including null recipes', () => {
    expect(findCatalogueIdProblem([{ id: 'a' }, {}])).toBe('missing_id');
    expect(findCatalogueIdProblem([null])).toBe('missing_id');
    expect(findCatalogueIdProblem([{ id: '' }])).toBe('missing_id');
  });

  it('reports duplicates under canonical identity', () => {
    expect(findCatalogueIdProblem([{ id: 'a' }, { id: 'a' }])).toBe('duplicate_id');
    expect(findCatalogueIdProblem([{ id: 1 }, { id: '1' }])).toBe('duplicate_id');
    expect(findCatalogueIdProblem([{ id: 0 }, { id: -0 }])).toBe('duplicate_id');
  });
});
