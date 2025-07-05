import React, { useState, useRef, useEffect } from 'react';
import './GolfGameStyles.css';

const GRID_SIZE = 10;
const CELL_SIZE = 40;

const MiniGolfGame = () => {
  const gridRef = useRef(null);
  const [grid, setGrid] = useState(Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0)));
  const [hole, setHole] = useState({ x: 8, y: 8 });
  const [ball, setBall] = useState({ x: 1, y: 1 });
  const [strokes, setStrokes] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingHole, setIsDraggingHole] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragEnd, setDragEnd] = useState({ x: 0, y: 0 });
  const [ballMoving, setBallMoving] = useState(false);
  // Add these new state variables at the top of your component
  const [showGolfClub, setShowGolfClub] = useState(false);
  const [clubAngle, setClubAngle] = useState(0);
  // Add new state for hole preview
  const [previewHole, setPreviewHole] = useState(null);
  // Add state for game won
  const [gameWon, setGameWon] = useState(false);
  const [canMoveHole, setCanMoveHole] = useState(true);
  const [showTrajectory, setShowTrajectory] = useState(false);


// Update the calculateBallPath function with improved collision detection
const calculateBallPath = (dx, dy, power) => {
  const moves = [];
  let currentX = ball.x;
  let currentY = ball.y;
  let currentDirX = dx / Math.sqrt(dx * dx + dy * dy);
  let currentDirY = dy / Math.sqrt(dx * dx + dy * dy);
  const stepSize = 0.1;
  const maxSteps = Math.min(power * 2, 200);
  const energyLoss = 0.8;
  let inHole = false;
  
  const checkBarrierCollision = (x, y) => {
    const cellX = Math.floor(x);
    const cellY = Math.floor(y);
    const cellCenterX = cellX + 0.5;
    const cellCenterY = cellY + 0.5;  // Fixed from cellCenterY
    
    // Check if position is within grid bounds
    if (cellX >= 0 && cellX < GRID_SIZE && cellY >= 0 && cellY < GRID_SIZE) {
      if (grid[cellY][cellX] === 1) {
        // Calculate distances from point to cell center
        const distX = Math.abs(x - cellCenterX);
        const distY = Math.abs(y - cellCenterY);
        
        return {
          collision: true,
          horizontal: distX > distY,
          vertical: distY > distX
        };
      }
    }
    return { collision: false };
  };

  for (let i = 0; i < maxSteps; i++) {
    // Check for hole
    if (Math.abs(currentX - hole.x) < 0.4 && Math.abs(currentY - hole.y) < 0.4) {
      moves.push({ x: hole.x, y: hole.y });
      inHole = true;
      break;
    }

    // Calculate next position
    const nextX = currentX + currentDirX * stepSize;
    const nextY = currentY + currentDirY * stepSize;
    
    // Check boundaries
    let collision = false;
    let newDirX = currentDirX;
    let newDirY = currentDirY;

    // Boundary collisions
    if (nextX < 0) {
      collision = true;
      currentX = stepSize;
      newDirX = Math.abs(currentDirX);
    } else if (nextX >= GRID_SIZE) {
      collision = true;
      currentX = GRID_SIZE - stepSize;
      newDirX = -Math.abs(currentDirX);
    }
    
    if (nextY < 0) {
      collision = true;
      currentY = stepSize;
      newDirY = Math.abs(currentDirY);
    } else if (nextY >= GRID_SIZE) {
      collision = true;
      currentY = GRID_SIZE - stepSize;
      newDirY = -Math.abs(currentDirY);
    }

    // Check barrier collisions
    if (!collision) {
      const barrierCheck = checkBarrierCollision(nextX, nextY);
      if (barrierCheck.collision) {
        collision = true;
        
        if (barrierCheck.horizontal) {
          newDirX = -currentDirX;
          currentX = Math.floor(currentX) + (currentDirX > 0 ? 0.9 : 0.1);
        }
        if (barrierCheck.vertical) {
          newDirY = -currentDirY;
          currentY = Math.floor(currentY) + (currentDirY > 0 ? 0.9 : 0.1);
        }
      }
    }

    if (collision) {
      // Apply energy loss and update direction
      currentDirX = newDirX * energyLoss;
      currentDirY = newDirY * energyLoss;
      
      // Stop if speed is too low after collision
      if (Math.abs(currentDirX) < 0.01 && Math.abs(currentDirY) < 0.01) {
        moves.push({ x: currentX, y: currentY });
        break;
      }
    } else {
      currentX = nextX;
      currentY = nextY;
    }
    
    moves.push({ x: currentX, y: currentY });
    
    // Apply friction
    currentDirX *= 0.995;
    currentDirY *= 0.995;
    
    // Stop if speed is too low
    if (Math.abs(currentDirX) < 0.01 && Math.abs(currentDirY) < 0.01) {
      break;
    }
  }
  
  return { moves, inHole };
};

// Add or update the mouse event handlers
  const handleMouseDown = (e) => {
    if (ballMoving) return;

    const rect = gridRef.current.getBoundingClientRect();
    const cellSize = rect.width / GRID_SIZE;

    // Calculate click position relative to grid
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Calculate ball position in pixels
    const ballPixelX = ball.x * cellSize + cellSize / 2;
    const ballPixelY = ball.y * cellSize + cellSize / 2;

    // Check if click is on the ball (within a small radius)
    const dx = clickX - ballPixelX;
    const dy = clickY - ballPixelY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= cellSize / 2) {
      setIsDragging(true);
      setDragStart({ x: clickX, y: clickY });
      setDragEnd({ x: clickX, y: clickY });
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging || ballMoving) return;

    const rect = gridRef.current.getBoundingClientRect();
    const newDragEnd = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    setDragEnd(newDragEnd);
  };

  const handleMouseUp = () => {
    if (!isDragging || ballMoving) return;

    const dx = dragEnd.x - dragStart.x;
    const dy = dragEnd.y - dragStart.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 5) { // Minimum distance threshold to prevent accidental hits
      // Reverse the direction (drag backwards to shoot forwards)
      moveBall(-dx, -dy, distance);
      setStrokes(prev => prev + 1);
    }

    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };



// Touch event handlers
const [touchRect, setTouchRect] = useState(null);

const handleTouchMove = (e) => {
  if (!isDragging || ballMoving || !touchRect) return;
  e.preventDefault();
  
  const touch = e.touches[0];
  const newDragEnd = {
    x: touch.clientX - touchRect.left,
    y: touch.clientY - touchRect.top
  };
  setDragEnd(newDragEnd);
};

const handleTouchEnd = (e) => {
  if (!isDragging || ballMoving) return;
  e.preventDefault();
  
  setIsDragging(false);
  if (dragStart && dragEnd) {
    const dx = dragStart.x - dragEnd.x;
    const dy = dragStart.y - dragEnd.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 5) {
      moveBall(dx, dy, distance);
      setStrokes(strokes + 1);
    }
  }
  
  setDragStart(null);
  setDragEnd(null);
  setTouchRect(null);
  
  document.removeEventListener('touchmove', handleTouchMove);
  document.removeEventListener('touchend', handleTouchEnd);
};

const handleTouchStart = (e) => {
  if (ballMoving) return;
  e.preventDefault();
  
  const rect = gridRef.current.getBoundingClientRect();
  setTouchRect(rect);
  
  const touch = e.touches[0];
  const dragStartPos = {
    x: touch.clientX - rect.left,
    y: touch.clientY - rect.top
  };
  setDragStart(dragStartPos);
  setDragEnd(dragStartPos);
  setIsDragging(true);

  document.addEventListener('touchmove', handleTouchMove, { passive: false });
  document.addEventListener('touchend', handleTouchEnd);
};

// Update the handleHoleDragStart
  const handleHoleDragStart = (e) => {
    if (ballMoving || !canMoveHole) return;
    e.preventDefault();

    const rect = gridRef.current.getBoundingClientRect();
    const cellSize = rect.width / GRID_SIZE;
    setIsDraggingHole(true);
    setShowTrajectory(false); // Hide trajectory when dragging hole

    const handleHoleMove = (moveEvent) => {
      if (!isDraggingHole) return;
      moveEvent.preventDefault();

      const clientX = moveEvent.touches ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const clientY = moveEvent.touches ? moveEvent.touches[0].clientY : moveEvent.clientY;

      const x = Math.floor((clientX - rect.left) / cellSize);
      const y = Math.floor((clientY - rect.top) / cellSize);

      if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
        const ballX = Math.floor(ball.x);
        const ballY = Math.floor(ball.y);
        if (grid[y][x] !== 1 && (x !== ballX || y !== ballY)) {
          setHole({ x, y });
        }
      }
    };

    const handleHoleEnd = () => {
      setIsDraggingHole(false);
      setShowTrajectory(false);
    };

    document.addEventListener('mousemove', handleHoleMove);
    document.addEventListener('mouseup', handleHoleEnd);
    document.addEventListener('touchmove', handleHoleMove, { passive: false });
    document.addEventListener('touchend', handleHoleEnd);
  };


// Update the handleBallDragStart
  const handleBallDragStart = (e) => {
    if (ballMoving || isDraggingHole) return;

    e.preventDefault();
    const rect = gridRef.current.getBoundingClientRect();
    const startPos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    setIsDragging(true);
    setDragStart(startPos);
    setDragEnd(startPos);
    setShowGolfClub(true);
    setShowTrajectory(!isDraggingHole); // Only show trajectory if not dragging hole
  };


  const initializeGame = () => {
    // Cancel any ongoing animations
    setBallMoving(false);
    setShowGolfClub(false);
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
    
    // Reset the game state
    const newGrid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
    const startBallX = 1;
    const startBallY = 1;
    
    // First create empty grid
    //const newGrid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
    
    // Set initial positions
    //const startBallX = 1;
    //const startBallY = 1;
    
    // Find a valid hole position (not on a barrier and not near the ball)
    const getValidHolePosition = () => {
      const minDistance = 4; // Minimum distance from ball
      while (true) {
        const x = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1;
        const y = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1;
        
        // Check distance from ball
        const distance = Math.sqrt(
          Math.pow(x - startBallX, 2) + Math.pow(y - startBallY, 2)
        );
        
        if (distance >= minDistance) {
          return { x, y };
        }
      }
    };

    const holePos = getValidHolePosition();
    const startHoleX = holePos.x;
    const startHoleY = holePos.y;

    // Clear areas around ball and hole
    const clearArea = (x, y, radius = 1) => {
      for (let i = -radius; i <= radius; i++) {
        for (let j = -radius; j <= radius; j++) {
          const newX = x + i;
          const newY = y + j;
          if (newX >= 0 && newX < GRID_SIZE && newY >= 0 && newX < GRID_SIZE) {
            newGrid[newY][newX] = 0;
          }
        }
      }
    };

    // Add barriers randomly
    for (let i = 0; i < 15; i++) {
      let x, y;
      do {
        x = Math.floor(Math.random() * GRID_SIZE);
        y = Math.floor(Math.random() * GRID_SIZE);
      } while (
        // Keep areas around ball and hole clear
        (Math.abs(x - startBallX) <= 1 && Math.abs(y - startBallY) <= 1) ||
        (Math.abs(x - startHoleX) <= 1 && Math.abs(y - startHoleY) <= 1) ||
        newGrid[y][x] === 1
      );
      newGrid[y][x] = 1;
    }

    // Clear areas again to ensure they're empty
    clearArea(startBallX, startBallY);
    clearArea(startHoleX, startHoleY);

    setBall({ x: startBallX, y: startBallY });
    setHole({ x: startHoleX, y: startHoleY });
    setGrid(newGrid);
    setStrokes(0);  // Make sure strokes are reset
    setGameWon(false);
  };

  // Add useEffect for handleMouseMove
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging && !ballMoving) {
        const rect = gridRef.current.getBoundingClientRect();
        const newDragEnd = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        };
        setDragEnd(newDragEnd);
        
        // Calculate club angle
        const ballScreenX = (ball.x * rect.width) / GRID_SIZE;
        const ballScreenY = (ball.y * rect.height) / GRID_SIZE;
        const dx = newDragEnd.x - ballScreenX;
        const dy = newDragEnd.y - ballScreenY;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        setClubAngle(angle);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isDragging, ballMoving, ball.x, ball.y]);

// Update moveBall function
  const moveBall = (dx, dy, distance) => {
    if (ballMoving) return;

    setBallMoving(true);
    setCanMoveHole(false);

    // Normalize the direction vector
    const length = Math.sqrt(dx * dx + dy * dy);
    const normalizedDx = dx / length;
    const normalizedDy = dy / length;

    // Scale the power based on drag distance
    const power = Math.min(distance * 0.2, 50); // Cap the maximum power

    // Calculate the final velocities
    const velocityX = normalizedDx * power;
    const velocityY = normalizedDy * power;

    const { moves, inHole } = calculateBallPath(velocityX, velocityY, power);
    let moveIndex = 0;

    const animate = () => {
      if (moveIndex >= moves.length) {
        setBallMoving(false);
        setCanMoveHole(true);
        const finalPos = moves[moves.length - 1];

        if (inHole &&
            Math.abs(finalPos.x - hole.x) < 0.4 &&
            Math.abs(finalPos.y - hole.y) < 0.4) {
          setGameWon(true);
        }

        setBall(finalPos);
        return;
      }

      setBall(moves[moveIndex]);
      moveIndex++;
      requestAnimationFrame(animate);
    };

    animate();
  };



  // Add this function to find a valid initial hole position
const findValidHolePosition = () => {
  const validPositions = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (grid[y][x] !== 1 && // Not a barrier
          !(Math.floor(ball.x) === x && Math.floor(ball.y) === y)) { // Not on ball
        validPositions.push({ x, y });
      }
    }
  }
  if (validPositions.length > 0) {
    const randomPosition = validPositions[Math.floor(Math.random() * validPositions.length)];
    return { x: randomPosition.x, y: randomPosition.y };
  }
  return { x: 0, y: 0 }; // Fallback position
};

// Update initialization
useEffect(() => {
  const initialHolePos = findValidHolePosition();
  setHole({ x: initialHolePos.x, y: initialHolePos.y });
}, [grid, ball.x, ball.y]); // Add missing dependencies for findValidHolePosition

const getTrajectoryArrow = () => {
  if (!isDragging || !gridRef.current) return null;

  const rect = gridRef.current.getBoundingClientRect();
  const cellSize = rect.width / GRID_SIZE;

  // Calculate ball center position in screen coordinates
  const ballScreenX = (ball.x * cellSize) + (cellSize / 2);
  const ballScreenY = (ball.y * cellSize) + (cellSize / 2);

  // Calculate direction from ball center position to cursor
  const dx = dragEnd.x - ballScreenX;
  const dy = dragEnd.y - ballScreenY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < 5) return null;

  const paths = [];
  let currentPath = [];
  let willWin = false;

  // Calculate initial direction and power
  const power = Math.min(distance * 0.2, 20);
  const dirX = -dx / distance;  // Reverse direction for shooting
  const dirY = -dy / distance;
  
  // Rest of the function remains the same...

  let currentX = ball.x;
  let currentY = ball.y;
  let currentDirX = dirX;
  let currentDirY = dirY;
  const stepSize = 0.1;
  let remainingSteps = power / stepSize;

  // Add initial position
  currentPath.push({ x: currentX, y: currentY });

  while (remainingSteps > 0) {
    const nextX = currentX + currentDirX * stepSize;
    const nextY = currentY + currentDirY * stepSize;

    // Check for hole
    if (Math.abs(nextX - hole.x) < 0.4 && Math.abs(nextY - hole.y) < 0.4) {
      currentPath.push({ x: hole.x, y: hole.y });
      paths.push(currentPath);
      willWin = true;
      break;
    }

    // Check for collisions
    let collision = false;
    let newDirX = currentDirX;
    let newDirY = currentDirY;

    // Boundary collisions
    if (nextX < 0 || nextX >= GRID_SIZE || nextY < 0 || nextY >= GRID_SIZE) {
      collision = true;
      if (nextX < 0 || nextX >= GRID_SIZE) newDirX *= -1;
      if (nextY < 0 || nextY >= GRID_SIZE) newDirY *= -1;
    } else {
      // Barrier collisions
      const gridX = Math.floor(nextX);
      const gridY = Math.floor(nextY);
      
      if (grid[gridY]?.[gridX] === 1) {
        collision = true;
        const relX = nextX - gridX;
        const relY = nextY - gridY;
        
        if (Math.abs(relX - 0.5) > Math.abs(relY - 0.5)) {
          newDirX *= -1;
        } else {
          newDirY *= -1;
        }
      }
    }

    if (collision) {
      // End current path segment
      paths.push([...currentPath]);
      
      // Start new path segment
      currentPath = [{ x: currentX, y: currentY }];
      
      // Update direction with energy loss
      currentDirX = newDirX * 0.8;
      currentDirY = newDirY * 0.8;
      
      // Stop if speed is too low
      if (Math.abs(currentDirX) < 0.01 && Math.abs(currentDirY) < 0.01) {
        break;
      }
    } else {
      currentX = nextX;
      currentY = nextY;
      currentPath.push({ x: currentX, y: currentY });
    }

    remainingSteps--;
  }

  // Add final path if not empty
  if (currentPath.length > 1) {
    paths.push(currentPath);
  }

  return (
    <svg
      className="aim-overlay"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none'
      }}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon 
            points="0 0, 10 3.5, 0 7" 
            fill={willWin ? "#00ff00" : "red"}
          />
        </marker>
      </defs>
      {paths.map((pathPoints, index) => (
        <path
          key={index}
          d={pathPoints.map((point, i) => 
            `${i === 0 ? 'M' : 'L'} ${point.x * cellSize + cellSize/2} ${point.y * cellSize + cellSize/2}`
          ).join(' ')}
          stroke={willWin ? "#00ff00" : "red"}
          strokeWidth="2"
          strokeDasharray="5,5"
          fill="none"
          markerEnd={index === paths.length - 1 ? "url(#arrowhead)" : ""}
        />
      ))}
    </svg>
  );
};

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging && !ballMoving) {
        const rect = gridRef.current.getBoundingClientRect();
        const newDragEnd = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        };
        setDragEnd(newDragEnd);
        
        // Calculate club angle
        const dx = newDragEnd.x - (ball.x * CELL_SIZE + CELL_SIZE/2);
        const dy = newDragEnd.y - (ball.x * CELL_SIZE + CELL_SIZE/2);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        setClubAngle(angle);
      }
    };

    const handleMouseUp = (e) => {
      if (isDragging && !ballMoving) {
        const dx = dragStart.x - dragEnd.x;
        const dy = dragStart.y - dragEnd.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 10) {
          setStrokes((prev) => prev + 1);
          setShowGolfClub(false);
          moveBall(dx / distance, dy / distance, distance);
        }
      }
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    isDragging,
    ballMoving,
    dragStart,
    dragEnd,
    ball.x,
    ball.y,
    CELL_SIZE,
    moveBall,
    setDragEnd,
    setClubAngle,
    setStrokes,
    setShowGolfClub,
    setIsDragging
  ]);

  const handleCellDoubleClick = (rowIndex, colIndex) => {
    if (ballMoving) return;
    
    // Calculate the actual ball and hole positions on the grid
    const ballGridX = Math.floor(ball.x);
    const ballGridY = Math.floor(ball.y);
    const holeGridX = Math.floor(hole.x);
    const holeGridY = Math.floor(hole.y);
    
    // Check if trying to place barrier on ball or hole
    if ((colIndex === ballGridX && rowIndex === ballGridY) ||
        (colIndex === holeGridX && rowIndex === holeGridY)) {
      return;
    }

    const newGrid = grid.map(row => [...row]); // Create a deep copy
    newGrid[rowIndex][colIndex] = newGrid[rowIndex][colIndex] === 1 ? 0 : 1;
    setGrid(newGrid);
  };

  
// Add CSS variable for grid size
useEffect(() => {
  const gridElement = gridRef.current;
  if (gridElement) {
    gridElement.style.setProperty('--grid-size', GRID_SIZE);
  }
}, []);

// Update the CSS for better layout and instruction visibility

// Add aim line rendering
  const renderAimingLine = () => {
    if (!isDragging || !dragStart || !dragEnd) return null;

    const dx = dragEnd.x - dragStart.x;
    const dy = dragEnd.y - dragStart.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return (
        <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none'
            }}
        >
          <line
              x1={dragStart.x}
              y1={dragStart.y}
              x2={dragEnd.x}
              y2={dragEnd.y}
              stroke="rgba(255, 255, 255, 0.6)"
              strokeWidth="2"
              strokeDasharray="5,5"
          />
          <line
              x1={dragStart.x}
              y1={dragStart.y}
              x2={dragStart.x + (-dx * 0.2)}
              y2={dragStart.y + (-dy * 0.2)}
              stroke="rgba(255, 0, 0, 0.6)"
              strokeWidth="2"
          />
        </svg>
    );
  };


// Update the return statement with new layout
return (
  <div className="game-container">
    <div className="game-header">
      <div className="instructions">
        <h2>How to Play</h2>
        <ul>
          <li>Click and drag the white ball to aim and set power</li>
          <li>Release to hit the ball towards the black hole</li>
          <li>Click and drag the black hole to move it to a new location (only when the ball is stationary)</li>
          <li>Double-click any empty cell to create or remove barriers</li>
          <li>Get the ball into the hole with the fewest shots possible!</li>
        </ul>
      </div>
      <div className="score-board">
        Strokes: {strokes}
      </div>
    </div>

    <div className="golf-game">
      {gameWon && (
        <div className="win-message">
          <h2>🎉 Congratulations! 🎉</h2>
          <p>You completed the course in {strokes} {strokes === 1 ? 'stroke' : 'strokes'}!</p>
          <button
            className="play-again-button"
            onClick={() => {
              setGameWon(false);
              setStrokes(0);
              initializeGame();
            }}
          >
            Play Again
          </button>
        </div>
      )}

      <div 
        ref={gridRef}
        className="golf-grid"
        onMouseDown={handleBallDragStart}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {grid.map((row, rowIndex) => (
          <div key={rowIndex} className="row">
            {row.map((cell, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`cell ${cell === 1 ? 'barrier' : ''}`}
                onDoubleClick={() => handleCellDoubleClick(rowIndex, colIndex)}
              />
            ))}
          </div>
        ))}

        <div
          className="ball-container"
          style={{
            left: `${(ball.x * (100 / GRID_SIZE))}%`,
            top: `${(ball.y * (100 / GRID_SIZE))}%`,
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <div className="ball" />
        </div>

        {isDragging && renderAimingLine()}
        {isDragging && getTrajectoryArrow()}

        <div
          className="hole"
          style={{
            position: 'absolute',
            left: `${(hole.x * 100) / GRID_SIZE}%`,
            top: `${(hole.y * 100) / GRID_SIZE}%`,
            width: `${100 / GRID_SIZE}%`,
            height: `${100 / GRID_SIZE}%`,
            cursor: 'move',
            zIndex: isDraggingHole ? 1000 : 3,
          }}
          onMouseDown={handleHoleDragStart}
          onTouchStart={handleHoleDragStart}
        />
      </div>
    </div>
  </div>
);
};

export default MiniGolfGame;