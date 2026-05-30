import React from 'react';

export default function BattleLog({ battles }) {
  return (
    <div className="bg-gray-800 p-4 rounded-lg h-64 overflow-y-auto">
      <h3 className="text-lg font-bold text-white mb-4">战斗日志</h3>

      <div className="space-y-2">
        {battles.map((battle, idx) => (
          <div key={idx} className="bg-gray-700 p-2 rounded text-sm">
            <div className="text-white">
              <span className="text-red-400">{battle.attacker}</span>
              {' vs '}
              <span className="text-blue-400">{battle.defender}</span>
            </div>
            <div className="text-gray-400">
              星球: {battle.planet} | 结果: {battle.result}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
