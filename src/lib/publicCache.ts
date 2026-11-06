/**
 * Cache-Control for public, non-personal API responses.
 *
 * `s-maxage` lets Vercel's CDN keep the response at the edge (close to the
 * visitor, e.g. Hong Kong) so repeat requests skip the Sydney function and
 * the database. `stale-while-revalidate` serves the edge copy while a fresh
 * one is fetched in the background. Browsers do not cache it (no max-age).
 *
 * Only ever use this on responses that are identical for every visitor.
 */
import type { NextApiResponse } from 'next';

type HeaderTarget = Pick<NextApiResponse, 'setHeader'> | { setHeader?: (name: string, value: string) => unknown };

export function setPublicCache(res: HeaderTarget, seconds: number, staleSeconds: number) {
  res.setHeader?.('Cache-Control', `public, s-maxage=${seconds}, stale-while-revalidate=${staleSeconds}`);
}

// Recipe lists / Generate catalogue: recipes change rarely; pages using the
// same data already revalidate every 60-300 s.
export const RECIPE_LIST_CACHE = { seconds: 60, stale: 600 } as const;
// A single recipe's detail.
export const RECIPE_DETAIL_CACHE = { seconds: 300, stale: 86400 } as const;
