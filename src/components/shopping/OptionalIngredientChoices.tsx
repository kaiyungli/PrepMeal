import { useAuth } from '@/hooks/useAuth';
import { useOptionalSelections } from '@/features/shopping-list/optionalSelections';
import type { OptionalIngredientGroup } from '@/features/shopping-list/types';

export default function OptionalIngredientChoices({ groups = [] }: { groups?: OptionalIngredientGroup[] }) {
  const { user } = useAuth();
  const { selections, select } = useOptionalSelections(user?.id);
  if (!groups.length || !user?.id) return null;
  return <section aria-label="選配材料" className="mb-4 rounded-lg border border-[#E5DCC8] p-3">
    <h3 className="font-semibold">選配材料</h3>
    <p className="text-sm text-[#6B5748]">勾選今次要買的選配材料；未勾選的材料不會加入清單。相同食譜會沿用你的選擇。</p>
    {groups.map(group => {
      const selected = selections[group.recipeId] ?? [];
      return <fieldset key={group.recipeId} className="mt-3">
        <legend className="font-medium">{group.recipeName}</legend>
        {group.ingredients.map(item => <label key={item.ingredientId} className="mr-4 inline-flex items-center gap-2 py-2">
          <input type="checkbox" checked={selected.includes(item.ingredientId)} onChange={event =>
            select(group.recipeId, event.target.checked ? [...selected, item.ingredientId] : selected.filter(id => id !== item.ingredientId))} />
          {item.name}
        </label>)}
        <button type="button" className="block text-sm underline" onClick={() => select(group.recipeId, [])}>只用基本材料</button>
      </fieldset>;
    })}
  </section>;
}
