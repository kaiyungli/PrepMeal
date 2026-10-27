import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import GenerateActions from '@/components/generate/GenerateActions';

type Availability = {
  isLoadingRecipes: boolean;
  availableRecipeCount: number;
  filteredRecipeCount: number;
  hasRecipes?: boolean;
  availabilityWarnings?: string[];
  isAuthenticated?: boolean;
};

function renderActions({ isLoadingRecipes, availableRecipeCount, filteredRecipeCount, hasRecipes = false, availabilityWarnings, isAuthenticated }: Availability) {
  return renderToStaticMarkup(createElement(GenerateActions, {
    isSaving: false,
    isAuthenticated,
    isLoadingRecipes,
    availableRecipeCount,
    filteredRecipeCount,
    hasRecipes,
    availabilityWarnings,
    selectedCount: hasRecipes ? 1 : 0,
    onClear: vi.fn(),
    onShoppingList: vi.fn(),
    onGenerate: vi.fn(),
    onSave: vi.fn(),
  }));
}

function generateButton(markup: string) {
  return markup.match(/<button\b[^>]*>一鍵生成<\/button>/)?.[0];
}

describe('generation availability', () => {
  it('shows the login requirement to guests but not signed-in users', () => {
    const props = { isLoadingRecipes: false, availableRecipeCount: 3, filteredRecipeCount: 2 };
    expect(renderActions({ ...props, isAuthenticated: false })).toContain('可預覽購物清單；登入後可保存餐單');
    expect(renderActions({ ...props, isAuthenticated: true })).not.toContain('可預覽購物清單；登入後可保存餐單');
  });
  it('warns about role shortages without blocking generation and hides stale warnings while loading', () => {
    const props = { isLoadingRecipes: false, availableRecipeCount: 3, filteredRecipeCount: 2,
      availabilityWarnings: ['目前只有兩道配菜'] };
    const html = renderActions(props);
    expect(html).toContain('目前只有兩道配菜');
    expect(generateButton(html)).not.toContain('disabled=""');
    expect(renderActions({ ...props, isLoadingRecipes: true })).not.toContain('目前只有兩道配菜');
    expect(renderActions({ ...props, filteredRecipeCount: 0 })).not.toContain('目前只有兩道配菜');
  });
  it('keeps generation disabled while recipes load without claiming filters have no matches', () => {
    const html = renderActions({ isLoadingRecipes: true, availableRecipeCount: 0, filteredRecipeCount: 0 });
    expect(generateButton(html)).toContain('disabled=""');
    expect(html).toContain('role="status"');
    expect(html).toContain('正在載入食譜');
    expect(html).not.toContain('沒有食譜符合目前條件');
  });

  it('explains when no recipes are available at all', () => {
    const html = renderActions({ isLoadingRecipes: false, availableRecipeCount: 0, filteredRecipeCount: 0 });
    expect(generateButton(html)).toContain('disabled=""');
    expect(html).toContain('暫時沒有可用食譜，請稍後再試。');
  });

  it('explains when filters exclude every available recipe without disabling existing-plan actions', () => {
    const html = renderActions({ isLoadingRecipes: false, availableRecipeCount: 3, filteredRecipeCount: 0, hasRecipes: true });
    expect(generateButton(html)).toContain('disabled=""');
    expect(html).toContain('沒有食譜符合目前條件，請調整篩選條件。');
    expect(html.match(/<button\b[^>]*>購物清單<\/button>/)?.[0]).not.toContain('disabled=""');
    expect(html.match(/<button\b[^>]*>保存<\/button>/)?.[0]).not.toContain('disabled=""');
  });

  it('enables generation and hides availability messages when candidates exist', () => {
    const html = renderActions({ isLoadingRecipes: false, availableRecipeCount: 3, filteredRecipeCount: 2 });
    expect(generateButton(html)).not.toContain('disabled=""');
    expect(html).not.toContain('role="status"');
  });
});
