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
const CENTER_IDX    = 24; // path.length - 1

const GameBoard: React.FC<Props> = ({ gameState, setGameState }) => {
  const { players, currentPlayerIndex, diceRoll, finishedPlayers } = gameState;
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

  /* ─── ROLL ─────────────────────────────────────────────── */
  const handleRoll = (value: number) => {
    // Check if any piece can legally move
    const canMove = cur.pieces.some(pos => {
      if (pos === CENTER_IDX) return false;        // already at center
      return pos + value <= CENTER_IDX;            // can move without overshoot
    });

    setGameState(prev => ({ ...prev, diceRoll: value }));
    addLog(`${cur.name} rolled a ${value}${value === 8 ? ' — Aath! 🎉' : value === 4 ? ' — Challas! ✨' : ''}!`);

    if (!canMove) {
      addLog(`${cur.name} has no valid move — turn skipped.`);
      setTimeout(() =>
        setGameState(prev => ({
          ...prev,
          currentPlayerIndex: getNextActivePlayer(prev.currentPlayerIndex, prev.players),
          diceRoll: null,
        })), 1800);
    }
  };

  /* ─── MOVE ─────────────────────────────────────────────── */
  const movePiece = (pieceIndex: number) => {
    if (diceRoll === null) return;
    const currentPos = cur.pieces[pieceIndex];
    if (currentPos === CENTER_IDX) return;           // already done
    const newPos = currentPos + diceRoll;
    if (newPos > CENTER_IDX) return;                 // can't overshoot center

    const targetCoords = cur.path[newPos];

    // Apply move
    let newPlayers = players.map((p, pi) => {
      if (pi !== currentPlayerIndex) return p;
      const np = [...p.pieces];
      np[pieceIndex] = newPos;
      return { ...p, pieces: np };
    });

    // Capture: land on non-safe square occupied by opponent → send to pos 0 (home)
    if (!isSafe(targetCoords[0], targetCoords[1])) {
      newPlayers = newPlayers.map((p, pi) => {
        if (pi === currentPlayerIndex || p.isFinished) return p;
        let captured = false;
        const np = p.pieces.map(pos => {
          if (pos === CENTER_IDX) return pos;        // pieces at center are safe
          const [r, c] = p.path[pos];
          if (r === targetCoords[0] && c === targetCoords[1]) {
            captured = true;
            return 0;                                // back to home square (pos 0)
          }
          return pos;
        });
        if (captured) addLog(`${cur.name} captured ${p.name}'s piece!`);
        return { ...p, pieces: np };
      });
    }

    let newFinishedPlayers = [...finishedPlayers];
    const updatedCur = newPlayers[currentPlayerIndex];

    // Check if current player has finished
    if (updatedCur.pieces.every(p => p === CENTER_IDX) && !updatedCur.isFinished) {
      updatedCur.isFinished = true;
      newFinishedPlayers.push(updatedCur);
      addLog(`${updatedCur.name} finished in position ${newFinishedPlayers.length}!`);
    }

    // Check if game is completely over (only 1 player left not finished)
    if (newFinishedPlayers.length === newPlayers.length - 1) {
      const lastPlayer = newPlayers.find(p => !p.isFinished)!;
      lastPlayer.isFinished = true;
      newFinishedPlayers.push(lastPlayer);
      
      setGameState(prev => ({ 
        ...prev, 
        players: newPlayers, 
        status: 'finished', 
        finishedPlayers: newFinishedPlayers,
        diceRoll: null
      }));
      return;
    }

    addLog(`${cur.name} moved a piece.`);
    setGameState(prev => ({
      ...prev,
      players: newPlayers,
      finishedPlayers: newFinishedPlayers,
      currentPlayerIndex: getNextActivePlayer(currentPlayerIndex, newPlayers),
      diceRoll: null,
    }));
  };

  /* ─── CELL RENDERER ────────────────────────────────────── */
  const renderCell = (r: number, c: number) => {
    const isCenter = r === 2 && c === 2;
    const safe     = isSafe(r, c);

    // Collect all pieces sitting on this cell
    const piecesHere: { pi: number; idx: number }[] = [];
    players.forEach((p, pi) => {
      if (p.isFinished && isCenter) return; // Don't crowd the center with finished players
      p.pieces.forEach((pos, idx) => {
        const [pr, pc] = p.path[pos];
        if (pr === r && pc === c) piecesHere.push({ pi, idx });
      });
    });

    const isHighlighted =
      diceRoll !== null &&
      piecesHere.some(({ pi, idx }) => {
        if (pi !== currentPlayerIndex) return false;
        const pos = players[pi].pieces[idx];
        return pos !== CENTER_IDX && pos + diceRoll <= CENTER_IDX;
      });

    return (
      <div
        key={`${r}-${c}`}
        className={`cell${isCenter ? ' center' : safe ? ' safe' : ''}${isHighlighted ? ' highlight' : ''}`}
      >
        {piecesHere.map(({ pi, idx }) => {
          const pos     = players[pi].pieces[idx];
          const isOwn   = pi === currentPlayerIndex;
          const canMove = isOwn && diceRoll !== null && pos !== CENTER_IDX && pos + diceRoll <= CENTER_IDX;

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

  /* ─── PLAYER CARD ──────────────────────────────────────── */
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
                  ? diceRoll !== null ? '⬆ Pick a piece!' : '🎲 Roll now'
                  : 'Waiting…'}
            </div>
          </div>
        </div>
        {/* Piece status indicators */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          <span title="At home square">🏠 {atHome}</span>
          <span title="Moving on board">🎯 {moving}</span>
          <span title="Reached center">⭐ {atCenter}</span>
        </div>
      </div>
    );
  };

  /* ─── RENDER ────────────────────────────────────────────── */
  return (
    <div className="game-screen">
      {/* Top bar */}
      <div className="game-topbar">
        <div className="game-logo">Challas Aath</div>
        <div style={{ textAlign: 'center' }}>
          <div className="turn-banner">Current Turn</div>
          <div className="turn-name" style={{ color: PLAYER_COLORS[currentPlayerIndex] }}>
            {PLAYER_EMOJI[currentPlayerIndex]} {cur.name}
          </div>
        </div>
        <button
          className="reset-btn"
          onClick={() => setGameState(prev => ({
            ...prev, status: 'setup', players: [], finishedPlayers: [], currentPlayerIndex: 0,
            diceRoll: null, winner: null, logs: ['Game reset.']
          }))}
        >
          ↩ New Game
        </button>
      </div>

      {/* Main */}
      <div className="game-main">
        {/* Left: Players 1 & 4 */}
        <div className="side-panel">
          {renderPlayerCard(players[0], 0)}
          {renderPlayerCard(players[3], 3)}
        </div>

        {/* Center: Board + Dice */}
        <div className="board-wrapper">
          <div className="board-outer">
            <div className="board-grid">
              {Array.from({ length: GRID_SIZE }, (_, r) =>
                Array.from({ length: GRID_SIZE }, (_, c) => renderCell(r, c))
              )}
            </div>
          </div>

          <div className="dice-area">
            {diceRoll !== null && (
              <div className="roll-result">
                Rolled {diceRoll}{diceRoll === 8 ? ' — Aath! 🎉' : diceRoll === 4 ? ' — Challas! ✨' : ''} — Click a piece to move
              </div>
            )}
            <Dice onRoll={handleRoll} disabled={diceRoll !== null} />
          </div>
        </div>

        {/* Right: Players 2 & 3 */}
        <div className="side-panel">
          {renderPlayerCard(players[1], 1)}
          {renderPlayerCard(players[2], 2)}
        </div>
      </div>

      {/* Log bar */}
      <div className="game-log">
        {[...gameState.logs].reverse().slice(0, 6).map((l, i) => (
          <span key={i} className={`log-entry${i === 0 ? ' latest' : ''}`}>{l}</span>
        ))}
      </div>
    </div>
  );
};

export default GameBoard;
