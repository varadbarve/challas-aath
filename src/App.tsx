import React, { useState } from 'react';
import type { GameState, Player } from './types';
import { getPaths } from './paths';
import GameBoard from './components/GameBoard.tsx';
import PlayerSetup from './components/PlayerSetup.tsx';
import './index.css';

const COLORS = ['#e74c3c', '#2980b9', '#f39c12', '#27ae60'];

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    players: [],
    currentPlayerIndex: 0,
    diceRoll: null,
    status: 'setup',
    winner: null,
    logs: ['Welcome to Challas Aath!'],
  });

  const handleStartGame = (names: string[]) => {
    const paths = getPaths();
    const playerPaths = [paths.player1, paths.player2, paths.player3, paths.player4];
    const initialPlayers: Player[] = names.map((name, i) => ({
      id: i,
      name,
      color: COLORS[i],
      pieces: [-1, -1, -1, -1],
      path: playerPaths[i],
      isFinished: false,
    }));
    setGameState({
      players: initialPlayers,
      currentPlayerIndex: 0,
      diceRoll: null,
      status: 'playing',
      winner: null,
      logs: [`Game started! ${names[0]}'s turn.`],
    });
  };

  if (gameState.status === 'setup') {
    return <PlayerSetup onStart={handleStartGame} />;
  }

  if (gameState.status === 'winner') {
    return (
      <div className="winner-screen">
        <div className="winner-card">
          <div className="winner-trophy">🏆</div>
          <div className="winner-title">Winner!</div>
          <div className="winner-name" style={{ color: gameState.winner?.color }}>
            {gameState.winner?.name}
          </div>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
            Congratulations — all pieces reached the center!
          </p>
          <button
            className="play-again-btn"
            onClick={() => setGameState(prev => ({
              ...prev, status: 'setup', players: [],
              currentPlayerIndex: 0, diceRoll: null, winner: null,
              logs: ['Ready for a new game!']
            }))}
          >
            Play Again
          </button>
        </div>
      </div>
    );
  }

  return <GameBoard gameState={gameState} setGameState={setGameState} />;
};

export default App;
