/**
 * Image compression utility — resizes + compresses images before they hit the
 * network. Dramatically reduces MongoDB doc size, upload bandwidth, and feed
 * load times.
 *
 * Typical savings: 4–8 MB → ~200–400 KB (10–20× smaller).
 */
import * as ImageManipulator from 'expo-image-manipulator';

export interface CompressOptions {
  /** Max width in pixels (image is resized proportionally if larger). Default 1600. */
  maxWidth?: number;
  /** JPEG quality 0–1. Default 0.7 (visually lossless on phone screens). */
  quality?: number;
}

/**
 * Compress an image URI and return a `data:image/jpeg;base64,…` string ready to
 * push straight into the existing base64-based upload flow.
 *
 * Callers should use this instead of `ImagePicker`'s own `base64: true` option
 * (which returns the raw uncompressed bytes).
 */
export async function compressToBase64(
  uri: string,
  { maxWidth = 1600, quality = 0.7 }: CompressOptions = {}
): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: maxWidth } }],
    {
      compress: quality,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    }
  );
  if (!result.base64) {
    throw new Error('Image compression failed (no base64 output)');
  }
  return `data:image/jpeg;base64,${result.base64}`;
}

/**
 * Profile-picture preset: square-ish, smaller max dimension.
 */
export async function compressAvatarToBase64(uri: string): Promise<string> {
  return compressToBase64(uri, { maxWidth: 600, quality: 0.75 });
}
