import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
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
    content: initialDocument || DEFAULT_CONTENT,
    editable: !isLocked,
    autofocus: isLocked ? false : 'start',
    onUpdate: () => {
      requestSave();
    },
    editorProps: {
      transformPastedHTML: (html) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');

        // Google Docs wraps entire clipboard in <b id="docs-internal-guid-..." style="font-weight:normal"> — unwrap it.
        doc.querySelectorAll('b').forEach(b => {
          if (b.style.fontWeight === 'normal' || b.id.startsWith('docs-internal-guid')) {
            b.replaceWith(...Array.from(b.childNodes));
          }
        });

        // Google Docs spans use font-weight:500 for regular text (Montserrat Medium).
        // TipTap's Bold regex /[5-9]\d{2,}/ matches 500 and treats it as bold — strip it.
        // Only promote font-weight:700+ to <strong>.
        doc.querySelectorAll('span').forEach(span => {
          const fw = span.style.fontWeight;
          if (fw === 'bold' || fw === 'bolder' || parseInt(fw) >= 700) {
            const strong = doc.createElement('strong');
            strong.innerHTML = span.innerHTML;
            span.replaceWith(strong);
          } else {
            span.style.removeProperty('font-weight');
          }
        });

        // Remove empty paragraphs (&nbsp; is \u00a0, not caught by plain trim())
        doc.querySelectorAll('p').forEach(p => {
          if (!p.textContent.replace(/\u00a0/g, '').trim()) p.remove();
        });

        // Convert bare <br> separators to empty <p> elements (one blank line each).
        // Do this after empty-<p> removal so they aren't immediately pruned.
        Array.from(doc.body.childNodes).forEach(node => {
          if (node.nodeName === 'BR') node.replaceWith(doc.createElement('p'));
        });

        return doc.body.innerHTML;
      },
      transformPastedText: (text) => {
        // Collapse multiple consecutive newlines into one
        return text.replace(/\n{2,}/g, '\n').trim();
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
