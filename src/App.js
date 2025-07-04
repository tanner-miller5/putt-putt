import React from 'react';
import './App.css';
import MiniGolfGame from './MiniGolfGame';

function App() {
  return (
    <div className="App">
      <header>
        <h1>Mini Golf</h1>
      </header>
      <main>
        <MiniGolfGame />
      </main>
    </div>
  );
}

export default App;