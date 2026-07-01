import { useParams } from 'react-router-dom';

export function useRoomId(): string {
  const { roomId } = useParams<{ roomId: string }>();
  if (!roomId) {
    throw new Error('Room ID is required');
  }
  return roomId;
}
