export type Player = {
  id: number;
  name: string;
  color: string;
  pieces: number[]; // Index in their respective path array (-1 means home)
  path: [number, number][];
  isFinished: boolean;
};

export type GameState = {
  players: Player[];
  currentPlayerIndex: number;
  status: 'setup' | 'playing' | 'finished';
  finishedPlayers: Player[];
  logs: string[];
  turnPhase: 'rolling' | 'moving';
  pendingRolls: number[];
  selectedRollIndex: number | null;
  extraRolls: number;
};

export const GRID_SIZE = 5;

// Safe squares [row, col] — starting squares of each player + center (NOT corners)
export const SAFE_SQUARES = [
  [4, 2], // Player 1 (Red) home
  [2, 4], // Player 2 (Blue) home
  [0, 2], // Player 3 (Yellow) home
  [2, 0], // Player 4 (Green) home
  [2, 2], // Center
];

// Helper to check if a square is safe
export const isSafe = (r: number, c: number) => {
  return SAFE_SQUARES.some(([sr, sc]) => sr === r && sc === c);
};
