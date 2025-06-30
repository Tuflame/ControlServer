import { useEffect, useRef, useState } from "react";
import type { GameState } from "../game/useGameLogic";
import NgrokStatus from "./NgrokStatus";
import "./GameStateSender.css";

export default function GameStateSender({
  gamestate,
}: {
  gamestate: GameState | null;
}) {
  const [connected, setConnected] = useState(false);
  const [usingNgrok, setUsingNgrok] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const sendIntervalRef = useRef<number | null>(null);
  const latestGameState = useRef<GameState | null>(null);
  const localUrlRef = useRef("");
  const ngrokUrlRef = useRef("");

  // 當收到新的 gameState 更新時記錄
  useEffect(() => {
    latestGameState.current = gamestate;
  }, [gamestate]);

  // 清除目前的 socket 與送資料間隔
  const cleanupSocket = () => {
    sendIntervalRef.current && clearInterval(sendIntervalRef.current);
    sendIntervalRef.current = null;

    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
  };

  // 嘗試連線：優先 localhost，失敗再試 ngrok
  const connectWithFallback = (localWs: string, ngrokWs: string) => {
    cleanupSocket();

    const tryConnect = (url: string, fallback?: string) => {
      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => {
        setConnected(true);
        setUsingNgrok(url === ngrokWs);

        sendIntervalRef.current = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN && latestGameState.current) {
            socket.send(
              JSON.stringify({
                timestamp: Date.now(),
                payload: latestGameState.current,
              })
            );
          }
        }, 2500);
      };

      socket.onerror = () => {
        console.warn("❌ WebSocket 連線錯誤:", url);
        setConnected(false);
        socket.close();

        if (fallback && url !== fallback) {
          console.log("🔁 改嘗試連線 ngrok...");
          tryConnect(fallback);
        }
      };

      socket.onclose = () => {
        setConnected(false);
      };
    };

    if (localWs.startsWith("ws")) {
      tryConnect(localWs, ngrokWs);
    } else if (ngrokWs.startsWith("ws")) {
      tryConnect(ngrokWs);
    }
  };

  const handleNgrokReady = ({
    ngrokUrl,
    localUrl,
  }: {
    ngrokUrl: string;
    localUrl: string;
  }) => {
    const localWs = localUrl.replace(/^http/, "ws");
    const ngrokWs = ngrokUrl.startsWith("ws") ? ngrokUrl : "";

    localUrlRef.current = localWs;
    ngrokUrlRef.current = ngrokWs;

    connectWithFallback(localWs, ngrokWs);
  };

  // 清理連線（unmount）
  useEffect(() => {
    return () => {
      cleanupSocket();
    };
  }, []);

  return (
    <div className="status-indicator">
      <p className={connected ? "connected" : "disconnected"}>
        {connected
          ? usingNgrok
            ? "已連線（ngrok）"
            : "已連線（localhost）"
          : "未連線"}
      </p>
      <NgrokStatus onUrlReady={handleNgrokReady} />
    </div>
  );
}
