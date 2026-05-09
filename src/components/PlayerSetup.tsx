import React, { useState } from 'react';

interface Props { onStart: (names: string[]) => void; }

const COLORS = ['#e74c3c', '#2980b9', '#f39c12', '#27ae60'];
const EMOJIS = ['🔴', '🔵', '🟡', '🟢'];
const LABELS = ['Player 1 — Red', 'Player 2 — Blue', 'Player 3 — Yellow', 'Player 4 — Green'];

const PlayerSetup: React.FC<Props> = ({ onStart }) => {
  const [names, setNames] = useState(['Varad', 'Vinita', 'Vishal', 'Vince']);

  const change = (i: number, v: string) => {
    const n = [...names]; n[i] = v; setNames(n);
  };

  return (
    <div className="setup-screen">
      <div>
        <h1 className="setup-title">Challas Aath</h1>
        <p className="setup-subtitle">The Classic Indian Board Game</p>
      </div>

      <div className="setup-card">
        <div className="setup-grid">
          {names.map((name, i) => {
            const isVince = name === 'Vince';
            return (
              <div className="player-input-group" key={i}>
                <label
                  className={`player-input-label${isVince ? ' vince-label' : ''}`}
                  onClick={() => isVince && change(i, 'Bandari')}
                  title={isVince ? 'Click to reveal secret name!' : undefined}
                >
                  <span className="player-dot" style={{ background: COLORS[i] }} />
                  {EMOJIS[i]} {LABELS[i]}
                  {isVince && <span className="vince-badge">TAP ME!</span>}
                </label>
                <input
                  className="player-input"
                  value={name}
                  onChange={e => change(i, e.target.value)}
                  placeholder={`Name for Player ${i + 1}`}
                />
              </div>
            );
          })}
        </div>
        <button className="start-btn" onClick={() => onStart(names)}>
          ⚑ Start Game
        </button>
      </div>
    </div>
  );
};

export default PlayerSetup;
