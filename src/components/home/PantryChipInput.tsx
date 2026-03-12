'use client';

import { useState, useRef } from 'react';

interface PantryChipInputProps {
  value: string[];
  onChange: (chips: string[]) => void;
  placeholder?: string;
}

export default function PantryChipInput({ value, onChange, placeholder }: PantryChipInputProps) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addChip = (chip: string) => {
    const trimmed = chip.trim().toLowerCase();
    if (!trimmed) return;
    // Prevent duplicates
    if (value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setInput('');
  };

  const removeChip = (index: number) => {
    const newChips = [...value];
    newChips.splice(index, 1);
    onChange(newChips);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (input) {
        addChip(input);
      }
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      // Remove last chip when backspace on empty input
      removeChip(value.length - 1);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 p-3 border border-[#DDD0B0] rounded-xl bg-white focus-within:border-[#9B6035] focus-within:ring-2 focus-within:ring-[#9B6035]/20">
      {/* Chips */}
      {value.map((chip, index) => (
        <span
          key={index}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#9B6035] text-white rounded-full text-sm"
        >
          {chip}
          <button
            type="button"
            onClick={() => removeChip(index)}
            className="ml-1 hover:text-red-200 transition-colors"
          >
            ×
          </button>
        </span>
      ))}

      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value.toLowerCase())}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (input) addChip(input);
        }}
        placeholder={value.length === 0 ? (placeholder || '輸入食材，按 Enter 或 , 加入') : ''}
        className="flex-1 min-w-[120px] outline-none text-[#3A2010] placeholder:text-gray-400"
      />
    </div>
  );
}
