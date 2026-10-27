# L4-B 私隱選項入口及 Google CMP 設定草案

日期：2026-10-27（香港）。本工作包未合併、未發布後台變更、未啟用廣告、未提交再審。

## 已實作

- 頁尾及私隱政策頁加入共用「管理私隱選項」按鈕；頁尾窄屏容許換行。
- 只使用已存在的 Google CMP callbackQueue / showRevocationMessage，按 Google 官方支援的 queue 機制呼叫。不自行保存同意紀錄，不初始化 stub、不載入廣告或 CMP script。
- API 缺席、stub 未就緒、queue 或回呼出錯時顯示可讀提示；不聲稱已同意或已撤回。已送出呼叫也只說要求顯示，實際選擇必須在 Google 介面完成。
- 沿用 Google 地區判斷，不以瀏覽器語言或 IP 猜測適用性，不做自製同意畫面。API 沒有提供已顯示視窗的完成回覆，本地訊息不等同成功撤回。

## 後台唯讀核對

現有訊息 European regulations message - eatwhathk.com 已發布，修改日期仍2026-05-21，英文加31語言。Consent及Manage options開啟，Do not consent與Close(do not consent)關閉，Optimize my consent message開啟。

「您的網站」對話框確認：綁定eatwhathk.com、網站名稱未填、私隱政策網址為 http://eatwhathk.com（首頁）。已取消對話框並關閉編輯器，沒有更改／儲存／發布；返回清單修改日期不變。未以預覽中的0 partners推斷實際合作夥伴設定。

## 待用戶驗收的後台設定草案

| 設定 | 擬調整／保留 |
| --- | --- |
| 套用網站 | 僅現有eatwhathk.com |
| 網站名稱 | 今晚食乜 |
| 私隱政策網址 | https://eatwhathk.com/privacy |
| 第一層選項 | Consent、Do not consent、Manage options全部開啟 |
| Do not consent地區 | 全部適用歐洲經濟區、英國及瑞士地區，不另縮窄拒絕按鈕範圍 |
| Close(do not consent) | 維持關閉，避免不必要的額外入口 |
| 語言 | 保留原有英文及31語言；不宣稱未確認的繁中覆蓋 |
| Optimize my consent message | 建議關閉，讓本次三按鈕設計較可預期；發布前另核對帳戶Maximize message coverage是否會套用fallback最佳化，不在本輪更改帳戶層設定 |
| Auto ads／廣告單元／再審 | 保持目前狀態，不在此包啟用或提交 |

草案只記錄於文件，並非已儲存到Google後台的未發布版本。發布前要以實際選項再次核對，不能保證Google所有訊息變體完全相同。

## 驗證範圍

新測試涵蓋服務缺席、不排隊延後的stub、僅經queue呼叫、queue錯誤、延後回呼錯誤。保留L4-A廣告政策測試。

待預覽檢視：頁尾及私隱政策入口、長提示排版、鍵盤操作、無新廣告script。真實EEA／UK／Swiss同意→拒絕→撤回、跨頁及重訪行為，須於實際CMP可用及受控地區環境另驗；模擬API測試不是Google端對端驗收。目前沒有活躍廣告SDK，不以入口存在宣稱CMP已生效。

## 依據

- Google Privacy & Messaging API：https://developers.google.com/funding-choices/fc-api-docs （queue調用、showRevocationMessage、服務缺席限制）
- Google AdSense建立歐洲法規訊息：https://support.google.com/adsense/answer/10960768?hl=en-GB （網站私隱政策、不同意選項）
- Google AdSense歐洲訊息說明：https://support.google.com/adsense/answer/10961068?hl=en-GB （兩／三按鈕、撤回時三選項）

## 待辦

1. 預覽驗收網站入口。
2. 按用戶批准的具體設定修改及發布既有Google訊息。
3. 合併／正式部署另按當前工作包授權。
4. 真實CMP地區與完整選擇流程驗證；保留L2收信／SMTP暫緩、L4-C內容價值待做。

自動驗證：2291 unit＋230 component＝2521通過（新5項私隱入口測試）。原22項針對入口／廣告runtime檢查亦通過。TypeScript及targeted ESLint通過。首次build因本地未設公開Supabase環境值而在collect page data停止，不計通過；後續以公開publishable key建立process-only環境重做，service-role變數僅放同一公開key滿足既有模組初始化，沒有取得或使用服務密鑰，亦不修改env檔或平台設定。
