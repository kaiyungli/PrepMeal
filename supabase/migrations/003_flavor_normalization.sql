-- ============================================
-- Flavor Normalization Migration
-- ============================================
-- Target: Normalize flavor values to only:
--   - salty, sweet, sour, spicy
--
-- Status: CHECKED - No recipes currently have flavor set
-- Date: 2026-03-23
-- ============================================

-- Current state (from API):
-- Total recipes: 43
-- Recipes with flavor: 0
-- Flavor values in DB: [] (empty)

-- ============================================
-- MAPPING: Old flavor values -> New flavor values
-- ============================================
-- The following mappings should be applied if old flavor data exists:

-- savory -> salty (most similar)
-- umami -> salty (umami is savory/salty taste)
-- tangy -> sour (tangy is sour)
-- garlicky -> salty (garlic flavor is savory)
-- creamy -> sweet (creamy often associated with sweet) OR remove
-- herby -> (no direct mapping - consider removing)
-- buttery -> sweet (buttery often associated with sweet)
-- sesame -> salty (sesame has savory notes)
-- peppery -> spicy (peppery is a type of spiciness)

-- ============================================
-- SQL UPDATE SCRIPT (run if needed)
-- ============================================

-- Example: Update single recipe's flavor array
-- UPDATE recipes 
-- SET flavor = '["salty"]'::jsonb 
-- WHERE id = 'recipe-uuid-here';

-- ============================================
-- REVIEW LIST: Recipes requiring manual review
-- ============================================
-- If any recipe has ambiguous flavor values not covered by mapping:
-- 1. Check the recipe description for flavor clues
-- 2. Default to most common/obvious flavor
-- 3. Add to review list for manual decision

-- Example review query:
-- SELECT id, name, description, flavor 
-- FROM recipes 
-- WHERE flavor IS NOT NULL 
--   AND flavor != '[]'::jsonb;
