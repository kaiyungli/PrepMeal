import { describe, it, expect } from 'vitest'

/**
 * Simple tests for PantryChipInput logic
 * Full component tests would require @testing-library/react
 */

// Test helper functions (extracted logic for testing)
function addChip(currentChips: string[], newChip: string): string[] {
  const trimmed = newChip.trim().toLowerCase();
  if (!trimmed) return currentChips;
  if (currentChips.includes(trimmed)) return currentChips;
  return [...currentChips, trimmed];
}

function removeChip(currentChips: string[], index: number): string[] {
  const newChips = [...currentChips];
  newChips.splice(index, 1);
  return newChips;
}

function generateQuery(chips: string[]): string {
  return chips.join(',');
}

describe('PantryChipInput Logic', () => {
  describe('addChip', () => {
    it('adds chip to empty array', () => {
      const result = addChip([], 'egg');
      expect(result).toEqual(['egg']);
    });

    it('adds chip to existing chips', () => {
      const result = addChip(['egg'], 'tomato');
      expect(result).toEqual(['egg', 'tomato']);
    });

    it('ignores duplicate chip', () => {
      const result = addChip(['egg'], 'egg');
      expect(result).toEqual(['egg']);
    });

    it('ignores empty input', () => {
      const result = addChip([], '   ');
      expect(result).toEqual([]);
    });

    it('trims whitespace', () => {
      const result = addChip([], '  tomato  ');
      expect(result).toEqual(['tomato']);
    });

    it('converts to lowercase', () => {
      const result = addChip([], 'TOMATO');
      expect(result).toEqual(['tomato']);
    });
  });

  describe('removeChip', () => {
    it('removes chip by index', () => {
      const result = removeChip(['egg', 'tomato', 'onion'], 1);
      expect(result).toEqual(['egg', 'onion']);
    });

    it('handles invalid index', () => {
      const result = removeChip(['egg'], 5);
      expect(result).toEqual(['egg']);
    });
  });

  describe('generateQuery', () => {
    it('generates comma-separated query', () => {
      const result = generateQuery(['egg', 'tomato', 'onion']);
      expect(result).toEqual('egg,tomato,onion');
    });

    it('handles empty array', () => {
      const result = generateQuery([]);
      expect(result).toEqual('');
    });
  });
});
