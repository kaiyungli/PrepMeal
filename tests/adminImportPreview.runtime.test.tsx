import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ImportModal from '@/components/admin/ImportModal';
import { EXPORT_FORMAT, EXPORT_VERSION, MAX_RECIPES } from '@/lib/adminRecipeExportShape';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function fillPreview(count: number, overrides = {}) {
  fireEvent.change(screen.getByRole('textbox'), { target: { value: JSON.stringify({
    format: EXPORT_FORMAT, version: EXPORT_VERSION,
    recipes: Array.from({ length: count }, (_, i) => ({ name: `Recipe ${i}`, slug: `recipe-${i}` })),
    ...overrides,
  }) } });
  fireEvent.click(screen.getByRole('button', { name: '預覽' }));
}

it('rejects an oversized batch before offering confirmation or making a request, and allows correction', () => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  render(<ImportModal onClose={vi.fn()} onSuccess={vi.fn()} />);
  fillPreview(MAX_RECIPES + 1);
  expect(screen.queryByRole('button', { name: '確認匯入' })).toBeNull();
  expect(screen.getByText(new RegExp(`maximum ${MAX_RECIPES}`))).toBeTruthy();
  expect(fetch).not.toHaveBeenCalled();
  fillPreview(1);
  expect(screen.getByText('發現 1 個食譜，確認匯入？')).toBeTruthy();
  expect(fetch).not.toHaveBeenCalled();
});

it('accepts and submits the server maximum without silently splitting or dropping recipes', async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: 1, failed: 0, results: [] }) });
  vi.stubGlobal('fetch', fetch);
  const onSuccess = vi.fn();
  render(<ImportModal onClose={vi.fn()} onSuccess={onSuccess} />);
  fillPreview(MAX_RECIPES);
  expect(screen.getByText(`發現 ${MAX_RECIPES} 個食譜，確認匯入？`)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '確認匯入' }));
  await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  expect(fetch).toHaveBeenCalledTimes(1);
  const [url, request] = fetch.mock.calls[0];
  expect(url).toBe('/api/admin/recipes/import');
  const payload = JSON.parse(request.body);
  expect(payload.version).toBe(EXPORT_VERSION);
  expect(payload.recipes).toHaveLength(MAX_RECIPES);
  expect(payload.recipes.at(-1).slug).toBe(`recipe-${MAX_RECIPES - 1}`);
});

it.each([{ version: EXPORT_VERSION + 1 }, { format: 'unknown' }, { recipes: [] }])('rejects invalid envelopes at preview: %j', overrides => {
  render(<ImportModal onClose={vi.fn()} onSuccess={vi.fn()} />);
  fillPreview(1, overrides);
  expect(screen.queryByRole('button', { name: '確認匯入' })).toBeNull();
  expect(screen.getByRole('textbox')).toBeTruthy();
});
