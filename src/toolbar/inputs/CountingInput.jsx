import React, { useState, useRef, useEffect } from 'react';

function CountingInput({ onSubmit, onCancel }) {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
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
      <span className="toolbar-input-label">Count</span>
      <input
        ref={inputRef}
        className="toolbar-input"
        type="text"
        placeholder="1 2 3 4, 3 e + a..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        style={{ width: '140px', letterSpacing: '1px' }}
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

export default CountingInput;
