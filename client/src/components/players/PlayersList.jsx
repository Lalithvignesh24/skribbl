import EmptyState from "../ui/EmptyState";

export default function PlayersList({ players, currentId, onPlayerClick }) {
  if (!players.length) {
    return <EmptyState text="No players joined yet." />;
  }

  return (
    <div className="space-y-2">
      {players.map((player, index) => (
        <button
          key={player.id}
          onClick={() => onPlayerClick(player)}
          className={`w-full rounded-xl border p-2 text-left transition hover:border-sky-300 ${
            player.id === currentId ? "border-sky-300 bg-sky-900/60" : "border-blue-700 bg-blue-900/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-yellow-300">#{index + 1}</span>
              <span>{player.avatar}</span>
              <span className="truncate text-sm font-semibold">{player.name}</span>
            </div>
            <span className="text-sm font-bold text-emerald-300">{player.score ?? 0}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
