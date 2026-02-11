import React, { useState, useRef, useEffect } from 'react';

function ChordInput({ onSubmit, onCancel }) {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    // Auto-focus the input
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit(value);
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="toolbar-input-group">
      <span className="toolbar-input-label">Chord</span>
      <input
        ref={inputRef}
        className="toolbar-input"
        type="text"
        placeholder="A, C#, Bb7..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        style={{ width: '80px' }}
      />
      <button className="toolbar-submit-btn" onClick={() => onSubmit(value)}>
        Add
      </button>
      <button className="toolbar-cancel-btn" onClick={onCancel}>
        ×
      </button>
    </div>
  );
}

export default ChordInput;
