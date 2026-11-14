# PrepMeal：100個食譜網址改名方案

狀態：正式資料庫只讀預檢完成；改名 SQL 只在本地測試資料庫執行，尚未套用 Production。

## 核對結果

- 目標：PrepMeal，Supabase `hivnajhqqvaokthzhugx`。
- 預檢時間：見 `preflight.json` 的 `checked_at`（UTC；香港／台灣時間加8小時）。
- 以可讀取全部資料的 postgres 角色核對：304道食譜，303道公開、1道未公開。
- 原 PR #173 的100個舊網址全部存在、公開，食譜 UUID 與已審閱目錄一致。
- 100個新網址互不重複；包括未公開資料在內，沒有任何新網址被佔用。
- `recipes.slug` 有唯一約束；材料、步驟、收藏及餐單項目以 recipe UUID 關聯，不改 UUID。
- 正式站已部署 #173，基準 commit `bb7eb5ffca3034bee2ae4a23b6938b64dc6fbc18`。

## 審閱檔案

| 檔案 | 用途 |
| --- | --- |
| preflight.json | 100組 UUID、菜名、舊／新網址及內容指紋 |
| rename.sql | 原子交易草稿；現階段不會自動執行 |
| verify.sql | 執行前／後的只讀狀態及衝突核對 |
| ../../../tests/recipeSlugRenameTransaction.test.ts | 交易 guard、重跑及失敗回滾測試 |

## 實際改動範圍

只 UPDATE `recipes.slug`。既有 `trg_recipes_updated_at` 會自動更新受影響100道菜的 `updated_at`，不停用 trigger、不偽造或倒退時間；因此 sitemap 的 lastmod 亦會反映網址資料更新。營養、材料、步驟、來源、公開狀態與 UUID 不變。

內容指紋略過 slug、updated_at、times_shown，容許正常展示次數在預檢後增加；交易內另外比較所有非 slug／updated_at 欄位，確保不重設展示次數或改變食譜內容。

交易先取得短時間 SHARE ROW EXCLUSIVE 鎖，阻止 recipes 同時被新增／修改／刪除，普通 SELECT 仍可執行。lock_timeout 3秒、statement_timeout 30秒。無法及時取鎖便停止，不能無限重試。

任一 UUID、菜名、公開狀態、內容指紋不符，或新網址已佔用、出現部分改名，整批停止。已全部改名則安全 no-op。成功必須正好100道，並通過更新後欄位比較。

## 執行順序（待批准）

1. 核對當時 main／Production 仍含 #173 相容程式碼；讀取最新304道或當時全部資料，重跑 verify.sql，重新檢查 trigger／唯一約束，確認沒有新增衝突。若內容已變，重新產生及審閱指紋，不手改 guard 讓它通過。
2. 確認 Vercel 正確 team `gumleidaaiwoks-projects`、project `prj_9fUZ5MYnJmX28bp6Vma6ocCBxJEE` 的清快取權限及操作可用，再進行資料變更。執行前不要預熱100個尚未存在的新網址，以免留下404快取。
3. 執行完整 rename.sql，不拆開交易、不移除檢查。若工具報錯或結果不明，先只讀核對狀態；不可假設全部失敗或盲目再跑。
4. 立即執行 verify.sql：100個相同 UUID 都在新網址、舊網址沒有資料列、沒有衝突／指紋變動。資料列總數不應因本交易改變。
5. 清除該 Vercel project 的 CDN 與 Data／ISR 快取。可在 dashboard 操作，或先核對已安裝 CLI 的 `vercel cache --help`，確認 scope／linked project 後使用官方 `vercel cache purge`。本輪沒有執行或實測清快取指令；權限／版本仍須在執行前確認。清快取不是改完資料庫便自動完成，重新部署亦不當作清快取證據。
6. 有限併發驗收全部100組正式網址：新網址200、菜名與 UUID 正確、canonical 為新網址；舊網址第一跳308，Location 精確指向對應新網址，沒有鏈／循環。若仍回傳快取200或404，檢查回應快取狀態並完成正確失效處理，不能只等五分鐘便宣稱通過。
7. 核對 sitemap：303個公開食譜或當時公開總數，100個新網址存在，100個舊網址消失；頁面清單、相關食譜、首頁七組與指南連結使用目前網址。
8. 瀏覽器抽測：舊連結→新食譜→返回；首頁輪換／清單；五晚兩次買餸示例；用 UUID 讀取的收藏／保存餐單資料相同。真實帳戶寫入須另外清楚記錄是否有執行。
9. 重讀資料庫確認沒有非預期欄位改動，記錄 SQL 結果、部署 SHA、100組 HTTP 驗收與未執行項目，才標示 rollout 完成。

## 快取盤點

| 範圍 | 目前程式碼設定 | 對安排的影響 |
| --- | --- | --- |
| 食譜 HTML | ISR 300秒 | 過期後第一次請求仍可能拿到舊版本；須驗證 regenerated response |
| 首頁／指南 | ISR 300秒 | 暫存目錄／舊連結須更新；舊頁連結仍可經308開啟 |
| 食譜列表 API | s-maxage 60，stale-while-revalidate 600秒 | 清 CDN 後檢查連結及 slug |
| 食譜詳情 API | s-maxage 300，stale-while-revalidate 86400秒 | 舊快取可能仍帶舊 slug；應核對 UUID 一致並刷新 |
| sitemap | browser max-age 3600，CDN s-maxage 86400秒 | 獨立驗證 sitemap，不能從首頁已更新推斷 |
| 使用者瀏覽器 | 可能永久快取308；另有本地草稿／目錄 | 伺服器清快取不能撤回已快取308；新網址必須持續可讀 |

目前永久轉址只在食譜 HTML page 實作；不要承諾 `/api/recipes/<舊slug>` 也會308。站內 modal 按 UUID 載入，收藏／餐單以 UUID 為關聯；不以變更 UUID 解決網址問題。

## 失敗與復原

### 交易尚未提交

SQL 錯誤會回滾整批改名及 trigger 的 updated_at。若執行器留下 failed transaction，先 ROLLBACK，再重新只讀核對，不接著執行其他修改。

### 已提交，但快取或網站有問題

優先保留100個新 slug，修正／重新部署相容程式碼、清除正確層的快取並重跑驗收。這是本方案預設的復原方向，因為新網址可能已被分享或已接收永久308流量。

**不能單獨將資料庫 slug 改回舊值，也不能直接 rollback 到 #173 之前的程式碼。** 有些瀏覽器已把舊網址308到新網址；新網址若變404，清伺服器快取亦救不到這些瀏覽器。

若真的必須還原資料庫：

1. 先準備並另外審閱一個復原相容版本，讓每個新網址在資料庫仍用舊值時，也能以相同 UUID 回傳200（不從新網址反向 redirect 到舊網址，避免與已快取的舊→新308形成循環）。這個額外版本尚未實作，本次不聲稱已有可立即套用的資料庫反向復原。
2. 在隔離資料驗證100組新／舊網址、canonical、首頁／指南、收藏／餐單，以及已快取308的瀏覽器流程。
3. 相容版本先部署並確認可用後，再產生以當時 UUID、新 slug、最新內容為條件的反向交易；重新核對舊 slug 沒被其他資料佔用，取得批准後執行。
4. 新網址繼續可讀，清快取、重驗 sitemap、100組連結及使用者流程。不要移除新網址支援或倒退 updated_at。

## 本輪驗證與限制

- 正式 Supabase：只讀角色／結構／唯一約束／trigger／100組身份／全部資料衝突查詢。
- 本地 PGlite：8項交易測試，覆蓋全部改名、重跑、私有目標衝突、內容變動、公開狀態變動、缺少身份、部分狀態、trigger 造成意外內容修改及正常展示次數保留。
- 沒有在 Production UPDATE、沒有改 schema／RLS／認證，亦沒有建立 migration history。
- 尚未執行：正式改名、正式308全量HTTP驗收、正式快取清除、復原相容版本、實體手機及真實帳戶寫入。

## 參考

- https://www.postgresql.org/docs/17/explicit-locking.html
- https://supabase.com/docs/guides/database/tables
- https://nextjs.org/docs/pages/guides/incremental-static-regeneration
- https://vercel.com/docs/cli/cache
