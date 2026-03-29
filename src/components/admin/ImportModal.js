'use client';
import { useState } from 'react';

export default function ImportModal({ onClose, onSuccess }) {
  const [jsonInput, setJsonInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const handlePreview = () => {
    setError('');
    let parsed;
    try { parsed = JSON.parse(jsonInput); } catch (e) { setError('Invalid JSON format'); return; }
    const recipes = Array.isArray(parsed) ? parsed : [parsed];
    if (recipes.length === 0) { setError('No recipes to import'); return; }
    setResults({ preview: true, total: recipes.length, recipes });
  };

  const handleImport = async () => {
    if (!results?.recipes) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/recipes/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recipes: results.recipes }) });
      const data = await res.json();
      setResults(data);
      if (data.success > 0) onSuccess();
    } catch (err) { setError('Import failed'); }
    finally { setLoading(false); }
  };

  const sampleJson = `[
  { "name": "蒜蓉西蘭花", "slug": "garlic-broccoli", "cuisine": "chinese", "dish_type": "side", "difficulty": "easy", "ingredients": [{ "name": "西蘭花", "quantity": 1, "unit": "棵" }], "steps": [{ "text": "焯水備用" }] }
]`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-[#3A2010]">📥 批量匯入食譜</h2>
            <button onClick={onClose} className="text-[#AA7A50] hover:text-[#9B6035]">✕</button>
          </div>
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4">{error}</div>}
          {results ? (
            <div className="space-y-4">
              {results.preview ? (
                <>
                  <div className="bg-blue-50 p-4 rounded-lg"><p className="font-medium text-blue-800">發現 {results.total} 個食譜，確認匯入？</p></div>
                  <div className="flex gap-2">
                    <button onClick={handleImport} disabled={loading} className="flex-1 bg-[#9B6035] text-white py-3 rounded-lg hover:bg-[#7a4a2a]">{loading ? '匯入中...' : '確認匯入'}</button>
                    <button onClick={() => setResults(null)} className="px-6 py-3 border border-[#DDD0B0] rounded-lg">返回</button>
                  </div>
                </>
              ) : (
                <>
                  <div className={`p-4 rounded-lg ${results.failed === 0 ? 'bg-green-50' : 'bg-yellow-50'}`}><p className="font-medium">匯入完成：成功 {results.success} 個，失敗 {results.failed} 個</p></div>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {results.results?.map((r, i) => (<div key={i} className={`p-2 rounded ${r.success ? 'bg-green-100' : 'bg-red-100'}`}><span className={r.success ? 'text-green-700' : 'text-red-700'}>{r.success ? '✅' : '❌'} {r.name}</span>{r.error && <span className="text-red-600 text-sm ml-2">- {r.error}</span>}</div>))}
                  </div>
                  <button onClick={onClose} className="w-full bg-[#9B6035] text-white py-3 rounded-lg">關閉</button>
                </>
              )}
            </div>
          ) : (
            <>
              <p className="text-[#AA7A50] text-sm mb-2">貼上或輸入 JSON 陣列：</p>
              <textarea value={jsonInput} onChange={e => setJsonInput(e.target.value)} rows={12} className="w-full px-3 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010] font-mono text-sm" placeholder={sampleJson} />
              <div className="flex gap-2 mt-4">
                <button onClick={handlePreview} disabled={!jsonInput.trim()} className="flex-1 bg-[#9B6035] text-white py-3 rounded-lg hover:bg-[#7a4a2a] disabled:opacity-50">預覽</button>
                <button onClick={onClose} className="px-6 py-3 border border-[#DDD0B0] rounded-lg">取消</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}