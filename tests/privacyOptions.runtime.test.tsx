import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import PrivacyOptionsButton from '../src/components/ads/PrivacyOptionsButton';

afterEach(() => { cleanup(); Reflect.deleteProperty(window, 'googlefc'); });
function install(api: unknown) { Object.defineProperty(window, 'googlefc', { configurable: true, value: api }); }
describe('privacy choice entry', () => {
  it('explains unavailable service without loading scripts or claiming consent changed', () => {
    render(<PrivacyOptionsButton />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('status').textContent).toContain('這不代表你已同意或撤回');
    expect(document.querySelector('script')).toBeNull();
    expect(Reflect.has(window, 'googlefc')).toBe(false);
  });
  it('does not enqueue a stale action into a not-yet-loaded stub', () => {
    const push = vi.fn(); install({ callbackQueue: { push } });
    render(<PrivacyOptionsButton />); fireEvent.click(screen.getByRole('button'));
    expect(push).not.toHaveBeenCalled();
  });
  it('invokes revocation only through the Google callback queue', () => {
    const showRevocationMessage = vi.fn(); const queue: (() => void)[] = [];
    install({ callbackQueue: queue, showRevocationMessage });
    render(<PrivacyOptionsButton />); fireEvent.click(screen.getByRole('button'));
    expect(showRevocationMessage).not.toHaveBeenCalled();
    queue[0](); expect(showRevocationMessage).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status').textContent).toContain('請在顯示的視窗內完成選擇');
  });
  it('reports queue failure without claiming a completed choice', () => {
    install({ callbackQueue: { push: () => { throw new Error('blocked'); } }, showRevocationMessage: vi.fn() });
    render(<PrivacyOptionsButton />); fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('status').textContent).toContain('尚未確認更改');
  });
  it('handles a delayed Google callback failure', () => {
    const queue: (() => void)[] = [];
    install({ callbackQueue: queue, showRevocationMessage: () => { throw new Error('unavailable'); } });
    render(<PrivacyOptionsButton />); fireEvent.click(screen.getByRole('button'));
    act(() => queue[0]());
    expect(screen.getByRole('status').textContent).toContain('尚未確認更改');
  });

});
