import React from 'react';
import { LyricSheetProvider } from './context/LyricSheetContext';
import LyricEditor from './editor/LyricEditor';
import './styles/variables.css';
import './styles/annotations.css';
import './App.css';

function App() {
  return (
    <LyricSheetProvider>
      <div className="app-container">
        <div className="app-toolbar">
          <button className="print-btn" onClick={() => window.print()}>
            Print
          </button>
        </div>
        <div className="document-container">
          <div className="document-header">
            <h1 className="document-title" />
          </div>
          <div className="document-body">
            <LyricEditor />
          </div>
        </div>
      </div>
    </LyricSheetProvider>
  );
}

export default App;
