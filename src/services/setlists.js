import { supabase } from "../supabase";

export async function fetchSetlists(userId) {
  const { data, error } = await supabase
    .from("setlists")
    .select("id, name, created_at, updated_at")
    .eq("user_id", userId)
    .order("name", { ascending: true });

  if (error) throw error;
  return data;
}

export async function createSetlist(userId, name) {
  const { data, error } = await supabase
    .from("setlists")
    .insert({ user_id: userId, name })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function renameSetlist(id, name) {
  const { error } = await supabase
    .from("setlists")
    .update({ name })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteSetlist(id) {
  const { error } = await supabase.from("setlists").delete().eq("id", id);

  if (error) throw error;
}

export async function fetchSetlistSongs(setlistId) {
  const { data, error } = await supabase
    .from("setlist_songs")
    .select("song_id, position, songs(id, title, updated_at, created_at, is_locked)")
    .eq("setlist_id", setlistId)
    .order("position", { ascending: true });

  if (error) throw error;
  return data.map((row) => ({ ...row.songs, position: row.position }));
}

export async function addSongsToSetlist(setlistId, songIds) {
  // Get current max position
  const { data: existing, error: maxPosError } = await supabase
    .from("setlist_songs")
    .select("position")
    .eq("setlist_id", setlistId)
    .order("position", { ascending: false })
    .limit(1);

  if (maxPosError) throw maxPosError;

  let nextPosition = (existing?.[0]?.position ?? -1) + 1;

  const rows = songIds.map((songId) => ({
    setlist_id: setlistId,
    song_id: songId,
    position: nextPosition++,
  }));

  const { error } = await supabase
    .from("setlist_songs")
    .upsert(rows, { onConflict: "setlist_id,song_id", ignoreDuplicates: true });

  if (error) throw error;
}

export async function removeSongFromSetlist(setlistId, songId) {
  const { error } = await supabase
    .from("setlist_songs")
    .delete()
    .eq("setlist_id", setlistId)
    .eq("song_id", songId);

  if (error) throw error;
}

export async function reorderSetlistSongs(setlistId, orderedSongIds) {
  const updates = orderedSongIds.map((songId, index) => ({
    setlist_id: setlistId,
    song_id: songId,
    position: index,
  }));

  const { error } = await supabase
    .from("setlist_songs")
    .upsert(updates, { onConflict: "setlist_id,song_id" });

  if (error) throw error;
}
