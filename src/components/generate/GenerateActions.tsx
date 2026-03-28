import { UI } from '@/styles/ui';
// Generate page action buttons component

interface GenerateActionsProps {
  isSaving: boolean;
  selectedCount: number;
  hasRecipes: boolean;
  onClear: () => void;
  onShoppingList: () => void;
  onGenerate: () => void;
  onSave: () => void;
}

export default function GenerateActions({ 
  isSaving,
  selectedCount,
  hasRecipes,
  onClear,
  onShoppingList,
  onGenerate,
  onSave
}: GenerateActionsProps) {
  return (
    <div className="bg-white px-6 py-4 border-b border-[#DDD0B0] flex flex-wrap justify-between items-center gap-3">
      <div className='flex gap-2 items-center'>
        <span className='text-sm font-semibold text-[#3A2010]'>
          已選擇 {selectedCount} 餐
        </span>
        {hasRecipes && (
          <button
            onClick={onClear}
            className="px-3 py-1.5 bg-transparent border border-[#DDD0B0] rounded-md text-xs text-[#AA7A50] cursor-pointer"
          >
            🗑️ 清空
          </button>
        )}
      </div>
      <div className='flex gap-2'>
        <button
          onClick={onShoppingList}
          disabled={!hasRecipes}
          className={UI.buttonAccent + " text-sm font-semibold disabled:opacity-50 cursor-pointer"}
        >
          🛒 購物清單
        </button>
        <button
          onClick={onGenerate}
          className="px-5 py-2.5 bg-[#F0A060] text-white border-none rounded-lg text-sm font-semibold cursor-pointer"
        >
          ✨ 一鍵生成
        </button>
        <button
          onClick={onSave}
          disabled={!hasRecipes || isSaving}
          className={UI.buttonPrimary + " text-sm font-semibold cursor-pointer"}
        >
          {isSaving ? '保存中...' : '💾 保存'}
        </button>
      </div>
    </div>
  );
}
