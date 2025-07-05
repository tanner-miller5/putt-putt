import React, { useState, useCallback, useRef, useEffect } from 'react';
import './GolfGameStyles.css';

const GRID_SIZE = 10;
const BOARD_SIZE = 500; // matches CSS width/height of game-board
const CELL_SIZE = BOARD_SIZE / GRID_SIZE; // 50px per cell
const WIN_DISTANCE = 0.5;
const FRICTION = 0.98;
const MIN_SPEED = 0.02;
const HOLE_PULL_FORCE = 0.05;

const MiniGolfGame = () => {
  const gameRef = useRef(null);
  const animationRef = useRef(null);
  
  const [grid, setGrid] = useState(() => 
    Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0))
  );
  
  // Update starting positions
  const [ball, setBall] = useState({ x: 0.5 * CELL_SIZE, y: 0.5 * CELL_SIZE }); // Center of top-left cell (0,0)
  const [hole, setHole] = useState({ x: 8.5 * CELL_SIZE, y: 8.5 * CELL_SIZE }); // Center of bottom-right cell (8,8)
  const [strokes, setStrokes] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [ballMoving, setBallMoving] = useState(false);
  const [aimStart, setAimStart] = useState(null);
  const [aimEnd, setAimEnd] = useState(null);
  const [isAiming, setIsAiming] = useState(false);

  const resetGame = useCallback(() => {
    setBall({ x: 0.5, y: 0.5 });
    setHole({ x: 8.5, y: 8.5 });
    setStrokes(0);
    setGameWon(false);
    setBallMoving(false);
    setAimStart(null);
    setAimEnd(null);
    setIsAiming(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, []);

  useEffect(() => {
    resetGame();
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [resetGame]);

  const handlePointerDown = useCallback((e) => {
    if (ballMoving || editMode) return;
    
    const rect = gameRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left);
    const y = (e.clientY - rect.top);
    
    setIsAiming(true);
    setAimStart({ x, y });
    setAimEnd({ x, y });
  }, [ballMoving, editMode]);

  const handlePointerMove = useCallback((e) => {
    if (!isAiming || !gameRef.current) return;
    
    const rect = gameRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left);
    const y = (e.clientY - rect.top);
    
    setAimEnd({
      x: x,
      y: y
    });
  }, [isAiming]);

const handleShot = useCallback(() => {
    if (!isAiming || !aimStart || !aimEnd) return;
    
    setBallMoving(true);
    setStrokes(s => s + 1);
    setIsAiming(false);

    const dx = aimEnd.x - aimStart.x;
    const dy = aimEnd.y - aimStart.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const power = Math.min(distance * 0.01, 0.5);
    
    let currentPos = { ...ball };
    let vx = (-dx / distance) * power;
    let vy = (-dy / distance) * power;

    const animate = () => {
      // Calculate distance to hole before moving
      const distanceToHole = Math.sqrt(
        Math.pow(currentPos.x - hole.x, 2) + 
        Math.pow(currentPos.y - hole.y, 2)
      );

      // If ball is close to hole, apply attraction force
      if (distanceToHole < WIN_DISTANCE * 2) {
        const holeDirectionX = (hole.x - currentPos.x) / distanceToHole;
        const holeDirectionY = (hole.y - currentPos.y) / distanceToHole;
        vx += holeDirectionX * HOLE_PULL_FORCE;
        vy += holeDirectionY * HOLE_PULL_FORCE;
      }

      // Update position
      currentPos = {
        x: currentPos.x + vx,
        y: currentPos.y + vy
      };

      // Apply friction
      vx *= FRICTION;
      vy *= FRICTION;

      // Wall collisions - only if not near hole
      if (distanceToHole >= WIN_DISTANCE) {
        if (currentPos.x < 0) { currentPos.x = 0; vx = -vx * 0.5; }
        if (currentPos.x > GRID_SIZE - 1) { currentPos.x = GRID_SIZE - 1; vx = -vx * 0.5; }
        if (currentPos.y < 0) { currentPos.y = 0; vy = -vy * 0.5; }
        if (currentPos.y > GRID_SIZE - 1) { currentPos.y = GRID_SIZE - 1; vy = -vy * 0.5; }
      }

      // Barrier collisions - only if not near hole
      if (distanceToHole >= WIN_DISTANCE) {
        const gridX = Math.floor(currentPos.x);
        const gridY = Math.floor(currentPos.y);
        if (grid[gridY]?.[gridX] === 1) {
          if (Math.abs(vx) > Math.abs(vy)) {
            vx = -vx * 0.5;
          } else {
            vy = -vy * 0.5;
          }
        }
      }

      // Calculate current speed
      const speed = Math.sqrt(vx * vx + vy * vy);

      // Update ball position
      setBall(currentPos);
      
      // Check for win condition
      if (distanceToHole < WIN_DISTANCE) {
        if (speed < MIN_SPEED * 2) {
          setBall({ x: hole.x, y: hole.y });
          setBallMoving(false);
          setGameWon(true);
          return;
        }
      }

      // Stop if moving very slowly and not near hole
      if (speed < MIN_SPEED && distanceToHole >= WIN_DISTANCE) {
        setBallMoving(false);
        return;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
}, [ball, grid, hole.x, hole.y, isAiming, aimStart, aimEnd]);

  const handlePointerUp = useCallback(() => {
    if (isAiming) {
      handleShot();
    }
  }, [isAiming, handleShot]);

  useEffect(() => {
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  const toggleBarrier = useCallback((x, y) => {
    if (!editMode) return;
    setGrid(prev => {
      const newGrid = [...prev];
      newGrid[y] = [...newGrid[y]];
      newGrid[y][x] = newGrid[y][x] === 1 ? 0 : 1;
      return newGrid;
    });
  }, [editMode]);

  return (
    <div className="game-container">
      <div className="game-header">
        <div className="instructions">
          <h2>Mini Golf</h2>
          <p>Strokes: {strokes}</p>
        </div>
        <button className="edit-button" onClick={() => setEditMode(!editMode)}>
          {editMode ? 'Play Mode' : 'Edit Mode'}
        </button>
      </div>

      <div className="game-board" ref={gameRef}>
        <div className="grid">
          {grid.map((row, y) => (
            <div key={y} className="row">
              {row.map((cell, x) => (
                <div
                  key={`${x}-${y}`}
                  className={`cell ${cell === 1 ? 'barrier' : ''}`}
                  onClick={() => toggleBarrier(x, y)}
                />
              ))}
            </div>
          ))}
        </div>

        <div
          className="ball"
          style={{
            transform: `translate(${ball.x * CELL_SIZE}px, ${ball.y * CELL_SIZE}px)`
          }}
          onPointerDown={handlePointerDown}
        />

        <div
          className="hole"
          style={{
            transform: `translate(${hole.x * CELL_SIZE}px, ${hole.y * CELL_SIZE}px)`
          }}
        />

        {isAiming && aimStart && aimEnd && (
          <svg className="aim-line">
            <line
              x1={aimStart.x}
              y1={aimStart.y}
              x2={aimEnd.x}
              y2={aimEnd.y}
              stroke="white"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
          </svg>
        )}

        {gameWon && (
          <div className="win-message">
            <h2>Hole in {strokes}!</h2>
            <button onClick={resetGame}>Play Again</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MiniGolfGame;