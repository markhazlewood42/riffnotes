// repair-song-title.cjs
// One-shot script to restore a missing songTitle node for a specific song.
//
// What it does:
//   1. Fetches the song document from Supabase
//   2. Drops any leading empty paragraphs at the top
//   3. Converts the first non-empty paragraph to a songTitle node
//   4. Saves the repaired document and title back to the database
//
// Run with:
//   SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/repair-song-title.cjs <song-id>

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://aukdulztojapsiocohna.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SONG_ID = process.argv[2];

if (!SUPABASE_KEY) {
  console.error('Set SUPABASE_SERVICE_ROLE_KEY env var before running.');
  console.error('Find it in Supabase Dashboard > Settings > API > service_role (secret).');
  process.exit(1);
}
if (!SONG_ID) {
  console.error('Usage: SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/repair-song-title.cjs <song-id>');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function isEmpty(node) {
  // A node is considered empty if it has no content, or content is only a single
  // hardBreak (ProseMirror trailing break), or all text is whitespace.
  if (!node.content || node.content.length === 0) return true;
  const text = (node.content || []).map(n => n.text || '').join('');
  return text.trim() === '';
}

async function main() {
  console.log(`Fetching song ${SONG_ID}...`);
  const { data: song, error } = await supabase
    .from('songs')
    .select('id, title, document')
    .eq('id', SONG_ID)
    .single();

  if (error || !song) {
    console.error('Failed to fetch song:', error?.message || 'not found');
    process.exit(1);
  }

  console.log(`Song: "${song.title}"`);

  const doc = song.document;
  if (!doc?.content) {
    console.error('Song has no document content.');
    process.exit(1);
  }

  // Check if there's already a songTitle node
  const existingSongTitle = doc.content.find(n => n.type === 'songTitle');
  if (existingSongTitle) {
    const titleText = (existingSongTitle.content || []).map(n => n.text || '').join('');
    console.log(`Song already has a songTitle node: "${titleText}"`);
    console.log('No repair needed.');
    return;
  }

  console.log(`\nDocument has ${doc.content.length} nodes. First 3:`);
  doc.content.slice(0, 3).forEach((n, i) => {
    const text = (n.content || []).map(c => c.text || '').join('');
    console.log(`  [${i}] type=${n.type}, text="${text}"`);
  });

  // Find the first non-empty paragraph — that's the title
  const firstNonEmptyIdx = doc.content.findIndex(n => n.type === 'paragraph' && !isEmpty(n));
  if (firstNonEmptyIdx === -1) {
    console.error('No non-empty paragraph found to use as title.');
    process.exit(1);
  }

  const titleNode = doc.content[firstNonEmptyIdx];
  const titleText = (titleNode.content || []).map(n => n.text || '').join('');
  console.log(`\nConverting paragraph "${titleText}" (index ${firstNonEmptyIdx}) to songTitle.`);
  console.log(`Dropping ${firstNonEmptyIdx} leading empty paragraph(s).`);

  // Build the repaired document:
  // - Drop all leading empty paragraphs (indices 0..firstNonEmptyIdx-1)
  // - Convert the first non-empty paragraph to songTitle
  // - Keep everything after it unchanged
  const repairedContent = [
    {
      type: 'songTitle',
      content: titleNode.content || [],
    },
    ...doc.content.slice(firstNonEmptyIdx + 1),
  ];

  const repairedDoc = { ...doc, content: repairedContent };

  console.log(`\nRepaired document has ${repairedContent.length} nodes.`);
  console.log(`First node: type=songTitle, text="${titleText}"`);

  const { error: updateErr } = await supabase
    .from('songs')
    .update({ document: repairedDoc, title: titleText })
    .eq('id', SONG_ID);

  if (updateErr) {
    console.error('Failed to update song:', updateErr.message);
    process.exit(1);
  }

  console.log(`\nSong repaired successfully! Title is now "${titleText}".`);
}

main().catch(console.error);
