import { Fragment, useEffect, useState } from 'react';
import type { Captain } from '../types';
import { formatRemainingSlots } from '../lib/auctionLogic';

interface CaptainDashboardProps {
  captains: Captain[];
  highlightCaptainId?: string | null;
}

export function CaptainDashboard({ captains, highlightCaptainId }: CaptainDashboardProps) {
  const approved = captains.filter((c) => c.status === 'approved');
  const [expanded, setExpanded] = useState<string | null>(highlightCaptainId ?? null);

  useEffect(() => {
    if (highlightCaptainId) setExpanded(highlightCaptainId);
  }, [highlightCaptainId, captains]);

  return (
    <div className="captain-dashboard">
      <h3>Captain Dashboard</h3>
      <div className="dashboard-table-wrap">
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>Captain</th>
              <th>Team</th>
              <th>Budget</th>
              <th>Bought</th>
              <th>Remaining Slots</th>
            </tr>
          </thead>
          <tbody>
            {approved.map((c) => (
              <Fragment key={c.id}>
                <tr
                  className={
                    c.id === highlightCaptainId ? 'highlight-row you-row' : ''
                  }
                  onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                >
                  <td>
                    {c.name}
                    {c.id === highlightCaptainId && (
                      <span className="you-badge">You</span>
                    )}
                  </td>
                  <td>{c.teamName}</td>
                  <td>₹{c.budget}</td>
                  <td>{c.squad.length}</td>
                  <td>{formatRemainingSlots(c)}</td>
                </tr>
                {expanded === c.id && c.squad.length > 0 && (
                  <tr className="squad-expand">
                    <td colSpan={5}>
                      <ul className="squad-list">
                        {c.squad.map((p) => (
                          <li key={p.playerId}>
                            <span className={`pos-tag pos-${p.position.toLowerCase()}`}>
                              {p.position}
                            </span>
                            {p.name} — ₹{p.price}
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
