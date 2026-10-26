import { useEffect, useMemo, useRef, useState } from 'react';
import type { ShoppingListItemViewModel, ShoppingListViewModel } from '@/features/shopping-list/types';
import { itemKey, reconcileProgress, shoppingText, type ShoppingProgress } from '@/features/shopping-list/progress/model';
import OptionalIngredientChoices from './OptionalIngredientChoices';

type Props = { view: ShoppingListViewModel; progress: ShoppingProgress; onChange: (p: ShoppingProgress) => void; disabled?: boolean; status?: string };
const button = 'min-h-11 rounded-lg border border-[#DDD0B0] px-3 py-2 text-sm';
const input = 'w-full min-h-11 rounded-lg border border-[#DDD0B0] p-2 text-base';

export default function ShoppingListV2({ view, progress, onChange, disabled = false, status }: Props) {
  const [mode, setMode] = useState<'category' | 'recipe'>('category');
  const [hideBought, setHideBought] = useState(false);
  const [shareAll, setShareAll] = useState(false);
  const [notice, setNotice] = useState('');
  const [fallback, setFallback] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [note, setNote] = useState('');
  const reconciliation = useMemo(() => reconcileProgress(progress, view), [progress, view]);
  const current = reconciliation.progress;
  const fingerprint = JSON.stringify(current);
  const announced = useRef('');
  useEffect(() => {
    if (disabled || fingerprint === JSON.stringify(progress)) return;
    onChange(current);
    // External recipe quantities changed. Announce once per resulting state.
    if (reconciliation.changed.length && announced.current !== fingerprint) {
      announced.current = fingerprint;
      setNotice(`份量增加或單位改變，請重新核對：${reconciliation.changed.join('、')}`);
    }
  }, [fingerprint, progress, current, onChange, disabled, reconciliation.changed]);
  const items = view.sections.flatMap(s => s.items);
  const bought = items.filter(i => current.items[itemKey(i)]?.checked).length + current.extras.filter(i => i.checked).length;
  const total = items.length + current.extras.length;
  const text = shoppingText(view, current, shareAll);
  const updateItem = (item: ShoppingListItemViewModel, patch: Partial<ShoppingProgress['items'][string]>) => {
    const key = itemKey(item);
    onChange({ ...current, items: { ...current.items, [key]: { ...current.items[key], ...patch } } });
  };
  const copy = async () => {
    setBusy(true); setFallback(false); setNotice('');
    try { await navigator.clipboard.writeText(text); setNotice('✅ 已複製!'); }
    catch { setNotice('未能複製，請選取以下文字自行複製。'); setFallback(true); }
    finally { setBusy(false); }
  };
  const share = async () => {
    if (!navigator.share) { await copy(); return; }
    setBusy(true); setNotice('');
    try { await navigator.share({ title: '購物清單', text }); setNotice('已開啟分享。'); }
    catch (error) { if (!(error instanceof Error && error.name === 'AbortError')) { setNotice('未能分享，請選取清單文字。'); setFallback(true); } }
    finally { setBusy(false); }
  };
  const renderItem = (item: ShoppingListItemViewModel, prefix: string) => {
    const p = current.items[itemKey(item)];
    if (hideBought && p?.checked) return null;
    return <div key={`${prefix}:${itemKey(item)}`} className={`rounded-lg border border-[#EEE2CD] p-3 ${p?.checked ? 'bg-green-50' : 'bg-[#FEFCF8]'}`}>
      <label className="flex min-h-11 cursor-pointer items-center gap-3">
        <input type="checkbox" className="h-5 w-5 shrink-0" checked={!!p?.checked} onChange={e => updateItem(item, { checked: e.target.checked })} />
        <span className={`flex-1 ${p?.checked ? 'line-through text-[#66594B]' : ''}`}>{item.name}</span>
        <span className="text-sm text-[#7a4a2a]">{item.quantityPending ? '（數量待補）' : item.quantityText}</span>
      </label>
      <label className="block text-xs text-[#66594B]">{item.name} 採購備註
        <input className={input} maxLength={300} placeholder="品牌、包裝、購買地點" value={p?.note || ''} onChange={e => updateItem(item, { note: e.target.value })} />
      </label>
    </div>;
  };
  const ordered = (rows: ShoppingListItemViewModel[]) => [...rows].sort((a, b) => Number(!!current.items[itemKey(a)]?.checked) - Number(!!current.items[itemKey(b)]?.checked));
  const resetForm = () => { setEditing(null); setName(''); setQuantity(''); setUnit(''); setNote(''); };
  return <div className="space-y-4">
    <p role="status" className="font-semibold">已買 {bought}／共 {total} 項</p>
    {status && <p role="status" className="text-sm">{status}</p>}
    {notice && <p role="status" className="text-sm">{notice}</p>}
    <fieldset disabled={disabled} className="min-w-0 space-y-4">
      <div className="flex flex-wrap gap-2">
        <button type="button" className={button} aria-pressed={mode === 'category'} onClick={() => setMode('category')}>按類別</button>
        <button type="button" className={button} aria-pressed={mode === 'recipe'} onClick={() => setMode('recipe')}>按菜式</button>
        <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={hideBought} onChange={e => setHideBought(e.target.checked)} />隱藏已買</label>
      </div>
      <OptionalIngredientChoices groups={view.optionalIngredients} />
      {view.dietaryNotes?.map(n => <p key={n} className="text-sm">{n}</p>)}
      {!!view.pantry.length && <div><h3 className="font-semibold text-green-700">✅ 已有食材</h3><p>{view.pantry.map(i => i.name).join('、')}</p></div>}
      {mode === 'category' ? view.sections.map(section => <section key={section.categoryKey} className="space-y-2">
        <h3 className="font-semibold">{section.categoryIcon} {section.categoryLabel}</h3>
        {ordered(section.items).map(i => renderItem(i, section.categoryKey))}
      </section>) : <>
        <p className="text-sm text-[#66594B]">同一食材共用勾選；以下顯示整份餐單所需總量。</p>
        {view.byRecipe.map((recipe, index) => {
          const names = new Set(recipe.toBuy.map(i => i.name));
          return <section key={`${recipe.recipeId}:${index}`} className="space-y-2"><h3 className="font-semibold">{recipe.recipeName}</h3>
            {ordered(items.filter(i => names.has(i.name))).map(i => renderItem(i, String(index)))}
            {!recipe.toBuy.length && <p>呢個菜式唔需要購買材料</p>}
          </section>;
        })}
      </>}
      <section className="space-y-2"><h3 className="font-semibold">額外物品</h3>
        {[...current.extras].sort((a,b) => Number(a.checked)-Number(b.checked)).filter(i => !hideBought || !i.checked).map(extra => <div key={extra.id} className="rounded-lg border p-3">
          <label className="flex min-h-11 items-center gap-3"><input type="checkbox" className="h-5 w-5" checked={extra.checked} onChange={e => onChange({ ...current, extras: current.extras.map(i => i.id === extra.id ? { ...i, checked: e.target.checked } : i) })} /><span className={extra.checked ? 'line-through' : ''}>{extra.name} {extra.quantity} {extra.unit}</span></label>
          {extra.note && <p className="text-sm">{extra.note}</p>}
          <div className="flex gap-2"><button type="button" className={button} onClick={() => { setEditing(extra.id); setName(extra.name); setQuantity(extra.quantity); setUnit(extra.unit); setNote(extra.note); }}>編輯 {extra.name}</button>
          <button type="button" className={button} onClick={() => { onChange({ ...current, extras: current.extras.filter(i => i.id !== extra.id) }); if (editing === extra.id) resetForm(); }}>刪除 {extra.name}</button></div>
        </div>)}
        <form className="space-y-2 rounded-lg bg-[#F8F3E8] p-3" onSubmit={e => {
          e.preventDefault(); if (!name.trim() || (!editing && current.extras.length >= 100)) return;
          const previous = current.extras.find(i => i.id === editing);
          const requiresCheck = !!previous && (previous.unit !== unit.trim() ||
            (Number.isFinite(Number(quantity)) && Number.isFinite(Number(previous.quantity)) ? Number(quantity) > Number(previous.quantity) : quantity.trim() !== previous.quantity));
          const extra = { id: editing || crypto.randomUUID(), name: name.trim(), quantity: quantity.trim(), unit: unit.trim(), note: note.trim(), checked: !!previous?.checked && !requiresCheck };
          onChange({ ...current, extras: editing ? current.extras.map(i => i.id === editing ? extra : i) : [...current.extras, extra] }); resetForm();
        }}>
          <label className="block text-sm">物品名稱<input className={input} required maxLength={100} value={name} onChange={e => setName(e.target.value)} /></label>
          <div className="grid grid-cols-2 gap-2"><label className="text-sm">數量<input className={input} maxLength={30} value={quantity} onChange={e => setQuantity(e.target.value)} /></label><label className="text-sm">單位<input className={input} maxLength={30} placeholder="包、樽…" value={unit} onChange={e => setUnit(e.target.value)} /></label></div>
          <label className="block text-sm">額外物品備註<input className={input} maxLength={300} value={note} onChange={e => setNote(e.target.value)} /></label>
          <button className={button} type="submit" disabled={!editing && current.extras.length >= 100}>{editing ? '儲存物品' : '加入物品'}</button>
          {editing && <button className={button} type="button" onClick={resetForm}>取消編輯</button>}
        </form>
      </section>
      <div className="flex flex-wrap items-center gap-2 border-t pt-3">
        <label className="text-sm">分享範圍 <select className={button} value={shareAll ? 'all' : 'remaining'} onChange={e => { setShareAll(e.target.value === 'all'); setFallback(false); }}><option value="remaining">尚欠</option><option value="all">全部</option></select></label>
        <button type="button" className={button} disabled={busy || !total} onClick={copy}>📋 複製清單</button>
        <button type="button" className={button} disabled={busy || !total} onClick={share}>分享清單</button>
      </div>
      {fallback && <label className="block">清單文字<textarea aria-label="清單文字" className={`${input} h-48`} readOnly value={text} onFocus={e => e.target.select()} /></label>}
    </fieldset>
  </div>;
}
