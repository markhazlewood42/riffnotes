import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { useLyricSheet } from '../../context/LyricSheetContext';
import InstrumentTags from '../../components/InstrumentTags.jsx';

function SongTitleView() {
  const { isLocked } = useLyricSheet();

  return (
    <NodeViewWrapper className="song-title-wrapper">
      <NodeViewContent as="h1" className="song-title" />
      <div contentEditable={false}>
        <InstrumentTags readOnly={isLocked} />
      </div>
    </NodeViewWrapper>
  );
}

export default SongTitleView;
