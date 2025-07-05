import React from 'react';
import { render, fireEvent, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import MiniGolfGame from './MiniGolfGame';

describe('MiniGolfGame', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => setTimeout(() => cb(), 16));
    jest.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(() => ({
      left: 0,
      top: 0,
      width: 500,
      height: 500,
      right: 500,
      bottom: 500,
    }));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('renders initial game state correctly', () => {
    render(<MiniGolfGame />);
    
    expect(screen.getByTestId('ball')).toBeInTheDocument();
    expect(screen.getByTestId('hole')).toBeInTheDocument();
    expect(screen.getByText('Strokes: 0')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit Mode' })).toBeInTheDocument();
  });

  test('edit mode toggle works', () => {
    render(<MiniGolfGame />);
    const editButton = screen.getByRole('button', { name: 'Edit Mode' });
    
    fireEvent.click(editButton);
    expect(screen.getByRole('button', { name: 'Play Mode' })).toBeInTheDocument();
    
    fireEvent.click(screen.getByRole('button', { name: 'Play Mode' }));
    expect(screen.getByRole('button', { name: 'Edit Mode' })).toBeInTheDocument();
  });

  test('stroke counter increases when ball is hit', () => {
    render(<MiniGolfGame />);
    const ball = screen.getByTestId('ball');

    expect(screen.getByText('Strokes: 0')).toBeInTheDocument();

    act(() => {
      fireEvent.pointerDown(ball, { clientX: 25, clientY: 25 });
      fireEvent.pointerMove(ball, { clientX: 75, clientY: 75 });
      fireEvent.pointerUp(ball);
    });

    expect(screen.getByText('Strokes: 1')).toBeInTheDocument();
  });

  test('shows aim line when dragging ball', () => {
    render(<MiniGolfGame />);
    const ball = screen.getByTestId('ball');

    act(() => {
      fireEvent.pointerDown(ball, { clientX: 25, clientY: 25 });
      fireEvent.pointerMove(ball, { clientX: 75, clientY: 75 });
    });

    expect(screen.getByTestId('aim-line')).toBeInTheDocument();

    act(() => {
      fireEvent.pointerUp(ball);
    });
    
    expect(screen.queryByTestId('aim-line')).not.toBeInTheDocument();
  });

  test('cannot hit ball in edit mode', () => {
    render(<MiniGolfGame />);
    const ball = screen.getByTestId('ball');
    const editButton = screen.getByRole('button', { name: 'Edit Mode' });

    fireEvent.click(editButton);

    act(() => {
      fireEvent.pointerDown(ball, { clientX: 25, clientY: 25 });
      fireEvent.pointerMove(ball, { clientX: 75, clientY: 75 });
    });

    expect(screen.queryByTestId('aim-line')).not.toBeInTheDocument();
  });

  test('ball moves after being hit', () => {
    render(<MiniGolfGame />);
    const ball = screen.getByTestId('ball');
    const initialTransform = ball.style.transform;

    act(() => {
      fireEvent.pointerDown(ball, { clientX: 25, clientY: 25 });
      fireEvent.pointerMove(ball, { clientX: 75, clientY: 75 });
      fireEvent.pointerUp(ball);
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(ball.style.transform).not.toBe(initialTransform);
  });

  test('ball stops moving due to friction', () => {
    render(<MiniGolfGame />);
    const ball = screen.getByTestId('ball');

    act(() => {
      fireEvent.pointerDown(ball, { clientX: 25, clientY: 25 });
      fireEvent.pointerMove(ball, { clientX: 75, clientY: 75 });
      fireEvent.pointerUp(ball);
    });

    // Advance time until ball stops
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    const finalPosition = ball.style.transform;

    // Ball should not move after stopping
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(ball.style.transform).toBe(finalPosition);
  });

  test('win condition triggers when ball reaches hole', () => {
    render(<MiniGolfGame />);
    const ball = screen.getByTestId('ball');

    // Force ball into winning position
    act(() => {
      const gameInstance = screen.getByTestId('game-board');
      const event = new CustomEvent('win-test', { 
        detail: { x: 9.5, y: 9.5 } 
      });
      gameInstance.dispatchEvent(event);
    });

    expect(screen.getByText(/You won/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Play Again/i })).toBeInTheDocument();
  });
});