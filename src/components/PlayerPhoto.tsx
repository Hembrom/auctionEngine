import type { Player } from '../types';
import { PlayerAvatarPlaceholder } from './PlayerAvatarPlaceholder';

interface PlayerPhotoProps {
  player: Player;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showPlaceholder?: boolean;
}

const sizeClass = { sm: 'player-photo-sm', md: 'player-photo-md', lg: 'player-photo-lg' };

export function PlayerPhoto({
  player,
  className = '',
  size = 'md',
  showPlaceholder = false,
}: PlayerPhotoProps) {
  const wrapClass = `player-photo-wrap ${sizeClass[size]} ${className}`.trim();

  if (!player.imageUrl) {
    if (!showPlaceholder) return null;
    return (
      <div className={wrapClass}>
        <div className="player-photo player-photo-empty" aria-label="No photo">
          <PlayerAvatarPlaceholder />
        </div>
      </div>
    );
  }

  return (
    <div className={wrapClass}>
      <img src={player.imageUrl} alt="" className="player-photo" loading="lazy" />
    </div>
  );
}
