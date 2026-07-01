export function isFirebaseConfigured(): boolean {
  const required = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
  ] as const;

  return required.every((key) => {
    const value = import.meta.env[key];
    return typeof value === 'string' && value.length > 0 && !value.includes('your_');
  });
}

export function getFirebaseConfigError(): string | null {
  if (isFirebaseConfigured()) return null;

  return (
    'Firebase is not configured. Copy .env.example to .env.local, add your Firebase web app credentials, then restart the dev server (npm run dev).'
  );
}
