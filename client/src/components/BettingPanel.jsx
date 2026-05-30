import React, { useState } from 'react';

export default function BettingPanel({ onPlaceBet, bettingOpen }) {
  const [betType, setBetType] = useState('winner');
  const [prediction, setPrediction] = useState('ai_1');

  const handleSubmit = () => {
    onPlaceBet({ betType, prediction, amount: 100 });
  };

  if (!bettingOpen) {
    return <div className="bg-gray-800 p-4 rounded-lg text-gray-400">下注已关闭</div>;
  }

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h3 className="text-lg font-bold text-white mb-4">下注</h3>

      <div className="space-y-3">
        <select value={betType} onChange={(e) => setBetType(e.target.value)}
                className="w-full bg-gray-700 text-white p-2 rounded">
          <option value="winner">预测冠军</option>
          <option value="top3">预测前三</option>
        </select>

        <select value={prediction} onChange={(e) => setPrediction(e.target.value)}
                className="w-full bg-gray-700 text-white p-2 rounded">
          {[1,2,3,4,5,6,7].map(i => (
            <option key={i} value={`ai_${i}`}>AI_{i}</option>
          ))}
        </select>

        <button onClick={handleSubmit}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded">
          确认下注
        </button>
      </div>
    </div>
  );
}
