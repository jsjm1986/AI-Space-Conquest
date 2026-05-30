import React from 'react';
import GameMap from './components/GameMap';
import AIStatusPanel from './components/AIStatusPanel';
import { useWebSocket } from './hooks/useWebSocket';

const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsUrl = `${wsProtocol}//${window.location.hostname}:3001`;

function App() {
  const { gameState } = useWebSocket(wsUrl);

  return (
    <div style={{ padding: '20px', background: '#111', minHeight: '100vh' }}>
      <h1 style={{ color: '#FFF', marginBottom: '20px' }}>AI太空争霸</h1>
      <div style={{ position: 'relative' }}>
        <GameMap wsUrl={wsUrl} />
        <AIStatusPanel gameState={gameState} />
      </div>
    </div>
  );
}

export default App;
