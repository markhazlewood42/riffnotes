import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { LyricSheetProvider, useLyricSheet } from '../context/LyricSheetContext';
import LyricEditor from '../editor/LyricEditor';
import GlobalToolbar from '../components/GlobalToolbar';

function SaveIndicator() {
  const { saveStatus } = useLyricSheet();
  const label =
    saveStatus === 'saving' ? 'Saving...' :
    saveStatus === 'unsaved' ? 'Unsaved changes' :
    'Saved';
  return <span className="save-indicator">{label}</span>;
}

function SongEditorInner() {
  return (
    <>
      <GlobalToolbar>
        <SaveIndicator />
        <button className="toolbar-btn" onClick={() => window.print()}>
          Print
        </button>
      </GlobalToolbar>
      <div className="app-container">
        <div className="document-container">
          <div className="document-body">
            <LyricEditor />
          </div>
        </div>
      </div>
    </>
  );
}

function SongEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [songData, setSongData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    supabase
      .from('songs')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          setError(error.message);
        } else {
          setSongData(data);
        }
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return <div className="loading-screen"><p>Loading...</p></div>;
  }

  if (error || !songData) {
    return (
      <div className="loading-screen">
        <div style={{ textAlign: 'center' }}>
          <p>{error || 'Song not found'}</p>
          <button
            className="toolbar-btn"
            style={{ marginTop: 16 }}
            onClick={() => navigate('/')}
          >
            Back to songs
          </button>
        </div>
      </div>
    );
  }

  return (
    <LyricSheetProvider
      key={id}
      songId={id}
      initialDocument={songData.document}
      initialAnnotations={songData.annotations}
    >
      <SongEditorInner />
    </LyricSheetProvider>
  );
}

export default SongEditor;
