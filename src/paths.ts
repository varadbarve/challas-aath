

export const getPaths = () => {
  const outer: [number, number][] = [
    [4, 2], [4, 3], [4, 4], [3, 4], [2, 4], [1, 4], [0, 4], [0, 3], 
    [0, 2], [0, 1], [0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [4, 1]
  ];

  // Inner ring corners and midpoints in anti-clockwise order
  // Starting from Red's entry corner [3,1]
  const inner: [number, number][] = [
    [3, 1], [2, 1], [1, 1], [1, 2], [1, 3], [2, 3], [3, 3], [3, 2]
  ];

  const center: [number, number] = [2, 2];

  const rotatePath = (startIndex: number) => {
    // 1. Outer ring (15 squares instead of 16, piece jumps inside from 15th)
    const rotatedOuter = [...outer.slice(startIndex), ...outer.slice(0, startIndex)].slice(0, 15);
    
    // 2. Inner ring (8 squares)
    // Red (idx 0) starts inner at [3,1] (inner index 0)
    // Blue (idx 4) starts inner at [3,3] (inner index 6)
    // Yellow (idx 8) starts inner at [1,3] (inner index 4)
    // Green (idx 12) starts inner at [1,1] (inner index 2)
    let innerStartIdx = 0;
    if (startIndex === 0) innerStartIdx = 0;
    else if (startIndex === 4) innerStartIdx = 6;
    else if (startIndex === 8) innerStartIdx = 4;
    else if (startIndex === 12) innerStartIdx = 2;

    const rotatedInner = [...inner.slice(innerStartIdx), ...inner.slice(0, innerStartIdx)];

    return [...rotatedOuter, ...rotatedInner, center];
  };

  return {
    player1: rotatePath(0),
    player2: rotatePath(4),
    player3: rotatePath(8),
    player4: rotatePath(12),
  };
};
