import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Spinner } from '@heroui/react';
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
        <Button size="sm" variant="outline" onPress={() => window.print()}>
          Print
        </Button>
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
    return (
      <div className="loading-screen">
        <Spinner size="lg" color="accent" />
      </div>
    );
  }

  if (error || !songData) {
    return (
      <div className="loading-screen">
        <div className="text-center">
          <p className="mb-4">{error || 'Song not found'}</p>
          <Button variant="outline" onPress={() => navigate('/')}>
            Back to songs
          </Button>
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
