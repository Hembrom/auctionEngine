import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { CollapsibleSection } from '../components/CollapsibleSection';
import { AuctionDashboardSections } from '../components/AuctionDashboardSections';
import { AdminPlayerManagement } from '../components/AdminPlayerManagement';
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
  resetRoom,
  restartUnsoldRound,
  endAuction,
  updateTimerSettings,
} from '../lib/auctionService';
import { parseCsvPlayers, validatePlayerPositions, getUnsoldPlayers, areAllSquadsFull } from '../lib/auctionLogic';
import { isAuctionPaused, getBidTimerSeconds, getResultTimerSeconds } from '../lib/auctionState';
import type { PlayerFormData, Position } from '../types';
import { STARTING_BUDGET, TIMER_SECONDS, RESULT_SECONDS } from '../types';

const ALL_POSITIONS: Position[] = ['GK', 'DEF', 'MID', 'ST'];

export function AdminPage() {
  const roomId = useRoomId();
  const { state, captains, players, bids, loading, firebaseError } = useAuctionData(roomId);
  const navigate = useNavigate();
  const [startingBudget, setStartingBudget] = useState(STARTING_BUDGET);
  const [bidTimerSeconds, setBidTimerSeconds] = useState(TIMER_SECONDS);
  const [resultTimerSeconds, setResultTimerSeconds] = useState(RESULT_SECONDS);
  const [timerSaveError, setTimerSaveError] = useState('');
  const [timerSaveBusy, setTimerSaveBusy] = useState(false);
  const [csvError, setCsvError] = useState('');
  const [newCaptainName, setNewCaptainName] = useState('');
  const [movePlayerId, setMovePlayerId] = useState('');
  const [moveFrom, setMoveFrom] = useState('');
  const [moveTo, setMoveTo] = useState('');
  const [budgetCaptain, setBudgetCaptain] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [pauseError, setPauseError] = useState('');
  const [pauseBusy, setPauseBusy] = useState(false);
  const [unsoldActionError, setUnsoldActionError] = useState('');
  const [unsoldActionBusy, setUnsoldActionBusy] = useState(false);

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
  const unsoldPlayers = getUnsoldPlayers(players);
  const allSquadsFull = areAllSquadsFull(captains);
  const currentPlayer = players.find((p) => p.id === state.currentPlayerId);
  const isPaused = isAuctionPaused(state);
  const countdown = useCountdown(state.bidDeadline, isPaused, state.pausedRemainingMs);
  const isLivePhase = ['live', 'result', 'unsold'].includes(state.phase);
  const isSetupPhase = ['waiting', 'lobby', 'setup'].includes(state.phase);

  useAuctionEngine(roomId, state, players, captains);

  useEffect(() => {
    if (state.phase === 'ended') {
      navigate(`/room/${roomId}/final`);
    }
  }, [state.phase, navigate, roomId]);

  useEffect(() => {
    setBidTimerSeconds(getBidTimerSeconds(state));
    setResultTimerSeconds(getResultTimerSeconds(state));
  }, [state.bidTimerSeconds, state.resultTimerSeconds]);

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

  const handleRestartUnsold = async () => {
    if (unsoldActionBusy) return;
    setUnsoldActionBusy(true);
    setUnsoldActionError('');
    try {
      await restartUnsoldRound(roomId, players);
    } catch (e) {
      setUnsoldActionError((e as Error).message);
    } finally {
      setUnsoldActionBusy(false);
    }
  };

  const handleEndAuction = async () => {
    if (unsoldActionBusy) return;
    setUnsoldActionBusy(true);
    setUnsoldActionError('');
    try {
      await endAuction(roomId);
    } catch (e) {
      setUnsoldActionError((e as Error).message);
    } finally {
      setUnsoldActionBusy(false);
    }
  };

  const handleSaveTimers = async () => {
    if (timerSaveBusy) return;
    setTimerSaveBusy(true);
    setTimerSaveError('');
    try {
      await updateTimerSettings(roomId, bidTimerSeconds, resultTimerSeconds);
    } catch (e) {
      setTimerSaveError((e as Error).message);
    } finally {
      setTimerSaveBusy(false);
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

  const adminLiveControls = isLivePhase ? (
    <div className="admin-live-controls card">
      {['live', 'result'].includes(state.phase) && (
        <>
          <div className="admin-controls">
            <button type="button" onClick={handlePauseToggle} disabled={pauseBusy}>
              {pauseBusy ? '…' : isPaused ? '▶️ Resume' : '⏸️ Pause'}
            </button>
            <button type="button" onClick={() => skipPlayer(roomId, state)}>
              ⏭️ Skip Player
            </button>
            <button type="button" onClick={() => markUnsold(roomId, state)}>
              ❌ Mark Unsold
            </button>
          </div>
          {pauseError && <p className="error">{pauseError}</p>}
          {currentPlayer && (
            <p className="muted admin-live-meta">
              Current: <strong>{currentPlayer.name}</strong> · Timer: {countdown}s · Bid: ₹
              {state.currentBid?.amount ?? 10}
            </p>
          )}
        </>
      )}
      {state.phase === 'unsold' && (
        <>
          <div className="admin-controls">
            <button
              type="button"
              className="btn-primary"
              onClick={handleRestartUnsold}
              disabled={unsoldActionBusy || unsoldPlayers.length === 0 || allSquadsFull}
            >
              {unsoldActionBusy ? '…' : '🔁 Redo Unsold Round'}
            </button>
            <button type="button" onClick={handleEndAuction} disabled={unsoldActionBusy}>
              ✅ Finish Auction
            </button>
          </div>
          {unsoldActionError && <p className="error">{unsoldActionError}</p>}
        </>
      )}
    </div>
  ) : null;

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

      <AuctionDashboardSections
        roomId={roomId}
        state={state}
        players={players}
        bids={bids}
        captains={captains}
        adminLiveControls={adminLiveControls}
        playerManagement={
          <AdminPlayerManagement
            roomId={roomId}
            captains={captains}
            startingBudget={state.startingBudget || startingBudget}
            newCaptainName={newCaptainName}
            onNewCaptainNameChange={setNewCaptainName}
            budgetCaptain={budgetCaptain}
            onBudgetCaptainChange={setBudgetCaptain}
            budgetAmount={budgetAmount}
            onBudgetAmountChange={setBudgetAmount}
            moveFrom={moveFrom}
            onMoveFromChange={setMoveFrom}
            moveTo={moveTo}
            onMoveToChange={setMoveTo}
            movePlayerId={movePlayerId}
            onMovePlayerIdChange={setMovePlayerId}
            onCaptainAdded={() => setNewCaptainName('')}
            onBudgetUpdated={() => setBudgetAmount('')}
            onPlayerMoved={() => setMovePlayerId('')}
          />
        }
      />

      <CollapsibleSection title="Room Setup" defaultOpen={isSetupPhase}>
        <div className="admin-grid">
          <section className="card">
            <h3>Waiting Room</h3>
            {pending.length === 0 ? (
              <p className="muted">No pending captains</p>
            ) : (
              <ul className="action-list">
                {pending.map((c) => (
                  <li key={c.id}>
                    <span>
                      {c.name} · <strong>{c.teamName}</strong>
                    </span>
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
            <div className="form-row">
              <label>Bid time per player (seconds)</label>
              <input
                type="number"
                min={5}
                value={bidTimerSeconds}
                disabled={!['waiting', 'lobby'].includes(state.phase)}
                onChange={(e) => setBidTimerSeconds(Number(e.target.value))}
              />
              <p className="muted config-hint">
                How long captains have to bid. Default: {TIMER_SECONDS}s
              </p>
            </div>
            <div className="form-row">
              <label>Result display time (seconds)</label>
              <input
                type="number"
                min={3}
                value={resultTimerSeconds}
                disabled={!['waiting', 'lobby'].includes(state.phase)}
                onChange={(e) => setResultTimerSeconds(Number(e.target.value))}
              />
              <p className="muted config-hint">
                How long sold/unsold info is shown before the next player. Default: {RESULT_SECONDS}s
              </p>
            </div>
            {['waiting', 'lobby'].includes(state.phase) && (
              <div className="config-actions">
                <button type="button" onClick={handleSaveTimers} disabled={timerSaveBusy}>
                  {timerSaveBusy ? 'Saving…' : 'Save Timer Settings'}
                </button>
                {state.phase === 'waiting' && approved.length > 0 && (
                  <button type="button" onClick={() => moveToLobby(roomId, startingBudget)}>
                    Open Lobby
                  </button>
                )}
              </div>
            )}
            {timerSaveError && <p className="error">{timerSaveError}</p>}
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
                  <button type="button" onClick={handleAddPlayer}>
                    Add Player
                  </button>
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

          <section className="card">
            <h3>Danger Zone</h3>
            <button className="btn-danger" onClick={() => resetRoom(roomId)}>
              Reset This Room
            </button>
          </section>
        </div>
      </CollapsibleSection>
    </Layout>
  );
}

export function AdminAuctionPage() {
  const roomId = useRoomId();
  const navigate = useNavigate();

  useEffect(() => {
    navigate(`/room/${roomId}/admin`, { replace: true });
  }, [roomId, navigate]);

  return null;
}
