import { vi, describe, test, expect, beforeEach } from 'vitest';

// Mock supabase before importing the module under test
const mockRemove = vi.fn().mockResolvedValue({ error: null });
vi.mock('../src/supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({ remove: mockRemove })),
    },
  },
}));

import { deleteAnnotationImage, deleteAnnotationImages } from '../src/utils/deleteAnnotationImage.js';
import { supabase } from '../src/supabase';

beforeEach(() => {
  vi.clearAllMocks();
});

const STORAGE_URL =
  'https://aukdulztojapsiocohna.supabase.co/storage/v1/object/public/annotation-images/abc123.png';

describe('deleteAnnotationImage', () => {
  test('deletes the file from storage for an image annotation', async () => {
    await deleteAnnotationImage({ type: 'image', url: STORAGE_URL });
    expect(supabase.storage.from).toHaveBeenCalledWith('annotation-images');
    expect(mockRemove).toHaveBeenCalledWith(['abc123.png']);
  });

  test('no-op for non-image annotation types', async () => {
    await deleteAnnotationImage({ type: 'right-side', url: STORAGE_URL, value: 'note' });
    expect(mockRemove).not.toHaveBeenCalled();
  });

  test('no-op for chord annotations', async () => {
    await deleteAnnotationImage({ type: 'chord', charOffset: 0, value: 'Am' });
    expect(mockRemove).not.toHaveBeenCalled();
  });

  test('no-op for null/undefined annotation', async () => {
    await deleteAnnotationImage(null);
    await deleteAnnotationImage(undefined);
    expect(mockRemove).not.toHaveBeenCalled();
  });

  test('no-op when url is missing', async () => {
    await deleteAnnotationImage({ type: 'image' });
    expect(mockRemove).not.toHaveBeenCalled();
  });

  test('no-op when url does not contain expected bucket path', async () => {
    await deleteAnnotationImage({ type: 'image', url: 'https://example.com/other.png' });
    expect(mockRemove).not.toHaveBeenCalled();
  });

  test('logs error on storage failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockRemove.mockResolvedValueOnce({ error: { message: 'Not found' } });

    await deleteAnnotationImage({ type: 'image', url: STORAGE_URL });

    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to delete image from storage:',
      { message: 'Not found' },
    );
    consoleSpy.mockRestore();
  });
});

describe('deleteAnnotationImages', () => {
  test('batch-deletes multiple image annotations from an object map', async () => {
    const annotations = {
      'ann-1': { type: 'chord', value: 'Am' },
      'ann-2': {
        type: 'image',
        url: 'https://aukdulztojapsiocohna.supabase.co/storage/v1/object/public/annotation-images/file1.png',
      },
      'ann-3': { type: 'right-side', value: 'note' },
      'ann-4': {
        type: 'image',
        url: 'https://aukdulztojapsiocohna.supabase.co/storage/v1/object/public/annotation-images/file2.jpg',
      },
    };

    await deleteAnnotationImages(annotations);

    expect(mockRemove).toHaveBeenCalledWith(['file1.png', 'file2.jpg']);
  });

  test('accepts an array of annotations', async () => {
    const annotations = [
      {
        type: 'image',
        url: 'https://aukdulztojapsiocohna.supabase.co/storage/v1/object/public/annotation-images/arr.png',
      },
    ];

    await deleteAnnotationImages(annotations);
    expect(mockRemove).toHaveBeenCalledWith(['arr.png']);
  });

  test('no-op when no image annotations exist', async () => {
    await deleteAnnotationImages({
      'ann-1': { type: 'chord', value: 'G' },
      'ann-2': { type: 'right-side', value: 'note' },
    });
    expect(mockRemove).not.toHaveBeenCalled();
  });

  test('no-op for empty object', async () => {
    await deleteAnnotationImages({});
    expect(mockRemove).not.toHaveBeenCalled();
  });
});
