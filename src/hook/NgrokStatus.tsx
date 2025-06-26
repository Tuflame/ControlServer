import { useEffect, useRef, useState } from "react";
import "./NgrokStatus.css";

export default function NgrokStatus({
  onUrlReady,
}: {
  onUrlReady?: (url: string) => void;
}) {
  const [url, setUrl] = useState<string>("讀取中...");
  const [copied, setCopied] = useState<boolean>(false);
  const lastUrlRef = useRef<string>("");
  const lastFetchSuccess = useRef(true);

  const fetchUrl = async () => {
    try {
      const res = await fetch("http://localhost:3001/ngrok-url");
      if (!res.ok) throw new Error("伺服器回傳錯誤");
      const data = await res.json();
      const ngrokUrl = data.url || "未啟動 ngrok";

      if (ngrokUrl !== lastUrlRef.current) {
        setUrl(ngrokUrl);
        onUrlReady?.(ngrokUrl);
        lastUrlRef.current = ngrokUrl;
      }

      lastFetchSuccess.current = true;
    } catch (err) {
      if (lastFetchSuccess.current) {
        console.warn("⚠️ 無法讀取 ngrok 資訊：", err);
        setUrl("無法讀取 ngrok 資訊");
        onUrlReady?.("無法讀取 ngrok 資訊");
        lastUrlRef.current = "無法讀取 ngrok 資訊";
      }
      lastFetchSuccess.current = false;
    }
  };

  useEffect(() => {
    fetchUrl();
    const interval = setInterval(fetchUrl, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCopy = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
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
