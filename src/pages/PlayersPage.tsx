import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { BrowsePlayerCard } from '../components/BrowsePlayerCard';
import { FirebaseBanner, FirebaseErrorBanner } from '../components/FirebaseBanner';
import { useAuctionData } from '../hooks/useAuctionData';
import { useRoomId } from '../hooks/useRoom';
import { getCaptainId, isSpectator } from '../hooks/useSession';
import {
  toggleCaptainShortlist,
  setCaptainPlayerTags,
} from '../lib/auctionService';
import {
  getOverallRating,
  PLAYER_MARKS,
  PLAYER_MARK_LABELS,
  togglePlayerMarkTags,
} from '../lib/playerUtils';
import type { PlayerMark, Position } from '../types';
import { POSITION_ORDER } from '../types';

const ALL_POSITIONS: Position[] = ['GK', 'DEF', 'MID', 'ST'];

type StatusFilter = 'all' | 'available' | 'sold' | 'unsold';
type SortKey = 'name' | 'overall' | 'position';

export function PlayersPage() {
  const roomId = useRoomId();
  const { state, captains, players, loading, firebaseError } = useAuctionData(roomId);
  const captainId = getCaptainId(roomId);
  const spectating = isSpectator(roomId);
  const me = captains.find((c) => c.id === captainId);
  const canShortlist = !!me && me.status === 'approved';

  const [query, setQuery] = useState('');
  const [position, setPosition] = useState<Position | 'all'>('all');
  const [minOverall, setMinOverall] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [markFilter, setMarkFilter] = useState<PlayerMark | 'all'>('all');
  const [shortlistOnly, setShortlistOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('overall');
  const [busyPlayerId, setBusyPlayerId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const shortlist = me?.shortlist ?? [];
  const playerNotes = me?.playerNotes ?? {};

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = [...players];

    if (q) {
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    if (position !== 'all') {
      list = list.filter((p) => p.positions.includes(position));
    }
    if (minOverall > 0) {
      list = list.filter((p) => getOverallRating(p) >= minOverall);
    }
    if (statusFilter !== 'all') {
      list = list.filter((p) => p.status === statusFilter);
    }
    if (canShortlist && shortlistOnly) {
      list = list.filter((p) => shortlist.includes(p.id));
    }
    if (canShortlist && markFilter !== 'all') {
      list = list.filter((p) => (playerNotes[p.id]?.tags ?? []).includes(markFilter));
    }

    list.sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name);
      if (sortKey === 'overall') return getOverallRating(b) - getOverallRating(a);
      const aPos = POSITION_ORDER.indexOf(a.positions[0]);
      const bPos = POSITION_ORDER.indexOf(b.positions[0]);
      return aPos - bPos || a.name.localeCompare(b.name);
    });

    return list;
  }, [
    players,
    query,
    position,
    minOverall,
    statusFilter,
    shortlistOnly,
    markFilter,
    sortKey,
    canShortlist,
    shortlist,
    playerNotes,
  ]);

  const handleToggleShortlist = async (playerId: string) => {
    if (!me || !canShortlist) return;
    setBusyPlayerId(playerId);
    setError('');
    try {
      await toggleCaptainShortlist(roomId, me.id, playerId, me);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyPlayerId(null);
    }
  };

  const handleToggleMark = async (playerId: string, mark: PlayerMark) => {
    if (!me || !canShortlist) return;
    const current = playerNotes[playerId]?.tags ?? [];
    const next = togglePlayerMarkTags(current, mark);
    setBusyPlayerId(playerId);
    setError('');
    try {
      await setCaptainPlayerTags(
        roomId,
        me.id,
        playerId,
        next,
        me,
        next.length > 0 && !shortlist.includes(playerId),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyPlayerId(null);
    }
  };

  return (
    <Layout
      title="Players"
      subtitle={state.displayName || roomId}
      badge={`${filtered.length}/${players.length}`}
      captainName={me ? `${me.name} (${me.teamName})` : undefined}
      theme={canShortlist ? 'captain' : spectating ? 'spectator' : undefined}
    >
      <FirebaseBanner />
      <FirebaseErrorBanner error={firebaseError} />

      <div className="players-nav">
        {spectating ? (
          <Link to={`/room/${roomId}/spectate`} className="btn-link">
            ← Spectator
          </Link>
        ) : (
          <Link to={`/room/${roomId}/lobby`} className="btn-link">
            ← Lobby
          </Link>
        )}
        {(state.phase === 'live' || state.phase === 'result' || state.phase === 'unsold') && (
          <Link
            to={spectating ? `/room/${roomId}/spectate` : `/room/${roomId}/auction`}
            className="btn-link"
          >
            Live Auction
          </Link>
        )}
      </div>

      {!loading && (
        <p className="muted players-hint">
          {canShortlist
            ? 'Your shortlist and marks are private to you. Marking a player also adds them to your shortlist.'
            : spectating
              ? 'Same player ratings as captains — watch only (no shortlist or marks).'
              : me?.status === 'pending'
                ? 'Waiting for admin approval — you can browse ratings now; shortlisting unlocks after approval.'
                : 'Browse player ratings. Join as an approved captain to shortlist and mark players.'}
        </p>
      )}

      <section className="card admin-wide players-filters">
        <div className="players-filter-grid">
          <div className="form-row">
            <label htmlFor="player-search">Search name</label>
            <input
              id="player-search"
              placeholder="e.g. Arjun"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="form-row">
            <label htmlFor="player-pos">Position</label>
            <select
              id="player-pos"
              value={position}
              onChange={(e) => setPosition(e.target.value as Position | 'all')}
            >
              <option value="all">All positions</option>
              {ALL_POSITIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label htmlFor="player-min">Min overall rating</label>
            <input
              id="player-min"
              type="number"
              min={0}
              max={10}
              step={0.5}
              value={minOverall || ''}
              placeholder="0"
              onChange={(e) => setMinOverall(Number(e.target.value) || 0)}
            />
          </div>
          <div className="form-row">
            <label htmlFor="player-status">Status</label>
            <select
              id="player-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            >
              <option value="all">All</option>
              <option value="available">Available</option>
              <option value="sold">Sold</option>
              <option value="unsold">Unsold</option>
            </select>
          </div>
          <div className="form-row">
            <label htmlFor="player-sort">Sort by</label>
            <select
              id="player-sort"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
            >
              <option value="overall">Overall rating</option>
              <option value="name">Name</option>
              <option value="position">Position</option>
            </select>
          </div>
          {canShortlist && (
            <>
              <div className="form-row">
                <label htmlFor="player-mark">My marks</label>
                <select
                  id="player-mark"
                  value={markFilter}
                  onChange={(e) => setMarkFilter(e.target.value as PlayerMark | 'all')}
                >
                  <option value="all">Any mark</option>
                  {PLAYER_MARKS.map((m) => (
                    <option key={m} value={m}>
                      {PLAYER_MARK_LABELS[m]}
                    </option>
                  ))}
                </select>
              </div>
              <label className="players-check">
                <input
                  type="checkbox"
                  checked={shortlistOnly}
                  onChange={(e) => setShortlistOnly(e.target.checked)}
                />
                Shortlisted only ({shortlist.length})
              </label>
            </>
          )}
        </div>
      </section>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <div className="card center-card">
          <p>Loading players…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card center-card">
          <p className="muted">No players match these filters.</p>
        </div>
      ) : (
        <div className="players-browse-grid">
          {filtered.map((player) => (
            <BrowsePlayerCard
              key={player.id}
              player={player}
              canShortlist={canShortlist}
              shortlisted={shortlist.includes(player.id)}
              tags={playerNotes[player.id]?.tags ?? []}
              busy={busyPlayerId === player.id}
              onToggleShortlist={() => handleToggleShortlist(player.id)}
              onToggleMark={(mark) => handleToggleMark(player.id, mark)}
            />
          ))}
        </div>
      )}
    </Layout>
  );
}
