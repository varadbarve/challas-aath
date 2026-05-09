export const getPaths = () => {
  // Path for 5x5 Ashta Chamma
  // Outer ring (16 squares)
  const outer = [
    [4, 2], [4, 3], [4, 4], [3, 4], [2, 4], [1, 4], [0, 4], [0, 3], 
    [0, 2], [0, 1], [0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [4, 1]
  ] as [number, number][];

  // Inner ring (8 squares)
  const inner = [
     [3, 2], [3, 3], [2, 3], [1, 3], [1, 2], [1, 1], [2, 1], [3, 1]
  ] as [number, number][];

  const center = [2, 2] as [number, number];

  // Function to rotate path for different players
  const rotatePath = (startIndex: number) => {
    const rotatedOuter = [...outer.slice(startIndex), ...outer.slice(0, startIndex)];
    // For inner ring, we need to map the entry point.
    // If you start at [4,2], you enter inner at [3,2].
    // If you start at [0,2], you enter inner at [1,2].
    // If you start at [2,0], you enter inner at [2,1].
    // If you start at [2,4], you enter inner at [2,3].
    
    // Mapping starting outer index to inner starting square
    // Player 1 (Red, index 0 in outer: [4,2]): enters inner at [3,2]
    // Player 2 (Blue, index 4 in outer: [2,4]): enters inner at [2,3]
    // Player 3 (Yellow, index 8 in outer: [0,2]): enters inner at [1,2]
    // Player 4 (Green, index 12 in outer: [2,0]): enters inner at [2,1]
    
    let rotatedInner: [number, number][] = [];
    if (startIndex === 0) rotatedInner = [...inner];
    else if (startIndex === 4) rotatedInner = [...inner.slice(2), ...inner.slice(0, 2)];
    else if (startIndex === 8) rotatedInner = [...inner.slice(4), ...inner.slice(0, 4)];
    else if (startIndex === 12) rotatedInner = [...inner.slice(6), ...inner.slice(0, 6)];

    return [...rotatedOuter, ...rotatedInner, center];
  };

  return {
    player1: rotatePath(0),  // Start [4,2]
    player2: rotatePath(4),  // Start [2,4]
    player3: rotatePath(8),  // Start [0,2]
    player4: rotatePath(12)  // Start [2,0]
  };
};
