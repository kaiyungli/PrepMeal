// ============================================
// GENERATE TIME MAPPING
// Converts unified speed filters to legacy API maxTime param
// ============================================

/**
 * Map unified speed filters to API maxTime parameter
 * 
 * This is a temporary compatibility layer between:
 * - Unified filter system (filters.speed: ['quick', 'normal'])
 * - Legacy API (maxTime: '15', '30', '60')
 * 
 * Mapping:
 * - 'quick' -> '15' (15 minutes)
 * - 'normal' -> '60' (60 minutes)
 * - unknown -> null
 */
export function getMaxTimeFromSpeedFilters(speedFilters: string[]): string | null {
  if (!speedFilters || speedFilters.length === 0) {
    return null;
  }
  
  // If any filter is 'quick', use 15 min (most restrictive)
  if (speedFilters.includes('quick')) {
    return '15';
  }
  
  // If only 'normal', use 60 min
  if (speedFilters.includes('normal')) {
    return '60';
  }
  
  return null;
}