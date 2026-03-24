import React from 'react';
import Image from 'next/image'
import Link from 'next/link'
import { getLabel, CUISINE_MAP, DIFFICULTY_MAP, METHOD_MAP, PROTEIN_MAP, DISH_TYPE_MAP, DIET_MAP } from '@/constants/taxonomy'
import FavoriteButton from './FavoriteButton';

/**
 * RecipeCard - displays a single recipe card
 * 
 * DATA PROPS:
 *   recipe: Object              - recipe data (many optional fields)
 *   recipe.id                   - recipe ID
 *   recipe.name                 - recipe name
 *   recipe.image_url           - optional image
 *   recipe.cuisine             - cuisine type
 *   recipe.difficulty          - easy/medium/hard
 *   recipe.method              - cooking method
 *   recipe.total_time_minutes  - total time
 *   recipe.calories_per_serving - calories
 *   recipe.protein_g           - protein grams
 *   recipe.primary_protein     - main protein type
 *   recipe.dish_type          - main/side/soup/etc
 *   recipe.diet               - dietary tags array
 * 
 * OPTIONAL PROPS:
 *   onClick?: () => void       - click handler
 *   onFavorite?: () => void   - favorite button handler
 *   className?: string         - additional CSS classes
 */
interface RecipeCardProps {
  recipe: {
    id?: string | number;
    name?: string;
    image_url?: string | null;
    slug?: string;
    cuisine?: string;
    difficulty?: string;
    method?: string;
    total_time_minutes?: number | null;
    cook_time_minutes?: number | null;
    prep_time_minutes?: number | null;
    calories_per_serving?: number | null;
    protein_g?: number | null;
    primary_protein?: string;
    dish_type?: string;
    diet?: string[];
  };
  onClick?: () => void;
  onFavorite?: () => void;  // Legacy - still used for backward compatibility
  isFavorite?: boolean;
  toggleFavorite?: (recipeId: string | number) => Promise<boolean>;  // New FavoriteButton pattern
  isAuthenticated?: boolean;
  onAuthRequired?: () => void;
  className?: string;
}

export default React.memo(function RecipeCard({ 
  recipe, 
  onClick, 
  onFavorite, 
  isFavorite, 
  toggleFavorite,
  isAuthenticated,
  onAuthRequired,
  className = '' 
}: RecipeCardProps) {
  // Safely extract recipe fields
  const recipeId = recipe?.id
  const recipeName = recipe?.name || '無名食譜'
  const recipeImage = recipe?.image_url || null
  
  // Time: prefer total_time_minutes, then cook_time_minutes
  const recipeTime = recipe?.total_time_minutes || recipe?.cook_time_minutes || recipe?.prep_time_minutes || null
  
  const recipeDifficulty = recipe?.difficulty || ''
  const recipeMethod = recipe?.method || ''
  const recipeCalories = recipe?.calories_per_serving || null
  // protein_g is the numeric protein amount, primary_protein is the protein type (fish, beef, etc.)
  const recipeProteinGrams = recipe?.protein_g ?? null
  const recipePrimaryProtein = recipe?.primary_protein || ''
  const recipeDiet = Array.isArray(recipe?.diet) ? recipe.diet : []
  const recipeDishType = recipe?.dish_type || ''
  
  // Build tags: primary_protein (as category label) + dish_type
  const tags: string[] = []
  if (recipePrimaryProtein) {
    tags.push(getLabel(PROTEIN_MAP, recipePrimaryProtein))
  }
  if (recipeDishType) {
    tags.push(getLabel(DISH_TYPE_MAP, recipeDishType))
  }
  
  // Card content
  const cardContent = (
    <>
      {/* Image - Fixed aspect ratio with zoomed out presentation */}
      <div className="relative aspect-[5/4] overflow-hidden rounded-t-2xl bg-[#F8F3E8]">
        {/* Inner container with padding to show more of the dish */}
        <div className="absolute inset-0 p-3 flex items-center justify-center">
          {recipeImage ? (
            <Image 
              src={recipeImage} 
              alt={recipeName} 
              width={500}
              height={400}
              className="object-contain rounded-xl" 
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-gradient-to-br from-amber-50 to-orange-100 rounded-xl">
              <div className="flex flex-col items-center gap-2">
                <svg className="w-12 h-12 text-[#D4C4A8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.125-6 .37m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.17c0 .62-.504 1.124-1.125 1.124H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M12.265 3.11a.375.375 0 11-.53 0L12 2.845l.265.265zm-3 0a.375.375 0 11-.53 0L9 2.845l.265.265zm6 0a.375.375 0 11-.53 0L15 2.845l.265.265z" />
                </svg>
                <span className="text-xs text-[#C0A080] font-medium">暂无图片</span>
              </div>
            </div>
          )}
        </div>
        {(onFavorite || toggleFavorite) && (
          <FavoriteButton
            recipeId={recipe?.id}
            initialIsFavorite={isFavorite}
            toggleFavorite={toggleFavorite || (async () => { onFavorite?.(); return true; })}
            isAuthenticated={isAuthenticated}
            onAuthRequired={onAuthRequired}
          />
        )}
      </div>
      
      {/* Content */}
      <div className="p-4">
        {/* Title - max 2 lines */}
        <h3 className="font-semibold text-base text-[#3A2010] mb-2 line-clamp-2 leading-tight">
          {recipeName}
        </h3>
        
        {/* Metadata row: Time · Difficulty · Method */}
        <div className="flex items-center gap-2 text-xs text-[#7A746B] mb-3">
          {recipeTime && (
            <span className="flex items-center gap-1">
              <span>⏱️</span>
              <span>{recipeTime}分鐘</span>
            </span>
          )}
          {recipeTime && recipeDifficulty && <span>·</span>}
          {recipeDifficulty && getLabel(DIFFICULTY_MAP, recipeDifficulty) && (
            <span className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${
                recipeDifficulty === 'easy' ? 'bg-green-400' : 
                recipeDifficulty === 'medium' ? 'bg-yellow-400' : 'bg-red-400'
              }`}></span>
              <span>{getLabel(DIFFICULTY_MAP, recipeDifficulty)}</span>
            </span>
          )}
          {(recipeTime || recipeDifficulty) && recipeMethod && getLabel(METHOD_MAP, recipeMethod) && <span>·</span>}
          {recipeMethod && getLabel(METHOD_MAP, recipeMethod) && (
            <span className="flex items-center gap-1">
              <span>🥘</span>
              <span>{getLabel(METHOD_MAP, recipeMethod)}</span>
            </span>
          )}
        </div>
        
        {/* Tags row */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {tags.map((tag, i) => (
              <span key={i} className="text-xs px-2 py-0.5 bg-[#F8F3E8] text-[#9B6035] rounded-md font-medium">
                {tag}
              </span>
            ))}
          </div>
        )}
        
        {/* Nutrition row - optional, show 1-2 key info */}
        <div className="flex items-center gap-3 text-xs text-[#AA7A50]">
          {recipeCalories && (
            <span className="flex items-center gap-1">
              <span>🔥</span>
              <span>{recipeCalories}卡</span>
            </span>
          )}
          {recipeProteinGrams && (
            <span className="flex items-center gap-1">
              <span>💪</span>
              <span>{recipeProteinGrams}g蛋白</span>
            </span>
          )}
          {recipeDiet.length > 0 && !recipeProteinGrams && (
            <span className="flex items-center gap-1">
              <span>🥗</span>
              <span>{getLabel(DIET_MAP, recipeDiet[0]) || recipeDiet[0]}</span>
            </span>
          )}
        </div>
      </div>
    </>
  )

  // If we have an ID and NO onClick, wrap with Link for direct navigation
  // If onClick is provided, don't navigate - let parent handle (e.g., open modal first)
  if (recipeId && !onClick) {
    return (
      <Link 
        href={`/recipes/${recipeId}`}
        className={`block cursor-pointer bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 ${className}`}
      >
        {cardContent}
      </Link>
    )
  }

  // With onClick - just clickable div, no navigation (parent decides what to do)
  return (
    <div 
      onClick={onClick}
      className={`cursor-pointer bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 ${className}`}
    >
      {cardContent}
    </div>
  );
}

)
