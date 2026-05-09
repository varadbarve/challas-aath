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
    status: 'setup',
    finishedPlayers: [],
    logs: ['Welcome to Challas Aath!'],
    turnPhase: 'rolling',
    pendingRolls: [],
    selectedRollIndex: null,
    extraRolls: 0,
    theme: 'wooden',
  });

  const handleStartGame = (names: string[]) => {
    const paths = getPaths();
    const playerPaths = [paths.player1, paths.player2, paths.player3, paths.player4];
    const initialPlayers: Player[] = names.map((name, i) => ({
      id: i,
      name,
      color: COLORS[i],
      pieces: [0, 0, 0, 0],
      path: playerPaths[i],
      isFinished: false,
    }));
    setGameState(prev => ({
      ...prev,
      players: initialPlayers,
      currentPlayerIndex: 0,
      status: 'playing',
      finishedPlayers: [],
      logs: [`Game started! ${names[0]}'s turn.`],
      turnPhase: 'rolling',
      pendingRolls: [],
      selectedRollIndex: null,
      extraRolls: 0,
    }));
  };

  if (gameState.status === 'setup') {
    return <PlayerSetup onStart={handleStartGame} />;
  }

  if (gameState.status === 'finished') {
    return (
      <div className={`winner-screen ${gameState.theme}`}>
        <div className="winner-card" style={{ padding: '2rem 3rem' }}>
          <div className="winner-trophy">🏆</div>
          <div className="winner-title" style={{ fontSize: '2rem' }}>Game Over!</div>
          <div style={{ margin: '2rem 0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {gameState.finishedPlayers.map((p, i) => {
              const rankStr = ['st', 'nd', 'rd'][i] || 'th';
              const rankColor = i === 0 ? '#f1c40f' : i === 1 ? '#bdc3c7' : i === 2 ? '#cd7f32' : '#7f8c8d';
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.8rem', borderLeft: `5px solid ${p.color}` }}>
                  <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: rankColor }}>
                    {i + 1}{rankStr}
                  </span>
                  <span style={{ fontSize: '1.4rem', fontWeight: 600, color: p.color }}>{p.name}</span>
                </div>
              );
            })}
          </div>
          <button
            className="play-again-btn"
            onClick={() => setGameState(prev => ({
              ...prev, status: 'setup', players: [], finishedPlayers: [], currentPlayerIndex: 0,
              turnPhase: 'rolling', pendingRolls: [], selectedRollIndex: null, extraRolls: 0,
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
