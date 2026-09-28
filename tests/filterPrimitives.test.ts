// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import FilterGroupList from '@/components/filters/FilterGroupList';
import FilterFooter from '@/components/filters/FilterFooter';
import RecipeSortSelect from '@/components/filters/RecipeSortSelect';

afterEach(cleanup);

describe('FilterGroupList: selection state, aria-pressed, toggle callback', () => {
  it('reflects each option\'s selected state via aria-pressed', () => {
    render(createElement(FilterGroupList, {
      sections: [
        {
          id: 'cuisine',
          title: '菜系',
          options: [{ value: 'chinese', label: '中式' }, { value: 'italian', label: '意式' }],
          selected: ['chinese'],
          onToggle: vi.fn(),
        },
      ],
    }));
    expect(screen.getByRole('button', { name: '中式' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: '意式' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('calls onToggle with the clicked option\'s value, scoped to its own section', () => {
    const onToggleCuisine = vi.fn();
    const onToggleSpeed = vi.fn();
    render(createElement(FilterGroupList, {
      sections: [
        {
          id: 'cuisine',
          title: '菜系',
          options: [{ value: 'chinese', label: '中式' }],
          selected: [],
          onToggle: onToggleCuisine,
        },
        {
          id: 'speed',
          title: '速度',
          options: [{ value: 'quick', label: '快手' }],
          selected: [],
          onToggle: onToggleSpeed,
        },
      ],
    }));
    fireEvent.click(screen.getByRole('button', { name: '快手' }));
    expect(onToggleSpeed).toHaveBeenCalledWith('quick');
    expect(onToggleCuisine).not.toHaveBeenCalled();
  });

  it('renders every section title as a group heading', () => {
    render(createElement(FilterGroupList, {
      sections: [
        { id: 'cuisine', title: '菜系', options: [], selected: [], onToggle: vi.fn() },
        { id: 'speed', title: '速度', options: [], selected: [], onToggle: vi.fn() },
      ],
    }));
    expect(screen.getByText('菜系')).toBeTruthy();
    expect(screen.getByText('速度')).toBeTruthy();
  });
});

describe('FilterFooter: instant/no-apply configuration', () => {
  it('renders only the clear link when onClear is provided and onApply is not', () => {
    const onClear = vi.fn();
    render(createElement(FilterFooter, { onClear }));
    const clearBtn = screen.getByRole('button', { name: '清除全部' });
    expect(clearBtn).toBeTruthy();
    expect(screen.queryByRole('button', { name: '確認篩選' })).toBeNull();
    fireEvent.click(clearBtn);
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when neither onClear nor onApply is provided', () => {
    const { container } = render(createElement(FilterFooter, {}));
    expect(container.querySelector('button')).toBeNull();
  });

  it('respects a custom clearLabel', () => {
    render(createElement(FilterFooter, { onClear: vi.fn(), clearLabel: '重設所有設定' }));
    expect(screen.getByRole('button', { name: '重設所有設定' })).toBeTruthy();
  });
});

describe('FilterFooter: confirm configuration, pending/disabled state, leading slot', () => {
  it('disables the confirm button while there are no pending changes, and enables it when there are', () => {
    const onApply = vi.fn();
    const { rerender } = render(createElement(FilterFooter, { onApply, hasPendingChanges: false }));
    const confirm = screen.getByRole('button', { name: '確認篩選' });
    expect(confirm.hasAttribute('disabled')).toBe(true);
    expect(screen.getByText('目前顯示已確認的結果')).toBeTruthy();

    rerender(createElement(FilterFooter, { onApply, hasPendingChanges: true }));
    expect(screen.getByRole('button', { name: '確認篩選' }).hasAttribute('disabled')).toBe(false);
    expect(screen.getByText('有未套用的選項')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '確認篩選' }));
    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it('renders an optional leading action beside the status text', () => {
    render(createElement(FilterFooter, {
      onApply: vi.fn(),
      hasPendingChanges: true,
      leadingActions: createElement('button', { type: 'button' }, '清空選擇'),
    }));
    expect(screen.getByRole('button', { name: '清空選擇' })).toBeTruthy();
  });

  it('omits the leading slot entirely when none is given', () => {
    render(createElement(FilterFooter, { onApply: vi.fn(), hasPendingChanges: false }));
    expect(screen.queryByRole('button', { name: '清空選擇' })).toBeNull();
  });

  it('can render both the standalone clear block and the confirm row together', () => {
    render(createElement(FilterFooter, { onClear: vi.fn(), onApply: vi.fn(), hasPendingChanges: false }));
    expect(screen.getByRole('button', { name: '清除全部' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '確認篩選' })).toBeTruthy();
  });
});

describe('RecipeSortSelect: value/change behavior and accessible label', () => {
  it('is discoverable by its fixed accessible label and reflects the current value', () => {
    render(createElement(RecipeSortSelect, { id: 'sort-a', value: 'newest', onChange: vi.fn() }));
    const select = screen.getByRole('combobox', { name: '排序方式' });
    expect((select as HTMLSelectElement).value).toBe('newest');
  });

  it('calls onChange with the newly selected value', () => {
    const onChange = vi.fn();
    render(createElement(RecipeSortSelect, { id: 'sort-b', value: 'newest', onChange }));
    fireEvent.change(screen.getByRole('combobox', { name: '排序方式' }), { target: { value: 'popular' } });
    expect(onChange).toHaveBeenCalledWith('popular');
  });

  it('exposes the same 6 sort options everywhere it is used', () => {
    render(createElement(RecipeSortSelect, { id: 'sort-c', value: 'newest', onChange: vi.fn() }));
    const select = screen.getByRole('combobox', { name: '排序方式' });
    const values = within(select).getAllByRole('option').map(o => (o as HTMLOptionElement).value);
    expect(values).toEqual(['newest', 'oldest', 'popular', 'time_short', 'calories_low', 'protein_high']);
  });

  it('links the visible label to the select via id/htmlFor, using the given id', () => {
    render(createElement(RecipeSortSelect, { id: 'sort-d', value: 'newest', onChange: vi.fn(), label: '排序' }));
    const label = screen.getByText('排序');
    expect(label.getAttribute('for')).toBe('sort-d');
    expect(screen.getByRole('combobox', { name: '排序方式' }).id).toBe('sort-d');
  });

  it('applies caller-supplied classNames for wrapper/label/select (per-call-site density, not page branching)', () => {
    render(createElement(RecipeSortSelect, {
      id: 'sort-e',
      value: 'newest',
      onChange: vi.fn(),
      wrapperClassName: 'custom-wrapper',
      labelClassName: 'custom-label',
      selectClassName: 'custom-select',
    }));
    expect(screen.getByText('排序').className).toBe('custom-label');
    expect(screen.getByRole('combobox', { name: '排序方式' }).className).toBe('custom-select');
  });
});
