import React, { useState } from 'react';

interface Props { onRoll: (v: number) => void; disabled: boolean; }

const Dice: React.FC<Props> = ({ onRoll, disabled }) => {
  const [shells, setShells] = useState([false, false, false, false]);
  const [rolling, setRolling] = useState(false);

  const roll = () => {
    if (disabled || rolling) return;
    setRolling(true);
    const iv = setInterval(() =>
      setShells([Math.random() > 0.5, Math.random() > 0.5, Math.random() > 0.5, Math.random() > 0.5])
    , 80);
    setTimeout(() => {
      clearInterval(iv);
      const final = [Math.random() > 0.5, Math.random() > 0.5, Math.random() > 0.5, Math.random() > 0.5];
      setShells(final);
      const open = final.filter(Boolean).length;
      const val = open === 0 ? 4 : open === 4 ? 8 : open;
      onRoll(val);
      setRolling(false);
    }, 900);
  };

  return (
    <>
      <div className="shells-tray">
        {shells.map((o, i) => (
          <div key={i} className={`shell${o ? ' open' : ''}`} />
        ))}
      </div>
      <button className="roll-btn" onClick={roll} disabled={disabled || rolling}>
        {rolling ? '🎲 Tossing…' : '🎲 Toss Shells'}
      </button>
    </>
  );
};

export default Dice;
