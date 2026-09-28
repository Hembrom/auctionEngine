import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../firebase';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

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

export async function uploadPlayerPhoto(
  roomId: string,
  playerId: string,
  file: File,
): Promise<string> {
  const validationError = validatePlayerImageFile(file);
  if (validationError) throw new Error(validationError);

  const storageRef = ref(storage, playerPhotoPath(roomId, playerId));
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}

export async function deletePlayerPhotoFile(roomId: string, playerId: string): Promise<void> {
  try {
    await deleteObject(ref(storage, playerPhotoPath(roomId, playerId)));
  } catch {
    // File may not exist
  }
}
