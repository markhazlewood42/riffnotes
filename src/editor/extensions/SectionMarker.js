import { Node, mergeAttributes } from '@tiptap/core';

const SECTION_TYPES = [
  'Intro', 'Verse', 'Pre-chorus', 'Chorus', 'Post-chorus',
  'Bridge', 'Break', 'Interlude', 'Guitar Solo', 'Outro',
];

const SectionMarker = Node.create({
  name: 'sectionMarker',
  group: 'block',
  atom: false,
  content: 'inline*',
  defining: true,

  addAttributes() {
    return {
      sectionType: {
        default: 'Verse',
        parseHTML: (element) => element.getAttribute('data-section-type'),
        renderHTML: (attributes) => {
          return { 'data-section-type': attributes.sectionType };
        },
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'div[data-type="sectionMarker"]' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(
        { 'data-type': 'sectionMarker', class: 'section-marker' },
        HTMLAttributes
      ),
      0,
    ];
  },

  addCommands() {
    return {
      setSectionMarker: (sectionType) => ({ commands }) => {
        return commands.setNode(this.name, { sectionType: sectionType || 'Verse' });
      },
    };
  },
});

export default SectionMarker;
export { SECTION_TYPES };
