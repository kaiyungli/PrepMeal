// User Preferences API - GET, PUT
// Unified contract using _auth helper with lazy create

import supabase from '@/lib/supabase';
import { requireAuth, ApiResponse } from '../_auth';

// Default preferences for new users
const DEFAULT_PREFERENCES = {
  default_servings: 1,
  preferred_cuisines: [],
  preferred_proteins: [],
  excluded_ingredients: [],
  max_cook_time: null,
  difficulty_level: null
};

export default async function handler(req, res) {
  // Require auth for all methods
  const userId = await requireAuth(req, res);
  if (!userId) return;
  
  console.log('[Preferences] UserId:', userId);

  if (req.method === 'GET') {
    console.log('[Preferences] GET - querying user_preferences');
    
    // First try to get existing preferences
    const { data: existing, error: getError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (getError && getError.code !== 'PGRST116') {
      console.error('[Preferences] GET error:', getError);
      return res.status(500).json(ApiResponse.error(getError.message));
    }
    
    // If no row exists, lazy create with defaults
    if (!existing) {
      console.log('[Preferences] No row found - lazy creating with defaults');
      
      const createPayload = {
        user_id: userId,
        ...DEFAULT_PREFERENCES
      };
      
      const { data: created, error: createError } = await supabase
        .from('user_preferences')
        .insert(createPayload)
        .select()
        .single();
      
      if (createError) {
        console.error('[Preferences] Lazy create error:', createError);
        return res.status(500).json(ApiResponse.error(createError.message));
      }
      
      console.log('[Preferences] Lazy created preferences');
      return res.status(200).json(ApiResponse.success({ preferences: created }));
    }
    
    console.log('[Preferences] GET found existing row');
    return res.status(200).json(ApiResponse.success({ preferences: existing }));
  }

  if (req.method === 'PUT' || req.method === 'POST') {
    const updates = req.body;
    
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json(ApiResponse.badRequest('Request body required'));
    }

    console.log('[Preferences] PUT - updating preferences');
    
    // Allowed fields for update
    const allowedFields = [
      'default_servings',
      'preferred_cuisines',
      'preferred_proteins',
      'excluded_ingredients',
      'max_cook_time',
      'difficulty_level',
      'notifications_enabled',
      'theme',
      'diet_preference',
      'allergies'
    ];
    
    // Build update payload
    const updatePayload = { user_id: userId };
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updatePayload[field] = updates[field];
      }
    }

    // Upsert - creates if not exists, updates if exists
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert(updatePayload, { onConflict: 'user_id' })
      .select()
      .single();
    
    if (error) {
      console.error('[Preferences] PUT error:', error);
      return res.status(500).json(ApiResponse.error(error.message));
    }
    
    console.log('[Preferences] PUT success');
    return res.status(200).json(ApiResponse.success({ preferences: data }));
  }

  return res.status(405).json(ApiResponse.methodNotAllowed());
}
