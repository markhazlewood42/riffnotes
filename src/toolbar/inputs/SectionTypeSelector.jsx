import React from 'react';
import { SECTION_TYPES } from '../../editor/extensions/SectionMarker';

function SectionTypeSelector({ onSelectSection, onSelectRepeat, onCancel }) {
  return (
    <div className="toolbar-input-group" style={{ flexDirection: 'column', gap: '6px', padding: '4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
        <span className="toolbar-input-label" style={{ marginRight: 'auto' }}>Section</span>
        <button className="toolbar-cancel-btn" onClick={onCancel}>
          ×
        </button>
      </div>
      <div className="section-selector">
        {SECTION_TYPES.map((type) => (
          <button
            key={type}
            className="section-btn"
            onClick={() => onSelectSection(type)}
          >
            [{type}]
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}>
        <span className="toolbar-input-label">Repeat</span>
      </div>
      <div className="section-selector">
        {SECTION_TYPES.map((type) => (
          <button
            key={`repeat-${type}`}
            className="section-btn repeat-btn"
            onClick={() => onSelectRepeat(type)}
          >
            [[ {type} ]]
          </button>
        ))}
      </div>
    </div>
  );
}

export default SectionTypeSelector;
