import type { Captain } from '../types';
import { addCaptainMidAuction, adjustBudget, movePlayer } from '../lib/auctionService';

interface AdminPlayerManagementProps {
  roomId: string;
  captains: Captain[];
  startingBudget: number;
  newCaptainName: string;
  onNewCaptainNameChange: (v: string) => void;
  budgetCaptain: string;
  onBudgetCaptainChange: (v: string) => void;
  budgetAmount: string;
  onBudgetAmountChange: (v: string) => void;
  moveFrom: string;
  onMoveFromChange: (v: string) => void;
  moveTo: string;
  onMoveToChange: (v: string) => void;
  movePlayerId: string;
  onMovePlayerIdChange: (v: string) => void;
  onCaptainAdded: () => void;
  onBudgetUpdated: () => void;
  onPlayerMoved: () => void;
}

export function AdminPlayerManagement({
  roomId,
  captains,
  startingBudget,
  newCaptainName,
  onNewCaptainNameChange,
  budgetCaptain,
  onBudgetCaptainChange,
  budgetAmount,
  onBudgetAmountChange,
  moveFrom,
  onMoveFromChange,
  moveTo,
  onMoveToChange,
  movePlayerId,
  onMovePlayerIdChange,
  onCaptainAdded,
  onBudgetUpdated,
  onPlayerMoved,
}: AdminPlayerManagementProps) {
  const approved = captains.filter((c) => c.status === 'approved');
  const fromSquad = approved.find((c) => c.id === moveFrom)?.squad ?? [];

  return (
    <div className="admin-mgmt-grid">
      <div className="admin-mgmt-block">
        <h4>Add Captain</h4>
        <div className="form-row">
          <input
            placeholder="Captain name"
            value={newCaptainName}
            onChange={(e) => onNewCaptainNameChange(e.target.value)}
          />
          <button
            type="button"
            onClick={async () => {
              if (!newCaptainName.trim()) return;
              await addCaptainMidAuction(roomId, newCaptainName.trim(), startingBudget);
              onCaptainAdded();
            }}
          >
            Add
          </button>
        </div>
      </div>

      <div className="admin-mgmt-block">
        <h4>Adjust Budget</h4>
        <select value={budgetCaptain} onChange={(e) => onBudgetCaptainChange(e.target.value)}>
          <option value="">Select captain</option>
          {approved.map((c) => (
            <option key={c.id} value={c.id}>
              {c.teamName} ({c.name})
            </option>
          ))}
        </select>
        <input
          type="number"
          placeholder="New budget"
          value={budgetAmount}
          onChange={(e) => onBudgetAmountChange(e.target.value)}
        />
        <button
          type="button"
          onClick={async () => {
            if (!budgetCaptain || !budgetAmount) return;
            await adjustBudget(roomId, budgetCaptain, Number(budgetAmount));
            onBudgetUpdated();
          }}
        >
          Update
        </button>
      </div>

      <div className="admin-mgmt-block admin-mgmt-block-wide">
        <h4>Move Player</h4>
        <div className="form-row">
          <select value={moveFrom} onChange={(e) => onMoveFromChange(e.target.value)}>
            <option value="">From team</option>
            {approved.map((c) => (
              <option key={c.id} value={c.id}>
                {c.teamName}
              </option>
            ))}
          </select>
          <select value={moveTo} onChange={(e) => onMoveToChange(e.target.value)}>
            <option value="">To team</option>
            {approved.map((c) => (
              <option key={c.id} value={c.id}>
                {c.teamName}
              </option>
            ))}
          </select>
          <select value={movePlayerId} onChange={(e) => onMovePlayerIdChange(e.target.value)}>
            <option value="">Player</option>
            {fromSquad.map((p) => (
              <option key={p.playerId} value={p.playerId}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={async () => {
              if (!movePlayerId || !moveFrom || !moveTo) return;
              await movePlayer(roomId, movePlayerId, moveFrom, moveTo, captains);
              onPlayerMoved();
            }}
          >
            Move
          </button>
        </div>
      </div>
    </div>
  );
}
