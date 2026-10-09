import React from 'react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen, cleanup } from '@testing-library/react';
import ImportModal from '@/components/admin/ImportModal';
import { buildImportMetadata } from '@/lib/adminRecipeImportMetadata';

afterEach(cleanup);
const mount = () => render(<ImportModal onClose={vi.fn()} onSuccess={vi.fn()} />);
describe('admin import preview versions', () => {
  it.each([1, 2])('accepts envelope version %s in the UI', (version) => {
    mount();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: JSON.stringify({ format: 'prepmeal.recipe-export', version, recipes: [{ name: 'Test' }] }) } });
    fireEvent.click(screen.getByText('預覽'));
    expect(screen.queryByText('發現 1 個食譜，確認匯入？')).not.toBeNull();
  });
  it('offers a v2 sample with all mandatory metadata fields', () => {
    mount();
    const recipe = JSON.parse((screen.getByRole('textbox') as HTMLTextAreaElement).placeholder);
    expect(recipe.version).toBe(2);
    expect(buildImportMetadata(recipe.recipes[0], 2).error).toBeUndefined();
  });
  it('rejects unsupported versions before an import can be submitted', () => {
    mount();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: JSON.stringify({ format: 'prepmeal.recipe-export', version: 99, recipes: [{}] }) } });
    fireEvent.click(screen.getByText('預覽'));
    expect(screen.queryByText(/Unsupported import version/)).not.toBeNull();
    expect(screen.queryByText('確認匯入')).toBeNull();
  });
});
