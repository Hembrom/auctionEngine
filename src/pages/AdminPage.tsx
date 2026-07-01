import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { PlayerCard } from '../components/PlayerCard';
import { CaptainDashboard } from '../components/CaptainDashboard';
import { BidFeed } from '../components/BidFeed';
import { ShareRoomLinks } from '../components/ShareRoomLinks';
import { FirebaseBanner, FirebaseErrorBanner } from '../components/FirebaseBanner';
import { useAuctionData } from '../hooks/useAuctionData';
import { useAuctionEngine, useCountdown } from '../hooks/useAuctionEngine';
import { useRoomId } from '../hooks/useRoom';
import { getAdminId } from '../hooks/useSession';
import {
  approveCaptain,
  rejectCaptain,
  addPlayer,
  addPlayersBatch,
  deletePlayer,
  moveToLobby,
  startAuction,
  pauseAuction,
  resumeAuction,
  getRoom,
  skipPlayer,
  markUnsold,
  movePlayer,
  adjustBudget,
  addCaptainMidAuction,
  resetRoom,
} from '../lib/auctionService';
import { parseCsvPlayers, validatePlayerPositions } from '../lib/auctionLogic';
import { isAuctionPaused } from '../lib/auctionState';
import type { PlayerFormData, Position } from '../types';
import { STARTING_BUDGET } from '../types';

const ALL_POSITIONS: Position[] = ['GK', 'DEF', 'MID', 'ST'];

export function AdminPage() {
  const roomId = useRoomId();
  const { state, captains, players, loading, firebaseError } = useAuctionData(roomId);
  const navigate = useNavigate();
  const [startingBudget, setStartingBudget] = useState(STARTING_BUDGET);
  const [csvError, setCsvError] = useState('');
  const [newCaptainName, setNewCaptainName] = useState('');
  const [movePlayerId, setMovePlayerId] = useState('');
  const [moveFrom, setMoveFrom] = useState('');
  const [moveTo, setMoveTo] = useState('');
  const [budgetCaptain, setBudgetCaptain] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [pauseError, setPauseError] = useState('');
  const [pauseBusy, setPauseBusy] = useState(false);

  const [form, setForm] = useState<PlayerFormData>({
    name: '',
    positions: ['MID'],
    lastMatchRating: 3,
    fitness: 3,
    leadership: 3,
    teamInfluence: 3,
  });

  const adminId = getAdminId(roomId);
  const isOwner = !!adminId && state.adminId === adminId;
  const pending = captains.filter((c) => c.status === 'pending');
  const approved = captains.filter((c) => c.status === 'approved');
  const currentPlayer = players.find((p) => p.id === state.currentPlayerId);
  const isPaused = isAuctionPaused(state);
  const countdown = useCountdown(state.bidDeadline, isPaused, state.pausedRemainingMs);

  useAuctionEngine(roomId, state, players, captains);

  useEffect(() => {
    if (state.phase === 'ended') {
      navigate(`/room/${roomId}/final`);
    }
  }, [state.phase, navigate, roomId]);

  const handlePauseToggle = async () => {
    if (pauseBusy) return;
    setPauseBusy(true);
    setPauseError('');
    try {
      const room = await getRoom(roomId);
      if (!room) throw new Error('Room not found');

      if (isAuctionPaused(room)) {
        await resumeAuction(roomId);
      } else {
        await pauseAuction(roomId);
      }
    } catch (e) {
      setPauseError((e as Error).message);
    } finally {
      setPauseBusy(false);
    }
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const { players: parsed, errors } = parseCsvPlayers(text);
    if (errors.length) {
      setCsvError(errors.join('; '));
      return;
    }
    await addPlayersBatch(roomId, parsed);
    setCsvError('');
    e.target.value = '';
  };

  const handleAddPlayer = async () => {
    const err = validatePlayerPositions(form.positions);
    if (err || !form.name.trim()) return;
    await addPlayer(roomId, { ...form, name: form.name.trim() });
    setForm({ ...form, name: '' });
  };

  const togglePosition = (pos: Position) => {
    if (pos === 'GK') {
      setForm({ ...form, positions: ['GK'] });
      return;
    }
    const withoutGk = form.positions.filter((p) => p !== 'GK');
    const has = withoutGk.includes(pos);
    const next = has ? withoutGk.filter((p) => p !== pos) : [...withoutGk, pos];
    setForm({ ...form, positions: next.length ? next : ['MID'] });
  };

  if (!isOwner) {
    return (
      <Layout title="Admin Access Denied" badge={roomId}>
        <div className="card center-card">
          <p className="error">
            You are not the admin of this room. Only the admin who created{' '}
            <strong>{state.displayName || roomId}</strong> can control it.
          </p>
          <p className="muted">
            <a href="/">Create your own room</a>
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title="Admin Panel"
      subtitle={state.displayName || roomId}
      badge={state.phase}
    >
      <FirebaseBanner />
      <FirebaseErrorBanner error={firebaseError} />

      {!loading && !firebaseError && (
        <p className="connection-status">
          Room <strong>{roomId}</strong> · {captains.length} captain(s) · {pending.length} pending
        </p>
      )}

      <ShareRoomLinks roomId={roomId} />

      <div className="admin-grid">
        <section className="card">
          <h3>Waiting Room</h3>
          {pending.length === 0 ? (
            <p className="muted">No pending captains</p>
          ) : (
            <ul className="action-list">
              {pending.map((c) => (
                <li key={c.id}>
                  <span>{c.name}</span>
                  <div className="btn-group">
                    <button
                      className="btn-success"
                      onClick={() => approveCaptain(roomId, c.id, startingBudget)}
                    >
                      Approve
                    </button>
                    <button className="btn-danger" onClick={() => rejectCaptain(roomId, c.id)}>
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h3>Configuration</h3>
          <div className="form-row">
            <label>Starting Budget (₹)</label>
            <input
              type="number"
              value={startingBudget}
              onChange={(e) => setStartingBudget(Number(e.target.value))}
            />
          </div>
          {state.phase === 'waiting' && approved.length > 0 && (
            <button onClick={() => moveToLobby(roomId, startingBudget)}>Open Lobby</button>
          )}
        </section>

        {(state.phase === 'waiting' || state.phase === 'lobby') && (
          <section className="card admin-wide">
            <h3>Player Setup ({players.length} players)</h3>
            <div className="grid-2">
              <div>
                <h4>Upload CSV</h4>
                <p className="muted">
                  Columns: Name, Position, Last Match Rating, Fitness, Leadership, Team Influence
                </p>
                <input type="file" accept=".csv" onChange={handleCsvUpload} />
                {csvError && <p className="error">{csvError}</p>}
              </div>
              <div>
                <h4>Add Manually</h4>
                <input
                  placeholder="Player name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <div className="position-picker">
                  {ALL_POSITIONS.map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      className={form.positions.includes(pos) ? 'active' : ''}
                      onClick={() => togglePosition(pos)}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
                <div className="ratings-input">
                  {(['lastMatchRating', 'fitness', 'leadership', 'teamInfluence'] as const).map(
                    (field) => (
                      <label key={field}>
                        {field.replace(/([A-Z])/g, ' $1')}
                        <input
                          type="number"
                          min={1}
                          max={5}
                          value={form[field]}
                          onChange={(e) => setForm({ ...form, [field]: Number(e.target.value) })}
                        />
                      </label>
                    ),
                  )}
                </div>
                <button onClick={handleAddPlayer}>Add Player</button>
              </div>
            </div>
            {players.length > 0 && (
              <ul className="player-list">
                {players.map((p) => (
                  <li key={p.id}>
                    {p.name} ({p.positions.join('/')})
                    <button
                      className="btn-small btn-danger"
                      onClick={() => deletePlayer(roomId, p.id)}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {state.phase === 'lobby' && (
          <section className="card admin-wide">
            <h3>Lobby — {approved.length} Captains Ready</h3>
            <ul className="captain-list">
              {approved.map((c) => (
                <li key={c.id}>
                  <strong>{c.teamName}</strong> ({c.name}) — ₹{c.budget}
                </li>
              ))}
            </ul>
            <button
              className="btn-primary btn-lg"
              disabled={players.length === 0 || approved.length === 0}
              onClick={() => startAuction(roomId, players)}
            >
              Start Auction
            </button>
            {players.length === 0 && <p className="error">Add players before starting</p>}
          </section>
        )}

        {['live', 'result', 'unsold'].includes(state.phase) && (
          <section className="card admin-wide">
            <h3>Live Controls</h3>
            <div className="admin-controls">
              <button type="button" onClick={handlePauseToggle} disabled={pauseBusy}>
                {pauseBusy ? '…' : isPaused ? '▶️ Resume' : '⏸️ Pause'}
              </button>
              <button onClick={() => skipPlayer(roomId, state)}>⏭️ Skip Player</button>
              <button onClick={() => markUnsold(roomId, state)}>❌ Mark Unsold</button>
              <a href={`/room/${roomId}/admin/auction`} className="btn-link">
                👁️ View Live Auction
              </a>
            </div>
            {pauseError && <p className="error">{pauseError}</p>}
            {currentPlayer && (
              <p>
                Current: <strong>{currentPlayer.name}</strong> · Timer: {countdown}s · Bid: ₹
                {state.currentBid?.amount ?? 10}
              </p>
            )}
          </section>
        )}

        {['live', 'result', 'unsold'].includes(state.phase) && (
          <>
            <section className="card">
              <h3>Add Captain</h3>
              <div className="form-row">
                <input
                  placeholder="Captain name"
                  value={newCaptainName}
                  onChange={(e) => setNewCaptainName(e.target.value)}
                />
                <button
                  onClick={async () => {
                    if (!newCaptainName.trim()) return;
                    await addCaptainMidAuction(roomId, newCaptainName.trim(), state.startingBudget);
                    setNewCaptainName('');
                  }}
                >
                  Add
                </button>
              </div>
            </section>

            <section className="card">
              <h3>Adjust Budget</h3>
              <select value={budgetCaptain} onChange={(e) => setBudgetCaptain(e.target.value)}>
                <option value="">Select captain</option>
                {approved.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.teamName}
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="New budget"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
              />
              <button
                onClick={async () => {
                  if (!budgetCaptain || !budgetAmount) return;
                  await adjustBudget(roomId, budgetCaptain, Number(budgetAmount));
                  setBudgetAmount('');
                }}
              >
                Update
              </button>
            </section>

            <section className="card admin-wide">
              <h3>Move Player</h3>
              <div className="form-row">
                <select value={moveFrom} onChange={(e) => setMoveFrom(e.target.value)}>
                  <option value="">From team</option>
                  {approved.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.teamName}
                    </option>
                  ))}
                </select>
                <select value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
                  <option value="">To team</option>
                  {approved.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.teamName}
                    </option>
                  ))}
                </select>
                <select value={movePlayerId} onChange={(e) => setMovePlayerId(e.target.value)}>
                  <option value="">Player</option>
                  {approved
                    .find((c) => c.id === moveFrom)
                    ?.squad.map((p) => (
                      <option key={p.playerId} value={p.playerId}>
                        {p.name}
                      </option>
                    ))}
                </select>
                <button
                  onClick={async () => {
                    if (!movePlayerId || !moveFrom || !moveTo) return;
                    await movePlayer(roomId, movePlayerId, moveFrom, moveTo, captains);
                    setMovePlayerId('');
                  }}
                >
                  Move
                </button>
              </div>
            </section>

            <section className="card admin-wide">
              <h3>View All Teams</h3>
              <CaptainDashboard captains={captains} />
            </section>
          </>
        )}

        <section className="card">
          <h3>Danger Zone</h3>
          <button className="btn-danger" onClick={() => resetRoom(roomId)}>
            Reset This Room
          </button>
        </section>
      </div>
    </Layout>
  );
}

export function AdminAuctionPage() {
  const roomId = useRoomId();
  const { state, captains, players, bids } = useAuctionData(roomId);
  const currentPlayer = players.find((p) => p.id === state.currentPlayerId);
  const isPaused = isAuctionPaused(state);
  const countdown = useCountdown(state.bidDeadline, isPaused, state.pausedRemainingMs);

  return (
    <Layout
      title="Live Auction"
      subtitle={state.displayName || 'Admin View'}
      badge={isPaused ? 'PAUSED' : roomId}
    >
      {state.phase === 'result' && state.resultDisplay && (
        <div className="result-banner">
          <h2>{state.resultDisplay.message}</h2>
        </div>
      )}

      {currentPlayer && (
        <>
          <PlayerCard player={currentPlayer} large />
          <div className="bid-status">
            <div className="bid-amount">
              <span className="label">Current Bid</span>
              <span className="value">₹{state.currentBid?.amount ?? 10}</span>
            </div>
            <div className="bid-leader">
              <span className="label">Highest Bidder</span>
              <span className="value">{state.currentBid?.captainName ?? '—'}</span>
            </div>
            <div className={`timer ${countdown <= 5 ? 'timer-urgent' : ''}`}>
              <span className="label">Timer</span>
              <span className="value">{state.phase === 'live' ? `${countdown}s` : '—'}</span>
            </div>
          </div>
          <BidFeed bids={bids} />
        </>
      )}

      <CaptainDashboard captains={captains} />
      <p className="muted">
        <a href={`/room/${roomId}/admin`}>← Back to admin controls</a>
      </p>
    </Layout>
  );
}
