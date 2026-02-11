import React, { useState, useRef, useEffect } from 'react';

const STYLES = [
  { value: 'default', label: 'Default' },
  { value: 'rest', label: 'REST' },
  { value: 'special', label: 'SPECIAL' },
];

function RightNoteInput({ onSubmit, onCancel }) {
  const [value, setValue] = useState('');
  const [style, setStyle] = useState('default');
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit(value, style);
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="toolbar-input-group">
      <span className="toolbar-input-label">Note</span>
      <input
        ref={inputRef}
        className="toolbar-input"
        type="text"
        placeholder="main groove x4..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        style={{ width: '150px' }}
      />
      <div className="style-selector">
        {STYLES.map((s) => (
          <button
            key={s.value}
            className={`style-option ${style === s.value ? 'selected' : ''}`}
            onClick={() => setStyle(s.value)}
          >
            {s.label}
          </button>
        ))}
      </div>
      <button className="toolbar-submit-btn" onClick={() => onSubmit(value, style)}>
        Add
      </button>
      <button className="toolbar-cancel-btn" onClick={onCancel}>
        ×
      </button>
    </div>
  );
}

export default RightNoteInput;
