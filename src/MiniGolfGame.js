import React, { useState, useEffect, useRef } from 'react';
import './GolfGameStyles.css';

const CELL_SIZE = 50;
const GRID_SIZE = 10;
const BALL_SPEED = 0.1;

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
    const cellCenterY = cellY + 0.5;
    
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

// Add mouse event handlers
const handleMouseDown = (e) => {
  if (ballMoving) return;
  
  const rect = gridRef.current.getBoundingClientRect();
  const dragStartPos = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
  setDragStart(dragStartPos);
  setDragEnd(dragStartPos); // Initialize dragEnd to prevent undefined on first move
  setIsDragging(true);

  // Add mouse move and up handlers
  const handleMouseMove = (e) => {
    if (!isDragging || ballMoving) return;
    
    const newDragEnd = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    setDragEnd(newDragEnd);
  };

  const handleMouseUp = (e) => {
    if (!isDragging || ballMoving) return;
    
    setIsDragging(false);
    const dx = dragStart.x - dragEnd.x;
    const dy = dragStart.y - dragEnd.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 5) {
      moveBall(dx, dy, distance);
      setStrokes(strokes + 1);
    }
    
    setDragStart(null);
    setDragEnd(null);
    
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
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

// Add aiming line render if dragging
const renderAimingLine = () => {
  if (!isDragging || !dragStart || !dragEnd) return null;
  
  return (
    <svg className="aim-overlay" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      <line
        x1={dragStart.x}
        y1={dragStart.y}
        x2={dragEnd.x}
        y2={dragEnd.y}
        stroke="rgba(255, 255, 255, 0.8)"
        strokeWidth="2"
        strokeDasharray="5,5"
      />
    </svg>
  );
};

// Add handleMouseUp function
const handleMouseUp = (e) => {
  if (!isDragging || ballMoving) return;
  
  setIsDragging(false);
  const dx = dragStart.x - dragEnd.x;
  const dy = dragStart.y - dragEnd.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance > 5) {
    moveBall(dx, dy, distance);
    setStrokes(strokes + 1);
  }
  
  setDragStart(null);
  setDragEnd(null);
};

// Update hole dragging with proper event handling
const handleHoleDragStart = (e) => {
  if (ballMoving) return;
  e.preventDefault();
  e.stopPropagation(); // Stop event from bubbling up to grid
  
  const pos = e.touches ? e.touches[0] : e;
  const rect = gridRef.current.getBoundingClientRect();
  setIsDraggingHole(true);

  const updateHolePreview = (clientX, clientY) => {
    const x = Math.floor((clientX - rect.left) / (rect.width / GRID_SIZE));
    const y = Math.floor((clientY - rect.top) / (rect.height / GRID_SIZE));
    
    if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
      if (grid[y][x] !== 1 && (x !== Math.floor(ball.x) || y !== Math.floor(ball.y))) {
        setPreviewHole({ x, y });
      }
    }
  };

  const handleMove = (e) => {
    if (!isDraggingHole) return;
    e.preventDefault();
    e.stopPropagation();
    const movePos = e.touches ? e.touches[0] : e;
    updateHolePreview(movePos.clientX, movePos.clientY);
  };

  const handleEnd = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsDraggingHole(false);
    if (previewHole) {
      setHole(previewHole);
    }
    setPreviewHole(null);
    document.removeEventListener('mousemove', handleMove);
    document.removeEventListener('mouseup', handleEnd);
    document.removeEventListener('touchmove', handleMove);
    document.removeEventListener('touchend', handleEnd);
  };

  document.addEventListener('mousemove', handleMove);
  document.addEventListener('mouseup', handleEnd);
  document.addEventListener('touchmove', handleMove);
  document.addEventListener('touchend', handleEnd);
  
  updateHolePreview(pos.clientX, pos.clientY);
};

// Update handleBallDragStart function
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
};

  useEffect(() => {
    initializeGame();
  }, []);

  const initializeGame = () => {
    // First create empty grid
    const newGrid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
    
    // Set initial positions
    const startBallX = 1;
    const startBallY = 1;
    const startHoleX = 8;
    const startHoleY = 8;

    // Clear areas around ball and hole
    const clearArea = (x, y) => {
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
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
        (Math.abs(x - startBallX) <= 1 && Math.abs(y - startBallY) <= 1) || // Keep area around ball clear
        (Math.abs(x - startHoleX) <= 1 && Math.abs(y - startHoleY) <= 1) || // Keep area around hole clear
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
    setStrokes(0);
    setBallMoving(false);
    setGameWon(false); // Make sure to reset the game won state
    setShowGolfClub(false);
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  // Update the moveBall function
  const moveBall = (dx, dy, power) => {
    if (ballMoving) return;
    
    setBallMoving(true);
    const { moves, inHole } = calculateBallPath(dx, dy, power);
    let moveIndex = 0;
    
    const animate = () => {
      if (moveIndex >= moves.length) {
        setBallMoving(false);
        // Get final ball position
        const finalPos = moves[moves.length - 1];
        // Check if final position matches hole position
        if (inHole) {
          setGameWon(true);
        }
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
}, []);

const getTrajectoryArrow = () => {
  if (!isDragging) return null;

  const startX = ball.x * CELL_SIZE + CELL_SIZE/2;
  const startY = ball.y * CELL_SIZE + CELL_SIZE/2;
  const dx = dragStart.x - dragEnd.x;
  const dy = dragStart.y - dragEnd.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < 5) return null;

  let currentDirX = dx / distance;
  let currentDirY = dy / distance;
  
  let currentX = ball.x;
  let currentY = ball.y;
  let points = [`M ${startX} ${startY}`];
  let remainingDistance = Math.min(distance * 0.2, 20);
  let willWin = false;
  
  while (remainingDistance > 0) {
    const nextX = currentX + currentDirX;
    const nextY = currentY + currentDirY;
    const gridX = Math.floor(nextX);
    const gridY = Math.floor(nextY);

    // Check for hole
    if (Math.abs(nextX - hole.x) < 0.5 && Math.abs(nextY - hole.y) < 0.5) {
      willWin = true;
      break;
    }

    // Check for collision with barriers
    if (gridX < 0 || gridX >= GRID_SIZE || gridY < 0 || gridY >= GRID_SIZE ||
        grid[gridY][gridX] === 1) {
      // Create new direction vectors after collision
      if (Math.floor(nextX) !== Math.floor(currentX)) {
        currentDirX *= -1;
      }
      if (Math.floor(nextY) !== Math.floor(currentY)) {
        currentDirY *= -1;
      }
    }

    currentX += currentDirX;
    currentY += currentDirY;
    remainingDistance -= 1;

    points.push(`L ${currentX * CELL_SIZE + CELL_SIZE/2} ${currentY * CELL_SIZE + CELL_SIZE/2}`);
  }

  return (
    <path
      className="trajectory"
      d={points.join(' ')}
      stroke={willWin ? "#00ff00" : "red"}
      strokeWidth="2"
      strokeDasharray="5,5"
      markerEnd="url(#arrowhead)"
    />
  );
};


// Update the club angle calculation in handleMouseMove
const handleMouseMove = (e) => {
  if (isDragging && !ballMoving) {
    const rect = gridRef.current.getBoundingClientRect();
    const newDragEnd = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    setDragEnd(newDragEnd);
    
    // Fix club angle calculation by using cell size adjusted ball position
    const ballScreenX = (ball.x * rect.width) / GRID_SIZE;
    const ballScreenY = (ball.y * rect.height) / GRID_SIZE;
    const dx = newDragEnd.x - ballScreenX;
    const dy = newDragEnd.y - ballScreenY;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    setClubAngle(angle);
  }
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
    
    // Check if trying to place barrier on ball
    const ballGridX = Math.floor(ball.x);
    const ballGridY = Math.floor(ball.y);
    if (colIndex === ballGridX && rowIndex === ballGridY) {
      return;
    }

    // Check if trying to place barrier on hole
    const holeGridX = Math.floor(hole.x);
    const holeGridY = Math.floor(hole.y);
    if (colIndex === holeGridX && rowIndex === holeGridY) {
      return;
    }

    const newGrid = [...grid];
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

  return (
    <div className="game-container">
      <div className="golf-game">
        {gameWon && (
          <div className="win-message">
            <h2>🎉 Congratulations! 🎉</h2>
            <p>You completed the course in {strokes} {strokes === 1 ? 'stroke' : 'strokes'}!</p>
            <button
              className="play-again-button"
              onClick={() => {
                setGameWon(false);
                initializeGame();
              }}
            >
              Play Again
            </button>
          </div>
        )}
        
        {/* Rest of your existing JSX */}
        <div className="instructions">
          {/* ... */}
        </div>

        <div className="score-board">
          Strokes: {strokes}
        </div>
        
        {/* ... rest of your existing component JSX ... */}
      
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
      {renderAimingLine()}

        <div
          className="hole"
          style={{
            position: 'absolute',
            left: `${(hole.x * 100) / GRID_SIZE}%`,
            top: `${(hole.y * 100) / GRID_SIZE}%`,
            width: `${100 / GRID_SIZE}%`,
            height: `${100 / GRID_SIZE}%`
          }}
          onMouseDown={handleHoleDragStart}
          onTouchStart={handleHoleDragStart}
        />

        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 3
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
              <polygon points="0 0, 10 3.5, 0 7" fill="red" />
            </marker>
          </defs>
          {isDragging && getTrajectoryArrow()}
        </svg>
        {showGolfClub && (
          <div
            className="golf-club"
            style={{
              position: 'absolute',
              width: '40px',
              height: '4px',
              backgroundColor: '#666',
              transformOrigin: 'left center',
              left: `${ball.x * CELL_SIZE + CELL_SIZE/2}px`,
              top: `${ball.y * CELL_SIZE + CELL_SIZE/2}px`,
              transform: `rotate(${clubAngle}deg)`,
              zIndex: 3,
              pointerEvents: 'none'
            }}
          />
        )}
        {/* Add hole preview */}
        {previewHole && (
          <div
            className="hole preview"
            style={{
              position: 'absolute',
              left: `${previewHole.x * 100}%`,
              top: `${previewHole.y * 100}%`,
              width: `${100 / GRID_SIZE}%`,
              height: `${100 / GRID_SIZE}%`
            }}
          />
        )}
      </div>
    </div>
    </div>
  );
};

export default MiniGolfGame;