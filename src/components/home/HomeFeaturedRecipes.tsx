/**
 * HomeFeaturedRecipes - Show popular recipes before filters
 * Placed after HomeAboutSection, before recipe filters
 */

import Link from 'next/link';

interface Recipe {
  id: string;
  name: string;
  slug?: string;
  image_url?: string | null;
  description?: string | null;
  prep_time_minutes?: number | null;
  difficulty?: string | null;
}

interface HomeFeaturedRecipesProps {
  recipes: Recipe[];
}

export default function HomeFeaturedRecipes({ recipes }: HomeFeaturedRecipesProps) {
  const displayRecipes = (recipes || []).slice(0, 6);

  if (displayRecipes.length === 0) {
    return null;
  }

  return (
    <section className="py-10 bg-[#F8F3E8]">
      <div className="max-w-[1200px] mx-auto px-4">
        <h2 className="text-xl font-bold text-center text-[#3A2010] mb-2">
          熱門家常食譜
        </h2>
        <p className="text-center text-[#7A5A38] mb-6">
          精選受歡迎食譜，快速找到今晚晚餐靈感。
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {displayRecipes.map((recipe) => (
            <Link
              key={recipe.id}
              href={recipe.slug ? `/recipes/${recipe.slug}` : `/recipes/${recipe.id}`}
              className="block group"
            >
              <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {/* Image */}
                <div className="aspect-square bg-[#F4EDDD] relative">
                  {recipe.image_url ? (
                    <img
                      src={recipe.image_url}
                      alt={recipe.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">
                      🍲
                    </div>
                  )}
                </div>
                
                {/* Info */}
                <div className="p-3">
                  <h3 className="font-medium text-[#3A2010] text-sm line-clamp-2 group-hover:text-[#9B6035] transition-colors">
                    {recipe.name}
                  </h3>
                  {recipe.prep_time_minutes && (
                    <p className="text-xs text-[#AA7A50] mt-1">
                      ⏱ {recipe.prep_time_minutes}分鐘
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
