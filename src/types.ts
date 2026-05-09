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
  diceRoll: number | null;
  status: 'setup' | 'playing' | 'winner';
  winner: Player | null;
  logs: string[];
};

export const GRID_SIZE = 5;

// Common safe squares [row, col]
export const SAFE_SQUARES = [
  [0, 0], [0, 4], [4, 0], [4, 4],
  [2, 0], [2, 4], [0, 2], [4, 2],
  [2, 2]
];

// Helper to check if a square is safe
export const isSafe = (r: number, c: number) => {
  return SAFE_SQUARES.some(([sr, sc]) => sr === r && sc === c);
};
