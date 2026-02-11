import { Node, mergeAttributes } from '@tiptap/core';

const SongTitle = Node.create({
  name: 'songTitle',
  group: 'block',
  content: 'inline*',
  defining: true,

  addAttributes() {
    return {
      level: {
        default: 1,
        rendered: false,
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'h1[data-type="songTitle"]' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'h1',
      mergeAttributes({ 'data-type': 'songTitle', class: 'song-title' }, HTMLAttributes),
      0,
    ];
  },

  addCommands() {
    return {
      setSongTitle: () => ({ commands }) => {
        return commands.setNode(this.name);
      },
      toggleSongTitle: () => ({ commands }) => {
        return commands.toggleNode(this.name, 'paragraph');
      },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-t': () => this.editor.commands.toggleSongTitle(),
    };
  },
});

export default SongTitle;
