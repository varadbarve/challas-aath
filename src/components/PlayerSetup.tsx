import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';

interface Props {
  onStart: (names: string[]) => void;
}

const PlayerSetup: React.FC<Props> = ({ onStart }) => {
  const [names, setNames] = useState(['Varad', 'Vinita', 'Vishal', 'Vince']);

  const handleNameChange = (index: number, val: string) => {
    const newNames = [...names];
    newNames[index] = val;
    setNames(newNames);
  };



  return (
    <div className="premium-card w-[400px]">
      <div className="flex items-center gap-3 mb-6">
        <UserPlus className="text-purple-400" />
        <h2 className="text-2xl font-bold">Player Setup</h2>
      </div>
      
      <div className="space-y-4 mb-8">
        {names.map((name, i) => (
          <div key={i} className="flex flex-col gap-1">
            <label 
              onClick={() => name === 'Vince' && handleNameChange(i, 'Bandari')}
              className={`text-xs text-text-muted font-medium uppercase tracking-wider ${name === 'Vince' ? 'cursor-pointer hover:text-purple-400' : ''}`}
            >
              Player {i + 1} {name === 'Vince' && '(Touch Me)'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(i, e.target.value)}
              className="bg-bg-dark border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              placeholder={`Enter name for Player ${i + 1}`}
            />
          </div>
        ))}
      </div>

      <button
        onClick={() => onStart(names)}
        className="btn-primary w-full py-4 text-lg"
      >
        Start Game
      </button>
    </div>
  );
};

export default PlayerSetup;
