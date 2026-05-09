import React, { useState, useEffect, useRef } from 'react';
import type { GameState } from '../types';
import { isSafe } from '../types';
import Dice from './Dice.tsx';
import { soundEngine } from '../utils/SoundEngine';
import Confetti from './Confetti';

interface Props {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
}

const PLAYER_COLORS = ['#e74c3c', '#2980b9', '#f39c12', '#27ae60'];
const PLAYER_LIGHT  = ['#ff6b6b', '#5dade2', '#f9ca24', '#55efc4'];
const PLAYER_EMOJI  = ['🔴', '🔵', '🟡', '🟢'];
const CENTER_IDX    = 23;

const ENTRY_ARROWS: { [key: string]: { color: string; arrow: string; pi: number; size?: string }[] } = {
  '3-1': [{ color: PLAYER_COLORS[0], arrow: '↑', pi: 0 }],
  '1-1': [{ color: PLAYER_COLORS[3], arrow: '→', pi: 3 }],
  '1-3': [{ color: PLAYER_COLORS[2], arrow: '↓', pi: 2 }],
  '3-3': [{ color: PLAYER_COLORS[1], arrow: '←', pi: 1 }],
  '3-2': [{ color: PLAYER_COLORS[0], arrow: '↑', pi: 0, size: 'small' }],
  '2-1': [{ color: PLAYER_COLORS[3], arrow: '→', pi: 3, size: 'small' }],
  '1-2': [{ color: PLAYER_COLORS[2], arrow: '↓', pi: 2, size: 'small' }],
  '2-3': [{ color: PLAYER_COLORS[1], arrow: '←', pi: 1, size: 'small' }],
};

const GameBoard: React.FC<Props> = ({ gameState, setGameState }) => {
  const { players, currentPlayerIndex, finishedPlayers, turnPhase, pendingRolls, selectedRollIndex, extraRolls, theme } = gameState;
  const cur = players[currentPlayerIndex];
  const boardRef = useRef<HTMLDivElement>(null);
  const [cellPositions, setCellPositions] = useState<{ [key: string]: { x: number; y: number } }>({});
  const [showConfetti, setShowConfetti] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const addLog = (msg: string) =>
    setGameState(prev => ({ ...prev, logs: [...prev.logs.slice(-19), msg] }));

  const vibrate = (ms: number = 50) => {
    if (navigator.vibrate) navigator.vibrate(ms);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const updatePositions = () => {
      if (!boardRef.current) return;
      const cells = boardRef.current.querySelectorAll('.cell');
      const boardRect = boardRef.current.getBoundingClientRect();
      const newPos: { [key: string]: { x: number; y: number } } = {};
      cells.forEach((cell, i) => {
        const r = Math.floor(i / 5);
        const c = i % 5;
        const rect = cell.getBoundingClientRect();
        newPos[`${r}-${c}`] = {
          x: rect.left - boardRect.left + rect.width / 2,
          y: rect.top - boardRect.top + rect.height / 2,
        };
      });
      setCellPositions(newPos);
    };
    updatePositions();
    window.addEventListener('resize', updatePositions);
    return () => window.removeEventListener('resize', updatePositions);
  }, []);

  const handleRoll = (value: number) => {
    soundEngine.playDice();
    vibrate(30);
    const newPending = [...pendingRolls, value];
    let nextPhase = turnPhase;
    addLog(`${cur.name} rolled a ${value}`);

    if (value === 4 || value === 8) {
      nextPhase = 'rolling';
    } else {
      nextPhase = 'moving';
    }

    let nextSelected = selectedRollIndex;
    if (nextPhase === 'moving') {
      const anyUsable = newPending.some(r =>
        cur.pieces.some((pos) => {
          if (pos === CENTER_IDX) return false;
          const nextPos = pos + r;
          if (nextPos > CENTER_IDX) return false;
          if (nextPos >= 15 && !cur.hasKill) return false;
          return true;
        })
      );
      if (!anyUsable) {
        addLog(`${cur.name} has no valid moves.`);
        setTimeout(() => {
          setGameState(prev => {
            if (prev.extraRolls > 0) return { ...prev, turnPhase: 'rolling', pendingRolls: [], selectedRollIndex: null, extraRolls: prev.extraRolls - 1 };
            let n = (prev.currentPlayerIndex + 1) % prev.players.length;
            while (prev.players[n].isFinished) n = (n + 1) % prev.players.length;
            return { ...prev, currentPlayerIndex: n, turnPhase: 'rolling', pendingRolls: [], selectedRollIndex: null, extraRolls: 0 };
          });
        }, 1200);
      } else {
        nextSelected = newPending.length === 1 ? 0 : null;
      }
    }
    setGameState(prev => ({ ...prev, pendingRolls: newPending, turnPhase: nextPhase, selectedRollIndex: nextSelected }));
  };

  const movePiece = (pieceIndex: number) => {
    if (turnPhase !== 'moving' || selectedRollIndex === null) return;
    const roll = pendingRolls[selectedRollIndex];
    const currentPos = cur.pieces[pieceIndex];
    if (currentPos === CENTER_IDX) return;
    const newPos = currentPos + roll;
    if (newPos > CENTER_IDX) return;
    if (newPos >= 15 && !cur.hasKill) {
      addLog(`${cur.name} needs a capture to enter the inner circle!`);
      return;
    }

    soundEngine.playMove();
    vibrate(20);

    const targetCoords = cur.path[newPos];
    let newPlayers = [...players];
    let gotKill = false;

    if (!isSafe(targetCoords[0], targetCoords[1])) {
      newPlayers = newPlayers.map((p, pi) => {
        if (pi === currentPlayerIndex || p.isFinished) return p;
        let captured = false;
        const np = p.pieces.map(pos => {
          const [r, c] = p.path[pos];
          if (pos !== CENTER_IDX && r === targetCoords[0] && c === targetCoords[1]) {
            captured = true;
            return 0;
          }
          return pos;
        });
        if (captured) {
          gotKill = true;
          soundEngine.playCapture();
          vibrate(100);
        }
        return { ...p, pieces: np };
      });
    }

    newPlayers = newPlayers.map((p, pi) => {
      if (pi !== currentPlayerIndex) return p;
      const np = [...p.pieces];
      np[pieceIndex] = newPos;
      return { ...p, pieces: np, hasKill: p.hasKill || gotKill };
    });

    if (gotKill) addLog(`${cur.name} captured a piece! ⚔️`);

    let newFinishedPlayers = [...finishedPlayers];
    const updatedCur = newPlayers[currentPlayerIndex];

    if (updatedCur.pieces.every(p => p === CENTER_IDX) && !updatedCur.isFinished) {
      updatedCur.isFinished = true;
      newFinishedPlayers.push(updatedCur);
      addLog(`${updatedCur.name} finished! 🎉`);
      soundEngine.playWin();
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }

    if (newFinishedPlayers.length === newPlayers.length - 1) {
      const lastPlayer = newPlayers.find(p => !p.isFinished)!;
      lastPlayer.isFinished = true;
      newFinishedPlayers.push(lastPlayer);
      setGameState(prev => ({ ...prev, players: newPlayers, status: 'finished', finishedPlayers: newFinishedPlayers }));
      return;
    }

    let newPending = pendingRolls.filter((_, i) => i !== selectedRollIndex);
    const newExtra = extraRolls + (gotKill ? 1 : 0);
    const nextState: Partial<GameState> = { players: newPlayers, finishedPlayers: newFinishedPlayers, pendingRolls: newPending, extraRolls: newExtra, selectedRollIndex: newPending.length === 1 ? 0 : null };

    if (newPending.length === 0) {
      if (newExtra > 0) {
        nextState.turnPhase = 'rolling';
        nextState.extraRolls = newExtra - 1;
        addLog(`${cur.name} gets an extra roll!`);
      } else {
        let n = (currentPlayerIndex + 1) % newPlayers.length;
        while (newPlayers[n].isFinished) n = (n + 1) % newPlayers.length;
        nextState.currentPlayerIndex = n;
        nextState.turnPhase = 'rolling';
      }
    }
    setGameState(prev => ({ ...prev, ...nextState }));
  };

  return (
    <div className={`game-screen ${theme}`}>
      {showConfetti && <Confetti />}
      
      {/* Glow Follow Effect for Glass Theme */}
      {theme === 'glass' && (
        <div 
          className="glass-glow" 
          style={{ 
            left: mousePos.x, 
            top: mousePos.y,
            position: 'fixed',
            width: '600px',
            height: '600px',
            background: 'radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 0
          }}
        />
      )}

      <div className="game-topbar">
        <div className="game-logo">Challas Aath</div>
        <div className="turn-name" style={{ color: PLAYER_COLORS[currentPlayerIndex] }}>{PLAYER_EMOJI[currentPlayerIndex]} {cur.name}'s Turn</div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="theme-toggle-btn" onClick={() => setGameState(p => ({ ...p, theme: p.theme === 'wooden' ? 'glass' : 'wooden' }))}>{theme === 'wooden' ? '🌙' : '🪵'}</button>
          <button className="reset-btn" onClick={() => window.location.reload()}>Reset</button>
        </div>
      </div>

      <div className="game-main">
        <div className="side-panel">
          {players.slice(0, 2).map((p, i) => (
            <div key={i} className={`player-card ${i === currentPlayerIndex ? 'active' : ''}`} style={{ '--player-color': PLAYER_COLORS[i] } as any}>
              <div className="player-avatar" style={{ background: PLAYER_COLORS[i] }}>{PLAYER_EMOJI[i]}</div>
              <div className="player-name-card">{p.name} {p.hasKill && '⚔️'}</div>
            </div>
          ))}
        </div>

        <div className="board-wrapper">
          <div className="board-outer">
            <div className="board-grid" ref={boardRef}>
              {Array.from({ length: 25 }, (_, i) => {
                const r = Math.floor(i / 5); const c = i % 5;
                const cellKey = `${r}-${c}`; const arrows = ENTRY_ARROWS[cellKey] || [];
                return (
                  <div key={cellKey} className={`cell${r === 2 && c === 2 ? ' center' : isSafe(r, c) ? ' safe' : ''}`}>
                    {arrows.map(({ color, arrow, pi, size }, i) => (
                      <span key={`arrow-${pi}-${i}`} className={`entry-arrow ${size === 'small' ? 'small-entry' : 'turn-arrow'}`} style={{ color }}>{arrow}</span>
                    ))}
                  </div>
                );
              })}
            </div>
            
            <div className="piece-layer">
              {players.map((p, pi) => p.pieces.map((pos, pIdx) => {
                if (p.isFinished && pos === CENTER_IDX) return null;
                const [r, c] = p.path[pos];
                const coords = cellPositions[`${r}-${c}`];
                if (!coords) return null;
                const piecesInCell = players.flatMap((op, oPi) => op.pieces.map((opos, oIdx) => ({ oPi, oIdx, pos: opos }))).filter(it => {
                   const [or, oc] = players[it.oPi].path[it.pos];
                   return or === r && oc === c;
                });
                const rank = piecesInCell.findIndex(it => it.oPi === pi && it.oIdx === pIdx);
                const xOff = piecesInCell.length > 1 ? (rank - (piecesInCell.length - 1) / 2) * 12 : 0;
                const yOff = piecesInCell.length > 1 ? (rank - (piecesInCell.length - 1) / 2) * 2 : 0;
                const isOwn = pi === currentPlayerIndex;
                const roll = selectedRollIndex !== null ? pendingRolls[selectedRollIndex] : null;
                const canMove = isOwn && turnPhase === 'moving' && roll !== null && pos !== CENTER_IDX && (pos + roll <= CENTER_IDX) && (pos + roll < 15 || p.hasKill);

                return (
                  <div
                    key={`${pi}-${pIdx}`}
                    className={`board-piece ${canMove ? 'playable' : ''}`}
                    style={{
                      left: coords.x + xOff, top: coords.y + yOff,
                      backgroundColor: PLAYER_COLORS[pi], border: `2px solid ${PLAYER_LIGHT[pi]}`,
                      zIndex: canMove ? 20 : 2 + rank, position: 'absolute', transform: 'translate(-50%, -50%)',
                      pointerEvents: canMove ? 'auto' : 'none'
                    }}
                    onClick={() => canMove && movePiece(pIdx)}
                  />
                );
              }))}
            </div>
          </div>

          <div className="dice-area">
            {turnPhase === 'moving' && pendingRolls.length > 0 && (
              <div className="roll-pills">
                {pendingRolls.map((roll, i) => (
                  <button key={i} className={`roll-pill ${selectedRollIndex === i ? 'selected' : ''}`} onClick={() => setGameState(prev => ({ ...prev, selectedRollIndex: i }))}>{roll}</button>
                ))}
              </div>
            )}
            <Dice onRoll={handleRoll} disabled={turnPhase !== 'rolling'} />
            {extraRolls > 0 && <div className="extra-badge">Extra Rolls: {extraRolls}</div>}
          </div>
        </div>

        <div className="side-panel">
          {players.slice(2, 4).map((p, i) => (
            <div key={i + 2} className={`player-card ${i + 2 === currentPlayerIndex ? 'active' : ''}`} style={{ '--player-color': PLAYER_COLORS[i + 2] } as any}>
              <div className="player-avatar" style={{ background: PLAYER_COLORS[i + 2] }}>{PLAYER_EMOJI[i + 2]}</div>
              <div className="player-name-card">{p.name} {p.hasKill && '⚔️'}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="game-log">
        {gameState.logs.slice(-5).reverse().map((log, i) => <div key={i} className="log-entry">{log}</div>)}
      </div>
    </div>
  );
};

export default GameBoard;
