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
    // 1. Outer ring (16 squares)
    const rotatedOuter = [...outer.slice(startIndex), ...outer.slice(0, startIndex)];
    
    // 2. Add home square again (The piece visits home before entering inner ring)
    const homeSquare = outer[startIndex];
    
    // 3. Inner ring (8 squares)
    // Mapping starting outer index to inner starting square
    let rotatedInner: [number, number][] = [];
    if (startIndex === 0) rotatedInner = [...inner];
    else if (startIndex === 4) rotatedInner = [...inner.slice(2), ...inner.slice(0, 2)];
    else if (startIndex === 8) rotatedInner = [...inner.slice(4), ...inner.slice(0, 4)];
    else if (startIndex === 12) rotatedInner = [...inner.slice(6), ...inner.slice(0, 6)];

    // 4. Return to inner starting square before entering center
    const innerStart = rotatedInner[0];

    return [...rotatedOuter, homeSquare, ...rotatedInner, innerStart, center];
  };

  return {
    player1: rotatePath(0),  // Start [4,2]
    player2: rotatePath(4),  // Start [2,4]
    player3: rotatePath(8),  // Start [0,2]
    player4: rotatePath(12)  // Start [2,0]
  };
};
