// Unified API helper for /api/user/* endpoints
// Provides consistent auth, response patterns, and error handling

import { jwtVerify } from 'jose';

// Shared server-side auth client (module scope - created once per cold start)
import { createClient } from '@supabase/supabase-js';

const sharedAuthClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  }
);
/**
 * Extract user ID from Authorization Bearer token
 * Returns null if no valid token
 */
export async function getUserIdFromRequest(req) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  
  if (!token) {
    return null;
  }
  
  try {
    const _verifyStart = Date.now();
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    
    if (jwtSecret) {
      // Fast path: verify JWT locally with secret
      const encoder = new TextEncoder();
      const key = encoder.encode(jwtSecret);
      const { payload } = await jwtVerify(token, key, {
        algorithms: ['HS256'],
      });
      console.log('[auth-api] jwt_verify_done', { duration_ms: Date.now() - _verifyStart, has_user: !!payload.sub });
      return payload.sub || null;
    } else {
      // Fallback: use Supabase getUser (slower but reliable)
      const { data: { user }, error } = await sharedAuthClient.auth.getUser(token);
      console.log('[auth-api] getUser_done', { duration_ms: Date.now() - _verifyStart, has_user: !!user });
      if (error || !user) return null;
      return user.id;
    }
  } catch (err) {
    console.log('[auth-api] jwt_verify_failed_fallback', { reason: err?.name || 'unknown' });
    // JWT verification failed - try fallback
    try {
      const _fallbackStart = Date.now();
      const { data: { user }, error } = await sharedAuthClient.auth.getUser(token);
      console.log('[auth-api] getUser_done', { duration_ms: Date.now() - _fallbackStart, has_user: !!user });
      if (error || !user) return null;
      return user.id;
    } catch (fallbackErr) {
      return null;
    }
  }
}

/**
 * Standard API response helpers
 */
export const ApiResponse = {
  success: (data, status = 200) => {
    return { success: true, data };
  },
  
  created: (data) => {
    return { success: true, data };
  },
  
  error: (message, status = 500) => {
    return { success: false, error: message };
  },
  
  unauthorized: () => {
    return { success: false, error: 'Unauthorized - please log in' };
  },
  
  notFound: (message = 'Resource not found') => {
    return { success: false, error: message };
  },
  
  methodNotAllowed: () => {
    return { success: false, error: 'Method not allowed' };
  },
  
  badRequest: (message) => {
    return { success: false, error: message };
  }
};

/**
 * Require authentication - returns userId or sends 401 response
 */
export async function requireAuth(req, res) {
  const userId = await getUserIdFromRequest(req);
  
  if (!userId) {
    res.status(401).json(ApiResponse.unauthorized());
    return null;
  }
  
  return userId;
}