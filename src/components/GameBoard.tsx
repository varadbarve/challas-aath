import React from 'react';
import type { GameState } from '../types';
import { isSafe, GRID_SIZE } from '../types';
import Dice from './Dice.tsx';
import { motion } from 'framer-motion';

interface Props {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
}

const GameBoard: React.FC<Props> = ({ gameState, setGameState }) => {
  const { players, currentPlayerIndex, diceRoll } = gameState;
  const currentPlayer = players[currentPlayerIndex];

  const handleRoll = (value: number) => {
    // Check if any move is possible
    const hasPossibleMove = currentPlayer.pieces.some(pos => {
      if (pos === -1) return value === 1 || value === 8; // Usually need 1 or 8 to start
      return pos + value < currentPlayer.path.length;
    });

    setGameState(prev => ({
      ...prev,
      diceRoll: value,
      logs: [...prev.logs, `${currentPlayer.name} rolled a ${value}.`]
    }));

    if (!hasPossibleMove && currentPlayer.pieces.every(p => p !== -1 || (value !== 1 && value !== 8))) {
        // Auto skip if no pieces are out and didn't roll a start number
        setTimeout(() => nextTurn(), 1500);
    }
  };

  const nextTurn = () => {
    setGameState(prev => ({
      ...prev,
      currentPlayerIndex: (prev.currentPlayerIndex + 1) % prev.players.length,
      diceRoll: null
    }));
  };

  const movePiece = (pieceIndex: number) => {
    if (diceRoll === null) return;

    const currentPos = currentPlayer.pieces[pieceIndex];
    let newPos = -1;

    if (currentPos === -1) {
      if (diceRoll === 1 || diceRoll === 8) {
        newPos = 0;
      } else {
        return; // Can't move piece out
      }
    } else {
      newPos = currentPos + diceRoll;
    }

    if (newPos >= currentPlayer.path.length) return; // Can't over-shoot center

    const targetCoords = currentPlayer.path[newPos];
    
    // Logic for capturing
    const newPlayers = [...players];
    const updatedCurrentPlayer = { ...currentPlayer };
    updatedCurrentPlayer.pieces = [...updatedCurrentPlayer.pieces];
    updatedCurrentPlayer.pieces[pieceIndex] = newPos;
    newPlayers[currentPlayerIndex] = updatedCurrentPlayer;

    // Check for capture
    if (!isSafe(targetCoords[0], targetCoords[1])) {
      newPlayers.forEach((p, pIdx) => {
        if (pIdx === currentPlayerIndex) return;
        const updatedPieces = p.pieces.map((pos) => {
          if (pos === -1) return -1;
          const coords = p.path[pos];
          if (coords[0] === targetCoords[0] && coords[1] === targetCoords[1]) {
             setGameState(prev => ({ ...prev, logs: [...prev.logs, `${currentPlayer.name} captured ${p.name}!`]}));
             return -1; // Send back home
          }
          return pos;
        });
        newPlayers[pIdx] = { ...p, pieces: updatedPieces };
      });
    }

    // Check for win
    const allFinished = updatedCurrentPlayer.pieces.every(p => p === updatedCurrentPlayer.path.length - 1);
    
    if (allFinished) {
      setGameState(prev => ({
        ...prev,
        players: newPlayers,
        status: 'winner',
        winner: updatedCurrentPlayer
      }));
    } else {
      setGameState(prev => ({
        ...prev,
        players: newPlayers,
        currentPlayerIndex: (prev.currentPlayerIndex + 1) % prev.players.length,
        diceRoll: null
      }));
    }
  };

  const renderCell = (r: number, c: number) => {
    const safe = isSafe(r, c);
    
    // Find pieces on this cell
    const piecesOnCell: { playerIndex: number; pieceIndex: number; color: string }[] = [];
    players.forEach((p, pIdx) => {
      p.pieces.forEach((pos, pieceIndex) => {
        if (pos === -1) return;
        const coords = p.path[pos];
        if (coords[0] === r && coords[1] === c) {
          piecesOnCell.push({ playerIndex: pIdx, pieceIndex, color: p.color });
        }
      });
    });

    return (
      <div key={`${r}-${c}`} className={`cell ${safe ? 'safe' : ''}`}>
        <div className="flex flex-wrap justify-center items-center gap-1 p-1">
          {piecesOnCell.map((p) => (
            <motion.div
              key={`${p.playerIndex}-${p.pieceIndex}`}
              layoutId={`piece-${p.playerIndex}-${p.pieceIndex}`}
              className="piece w-6 h-6 sm:w-8 sm:h-8"
              style={{ backgroundColor: p.color }}
              onClick={() => p.playerIndex === currentPlayerIndex && movePiece(p.pieceIndex)}
              whileHover={p.playerIndex === currentPlayerIndex ? { scale: 1.2 } : {}}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="board-container">
      <div className="player-info">
        {players.map((p, i) => (
          <div 
            key={i} 
            className={`player-card ${i === currentPlayerIndex ? 'active' : 'opacity-40'}`}
            style={{ color: p.color }}
          >
            <div className="font-bold text-lg">{p.name}</div>
            <div className="text-xs flex gap-1 mt-1">
               {p.pieces.map((pos, pi) => (
                 <div 
                   key={pi} 
                   className="w-3 h-3 rounded-full" 
                   style={{ backgroundColor: pos === -1 ? 'gray' : p.color, border: '1px solid white' }}
                   onClick={() => i === currentPlayerIndex && movePiece(pi)}
                 />
               ))}
            </div>
          </div>
        ))}
      </div>

      <div className="board-grid">
        {Array.from({ length: GRID_SIZE }).map((_, r) => (
          Array.from({ length: GRID_SIZE }).map((_, c) => renderCell(r, c))
        ))}
      </div>

      <div className="flex flex-col items-center gap-6">
        {diceRoll !== null && (
          <div className="text-2xl font-bold animate-bounce">
            Roll: {diceRoll} - Select a piece to move
          </div>
        )}
        <Dice onRoll={handleRoll} disabled={diceRoll !== null} />
      </div>
    </div>
  );
};

export default GameBoard;
