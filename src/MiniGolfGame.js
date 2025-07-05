import React, { useState, useCallback, useEffect, useRef } from 'react';
import './GolfGameStyles.css';

// Update the constants at the top of the file
const CELL_SIZE = 30; // Reduced from 40
const BALL_SIZE = 8; // Reduced from 10
const HOLE_SIZE = 12; // Reduced from 15
const GRID_SIZE = 15; // Reduced from 20
const WIN_DISTANCE = 0.5;

const MiniGolfGame = () => {
  const gameRef = useRef(null);
  const animationRef = useRef(null);

  // State initialization
  const [grid, setGrid] = useState(() => 
    Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0))
  );
  
  const [barriers, setBarriers] = useState(() => 
    Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(false))
  );

  const initialState = {
    ball: {
      x: 1,
      y: 1,
      vx: 0,
      vy: 0
    },
    hole: {
      x: GRID_SIZE - 2,
      y: GRID_SIZE - 2
    }
  };

  const [ball, setBall] = useState(initialState.ball);
  const [hole, setHole] = useState(initialState.hole);
  const [isAiming, setIsAiming] = useState(false);
  const [isDraggingHole, setIsDraggingHole] = useState(false);
  const [aimStart, setAimStart] = useState(null);
  const [aimEnd, setAimEnd] = useState(null);
  const [strokes, setStrokes] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [ballMoving, setBallMoving] = useState(false);
  const [gameWon, setGameWon] = useState(false);

  // Game mechanics
  const hasBarrier = useCallback((x, y) => {
    const gridX = Math.floor(x);
    const gridY = Math.floor(y);
    return gridX >= 0 && gridX < GRID_SIZE && 
           gridY >= 0 && gridY < GRID_SIZE && 
           barriers[gridY][gridX];
  }, [barriers]);

  const handleBarrierCollision = useCallback((nextBall, currentBall) => {
    const horizontalCheck = { x: nextBall.x, y: currentBall.y };
    const verticalCheck = { x: currentBall.x, y: nextBall.y };

    const hitHorizontal = hasBarrier(horizontalCheck.x, horizontalCheck.y);
    const hitVertical = hasBarrier(verticalCheck.x, verticalCheck.y);

    if (hitHorizontal) {
      nextBall.vx *= -0.8;
      nextBall.x = currentBall.x;
    }
    if (hitVertical) {
      nextBall.vy *= -0.8;
      nextBall.y = currentBall.y;
    }
    if (hitHorizontal && hitVertical) {
      nextBall.vx *= -0.8;
      nextBall.vy *= -0.8;
      nextBall.x = currentBall.x;
      nextBall.y = currentBall.y;
    }
    return nextBall;
  }, [hasBarrier]);

  // Add grid lines rendering function
  const renderGrid = () => {
    const lines = [];
    // Vertical lines
    for (let i = 0; i <= GRID_SIZE; i++) {
      lines.push(
        <line
          key={`v-${i}`}
          x1={i * CELL_SIZE}
          y1={0}
          x2={i * CELL_SIZE}
          y2={GRID_SIZE * CELL_SIZE}
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth="1"
        />
      );
    }
    // Horizontal lines
    for (let i = 0; i <= GRID_SIZE; i++) {
      lines.push(
        <line
          key={`h-${i}`}
          x1={0}
          y1={i * CELL_SIZE}
          x2={GRID_SIZE * CELL_SIZE}
          y2={i * CELL_SIZE}
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth="1"
        />
      );
    }
    return lines;
  };

  // Add this with other state management functions
  const resetGame = useCallback(() => {
    setBall(initialState.ball);
    setHole(initialState.hole);
    setBallMoving(false);
    setGameWon(false);
    setStrokes(0);
    setIsAiming(false);
    setAimStart(null);
    setAimEnd(null);
  }, [initialState]);

  // Update the handlePointerDown function to handle both ball aiming and hole dragging
  const handlePointerDown = useCallback((e) => {
    if (ballMoving) return;

    const rect = gameRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Convert positions to screen coordinates
    const ballScreenX = ball.x * CELL_SIZE + CELL_SIZE / 2;
    const ballScreenY = ball.y * CELL_SIZE + CELL_SIZE / 2;
    const holeScreenX = hole.x * CELL_SIZE + CELL_SIZE / 2;
    const holeScreenY = hole.y * CELL_SIZE + CELL_SIZE / 2;
    
    // Check if clicking near the hole in edit mode
    if (editMode) {
      const dxHole = mouseX - holeScreenX;
      const dyHole = mouseY - holeScreenY;
      const distanceToHole = Math.sqrt(dxHole * dxHole + dyHole * dyHole);
      
      if (distanceToHole <= HOLE_SIZE * 2) {
        setIsDraggingHole(true);
        e.preventDefault();
        return;
      }

      // Handle barrier toggling in edit mode
      const gridX = Math.floor(mouseX / CELL_SIZE);
      const gridY = Math.floor(mouseY / CELL_SIZE);
      
      if (gridX >= 0 && gridX < GRID_SIZE && gridY >= 0 && gridY < GRID_SIZE) {
        setBarriers(prev => {
          const newBarriers = [...prev];
          newBarriers[gridY] = [...prev[gridY]];
          newBarriers[gridY][gridX] = !prev[gridY][gridX];
          return newBarriers;
        });
      }
      return;
    }

    // Handle ball aiming in play mode
    const dxBall = mouseX - ballScreenX;
    const dyBall = mouseY - ballScreenY;
    const distanceToBall = Math.sqrt(dxBall * dxBall + dyBall * dyBall);
    
    if (distanceToBall <= BALL_SIZE * 2) {
      setIsAiming(true);
      setAimStart({ x: ballScreenX, y: ballScreenY });
      setAimEnd({ x: mouseX, y: mouseY });
      e.preventDefault();
    }
  }, [ball.x, ball.y, hole.x, hole.y, ballMoving, editMode]);

  // Update handlePointerMove to handle both aiming and hole dragging
  const handlePointerMove = useCallback((e) => {
    if (!isAiming && !isDraggingHole) return;

    const rect = gameRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (isDraggingHole) {
      // Convert mouse position to grid coordinates
      const gridX = Math.min(Math.max(Math.floor(mouseX / CELL_SIZE), 0), GRID_SIZE - 1);
      const gridY = Math.min(Math.max(Math.floor(mouseY / CELL_SIZE), 0), GRID_SIZE - 1);
      
      // Update hole position
      setHole({ x: gridX, y: gridY });
    } else if (isAiming) {
      setAimEnd({ x: mouseX, y: mouseY });
    }
    
    e.preventDefault();
  }, [isAiming, isDraggingHole]);

  // Update the handlePointerUp function to adjust the power and velocity
  const handlePointerUp = useCallback((e) => {
    if (isDraggingHole) {
      setIsDraggingHole(false);
      return;
    }

    if (!isAiming || !aimStart || !aimEnd) {
      setIsAiming(false);
      return;
    }

    const dx = aimStart.x - aimEnd.x;
    const dy = aimStart.y - aimEnd.y;
    
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance === 0) {
      setIsAiming(false);
      return;
    }

    // Increase power factor for more noticeable movement
    const powerFactor = 0.5; // Adjust this value to control shot power
    const power = Math.min(distance / (CELL_SIZE * 2), 2.0) * powerFactor;
    
    setBall(prevBall => ({
      ...prevBall,
      vx: (dx / distance) * power,
      vy: (dy / distance) * power
    }));

    setBallMoving(true);
    setStrokes(prev => prev + 1);
    setIsAiming(false);
    setAimStart(null);
    setAimEnd(null);
  }, [isAiming, aimStart, aimEnd, isDraggingHole]);

  // Update the ball movement effect
  useEffect(() => {
    let frameId;
    
    const animate = () => {
      if (ballMoving) {
        setBall(prevBall => {
          const nextBall = { ...prevBall };
          const currentPosition = { ...prevBall };

          // Update position with scaled velocity
          nextBall.x += nextBall.vx;
          nextBall.y += nextBall.vy;

          // Handle collisions and boundaries
          if (hasBarrier(nextBall.x, nextBall.y)) {
            handleBarrierCollision(nextBall, currentPosition);
          }

          // Boundary checks
          if (nextBall.x <= 0) {
            nextBall.x = 0;
            nextBall.vx = Math.abs(nextBall.vx) * 0.8;
          } else if (nextBall.x >= GRID_SIZE - 1) {
            nextBall.x = GRID_SIZE - 1;
            nextBall.vx = -Math.abs(nextBall.vx) * 0.8;
          }

          if (nextBall.y <= 0) {
            nextBall.y = 0;
            nextBall.vy = Math.abs(nextBall.vy) * 0.8;
          } else if (nextBall.y >= GRID_SIZE - 1) {
            nextBall.y = GRID_SIZE - 1;
            nextBall.vy = -Math.abs(nextBall.vy) * 0.8;
          }

          // Apply friction
          nextBall.vx *= 0.98;
          nextBall.vy *= 0.98;

          // Check hole collision
          const dx = nextBall.x - hole.x;
          const dy = nextBall.y - hole.y;
          const distanceToHole = Math.sqrt(dx * dx + dy * dy);
          
          if (distanceToHole < WIN_DISTANCE) {
            setBallMoving(false);
            setGameWon(true);
            return {
              x: hole.x,
              y: hole.y,
              vx: 0,
              vy: 0
            };
          }

          // Check if ball should stop
          const speed = Math.sqrt(nextBall.vx * nextBall.vx + nextBall.vy * nextBall.vy);
          if (speed < 0.005) {
            setBallMoving(false);
            nextBall.vx = 0;
            nextBall.vy = 0;
          }

          return nextBall;
        });

        frameId = requestAnimationFrame(animate);
      }
    };

    if (ballMoving) {
      frameId = requestAnimationFrame(animate);
    }

    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [ballMoving, hole.x, hole.y, hasBarrier, handleBarrierCollision]);

  // Event handlers
  useEffect(() => {
    const game = gameRef.current;
    if (game) {
      game.addEventListener('pointerdown', handlePointerDown);
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);

      return () => {
        game.removeEventListener('pointerdown', handlePointerDown);
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [handlePointerDown, handlePointerMove, handlePointerUp]);

  // Render functions
  const renderTrajectoryPreview = () => {
    if (!isAiming || !aimStart || !aimEnd) return null;

    return (
      <line
        x1={aimStart.x}
        y1={aimStart.y}
        x2={aimEnd.x}
        y2={aimEnd.y}
        stroke="rgba(255, 255, 255, 0.6)"
        strokeWidth="2"
        strokeDasharray="5,5"
      />
    );
  };

  // Update the return statement to include instructions and stroke count
  // Update the return statement with new layout
return (
  <div className="game-page">
    <div className="instructions-panel">
      <h2>Mini Golf</h2>
      <div className="game-controls">
        <div className="strokes">Strokes: {strokes}</div>
        <button onClick={() => {
          resetGame();
          setGameWon(false);
        }}>Reset Game</button>
        <button 
          onClick={() => setEditMode(!editMode)}
          className={editMode ? 'active' : ''}
        >
          {editMode ? 'Play Mode' : 'Edit Mode'}
        </button>
      </div>
      <div className="instructions">
        <h3>How to Play:</h3>
        <ul>
          <li>Click and drag from the ball to aim</li>
          <li>Release to shoot</li>
          <li>Get the ball in the hole</li>
          <li>Use as few strokes as possible</li>
          {editMode && <li>Click grid cells to add/remove barriers</li>}
          {editMode && <li>Drag the hole to reposition it</li>}
        </ul>
      </div>
      {gameWon && <div className="win-message">You won in {strokes} strokes!</div>}
    </div>

    <div ref={gameRef} className="game-container">
      <svg 
        className="game-svg" 
        width={GRID_SIZE * CELL_SIZE} 
        height={GRID_SIZE * CELL_SIZE}
        viewBox={`0 0 ${GRID_SIZE * CELL_SIZE} ${GRID_SIZE * CELL_SIZE}`}
      >
        {/* Background */}
        <rect width="100%" height="100%" fill="#2a5" />
        
        {/* Grid */}
        {renderGrid()}
        
        {/* Barriers */}
        {barriers.map((row, i) => 
          row.map((barrier, j) => 
            barrier && (
              <rect
                key={`barrier-${i}-${j}`}
                x={j * CELL_SIZE}
                y={i * CELL_SIZE}
                width={CELL_SIZE}
                height={CELL_SIZE}
                fill="#000"
              />
            )
          )
        )}
        
        {/* Trajectory preview */}
        {renderTrajectoryPreview()}
        
        {/* Ball */}
        <circle
          cx={(ball.x * CELL_SIZE) + (CELL_SIZE / 2)}
          cy={(ball.y * CELL_SIZE) + (CELL_SIZE / 2)}
          r={BALL_SIZE}
          fill="white"
        />
        
        {/* Hole */}
        <circle
          cx={(hole.x * CELL_SIZE) + (CELL_SIZE / 2)}
          cy={(hole.y * CELL_SIZE) + (CELL_SIZE / 2)}
          r={HOLE_SIZE}
          fill="black"
        />
      </svg>
    </div>
  </div>
);
};

export default MiniGolfGame;