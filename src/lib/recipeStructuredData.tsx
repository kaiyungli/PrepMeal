/**
 * Recipe structured data (JSON-LD) for SEO
 * Maps recipe data to Schema.org Recipe format
 */

interface Ingredient {
  name?: string;
  display_name?: string;
  quantity?: number;
  unit?: string;
}

interface Step {
  text?: string;
  step_no?: number;
}

interface RecipeData {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  cuisine?: string;
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  total_time_minutes?: number;
  servings?: number;
  ingredients?: Ingredient[];
  steps?: Step[];
  calories_per_serving?: number;
  protein_g?: number;
  created_at?: string;
}

function formatISO8601Duration(minutes: number | null | undefined): string | undefined {
  if (!minutes) return undefined;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `PT${hours}H${mins > 0 ? mins + 'M' : ''}`;
  }
  return `PT${mins}M`;
}

export function getRecipeStructuredData(recipe?: RecipeData) {
  if (!recipe) return null;

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org/',
    '@type': 'Recipe',
    name: recipe.name,
    description: recipe.description || recipe.name,
  };

  // Image
  if (recipe.image_url) {
    schema.image = recipe.image_url;
  }

  // Author
  schema.author = {
    '@type': 'Organization',
    name: '今晚食乜',
  };

  // Cuisine
  if (recipe.cuisine) {
    schema.recipeCuisine = recipe.cuisine;
  }

  // Times
  if (recipe.prep_time_minutes) {
    schema.prepTime = formatISO8601Duration(recipe.prep_time_minutes);
  }
  if (recipe.cook_time_minutes) {
    schema.cookTime = formatISO8601Duration(recipe.cook_time_minutes);
  }
  if (recipe.total_time_minutes) {
    schema.totalTime = formatISO8601Duration(recipe.total_time_minutes);
  }

  // Yield
  if (recipe.servings) {
    schema.recipeYield = recipe.servings.toString();
  }

  // Ingredients
  if (recipe.ingredients && recipe.ingredients.length > 0) {
    schema.recipeIngredient = recipe.ingredients.map((ing) => {
      const qty = ing.quantity ? `${ing.quantity} ` : '';
      const unit = ing.unit || '';
      const name = ing.display_name || ing.name || '';
      return `${qty}${unit} ${name}`.trim();
    });
  }

  // Instructions
  if (recipe.steps && recipe.steps.length > 0) {
    schema.recipeInstructions = recipe.steps.map((step) => ({
      '@type': 'HowToStep',
      text: step.text || '',
      position: step.step_no?.toString() || '',
    }));
  }

  // Nutrition
  if (recipe.calories_per_serving) {
    schema.nutrition = {
      '@type': 'NutritionInformation',
      calories: `${recipe.calories_per_serving} calories`,
    };
  }

  // Date published
  if (recipe.created_at) {
    schema.datePublished = recipe.created_at.split('T')[0];
  }

  return schema;
}

export function RecipeStructuredData({ recipe }: { recipe?: RecipeData }) {
  const schema = getRecipeStructuredData(recipe);
  if (!schema) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
