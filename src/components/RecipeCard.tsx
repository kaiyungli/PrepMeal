import React from 'react';
import Image from 'next/image'
import { getLabel, CUISINE_MAP, DIFFICULTY_MAP, METHOD_MAP, PROTEIN_MAP, DISH_TYPE_MAP, DIET_MAP } from '@/constants/taxonomy'
import FavoriteButton from './FavoriteButton';
import { useRouter } from 'next/router';

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
  onFavorite?: (recipeId: string | number) => Promise<boolean>;
  isFavorite?: boolean;
  isAuthenticated?: boolean;
  className?: string;
}

/**
 * RecipeCard - clean structure with separated clickable areas
 * - Image section: NOT clickable (pointer-events-none)
 * - Content body: clickable
 * - FavoriteButton: separate absolute layer, NOT part of clickable area
 */
function RecipeCard({ 
  recipe, 
  onClick, 
  onFavorite, 
  isFavorite, 
  isAuthenticated,
  className = '' 
}: RecipeCardProps) {
  const router = useRouter();
  const recipeId = recipe?.id
  const recipeName = recipe?.name || '無名食譜'
  const recipeImage = recipe?.image_url || null
  const recipeSlug = recipe?.slug || recipeId
  const recipeTime = recipe?.total_time_minutes || recipe?.cook_time_minutes || recipe?.prep_time_minutes || null
  const recipeDifficulty = recipe?.difficulty || ''
  const recipeMethod = recipe?.method || ''
  const recipeCalories = recipe?.calories_per_serving || null
  const recipeProteinGrams = recipe?.protein_g ?? null
  const recipePrimaryProtein = recipe?.primary_protein || ''
  const recipeDiet = Array.isArray(recipe?.diet) ? recipe.diet : []
  const recipeDishType = recipe?.dish_type || ''
  
  const tags: string[] = []
  if (recipePrimaryProtein) {
    tags.push(getLabel(PROTEIN_MAP, recipePrimaryProtein))
  }
  if (recipeDishType) {
    tags.push(getLabel(DISH_TYPE_MAP, recipeDishType))
  }

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on the top-right heart area
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const cardRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clickX = e.clientX - cardRect.left;
    const clickY = e.clientY - cardRect.top;
    
    // If click is in top-right 60px zone (where heart is), ignore
    const cardWidth = cardRect.width;
    if (clickX >= cardWidth - 60 && clickY <= 60) {
      return;
    }
    
    if (onClick) {
      onClick();
    } else if (recipeSlug) {
      router.push(`/recipes/${recipeSlug}`);
    }
  };

  // Image section - NOT clickable
  const imageSection = (
    <div className="relative aspect-[5/4] overflow-hidden rounded-t-2xl bg-[#F8F3E8]">
      <div className="absolute inset-0 p-3 flex items-center justify-center pointer-events-none">
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
    </div>
  );

  // Content body - clickable
  const contentBody = (
    <div className="p-4">
      <h3 className="font-semibold text-base text-[#3A2010] mb-2 line-clamp-2 leading-tight">
        {recipeName}
      </h3>
      
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
      
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {tags.map((tag, i) => (
            <span key={i} className="text-xs px-2 py-0.5 bg-[#F8F3E8] text-[#9B6035] rounded-md font-medium">
              {tag}
            </span>
          ))}
        </div>
      )}
      
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
  )

  return (
    <div className={`relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 ${className}`}>
      
      {/* FavoriteButton - absolute, top-right, z-50 */}
      {onFavorite && (
        <div className="absolute top-3 right-3 z-50">
          <FavoriteButton
            recipeId={recipe?.id}
            isFavorite={isFavorite}
            onToggle={onFavorite}
          />
        </div>
      )}

      {/* Static heart for homepage */}
      {!onFavorite && (
        <div className="absolute top-3 right-3 z-50 rounded-full w-9 h-9 flex items-center justify-center shadow-lg backdrop-blur-sm border border-white/20 bg-white/80 text-rose-400 pointer-events-none">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.5 10.5 11.25 10.5 11.25S21 15.75 21 8.25z" />
          </svg>
        </div>
      )}

      {/* Image - NOT clickable (pointer-events-none) */}
      {imageSection}

      {/* Content body - clickable */}
      <div onClick={handleCardClick} className="cursor-pointer">
        {contentBody}
      </div>
    </div>
  );
}

export default React.memo(RecipeCard);