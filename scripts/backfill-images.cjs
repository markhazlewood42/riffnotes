// backfill-images.cjs
// One-shot script to migrate base64-encoded image annotations to Supabase Storage.
//
// What it does:
//   1. Fetches all songs that have annotations containing "dataUrl"
//   2. For each image annotation with a dataUrl, decodes the base64 and uploads to Storage
//   3. Replaces the dataUrl with a public Storage URL
//   4. Updates the song row in the database
//
// Run with: node scripts/backfill-images.cjs
//
// NOTE: Uses the anon key, which means RLS applies. The script authenticates as
// a service-level caller via the anon key — since the Storage INSERT policy allows
// any authenticated role and the bucket is public for reads, this works. However,
// the songs query will only return rows visible to the anon role. If RLS blocks
// the SELECT, you may need to use a service_role key instead (find it in Supabase
// Dashboard > Settings > API > service_role).

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://aukdulztojapsiocohna.supabase.co';
// Use service_role key to bypass RLS on the songs table.
// Replace this with your service_role key from Supabase Dashboard > Settings > API.
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
  console.error('Set SUPABASE_SERVICE_ROLE_KEY env var before running.');
  console.error('Find it in Supabase Dashboard > Settings > API > service_role (secret).');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  // Step 1: Find all songs whose annotations JSON contains "dataUrl"
  // The text search operator catches any annotation with a base64 data URL.
  // Fetch all songs, then filter locally for any that have dataUrl in their annotations.
  // (Supabase's .like() doesn't work on JSONB columns, and with only a handful of songs
  // it's simpler to just pull them all.)
  const { data: allSongs, error: fetchErr } = await supabase
    .from('songs')
    .select('id, title, annotations');

  const songs = (allSongs || []).filter(
    (s) => s.annotations && JSON.stringify(s.annotations).includes('dataUrl')
  );

  if (fetchErr) {
    console.error('Failed to fetch songs:', fetchErr.message);
    process.exit(1);
  }

  console.log(`Found ${songs.length} song(s) with base64 image annotations.\n`);

  if (songs.length === 0) {
    console.log('Nothing to migrate!');
    return;
  }

  for (const song of songs) {
    console.log(`Processing song: "${song.title}" (${song.id})`);
    const annotations = song.annotations;
    let updated = false;

    for (const [annId, ann] of Object.entries(annotations)) {
      // Only process image annotations that still have a dataUrl
      if (ann.type !== 'image' || !ann.dataUrl) continue;

      console.log(`  Migrating annotation ${annId}...`);

      // Step 2: Decode the base64 data URL into a Buffer
      // Format is "data:image/png;base64,iVBOR..." — split on the comma
      const [header, base64Data] = ann.dataUrl.split(',');
      if (!base64Data) {
        console.warn(`  Skipping ${annId}: couldn't parse dataUrl`);
        continue;
      }

      // Extract the MIME type (e.g. "image/png") and file extension
      const mimeMatch = header.match(/data:([^;]+)/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/png';
      const ext = mime.split('/')[1] || 'png';

      const buffer = Buffer.from(base64Data, 'base64');
      console.log(`    Decoded ${buffer.length} bytes (${mime})`);

      // Step 3: Upload to Supabase Storage
      const fileName = `backfill-${annId}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('annotation-images')
        .upload(fileName, buffer, { contentType: mime });

      if (uploadErr) {
        // If file already exists (e.g. re-running script), that's fine
        if (uploadErr.message?.includes('already exists') || uploadErr.statusCode === '409') {
          console.log(`    Already uploaded, skipping upload.`);
        } else {
          console.error(`    Upload failed: ${uploadErr.message}`);
          continue;
        }
      } else {
        console.log(`    Uploaded to Storage as ${fileName}`);
      }

      // Step 4: Get the public URL and replace dataUrl with url
      const { data: urlData } = supabase.storage
        .from('annotation-images')
        .getPublicUrl(fileName);

      ann.url = urlData.publicUrl;
      delete ann.dataUrl;
      updated = true;

      console.log(`    Mapped to: ${ann.url}`);
    }

    // Step 5: Write the updated annotations back to the database
    if (updated) {
      const { error: updateErr } = await supabase
        .from('songs')
        .update({ annotations })
        .eq('id', song.id);

      if (updateErr) {
        console.error(`  Failed to update song: ${updateErr.message}`);
      } else {
        console.log(`  Song updated successfully.\n`);
      }
    } else {
      console.log(`  No dataUrl annotations found (already migrated?).\n`);
    }
  }

  console.log('Done!');
}

main().catch(console.error);
