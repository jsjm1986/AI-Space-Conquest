import React from 'react';

export default function Timeline({ currentTick, gameDuration }) {
  const progress = (currentTick / gameDuration) * 100;
  const hours = Math.floor(currentTick / 3600);
  const minutes = Math.floor((currentTick % 3600) / 60);

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <div className="flex justify-between text-white mb-2">
        <span>游戏进度</span>
        <span>{hours}h {minutes}m</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div className="bg-blue-500 h-2 rounded-full transition-all"
             style={{ width: `${progress}%` }}></div>
      </div>
    </div>
  );
}
