import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { CollapsibleSection } from '../components/CollapsibleSection';
import { AuctionDashboardSections } from '../components/AuctionDashboardSections';
import { AdminLobbySection } from '../components/AdminLobbySection';
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
import { PlayerRegistrationForm } from '../components/PlayerRegistrationForm';
import { parseCsvPlayers, validatePlayerPositions, getUnsoldPlayers, areAllSquadsFull } from '../lib/auctionLogic';
import { createDefaultPlayerForm, sanitizePlayerForm } from '../lib/playerUtils';
import { isAuctionPaused, getBidTimerSeconds, getResultTimerSeconds } from '../lib/auctionState';
import { STARTING_BUDGET, TIMER_SECONDS, RESULT_SECONDS } from '../types';

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
  const [openLobbyBusy, setOpenLobbyBusy] = useState(false);

  const [form, setForm] = useState(createDefaultPlayerForm);

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
    const data = sanitizePlayerForm(form);
    if (!data.name) return;
    const posError = validatePlayerPositions(data.positions);
    if (posError) return;
    await addPlayer(roomId, data);
    setForm(createDefaultPlayerForm());
  };

  const handleOpenLobby = async () => {
    if (openLobbyBusy) return;
    setOpenLobbyBusy(true);
    try {
      await moveToLobby(roomId, startingBudget);
    } finally {
      setOpenLobbyBusy(false);
    }
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
      theme="admin"
    >
      <FirebaseBanner />
      <FirebaseErrorBanner error={firebaseError} />

      {!loading && !firebaseError && (
        <p className="connection-status">
          Room <strong>{roomId}</strong> · {captains.length} captain(s) · {pending.length} pending
        </p>
      )}

      <ShareRoomLinks roomId={roomId} />

      <p className="players-nav">
        <Link to={`/room/${roomId}/players`} className="btn-link">
          Browse Players (ratings / available / sold)
        </Link>
      </p>

      <AuctionDashboardSections
        roomId={roomId}
        state={state}
        players={players}
        bids={bids}
        captains={captains}
        showPlayerPipeline
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

      <AdminLobbySection
        phase={state.phase}
        players={players}
        approved={approved}
        onOpenLobby={handleOpenLobby}
        onStartAuction={() => startAuction(roomId, players)}
        openLobbyBusy={openLobbyBusy}
      />

      <CollapsibleSection title="Room Setup" defaultOpen={false}>
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
              </div>
            )}
            {timerSaveError && <p className="error">{timerSaveError}</p>}
          </section>

          {(state.phase === 'waiting' || state.phase === 'lobby') && (
            <section className="card admin-wide">
              <h3>Player Registration ({players.length} players)</h3>
              <div className="grid-2 registration-setup-grid">
                <div>
                  <h4>Upload CSV</h4>
                  <p className="muted">
                    Columns: Name, Position, Organizing Comfort, Teammate Guidance, Dribbling,
                    Shooting, Passing, Defending, Physical, Pace, Stamina (all ratings 1–10)
                  </p>
                  <input type="file" accept=".csv" onChange={handleCsvUpload} />
                  {csvError && <p className="error">{csvError}</p>}
                </div>
                <div>
                  <h4>Registration Form</h4>
                  <PlayerRegistrationForm
                    form={form}
                    onChange={setForm}
                    onSubmit={handleAddPlayer}
                    showIntro
                  />
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

        </div>
      </CollapsibleSection>

      <div className="admin-danger-zone-wrap">
        <CollapsibleSection title="Danger Zone" defaultOpen={false} className="collapsible-danger">
          <div className="danger-zone-card">
            <p className="muted">
              Reset permanently clears captains, players, bids, and auction progress for this room.
            </p>
            <button type="button" className="btn-danger" onClick={() => resetRoom(roomId)}>
              Reset This Room
            </button>
          </div>
        </CollapsibleSection>
      </div>
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
