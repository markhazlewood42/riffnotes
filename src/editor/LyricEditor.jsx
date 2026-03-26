import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import { Fragment, Slice } from '@tiptap/pm/model';
import { normalizePasteLines } from './pasteUtils.js';
import { sanitizeDocument } from '../services/songDocument.js';
import Placeholder from '@tiptap/extension-placeholder';
import LyricLine from './extensions/LyricLine';
import SongTitle from './extensions/SongTitle';
import WordHover from './extensions/WordHover';
import PageBreaks from './extensions/PageBreaks';
import AnnotationToolbar from '../toolbar/AnnotationToolbar';
import { useLyricSheet } from '../context/LyricSheetContext';
import './LyricEditor.css';
import '../editor/nodeviews/AnnotatedLineView.css';

const DEFAULT_CONTENT = {
  type: 'doc',
  content: [
    { type: 'songTitle' },
    { type: 'paragraph' },
  ],
};

function LyricEditor() {
  const { setEditor, initialDocument, requestSave, isLocked } = useLyricSheet();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // LyricLine extends Paragraph, so disable StarterKit's to avoid duplicate
        paragraph: false,
        heading: false,
      }),
      LyricLine,
      SongTitle,
      WordHover,
      PageBreaks,
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'songTitle') return 'Song title...';
          return 'Start typing lyrics...';
        },
        showOnlyCurrent: false,
      }),
    ],
    content: (initialDocument ? sanitizeDocument(initialDocument) : null) || DEFAULT_CONTENT,
    editable: !isLocked,
    autofocus: isLocked ? false : 'start',
    onUpdate: ({ transaction }) => {
      // Skip save for internal lineId assignment (not a user edit)
      if (transaction.docChanged && !transaction.getMeta('lineIdInit')) {
        requestSave();
      }
    },
    editorProps: {
      handlePaste: (view, event) => {
        // Always paste as plain text to strip ALL source formatting.
        // Preserves line breaks by inserting each line as a separate paragraph.
        const text = event.clipboardData?.getData('text/plain');
        if (!text) return false;

        // Collapse runs of 3+ blank lines to 2 (one empty paragraph), but
        // preserve single blank lines as empty paragraphs (verse separators).
        const lines = normalizePasteLines(text);
        const { schema } = view.state;
        const nodes = lines.map(line => {
          const trimmed = line.trim();
          return trimmed
            ? schema.nodes.paragraph.create(null, schema.text(trimmed))
            : schema.nodes.paragraph.create();
        });

        const { tr } = view.state;
        tr.replaceSelection(new Slice(Fragment.from(nodes), 0, 0));
        view.dispatch(tr);
        return true; // prevent default paste
      },
    },
  });

  useEffect(() => {
    if (editor) {
      setEditor(editor);
    }
  }, [editor, setEditor]);

  if (!editor) return null;

  return (
    <div className="lyric-editor">
      {!isLocked && <BubbleMenu
        editor={editor}
        shouldShow={({ editor, state, from, to }) => {
          // Show when there's a text selection (not just a cursor)
          if (from === to) return false;
          // Don't show for empty selections
          const text = state.doc.textBetween(from, to, ' ');
          if (!text.trim()) return false;
          // Don't show in the song title — it has no annotation capability
          const { $from } = state.selection;
          for (let d = $from.depth; d >= 0; d--) {
            if ($from.node(d).type.name === 'songTitle') return false;
          }
          return true;
        }}
        options={{
          placement: 'top',
        }}
      >
        <AnnotationToolbar editor={editor} />
      </BubbleMenu>}
      <EditorContent editor={editor} />
    </div>
  );
}

export default LyricEditor;
