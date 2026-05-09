import React, { useState, useEffect, useRef } from 'react';
import type { GameState } from '../types';
import { isSafe } from '../types';
import Dice from './Dice.tsx';

interface Props {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
}

const PLAYER_COLORS = ['#e74c3c', '#2980b9', '#f39c12', '#27ae60'];
const PLAYER_LIGHT  = ['#ff6b6b', '#5dade2', '#f9ca24', '#55efc4'];
const PLAYER_EMOJI  = ['🔴', '🔵', '🟡', '🟢'];
const CENTER_IDX    = 23; // 15 outer + 8 inner + 1 center

// Arrows based on the path flow
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

  const addLog = (msg: string) =>
    setGameState(prev => ({ ...prev, logs: [...prev.logs.slice(-19), msg] }));

  const getNextActivePlayer = (currentIdx: number, playersList: typeof players) => {
    let nextIdx = (currentIdx + 1) % playersList.length;
    while (playersList[nextIdx].isFinished) {
      nextIdx = (nextIdx + 1) % playersList.length;
    }
    return nextIdx;
  };

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

  const toggleTheme = () =>
    setGameState(prev => ({ ...prev, theme: prev.theme === 'wooden' ? 'glass' : 'wooden' }));

  const handleRoll = (value: number) => {
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
        cur.pieces.some((pos, idx) => {
          if (pos === CENTER_IDX) return false;
          const nextPos = pos + r;
          if (nextPos > CENTER_IDX) return false;
          // Rule: Need hasKill to enter inner loop (pos >= 15)
          if (nextPos >= 15 && !cur.hasKill) return false;
          return true;
        })
      );

      if (!anyUsable) {
        addLog(`${cur.name} has no valid moves.`);
        setTimeout(() => {
          setGameState(prev => {
            const nextExtra = prev.extraRolls;
            if (nextExtra > 0) return { ...prev, turnPhase: 'rolling', pendingRolls: [], selectedRollIndex: null, extraRolls: nextExtra - 1 };
            return {
              ...prev,
              currentPlayerIndex: getNextActivePlayer(prev.currentPlayerIndex, prev.players),
              turnPhase: 'rolling',
              pendingRolls: [],
              selectedRollIndex: null,
              extraRolls: 0,
            };
          });
        }, 1200);
        nextSelected = null;
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

    // Entry block: Need hasKill to enter inner circle (pos 15+)
    if (newPos >= 15 && !cur.hasKill) {
      addLog(`${cur.name} needs a capture to enter the inner circle!`);
      return;
    }

    const targetCoords = cur.path[newPos];
    let newPlayers = [...players];
    let gotKill = false;

    // Check for capture
    if (!isSafe(targetCoords[0], targetCoords[1])) {
      newPlayers = newPlayers.map((p, pi) => {
        if (pi === currentPlayerIndex || p.isFinished) return p;
        let captured = false;
        const np = p.pieces.map(pos => {
          if (pos === CENTER_IDX) return pos;
          const [r, c] = p.path[pos];
          if (r === targetCoords[0] && c === targetCoords[1]) {
            captured = true;
            return 0;
          }
          return pos;
        });
        if (captured) gotKill = true;
        return { ...p, pieces: np };
      });
    }

    // Update current player
    newPlayers = newPlayers.map((p, pi) => {
      if (pi !== currentPlayerIndex) return p;
      const np = [...p.pieces];
      np[pieceIndex] = newPos;
      return { ...p, pieces: np, hasKill: p.hasKill || gotKill };
    });

    if (gotKill) addLog(`${cur.name} captured a piece and earned hasKill status!`);

    let newFinishedPlayers = [...finishedPlayers];
    const updatedCur = newPlayers[currentPlayerIndex];

    if (updatedCur.pieces.every(p => p === CENTER_IDX) && !updatedCur.isFinished) {
      updatedCur.isFinished = true;
      newFinishedPlayers.push(updatedCur);
      addLog(`${updatedCur.name} finished!`);
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

    const nextState: Partial<GameState> = {
      players: newPlayers,
      finishedPlayers: newFinishedPlayers,
      pendingRolls: newPending,
      extraRolls: newExtra,
    };

    nextState.selectedRollIndex = newPending.length === 1 ? 0 : null;

    if (newPending.length === 0) {
      if (newExtra > 0) {
        nextState.turnPhase = 'rolling';
        nextState.extraRolls = newExtra - 1;
        addLog(`${cur.name} gets an extra roll!`);
      } else {
        nextState.currentPlayerIndex = getNextActivePlayer(currentPlayerIndex, newPlayers);
        nextState.turnPhase = 'rolling';
      }
    }

    setGameState(prev => ({ ...prev, ...nextState }));
  };

  const renderCell = (r: number, c: number) => {
    const isCenter = r === 2 && c === 2;
    const safe     = isSafe(r, c);
    const cellKey  = `${r}-${c}`;
    const arrows   = ENTRY_ARROWS[cellKey] || [];

    return (
      <div key={cellKey} className={`cell${isCenter ? ' center' : safe ? ' safe' : ''}`}>
        {arrows.map(({ color, arrow, pi, size }, i) => (
          <span key={`arrow-${pi}-${i}`} className={`entry-arrow ${size === 'small' ? 'small-entry' : 'turn-arrow'}`} style={{ color }}>{arrow}</span>
        ))}
      </div>
    );
  };

  return (
    <div className={`game-screen ${theme}`}>
      <div className="game-topbar">
        <div className="game-logo">Challas Aath</div>
        <div className="turn-name" style={{ color: PLAYER_COLORS[currentPlayerIndex] }}>{PLAYER_EMOJI[currentPlayerIndex]} {cur.name}'s Turn</div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="theme-toggle-btn" onClick={toggleTheme}>{theme === 'wooden' ? '🌙' : '🪵'}</button>
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
              {Array.from({ length: 25 }, (_, i) => renderCell(Math.floor(i / 5), i % 5))}
            </div>
            
            {/* Animated Piece Layer */}
            <div className="piece-layer" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              {players.map((p, pi) => p.pieces.map((pos, pIdx) => {
                if (p.isFinished && pos === CENTER_IDX) return null;
                const [r, c] = p.path[pos];
                const coords = cellPositions[`${r}-${c}`];
                if (!coords) return null;
                
                const isOwn = pi === currentPlayerIndex;
                const activeRoll = selectedRollIndex !== null ? pendingRolls[selectedRollIndex] : null;
                const canMove = isOwn && turnPhase === 'moving' && activeRoll !== null && pos !== CENTER_IDX && (pos + activeRoll <= CENTER_IDX) && (pos + activeRoll < 15 || p.hasKill);

                // Multiple pieces in same cell offset
                const sameCellCount = players.reduce((acc, op) => acc + op.pieces.filter(opos => {
                   const [or, oc] = op.path[opos];
                   return or === r && oc === c;
                }).length, 0);
                const offset = sameCellCount > 1 ? (pIdx - sameCellCount/2) * 5 : 0;

                return (
                  <div
                    key={`${pi}-${pIdx}`}
                    className={`board-piece ${canMove ? 'playable' : ''}`}
                    style={{
                      position: 'absolute',
                      left: coords.x + offset,
                      top: coords.y + offset,
                      transform: 'translate(-50%, -50%)',
                      backgroundColor: PLAYER_COLORS[pi],
                      border: `2px solid ${PLAYER_LIGHT[pi]}`,
                      transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                      pointerEvents: 'auto',
                      zIndex: canMove ? 10 : 2
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
