import type { NextApiRequest, NextApiResponse } from 'next';
import { handleShoppingList } from './shopping-list';

// Read-only calculation from public recipe data; never reads account preferences.
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  return handleShoppingList(req, res, true);
}
