import { useEffect, useRef, useState } from 'react';

export const useWebSocket = (url) => {
  const [gameState, setGameState] = useState(null);
  const [connected, setConnected] = useState(false);
  const ws = useRef(null);

  useEffect(() => {
    ws.current = new WebSocket(url);

    ws.current.onopen = () => setConnected(true);
    ws.current.onclose = () => setConnected(false);

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'game_state') {
        setGameState(data.data);
      } else if (data.type === 'gameState') {
        setGameState(data.state);
      }
    };

    return () => ws.current?.close();
  }, [url]);

  const send = (data) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data));
    }
  };

  return { gameState, connected, send };
};
