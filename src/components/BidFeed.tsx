import type { Bid } from '../types';

interface BidFeedProps {
  bids: Bid[];
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

export function BidFeed({ bids }: BidFeedProps) {
  if (bids.length === 0) {
    return (
      <div className="bid-feed">
        <h3>Live Bid Feed</h3>
        <p className="muted">No bids yet</p>
      </div>
    );
  }

  const ordered = [...bids].reverse();

  return (
    <div className="bid-feed">
      <h3>Live Bid Feed</h3>
      <table className="bid-table">
        <thead>
          <tr>
            <th aria-label="Latest" />
            <th>Time</th>
            <th>Captain</th>
            <th>Bid</th>
          </tr>
        </thead>
        <tbody>
          {ordered.map((b, i) => (
            <tr key={b.id} className={i === 0 ? 'bid-latest' : ''}>
              <td className="bid-arrow-cell">
                {i === 0 && <span className="bid-latest-arrow" aria-label="Latest bid">▶</span>}
              </td>
              <td>{formatTime(b.timestamp)}</td>
              <td>{b.captainName}</td>
              <td className="bid-amount-cell">₹{b.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
