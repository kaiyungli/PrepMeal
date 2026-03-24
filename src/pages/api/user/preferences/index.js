// User Preferences API - GET, PUT
// Unified contract using _auth helper

import supabase from '@/lib/supabase';
import { requireAuth, ApiResponse } from '../_auth';

export default async function handler(req, res) {
  // Require auth for all methods
  const userId = await requireAuth(req, res);
  if (!userId) return;
  
  console.log('[Preferences] UserId:', userId);

  if (req.method === 'GET') {
    console.log('[Preferences] GET - querying user_preferences');
    
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('[Preferences] GET error:', error);
      return res.status(500).json(ApiResponse.error(error.message));
    }
    
    // Return defaults if no preferences exist
    const preferences = data || {
      user_id: userId,
      default_servings: 2,
      default_days: 7,
      notifications_enabled: true,
      theme: 'light'
    };
    
    console.log('[Preferences] GET data:', preferences ? 'found' : 'defaults');
    return res.status(200).json(ApiResponse.success({ preferences }));
  }

  if (req.method === 'PUT' || req.method === 'POST') {
    const updates = req.body;
    
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json(ApiResponse.badRequest('Request body required'));
    }

    console.log('[Preferences] PUT - updating preferences');
    
    // Build update payload (only allow specific fields)
    const allowedFields = [
      'default_servings',
      'default_days', 
      'notifications_enabled',
      'theme',
      'diet_preference',
      'allergies'
    ];
    
    const updatePayload = { user_id: userId };
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updatePayload[field] = updates[field];
      }
    }

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
