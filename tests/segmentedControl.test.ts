// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import SegmentedControl from '@/components/ui/SegmentedControl';

afterEach(cleanup);

const OPTIONS = [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
  { value: 'c', label: 'Option C' },
];

describe('SegmentedControl: generic single-choice presentation primitive', () => {
  it('exposes native radio semantics grouped under an accessible legend', () => {
    render(createElement(SegmentedControl, {
      name: 'test-group', legend: 'Pick one', options: OPTIONS, value: 'a', onChange: vi.fn(),
    }));
    const group = screen.getByRole('group', { name: 'Pick one' });
    const radios = within(group).getAllByRole('radio');
    expect(radios).toHaveLength(3);
    radios.forEach(radio => expect((radio as HTMLInputElement).type).toBe('radio'));
  });

  it('checks exactly one radio, matching the current value', () => {
    render(createElement(SegmentedControl, {
      name: 'test-group', legend: 'Pick one', options: OPTIONS, value: 'b', onChange: vi.fn(),
    }));
    const radios = screen.getAllByRole('radio') as HTMLInputElement[];
    const checked = radios.filter(r => r.checked);
    expect(checked).toHaveLength(1);
    expect(checked[0].value).toBe('b');
  });

  it('calls onChange with the newly picked value; the control stays controlled (does not flip itself)', () => {
    const onChange = vi.fn();
    const { rerender } = render(createElement(SegmentedControl, {
      name: 'test-group', legend: 'Pick one', options: OPTIONS, value: 'a', onChange,
    }));
    fireEvent.click(screen.getByRole('radio', { name: 'Option C' }));
    expect(onChange).toHaveBeenCalledWith('c');
    // Uncontrolled DOM click alone doesn't move `checked` until the parent
    // actually re-renders with the new value - exactly like every other
    // controlled input in this codebase (see FilterFooter's rerender test).
    expect((screen.getByRole('radio', { name: 'Option A' }) as HTMLInputElement).checked).toBe(true);

    rerender(createElement(SegmentedControl, {
      name: 'test-group', legend: 'Pick one', options: OPTIONS, value: 'c', onChange,
    }));
    expect((screen.getByRole('radio', { name: 'Option C' }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('radio', { name: 'Option A' }) as HTMLInputElement).checked).toBe(false);
  });

  it('all radios in the group share the same name, so the browser enforces single-selection natively', () => {
    render(createElement(SegmentedControl, {
      name: 'shared-name', legend: 'Pick one', options: OPTIONS, value: 'a', onChange: vi.fn(),
    }));
    const radios = screen.getAllByRole('radio') as HTMLInputElement[];
    expect(new Set(radios.map(r => r.name))).toEqual(new Set(['shared-name']));
  });

  it('disables every radio when disabled is set', () => {
    render(createElement(SegmentedControl, {
      name: 'test-group', legend: 'Pick one', options: OPTIONS, value: 'a', onChange: vi.fn(), disabled: true,
    }));
    screen.getAllByRole('radio').forEach(radio => {
      expect((radio as HTMLInputElement).disabled).toBe(true);
    });
  });
});
