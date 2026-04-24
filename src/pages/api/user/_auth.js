// Unified API helper for /api/user/* endpoints
// Provides consistent auth, response patterns, and error handling

import { createRemoteJWKSet, jwtVerify } from 'jose';
import { createClient } from '@supabase/supabase-js';

// JWKS for access token verification (Supabase Auth keys)
const JWKS = createRemoteJWKSet(
  new URL(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
);

// Shared server-side auth client (for fallback only)
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
    // Debug: check JWT header
    try {
      const tokenParts = token.split('.');
      if (tokenParts.length >= 1) {
        const header = JSON.parse(Buffer.from(tokenParts[0], 'base64url').toString());
          alg: header.alg,
          kid: header.kid || null,
          typ: header.typ || null
        });
      }
    } catch (headerErr) {
      // Skip header parsing error
    }
    
    const _verifyStart = Date.now();
    
    // Primary: verify with JWKS (Supabase Auth access tokens)
    const { payload } = await jwtVerify(token, JWKS);
      duration_ms: Date.now() - _verifyStart,
      has_user: !!payload.sub
    });
    return payload.sub || null;
    
  } catch (jwksErr) {
      reason: jwksErr?.name || 'unknown',
      message: (jwksErr?.message || '').slice(0, 160)
    });
    
    // Fallback: use Supabase getUser (for legacy tokens or if JWKS unavailable)
    try {
      const _fallbackStart = Date.now();
      const { data: { user }, error } = await sharedAuthClient.auth.getUser(token);
        duration_ms: Date.now() - _fallbackStart,
        has_user: !!user
      });
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