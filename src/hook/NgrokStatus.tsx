import { useEffect, useRef, useState } from "react";
import "./NgrokStatus.css";

export default function NgrokStatus({
  onUrlReady,
}: {
  onUrlReady?: (urls: { ngrokUrl: string; localUrl: string }) => void;
}) {
  const [ngrokUrl, setNgrokUrl] = useState<string>("讀取中...");
  const [localUrl, setLocalUrl] = useState<string>("讀取中...");
  const [copied, setCopied] = useState<string | null>(null);

  const lastNgrokRef = useRef<string>("");
  const lastLocalRef = useRef<string>("");

  const lastFetchSuccess = useRef(true);

  const fetchUrl = async () => {
    try {
      const res = await fetch("http://localhost:3001/ngrok-url");
      if (!res.ok) throw new Error("伺服器回傳錯誤");
      const data = await res.json();
      const fetchedNgrok = data["ngrok-url"] || "未啟動 ngrok";
      const fetchedLocal = data["local-url"] || "未啟動本地伺服器";

      if (
        fetchedNgrok !== lastNgrokRef.current ||
        fetchedLocal !== lastLocalRef.current
      ) {
        setNgrokUrl(fetchedNgrok);
        setLocalUrl(fetchedLocal);
        onUrlReady?.({ ngrokUrl: fetchedNgrok, localUrl: fetchedLocal });

        lastNgrokRef.current = fetchedNgrok;
        lastLocalRef.current = fetchedLocal;
      }

      lastFetchSuccess.current = true;
    } catch (err) {
      if (lastFetchSuccess.current) {
        console.warn("⚠️ 無法讀取 ngrok 資訊：", err);
        setNgrokUrl("無法讀取 ngrok 資訊");
        setLocalUrl("無法讀取本地資訊");
        onUrlReady?.({
          ngrokUrl: "無法讀取 ngrok 資訊",
          localUrl: "無法讀取本地資訊",
        });
      }
      lastFetchSuccess.current = false;
    }
  };

  useEffect(() => {
    fetchUrl();
    const interval = setInterval(fetchUrl, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setTimeout(() => setCopied(null), 1500);
    } catch (err) {
      console.error("❌ 複製失敗", err);
    }
  };

  return (
    <div className="ngrok-status-container">
      <a
        title="點擊複製 ngrok 位址"
        onClick={(e) => {
          e.preventDefault();
          if (ngrokUrl.startsWith("ws")) handleCopy(ngrokUrl);
        }}
        className={`copy-link ${copied === ngrokUrl ? "copied" : ""} ${
          ngrokUrl.startsWith("ws") ? "enabled" : "disabled"
        }`}
      >
        🌐 ngrok：{ngrokUrl}
      </a>
      <a
        title="點擊複製本地位址"
        onClick={(e) => {
          e.preventDefault();
          if (localUrl.startsWith("ws")) handleCopy(localUrl);
        }}
        className={`copy-link ${copied === localUrl ? "copied" : ""} ${
          localUrl.startsWith("ws") ? "enabled" : "disabled"
        }`}
      >
        🖥️ Localhost：{localUrl}
      </a>
    </div>
  );
}
