// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import FilterGroupList from '@/components/filters/FilterGroupList';
import FilterFooter from '@/components/filters/FilterFooter';
import RecipeSortSelect from '@/components/filters/RecipeSortSelect';
import { RECIPE_FILTER_GROUPS, buildFilterSections } from '@/constants/filterGroups';

afterEach(cleanup);

function isHidden(el: HTMLElement) {
  return el.closest('[aria-hidden="true"]') !== null;
}

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

describe('FilterGroupList: Soft Tile visual - accessible name and semantics survive the leading check icon', () => {
  it('keeps aria-pressed semantics unchanged', () => {
    render(createElement(FilterGroupList, {
      sections: [{
        id: 'cuisine', title: '菜系',
        options: [{ value: 'chinese', label: '中式' }],
        selected: [], onToggle: vi.fn(),
      }],
    }));
    const button = screen.getByRole('button', { name: '中式' });
    expect(button.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(button);
  });

  it('renders a decorative, aria-hidden check icon only when selected, and the accessible name stays exactly the option label', () => {
    render(createElement(FilterGroupList, {
      sections: [{
        id: 'cuisine', title: '菜系',
        options: [{ value: 'chinese', label: '中式' }],
        selected: ['chinese'], onToggle: vi.fn(),
      }],
    }));
    // Exact-name match (not a substring/regex) - this fails if the check
    // icon ever leaks visible text into the accessible name.
    const button = screen.getByRole('button', { name: '中式' });
    expect(button.getAttribute('aria-pressed')).toBe('true');
    const icon = button.querySelector('svg');
    expect(icon).not.toBeNull();
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders no check icon when unselected', () => {
    render(createElement(FilterGroupList, {
      sections: [{
        id: 'cuisine', title: '菜系',
        options: [{ value: 'chinese', label: '中式' }],
        selected: [], onToggle: vi.fn(),
      }],
    }));
    expect(screen.getByRole('button', { name: '中式' }).querySelector('svg')).toBeNull();
  });
});

describe('FilterGroupList: desktop label-left responsive classes (source-level only - not a substitute for visual QA)', () => {
  it('carries the md: label-left row classes and stacked mobile classes on each section', () => {
    render(createElement(FilterGroupList, {
      sections: [{
        id: 'cuisine', title: '菜系',
        options: [{ value: 'chinese', label: '中式' }],
        selected: [], onToggle: vi.fn(),
      }],
    }));
    const heading = screen.getByText('菜系');
    const row = heading.parentElement as HTMLElement;
    expect(row.className).toMatch(/\bmd:flex\b/);
    expect(heading.className).toMatch(/\bmd:w-24\b/);
    expect(heading.className).toMatch(/\bmb-2\b/); // mobile: label sits above options
  });
});

describe('FilterGroupList: presentation-only primary/secondary disclosure', () => {
  function sections(overrides: Partial<Record<string, 'primary' | 'secondary' | undefined>> = {}) {
    return [
      { id: 'a', title: 'A', options: [{ value: 'a1', label: 'A1' }], selected: [], onToggle: vi.fn(), tier: overrides.a ?? 'primary' as const },
      { id: 'b', title: 'B', options: [{ value: 'b1', label: 'B1' }], selected: [], onToggle: vi.fn(), tier: overrides.b ?? 'secondary' as const },
    ];
  }

  it('renders primary sections immediately and secondary sections behind a collapsed disclosure', () => {
    render(createElement(FilterGroupList, { sections: sections() }));
    expect(screen.getByText('A')).toBeTruthy();
    expect(isHidden(screen.getByText('B'))).toBe(true);
  });

  it('a section with no tier at all defaults to primary (back-compat)', () => {
    render(createElement(FilterGroupList, {
      sections: [{ id: 'c', title: 'C', options: [], selected: [], onToggle: vi.fn() }],
    }));
    expect(isHidden(screen.getByText('C'))).toBe(false);
  });

  it('exposes secondary sections when "更多篩選" is opened, and hides them again on toggle', () => {
    render(createElement(FilterGroupList, { sections: sections() }));
    const toggle = screen.getByRole('button', { name: '＋ 更多篩選' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: '▲ 收起' }).getAttribute('aria-expanded')).toBe('true');
    expect(isHidden(screen.getByText('B'))).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: '▲ 收起' }));
    expect(isHidden(screen.getByText('B'))).toBe(true);
  });

  it('aria-controls on the disclosure button points at the actual secondary content element', () => {
    render(createElement(FilterGroupList, { sections: sections() }));
    const toggle = screen.getByRole('button', { name: '＋ 更多篩選' });
    const controlsId = toggle.getAttribute('aria-controls');
    expect(controlsId).toBeTruthy();
    const region = document.getElementById(controlsId as string);
    expect(region).not.toBeNull();
    expect(within(region as HTMLElement).getByText('B')).toBeTruthy();
  });

  it('omits the disclosure entirely when there are no secondary sections', () => {
    render(createElement(FilterGroupList, {
      sections: [{ id: 'a', title: 'A', options: [], selected: [], onToggle: vi.fn(), tier: 'primary' }],
    }));
    expect(screen.queryByRole('button', { name: /更多篩選/ })).toBeNull();
  });

  it('opening/closing the disclosure does not call onToggle or otherwise touch selection', () => {
    const onToggleB = vi.fn();
    render(createElement(FilterGroupList, {
      sections: [
        { id: 'a', title: 'A', options: [{ value: 'a1', label: 'A1' }], selected: [], onToggle: vi.fn(), tier: 'primary' },
        { id: 'b', title: 'B', options: [{ value: 'b1', label: 'B1' }], selected: ['b1'], onToggle: onToggleB, tier: 'secondary' },
      ],
    }));
    fireEvent.click(screen.getByRole('button', { name: '＋ 更多篩選' }));
    fireEvent.click(screen.getByRole('button', { name: '▲ 收起' }));
    expect(onToggleB).not.toHaveBeenCalled();
    // The still-collapsed secondary option keeps its selected state (a
    // filter that is applied but currently hidden must stay applied).
    fireEvent.click(screen.getByRole('button', { name: '＋ 更多篩選' }));
    expect(screen.getByRole('button', { name: 'B1' }).getAttribute('aria-pressed')).toBe('true');
  });
});

describe('FilterGroupList: canonical RECIPE_FILTER_GROUPS rendered order and full protein visibility', () => {
  it('renders primary groups in cuisine → protein → speed order, matching the approved hierarchy', () => {
    const builtSections = buildFilterSections(RECIPE_FILTER_GROUPS, {}, vi.fn());
    render(createElement(FilterGroupList, { sections: builtSections }));
    const headings = screen.getAllByText(/^(菜系|主要蛋白|所需時間)$/).map(el => el.textContent);
    expect(headings).toEqual(['菜系', '主要蛋白', '所需時間']);
  });

  it('renders secondary groups in dish_type → method → difficulty → diet → flavor order once opened', () => {
    const builtSections = buildFilterSections(RECIPE_FILTER_GROUPS, {}, vi.fn());
    render(createElement(FilterGroupList, { sections: builtSections }));
    fireEvent.click(screen.getByRole('button', { name: '＋ 更多篩選' }));
    const headings = screen.getAllByText(/^(類型|烹調方式|難度|飲食需求|口味（任選）)$/).map(el => el.textContent);
    expect(headings).toEqual(['類型', '烹調方式', '難度', '飲食需求', '口味（任選）']);
  });

  it('keeps all 10 protein options directly available with no truncation/"show more" control', () => {
    const builtSections = buildFilterSections(RECIPE_FILTER_GROUPS, {}, vi.fn());
    render(createElement(FilterGroupList, { sections: builtSections }));
    const proteinSection = RECIPE_FILTER_GROUPS.find(g => g.key === 'protein')!;
    expect(proteinSection.options.length).toBe(10);
    proteinSection.options.forEach(opt => {
      expect(screen.getByRole('button', { name: opt.label })).toBeTruthy();
    });
    expect(screen.queryByText(/^\+\d+/)).toBeNull();
    expect(screen.queryByRole('button', { name: /顯示全部/ })).toBeNull();
  });
});
