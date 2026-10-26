import { UI } from '@/styles/ui';
// Generate page action buttons component

interface GenerateActionsProps {
  recipesError?: string | null;
  isSaving: boolean;
  isLoadingRecipes: boolean;
  availableRecipeCount: number;
  filteredRecipeCount: number;
  availabilityWarnings?: string[];
  selectedCount: number;
  hasRecipes: boolean;
  onClear: () => void;
  onShoppingList: () => void;
  onGenerate: () => void;
  onSave: () => void;
}

export default function GenerateActions({ 
  recipesError,
  isSaving,
  isLoadingRecipes,
  availableRecipeCount,
  filteredRecipeCount,
  availabilityWarnings = [],
  selectedCount,
  hasRecipes,
  onClear,
  onShoppingList,
  onGenerate,
  onSave
}: GenerateActionsProps) {
  const actionButton = 'min-h-11 min-w-0 rounded-xl px-2 py-2.5 text-sm font-semibold whitespace-nowrap touch-manipulation transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9B6035] disabled:opacity-50 disabled:cursor-not-allowed';
  const secondaryButton = actionButton + ' border border-[#DDD0B0] bg-[#FAF5E9] text-[#765C42] enabled:hover:bg-[#F1E7D3]';
  const cannotGenerate = isLoadingRecipes || filteredRecipeCount === 0;

  return (
    <div className="bg-white rounded-xl border border-[#DDD0B0] px-4 py-4 flex flex-wrap justify-between items-center gap-3">
      <div className='flex gap-2 items-center'>
        <span className='text-sm font-semibold text-[#3A2010]'>
          已選擇 {selectedCount} 餐
        </span>
        {hasRecipes && (
          <button
            onClick={onClear}
            onTouchStart={() => {}}
            className={UI.buttonGhost}
          >
            🗑️ 清空
          </button>
        )}
      </div>
      <div className='grid grid-cols-3 gap-2 w-full sm:w-auto sm:min-w-80'>
        <button
          onClick={onShoppingList}
            onTouchStart={() => {}}
          disabled={!hasRecipes}
          className={secondaryButton}
        >
          購物清單
        </button>
        <button
          onClick={onGenerate}
            onTouchStart={() => {}}
          disabled={cannotGenerate}
          className={actionButton + " bg-[#9B6035] text-white enabled:hover:bg-[#84502D]"}
        >
          一鍵生成
        </button>
        <button
          onClick={onSave}
            onTouchStart={() => {}}
          disabled={!hasRecipes || isSaving}
          className={secondaryButton}
        >
          {isSaving ? '保存中...' : '保存'}
        </button>
      </div>
      {isLoadingRecipes ? (
        <p role="status" className="w-full text-sm text-[#3A2010]">正在載入食譜…</p>
      ) : !recipesError && filteredRecipeCount === 0 ? (
        <p role="status" className="w-full text-sm text-[#3A2010]">
          {availableRecipeCount === 0
            ? '暫時沒有可用食譜，請稍後再試。'
            : '沒有食譜符合目前條件，請調整篩選條件。'}
        </p>
      ) : !recipesError && availabilityWarnings.length > 0 ? (
        <div role="status" className="w-full text-sm text-[#3A2010] border-t border-[#DDD0B0] pt-2">
          {availabilityWarnings.map(message => <p key={message}>{message}</p>)}
        </div>
      ) : null}
    </div>
  );
}
