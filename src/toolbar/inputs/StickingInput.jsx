import React, { useState, useRef, useEffect } from 'react';

function StickingInput({ onSubmit, onCancel }) {
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
      <span className="toolbar-input-label">Sticking</span>
      <input
        ref={inputRef}
        className="toolbar-input"
        type="text"
        placeholder="R L R L..."
        value={value}
        onChange={(e) => setValue(e.target.value.toUpperCase())}
        onKeyDown={handleKeyDown}
        style={{ width: '120px', letterSpacing: '2px' }}
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

export default StickingInput;
