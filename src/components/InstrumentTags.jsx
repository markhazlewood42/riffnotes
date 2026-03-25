import { Dropdown } from '@heroui/react';
import { ChevronDown, Plus } from 'lucide-react';
import { useLyricSheet } from '../context/LyricSheetContext';
import './InstrumentTags.css';

const PRESET_INSTRUMENTS = ['Bass', 'Drums', 'Guitar', 'Keys', 'Vocals'];

function InstrumentTag({ instrument, index, instruments, setInstruments, readOnly }) {
  const handleAction = (key) => {
    if (key === 'remove') {
      if (instruments.length > 1) {
        setInstruments(instruments.filter((_, i) => i !== index));
      }
      return;
    }
    const updated = [...instruments];
    updated[index] = key;
    setInstruments(updated);
  };

  const badge = (
    <button
      type="button"
      className="instrument-tag"
      data-instrument={instrument}
      aria-label={`Change instrument: ${instrument}`}
    >
      <span className="instrument-tag-label">{instrument}</span>
      {!readOnly && <ChevronDown size={10} className="instrument-tag-caret" />}
    </button>
  );

  if (readOnly) return badge;

  return (
    <Dropdown>
      <Dropdown.Trigger>{badge}</Dropdown.Trigger>
      <Dropdown.Popover placement="bottom start" className="instrument-tag-popover">
        <Dropdown.Menu
          aria-label="Select instrument"
          onAction={handleAction}
        >
          {PRESET_INSTRUMENTS.map((name) => (
            <Dropdown.Item key={name} id={name}>
              {name}
            </Dropdown.Item>
          ))}
          {instruments.length > 1 && (
            <Dropdown.Item key="remove" id="remove" className="instrument-tag-remove">
              Remove
            </Dropdown.Item>
          )}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

function InstrumentTags({ readOnly = false }) {
  const { instruments, setInstruments } = useLyricSheet();

  const handleAdd = () => {
    // Add the first preset not already used, or default to 'Guitar'
    const unused = PRESET_INSTRUMENTS.find((name) => !instruments.includes(name));
    setInstruments([...instruments, unused || 'Guitar']);
  };

  return (
    <div className="instrument-tags">
      {instruments.map((instrument, index) => (
        <InstrumentTag
          key={index}
          instrument={instrument}
          index={index}
          instruments={instruments}
          setInstruments={setInstruments}
          readOnly={readOnly}
        />
      ))}
      {!readOnly && (
        <button
          type="button"
          className="instrument-tags-add"
          onClick={handleAdd}
          aria-label="Add instrument"
        >
          <Plus size={8} />
        </button>
      )}
    </div>
  );
}

export default InstrumentTags;
