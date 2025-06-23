import { useEffect, useState } from "react";

import "./NgrokStatus.css"; // 確保有這個 CSS 檔案來處理樣式

export default function NgrokStatus({
  onUrlReady,
}: {
  onUrlReady?: (url: string) => void;
}) {
  const [url, setUrl] = useState<string>("讀取中...");
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    let lastUrl = "";
    const fetchUrl = async () => {
      try {
        const res = await fetch("http://localhost:3001/ngrok-url");
        if (!res.ok) throw new Error("伺服器回傳錯誤");
        const data = await res.json();
        const ngrokUrl = data.url || "未啟動 ngrok";

        // 如果 ngrok URL 有變化，才更新狀態與通知上層
        if (ngrokUrl !== lastUrl) {
          setUrl(ngrokUrl);
          onUrlReady?.(ngrokUrl);
          lastUrl = ngrokUrl;
        }
      } catch (err) {
        console.error("❌ 無法讀取 ngrok 資訊", err);
        if (lastUrl !== "無法讀取 ngrok 資訊") {
          setUrl("無法讀取 ngrok 資訊");
          onUrlReady?.("無法讀取 ngrok 資訊");
          lastUrl = "無法讀取 ngrok 資訊";
        }
      }
    };

    fetchUrl(); // 第一次立即執行
    const interval = setInterval(()=>fetchUrl(), 1000); // 每 1 秒檢查一次

    return () => clearInterval(interval);
  }, []);

  const handleCopy = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault(); // 避免跳轉
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("❌ 複製失敗", err);
    }
  };

  return (
    <a
      title="點擊複製 ngrok 位址"
      onClick={url.startsWith("ws") ? handleCopy : (e) => e.preventDefault()}
      className={`copy-link ${copied ? "copied" : ""} ${
        url.startsWith("ws") ? "enabled" : "disabled"
      }`}
    >
      {url}
    </a>
  );
}
