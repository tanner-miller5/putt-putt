import React, { useState, useRef, useEffect } from 'react';
import './GolfGameStyles.css';

function MiniGolfGame() {
  const initializeGame = () => {
    const newGrid = Array(8).fill().map(() => Array(8).fill(0));
    let holeX, holeY;
    do {
      holeX = Math.floor(Math.random() * 8);
      holeY = Math.floor(Math.random() * 8);
    } while (holeX === 0 && holeY === 0);

    newGrid[holeX][holeY] = 2;
    return { grid: newGrid, holePosition: { x: holeX, y: holeY } };
  };

  const initialState = initializeGame();
  const [grid, setGrid] = useState(initialState.grid);
  const [hole, setHole] = useState(initialState.holePosition);
  const [ball, setBall] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [currentDrag, setCurrentDrag] = useState(null);
  const [strokes, setStrokes] = useState(0);
  const [isSwinging, setIsSwinging] = useState(false);
  const mouseDownTime = useRef(null);
  const gridRef = useRef(null);
  // ... (keep existing state variables)
  const [ballStyle, setBallStyle] = useState({});

  const handleRightClick = (rowIndex, colIndex, e) => {
    e.preventDefault();
    if ((rowIndex === hole.x && colIndex === hole.y) || 
        (rowIndex === ball.x && ball.y === colIndex)) {
      return;
    }
    const newGrid = grid.map(row => [...row]);
    newGrid[rowIndex][colIndex] = newGrid[rowIndex][colIndex] === 1 ? 0 : 1;
    setGrid(newGrid);
  };

  const handleBallDragStart = (e) => {
    e.preventDefault();
    const rect = gridRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setIsDragging(true);
    setDragStart({ x, y });
    setCurrentDrag({ x, y });
  };

  const handleDragMove = (e) => {
    if (!isDragging) return;
    const rect = gridRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCurrentDrag({ x, y });
  };

const calculateNewBallPosition = (dx, dy, power) => {
  const maxMove = Math.min(power, 3);
  let velocityX = dx / 50 * maxMove;
  let velocityY = dy / 50 * maxMove;
  let newX = ball.x;
  let newY = ball.y;
  let bounced = false;
  
  // Simulate movement with bounces
  for (let step = 0; step < maxMove; step++) {
    // Calculate next position
    let nextX = Math.round(newX + velocityY);
    let nextY = Math.round(newY + velocityX);
    
    // Check wall collisions and bounce
    if (nextX < 0) {
      nextX = 0;
      velocityY = -velocityY * 0.8; // Bounce with energy loss
      bounced = true;
    } else if (nextX > 7) {
      nextX = 7;
      velocityY = -velocityY * 0.8;
      bounced = true;
    }
    
    if (nextY < 0) {
      nextY = 0;
      velocityX = -velocityX * 0.8;
      bounced = true;
    } else if (nextY > 7) {
      nextY = 7;
      velocityX = -velocityX * 0.8;
      bounced = true;
    }
    
    // Check barrier collisions
    if (grid[nextX][nextY] === 1) {
      // Determine bounce direction
      const fromLeft = Math.abs(nextY - newY) > Math.abs(nextX - newX);
      
      if (fromLeft) {
        velocityX = -velocityX * 0.8;
        nextY = newY;
      } else {
        velocityY = -velocityY * 0.8;
        nextX = newX;
      }
      bounced = true;
      
      // If both directions are blocked, stop movement
      if (grid[newX][nextY] === 1 && grid[nextX][newY] === 1) {
        return { x: newX, y: newY, bounced };
      }
    }
    
    // If position hasn't changed after bounce attempts, stop movement
    if (nextX === newX && nextY === newY) {
      break;
    }
    
    newX = nextX;
    newY = nextY;
    
    // Stop if velocity becomes too small
    if (Math.abs(velocityX) < 0.1 && Math.abs(velocityY) < 0.1) {
      break;
    }
  }
  
  // Ensure final position is within bounds
  newX = Math.max(0, Math.min(7, newX));
  newY = Math.max(0, Math.min(7, newY));
  
  return {
    x: newX,
    y: newY,
    bounced
  };
};

  // Replace the ball animation logic in handleDragEnd:
  const handleDragEnd = () => {
    if (!isDragging || !dragStart || !currentDrag) return;
    
    const dx = dragStart.x - currentDrag.x;
    const dy = dragStart.y - currentDrag.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const power = Math.floor(distance / 50);
    
    setIsSwinging(true);
    
    const newPosition = calculateNewBallPosition(dx, dy, power);
    if (newPosition) {
      // Calculate the pixel movement
      const moveX = (newPosition.y - ball.y) * 50;
      const moveY = (newPosition.x - ball.x) * 50;
      
      // Set the CSS variables for the animation
      setBallStyle({
        '--move-x': `${moveX}px`,
        '--move-y': `${moveY}px`
      });
      
      // Start the animation
      setTimeout(() => {
        setBall({ x: newPosition.x, y: newPosition.y });
        setStrokes(strokes + 1);
        setBallStyle({}); // Reset the style
        
        if (newPosition.x === hole.x && newPosition.y === hole.y) {
          setTimeout(() => {
            alert(`Congratulations! You got the ball in the hole in ${strokes + 1} strokes!`);
            const newGame = initializeGame();
            setGrid(newGame.grid);
            setHole(newGame.holePosition);
            setBall({ x: 0, y: 0 });
            setStrokes(0);
          }, 500);
        }
      }, 500);
    }
    
    setTimeout(() => {
      setIsSwinging(false);
    }, 500);
    
    setIsDragging(false);
    setDragStart(null);
    setCurrentDrag(null);
  };

  useEffect(() => {
    const handleMouseMove = (e) => handleDragMove(e);
    const handleMouseUp = () => handleDragEnd();

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, currentDrag]);

  const getGolfClub = () => {
    if (!isDragging && !isSwinging) return null;
    
    // Use current drag position for the club location
    const clubX = currentDrag ? currentDrag.x : ball.y * 50 + 25;
    const clubY = currentDrag ? currentDrag.y : ball.x * 50 + 25;
    
    // Calculate angle between ball and cursor
    const ballX = ball.y * 50 + 25;
    const ballY = ball.x * 50 + 25;
    const angle = isDragging
      ? Math.atan2(clubY - ballY, clubX - ballX) * 180 / Math.PI + 90
      : isSwinging ? 45 : 90;
    
    return (
      <g transform={`translate(${clubX},${clubY}) rotate(${angle})`}>
        <line
          x1="0"
          y1="0"
          x2="30"
          y2="0"
          stroke="#666"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <rect
          x="30"
          y="-6"
          width="12"
          height="12"
          fill="#666"
          rx="2"
        />
      </g>
    );
  };

  const getTrajectoryArrow = () => {
    if (!isDragging || !dragStart || !currentDrag) return null;
    
    // Calculate direction from drag (reversed since we pull back to shoot)
    const dx = dragStart.x - currentDrag.x;
    const dy = dragStart.y - currentDrag.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const power = Math.min(Math.floor(distance / 50), 3);
    
    // Calculate predicted end position
    const predictedPosition = calculateNewBallPosition(dx, dy, power);
    if (!predictedPosition) return null;
    
    const ballX = ball.y * 50 + 25;
    const ballY = ball.x * 50 + 25;
    const endX = predictedPosition.y * 50 + 25;
    const endY = predictedPosition.x * 50 + 25;
    
    // Calculate angle for the trajectory (reversed for correct direction)
    const angle = Math.atan2(dy, dx);
    
    // Calculate arrow head points
    const arrowLength = 15;
    const arrowAngle = Math.PI / 6; // 30 degrees
    
    const arrowPoint1X = endX - arrowLength * Math.cos(angle - arrowAngle);
    const arrowPoint1Y = endY - arrowLength * Math.sin(angle - arrowAngle);
    const arrowPoint2X = endX - arrowLength * Math.cos(angle + arrowAngle);
    const arrowPoint2Y = endY - arrowLength * Math.sin(angle + arrowAngle);
    
    return (
      <g className="trajectory">
        <line
          x1={ballX}
          y1={ballY}
          x2={endX}
          y2={endY}
          stroke="#00cc00"
          strokeWidth="2"
          strokeDasharray="5,5"
        />
        <path
          d={`M ${endX} ${endY} 
              L ${arrowPoint1X} ${arrowPoint1Y} 
              L ${arrowPoint2X} ${arrowPoint2Y} 
              Z`}
          fill="#00cc00"
        />
      </g>
    );
  };

  // Update the ball rendering in the return statement:
  return (
    <div className="App">
      <h1>Mini Golf Game</h1>
      <div className="score-board">
        Strokes: {strokes}
      </div>
      <div className="instructions">
        <h2>How to Play:</h2>
        <ul>
          <li>🖱️ Right-click any square to create or remove a barrier</li>
          <li>⏲️ Click and hold (0.5 seconds) on a square to set it as the hole</li>
          <li>🏌️ Click and drag from the ball to aim and set power</li>
          <li>💪 The further you drag, the more power you'll hit with</li>
          <li>🎯 Try to get the ball in the hole with the fewest strokes!</li>
          <li>📏 Green arrow shows predicted ball path</li>
        </ul>
      </div>
      <div className="golf-grid" ref={gridRef}>
        <svg className="aim-overlay" style={{ position: 'absolute', pointerEvents: 'none' }}>
          {getGolfClub()}
          {getTrajectoryArrow()}
        </svg>
        <div 
          className={`ball-element ${Object.keys(ballStyle).length > 0 ? 'ball-moving' : ''}`}
          style={{
            ...ballStyle,
            position: 'absolute',
            left: `${ball.y * 50 + 40}px`, // Adjusted from 15 to 40
            top: `${ball.x * 50 + 40}px`,  // Adjusted from 15 to 40
            transform: Object.keys(ballStyle).length > 0 ? `translate(${ballStyle['--move-x']}, ${ballStyle['--move-y']})` : 'none',
            pointerEvents: isDragging ? 'none' : 'auto',
            cursor: 'grab'
          }}
          onMouseDown={handleBallDragStart}
        />
        {grid.map((row, rowIndex) => (
          <div key={rowIndex} className="row">
            {row.map((cell, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`cell ${
                  cell === 1 ? 'barrier' : cell === 2 ? 'hole' : ''
                }`}
                onContextMenu={(e) => handleRightClick(rowIndex, colIndex, e)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default MiniGolfGame;