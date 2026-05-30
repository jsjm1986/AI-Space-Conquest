import React from 'react';

export default function DiplomacyGraph({ ais }) {
  const getRelationColor = (status) => {
    const colors = { ally: '#00ff00', war: '#ff0000', neutral: '#888888', trade: '#ffff00' };
    return colors[status] || '#888888';
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h3 className="text-lg font-bold text-white mb-4">外交关系</h3>
      <div className="space-y-2">
        {ais.map(ai => (
          <div key={ai.id} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ai.color }}></div>
            <span className="text-white text-sm">{ai.name}</span>
            <div className="flex gap-1 ml-auto">
              {Object.entries(ai.diplomacy || {}).map(([targetId, status]) => (
                <div key={targetId} className="w-2 h-2 rounded-full"
                     style={{ backgroundColor: getRelationColor(status) }}
                     title={`${targetId}: ${status}`}></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
