import { Node, mergeAttributes } from '@tiptap/core';

const SectionRepeatRef = Node.create({
  name: 'sectionRepeatRef',
  group: 'block',
  atom: false,
  content: 'inline*',
  defining: true,

  addAttributes() {
    return {
      refSection: {
        default: 'Chorus',
        parseHTML: (element) => element.getAttribute('data-ref-section'),
        renderHTML: (attributes) => {
          return { 'data-ref-section': attributes.refSection };
        },
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'div[data-type="sectionRepeatRef"]' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(
        { 'data-type': 'sectionRepeatRef', class: 'section-repeat-ref' },
        HTMLAttributes
      ),
      0,
    ];
  },

  addCommands() {
    return {
      setSectionRepeatRef: (refSection) => ({ commands }) => {
        return commands.setNode(this.name, { refSection: refSection || 'Chorus' });
      },
    };
  },
});

export default SectionRepeatRef;
