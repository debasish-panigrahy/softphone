import React, { useState } from 'react';
import './Dialpad.css';

const Dialpad = ({ onCall, onDigit, showDisplay = true }) => {
  const [display, setDisplay] = useState('');
  
  const digits = [
    { num: '1', letters: '' },
    { num: '2', letters: 'ABC' },
    { num: '3', letters: 'DEF' },
    { num: '4', letters: 'GHI' },
    { num: '5', letters: 'JKL' },
    { num: '6', letters: 'MNO' },
    { num: '7', letters: 'PQRS' },
    { num: '8', letters: 'TUV' },
    { num: '9', letters: 'WXYZ' },
    { num: '*', letters: '' },
    { num: '0', letters: '+' },
    { num: '#', letters: '' }
  ];

  const handleDigit = (digit) => {
    if (showDisplay) {
      setDisplay(prev => prev + digit);
    }
    if (onDigit) {
      onDigit(digit);
    }
  };

  const handleCall = () => {
    if (onCall && display) {
      onCall(display);
      setDisplay('');
    }
  };

  const handleClear = () => {
    setDisplay(display.slice(0, -1));
  };

  return (
    <div className="dialpad-wrapper">
      {showDisplay && (
        <div className="dialpad-display">
          <input 
            type="text" 
            value={display} 
            onChange={(e) => setDisplay(e.target.value)}
            placeholder="Enter number..."
            readOnly
          />
          {display && (
            <button onClick={handleClear} className="clear-button">
              ⌫
            </button>
          )}
        </div>
      )}
      
      <div className="dialpad-grid">
        {digits.map(({ num, letters }) => (
          <button
            key={num}
            className="dialpad-button"
            onClick={() => handleDigit(num)}
          >
            <span className="digit">{num}</span>
            <span className="letters">{letters}</span>
          </button>
        ))}
        
        {showDisplay && (
          <button
            className="dialpad-button call-button"
            onClick={handleCall}
            disabled={!display}
          >
            <span className="call-icon">📞</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default Dialpad;