import Button from "../ui/Button";

export default function GameHeader({ timer, roundText, roomId, playerCount, onCopyRoomId, onOpenSettings }) {
  return (
    <header className="mb-3 flex items-center justify-between rounded-2xl bg-slate-100 px-4 py-2 text-slate-900 shadow-lg">
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-red-500 px-3 py-1 text-lg font-bold text-white">{timer}</span>
        <span className="text-sm font-semibold">{roundText}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
          Players: {playerCount}
        </span>
        <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium">Room: {roomId}</span>
        <Button className="bg-indigo-600 text-white" onClick={onCopyRoomId}>
          Copy
        </Button>
        <Button className="bg-slate-900 text-white" onClick={onOpenSettings} aria-label="Open settings">
          ⚙
        </Button>
      </div>
    </header>
  );
}
