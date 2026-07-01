import { isFirebaseConfigured } from '../lib/firebaseConfig';

export function FirebaseBanner() {
  if (isFirebaseConfigured()) return null;

  return (
    <div className="firebase-banner">
      <strong>Firebase not connected</strong>
      <p>
        Create <code>.env.local</code> from <code>.env.example</code>, paste your Firebase web app
        config, then restart: <code>npm run dev</code>
      </p>
    </div>
  );
}

export function FirebaseErrorBanner({ error }: { error: string | null }) {
  if (!error) return null;

  return (
    <div className="firebase-banner firebase-banner-error">
      <strong>Firebase error</strong>
      <p>{error}</p>
      <p className="muted">
        Check: Firestore is enabled in Firebase Console → Build → Firestore Database. For local dev,
        use test mode rules or deploy <code>firestore.rules</code>.
      </p>
    </div>
  );
}
