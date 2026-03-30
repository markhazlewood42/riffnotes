import { supabase } from '../supabase';

const BUCKET = 'annotation-images';
const BUCKET_PATH_SEGMENT = `/storage/v1/object/public/${BUCKET}/`;

/** Deletes the storage file for an image annotation. No-op for non-image annotations. */
export async function deleteAnnotationImage(annotation) {
  if (annotation?.type !== 'image' || !annotation.url) return;
  const idx = annotation.url.indexOf(BUCKET_PATH_SEGMENT);
  if (idx === -1) return;
  const fileName = annotation.url.slice(idx + BUCKET_PATH_SEGMENT.length);
  const { error } = await supabase.storage.from(BUCKET).remove([fileName]);
  if (error) console.error('Failed to delete image from storage:', error);
}

/**
 * Batch-deletes storage files for multiple image annotations.
 * Accepts an object or array of annotations.
 */
export async function deleteAnnotationImages(annotations) {
  if (annotations == null) return;
  const list = Array.isArray(annotations) ? annotations : Object.values(annotations);
  const fileNames = [];
  for (const ann of list) {
    if (ann?.type !== 'image' || !ann.url) continue;
    const idx = ann.url.indexOf(BUCKET_PATH_SEGMENT);
    if (idx === -1) continue;
    fileNames.push(ann.url.slice(idx + BUCKET_PATH_SEGMENT.length));
  }
  if (fileNames.length === 0) return;
  const { error } = await supabase.storage.from(BUCKET).remove(fileNames);
  if (error) console.error('Failed to delete images from storage:', error);
}
