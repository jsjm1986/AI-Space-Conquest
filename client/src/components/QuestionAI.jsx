import React, { useState } from 'react';

export default function QuestionAI({ onAskAI }) {
  const [aiId, setAiId] = useState('ai_1');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');

  const handleAsk = () => {
    if (!question.trim()) return;
    onAskAI({ aiId, question }, (response) => {
      setAnswer(response.answer);
    });
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h3 className="text-lg font-bold text-white mb-4">提问AI</h3>

      <select value={aiId} onChange={(e) => setAiId(e.target.value)}
              className="w-full bg-gray-700 text-white p-2 rounded mb-2">
        {[1,2,3,4,5,6,7].map(i => (
          <option key={i} value={`ai_${i}`}>AI_{i}</option>
        ))}
      </select>

      <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)}
             placeholder="输入问题..."
             className="w-full bg-gray-700 text-white p-2 rounded mb-2" />

      <button onClick={handleAsk}
              className="w-full bg-green-600 hover:bg-green-700 text-white p-2 rounded mb-2">
        提问
      </button>

      {answer && (
        <div className="bg-gray-700 p-3 rounded text-white text-sm">
          {answer}
        </div>
      )}
    </div>
  );
}
