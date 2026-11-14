import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getLabel, DIFFICULTY_MAP, METHOD_MAP, PROTEIN_MAP, DISH_TYPE_MAP, DIET_MAP } from '@/constants/taxonomy';
import FavoriteButton from './FavoriteButton';
import { nutritionValue } from '@/lib/utils';

interface RecipeCardProps {
  recipe: {
    id?: string | number;
    name?: string;
    image_url?: string | null;
    slug?: string;
    cuisine?: string;
    difficulty?: string | null;
    method?: string | null;
    total_time_minutes?: number | null;
    cook_time_minutes?: number | null;
    prep_time_minutes?: number | null;
    calories_per_serving?: number | null;
    protein_g?: number | null;
    primary_protein?: string | null;
    dish_type?: string | null;
    diet?: string[];
  };
  /** Homepage opts into the reference design with sibling navigation/favorite controls. */
  variant?: 'default' | 'home-featured';
  onClick?: () => void;
  isFavorite?: boolean;
  favoriteLoading?: boolean;
  onFavoriteClick?: () => void | Promise<void>;
  isAuthenticated?: boolean;
  className?: string;
  /**
   * Above-the-fold loading for the card image: 'high' for the likely LCP card,
   * 'eager' for the rest of the first row. Omitted cards stay lazy.
   */
  imageLoading?: 'high' | 'eager';
}

/**
 * RecipeCard - entire card is clickable, uses Link wrapper
 * 
 * Structure:
 * - Link covers the card content; FavoriteButton is an independent sibling
 * - Modified clicks preserve native link navigation
 * - onClick prop provides custom click behavior
 */
function RecipeCard({ 
  recipe,
  variant = 'default',
  onClick, 
  isFavorite, 
  favoriteLoading,
  onFavoriteClick, 
  className = '',
  imageLoading,
}: RecipeCardProps) {
  const featured = variant === 'home-featured';
  const label = (map: Record<string, string>, value?: string) =>
    getLabel(map, featured && value && !Object.hasOwn(map, value) ? undefined : value);
  const recipeId = recipe?.id;
  const recipeName = recipe?.name || '無名食譜';
  const recipeImage = recipe?.image_url || null;
  const recipeSlug = recipe?.slug || recipeId;
  const recipeTime = featured ? nutritionValue(recipe?.total_time_minutes) : recipe?.total_time_minutes || recipe?.cook_time_minutes || recipe?.prep_time_minutes || null;
  const recipeDifficulty = recipe?.difficulty || '';
  const recipeMethod = recipe?.method || '';
  const recipeCalories = featured ? nutritionValue(recipe?.calories_per_serving) : recipe?.calories_per_serving || null;
  const recipeProteinGrams = featured ? nutritionValue(recipe?.protein_g) : recipe?.protein_g ?? null;
  const recipePrimaryProtein = recipe?.primary_protein || '';
  const recipeDiet = Array.isArray(recipe?.diet) ? recipe.diet : [];
  const recipeDishType = recipe?.dish_type || '';
  
  const tags: string[] = [];
  if (recipePrimaryProtein) {
    tags.push(label(PROTEIN_MAP, recipePrimaryProtein));
  }
  if (recipeDishType) {
    tags.push(label(DISH_TYPE_MAP, recipeDishType));
  }

  const difficultyLabel = label(DIFFICULTY_MAP, recipeDifficulty);
  const methodLabel = label(METHOD_MAP, recipeMethod);
  const hasTime = featured ? recipeTime !== null : Boolean(recipeTime);
  const hasCalories = featured ? recipeCalories !== null : Boolean(recipeCalories);
  const hasProtein = featured ? recipeProteinGrams !== null : Boolean(recipeProteinGrams);
  const visibleTags = featured ? tags.filter(Boolean) : tags;

  // Build href - either from onClick prop or default routing
  const href = recipeSlug ? `/recipes/${encodeURIComponent(String(recipeSlug))}` : '#';
  const hasDetailPage = !!recipeSlug;

  const handleCardClick = () => {
    if (onClick) {
      onClick();
    }
  };

  // Plain activation opens the modal. Modified clicks retain native navigation.
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!onClick) return;
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    onClick();
  };

  // Static fallback for non-interactive cards.
  const staticHeart = (
    <div className="absolute top-3 right-3 z-50 rounded-full w-9 h-9 flex items-center justify-center shadow-lg backdrop-blur-sm border border-white/20 bg-white/80 text-rose-400 pointer-events-none">
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.5 10.5 11.25 10.5 11.25S21 15.75 21 8.25z" />
      </svg>
    </div>
  );

  // Image container
  const imageContainer = (
    <div className={`relative aspect-[5/4] overflow-hidden rounded-t-2xl bg-[#F8F3E8]${featured ? ' pm-featured-photo' : ''}`}>
      {/* Static fallback for non-interactive cards */}
      {!featured && !onFavoriteClick && staticHeart}

      {/* Image */}
      {recipeImage ? (
        <div className="absolute inset-0 p-3">
          <Image 
            src={recipeImage} 
            alt={recipeName} 
            width={500}
            height={400}
            className="object-contain rounded-xl" 
            loading={imageLoading ? 'eager' : undefined}
            fetchPriority={imageLoading === 'high' ? 'high' : undefined}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          />
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100">
          <div className="flex flex-col items-center gap-2">
            <svg className="w-12 h-12 text-[#D4C4A8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.125-6 .37m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.17c0 .62-.504 1.124-1.125 1.124H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M12.265 3.11a.375.375 0 11-.53 0L12 2.845l.265.265zm-3 0a.375.375 0 11-.53 0L9 2.845l.265.265zm6 0a.375.375 0 11-.53 0L15 2.845l.265.265z" />
            </svg>
            
          </div>
        </div>
      )}
    </div>
  );

  const contentBody = (
    <div className={`p-4${featured ? ' pm-featured-body' : ''}`}>
      <h3 id={featured ? `home-featured-title-${recipeId}` : undefined} className={featured ? "font-bold text-lg text-[#3A2010] mb-2 leading-relaxed break-words" : "font-semibold text-base text-[#3A2010] mb-2 line-clamp-2 leading-tight"}>
        {recipeName}
      </h3>
      
      <div className={featured ? "pm-featured-meta flex flex-wrap items-center gap-1 text-[13px] leading-relaxed text-[#7A746B] mb-3" : "flex items-center gap-2 text-xs text-[#7A746B] mb-3"}>
        {hasTime && (
          <span className="flex items-center gap-1">
            <span>⏱️</span>
            <span>{recipeTime}分鐘</span>
          </span>
        )}
        {hasTime && (featured ? difficultyLabel : recipeDifficulty) && <span aria-hidden={featured || undefined}>·</span>}
        {recipeDifficulty && label(DIFFICULTY_MAP, recipeDifficulty) && (
          <span className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${
              (featured ? difficultyLabel === '容易' : recipeDifficulty === 'easy') ? 'bg-green-400' :
              (featured ? difficultyLabel === '中等' : recipeDifficulty === 'medium') ? 'bg-yellow-400' : 'bg-red-400'
            }`}></span>
            <span>{label(DIFFICULTY_MAP, recipeDifficulty)}</span>
          </span>
        )}
        {(featured ? hasTime || difficultyLabel : recipeTime || recipeDifficulty) && recipeMethod && methodLabel && <span aria-hidden={featured || undefined}>·</span>}
        {recipeMethod && label(METHOD_MAP, recipeMethod) && (
          <span className="flex items-center gap-1">
            <span>🥘</span>
            <span>{label(METHOD_MAP, recipeMethod)}</span>
          </span>
        )}
      </div>
      
      {visibleTags.length > 0 && (
        <div className={`flex flex-wrap gap-1.5 mb-3${featured ? ' pm-featured-tags' : ''}`}>
          {visibleTags.map((tag, i) => (
            <span key={i} className="text-xs px-2 py-0.5 bg-[#F8F3E8] text-[#9B6035] rounded-md font-medium">
              {tag}
            </span>
          ))}
        </div>
      )}
      
      <div className={featured ? "pm-featured-nutrition flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-relaxed text-[#AA7A50]" : "flex flex-wrap items-center gap-3 text-xs text-[#AA7A50]"}>
        {hasCalories && (
          <span className="flex items-center gap-1">
            <span>🔥</span>
            <span>{recipeCalories} 卡路里／人</span>
          </span>
        )}
        {featured && hasCalories && hasProtein && <span aria-hidden="true">·</span>}
        {(featured ? hasProtein : recipeProteinGrams) && (
          <span className="flex items-center gap-1">
            <span>💪</span>
            <span>{recipeProteinGrams}g 蛋白質／人</span>
          </span>
        )}
        {!featured && recipeDiet.length > 0 && !recipeProteinGrams && (
          <span className="flex items-center gap-1">
            <span>🥗</span>
            <span>{label(DIET_MAP, recipeDiet[0]) || recipeDiet[0]}</span>
          </span>
        )}
      </div>
    </div>
  );

  // An actual anchor covers image, text and padding. Favorite is its sibling,
  // so both controls retain native keyboard behavior without nested interaction.
  if (featured) {
    return (
      <article className={`pm-recipe-card group relative block bg-[#fffefb] border border-[#e8dfd3] rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 active:shadow-sm active:translate-y-0 active:border-[#cbb7a5] transition-all duration-200 ${className}`}>
        <Link href={href} onClick={handleLinkClick} prefetch={false} className="pm-featured-link block h-full" aria-labelledby={`home-featured-title-${recipeId}`}>
          {imageContainer}
          {contentBody}
        </Link>
        <div className="absolute top-3 right-3 z-50">
          <FavoriteButton active={isFavorite} loading={favoriteLoading} onClick={onFavoriteClick} recipeName={recipeName} />
        </div>
      </article>
    );
  }

  // Always use Link when slug exists for consistent navigation
  if (hasDetailPage) {
    return (
      <article className={`group relative block bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 ${className}`}>
        <Link href={href} onClick={handleLinkClick} prefetch={onClick ? false : undefined} className="block h-full rounded-2xl focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#9B6035]">
          {imageContainer}
          {contentBody}
        </Link>
        {onFavoriteClick && (
          <div className="absolute top-3 right-3 z-50">
            <FavoriteButton active={isFavorite} loading={favoriteLoading} onClick={onFavoriteClick} recipeName={recipeName} />
          </div>
        )}
      </article>
    );
  }

  // Fallback: article with onClick for custom behavior
  return (
    <article
      className={`relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer ${className}`}
      onClick={handleCardClick}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
    >
      {imageContainer}
      {contentBody}
      {onFavoriteClick && (
        <div className="absolute top-3 right-3 z-50">
          <FavoriteButton active={isFavorite} loading={favoriteLoading} onClick={onFavoriteClick} />
        </div>
      )}
    </article>
  );
}

export default React.memo(RecipeCard);
