import { useEffect, useRef, useState } from "react";
import type { GameState } from "../game/useGameLogic";
import NgrokStatus from "./NgrokStatus";

import "./GameStateSender.css";

export default function GameStateSender({
  gamestate,
}: {
  gamestate: GameState | null;
}) {
  const [ngrokUrl, setNgrokUrl] = useState("");
  const socketRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  const handleNgrokReady = (url: string) => {
    setNgrokUrl(url);
  };

  const latestGameState = useRef<GameState | null>(null);

  useEffect(() => {
    latestGameState.current = gamestate;
  }, [gamestate]);

  useEffect(() => {
    if (!ngrokUrl.startsWith("ws")) return;

    const socket = new WebSocket(ngrokUrl);
    socketRef.current = socket;

    socket.onopen = () => setConnected(true);
    socket.onerror = () => setConnected(false);
    socket.onclose = () => setConnected(false);

    const interval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN && latestGameState.current) {
        socket.send(
          JSON.stringify({
            timestamp: Date.now(),
            payload: latestGameState.current,
          })
        );
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      socket.close();
    };
  }, [ngrokUrl]);

  return (
    <div className="status-indicator">
      <NgrokStatus onUrlReady={handleNgrokReady} />
      <p className={`${connected ? "connected" : "disconnected"}`}>
        {connected ? " 已連線" : " 未連線"}
      </p>
    </div>
  );
}
