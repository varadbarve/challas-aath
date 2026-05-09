import React from 'react';
import type { GameState } from '../types';
import { isSafe, GRID_SIZE } from '../types';
import Dice from './Dice.tsx';

interface Props {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
}

const PLAYER_COLORS = ['#e74c3c', '#2980b9', '#f39c12', '#27ae60'];
const PLAYER_LIGHT  = ['#ff6b6b', '#5dade2', '#f9ca24', '#55efc4'];
const PLAYER_EMOJI  = ['🔴', '🔵', '🟡', '🟢'];
const CENTER_IDX    = 26; // 16 outer + 1 home + 8 inner + 1 inner-repeat + 1 center

// Updated arrows based on the image provided
// Sequences: (Home-1 -> Home), (Home -> Inner), (Inner-Start -> Center)
const ENTRY_ARROWS: { [key: string]: { color: string; arrow: string; pi: number }[] } = {
  // Red (Player 0)
  '4-1': [{ color: PLAYER_COLORS[0], arrow: '→', pi: 0 }],
  '4-2': [{ color: PLAYER_COLORS[0], arrow: '↑', pi: 0 }],
  '3-2': [{ color: PLAYER_COLORS[0], arrow: '↑', pi: 0 }],
  // Blue (Player 1)
  '1-4': [{ color: PLAYER_COLORS[1], arrow: '↓', pi: 1 }],
  '2-4': [{ color: PLAYER_COLORS[1], arrow: '←', pi: 1 }],
  '2-3': [{ color: PLAYER_COLORS[1], arrow: '←', pi: 1 }],
  // Yellow (Player 2)
  '0-3': [{ color: PLAYER_COLORS[2], arrow: '←', pi: 2 }],
  '0-2': [{ color: PLAYER_COLORS[2], arrow: '↓', pi: 2 }],
  '1-2': [{ color: PLAYER_COLORS[2], arrow: '↓', pi: 2 }],
  // Green (Player 3)
  '3-0': [{ color: PLAYER_COLORS[3], arrow: '↑', pi: 3 }],
  '2-0': [{ color: PLAYER_COLORS[3], arrow: '→', pi: 3 }],
  '2-1': [{ color: PLAYER_COLORS[3], arrow: '→', pi: 3 }],
  
  // Corner Turns (Decorative)
  '4-4': [{ color: '#8b4513', arrow: '↑', pi: -1 }], // BR Corner turns Up
  '0-4': [{ color: '#8b4513', arrow: '←', pi: -1 }], // TR Corner turns Left
  '0-0': [{ color: '#8b4513', arrow: '↓', pi: -1 }], // TL Corner turns Down
  '4-0': [{ color: '#8b4513', arrow: '→', pi: -1 }], // BL Corner turns Right
};

const GameBoard: React.FC<Props> = ({ gameState, setGameState }) => {
  const { players, currentPlayerIndex, finishedPlayers, turnPhase, pendingRolls, selectedRollIndex, extraRolls, theme } = gameState;
  const cur = players[currentPlayerIndex];

  const addLog = (msg: string) =>
    setGameState(prev => ({ ...prev, logs: [...prev.logs.slice(-19), msg] }));

  const getNextActivePlayer = (currentIdx: number, playersList: typeof players) => {
    let nextIdx = (currentIdx + 1) % playersList.length;
    while (playersList[nextIdx].isFinished) {
      nextIdx = (nextIdx + 1) % playersList.length;
    }
    return nextIdx;
  };

  const toggleTheme = () =>
    setGameState(prev => ({ ...prev, theme: prev.theme === 'wooden' ? 'glass' : 'wooden' }));

  const handleRoll = (value: number) => {
    const newPending = [...pendingRolls, value];
    let nextPhase = turnPhase;

    addLog(`${cur.name} rolled a ${value}${value === 8 ? ' — Aath! 🎉' : value === 4 ? ' — Challas! ✨' : ''}`);

    if (value === 4 || value === 8) {
      nextPhase = 'rolling';
    } else {
      nextPhase = 'moving';
    }

    let nextSelected = selectedRollIndex;
    if (nextPhase === 'moving') {
      const anyUsable = newPending.some(r =>
        cur.pieces.some(pos => pos !== CENTER_IDX && pos + r <= CENTER_IDX)
      );

      if (!anyUsable) {
        addLog(`${cur.name} has no valid moves.`);
        setTimeout(() => {
          setGameState(prev => {
            const nextExtra = prev.extraRolls;
            if (nextExtra > 0) {
              return { ...prev, turnPhase: 'rolling', pendingRolls: [], selectedRollIndex: null, extraRolls: nextExtra - 1 };
            }
            return {
              ...prev,
              currentPlayerIndex: getNextActivePlayer(prev.currentPlayerIndex, prev.players),
              turnPhase: 'rolling',
              pendingRolls: [],
              selectedRollIndex: null,
              extraRolls: 0,
            };
          });
        }, 1800);
        nextSelected = null;
      } else {
        nextSelected = newPending.length === 1 ? 0 : null;
      }
    }

    setGameState(prev => ({
      ...prev,
      pendingRolls: newPending,
      turnPhase: nextPhase,
      selectedRollIndex: nextSelected
    }));
  };

  const movePiece = (pieceIndex: number) => {
    if (turnPhase !== 'moving' || selectedRollIndex === null) return;
    const roll = pendingRolls[selectedRollIndex];

    const currentPos = cur.pieces[pieceIndex];
    if (currentPos === CENTER_IDX) return;
    const newPos = currentPos + roll;
    if (newPos > CENTER_IDX) return;

    const targetCoords = cur.path[newPos];

    let newPlayers = players.map((p, pi) => {
      if (pi !== currentPlayerIndex) return p;
      const np = [...p.pieces];
      np[pieceIndex] = newPos;
      return { ...p, pieces: np };
    });

    let gotKill = false;
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
        if (captured) {
          gotKill = true;
          addLog(`${cur.name} captured ${p.name}'s piece!`);
        }
        return { ...p, pieces: np };
      });
    }

    let newFinishedPlayers = [...finishedPlayers];
    const updatedCur = newPlayers[currentPlayerIndex];

    if (updatedCur.pieces.every(p => p === CENTER_IDX) && !updatedCur.isFinished) {
      updatedCur.isFinished = true;
      newFinishedPlayers.push(updatedCur);
      addLog(`${updatedCur.name} finished in position ${newFinishedPlayers.length}!`);
    }

    if (newFinishedPlayers.length === newPlayers.length - 1) {
      const lastPlayer = newPlayers.find(p => !p.isFinished)!;
      lastPlayer.isFinished = true;
      newFinishedPlayers.push(lastPlayer);
      setGameState(prev => ({
        ...prev, players: newPlayers, status: 'finished', finishedPlayers: newFinishedPlayers
      }));
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

    if (newPending.length > 0) {
      const anyUsable = newPending.some(r =>
        updatedCur.pieces.some(pos => pos !== CENTER_IDX && pos + r <= CENTER_IDX)
      );
      if (!anyUsable) {
        addLog(`No valid moves left for remaining rolls.`);
        newPending = [];
        nextState.pendingRolls = [];
      }
    }

    if (newPending.length === 0) {
      if (newExtra > 0) {
        nextState.turnPhase = 'rolling';
        nextState.extraRolls = newExtra - 1;
        addLog(`${cur.name} gets an extra roll!`);
      } else {
        nextState.currentPlayerIndex = getNextActivePlayer(currentPlayerIndex, newPlayers);
        nextState.turnPhase = 'rolling';
        nextState.extraRolls = 0;
      }
    }

    addLog(`${cur.name} moved a piece.`);
    setGameState(prev => ({ ...prev, ...nextState }));
  };

  /* ── CELL ───────────────────────────────────────── */
  const renderCell = (r: number, c: number) => {
    const isCenter = r === 2 && c === 2;
    const safe     = isSafe(r, c);
    const cellKey  = `${r}-${c}`;

    const piecesHere: { pi: number; idx: number }[] = [];
    players.forEach((p, pi) => {
      if (p.isFinished && isCenter) return;
      p.pieces.forEach((pos, idx) => {
        const [pr, pc] = p.path[pos];
        if (pr === r && pc === c) piecesHere.push({ pi, idx });
      });
    });

    const activeRoll = selectedRollIndex !== null ? pendingRolls[selectedRollIndex] : null;

    const isHighlighted =
      turnPhase === 'moving' && activeRoll !== null &&
      piecesHere.some(({ pi, idx }) => {
        if (pi !== currentPlayerIndex) return false;
        const pos = players[pi].pieces[idx];
        return pos !== CENTER_IDX && pos + activeRoll <= CENTER_IDX;
      });

    const arrows = ENTRY_ARROWS[cellKey] || [];

    return (
      <div
        key={cellKey}
        className={`cell${isCenter ? ' center' : safe ? ' safe' : ''}${isHighlighted ? ' highlight' : ''}`}
      >
        {/* Entry and turn arrows */}
        {arrows.map(({ color, arrow, pi }, i) => (
          <span
            key={`arrow-${pi}-${i}`}
            className={`entry-arrow ${pi === -1 ? 'turn-arrow' : ''}`}
            style={{ color }}
          >
            {arrow}
          </span>
        ))}

        {piecesHere.map(({ pi, idx }) => {
          const pos     = players[pi].pieces[idx];
          const isOwn   = pi === currentPlayerIndex;
          const canMove = isOwn && turnPhase === 'moving' && activeRoll !== null && pos !== CENTER_IDX && pos + activeRoll <= CENTER_IDX;

          return (
            <div
              key={`${pi}-${idx}`}
              className={`board-piece${canMove ? ' playable' : ''}`}
              style={{
                backgroundColor: PLAYER_COLORS[pi],
                border: `2px solid ${PLAYER_LIGHT[pi]}`,
              }}
              onClick={() => canMove && movePiece(idx)}
              title={`${players[pi].name}'s piece${canMove ? ' — click to move' : ''}`}
            />
          );
        })}
      </div>
    );
  };

  /* ── PLAYER CARD ────────────────────────────────── */
  const renderPlayerCard = (p: typeof players[0], i: number) => {
    const isActive = i === currentPlayerIndex;
    const atCenter = p.pieces.filter(pos => pos === CENTER_IDX).length;
    const atHome   = p.pieces.filter(pos => pos === 0).length;
    const moving   = 4 - atCenter - atHome;
    const finishRank = p.isFinished ? finishedPlayers.findIndex(fp => fp.id === p.id) + 1 : null;

    return (
      <div
        key={i}
        className={`player-card${isActive ? ' active' : ''}`}
        style={{
          '--player-color': PLAYER_COLORS[i],
          opacity: p.isFinished ? 0.5 : 1,
          filter: p.isFinished ? 'grayscale(0.7)' : 'none'
        } as React.CSSProperties}
      >
        <div className="player-card-header">
          <div className="player-avatar" style={{ background: PLAYER_COLORS[i] }}>
            {PLAYER_EMOJI[i]}
          </div>
          <div>
            <div className="player-name-card">{p.name}</div>
            <div className="player-status">
              {p.isFinished
                ? `Finished ${finishRank}${['st', 'nd', 'rd'][finishRank! - 1] || 'th'}!`
                : isActive
                  ? turnPhase === 'moving' ? (selectedRollIndex !== null ? '⬆ Pick a piece!' : 'Select a roll') : '🎲 Roll now'
                  : 'Waiting…'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          <span title="At home square">🏠 {atHome}</span>
          <span title="Moving on board">🎯 {moving}</span>
          <span title="Reached center">⭐ {atCenter}</span>
        </div>
      </div>
    );
  };

  /* ── RENDER ─────────────────────────────────────── */
  return (
    <div className={`game-screen ${theme}`}>
      <div className="game-topbar">
        <div className="game-logo">Challas Aath</div>
        <div style={{ textAlign: 'center' }}>
          <div className="turn-banner">Current Turn</div>
          <div className="turn-name" style={{ color: PLAYER_COLORS[currentPlayerIndex] }}>
            {PLAYER_EMOJI[currentPlayerIndex]} {cur.name}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button className="theme-toggle-btn" onClick={toggleTheme} title="Toggle theme">
            {theme === 'wooden' ? '🌙' : '🪵'}
          </button>
          <button
            className="reset-btn"
            onClick={() => setGameState(prev => ({
              ...prev, status: 'setup', players: [], finishedPlayers: [], currentPlayerIndex: 0,
              turnPhase: 'rolling', pendingRolls: [], selectedRollIndex: null, extraRolls: 0,
              logs: ['Game reset.']
            }))}
          >
            ↩ New
          </button>
        </div>
      </div>

      <div className="game-main">
        <div className="side-panel">
          {renderPlayerCard(players[0], 0)}
          {renderPlayerCard(players[3], 3)}
        </div>

        <div className="board-wrapper">
          <div className="board-outer">
            <div className="board-grid">
              {Array.from({ length: GRID_SIZE }, (_, r) =>
                Array.from({ length: GRID_SIZE }, (_, c) => renderCell(r, c))
              )}
            </div>
          </div>

          <div className="dice-area">
            {turnPhase === 'moving' && pendingRolls.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Select a roll to play:</div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {pendingRolls.map((roll, i) => (
                    <button
                      key={i}
                      className={`roll-pill${selectedRollIndex === i ? ' selected' : ''}`}
                      onClick={() => setGameState(prev => ({ ...prev, selectedRollIndex: i }))}
                    >
                      {roll}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {turnPhase === 'rolling' && (
              <div className="roll-result">
                {pendingRolls.length > 0 ? `Accumulated: ${pendingRolls.join(', ')}` : 'Roll the shells!'}
                {extraRolls > 0 && <span style={{ display: 'block', color: '#55efc4', fontSize: '0.8rem', marginTop: '0.2rem' }}>Extra Rolls: {extraRolls}</span>}
              </div>
            )}

            <Dice onRoll={handleRoll} disabled={turnPhase !== 'rolling'} />
          </div>
        </div>

        <div className="side-panel">
          {renderPlayerCard(players[1], 1)}
          {renderPlayerCard(players[2], 2)}
        </div>
      </div>

      <div className="game-log">
        {[...gameState.logs].reverse().slice(0, 6).map((l, i) => (
          <span key={i} className={`log-entry${i === 0 ? ' latest' : ''}`}>{l}</span>
        ))}
      </div>
    </div>
  );
};

export default GameBoard;
