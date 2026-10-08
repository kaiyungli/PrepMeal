// Toast as used by the generate page for empty-slot and failed replace/add
// feedback. Runs under vitest.components.config.ts, which compiles Toast.js JSX.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, renderHook, screen } from '@testing-library/react';
import Toast, { useToast } from '../src/components/ui/Toast';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('Toast', () => {
  it('shows the message, replaces it with a newer one, and hides after the given duration', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(() => useToast());
    const firstShow = result.current.showToast;
    rerender();
    expect(result.current.showToast).toBe(firstShow);

    act(() => result.current.showToast('first', 'info', 6000));
    act(() => { vi.advanceTimersByTime(4000); });
    act(() => result.current.showToast('second', 'info', 6000));
    act(() => { vi.advanceTimersByTime(4000); });
    render(<Toast toast={result.current.toast} />);
    expect(screen.getByRole('status').textContent).toBe('second');

    act(() => { vi.advanceTimersByTime(2001); });
    expect(result.current.toast).toBeNull();
  });

  it('keeps the default 3 second duration for existing callers', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useToast());
    act(() => result.current.showToast('saved', 'success'));
    act(() => { vi.advanceTimersByTime(2999); });
    expect(result.current.toast).toEqual({ message: 'saved', type: 'success' });
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current.toast).toBeNull();
  });
});
