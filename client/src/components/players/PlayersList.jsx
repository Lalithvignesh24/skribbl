import EmptyState from "../ui/EmptyState";

export default function PlayersList({
  players,
  currentId,
  activeDrawerId,
  guessedPlayerIds = [],
  onPlayerClick,
}) {
  if (!players.length) {
    return <EmptyState text="No players joined yet." />;
  }

  return (
    <div className="space-y-2">
      {players.map((player, index) => {
        const isDrawer = player.id === activeDrawerId;
        const hasGuessed = guessedPlayerIds.includes(player.id);
        const isWaiting = Boolean(player.isWaiting);
        const isMe = player.id === currentId;

        return (
          <button
            key={player.id}
            onClick={() => onPlayerClick(player)}
            className={`w-full rounded-xl border p-2 text-left transition hover:border-sky-300 ${
              isMe ? "border-sky-300 bg-sky-900/60" : "border-blue-700 bg-blue-900/50"
            } ${hasGuessed ? "ring-2 ring-emerald-400/80" : ""} ${isDrawer ? "border-amber-400" : ""}`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="text-xs text-yellow-300">#{index + 1}</span>
                <span>{player.avatar}</span>
                <span className="truncate text-sm font-semibold">{player.name}</span>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {isDrawer && (
                  <span className="rounded bg-amber-500/30 px-1.5 py-0.5 text-[10px] font-bold text-amber-200">
                    DRAW
                  </span>
                )}
                {isWaiting && (
                  <span className="rounded bg-violet-500/30 px-1.5 py-0.5 text-[10px] font-bold text-violet-200">
                    WAIT
                  </span>
                )}
                {hasGuessed && !isDrawer && !isWaiting && (
                  <span className="rounded bg-emerald-500/30 px-1.5 py-0.5 text-[10px] font-bold text-emerald-200">
                    ✓
                  </span>
                )}
                <span className="text-sm font-bold text-emerald-300">{player.score ?? 0}</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
