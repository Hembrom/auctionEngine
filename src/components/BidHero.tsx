import { STARTING_BID, TIMER_SECONDS, RESULT_SECONDS } from '../types';
import type { ResultDisplay } from '../types';
import { CircularTimer } from './CircularTimer';

interface BidHeroProps {
  phase: 'live' | 'result' | 'unsold';
  currentBidAmount: number;
  highBidder: string;
  bidCountdown: number;
  resultCountdown: number;
  paused: boolean;
  resultDisplay?: ResultDisplay | null;
}

export function BidHero({
  phase,
  currentBidAmount,
  highBidder,
  bidCountdown,
  resultCountdown,
  paused,
  resultDisplay,
}: BidHeroProps) {
  const isResult = phase === 'result';
  const isSold = isResult && !!resultDisplay?.captainId;
  const isUnsoldResult = isResult && resultDisplay && !resultDisplay.captainId;
  const soldMessage = isSold ? resultDisplay?.message : null;
  const displayBid = currentBidAmount || STARTING_BID;
  const hasBid = currentBidAmount > 0;
  const timerSeconds = isResult ? resultCountdown : bidCountdown;
  const timerTotal = isResult ? RESULT_SECONDS : TIMER_SECONDS;
  const timerActive = phase === 'live' || isResult;

  return (
    <div
      className={`bid-hero ${isResult ? 'bid-hero-result' : ''} ${isSold ? 'bid-hero-sold' : ''} ${isUnsoldResult ? 'bid-hero-unsold-result' : ''}`}
    >
      {isUnsoldResult ? (
        <div className="bid-hero-stat bid-hero-center">
          <span className="bid-hero-label">Result</span>
          <span className="bid-hero-amount bid-hero-unsold">Unsold</span>
        </div>
      ) : isSold && soldMessage ? (
        <div className="bid-hero-stat bid-hero-center bid-hero-sold-message">
          <span className="bid-hero-label">Result</span>
          <span className="bid-hero-amount bid-hero-sold-text">{soldMessage}</span>
        </div>
      ) : (
        <>
          <div className="bid-hero-stat bid-hero-bid">
            <span className="bid-hero-label">{isResult ? 'Final Bid' : 'Current Bid'}</span>
            <span className="bid-hero-amount">₹{displayBid}</span>
          </div>
          <div className="bid-hero-stat bid-hero-leader">
            <span className="bid-hero-label">{isResult ? 'Sold to' : 'Highest Bidder'}</span>
            <span className="bid-hero-name">{hasBid ? highBidder : '—'}</span>
          </div>
        </>
      )}

      <div className="bid-hero-timer">
        <CircularTimer
          seconds={timerSeconds}
          totalSeconds={timerTotal}
          paused={paused && !isResult}
          active={timerActive}
        />
      </div>
    </div>
  );
}
