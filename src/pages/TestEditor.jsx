import { Button } from '@heroui/react';
import { LyricSheetProvider } from '../context/LyricSheetContext';
import LyricEditor from '../editor/LyricEditor';
import GlobalToolbar from '../components/GlobalToolbar';

const TEST_DOCUMENT = {
  type: 'doc',
  content: [
    { type: 'songTitle', content: [{ type: 'text', text: 'Test Song Title' }] },
    ...Array.from({ length: 60 }, (_, i) => ({
      type: 'paragraph',
      content: [{ type: 'text', text: `This is lyric line ${i + 1} — testing page break layout` }],
    })),
  ],
};

function TestEditor() {
  return (
    <LyricSheetProvider
      songId="test-song"
      initialDocument={TEST_DOCUMENT}
      initialAnnotations={{}}
    >
      <GlobalToolbar>
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
    </LyricSheetProvider>
  );
}

export default TestEditor;
