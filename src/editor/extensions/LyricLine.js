import Paragraph from '@tiptap/extension-paragraph';
import { ReactNodeViewRenderer } from '@tiptap/react';
import AnnotatedLineView from '../nodeviews/AnnotatedLineView';

let lineCounter = 0;
function generateLineId() {
  lineCounter += 1;
  return 'line-' + Date.now().toString(36) + '-' + lineCounter.toString(36);
}

/**
 * LyricLine extends TipTap's built-in Paragraph so the node keeps the name
 * 'paragraph' and satisfies the Document schema ('block+' with paragraph as
 * the default fill node). We add a lineId attribute for annotation linking
 * and a custom React NodeView for rendering annotations.
 */
const LyricLine = Paragraph.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      lineId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-line-id'),
        renderHTML: (attributes) => {
          if (!attributes.lineId) return {};
          return { 'data-line-id': attributes.lineId };
        },
      },
    };
  },

  onCreate() {
    // Assign IDs to any paragraph lines that don't have them yet.
    // Mark the transaction with metadata so onUpdate doesn't trigger a save —
    // lineId assignment is an internal bookkeeping change, not a user edit.
    const { tr } = this.editor.state;
    let modified = false;
    this.editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'paragraph' && !node.attrs.lineId) {
        tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          lineId: generateLineId(),
        });
        modified = true;
      }
    });
    if (modified) {
      tr.setMeta('lineIdInit', true);
      this.editor.view.dispatch(tr);
    }
  },

  addKeyboardShortcuts() {
    // Helper: find the position just inside the first lyric paragraph (content start).
    const firstLyricStart = (doc) => {
      let pos = null;
      doc.forEach((node, p) => {
        if (node.type.name === 'paragraph' && pos === null) pos = p + 1;
      });
      return pos;
    };

    // Helper: find the position at the end of the songTitle content.
    const titleEnd = (doc) => {
      let pos = null;
      doc.forEach((node, p) => {
        if (node.type.name === 'songTitle') pos = p + node.nodeSize - 1;
      });
      return pos;
    };

    return {
      ...this.parent?.(),

      Enter: ({ editor }) => {
        return editor.chain().splitBlock().updateAttributes('paragraph', {
          lineId: generateLineId(),
        }).run();
      },

      // Prevent backspace from merging the first lyric paragraph into the title.
      Backspace: ({ editor }) => {
        const { $from, empty } = editor.state.selection;
        if (!empty) return false;
        return $from.pos === firstLyricStart(editor.state.doc);
      },

      // Ensure ArrowUp from the very first position of the first lyric always
      // lands in the title. Without this, Firefox skips the title entirely
      // because the InstrumentTags contentEditable={false} div looks like an
      // atomic cursor object to Firefox's native navigation.
      ArrowUp: ({ editor }) => {
        const { $from, empty } = editor.state.selection;
        if (!empty) return false;
        if ($from.pos !== firstLyricStart(editor.state.doc)) return false;
        const end = titleEnd(editor.state.doc);
        return end !== null && editor.chain().setTextSelection(end).run();
      },

      'Shift-Tab': ({ editor }) => {
        const end = titleEnd(editor.state.doc);
        if (end !== null) {
          return editor.chain().setTextSelection(end).run();
        }
        return false;
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(AnnotatedLineView);
  },
});

export default LyricLine;
export { generateLineId };
