import RecipeCard from './RecipeCard';

interface RecipeListProps {
  recipes: any[];
  onRecipeClick?: (recipe: any) => void;
}

export default function RecipeList({ recipes, onRecipeClick }: RecipeListProps) {
  if (!recipes || recipes.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
        暫時冇食譜
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
      {recipes.map((recipe) => (
        <RecipeCard
          key={recipe.id}
          recipe={recipe}
          onClick={() => onRecipeClick?.(recipe)}
        />
      ))}
    </div>
  );
}
