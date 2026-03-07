import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

const PAGE_HEIGHT = 1056; // letter at 96dpi
const PAGE_GAP = 10;      // visible gap between pages
const MARGIN = 72;         // 0.75in top/bottom margin per page

export const pageBreakKey = new PluginKey('pageBreaks');

const PageBreaks = Extension.create({
  name: 'pageBreaks',

  addProseMirrorPlugins() {
    // Stored break data: [{ offset, height }]
    let breaks = [];
    let scheduled = false;

    return [
      new Plugin({
        key: pageBreakKey,

        props: {
          decorations(state) {
            if (breaks.length === 0) return DecorationSet.empty;

            const decorations = breaks.map(({ offset, height, bottomRemainder }) =>
              Decoration.widget(offset, () => {
                const spacer = document.createElement('div');
                spacer.className = 'page-break-spacer';
                spacer.style.height = `${height}px`;
                spacer.style.setProperty('--bottom-remainder', `${bottomRemainder}px`);
                spacer.contentEditable = 'false';
                return spacer;
              }, { side: -1, key: `pb-${offset}-${height}` })
            );

            return DecorationSet.create(state.doc, decorations);
          },
        },

        view(editorView) {
          const calculate = () => {
            scheduled = false;
            const view = editorView;
            if (!view.dom || !view.dom.isConnected) return;

            const { doc } = view.state;
            const container = view.dom.closest('.document-container');
            if (!container) return;
            const zoom = parseFloat(getComputedStyle(container).zoom) || 1;

            const editorRect = view.dom.getBoundingClientRect();
            const editorTop = editorRect.top / zoom;

            // Measure existing spacer heights already in the DOM from previous render
            const existingSpacers = view.dom.querySelectorAll('.page-break-spacer');
            const existingSpacerHeights = [];
            existingSpacers.forEach(s => {
              const r = s.getBoundingClientRect();
              existingSpacerHeights.push({
                top: r.top / zoom - editorTop,
                height: r.height / zoom,
              });
            });

            const newBreaks = [];
            let currentPage = 1;
            let pageEnd = PAGE_HEIGHT;
            let prevNodeBottom = MARGIN; // start after top padding

            // Subtract spacer heights that are above a given position
            const contentY = (rawY) => {
              let spacerAbove = 0;
              for (const s of existingSpacerHeights) {
                if (s.top < rawY) spacerAbove += s.height;
              }
              return rawY - spacerAbove;
            };

            doc.forEach((node, offset) => {
              const dom = view.nodeDOM(offset);
              if (!dom || !(dom instanceof HTMLElement)) return;

              const rect = dom.getBoundingClientRect();
              const rawBottom = rect.bottom / zoom - editorTop;
              const nodeBottom = contentY(rawBottom);

              // Trigger when content would extend into the bottom margin
              const triggerPoint = pageEnd - MARGIN;

              if (nodeBottom > triggerPoint && prevNodeBottom < triggerPoint) {
                const bottomRemainder = pageEnd - prevNodeBottom;
                const nextPageContentStart = pageEnd + PAGE_GAP + MARGIN;
                const spacerHeight = Math.max(
                  PAGE_GAP,
                  nextPageContentStart - prevNodeBottom
                );

                newBreaks.push({ offset, height: Math.round(spacerHeight), bottomRemainder: Math.round(bottomRemainder) });

                currentPage++;
                pageEnd = currentPage * PAGE_HEIGHT + (currentPage - 1) * PAGE_GAP;
              }

              prevNodeBottom = nodeBottom;
            });

            // Check if breaks changed
            const changed =
              newBreaks.length !== breaks.length ||
              newBreaks.some((b, i) => b.offset !== breaks[i].offset || b.height !== breaks[i].height || b.bottomRemainder !== breaks[i].bottomRemainder);

            if (changed) {
              breaks = newBreaks;
              view.dispatch(view.state.tr.setMeta(pageBreakKey, true));
            }
          };

          const scheduleCalculation = () => {
            if (scheduled) return;
            scheduled = true;
            requestAnimationFrame(calculate);
          };

          // Initial calculation
          scheduleCalculation();

          // Also recalculate on window resize (font rendering changes, etc.)
          const onResize = () => scheduleCalculation();
          window.addEventListener('resize', onResize);

          return {
            update(view, prevState) {
              // Recalculate on doc changes. Also recalculate after our own
              // meta dispatch so positions account for newly-rendered spacers.
              scheduleCalculation();
            },
            destroy() {
              scheduled = false;
              window.removeEventListener('resize', onResize);
            },
          };
        },
      }),
    ];
  },
});

export default PageBreaks;
