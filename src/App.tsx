import React, { useState } from 'react';
import type { GameState, Player } from './types';
import { getPaths } from './paths';
import GameBoard from './components/GameBoard.tsx';
import PlayerSetup from './components/PlayerSetup.tsx';
import { Trophy, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    players: [],
    currentPlayerIndex: 0,
    diceRoll: null,
    status: 'setup',
    winner: null,
    logs: ['Welcome to Challas Aath!']
  });

  const handleStartGame = (names: string[]) => {
    const paths = getPaths();
    const colors = ['#ef4444', '#3b82f6', '#f59e0b', '#10b981']; // Red, Blue, Yellow, Green
    const playerPaths = [paths.player1, paths.player2, paths.player3, paths.player4];

    const initialPlayers: Player[] = names.map((name, i) => ({
      id: i,
      name,
      color: colors[i],
      pieces: [-1, -1, -1, -1], // All pieces at home
      path: playerPaths[i],
      isFinished: false
    }));

    setGameState({
      ...gameState,
      players: initialPlayers,
      status: 'playing',
      logs: [`Game started! ${names[0]}'s turn.`]
    });
  };

  const handleReset = () => {
    setGameState({
      players: [],
      currentPlayerIndex: 0,
      diceRoll: null,
      status: 'setup',
      winner: null,
      logs: ['Game reset.']
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <AnimatePresence mode="wait">
        {gameState.status === 'setup' && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <PlayerSetup onStart={handleStartGame} />
          </motion.div>
        )}

        {gameState.status === 'playing' && (
          <motion.div
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full flex flex-col items-center"
          >
            <GameBoard 
              gameState={gameState} 
              setGameState={setGameState} 
            />
            <button 
              onClick={handleReset}
              className="mt-8 flex items-center gap-2 text-text-muted hover:text-white transition-colors"
            >
              <RotateCcw size={18} /> Reset Game
            </button>
          </motion.div>
        )}

        {gameState.status === 'winner' && (
          <motion.div
            key="winner"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="premium-card text-center"
          >
            <Trophy size={64} className="text-primary-yellow mx-auto mb-4" />
            <h1 className="text-4xl font-bold mb-2">{gameState.winner?.name} Wins!</h1>
            <p className="text-text-muted mb-6">Congratulations on your victory!</p>
            <button onClick={handleReset} className="btn-primary">
              Play Again
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-4 left-4 max-w-xs pointer-events-none opacity-50">
        {gameState.logs.slice(-3).map((log, i) => (
          <div key={i} className="text-xs mb-1">{log}</div>
        ))}
      </div>
    </div>
  );
};

export default App;
