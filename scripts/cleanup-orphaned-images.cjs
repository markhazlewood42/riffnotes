// cleanup-orphaned-images.cjs
// One-shot script to find and remove orphaned images in the annotation-images bucket.
//
// What it does:
//   1. Lists all files in the annotation-images Storage bucket
//   2. Queries all songs and collects every referenced image filename
//   3. Reports files that exist in Storage but aren't referenced by any annotation
//   4. Optionally deletes them (pass --delete flag)
//
// Run with:
//   node scripts/cleanup-orphaned-images.cjs              # dry-run (report only)
//   node scripts/cleanup-orphaned-images.cjs --delete     # actually remove orphans
//
// Requires SUPABASE_SERVICE_ROLE_KEY env var (bypasses RLS).

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://aukdulztojapsiocohna.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
  console.error('Set SUPABASE_SERVICE_ROLE_KEY env var before running.');
  console.error('Find it in Supabase Dashboard > Settings > API > service_role (secret).');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BUCKET = 'annotation-images';
const BUCKET_PATH_SEGMENT = `/storage/v1/object/public/${BUCKET}/`;
// Protected files that should never be deleted
const PROTECTED = new Set(['example-notation.png']);

const shouldDelete = process.argv.includes('--delete');

async function main() {
  // Step 1: List all files in the bucket
  const { data: files, error: listErr } = await supabase.storage
    .from(BUCKET)
    .list('', { limit: 10000 });

  if (listErr) {
    console.error('Failed to list bucket:', listErr.message);
    process.exit(1);
  }

  const bucketFiles = new Set(files.map((f) => f.name));
  console.log(`Found ${bucketFiles.size} file(s) in Storage bucket.\n`);

  // Step 2: Query all songs and collect referenced image filenames
  const { data: songs, error: fetchErr } = await supabase
    .from('songs')
    .select('id, title, annotations');

  if (fetchErr) {
    console.error('Failed to fetch songs:', fetchErr.message);
    process.exit(1);
  }

  const referencedFiles = new Set();
  for (const song of songs || []) {
    if (!song.annotations) continue;
    for (const ann of Object.values(song.annotations)) {
      if (ann.type !== 'image' || !ann.url) continue;
      const idx = ann.url.indexOf(BUCKET_PATH_SEGMENT);
      if (idx === -1) continue;
      referencedFiles.add(ann.url.slice(idx + BUCKET_PATH_SEGMENT.length));
    }
  }

  console.log(`Found ${referencedFiles.size} referenced image(s) across ${(songs || []).length} song(s).\n`);

  // Step 3: Find orphans
  const orphans = [];
  for (const fileName of bucketFiles) {
    if (PROTECTED.has(fileName)) continue;
    if (!referencedFiles.has(fileName)) {
      orphans.push(fileName);
    }
  }

  if (orphans.length === 0) {
    console.log('No orphaned images found!');
    return;
  }

  console.log(`Found ${orphans.length} orphaned image(s):`);
  for (const name of orphans) {
    console.log(`  - ${name}`);
  }
  console.log();

  // Step 4: Optionally delete
  if (!shouldDelete) {
    console.log('Dry run — pass --delete to remove these files.');
    return;
  }

  console.log('Deleting orphaned images...');
  const { error: delErr } = await supabase.storage.from(BUCKET).remove(orphans);

  if (delErr) {
    console.error('Failed to delete:', delErr.message);
    process.exit(1);
  }

  console.log(`Deleted ${orphans.length} orphaned image(s).`);
}

main().catch(console.error);
