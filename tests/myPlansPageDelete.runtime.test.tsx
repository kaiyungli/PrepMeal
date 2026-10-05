import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import MyPlansPage from '@/pages/my-plans';

// Runtime render tests for concurrent deletes on the real My Plans page
// (src/pages/my-plans.js + PlanCard + Toast), run via
// vitest.components.config.ts; see `npm run test:components`.
//
// Each DELETE handler used to remove its plan from the `plans` array captured
// by the render it started in. With two deletes in flight, the second to
// finish wrote back a list that still contained the first, so a plan already
// deleted on the server reappeared until reload. Only auth, header and
// next/head are stubbed; fetch is controlled per request.

const { authGuard } = vi.hoisted(() => ({
  authGuard: {
    isAuthenticated: true,
    loading: false,
    user: { id: 'user-1' },
    getAccessToken: async () => 'token-1',
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
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.stubGlobal('confirm', vi.fn(() => true));
  installFetch();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
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
