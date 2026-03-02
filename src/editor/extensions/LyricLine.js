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
    // Assign IDs to any paragraph lines that don't have them yet
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
      this.editor.view.dispatch(tr);
    }
  },

  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),
      Enter: ({ editor }) => {
        return editor.chain().splitBlock().updateAttributes('paragraph', {
          lineId: generateLineId(),
        }).run();
      },
      'Shift-Tab': ({ editor }) => {
        const doc = editor.state.doc;
        let titleEndPos = null;
        doc.forEach((node, pos) => {
          if (node.type.name === 'songTitle') {
            titleEndPos = pos + node.nodeSize - 1;
          }
        });
        if (titleEndPos !== null) {
          return editor.chain().setTextSelection(titleEndPos).run();
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
