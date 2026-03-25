import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { useLyricSheet } from '../../context/LyricSheetContext';
import InstrumentTags from '../../components/InstrumentTags.jsx';
import '../../components/InstrumentTags.css';

function SongTitleView() {
  const { isLocked } = useLyricSheet();

  return (
    <NodeViewWrapper className="song-title-wrapper">
      <NodeViewContent as="h1" className="song-title" />
      {!isLocked && (
        <div contentEditable={false}>
          <InstrumentTags />
        </div>
      )}
    </NodeViewWrapper>
  );
}

export default SongTitleView;
