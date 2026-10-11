import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import MyPlansPage from '@/pages/my-plans';
import { StrictMode } from 'react';

// Runtime render tests for concurrent deletes on the real My Plans page
// (src/pages/my-plans.js + PlanCard + Toast), run via
// vitest.components.config.ts; see `npm run test:components`.
//
// Each DELETE handler used to remove its plan from the `plans` array captured
// by the render it started in. With two deletes in flight, the second to
// finish wrote back a list that still contained the first, so a plan already
// deleted on the server reappeared until reload. In-flight state was also a
// single id, so starting a second delete re-enabled the first plan's button
// and either completion cleared the other's loading state. Only auth, header
// and next/head are stubbed; fetch is controlled per request.

const { authGuard } = vi.hoisted(() => ({
  authGuard: {
    isAuthenticated: true,
    loading: false,
    user: { id: 'user-1' } as { id: string } | null,
    getAccessToken: async (): Promise<string | null> => 'token-1',
    requireAuth: () => true,
  },
}));
vi.mock('@/hooks/useAuthGuard', () => ({ useAuthGuard: () => authGuard }));
vi.mock('@/features/layout/hooks/useHeaderController', () => ({ useHeaderController: () => ({}) }));
vi.mock('@/components/layout/Header', () => ({ default: () => null }));
vi.mock('next/head', () => ({ default: () => null }));

const PLANS = ['A', 'B', 'C'].map((k) => ({
  id: `00000000-0000-4000-8000-00000000000${k.charCodeAt(0) - 64}`,
  name: `Plan ${k}`,
  week_start_date: '2026-10-05',
  days_count: 7,
  items: [],
}));
const idOf = (name: string) => PLANS.find((p) => p.name === name)!.id;

type Outcome = { status: number } | 'network-error';
type Pending = { settle: (outcome: Outcome) => Promise<void> };

let pendingDeletes: Map<string, Pending>;
let deleteCalls: string[];

function installFetch() {
  pendingDeletes = new Map();
  deleteCalls = [];
  vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
    if (url === '/api/user/menus' && !init?.method) {
      return Promise.resolve(new Response(JSON.stringify({ success: true, data: { plans: PLANS } }), { status: 200 }));
    }
    const match = /^\/api\/user\/menus\/([^/]+)$/.exec(url);
    if (match && init?.method === 'DELETE') {
      const id = match[1];
      deleteCalls.push(id);
      return new Promise<Response>((resolve, reject) => {
        pendingDeletes.set(id, {
          settle: async (outcome) => {
            await act(async () => {
              if (outcome === 'network-error') reject(new TypeError('Failed to fetch'));
              else resolve(new Response(outcome.status === 200 ? '{"success":true}' : '{"success":false}', { status: outcome.status }));
            });
          },
        });
      });
    }
    throw new Error(`unexpected fetch ${init?.method ?? 'GET'} ${url}`);
  }));
}

function card(name: string) {
  return screen.getByText(name).closest('.rounded-xl') as HTMLElement;
}

function deleteButton(name: string) {
  return within(card(name)).getByRole('button', { name: '刪除餐單' }) as HTMLButtonElement;
}

async function startDelete(name: string) {
  const callsBefore = deleteCalls.length;
  fireEvent.click(deleteButton(name));
  await waitFor(() => expect(deleteCalls.length).toBe(callsBefore + 1));
  expect(deleteCalls.at(-1)).toBe(idOf(name));
}

function settle(name: string, outcome: Outcome) {
  return pendingDeletes.get(idOf(name))!.settle(outcome);
}

// Disabled button showing the loading indicator.
function isPending(name: string) {
  const button = deleteButton(name);
  return button.disabled && button.textContent === '...';
}

function pendingState() {
  return Object.fromEntries(visiblePlans().map((name) => [name, isPending(name!)]));
}

function visiblePlans() {
  return screen.queryAllByRole('heading', { level: 3 }).map((h) => h.textContent);
}

function toastText() {
  return document.querySelector('.fixed.bottom-4')?.textContent ?? null;
}

async function renderWithPlans() {
  render(<MyPlansPage />);
  await screen.findByText('Plan C');
  expect(visiblePlans()).toEqual(['Plan A', 'Plan B', 'Plan C']);
}

beforeEach(() => {
  authGuard.user = { id: 'user-1' };
  authGuard.isAuthenticated = true;
  authGuard.loading = false;
  authGuard.getAccessToken = async () => 'token-1';
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.stubGlobal('confirm', vi.fn(() => true));
  installFetch();
});

describe('My Plans: account scope isolation', () => {
  it('StrictMode replay still loads once and permits a normal delete', async () => {
    render(<StrictMode><MyPlansPage /></StrictMode>);
    await screen.findByText('Plan C');
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    await startDelete('Plan A'); await settle('Plan A', { status: 200 });
    expect(visiblePlans()).toEqual(['Plan B', 'Plan C']);
    expect(toastText()).toBe('已刪除');
  });

  it.each(['logout', 'unmount'] as const)('a delayed DELETE token after %s never sends a request', async change => {
    const { rerender, unmount } = render(<MyPlansPage />);
    await screen.findByText('Plan C');
    let resolve!: (token: string) => void;
    authGuard.getAccessToken = () => new Promise<string>(yes => { resolve = yes; });
    rerender(<MyPlansPage />); fireEvent.click(deleteButton('Plan A'));
    if (change === 'unmount') unmount();
    else { authGuard.isAuthenticated = false; authGuard.user = null; rerender(<MyPlansPage />); }
    await act(async () => { resolve('obsolete-token'); });
    expect(deleteCalls).toEqual([]); expect(toastText()).toBeNull();
  });

  it('switching accounts immediately clears old cards and waits for the new list', async () => {
    const { rerender } = render(<MyPlansPage />);
    await screen.findByText('Plan C');
    let resolve!: (r: Response) => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(yes => { resolve = yes; })));
    authGuard.user = { id: 'user-2' };
    rerender(<MyPlansPage />);
    expect(visiblePlans()).toEqual([]);
    expect(screen.getByText('正在載入餐單...')).toBeTruthy();
    await act(async () => {});
    await act(async () => { resolve(new Response('{"success":true,"data":{"plans":[]}}', { status: 200 })); });
    await screen.findByText('你仲未生成任何餐單');
  });

  it.each(['success', 'failure', 'json'] as const)('ignores an old list %s after the next account has loaded', async outcome => {
    let resolve!: (r: Response) => void; let reject!: (e: Error) => void;
    let jsonResolve!: (v: unknown) => void;
    const oldResponse = new Promise<Response>((yes, no) => { resolve = yes; reject = no; });
    const json = new Promise(yes => { jsonResolve = yes; });
    const fetcher = vi.fn().mockReturnValueOnce(outcome === 'json'
      ? Promise.resolve({ ok: true, status: 200, json: () => json }) : oldResponse)
      .mockResolvedValueOnce(new Response('{"success":true,"data":{"plans":[]}}', { status: 200 }));
    vi.stubGlobal('fetch', fetcher);
    const { rerender } = render(<MyPlansPage />);
    await act(async () => {});
    authGuard.user = { id: 'user-2' }; rerender(<MyPlansPage />);
    await screen.findByText('你仲未生成任何餐單');
    await act(async () => {
      if (outcome === 'failure') reject(new Error('obsolete failure'));
      else if (outcome === 'json') jsonResolve({ success: true, data: { plans: PLANS } });
      else resolve(new Response(JSON.stringify({ success: true, data: { plans: PLANS } }), { status: 200 }));
    });
    expect(visiblePlans()).toEqual([]);
    expect(screen.queryByText('餐單載入失敗，請重試')).toBeNull();
    expect(screen.getByText('你仲未生成任何餐單')).toBeTruthy();
  });

  it('a same-account token callback refresh preserves the list without another fetch', async () => {
    const { rerender } = render(<MyPlansPage />);
    await screen.findByText('Plan C');
    const fetcher = vi.mocked(fetch);
    authGuard.getAccessToken = async () => 'refreshed-token';
    rerender(<MyPlansPage />);
    await act(async () => {});
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(visiblePlans()).toEqual(['Plan A', 'Plan B', 'Plan C']);
    await startDelete('Plan A');
    expect(fetcher.mock.calls[1][1]?.headers).toEqual({ Authorization: 'Bearer refreshed-token' });
  });

  it('switching accounts clears an already-visible deletion toast', async () => {
    const { rerender } = render(<MyPlansPage />);
    await screen.findByText('Plan C');
    await startDelete('Plan A'); await settle('Plan A', { status: 500 });
    expect(toastText()).toBe('刪除失敗');
    authGuard.user = { id: 'user-2' }; rerender(<MyPlansPage />);
    expect(toastText()).toBeNull();
    await screen.findByText('Plan C');
    expect(pendingState()).toEqual({ 'Plan A': false, 'Plan B': false, 'Plan C': false });
  });

  it('an obsolete delete cannot unlock a new request for the same plan id', async () => {
    const { rerender } = render(<MyPlansPage />);
    await screen.findByText('Plan C');
    await startDelete('Plan A'); const old = pendingDeletes.get(idOf('Plan A'))!;
    authGuard.user = { id: 'user-2' }; rerender(<MyPlansPage />);
    await screen.findByText('Plan C');
    await startDelete('Plan A');
    await old.settle({ status: 200 });
    expect(isPending('Plan A')).toBe(true);
    expect(toastText()).toBeNull();
    await settle('Plan A', { status: 200 });
    expect(visiblePlans()).toEqual(['Plan B', 'Plan C']);
    expect(toastText()).toBe('已刪除');
  });

  it.each(['missing', 'rejected'] as const)('a current DELETE %s token fails without a request and allows retry', async failure => {
    const { rerender } = render(<MyPlansPage />);
    await screen.findByText('Plan C');
    authGuard.getAccessToken = async () => { if (failure === 'rejected') throw new Error('token'); return null; };
    rerender(<MyPlansPage />);
    fireEvent.click(deleteButton('Plan A'));
    await waitFor(() => expect(toastText()).toBe('刪除失敗'));
    expect(deleteCalls).toEqual([]);
    expect(isPending('Plan A')).toBe(false);
    authGuard.getAccessToken = async () => 'token-1'; rerender(<MyPlansPage />);
    await startDelete('Plan A'); await settle('Plan A', { status: 200 });
    expect(visiblePlans()).toEqual(['Plan B', 'Plan C']);
  });

  it('unmount aborts an already-started DELETE and ignores its late failure', async () => {
    const { unmount } = render(<MyPlansPage />);
    await screen.findByText('Plan C');
    await startDelete('Plan A');
    const fetcher = vi.mocked(fetch);
    const signal = fetcher.mock.calls[1][1]?.signal;
    expect(signal?.aborted).toBe(false);
    unmount(); expect(signal?.aborted).toBe(true);
    await settle('Plan A', 'network-error');
    expect(toastText()).toBeNull();
  });

  it('logout and login to the same account reloads instead of resurrecting cached plans', async () => {
    const { rerender } = render(<MyPlansPage />);
    await screen.findByText('Plan C');
    authGuard.user = null; authGuard.isAuthenticated = false;
    rerender(<MyPlansPage />);
    expect(screen.queryByText('Plan A')).toBeNull();
    let resolve!: (r: Response) => void;
    const fetcher = vi.fn(() => new Promise<Response>(yes => { resolve = yes; }));
    vi.stubGlobal('fetch', fetcher);
    authGuard.user = { id: 'user-1' }; authGuard.isAuthenticated = true;
    rerender(<MyPlansPage />);
    expect(screen.queryByText('Plan A')).toBeNull();
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    await act(async () => { resolve(new Response('{"success":true,"data":{"plans":[]}}', { status: 200 })); });
    await screen.findByText('你仲未生成任何餐單');
  });

  it.each([200, 500] as const)('an old DELETE %s cannot mutate the new account or show a toast', async status => {
    const { rerender } = render(<MyPlansPage />);
    await screen.findByText('Plan C');
    await startDelete('Plan A');
    authGuard.user = { id: 'user-2' };
    rerender(<MyPlansPage />);
    await screen.findByText('Plan C');
    await settle('Plan A', { status });
    expect(visiblePlans()).toEqual(['Plan A', 'Plan B', 'Plan C']);
    expect(toastText()).toBeNull();
  });

  it('a delayed DELETE token after an account change never sends the obsolete request', async () => {
    const { rerender } = render(<MyPlansPage />);
    await screen.findByText('Plan C');
    let resolve!: (token: string) => void;
    authGuard.getAccessToken = () => new Promise<string>(yes => { resolve = yes; });
    rerender(<MyPlansPage />);
    fireEvent.click(deleteButton('Plan A'));
    authGuard.user = { id: 'user-2' };
    authGuard.getAccessToken = async () => 'token-2';
    rerender(<MyPlansPage />);
    await screen.findByText('Plan C');
    await act(async () => { resolve('obsolete-token'); });
    expect(deleteCalls).toEqual([]);
    expect(toastText()).toBeNull();
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('My Plans: load failures are not empty plans', () => {
  it.each(['missing', 'rejected'] as const)('%s token shows an error without an anonymous request', async failure => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    authGuard.getAccessToken = async () => {
      if (failure === 'rejected') throw new Error('private token details');
      return null;
    };
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    render(<MyPlansPage />);
    await screen.findByText('餐單載入失敗，請重試');
    expect(fetcher).not.toHaveBeenCalled();
    authGuard.getAccessToken = async () => 'token-1';
    fetcher.mockResolvedValue(new Response('{"success":true,"data":{"plans":[]}}', { status: 200 }));
    fireEvent.click(screen.getByRole('button', { name: '重試' }));
    await screen.findByText('你仲未生成任何餐單');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('unmount while waiting for a token never starts a request', async () => {
    let resolve!: (value: string) => void;
    authGuard.getAccessToken = () => new Promise<string>(yes => { resolve = yes; });
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    const { unmount } = render(<MyPlansPage />);
    unmount();
    await act(async () => { resolve('token-1'); });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each(['http', 'api', 'json', 'network', 'shape'] as const)('%s failure shows retry, then recovers', async failure => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: { plans: PLANS } }), { status: 200 }));
    if (failure === 'http') fetcher.mockReset().mockResolvedValueOnce(new Response('{"success":true,"data":{"plans":[]}}', { status: 500 }));
    if (failure === 'api') fetcher.mockReset().mockResolvedValueOnce(new Response('{"success":false,"error":"private backend details"}', { status: 200 }));
    if (failure === 'json') fetcher.mockReset().mockResolvedValueOnce(new Response('not json', { status: 200 }));
    if (failure === 'network') fetcher.mockReset().mockRejectedValueOnce(new Error('network'));
    if (failure === 'shape') fetcher.mockReset().mockResolvedValueOnce(new Response('{"success":true,"data":{"plans":{}}}', { status: 200 }));
    fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: { plans: PLANS } }), { status: 200 }));
    vi.stubGlobal('fetch', fetcher);
    render(<MyPlansPage />);
    await screen.findByText('餐單載入失敗，請重試');
    expect(screen.queryByText('你仲未生成任何餐單')).toBeNull();
    expect(screen.queryByText('private backend details')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '重試' }));
    await screen.findByText('Plan C');
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('餐單載入失敗，請重試')).toBeNull();
  });

  it('a successful empty result keeps the normal empty state', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"success":true,"data":{"plans":[]}}', { status: 200 })));
    render(<MyPlansPage />);
    await screen.findByText('你仲未生成任何餐單');
    expect(screen.queryByRole('button', { name: '重試' })).toBeNull();
  });
});

describe('My Plans: concurrent successful deletes', () => {
  it.each([
    ['A resolves, then B', ['Plan A', 'Plan B']],
    ['B resolves, then A', ['Plan B', 'Plan A']],
  ] as const)('%s → only C remains, neither deleted plan reappears', async (_label, order) => {
    await renderWithPlans();

    await startDelete('Plan A');
    await startDelete('Plan B');

    // Both requests in flight: nothing removed yet.
    expect(visiblePlans()).toEqual(['Plan A', 'Plan B', 'Plan C']);

    await settle(order[0], { status: 200 });
    expect(visiblePlans()).toEqual(['Plan A', 'Plan B', 'Plan C'].filter((p) => p !== order[0]));
    expect(toastText()).toBe('已刪除');

    await settle(order[1], { status: 200 });
    expect(visiblePlans()).toEqual(['Plan C']);
    expect(toastText()).toBe('已刪除');
    expect(pendingState()).toEqual({ 'Plan C': false });

    // Exactly one DELETE per plan; C was never touched.
    expect(deleteCalls).toEqual([idOf('Plan A'), idOf('Plan B')]);
  });
});

describe('My Plans: concurrent deletes with mixed outcomes', () => {
  it.each([
    ['A succeeds first, then B fails (500)', [['Plan A', { status: 200 }], ['Plan B', { status: 500 }]]],
    ['B fails first (500), then A succeeds', [['Plan B', { status: 500 }], ['Plan A', { status: 200 }]]],
    ['A succeeds first, then B fails (network)', [['Plan A', { status: 200 }], ['Plan B', 'network-error']]],
    ['B fails first (404), then A succeeds', [['Plan B', { status: 404 }], ['Plan A', { status: 200 }]]],
    ['A succeeds first, then B fails (401)', [['Plan A', { status: 200 }], ['Plan B', { status: 401 }]]],
  ] as const)('%s → A removed, B and C remain', async (_label, steps) => {
    await renderWithPlans();

    await startDelete('Plan A');
    await startDelete('Plan B');

    for (const [name, outcome] of steps) {
      await settle(name, outcome);
      expect(toastText()).toBe(name === 'Plan A' ? '已刪除' : '刪除失敗');
    }

    expect(visiblePlans()).toEqual(['Plan B', 'Plan C']);

    // The failed plan can be deleted again.
    expect(deleteButton('Plan B').disabled).toBe(false);
    await startDelete('Plan B');
    await settle('Plan B', { status: 200 });
    expect(visiblePlans()).toEqual(['Plan C']);
    expect(toastText()).toBe('已刪除');
  });
});

describe('My Plans: single delete (unchanged behaviour)', () => {
  it('keeps the plan visible and its button disabled while pending, removes it on success', async () => {
    await renderWithPlans();

    await startDelete('Plan B');
    expect(visiblePlans()).toEqual(['Plan A', 'Plan B', 'Plan C']);
    expect(deleteButton('Plan B').disabled).toBe(true);
    expect(deleteButton('Plan A').disabled).toBe(false);

    await settle('Plan B', { status: 200 });
    expect(visiblePlans()).toEqual(['Plan A', 'Plan C']);
    expect(toastText()).toBe('已刪除');
  });

  it.each([
    ['401', { status: 401 }],
    ['404', { status: 404 }],
    ['500', { status: 500 }],
    ['network failure', 'network-error'],
  ] as const)('%s keeps the plan, shows the failure toast and allows retry', async (_label, outcome) => {
    await renderWithPlans();

    await startDelete('Plan B');
    await settle('Plan B', outcome);

    expect(visiblePlans()).toEqual(['Plan A', 'Plan B', 'Plan C']);
    expect(toastText()).toBe('刪除失敗');
    expect(deleteButton('Plan B').disabled).toBe(false);

    await startDelete('Plan B');
    expect(deleteCalls).toEqual([idOf('Plan B'), idOf('Plan B')]);
  });

  it('does not send a DELETE when the confirm dialog is cancelled', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false));
    await renderWithPlans();

    fireEvent.click(deleteButton('Plan B'));
    await act(async () => {});

    expect(deleteCalls).toEqual([]);
    expect(visiblePlans()).toEqual(['Plan A', 'Plan B', 'Plan C']);
  });
});

describe('My Plans: per-plan in-flight delete state', () => {
  it('A. starting A marks only A pending', async () => {
    await renderWithPlans();

    await startDelete('Plan A');

    expect(pendingState()).toEqual({ 'Plan A': true, 'Plan B': false, 'Plan C': false });
  });

  it('B. starting B while A is pending keeps both pending', async () => {
    await renderWithPlans();

    await startDelete('Plan A');
    await startDelete('Plan B');

    expect(pendingState()).toEqual({ 'Plan A': true, 'Plan B': true, 'Plan C': false });
  });

  it('C/G. A succeeding removes A while B stays pending', async () => {
    await renderWithPlans();
    await startDelete('Plan A');
    await startDelete('Plan B');

    await settle('Plan A', { status: 200 });

    expect(pendingState()).toEqual({ 'Plan B': true, 'Plan C': false });
  });

  it('D. B succeeding while A is pending keeps A pending', async () => {
    await renderWithPlans();
    await startDelete('Plan A');
    await startDelete('Plan B');

    await settle('Plan B', { status: 200 });

    expect(pendingState()).toEqual({ 'Plan A': true, 'Plan C': false });
  });

  it.each([
    ['500', { status: 500 }],
    ['network failure', 'network-error'],
  ] as const)('F. A failing (%s) makes A retryable while B stays pending', async (_label, outcome) => {
    await renderWithPlans();
    await startDelete('Plan A');
    await startDelete('Plan B');

    await settle('Plan A', outcome);

    expect(pendingState()).toEqual({ 'Plan A': false, 'Plan B': true, 'Plan C': false });

    await startDelete('Plan A');
    expect(pendingState()).toEqual({ 'Plan A': true, 'Plan B': true, 'Plan C': false });
  });

  it('E. repeat clicks on A while A is pending send exactly one DELETE', async () => {
    await renderWithPlans();
    const confirmSpy = vi.mocked(confirm);

    // Both clicks are handled before React re-renders, so the second one sees
    // the same render as the first; only the in-flight guard stops it.
    act(() => {
      deleteButton('Plan A').click();
      deleteButton('Plan A').click();
    });
    await waitFor(() => expect(deleteCalls.length).toBe(1));

    // Further clicks once A renders as pending, including after B starts.
    fireEvent.click(deleteButton('Plan A'));
    await startDelete('Plan B');
    fireEvent.click(deleteButton('Plan A'));
    await act(async () => {});

    expect(deleteCalls).toEqual([idOf('Plan A'), idOf('Plan B')]);
    expect(confirmSpy).toHaveBeenCalledTimes(2);

    await settle('Plan A', { status: 200 });
    await settle('Plan B', { status: 200 });
    expect(visiblePlans()).toEqual(['Plan C']);
  });

  it.each([
    ['A then B', ['Plan A', 'Plan B']],
    ['B then A', ['Plan B', 'Plan A']],
  ] as const)('H. no plan is left pending once both fail (%s)', async (_label, order) => {
    await renderWithPlans();
    await startDelete('Plan A');
    await startDelete('Plan B');

    await settle(order[0], { status: 500 });
    await settle(order[1], { status: 500 });

    expect(pendingState()).toEqual({ 'Plan A': false, 'Plan B': false, 'Plan C': false });

    // Both can be deleted again, each with a single new request.
    await startDelete('Plan A');
    await startDelete('Plan B');
    expect(deleteCalls).toEqual([idOf('Plan A'), idOf('Plan B'), idOf('Plan A'), idOf('Plan B')]);
  });
});
