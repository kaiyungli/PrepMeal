'use client';

export default function RecipeStepsEditor({ formSteps, onAddStep, onRemoveStep, onUpdateStep, onMoveStep }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-bold text-[#3A2010]">👩🍳 步驟 ({formSteps.length})</h3>
        <button type="button" onClick={onAddStep} className="text-sm bg-[#C8D49A] text-[#3A2010] px-3 py-1 rounded-lg hover:bg-[#b5c288]">+ 添加步驟</button>
      </div>
      <div className="space-y-3">
        {formSteps.map((step, i) => (
          <div key={i} className="flex gap-2 items-start bg-[#FDFBF7] p-2 rounded-lg">
            <span className="text-[#AA7A50] text-sm font-bold w-8 pt-2">Step {i + 1}</span>
            <textarea value={step.text} onChange={e => onUpdateStep(i, 'text', e.target.value)} rows={2} className="flex-1 px-3 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010] text-sm" placeholder={`步驟 ${i + 1} 的說明...`} />
            <input type="number" value={step.time_seconds || ''} onChange={e => onUpdateStep(i, 'time_seconds', e.target.value)} placeholder="秒" className="w-20 px-2 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010] text-sm" title="時間 (秒)" />
            <div className="flex flex-col">
              <button type="button" onClick={() => onMoveStep(i, 'up')} disabled={i === 0} className="text-[#AA7A50] hover:text-[#9B6035] disabled:opacity-30">↑</button>
              <button type="button" onClick={() => onMoveStep(i, 'down')} disabled={i === formSteps.length - 1} className="text-[#AA7A50] hover:text-[#9B6035] disabled:opacity-30">↓</button>
            </div>
            <button type="button" onClick={() => onRemoveStep(i)} className="text-red-500 hover:text-red-700 pt-2">✕</button>
          </div>
        ))}
        {formSteps.length === 0 && <p className="text-[#AA7A50] text-sm italic">點擊「添加步驟」開始</p>}
      </div>
    </div>
  );
}