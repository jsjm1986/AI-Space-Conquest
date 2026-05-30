import React, { useRef, useEffect, useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { RenderEngine } from './RenderEngine';

const defaultWsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const defaultWsUrl = `${defaultWsProtocol}//${window.location.hostname}:3001`;

const GameMap = ({ wsUrl = defaultWsUrl }) => {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const { gameState, connected } = useWebSocket(wsUrl);
  const [prevFleets, setPrevFleets] = useState({});

  useEffect(() => {
    if (canvasRef.current && !engineRef.current) {
      engineRef.current = new RenderEngine(canvasRef.current);
    }
  }, []);

  useEffect(() => {
    if (!gameState || !engineRef.current) return;

    const engine = engineRef.current;
    engine.clear();

    if (gameState.planets) {
      gameState.planets.forEach(planet => engine.drawPlanet(planet));
    }

    if (gameState.fleets) {
      gameState.fleets.forEach(fleet => {
        engine.drawFleet(fleet);

        const prev = prevFleets[fleet.id];
        if (prev && prev.owner !== fleet.owner) {
          engine.addBattle(fleet.position.x, fleet.position.y);
        }
      });

      setPrevFleets(
        gameState.fleets.reduce((acc, f) => ({ ...acc, [f.id]: { owner: f.owner } }), {})
      );
    }

    engine.updateAnimations();
  }, [gameState, prevFleets]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (engineRef.current) {
        engineRef.current.updateAnimations();
      }
    }, 50);

    return () => clearInterval(interval);
  }, []);

  const handleWheel = (e) => {
    e.preventDefault();
    if (!engineRef.current) return;

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.5, Math.min(2, engineRef.current.camera.zoom * delta));
    engineRef.current.setCamera(
      engineRef.current.camera.x,
      engineRef.current.camera.y,
      newZoom
    );
  };

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', top: 10, left: 10, color: connected ? '#0F0' : '#F00' }}>
        {connected ? '已连接' : '未连接'}
      </div>
      <canvas
        ref={canvasRef}
        width={1600}
        height={1600}
        onWheel={handleWheel}
        style={{ border: '1px solid #333', background: '#000' }}
      />
    </div>
  );
};

export default GameMap;
