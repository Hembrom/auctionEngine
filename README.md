# Football Auction

Real-time, multi-device web app for conducting an internal company football player auction. Captains join from their phones or laptops, the admin runs the auction from a control panel, and every screen stays in sync via Firebase.

## Tech Stack

- **Frontend:** React + TypeScript (Vite)
- **Database / Real-time sync:** Firebase Firestore
- **Deployment:** Vercel

## Quick Start

### 1. Firebase Setup

1. Create a project at [Firebase Console](https://console.firebase.google.com)
2. Enable **Firestore Database** (start in test mode for development)
3. Register a **Web app** and copy the config values
4. Deploy security rules and indexes:

```bash
firebase deploy --only firestore
```

Firestore needs a composite index on `bids` (`playerId` + `timestamp`). The Firebase console will prompt you with a link on first use, or deploy `firestore.indexes.json` via the CLI above.

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in your Firebase config:

```bash
cp .env.example .env.local
```

For Vercel, add the same `VITE_FIREBASE_*` variables in **Project Settings → Environment Variables**.

### 3. Run Locally

```bash
npm install
npm run dev
```

- **Captains:** open `http://localhost:5173`
- **Admin:** open `http://localhost:5173/admin`

### 4. Deploy to Vercel

```bash
npm run build
```

Connect the repo to Vercel, or:

```bash
npx vercel
```

`vercel.json` includes SPA rewrites so client-side routing works.

## Usage Flow

1. **Admin** opens `/` → **Create Room** (e.g. "Friday Night Auction") → lands on `/room/friday-night-auction/admin`
2. **Admin** copies the captain link from the admin panel and shares it
3. **Captains** open `/room/friday-night-auction` (or join via home page) → enter name → wait for approval
4. **Admin** approves captains, uploads players, opens lobby, starts auction
5. All devices in the same room stay in sync; **other rooms are fully isolated**

### Room URLs

| Who | URL |
|-----|-----|
| Home (create/join) | `/` |
| Captain join | `/room/{room-id}` |
| Captain waiting | `/room/{room-id}/waiting` |
| Live auction | `/room/{room-id}/auction` |
| Admin panel | `/room/{room-id}/admin` |

Room IDs are auto-generated from the name: `Friday Night Auction` → `friday-night-auction`

Each room has its own captains, players, bids, and auction state in Firestore under `rooms/{roomId}/`.

## CSV Format

```csv
Name,Position,Last Match Rating,Fitness,Leadership,Team Influence
John Smith,GK,4,5,3,4
Mike Jones,DEF/MID,3,4,4,3
```

## Squad Rules

| Rule | Detail |
|------|--------|
| Squad size | 7 players |
| Goalkeeper | Exactly 1 GK required |
| Outfield | Remaining 6 slots — any mix of DEF, MID, or ST |

- Starting budget: ₹1000 per captain
- Available budget = Remaining budget − (remaining players × ₹10)
- Auction order: GK → ST → DEF → MID (random within each group)

## Admin Controls

| Control        | Description                          |
|----------------|--------------------------------------|
| Pause / Resume | Freeze timer and bidding             |
| Skip Player    | Mark unsold and advance              |
| Mark Unsold    | Same as skip                         |
| Move Player    | Reassign between teams               |
| Add Captain    | Mid-auction join                     |
| Adjust Budget  | Manual budget correction             |
| Reset          | Clear entire auction                 |

## Project Structure

```
src/
├── components/     # UI components (PlayerCard, BidFeed, etc.)
├── hooks/          # Firebase subscriptions, auction engine
├── lib/            # Auction logic and Firestore service
├── pages/          # Route screens
└── types/          # TypeScript types and constants
```

## Notes

- The **admin device** runs the auction timer engine (finalize on timeout, advance after result). Keep the admin tab open during the auction.
- Bids use Firestore transactions — first received wins on ties.
- No password auth; captains are approved by name in the waiting room.
