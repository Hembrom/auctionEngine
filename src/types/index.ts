export type Position = 'GK' | 'DEF' | 'MID' | 'ST';

export type CaptainStatus = 'pending' | 'approved' | 'rejected';

export type PlayerStatus = 'available' | 'sold' | 'unsold';

export type AuctionPhase =
  | 'setup'
  | 'waiting'
  | 'lobby'
  | 'live'
  | 'result'
  | 'unsold'
  | 'ended';

export interface Player {
  id: string;
  name: string;
  positions: Position[];
  lastMatchRating: number;
  fitness: number;
  leadership: number;
  teamInfluence: number;
  status: PlayerStatus;
  soldToCaptainId?: string;
  soldPrice?: number;
}

export interface SquadPlayer {
  playerId: string;
  name: string;
  position: Position;
  price: number;
}

export interface Captain {
  id: string;
  name: string;
  teamName: string;
  status: CaptainStatus;
  budget: number;
  squad: SquadPlayer[];
  joinedAt: number;
}

export interface Bid {
  id: string;
  playerId: string;
  captainId: string;
  captainName: string;
  amount: number;
  timestamp: number;
}

export interface CurrentBid {
  amount: number;
  captainId: string;
  captainName: string;
}

export interface ResultDisplay {
  message: string;
  playerId: string;
  captainId?: string;
  amount?: number;
}

export interface AuctionState {
  displayName: string;
  createdAt: number;
  phase: AuctionPhase;
  paused: boolean;
  startingBudget: number;
  isUnsoldRound: boolean;
  currentPlayerId: string | null;
  playerQueue: string[];
  unsoldQueue: string[];
  currentIndex: number;
  bidDeadline: number | null;
  pausedRemainingMs?: number | null;
  currentBid: CurrentBid | null;
  resultDisplay: ResultDisplay | null;
  resultEndsAt: number | null;
  adminId: string | null;
}

export interface PlayerFormData {
  name: string;
  positions: Position[];
  lastMatchRating: number;
  fitness: number;
  leadership: number;
  teamInfluence: number;
}

export const SQUAD_SIZE = 7;
export const GK_REQUIRED = 1;
export const OUTFIELD_SIZE = SQUAD_SIZE - GK_REQUIRED;
export const STARTING_BUDGET = 1000;
export const STARTING_BID = 10;
export const MIN_BID_INCREMENT = 1;
export const TIMER_SECONDS = 15;
export const RESULT_SECONDS = 10;
export const POSITION_ORDER: Position[] = ['GK', 'ST', 'DEF', 'MID'];
