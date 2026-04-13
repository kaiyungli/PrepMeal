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
      <div className='flex gap-2 items-center justify-between'>
        <div className='flex gap-2 items-center'>
          <span className='text-sm font-semibold text-[#3A2010]'>
            已選擇 {selectedCount} 餐
          </span>
          {hasRecipes && (
            <button
              onClick={onClear}
              className={UI.buttonGhost}
            >
              🗑️ 清空
            </button>
          )}
        </div>
        <div className='flex gap-3'>
          {/* Shopping list - only when plan exists */}
          {hasRecipes && (
            <button
              onClick={onShoppingList}
              className="px-4 py-2 rounded-lg border-2 border-[#9B6035] text-[#9B6035] hover:bg-[#FAF7F2]"
            >
              🛒 購物清單
            </button>
          )}
          {/* Save - only when plan exists */}
          {hasRecipes && (
            <button
              onClick={onSave}
              disabled={isSaving}
              className={UI.buttonGhost}
            >
              {isSaving ? '保存中...' : '💾 保存'}
            </button>
          )}
          {/* Primary action - always visible */}
          <button
            onClick={onGenerate}
            className={UI.buttonPrimary}
          >
            ✨ 一鍵生成
          </button>
        </div>
      </div>
    </div>
  );
}
