import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import LyricLine from './extensions/LyricLine';
import SongTitle from './extensions/SongTitle';
import SectionMarker from './extensions/SectionMarker';
import SectionRepeatRef from './extensions/SectionRepeatRef';
import AnnotationToolbar from '../toolbar/AnnotationToolbar';
import { useLyricSheet } from '../context/LyricSheetContext';
import './LyricEditor.css';
import '../editor/nodeviews/AnnotatedLineView.css';

function LyricEditor() {
  const { setEditor } = useLyricSheet();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // LyricLine extends Paragraph, so disable StarterKit's to avoid duplicate
        paragraph: false,
        heading: false,
      }),
      LyricLine,
      SongTitle,
      SectionMarker,
      SectionRepeatRef,
      Placeholder.configure({
        placeholder: 'Paste or type your lyrics here...',
      }),
    ],
    content: '',
  });

  useEffect(() => {
    if (editor) {
      setEditor(editor);
    }
  }, [editor, setEditor]);

  if (!editor) return null;

  return (
    <div className="lyric-editor">
      <BubbleMenu
        editor={editor}
        shouldShow={({ editor, state, from, to }) => {
          // Show when there's a text selection (not just a cursor)
          if (from === to) return false;
          // Don't show for empty selections
          const text = state.doc.textBetween(from, to, ' ');
          if (!text.trim()) return false;
          return true;
        }}
        options={{
          placement: 'top',
        }}
      >
        <AnnotationToolbar editor={editor} />
      </BubbleMenu>
      <EditorContent editor={editor} />
    </div>
  );
}

export default LyricEditor;
