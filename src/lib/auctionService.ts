import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  getDoc,
  runTransaction,
  query,
  where,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db, COLLECTIONS, SUBCOLLECTIONS } from '../firebase';
import type {
  AuctionState,
  Captain,
  Player,
  Bid,
  PlayerFormData,
  SquadPlayer,
} from '../types';
import {
  STARTING_BID,
  STARTING_BUDGET,
} from '../types';
import {
  assignPosition,
  areAllSquadsFull,
  buildPlayerQueue,
  createDefaultAuctionState,
  formatSoldMessage,
  isAuctionComplete,
  normalizeCaptainLabel,
  shouldSellOnOptOut,
} from './auctionLogic';
import { isValidRoomSlug, slugifyRoomName } from './roomUtils';
import { getBidTimerSeconds, getResultTimerSeconds, isAuctionPaused } from './auctionState';

function roomPaths(roomId: string) {
  return {
    room: doc(db, COLLECTIONS.rooms, roomId),
    captains: collection(db, COLLECTIONS.rooms, roomId, SUBCOLLECTIONS.captains),
    players: collection(db, COLLECTIONS.rooms, roomId, SUBCOLLECTIONS.players),
    bids: collection(db, COLLECTIONS.rooms, roomId, SUBCOLLECTIONS.bids),
  };
}

export async function roomExists(roomId: string): Promise<boolean> {
  const snap = await getDoc(doc(db, COLLECTIONS.rooms, roomId));
  return snap.exists();
}

export async function getRoom(roomId: string): Promise<AuctionState | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.rooms, roomId));
  if (!snap.exists()) return null;
  return snap.data() as AuctionState;
}

export async function createRoom(displayName: string, adminId: string): Promise<string> {
  const roomId = slugifyRoomName(displayName);
  if (!isValidRoomSlug(roomId)) {
    throw new Error('Room name must be at least 3 letters or numbers.');
  }

  const ref = doc(db, COLLECTIONS.rooms, roomId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    throw new Error(`Room "${roomId}" already exists. Pick a different name.`);
  }

  await setDoc(ref, {
    ...createDefaultAuctionState(),
    displayName: displayName.trim(),
    createdAt: Date.now(),
    phase: 'waiting',
    adminId,
  });

  return roomId;
}

export function subscribeRoomState(
  roomId: string,
  cb: (state: AuctionState) => void,
  onError?: (error: Error) => void,
) {
  return onSnapshot(
    roomPaths(roomId).room,
    (snap) => {
      if (snap.exists()) {
        cb(snap.data() as AuctionState);
      } else {
        cb(createDefaultAuctionState());
      }
    },
    (err) => onError?.(err),
  );
}

export function subscribeCaptains(
  roomId: string,
  cb: (captains: Captain[]) => void,
  onError?: (error: Error) => void,
) {
  return onSnapshot(
    roomPaths(roomId).captains,
    (snap) => {
      const captains = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Captain)
        .sort((a, b) => a.joinedAt - b.joinedAt);
      cb(captains);
    },
    (err) => onError?.(err),
  );
}

export function subscribePlayers(
  roomId: string,
  cb: (players: Player[]) => void,
  onError?: (error: Error) => void,
) {
  return onSnapshot(
    roomPaths(roomId).players,
    (snap) => {
      const players = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Player);
      cb(players);
    },
    (err) => onError?.(err),
  );
}

export function subscribeBids(
  roomId: string,
  playerId: string | null,
  cb: (bids: Bid[]) => void,
  onError?: (error: Error) => void,
) {
  if (!playerId) {
    cb([]);
    return () => {};
  }
  const q = query(roomPaths(roomId).bids, where('playerId', '==', playerId));
  return onSnapshot(
    q,
    (snap) => {
      const bids = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Bid)
        .sort((a, b) => a.timestamp - b.timestamp);
      cb(bids);
    },
    (err) => onError?.(err),
  );
}

export async function requestJoin(
  roomId: string,
  name: string,
  teamName: string,
): Promise<string> {
  const exists = await roomExists(roomId);
  if (!exists) throw new Error('Room not found.');

  const trimmedName = name.trim();
  const trimmedTeam = teamName.trim();
  if (!trimmedName) throw new Error('Captain name is required.');
  if (!trimmedTeam) throw new Error('Team name is required.');

  const captainsSnap = await getDocs(roomPaths(roomId).captains);
  const normName = normalizeCaptainLabel(trimmedName);
  const normTeam = normalizeCaptainLabel(trimmedTeam);

  for (const docSnap of captainsSnap.docs) {
    const c = docSnap.data() as Captain;
    if (c.status === 'rejected') continue;
    if (normalizeCaptainLabel(c.name) === normName) {
      throw new Error('Captain name is already taken in this room.');
    }
    if (normalizeCaptainLabel(c.teamName) === normTeam) {
      throw new Error('Team name is already taken in this room.');
    }
  }

  const ref = await addDoc(roomPaths(roomId).captains, {
    name: trimmedName,
    teamName: trimmedTeam,
    status: 'pending',
    budget: STARTING_BUDGET,
    squad: [],
    joinedAt: Date.now(),
  });
  return ref.id;
}

export async function approveCaptain(roomId: string, captainId: string, startingBudget: number) {
  await updateDoc(doc(roomPaths(roomId).captains, captainId), {
    status: 'approved',
    budget: startingBudget,
  });
}

export async function rejectCaptain(roomId: string, captainId: string) {
  await updateDoc(doc(roomPaths(roomId).captains, captainId), { status: 'rejected' });
}

export async function setTeamName(
  roomId: string,
  captainId: string,
  teamName: string,
  fallbackName: string,
) {
  const trimmed = teamName.trim() || fallbackName;
  const normTeam = normalizeCaptainLabel(trimmed);

  const captainsSnap = await getDocs(roomPaths(roomId).captains);
  for (const docSnap of captainsSnap.docs) {
    if (docSnap.id === captainId) continue;
    const c = docSnap.data() as Captain;
    if (c.status === 'rejected') continue;
    if (normalizeCaptainLabel(c.teamName) === normTeam) {
      throw new Error('Team name is already taken in this room.');
    }
  }

  await updateDoc(doc(roomPaths(roomId).captains, captainId), {
    teamName: trimmed,
  });
}

export async function addPlayer(roomId: string, data: PlayerFormData) {
  await addDoc(roomPaths(roomId).players, { ...data, status: 'available' });
}

export async function addPlayersBatch(roomId: string, playersData: PlayerFormData[]) {
  const batch = writeBatch(db);
  for (const data of playersData) {
    const ref = doc(roomPaths(roomId).players);
    batch.set(ref, { ...data, status: 'available' });
  }
  await batch.commit();
}

export async function deletePlayer(roomId: string, playerId: string) {
  await deleteDoc(doc(roomPaths(roomId).players, playerId));
}

export async function moveToLobby(roomId: string, startingBudget: number) {
  const captainsSnap = await getDocs(roomPaths(roomId).captains);
  const batch = writeBatch(db);
  captainsSnap.docs.forEach((d) => {
    if (d.data().status === 'approved') {
      batch.update(d.ref, { budget: startingBudget });
    }
  });
  await batch.commit();
  await updateDoc(roomPaths(roomId).room, { phase: 'lobby', startingBudget });
}

export async function updateTimerSettings(
  roomId: string,
  bidTimerSeconds: number,
  resultTimerSeconds: number,
): Promise<void> {
  await updateDoc(roomPaths(roomId).room, {
    bidTimerSeconds: Math.max(5, Math.round(bidTimerSeconds)),
    resultTimerSeconds: Math.max(3, Math.round(resultTimerSeconds)),
  });
}

export async function startAuction(roomId: string, players: Player[]) {
  const room = await getRoom(roomId);
  const bidSeconds = getBidTimerSeconds(room ?? createDefaultAuctionState());
  const queue = buildPlayerQueue(players);
  const firstPlayerId = queue[0] ?? null;

  await updateDoc(roomPaths(roomId).room, {
    phase: 'live',
    isUnsoldRound: false,
    playerQueue: queue,
    unsoldQueue: [],
    currentIndex: 0,
    currentPlayerId: firstPlayerId,
    currentBid: null,
    bidDeadline: firstPlayerId ? Date.now() + bidSeconds * 1000 : null,
    resultDisplay: null,
    resultEndsAt: null,
    paused: false,
    optedOutCaptainIds: [],
  });
}

export async function placeBid(
  roomId: string,
  playerId: string,
  captainId: string,
  captainName: string,
  amount: number,
): Promise<{ success: boolean; error?: string }> {
  const paths = roomPaths(roomId);
  try {
    await runTransaction(db, async (transaction) => {
      const roomSnap = await transaction.get(paths.room);
      if (!roomSnap.exists()) throw new Error('Room not found');

      const state = roomSnap.data() as AuctionState;
      if (state.phase !== 'live' || isAuctionPaused(state)) throw new Error('Bidding is closed');
      if (state.currentPlayerId !== playerId) throw new Error('Wrong player');

      const existingBid = state.currentBid?.amount ?? 0;
      const minBid = existingBid === 0 ? STARTING_BID : existingBid + 1;
      if (amount < minBid) throw new Error(`Minimum bid is ₹${minBid}`);
      if (state.currentBid?.captainId === captainId) {
        throw new Error('You are the highest bidder. Wait for a counter bid.');
      }

      transaction.update(paths.room, {
        currentBid: { amount, captainId, captainName },
        bidDeadline: Date.now() + getBidTimerSeconds(state) * 1000,
        optedOutCaptainIds: [],
      });
    });

    await addDoc(paths.bids, {
      playerId,
      captainId,
      captainName,
      amount,
      timestamp: Date.now(),
    });

    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function optOutOfBid(roomId: string, captainId: string): Promise<void> {
  const paths = roomPaths(roomId);
  let optedAfter: string[] = [];

  await runTransaction(db, async (tx) => {
    const roomSnap = await tx.get(paths.room);
    if (!roomSnap.exists()) throw new Error('Room not found');

    const data = roomSnap.data() as AuctionState;
    if (data.phase !== 'live' || isAuctionPaused(data)) throw new Error('Bidding is closed');
    if (data.currentBid?.captainId === captainId) {
      throw new Error('Highest bidder cannot opt out.');
    }

    optedAfter = [...(data.optedOutCaptainIds ?? [])];
    if (!optedAfter.includes(captainId)) optedAfter.push(captainId);

    tx.update(paths.room, { optedOutCaptainIds: optedAfter });
  });

  const room = await getRoom(roomId);
  if (!room?.currentBid?.captainId) return;

  const captainsSnap = await getDocs(paths.captains);
  const captains = captainsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Captain);

  let player: Player | null = null;
  if (room.currentPlayerId) {
    const playerSnap = await getDoc(doc(paths.players, room.currentPlayerId));
    if (playerSnap.exists()) {
      player = { id: playerSnap.id, ...playerSnap.data() } as Player;
    }
  }

  if (shouldSellOnOptOut(captains, player, room.currentBid, optedAfter)) {
    await finalizeCurrentPlayer(roomId, [], [], room, true);
  }
}

export async function finalizeCurrentPlayer(
  roomId: string,
  _players: Player[],
  _captains: Captain[],
  _state: AuctionState,
  force = false,
): Promise<void> {
  const paths = roomPaths(roomId);

  await runTransaction(db, async (tx) => {
    const roomSnap = await tx.get(paths.room);
    if (!roomSnap.exists()) return;

    const data = roomSnap.data() as AuctionState;
    if (data.phase !== 'live') return;
    if (!force && (!data.bidDeadline || Date.now() < data.bidDeadline)) return;
    if (force && !data.currentBid) return;
    if (!data.currentPlayerId) return;

    const playerId = data.currentPlayerId;
    const playerRef = doc(paths.players, playerId);
    const playerSnap = await tx.get(playerRef);
    if (!playerSnap.exists()) return;

    const player = { id: playerSnap.id, ...playerSnap.data() } as Player;
    const nextIndex = data.currentIndex + 1;

    if (data.currentBid) {
      const { captainId, captainName, amount } = data.currentBid;
      const captainRef = doc(paths.captains, captainId);
      const captainSnap = await tx.get(captainRef);
      if (!captainSnap.exists()) return;

      const captain = { id: captainSnap.id, ...captainSnap.data() } as Captain;
      const position = assignPosition(captain, player);
      const squadEntry: SquadPlayer = {
        playerId,
        name: player.name,
        position,
        price: amount,
      };

      tx.update(captainRef, {
        budget: captain.budget - amount,
        squad: [...captain.squad, squadEntry],
      });
      tx.update(playerRef, {
        status: 'sold',
        soldToCaptainId: captainId,
        soldPrice: amount,
      });
      tx.update(paths.room, {
        phase: 'result',
        currentIndex: nextIndex,
        resultDisplay: {
          message: formatSoldMessage(
            player.name,
            captain.teamName || captainName,
            amount,
          ),
          playerId,
          captainId,
          amount,
        },
        resultEndsAt: Date.now() + getResultTimerSeconds(data) * 1000,
        bidDeadline: null,
        optedOutCaptainIds: [],
      });
      return;
    }

    tx.update(playerRef, { status: 'unsold' });
    tx.update(paths.room, {
      phase: 'result',
      resultDisplay: { message: 'Unsold', playerId },
      resultEndsAt: Date.now() + getResultTimerSeconds(data) * 1000,
      bidDeadline: null,
      currentIndex: nextIndex,
      optedOutCaptainIds: [],
    });
  });
}

export async function advanceAfterResult(
  roomId: string,
  players: Player[],
  captains: Captain[],
  _state: AuctionState,
): Promise<void> {
  const paths = roomPaths(roomId);

  await runTransaction(db, async (tx) => {
    const roomSnap = await tx.get(paths.room);
    if (!roomSnap.exists()) return;

    const data = roomSnap.data() as AuctionState;
    if (data.phase !== 'result') return;
    if (!data.resultEndsAt || Date.now() < data.resultEndsAt) return;

    const queue = data.isUnsoldRound ? data.unsoldQueue : data.playerQueue;
    const nextIndex = data.currentIndex;

    if (isAuctionComplete(players, captains, queue, nextIndex)) {
      const unsoldQueue = buildPlayerQueue(players, true);

      if (unsoldQueue.length > 0 && !areAllSquadsFull(captains)) {
        if (!data.isUnsoldRound) {
          tx.update(paths.room, {
            phase: 'live',
            isUnsoldRound: true,
            unsoldQueue,
            currentIndex: 0,
            currentPlayerId: unsoldQueue[0],
            currentBid: null,
            bidDeadline: Date.now() + getBidTimerSeconds(data) * 1000,
            resultDisplay: null,
            resultEndsAt: null,
            optedOutCaptainIds: [],
          });
          return;
        }

        tx.update(paths.room, {
          phase: 'unsold',
          isUnsoldRound: false,
          currentPlayerId: null,
          currentBid: null,
          bidDeadline: null,
          resultDisplay: null,
          resultEndsAt: null,
          paused: false,
          pausedRemainingMs: null,
        });
        return;
      }

      tx.update(paths.room, {
        phase: 'ended',
        currentPlayerId: null,
        bidDeadline: null,
        currentBid: null,
        resultDisplay: null,
        resultEndsAt: null,
      });
      return;
    }

    const nextPlayerId = queue[nextIndex];
    tx.update(paths.room, {
      phase: 'live',
      currentIndex: nextIndex,
      currentPlayerId: nextPlayerId,
      currentBid: null,
      bidDeadline: Date.now() + getBidTimerSeconds(data) * 1000,
      resultDisplay: null,
      resultEndsAt: null,
      optedOutCaptainIds: [],
    });
  });
}

export async function pauseAuction(roomId: string): Promise<void> {
  const paths = roomPaths(roomId);
  const snap = await getDoc(paths.room);
  if (!snap.exists()) throw new Error('Room not found');

  const data = snap.data() as AuctionState;
  if (data.phase !== 'live') throw new Error('Can only pause during live auction');
  if (isAuctionPaused(data)) return;

  const remaining = data.bidDeadline
    ? Math.max(3000, data.bidDeadline - Date.now())
    : getBidTimerSeconds(data) * 1000;

  await updateDoc(paths.room, {
    paused: true,
    pausedRemainingMs: remaining,
  });
}

export async function resumeAuction(roomId: string): Promise<void> {
  const paths = roomPaths(roomId);
  const snap = await getDoc(paths.room);
  if (!snap.exists()) throw new Error('Room not found');

  const data = snap.data() as AuctionState;
  if (!isAuctionPaused(data)) return;

  const remaining =
    typeof data.pausedRemainingMs === 'number' && data.pausedRemainingMs > 0
      ? data.pausedRemainingMs
      : getBidTimerSeconds(data) * 1000;

  await updateDoc(paths.room, {
    paused: false,
    phase: 'live',
    bidDeadline: Date.now() + remaining,
    pausedRemainingMs: 0,
  });
}

/** @deprecated Use pauseAuction / resumeAuction */
export async function togglePause(roomId: string, shouldPause: boolean) {
  if (shouldPause) {
    await pauseAuction(roomId);
  } else {
    await resumeAuction(roomId);
  }
}

export async function skipPlayer(roomId: string, state: AuctionState) {
  const paths = roomPaths(roomId);
  const playerId = state.currentPlayerId;
  if (!playerId) return;

  await updateDoc(doc(paths.players, playerId), { status: 'unsold' });
  await updateDoc(paths.room, {
    phase: 'result',
    resultDisplay: { message: 'Unsold', playerId },
    resultEndsAt: Date.now() + getResultTimerSeconds(state) * 1000,
    bidDeadline: null,
    currentBid: null,
    currentIndex: state.currentIndex + 1,
  });
}

export async function markUnsold(roomId: string, state: AuctionState) {
  await skipPlayer(roomId, state);
}

export async function restartUnsoldRound(roomId: string, players: Player[]): Promise<void> {
  const paths = roomPaths(roomId);
  const room = await getRoom(roomId);
  const bidSeconds = getBidTimerSeconds(room ?? createDefaultAuctionState());
  const unsoldQueue = buildPlayerQueue(players, true);
  if (unsoldQueue.length === 0) {
    throw new Error('No unsold players to auction');
  }

  await updateDoc(paths.room, {
    phase: 'live',
    isUnsoldRound: true,
    unsoldQueue,
    currentIndex: 0,
    currentPlayerId: unsoldQueue[0],
    currentBid: null,
    bidDeadline: Date.now() + bidSeconds * 1000,
    resultDisplay: null,
    resultEndsAt: null,
    paused: false,
    pausedRemainingMs: null,
    optedOutCaptainIds: [],
  });
}

export async function endAuction(roomId: string): Promise<void> {
  await updateDoc(roomPaths(roomId).room, {
    phase: 'ended',
    currentPlayerId: null,
    bidDeadline: null,
    currentBid: null,
    resultDisplay: null,
    resultEndsAt: null,
    paused: false,
    pausedRemainingMs: null,
  });
}

export async function movePlayer(
  roomId: string,
  playerId: string,
  fromCaptainId: string,
  toCaptainId: string,
  captains: Captain[],
) {
  const paths = roomPaths(roomId);
  const fromCaptain = captains.find((c) => c.id === fromCaptainId);
  const toCaptain = captains.find((c) => c.id === toCaptainId);
  if (!fromCaptain || !toCaptain) return;

  const squadPlayer = fromCaptain.squad.find((p) => p.playerId === playerId);
  if (!squadPlayer) return;

  await updateDoc(doc(paths.captains, fromCaptainId), {
    squad: fromCaptain.squad.filter((p) => p.playerId !== playerId),
    budget: fromCaptain.budget + squadPlayer.price,
  });
  await updateDoc(doc(paths.captains, toCaptainId), {
    squad: [...toCaptain.squad, squadPlayer],
    budget: toCaptain.budget - squadPlayer.price,
  });
  await updateDoc(doc(paths.players, playerId), { soldToCaptainId: toCaptainId });
}

export async function adjustBudget(roomId: string, captainId: string, budget: number) {
  await updateDoc(doc(roomPaths(roomId).captains, captainId), { budget });
}

export async function addCaptainMidAuction(roomId: string, name: string, startingBudget: number) {
  await addDoc(roomPaths(roomId).captains, {
    name,
    teamName: name,
    status: 'approved',
    budget: startingBudget,
    squad: [],
    joinedAt: Date.now(),
  });
}

export async function resetRoom(roomId: string) {
  const paths = roomPaths(roomId);
  const roomSnap = await getDoc(paths.room);
  if (!roomSnap.exists()) return;

  const { displayName, createdAt, adminId } = roomSnap.data() as AuctionState;

  for (const sub of [paths.captains, paths.players, paths.bids]) {
    const snap = await getDocs(sub);
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  await setDoc(paths.room, {
    ...createDefaultAuctionState(),
    displayName,
    createdAt,
    phase: 'waiting',
    adminId,
  });
}
