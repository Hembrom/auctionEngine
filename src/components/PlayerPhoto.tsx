import type { Player } from '../types';

interface PlayerPhotoProps {
  player: Player;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClass = { sm: 'player-photo-sm', md: 'player-photo-md', lg: 'player-photo-lg' };

export function PlayerPhoto({ player, className = '', size = 'md' }: PlayerPhotoProps) {
  if (!player.imageUrl) return null;

  return (
    <div className={`player-photo-wrap ${sizeClass[size]} ${className}`.trim()}>
      <img src={player.imageUrl} alt="" className="player-photo" loading="lazy" />
    </div>
  );
}
