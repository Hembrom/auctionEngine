import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../firebase';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const UPLOAD_TIMEOUT_MS = 45_000;
const MAX_INLINE_DATA_URL_CHARS = 950_000;

function playerPhotoPath(roomId: string, playerId: string) {
  return `rooms/${roomId}/players/${playerId}/photo`;
}

export function validatePlayerImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return 'Use a JPEG, PNG, or WebP image.';
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

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

/** Resize large photos so uploads finish faster and fit Firestore fallback if needed. */
export async function preparePlayerImageFile(file: File): Promise<File> {
  const validationError = validatePlayerImageFile(file);
  if (validationError) throw new Error(validationError);

  if (typeof document === 'undefined') return file;

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const maxDim = 960;
      let { width, height } = img;
      const scale = Math.min(1, maxDim / Math.max(width, height));
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
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          resolve(new File([blob], 'photo.jpg', { type: 'image/jpeg' }));
        },
        'image/jpeg',
        0.85,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };
    img.src = objectUrl;
  });
}

function formatStorageError(err: unknown): string {
  const code = (err as { code?: string }).code;
  switch (code) {
    case 'storage/unauthorized':
      return 'Storage permission denied. Deploy storage.rules: firebase deploy --only storage';
    case 'storage/canceled':
      return 'Upload was canceled.';
    case 'storage/unknown':
      return 'Storage error. Enable Firebase Storage in the console, then deploy storage rules.';
    default:
      return (err as Error).message || 'Upload failed.';
  }
}

export async function uploadPlayerPhoto(
  roomId: string,
  playerId: string,
  file: File,
): Promise<string> {
  const prepared = await preparePlayerImageFile(file);
  const storageRef = ref(storage, playerPhotoPath(roomId, playerId));

  try {
    await withTimeout(
      uploadBytes(storageRef, prepared, { contentType: 'image/jpeg' }),
      UPLOAD_TIMEOUT_MS,
      'Upload timed out. Check Firebase Storage is enabled and storage rules are deployed.',
    );
    return await getDownloadURL(storageRef);
  } catch (err) {
    throw new Error(formatStorageError(err));
  }
}

/** Storage first; if unavailable, store a compressed JPEG as a data URL on the player doc. */
export async function resolvePlayerImageUrl(
  roomId: string,
  playerId: string,
  file: File,
): Promise<string> {
  const prepared = await preparePlayerImageFile(file);

  try {
    return await uploadPlayerPhoto(roomId, playerId, prepared);
  } catch {
    const dataUrl = await fileToDataUrl(prepared);
    if (dataUrl.length > MAX_INLINE_DATA_URL_CHARS) {
      throw new Error(
        'Could not upload to Firebase Storage and the image is too large to save inline. Enable Storage (Firebase Console → Build → Storage) and run: firebase deploy --only storage',
      );
    }
    return dataUrl;
  }
}

export async function deletePlayerPhotoFile(roomId: string, playerId: string): Promise<void> {
  try {
    await deleteObject(ref(storage, playerPhotoPath(roomId, playerId)));
  } catch {
    // File may not exist (inline data URLs have no storage object)
  }
}
