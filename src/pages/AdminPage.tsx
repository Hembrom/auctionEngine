import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
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
import { useAuth } from '../context/AuthContext';
import { AuthUserBar } from '../components/AuthUserBar';
import { canAccessAdminPanel, isLegacyAdminId } from '../lib/adminAccess';
import {
  approveCaptain,
  rejectCaptain,
  addPlayer,
  addPlayersBatch,
  deletePlayer,
  setPlayerCaptain,
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
  addAdminEmail,
  removeAdminEmail,
  autoGenerateTeams,
  setAuctionStartTime,
} from '../lib/auctionService';
import { PlayerRegistrationForm } from '../components/PlayerRegistrationForm';
import { AdminPlayerPhotos } from '../components/AdminPlayerPhotos';
import { parseCsvPlayers, validatePlayerPositions, getUnsoldPlayers, areAllSquadsFull, matchCaptainPlayers } from '../lib/auctionLogic';
import { createDefaultPlayerForm, sanitizePlayerForm } from '../lib/playerUtils';
import { isAuctionPaused, getBidTimerSeconds, getResultTimerSeconds } from '../lib/auctionState';
import {
  formatAuctionStartLabel,
  fromIstInputValue,
  resolveAuctionStartTime,
  toIstInputValue,
} from '../lib/auctionSchedule';
import { STARTING_BUDGET, TIMER_SECONDS, RESULT_SECONDS } from '../types';

export function AdminPage() {
  const roomId = useRoomId();
  const { state, captains, players, bids, loading, firebaseError } = useAuctionData(roomId);
  const { user, loading: authLoading } = useAuth();
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
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [adminEmailBusy, setAdminEmailBusy] = useState(false);
  const [adminEmailError, setAdminEmailError] = useState('');
  const [aiGenerateBusy, setAiGenerateBusy] = useState(false);
  const [aiGenerateError, setAiGenerateError] = useState('');
  const [startTimeInput, setStartTimeInput] = useState('');
  const [startTimeBusy, setStartTimeBusy] = useState(false);
  const [startTimeError, setStartTimeError] = useState('');

  const [form, setForm] = useState(createDefaultPlayerForm);

  const isOwner = canAccessAdminPanel(roomId, state, user?.uid, user?.email);
  const needsFirebaseLogin = !isLegacyAdminId(state.adminId) && !user;
  const pending = captains.filter((c) => c.status === 'pending');
  const approved = captains.filter((c) => c.status === 'approved');
  const unsoldPlayers = getUnsoldPlayers(players);
  const allSquadsFull = areAllSquadsFull(captains);
  const currentPlayer = players.find((p) => p.id === state.currentPlayerId);
  const isPaused = isAuctionPaused(state);
  const countdown = useCountdown(state.bidDeadline, isPaused, state.pausedRemainingMs);
  const isLivePhase = ['live', 'result', 'unsold'].includes(state.phase);
  const unmatchedCaptains = (() => {
    const matches = matchCaptainPlayers(players, approved);
    return approved.filter((c) => !matches.has(c.id)).map((c) => c.name);
  })();

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

  useEffect(() => {
    const startsAt = resolveAuctionStartTime(roomId, state);
    setStartTimeInput(startsAt ? toIstInputValue(startsAt) : '');
  }, [roomId, state.auctionStartsAt]);

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

  const handleAddAdminEmail = async () => {
    if (adminEmailBusy) return;
    setAdminEmailBusy(true);
    setAdminEmailError('');
    try {
      await addAdminEmail(roomId, newAdminEmail);
      setNewAdminEmail('');
    } catch (e) {
      setAdminEmailError((e as Error).message);
    } finally {
      setAdminEmailBusy(false);
    }
  };

  const handleRemoveAdminEmail = async (email: string) => {
    if (adminEmailBusy) return;
    setAdminEmailBusy(true);
    setAdminEmailError('');
    try {
      await removeAdminEmail(roomId, email);
    } catch (e) {
      setAdminEmailError((e as Error).message);
    } finally {
      setAdminEmailBusy(false);
    }
  };

  const handleSaveStartTime = async (clear = false) => {
    if (startTimeBusy) return;
    setStartTimeBusy(true);
    setStartTimeError('');
    try {
      if (clear) {
        await setAuctionStartTime(roomId, null);
        setStartTimeInput('');
      } else {
        const startsAt = fromIstInputValue(startTimeInput);
        if (!startsAt) throw new Error('Pick a valid date and time.');
        await setAuctionStartTime(roomId, startsAt);
      }
    } catch (e) {
      setStartTimeError((e as Error).message);
    } finally {
      setStartTimeBusy(false);
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

  const handleAiGenerateTeams = async () => {
    if (aiGenerateBusy) return;
    const confirmed = window.confirm(
      'Auto-fill every team with the remaining players and finish the auction? Players already won stay with their team. This cannot be undone.',
    );
    if (!confirmed) return;

    setAiGenerateBusy(true);
    setAiGenerateError('');
    try {
      await autoGenerateTeams(roomId, players, captains);
    } catch (e) {
      setAiGenerateError((e as Error).message);
    } finally {
      setAiGenerateBusy(false);
    }
  };

  const aiGenerateControls = (
    <>
      <div className="admin-controls admin-ai-controls">
        <button
          type="button"
          className="btn-primary"
          onClick={handleAiGenerateTeams}
          disabled={aiGenerateBusy || approved.length === 0 || players.length === 0}
        >
          {aiGenerateBusy ? 'Generating…' : '🤖 AI Generate Teams'}
        </button>
      </div>
      <p className="muted admin-live-meta">
        Skips bidding and fills every squad with the remaining players, balanced on overall rating,
        stamina and goalkeeper coverage. Captain-marked players are pinned to their own team, players
        already won stay put, then the auction is finished.
      </p>
      {approved.length === 0 && <p className="muted">Approve at least one captain first.</p>}
      {unmatchedCaptains.length > 0 && (
        <p className="muted">
          No captain-marked player matches: <strong>{unmatchedCaptains.join(', ')}</strong>. Mark a
          player with the exact same name to pin them to that team.
        </p>
      )}
      {aiGenerateError && <p className="error">{aiGenerateError}</p>}
    </>
  );

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
      {aiGenerateControls}
    </div>
  ) : null;

  if (authLoading) {
    return (
      <Layout title="Admin Panel" badge={roomId} theme="admin">
        <div className="card center-card">
          <p className="muted">Checking sign-in…</p>
        </div>
      </Layout>
    );
  }

  if (needsFirebaseLogin) {
    return (
      <Navigate
        to={`/?next=${encodeURIComponent(`/room/${roomId}/admin`)}`}
        replace
      />
    );
  }

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
      <AuthUserBar />

      <p className="players-nav">
        <Link to="/create" className="btn-link">
          ← All my rooms
        </Link>
      </p>

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

      {!isLivePhase && (
        <section className="card admin-wide">
          <h3>Skip the Auction</h3>
          {aiGenerateControls}
        </section>
      )}

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
              <label>Auction start time (IST)</label>
              <input
                type="datetime-local"
                value={startTimeInput}
                onChange={(e) => setStartTimeInput(e.target.value)}
              />
              <p className="muted config-hint">
                {resolveAuctionStartTime(roomId, state)
                  ? `Captains and spectators see a countdown to ${formatAuctionStartLabel(
                      resolveAuctionStartTime(roomId, state) as number,
                    )} IST.`
                  : 'No countdown is shown. Set a time to display one on the captain and spectator screens.'}
              </p>
              <div className="config-actions">
                <button type="button" onClick={() => handleSaveStartTime()} disabled={startTimeBusy}>
                  {startTimeBusy ? 'Saving…' : 'Save Start Time'}
                </button>
                <button
                  type="button"
                  className="btn-danger"
                  onClick={() => handleSaveStartTime(true)}
                  disabled={startTimeBusy}
                >
                  Clear
                </button>
              </div>
              {startTimeError && <p className="error">{startTimeError}</p>}
            </div>
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

          <section className="card">
            <h3>Room Admins</h3>
            <p className="muted">
              Invite other people to co-manage this room by their sign-in email. They'll get full
              admin access when they log in with that email.
            </p>
            {(state.adminEmails ?? []).length === 0 ? (
              <p className="muted">No additional admins invited yet.</p>
            ) : (
              <ul className="action-list">
                {(state.adminEmails ?? []).map((email) => (
                  <li key={email}>
                    <span>{email}</span>
                    <button
                      className="btn-small btn-danger"
                      disabled={adminEmailBusy}
                      onClick={() => handleRemoveAdminEmail(email)}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="form-row">
              <label>Admin email</label>
              <input
                type="email"
                placeholder="teammate@example.com"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
              />
            </div>
            <div className="config-actions">
              <button type="button" onClick={handleAddAdminEmail} disabled={adminEmailBusy}>
                {adminEmailBusy ? 'Adding…' : 'Add Admin'}
              </button>
            </div>
            {adminEmailError && <p className="error">{adminEmailError}</p>}
          </section>

          {(state.phase === 'waiting' || state.phase === 'lobby') && (
            <section className="card admin-wide">
              <h3>Player Registration ({players.length} players)</h3>
              <div className="grid-2 registration-setup-grid">
                <div>
                  <h4>Upload CSV</h4>
                  <p className="muted">
                    Columns: Name, Position, Play Frequency, Dribbling, Shooting, Passing,
                    Defending, Game Understanding, Pace, Stamina (ratings 1–10). Play
                    Frequency: Multiple Times a Week, Once a Week, Once a Month, Occasionally, or
                    Never Played
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
                        className="btn-small"
                        onClick={() => setPlayerCaptain(roomId, p.id, !p.isCaptain)}
                      >
                        {p.isCaptain ? 'Remove Captain' : 'Mark Captain'}
                      </button>
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

          {players.length > 0 && <AdminPlayerPhotos roomId={roomId} players={players} />}

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
