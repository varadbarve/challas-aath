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

// Center cell
const CENTER: [number, number] = [2, 2];

const GameBoard: React.FC<Props> = ({ gameState, setGameState }) => {
  const { players, currentPlayerIndex, diceRoll } = gameState;
  const cur = players[currentPlayerIndex];

  /* ── helpers ── */
  const log = (msg: string) =>
    setGameState(prev => ({ ...prev, logs: [...prev.logs.slice(-19), msg] }));

  /* ── Roll handler ── */
  const handleRoll = (value: number) => {
    setGameState(prev => ({ ...prev, diceRoll: value }));
    log(`${cur.name} rolled a ${value}!`);

    // Check if ANY move is possible; if not, auto-pass after delay
    const canMove = cur.pieces.some(pos => {
      if (pos === -1) return value === 1 || value === 8;        // need 1 or 8 to enter
      if (pos === cur.path.length - 1) return false;            // already at center
      return pos + value <= cur.path.length - 1;
    });

    if (!canMove) {
      log(`${cur.name} has no valid move — turn skipped.`);
      setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          currentPlayerIndex: (prev.currentPlayerIndex + 1) % prev.players.length,
          diceRoll: null,
        }));
      }, 1800);
    }
  };

  /* ── Move a home piece onto the board ── */
  const moveHomePiece = (pieceIndex: number) => {
    if (diceRoll === null) return;
    if (cur.pieces[pieceIndex] !== -1) return;          // not at home
    if (diceRoll !== 1 && diceRoll !== 8) return;       // wrong roll

    const newPlayers = players.map((p, pi) => {
      if (pi !== currentPlayerIndex) return p;
      const newPieces = [...p.pieces];
      newPieces[pieceIndex] = 0;                        // start at path[0]
      return { ...p, pieces: newPieces };
    });

    log(`${cur.name} brought a piece onto the board!`);
    setGameState(prev => ({
      ...prev,
      players: newPlayers,
      currentPlayerIndex: (prev.currentPlayerIndex + 1) % prev.players.length,
      diceRoll: null,
    }));
  };

  /* ── Move a board piece ── */
  const moveBoardPiece = (pieceIndex: number) => {
    if (diceRoll === null) return;
    const currentPos = cur.pieces[pieceIndex];
    if (currentPos === -1) return;                      // still at home — use moveHomePiece

    const newPos = currentPos + diceRoll;
    if (newPos > cur.path.length - 1) return;           // would overshoot center

    const targetCoords = cur.path[newPos];

    // Clone players; update current player's piece
    let newPlayers = players.map((p, pi) => {
      if (pi !== currentPlayerIndex) return p;
      const np = [...p.pieces];
      np[pieceIndex] = newPos;
      return { ...p, pieces: np };
    });

    // Capture enemy pieces on that cell (if not safe)
    if (!isSafe(targetCoords[0], targetCoords[1])) {
      newPlayers = newPlayers.map((p, pi) => {
        if (pi === currentPlayerIndex) return p;
        const np = p.pieces.map(pos => {
          if (pos === -1) return -1;
          const [r, c] = p.path[pos];
          if (r === targetCoords[0] && c === targetCoords[1]) {
            log(`${cur.name} captured ${p.name}'s piece!`);
            return -1;   // sent home
          }
          return pos;
        });
        return { ...p, pieces: np };
      });
    }

    // Win check: all 4 pieces at center
    const updatedCur = newPlayers[currentPlayerIndex];
    const allDone = updatedCur.pieces.every(p => p === cur.path.length - 1);

    if (allDone) {
      setGameState(prev => ({ ...prev, players: newPlayers, status: 'winner', winner: updatedCur }));
      return;
    }

    log(`${cur.name} moved a piece.`);
    setGameState(prev => ({
      ...prev,
      players: newPlayers,
      currentPlayerIndex: (prev.currentPlayerIndex + 1) % prev.players.length,
      diceRoll: null,
    }));
  };

  /* ── Cell renderer ── */
  const renderCell = (r: number, c: number) => {
    const isCenter = r === CENTER[0] && c === CENTER[1];
    const safe     = isSafe(r, c);

    // Collect all board pieces on this cell
    const piecesHere: { pi: number; idx: number }[] = [];
    players.forEach((p, pi) => {
      p.pieces.forEach((pos, idx) => {
        if (pos < 0) return;
        const [pr, pc] = p.path[pos];
        if (pr === r && pc === c) piecesHere.push({ pi, idx });
      });
    });

    const isHighlighted = diceRoll !== null && piecesHere.some(
      ({ pi, idx }) => {
        if (pi !== currentPlayerIndex) return false;
        const pos = cur.pieces[idx];
        return pos + diceRoll <= cur.path.length - 1;
      }
    );

    return (
      <div
        key={`${r}-${c}`}
        className={`cell${isCenter ? ' center' : safe ? ' safe' : ''}${isHighlighted ? ' highlight' : ''}`}
      >
        {piecesHere.map(({ pi, idx }) => {
          const isOwn    = pi === currentPlayerIndex;
          const canMove  = isOwn && diceRoll !== null &&
            cur.pieces[idx] + diceRoll <= cur.path.length - 1;

          return (
            <div
              key={`${pi}-${idx}`}
              className={`board-piece${canMove ? ' playable' : ''}`}
              style={{
                backgroundColor: PLAYER_COLORS[pi],
                boxShadow: `0 3px 8px rgba(0,0,0,0.4)`,
                border: `2px solid ${PLAYER_LIGHT[pi]}`,
              }}
              onClick={() => canMove && moveBoardPiece(idx)}
              title={`${players[pi].name}'s piece`}
            />
          );
        })}
      </div>
    );
  };

  /* ── Player side panel ── */
  const renderPlayerCard = (p: typeof players[0], i: number) => {
    const isActive = i === currentPlayerIndex;
    return (
      <div
        key={i}
        className={`player-card${isActive ? ' active' : ''}`}
        style={{ '--player-color': PLAYER_COLORS[i] } as React.CSSProperties}
      >
        <div className="player-card-header">
          <div className="player-avatar" style={{ background: PLAYER_COLORS[i] }}>
            {PLAYER_EMOJI[i]}
          </div>
          <div>
            <div className="player-name-card">{p.name}</div>
            <div className="player-status">
              {isActive ? (diceRoll !== null ? 'Pick a piece!' : 'Your turn') : 'Waiting…'}
            </div>
          </div>
        </div>

        {/* Home pieces — only pieces still at home (pos === -1) */}
        <div className="home-pieces">
          {p.pieces.map((pos, pi2) => {
            const atHome   = pos === -1;
            const atCenter = pos === p.path.length - 1;
            const canEnter = isActive && diceRoll !== null && atHome
              && (diceRoll === 1 || diceRoll === 8);

            return (
              <div
                key={pi2}
                className={`home-piece${atCenter ? ' at-center' : ''}${!atHome && !atCenter ? ' inactive' : ''}${canEnter ? ' playable' : ''}`}
                style={{
                  backgroundColor: atCenter
                    ? undefined
                    : atHome
                    ? PLAYER_COLORS[i]
                    : 'rgba(255,255,255,0.08)',
                  border: `3px solid ${PLAYER_LIGHT[i]}`,
                  color: PLAYER_COLORS[i],
                  opacity: atHome || atCenter ? 1 : 0.2,
                }}
                onClick={() => canEnter && moveHomePiece(pi2)}
                title={
                  atHome ? (canEnter ? 'Click to enter board!' : 'Waiting at home')
                  : atCenter ? 'Reached the center! ★'
                  : 'On the board'
                }
              >
                {atCenter && <span style={{ fontSize: '1rem', zIndex: 1 }}>★</span>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /* ── Render ── */
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
        <button className="reset-btn" onClick={() =>
          setGameState(prev => ({
            ...prev, status: 'setup', players: [], currentPlayerIndex: 0,
            diceRoll: null, winner: null, logs: ['Game reset.']
          }))
        }>
          ↩ New Game
        </button>
      </div>

      {/* Main */}
      <div className="game-main">
        {/* Left — players 0 & 3 */}
        <div className="side-panel">
          {renderPlayerCard(players[0], 0)}
          {renderPlayerCard(players[3], 3)}
        </div>

        {/* Center — board + dice */}
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
                Rolled {diceRoll} — {
                  diceRoll === 8 ? 'Aath! 🎉' : diceRoll === 4 ? 'Challas! ✨' : ''
                } Click a piece to move
              </div>
            )}
            <Dice onRoll={handleRoll} disabled={diceRoll !== null} />
          </div>
        </div>

        {/* Right — players 1 & 2 */}
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
