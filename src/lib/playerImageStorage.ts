import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../firebase';

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_INLINE_DATA_URL_CHARS = 750_000;
const STORAGE_TRY_TIMEOUT_MS = 12_000;

function playerPhotoPath(roomId: string, playerId: string) {
  return `rooms/${roomId}/players/${playerId}/photo`;
}

function isAllowedImage(file: File): boolean {
  if (file.type && (ALLOWED_MIME.has(file.type) || file.type.startsWith('image/'))) {
    return true;
  }
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif'].includes(ext);
}

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export function validatePlayerImageFile(file: File): string | null {
  if (!isAllowedImage(file)) {
    return 'Use a photo file (JPEG, PNG, or WebP).';
  }
  if (file.size > MAX_BYTES) {
    return 'Image must be 5 MB or smaller.';
  }
  return null;
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise
      .then((v) => {
        clearTimeout(timer);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(timer);
        reject(e);
      });
  });
}

function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

function canvasToJpegFile(canvas: HTMLCanvasElement, quality: number): Promise<File | null> {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          resolve(null);
          return;
        }
        resolve(new File([blob], 'photo.jpg', { type: 'image/jpeg' }));
      },
      'image/jpeg',
      quality,
    );
  });
}

/** Resize to JPEG for storage inline or Firebase Storage. */
async function compressToJpeg(file: File, maxDim: number, quality: number): Promise<File> {
  if (typeof document === 'undefined') return file;

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      const scale = Math.min(1, maxDim / Math.max(width, height, 1));
      width = Math.max(1, Math.round(width * scale));
      height = Math.max(1, Math.round(height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      void canvasToJpegFile(canvas, quality).then((jpeg) => resolve(jpeg ?? file));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };
    img.src = objectUrl;
  });
}

/** Smaller files fit Firestore’s ~1MB document limit reliably. */
export async function preparePlayerImageFile(file: File): Promise<File> {
  const validationError = validatePlayerImageFile(file);
  if (validationError) throw new Error(validationError);

  const tiers: [number, number][] = [
    [640, 0.82],
    [480, 0.75],
    [360, 0.68],
  ];

  for (const [maxDim, quality] of tiers) {
    const jpeg = await compressToJpeg(file, maxDim, quality);
    const dataUrl = await fileToDataUrl(jpeg);
    if (dataUrl.length <= MAX_INLINE_DATA_URL_CHARS) {
      return jpeg;
    }
  }

  const smallest = await compressToJpeg(file, 280, 0.6);
  return smallest;
}

async function uploadPreparedToStorage(
  roomId: string,
  playerId: string,
  prepared: File,
): Promise<string> {
  const storageRef = ref(storage, playerPhotoPath(roomId, playerId));
  await withTimeout(
    uploadBytes(storageRef, prepared, { contentType: 'image/jpeg' }),
    STORAGE_TRY_TIMEOUT_MS,
    'Firebase Storage timed out.',
  );
  return getDownloadURL(storageRef);
}

function formatStorageError(err: unknown): string {
  const code = (err as { code?: string }).code;
  switch (code) {
    case 'storage/unauthorized':
      return 'Storage permission denied.';
    case 'storage/canceled':
      return 'Upload was canceled.';
    case 'storage/unknown':
    case 'storage/object-not-found':
      return 'Firebase Storage is not available for this project.';
    default:
      return (err as Error).message || 'Storage upload failed.';
  }
}

/** Prefer Firestore inline URL (fast, no Storage setup). Optionally try Storage for huge files. */
export async function resolvePlayerImageUrl(
  roomId: string,
  playerId: string,
  file: File,
): Promise<string> {
  const prepared = await preparePlayerImageFile(file);
  const dataUrl = await fileToDataUrl(prepared);

  if (dataUrl.length <= MAX_INLINE_DATA_URL_CHARS) {
    return dataUrl;
  }

  try {
    return await uploadPreparedToStorage(roomId, playerId, prepared);
  } catch (err) {
    throw new Error(
      `${formatStorageError(err)} Image is too large to save without Storage — use a smaller photo or enable Firebase Storage.`,
    );
  }
}

export async function uploadPlayerPhoto(
  roomId: string,
  playerId: string,
  file: File,
): Promise<string> {
  const prepared = await preparePlayerImageFile(file);
  try {
    return await uploadPreparedToStorage(roomId, playerId, prepared);
  } catch (err) {
    throw new Error(formatStorageError(err));
  }
}

export async function deletePlayerPhotoFile(roomId: string, playerId: string): Promise<void> {
  try {
    await deleteObject(ref(storage, playerPhotoPath(roomId, playerId)));
  } catch {
    // Inline data URLs have no storage object
  }
}
