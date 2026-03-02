import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export const wordHoverKey = new PluginKey('wordHover');

/**
 * Given a document position, return the {from, to} range of the word at that
 * position, or null if the position is on whitespace or not in a lyric paragraph.
 */
function getWordAt(doc, pos) {
  try {
    const $pos = doc.resolve(pos);
    const parent = $pos.parent;
    if (parent.type.name !== 'paragraph') return null;

    const text = parent.textContent;
    const offset = $pos.parentOffset;

    // Must be at a non-whitespace character
    if (!text || offset >= text.length || /\s/.test(text[offset])) return null;

    const nodeContentStart = pos - offset;

    let start = offset;
    while (start > 0 && !/\s/.test(text[start - 1])) start--;

    let end = offset;
    while (end < text.length && !/\s/.test(text[end])) end++;

    if (start === end) return null;
    return { from: nodeContentStart + start, to: nodeContentStart + end };
  } catch {
    return null;
  }
}

/** Only activate when the pointer is over actual lyric text content. */
function isOverLyricText(event) {
  return !!event.target?.closest?.('.lyric-content');
}

const WordHover = Extension.create({
  name: 'wordHover',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: wordHoverKey,

        state: {
          init: () => ({ hoveredWord: null }),
          apply(tr, prev) {
            const meta = tr.getMeta(wordHoverKey);
            if (meta !== undefined) return { hoveredWord: meta };
            return prev;
          },
        },

        props: {
          decorations(state) {
            const { hoveredWord } = wordHoverKey.getState(state);
            if (!hoveredWord) return DecorationSet.empty;
            return DecorationSet.create(state.doc, [
              Decoration.inline(hoveredWord.from, hoveredWord.to, {
                class: 'word-hover-highlight',
              }),
            ]);
          },

          handleDOMEvents: {
            mousemove(view, event) {
              const { hoveredWord } = wordHoverKey.getState(view.state);

              if (!isOverLyricText(event)) {
                if (hoveredWord !== null) {
                  view.dispatch(view.state.tr.setMeta(wordHoverKey, null));
                }
                return false;
              }

              const posResult = view.posAtCoords({ left: event.clientX, top: event.clientY });

              if (!posResult) {
                if (hoveredWord !== null) {
                  view.dispatch(view.state.tr.setMeta(wordHoverKey, null));
                }
                return false;
              }

              const word = getWordAt(view.state.doc, posResult.pos);
              const next = word ?? null;

              if (next?.from !== hoveredWord?.from || next?.to !== hoveredWord?.to) {
                view.dispatch(view.state.tr.setMeta(wordHoverKey, next));
              }

              return false;
            },

            mouseleave(view) {
              const { hoveredWord } = wordHoverKey.getState(view.state);
              if (hoveredWord !== null) {
                view.dispatch(view.state.tr.setMeta(wordHoverKey, null));
              }
              return false;
            },
          },

          // Single click on a word selects it, triggering the BubbleMenu.
          // Returns false (no-op) on whitespace or outside lyric text so
          // normal cursor placement and drag-selection are unaffected.
          handleClick(view, pos, event) {
            if (event.button !== 0 || !isOverLyricText(event)) return false;

            const word = getWordAt(view.state.doc, pos);
            if (!word) return false;

            const selection = TextSelection.create(view.state.doc, word.from, word.to);
            view.dispatch(view.state.tr.setSelection(selection).scrollIntoView());
            return true;
          },
        },
      }),
    ];
  },
});

export default WordHover;
