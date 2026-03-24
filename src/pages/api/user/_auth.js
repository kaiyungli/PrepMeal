// Unified API helper for /api/user/* endpoints
// Provides consistent auth, response patterns, and error handling

import supabase from '@/lib/supabase';

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
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.error('[Auth] getUser error:', error);
      return null;
    }
    
    return user.id;
  } catch (err) {
    console.error('[Auth] Token verification error:', err);
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
  
  if (!userId) {
    res.status(401).json(ApiResponse.unauthorized());
    return null;
  }
  
  return userId;
}
