import Card from '@/components/ui/Card';

interface RecipeCardProps {
  recipe: {
    id: number;
    name: string;
    description?: string;
    image_url?: string;
    tags?: string[];
    cooking_time: number;
    cuisine: string;
    calories: number;
    difficulty?: string;
  };
  onClick?: () => void;
}

export default function RecipeCard({ recipe, onClick }: RecipeCardProps) {
  return (
    <Card
      title={recipe.name}
      description={`${recipe.cooking_time}分鐘 · ${recipe.cuisine} · ${recipe.calories} kcal`}
      image={recipe.image_url}
      tags={recipe.tags}
      onClick={onClick}
    />
  );
}
