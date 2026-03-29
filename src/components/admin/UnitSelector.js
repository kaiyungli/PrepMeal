'use client';
import { useState } from 'react';

export default function UnitSelector({ value, onChange, units }) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedUnit = units.find(u => u.id === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-2 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010] text-sm text-left flex justify-between items-center"
      >
        {selectedUnit?.name || '單位'}
        <span className="text-xs">▼</span>
      </button>
      {isOpen && (
        <div className="absolute z-10 w-32 mt-1 bg-white border border-[#DDD0B0] rounded-lg shadow-lg max-h-48 overflow-auto">
          {units.map(unit => (
            <button
              key={unit.id}
              type="button"
              onClick={() => {
                onChange(unit.id);
                setIsOpen(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-[#F8F3E8] text-sm"
            >
              {unit.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}