import React from 'react';

const AIStatusPanel = ({ gameState }) => {
  const ais = gameState?.ais || gameState?.aiStates;
  if (!ais) return null;

  const getAIColor = (aiId) => {
    const colors = {
      ai_1: '#FF0000', ai_2: '#0000FF', ai_3: '#00FF00',
      ai_4: '#FF00FF', ai_5: '#FFFF00', ai_6: '#00FFFF', ai_7: '#FFA500'
    };
    return colors[aiId] || '#FFF';
  };

  const aiList = Object.values(ais).sort((a, b) =>
    (b.planets?.length || 0) - (a.planets?.length || 0)
  );

  return (
    <div style={{
      position: 'absolute',
      top: 10,
      right: 10,
      background: 'rgba(0,0,0,0.8)',
      padding: '10px',
      borderRadius: '5px',
      color: '#FFF',
      minWidth: '200px'
    }}>
      <h3 style={{ margin: '0 0 10px 0' }}>AI排名</h3>
      {aiList.map((ai, index) => (
        <div key={ai.id} style={{
          marginBottom: '8px',
          padding: '5px',
          borderLeft: `3px solid ${getAIColor(ai.id)}`
        }}>
          <div style={{ fontWeight: 'bold' }}>#{index + 1} {ai.name}</div>
          <div style={{ fontSize: '12px' }}>
            星球: {ai.planets?.length || 0} | 舰队: {ai.fleets?.length || 0}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AIStatusPanel;
