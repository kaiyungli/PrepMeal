import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { ShoppingListItemViewModel, ShoppingListViewModel } from '@/features/shopping-list/types';
import { itemKey, reconcileProgress, shoppingText, type ExtraItem, type ShoppingProgress } from '@/features/shopping-list/progress/model';
import OptionalIngredientChoices from './OptionalIngredientChoices';

type Props = { view: ShoppingListViewModel; progress: ShoppingProgress; onChange: (p: ShoppingProgress) => void; disabled?: boolean; status?: string };
type Editor = { kind: 'ingredient'; key: string; name: string } | { kind: 'extra'; id: string | null };
type Undo = { kind: 'ingredient' | 'extra'; key: string; name: string };
const secondary = 'min-h-11 rounded-xl px-3 py-2 text-sm font-medium text-[#77573F] hover:bg-[#F3EFE8] focus-visible:outline-2 focus-visible:outline-[#9B6035] disabled:opacity-40';
const primary = 'min-h-12 w-full rounded-xl bg-[#8B593B] px-4 py-3 text-base font-semibold text-white hover:bg-[#71462F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9B6035] disabled:opacity-40';
const input = 'mt-2 min-h-12 w-full rounded-xl border border-[#DCD5CB] bg-white p-3 text-base outline-none focus:border-[#9B6035] focus:ring-2 focus:ring-[#9B6035]/15';

function Pencil() {
  return <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15l-1 6Z" /></svg>;
}

function ItemRow({ name, quantity, note, checked, onCheck, onEdit }: {
  name: string; quantity: string; note: string; checked: boolean; onCheck: (checked: boolean) => void; onEdit: () => void;
}) {
  return <div className="flex items-center gap-1 border-b border-[#F0ECE5] last:border-b-0">
    <label className="flex min-h-9 min-w-0 flex-1 cursor-pointer items-center gap-2 py-1 pl-0.5 sm:min-h-11 sm:gap-3 sm:py-2">
      <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
        <input type="checkbox" checked={checked} onChange={e => onCheck(e.target.checked)}
          className="peer h-5 w-5 appearance-none rounded-full border-[1.5px] border-[#B5AB9E] bg-transparent checked:border-[#8B593B] checked:bg-[#8B593B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9B6035]" />
        {checked && <svg aria-hidden="true" className="pointer-events-none absolute text-white" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 4 4L19 6" /></svg>}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block break-words text-[15px] leading-5 sm:text-base ${checked ? 'text-[#8B8175] line-through' : 'text-[#30271F]'}`}>{name}</span>
        {note && <span className="mt-0.5 block break-words text-xs leading-4 text-[#756B5F]">{note}</span>}
      </span>
      <span className={`max-w-[40%] shrink-0 break-words text-right text-[13px] leading-5 tabular-nums sm:text-sm ${checked ? 'text-[#8B8175]' : 'text-[#635344]'}`}>{quantity}</span>
    </label>
    <button type="button" aria-label={`編輯 ${name}`} onClick={onEdit}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#8B8175] sm:h-11 sm:w-11 hover:bg-[#F3EFE8] focus-visible:outline-2 focus-visible:outline-[#9B6035]"><Pencil /></button>
  </div>;
}

function compactStatus(status?: string) {
  if (!status) return '';
  if (/失敗|未能|無法|另一|超過|請勿|已暫停/.test(status)) return status;
  if (status.includes('草稿')) return '此瀏覽器草稿 · 保留7日';
  if (status.includes('保存採購進度')) return '保存中…';
  if (/讀取/.test(status)) return '讀取中…';
  if (status.includes('已從帳戶載入')) return '已從帳戶載入';
  if (status.includes('已保存')) return '已保存到帳戶';
  return status;
}

export default function ShoppingListV2({ view, progress, onChange, disabled = false, status }: Props) {
  const [mode, setMode] = useState<'category' | 'recipe'>('category');
  const [showBought, setShowBought] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [shareAll, setShareAll] = useState(false);
  const [notice, setNotice] = useState('');
  const [fallback, setFallback] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [note, setNote] = useState('');
  const [undo, setUndo] = useState<Undo | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listScroll = useRef(0);
  const editorTrigger = useRef<HTMLElement | null>(null);
  const infoId = useId();
  const boughtId = useId();
  const shareId = useId();
  const reconciliation = useMemo(() => reconcileProgress(progress, view), [progress, view]);
  const current = reconciliation.progress;
  const fingerprint = JSON.stringify(current);
  const announced = useRef('');
  useEffect(() => {
    if (disabled || fingerprint === JSON.stringify(progress)) return;
    onChange(current);
    if (reconciliation.changed.length && announced.current !== fingerprint) {
      announced.current = fingerprint;
      setNotice(`份量增加或單位改變，請重新核對：${reconciliation.changed.join('、')}`);
    }
  }, [fingerprint, progress, current, onChange, disabled, reconciliation.changed]);
  useEffect(() => {
    if (editor) formRef.current?.querySelector<HTMLElement>('input, textarea')?.focus();
    else if (editorTrigger.current) {
      if (editorTrigger.current.isConnected) editorTrigger.current.focus();
      else {
        const previous = editorTrigger.current;
        const replacement = Array.from(rootRef.current?.querySelectorAll<HTMLButtonElement>('button') || []).find(button =>
          previous.getAttribute('aria-label') ? button.getAttribute('aria-label') === previous.getAttribute('aria-label') : button.textContent === previous.textContent);
        (replacement || listRef.current)?.focus();
      }
      if (listRef.current) listRef.current.scrollTop = listScroll.current;
      editorTrigger.current = null;
    }
  }, [editor]);
  useEffect(() => {
    if (!undo) return;
    const timer = setTimeout(() => setUndo(null), 5000);
    return () => clearTimeout(timer);
  }, [undo]);
  const items = view.sections.flatMap(s => s.items);
  const boughtItems = items.filter(i => current.items[itemKey(i)]?.checked);
  const boughtExtras = current.extras.filter(i => i.checked);
  const bought = boughtItems.length + boughtExtras.length;
  const total = items.length + current.extras.length;
  const text = shoppingText(view, current, shareAll);
  const statusText = compactStatus(status);
  const statusError = !!status && /失敗|未能|無法|另一|超過|請勿|已暫停/.test(status);
  const updateItem = (item: ShoppingListItemViewModel, patch: Partial<ShoppingProgress['items'][string]>) => {
    const key = itemKey(item);
    onChange({ ...current, items: { ...current.items, [key]: { ...current.items[key], ...patch } } });
  };
  const beginEditor = (next: Editor) => {
    listScroll.current = listRef.current?.scrollTop || 0;
    editorTrigger.current = document.activeElement as HTMLElement;
    setEditor(next); setUndo(null);
    if (next.kind === 'ingredient') {
      setNote(current.items[next.key]?.note || '');
    } else {
      const extra = current.extras.find(i => i.id === next.id);
      setName(extra?.name || ''); setQuantity(extra?.quantity || ''); setUnit(extra?.unit || ''); setNote(extra?.note || '');
    }
  };
  const copy = async () => {
    setBusy(true); setFallback(false); setNotice('');
    try { await navigator.clipboard.writeText(text); setNotice('已複製清單'); }
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
  const renderItem = (item: ShoppingListItemViewModel, prefix: string) => <ItemRow key={`${prefix}:${itemKey(item)}`}
    name={item.name} quantity={item.quantityPending ? '數量待補' : item.quantityText} note={current.items[itemKey(item)]?.note || ''}
    checked={!!current.items[itemKey(item)]?.checked}
    onCheck={checked => { updateItem(item, { checked }); setUndo(checked ? { kind: 'ingredient', key: itemKey(item), name: item.name } : null); }}
    onEdit={() => beginEditor({ kind: 'ingredient', key: itemKey(item), name: item.name })} />;
  const renderExtra = (extra: ExtraItem) => <ItemRow key={extra.id} name={extra.name} quantity={[extra.quantity, extra.unit].filter(Boolean).join(' ')} note={extra.note} checked={extra.checked}
    onCheck={checked => { onChange({ ...current, extras: current.extras.map(i => i.id === extra.id ? { ...i, checked } : i) }); setUndo(checked ? { kind: 'extra', key: extra.id, name: extra.name } : null); }}
    onEdit={() => beginEditor({ kind: 'extra', id: extra.id })} />;
  const unbought = (rows: ShoppingListItemViewModel[]) => rows.filter(i => !current.items[itemKey(i)]?.checked);

  return <div ref={rootRef} className="flex min-h-0 flex-1 flex-col" onKeyDown={event => {
    if (event.key !== 'Escape') return;
    if (editor) { event.stopPropagation(); setEditor(null); }
    else if (showShare) { event.stopPropagation(); setShowShare(false); }
  }}>
    {editor ? <>
      <div className="shrink-0 px-5 pt-2 sm:px-6"><button type="button" className={`${secondary} -ml-3`} onClick={() => setEditor(null)}>‹ 返回清單</button></div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 sm:px-6">
        <h3 className="mb-6 mt-2 text-xl font-semibold">{editor.kind === 'ingredient' ? editor.name : editor.id ? '編輯物品' : '加入物品'}</h3>
        <form ref={formRef} className="space-y-5" onSubmit={event => {
          event.preventDefault(); if (disabled) return;
          if (editor.kind === 'ingredient') {
            const item = items.find(i => itemKey(i) === editor.key);
            if (item) updateItem(item, { note: note.trim() });
          } else {
            if (!name.trim() || (!editor.id && current.extras.length >= 100)) return;
            const previous = current.extras.find(i => i.id === editor.id);
            const requiresCheck = !!previous && (previous.unit !== unit.trim() ||
              (Number.isFinite(Number(quantity)) && Number.isFinite(Number(previous.quantity)) ? Number(quantity) > Number(previous.quantity) : quantity.trim() !== previous.quantity));
            const extra = { id: editor.id || crypto.randomUUID(), name: name.trim(), quantity: quantity.trim(), unit: unit.trim(), note: note.trim(), checked: !!previous?.checked && !requiresCheck };
            onChange({ ...current, extras: editor.id ? current.extras.map(i => i.id === editor.id ? extra : i) : [...current.extras, extra] });
          }
          setEditor(null);
        }}>
          <fieldset disabled={disabled} className="space-y-5">
            {editor.kind === 'extra' && <>
              <label className="block text-sm font-medium">物品名稱<input className={input} required maxLength={100} value={name} placeholder="例如：紙巾" onChange={e => setName(e.target.value)} /></label>
              <div className="grid grid-cols-2 gap-3"><label className="text-sm font-medium">數量<input className={input} maxLength={30} value={quantity} placeholder="2" onChange={e => setQuantity(e.target.value)} /></label><label className="text-sm font-medium">單位<input className={input} maxLength={30} value={unit} placeholder="包" onChange={e => setUnit(e.target.value)} /></label></div>
            </>}
            <label className="block text-sm font-medium">{editor.kind === 'ingredient' ? `${editor.name} 採購備註` : '額外物品備註'}
              <textarea className={`${input} min-h-28 resize-y`} maxLength={300} placeholder="品牌、包裝、購買地點（選填）" value={note} onChange={e => setNote(e.target.value)} />
            </label>
            <button className={primary} type="submit">{editor.kind === 'extra' && !editor.id ? '加入物品' : '儲存修改'}</button>
            {editor.kind === 'extra' && editor.id && <button type="button" className="min-h-11 w-full rounded-xl text-sm text-[#A34232] hover:bg-red-50" onClick={() => {
              onChange({ ...current, extras: current.extras.filter(i => i.id !== editor.id) }); setEditor(null);
            }}>刪除物品</button>}
          </fieldset>
        </form>
      </div>
    </> : <>
      <div className="shrink-0 px-4 py-1 sm:px-6 sm:py-2">
        <div className="flex min-h-11 items-center justify-between gap-2">
          <div className="min-w-0"><p className="text-lg font-semibold leading-6 tracking-tight">{total > 0 && bought === total ? '買齊了' : `尚欠 ${total - bought} 項`}</p><p className="text-[11px] leading-4 text-[#756B5F]">已買 {bought}／共 {total} 項</p></div>
          <div className="flex shrink-0 items-center gap-1">
            <label><span className="sr-only">清單排列</span><select value={mode} onChange={e => setMode(e.target.value as 'category' | 'recipe')} className="min-h-9 max-w-24 cursor-pointer bg-transparent px-1 text-[13px] text-[#77573F] focus-visible:outline-2 focus-visible:outline-[#9B6035]"><option value="category">按類別</option><option value="recipe">按菜式</option></select></label>
            <button type="button" className="flex min-h-9 items-center gap-1 rounded-lg px-2 text-[13px] font-medium text-[#77573F] hover:bg-[#F3EFE8] focus-visible:outline-2 focus-visible:outline-[#9B6035] disabled:opacity-40" disabled={disabled || !total} aria-expanded={showShare} aria-controls={shareId} onClick={() => setShowShare(!showShare)}>
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 16V3m-4 4 4-4 4 4M5 11v9h14v-9" /></svg>分享
            </button>
          </div>
        </div>
        {mode === 'recipe' && <p className="pb-1 text-[11px] text-[#938576]">顯示整份餐單總量</p>}
        {showShare && <fieldset id={shareId} disabled={disabled} className="mt-3 rounded-xl bg-[#F5F1EB] p-3">
          <label className="flex items-center justify-between text-sm">分享範圍<select className="min-h-11 rounded-lg bg-white px-3 text-sm" value={shareAll ? 'all' : 'remaining'} onChange={e => { setShareAll(e.target.value === 'all'); setFallback(false); }}><option value="remaining">尚欠</option><option value="all">全部</option></select></label>
          <div className="mt-2 grid grid-cols-2 gap-2"><button type="button" className={`${secondary} bg-white`} disabled={busy || !total} onClick={copy}>複製清單</button><button type="button" className={`${secondary} bg-white`} disabled={busy || !total} onClick={share}>分享清單</button></div>
        </fieldset>}
      </div>
      <div ref={listRef} tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-1 outline-none sm:px-6 sm:pb-3">
        {notice && <p role="status" className="mb-3 rounded-lg bg-[#F5EFE4] p-3 text-sm leading-relaxed">{notice}</p>}
        {fallback && <label className="mb-4 block text-sm">清單文字<textarea aria-label="清單文字" className={`${input} h-44`} readOnly value={text} onFocus={e => e.target.select()} /></label>}
        <fieldset disabled={disabled} className="min-w-0">
          {mode === 'category' ? view.sections.map(section => {
            const remaining = unbought(section.items);
            return remaining.length ? <section key={section.categoryKey} className="mb-1 sm:mb-2">
              <h3 className="border-b border-[#E5DFD4] py-0.5 text-[11px] leading-4 font-semibold tracking-wide text-[#8B7460]">{section.categoryLabel}<span className="ml-2 font-normal text-[#A09282]">{remaining.length}</span></h3>
              {remaining.map(i => renderItem(i, section.categoryKey))}
            </section> : null;
          }) : view.byRecipe.map((recipe, index) => {
            const names = new Set(recipe.toBuy.map(i => i.name));
            const remaining = unbought(items.filter(i => names.has(i.name)));
            return remaining.length ? <section key={`${recipe.recipeId}:${index}`} className="mb-1 sm:mb-2">
              <h3 className="border-b border-[#E5DFD4] py-0.5 text-[11px] leading-4 font-semibold text-[#8B7460]">{recipe.recipeName}</h3>{remaining.map(i => renderItem(i, String(index)))}
            </section> : null;
          })}
          {current.extras.some(i => !i.checked) && <section className="mb-1 sm:mb-2"><h3 className="border-b border-[#E5DFD4] py-0.5 text-[11px] leading-4 font-semibold text-[#8B7460]">額外物品</h3>{current.extras.filter(i => !i.checked).map(renderExtra)}</section>}
          {!total && <p className="py-12 text-center text-sm text-[#756B5F]">清單暫時未有物品</p>}
          {!!total && bought === total && <div className="py-8 text-center"><p className="text-lg font-medium text-[#77573F]">今次要買嘅都齊了</p><p className="mt-2 text-sm text-[#938576]">可以放心準備晚餐。</p></div>}
        </fieldset>
        {!!(bought || view.pantry.length || view.optionalIngredients?.length || view.dietaryNotes?.length || status) && <section className="mt-1 border-t border-[#EDE8DF]">
          <div className="flex items-center gap-3">
            {!!bought && <button type="button" disabled={disabled} aria-expanded={showBought} aria-controls={boughtId} className="flex min-h-8 shrink-0 items-center gap-2 text-xs text-[#756B5F] sm:min-h-10" onClick={() => setShowBought(!showBought)}><span>已買 {bought} 項</span><span aria-hidden="true">{showBought ? '−' : '＋'}</span></button>}
            {!!(view.pantry.length || view.optionalIngredients?.length || view.dietaryNotes?.length || status) && <button type="button" aria-expanded={showInfo} aria-controls={infoId} className="flex min-h-8 min-w-0 flex-1 items-center justify-end gap-2 text-[11px] text-[#8B8175] sm:min-h-10" onClick={() => setShowInfo(!showInfo)}><span>食材與保存資訊</span>{!statusError && statusText && <span className="truncate">{statusText}</span>}<span aria-hidden="true">{showInfo ? '−' : '＋'}</span></button>}
          </div>
          {showBought && !!bought && <fieldset disabled={disabled} id={boughtId}>{boughtItems.map(i => renderItem(i, 'bought'))}{boughtExtras.map(renderExtra)}</fieldset>}
          {showInfo && <div id={infoId} className="space-y-4 pb-4 text-sm text-[#756B5F]">
            <fieldset disabled={disabled}><OptionalIngredientChoices groups={view.optionalIngredients} /></fieldset>
            {!!view.pantry.length && <div><h3 className="mb-1 font-medium">已有食材</h3><p>{view.pantry.map(i => i.name).join('、')}</p></div>}
            {view.dietaryNotes?.map(n => <p key={n}>{n}</p>)}
            {status && <p>{status}</p>}
          </div>}
        </section>}
      </div>
    </>}
    <footer className="shrink-0 border-t border-[#EDE8DF] bg-[#FFFEFB] px-4 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] sm:px-6 sm:pt-2 sm:pb-2">
      {undo && !editor && <div role="status" className="mb-2 flex items-center justify-between gap-3 rounded-xl bg-[#F5EFE4] px-3 text-sm"><span className="min-w-0 truncate">{undo.name} 已買</span><button type="button" className={secondary} disabled={disabled} onClick={() => {
        if (undo.kind === 'ingredient') {
          const item = items.find(i => itemKey(i) === undo.key); if (item) updateItem(item, { checked: false });
        } else onChange({ ...current, extras: current.extras.map(i => i.id === undo.key ? { ...i, checked: false } : i) });
        setUndo(null);
      }}>撤銷</button></div>}
      {statusError && <p role="alert" className="mb-3 max-h-28 overflow-y-auto rounded-lg bg-red-50 p-3 text-sm text-[#9F3629]">{statusText}</p>}
      {!editor && <button type="button" className="min-h-10 w-full rounded-xl bg-[#8B593B] px-4 py-2 text-[15px] font-semibold text-white hover:bg-[#71462F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9B6035] disabled:opacity-40 sm:min-h-11" disabled={disabled || current.extras.length >= 100} onClick={() => beginEditor({ kind: 'extra', id: null })}>＋ 加入物品</button>}
      {!statusError && statusText && <p role="status" className="sr-only">{statusText}</p>}
    </footer>
  </div>;
}
