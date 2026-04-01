'use client';
import IngredientSelector from './IngredientSelector';
import UnitSelector from './UnitSelector';

export default function RecipeIngredientsEditor({
  ingredients,
  units,
  formIngredients,
  onAddIngredient,
  onRemoveIngredient,
  onUpdateIngredient,
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-bold text-[#3A2010]">🥬 食材 ({formIngredients.length})</h3>
        <button type="button" onClick={onAddIngredient} className="text-sm bg-[#C8D49A] text-[#3A2010] px-3 py-1 rounded-lg hover:bg-[#b5c288]">+ 添加食材</button>
      </div>
      <div className="hidden md:grid md:grid-cols-12 gap-3 text-xs text-[#AA7A50] font-medium px-2 mb-2">
        <div className="md:col-span-3">食材</div>
        <div className="md:col-span-1">份量</div>
        <div className="md:col-span-1">單位</div>
        <div className="md:col-span-2">備註</div>
        <div className="md:col-span-2">分組</div>
        <div className="md:col-span-1">可選</div>
        <div className="md:col-span-2"></div>
      </div>
      <div className="space-y-2">
        {formIngredients.map((ing, i) => {
          const selectedIng = ingredients.find(a => a.id === ing.ingredient_id);
          // Debug: log if not found
          }
          return (
            <div key={i} className="bg-[#FDFBF7] p-3 rounded-lg border border-[#DDD0B0]">
              {/* Mobile: stacked layout */}
              <div className="space-y-2 md:hidden">
                {/* Row 1: Ingredient selector - full width */}
                <div>
                  <IngredientSelector value={ing.ingredient_id} onChange={v => onUpdateIngredient(i, 'ingredient_id', v)} ingredients={ingredients} fallbackLabel={ing.ingredient_name} />
                  {selectedIng && <span className="text-xs text-[#AA7A50] ml-2 block mt-1">{selectedIng.shopping_category}</span>}
                </div>

                {/* Row 2: Quantity + Unit side by side */}
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" step="0.1" value={ing.quantity} onChange={e => onUpdateIngredient(i, 'quantity', e.target.value)} placeholder="份量" className="w-full px-2 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010] text-sm" />
                  <UnitSelector value={ing.unit_id} onChange={v => onUpdateIngredient(i, 'unit_id', v)} units={units} />
                </div>

                {/* Row 3: Notes */}
                <input value={ing.notes} onChange={e => onUpdateIngredient(i, 'notes', e.target.value)} placeholder="備註 (選填)" className="w-full px-2 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010] text-sm" />

                {/* Row 4: Group key */}
                <input value={ing.group_key || ''} onChange={e => onUpdateIngredient(i, 'group_key', e.target.value)} placeholder="分組 key (選填)" className="w-full px-2 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010] text-sm" />

                {/* Row 5: Optional checkbox + Delete */}
                <div className="flex items-center justify-between pt-1 border-t border-[#DDD0B0]/30">
                  <label className="flex items-center gap-2 text-xs text-[#AA7A50] cursor-pointer">
                    <input type="checkbox" checked={ing.is_optional} onChange={e => onUpdateIngredient(i, 'is_optional', e.target.checked)} className="rounded border-[#DDD0B0]" />
                    可選食材
                  </label>
                  <button type="button" onClick={() => onRemoveIngredient(i)} className="text-red-500 hover:text-red-700 text-sm px-2 py-1 rounded hover:bg-red-50">✕ 移除</button>
                </div>
              </div>

              {/* Desktop: grid layout */}
              <div className="hidden md:grid md:grid-cols-12 gap-3 items-center">
                <div className="md:col-span-3">
                  <IngredientSelector value={ing.ingredient_id} onChange={v => onUpdateIngredient(i, 'ingredient_id', v)} ingredients={ingredients} fallbackLabel={ing.ingredient_name} />
                  {selectedIng && <span className="text-xs text-[#AA7A50] ml-2">{selectedIng.shopping_category}</span>}
                </div>
                <div className="md:col-span-1"><input type="number" step="0.1" value={ing.quantity} onChange={e => onUpdateIngredient(i, 'quantity', e.target.value)} placeholder="份量" className="w-full px-2 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010] text-sm" /></div>
                <div className="md:col-span-1"><UnitSelector value={ing.unit_id} onChange={v => onUpdateIngredient(i, 'unit_id', v)} units={units} /></div>
                <div className="md:col-span-2"><input value={ing.notes} onChange={e => onUpdateIngredient(i, 'notes', e.target.value)} placeholder="備註" className="w-full px-2 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010] text-sm" /></div>
                <div className="md:col-span-2"><input value={ing.group_key || ''} onChange={e => onUpdateIngredient(i, 'group_key', e.target.value)} placeholder="分組" className="w-full px-2 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010] text-sm" /></div>
                <div className="md:col-span-1 flex items-center justify-center">
                  <label className="flex items-center gap-1 text-xs text-[#AA7A50] cursor-pointer"><input type="checkbox" checked={ing.is_optional} onChange={e => onUpdateIngredient(i, 'is_optional', e.target.checked)} className="rounded border-[#DDD0B0]" /></label>
                </div>
                <div className="md:col-span-2 flex justify-end">
                  <button type="button" onClick={() => onRemoveIngredient(i)} className="text-red-500 hover:text-red-700 text-sm px-2 py-1 rounded hover:bg-red-50">✕ 移除</button>
                </div>
              </div>
            </div>
          );
        })}
        {formIngredients.length === 0 && <p className="text-[#AA7A50] text-sm italic">點擊「添加食材」開始</p>}
      </div>
      <p className="text-xs text-[#AA7A50] mt-2">每個食材需要: 食材名稱 + 份量 + 單位 (可選食材請勾選)</p>
    </div>
  );
}