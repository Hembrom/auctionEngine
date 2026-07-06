import type { AuctionState, Captain, Player } from '../types';

interface PlayerStatusBoardProps {
  state: AuctionState;
  players: Player[];
  captains?: Captain[];
}

function PosTags({ positions }: { positions: string[] }) {
  return (
    <span className="player-board-positions">
      {positions.map((p) => (
        <span key={p} className={`pos-tag pos-${p.toLowerCase()}`}>
          {p}
        </span>
      ))}
    </span>
  );
}

export function PlayerStatusBoard({ state, players, captains = [] }: PlayerStatusBoardProps) {
  const playerMap = new Map(players.map((p) => [p.id, p]));
  const captainMap = new Map(captains.map((c) => [c.id, c]));
  const queue = state.isUnsoldRound ? state.unsoldQueue : state.playerQueue;
  const upcomingIds = queue.slice(state.currentIndex).filter((id) => id !== state.currentPlayerId);
  const current = state.currentPlayerId ? (playerMap.get(state.currentPlayerId) ?? null) : null;
  const upcoming = upcomingIds
    .map((id) => playerMap.get(id))
    .filter((p): p is Player => !!p);
  const sold = players.filter((p) => p.status === 'sold');
  const unsold = players.filter((p) => p.status === 'unsold');
  const totalInPool = players.length;
  const doneCount = sold.length + unsold.length;

  return (
    <section className="card admin-wide player-status-board">
      <div className="player-board-header">
        <h3>Player Pipeline</h3>
        <div className="player-board-summary">
          <span className="player-board-pill player-board-pill-live">
            {current ? '1 live' : '0 live'}
          </span>
          <span className="player-board-pill">{upcoming.length} in queue</span>
          <span className="player-board-pill player-board-pill-sold">{sold.length} sold</span>
          <span className="player-board-pill player-board-pill-unsold">{unsold.length} unsold</span>
          <span className="player-board-pill muted">{doneCount}/{totalInPool} done</span>
        </div>
      </div>

      <div className="player-board-live-card">
        <span className="player-board-live-label">On the block</span>
        {current ? (
          <div className="player-board-live-body">
            <strong className="player-board-live-name">{current.name}</strong>
            <PosTags positions={current.positions} />
          </div>
        ) : (
          <p className="muted">No player live right now</p>
        )}
      </div>

      <div className="player-board-columns">
        <div className="player-board-column">
          <h4 className="player-board-column-title">
            Up Next
            <span className="player-board-count">{upcoming.length}</span>
          </h4>
          <p className="muted player-board-hint">Auction order — who comes after the current player</p>
          {upcoming.length === 0 ? (
            <p className="muted player-board-empty">Queue empty</p>
          ) : (
            <ol className="player-board-queue">
              {upcoming.map((p, i) => (
                <li key={p.id}>
                  <span className="player-board-queue-num">{i + 1}</span>
                  <span className="player-board-queue-name">{p.name}</span>
                  <PosTags positions={p.positions} />
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="player-board-column">
          <h4 className="player-board-column-title">
            Sold
            <span className="player-board-count player-board-count-sold">{sold.length}</span>
          </h4>
          {sold.length === 0 ? (
            <p className="muted player-board-empty">No players sold yet</p>
          ) : (
            <ul className="player-board-done-list">
              {sold.map((p) => {
                const buyer = p.soldToCaptainId ? captainMap.get(p.soldToCaptainId) : undefined;
                return (
                  <li key={p.id} className="player-board-done-sold">
                    <div className="player-board-done-main">
                      <span>{p.name}</span>
                      <PosTags positions={p.positions} />
                    </div>
                    <div className="player-board-done-meta">
                      <strong>₹{p.soldPrice}</strong>
                      {buyer && <span className="muted">→ {buyer.teamName}</span>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <h4 className="player-board-column-title player-board-column-title-gap">
            Unsold
            <span className="player-board-count player-board-count-unsold">{unsold.length}</span>
          </h4>
          {unsold.length === 0 ? (
            <p className="muted player-board-empty">No unsold players</p>
          ) : (
            <ul className="player-board-done-list">
              {unsold.map((p) => (
                <li key={p.id} className="player-board-done-unsold">
                  <span>{p.name}</span>
                  <PosTags positions={p.positions} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
