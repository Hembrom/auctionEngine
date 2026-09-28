/** Gender-neutral player silhouette (no photo uploaded). */
export function PlayerAvatarPlaceholder() {
  return (
    <svg
      className="player-avatar-placeholder-svg"
      viewBox="0 0 64 80"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      focusable="false"
    >
      <ellipse cx="32" cy="18" rx="14" ry="14" fill="currentColor" opacity="0.35" />
      <path
        d="M12 72c2-14 12-22 20-22s18 8 20 22H12z"
        fill="currentColor"
        opacity="0.25"
      />
      <path
        d="M22 48c0-6 4.5-10 10-10s10 4 10 10v6H22v-6z"
        fill="currentColor"
        opacity="0.3"
      />
    </svg>
  );
}
