'use client';
import { useState } from 'react';

export default function IngredientSelector({ value, onChange, ingredients, fallbackLabel }) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const selectedIngredient = ingredients.find(i => i.id === value);

  // Show search if user is typing, otherwise show selected or placeholder
  const displayValue = isOpen ? search : (selectedIngredient?.name || fallbackLabel || '');

  const filtered = search
    ? ingredients.filter(i =>
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.slug.toLowerCase().includes(search.toLowerCase())
      )
    : ingredients.slice(0, 10);

  const handleSelect = (ing) => {
    onChange(ing.id);
    setSearch(ing.name);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setSearch('');
    setIsOpen(true);
  };

  return (
    <div className="relative w-full">
      <div className="flex rounded-lg overflow-hidden border border-[#DDD0B0] bg-white">
        <input
          type="text"
          value={displayValue}
          onChange={e => {
            setSearch(e.target.value);
            onChange(null);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={selectedIngredient?.name || fallbackLabel || '搜尋食材...'}
          className="flex-1 px-3 py-2 text-[#3A2010] text-sm bg-white"
        />
        {/* Clear button - only show when something is selected */}
        {selectedIngredient && (
          <button
            type="button"
            onClick={handleClear}
            className="px-2 bg-[#F0E8D8] text-[#AA7A50] hover:bg-[#E8DCC8] border-l border-[#DDD0B0]"
            title="清除"
          >
            ✕
          </button>
        )}
        {/* Dropdown toggle - always visible */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="px-2 bg-[#C8D49A] text-[#3A2010] border-l border-[#DDD0B0] hover:bg-[#b5c288]"
        >
          ▼
        </button>
      </div>
      {isOpen && filtered.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-[#DDD0B0] rounded-lg shadow-lg max-h-48 overflow-auto">
          {filtered.map(ing => (
            <button
              key={ing.id}
              type="button"
              onClick={() => handleSelect(ing)}
              className="w-full text-left px-3 py-2 hover:bg-[#F8F3E8] text-sm flex justify-between items-center"
            >
              <span>{ing.name}</span>
              {ing.shopping_category && <span className="text-xs text-[#AA7A50]">({ing.shopping_category})</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}