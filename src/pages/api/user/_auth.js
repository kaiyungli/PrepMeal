// Unified API helper for /api/user/* endpoints
// Provides consistent auth, response patterns, and error handling

import { createClient } from '@supabase/supabase-js';

/**
 * Create a dedicated server-side client for auth verification
 * Uses token in Authorization header, not as getUser() argument
 */
function createAuthClient(token) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });
}

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
  
  console.log('[Auth] Token exists:', !!token, 'Token length:', token?.length);
  
  if (!token) {
    return null;
  }
  
  try {
    const authClient = createAuthClient(token);
    
    if (!authClient) {
      return null;
    }
    
    const { data: { user }, error } = await authClient.auth.getUser();
    
    console.log('[Auth] getUser error:', error);
    console.log('[Auth] getUser success, user id:', user?.id);
    
    if (error || !user) {
      return null;
    }
    
    return user.id;
  } catch (err) {
    console.error('[Auth] Token verification exception:', err);
    return null;
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
  
  console.log('[Auth] requireAuth resolved userId:', userId);
  
  if (!userId) {
    res.status(401).json(ApiResponse.unauthorized());
    return null;
  }
  
  return userId;
}