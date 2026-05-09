import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface Props {
  onRoll: (value: number) => void;
  disabled: boolean;
}

const Dice: React.FC<Props> = ({ onRoll, disabled }) => {
  const [shells, setShells] = useState([false, false, false, false]);
  const [isRolling, setIsRolling] = useState(false);

  const roll = () => {
    if (disabled || isRolling) return;
    
    setIsRolling(true);
    
    // Animate rolling effect
    const interval = setInterval(() => {
      setShells([Math.random() > 0.5, Math.random() > 0.5, Math.random() > 0.5, Math.random() > 0.5]);
    }, 100);

    setTimeout(() => {
      clearInterval(interval);
      const finalShells = [Math.random() > 0.5, Math.random() > 0.5, Math.random() > 0.5, Math.random() > 0.5];
      setShells(finalShells);
      
      const openCount = finalShells.filter(s => s).length;
      let value = openCount;
      if (openCount === 0) value = 4;
      else if (openCount === 4) value = 8;
      
      onRoll(value);
      setIsRolling(false);
    }, 800);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="dice-tray">
        {shells.map((isOpen, i) => (
          <motion.div
            key={i}
            className={`shell ${isOpen ? 'open' : ''}`}
            animate={isRolling ? { 
              rotate: [0, 90, 180, 270, 360],
              y: [0, -20, 0]
            } : {}}
            transition={{ duration: 0.4, repeat: isRolling ? Infinity : 0 }}
          />
        ))}
      </div>
      
      <button
        onClick={roll}
        disabled={disabled || isRolling}
        className={`btn-primary px-10 py-3 text-xl ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
      >
        {isRolling ? 'Rolling...' : 'Roll Shells'}
      </button>
    </div>
  );
};

export default Dice;
