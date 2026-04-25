'use client';

import HomeRecipeGrid from '@/components/home/HomeRecipeGrid';

interface HomeRecipesSectionProps {
  recipes: any[];
  isFavorite?: (recipeId: string | number) => boolean;
  isPending?: (recipeId: string | number) => boolean;
  onFavoriteClick?: (recipeId: string | number) => void | Promise<void>;
  onRecipeClick?: (recipe: any) => void;
}

/**
 * HomeRecipesSection - recipe grid for homepage
 * 
 * If onRecipeClick provided → pass to RecipeCard as onClick handler
 * If onRecipeClick NOT provided → RecipeCard renders <Link> for client-side navigation
 */
export default function HomeRecipesSection({ 
  recipes,
  isFavorite,
  isPending,
  onFavoriteClick,
  onRecipeClick,
}: HomeRecipesSectionProps) {
  return (
    <section id="recipes" className="pt-8 pb-24 bg-[#F8F3E8]">
      <HomeRecipeGrid
        recipes={recipes}
        onRecipeClick={onRecipeClick}
        isFavorite={isFavorite}
        isPending={isPending}
        onFavoriteClick={onFavoriteClick}
      />
    </section>
  );
}