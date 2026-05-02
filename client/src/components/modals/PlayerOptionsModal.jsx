import Button from "../ui/Button";
import Modal from "./Modal";

export default function PlayerOptionsModal({ player, isOpen, onClose }) {
  if (!player) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={player.name}>
      <div className="space-y-3">
        <div className="flex items-center gap-3 rounded-xl bg-blue-700/70 p-3">
          <span className="text-3xl">{player.avatar}</span>
          <div>
            <p className="font-semibold">{player.name}</p>
            <p className="text-xs text-blue-200">Score: {player.score}</p>
          </div>
        </div>
        <Button className="w-full bg-yellow-500 text-slate-900 hover:bg-yellow-400">Vote Kick</Button>
        <Button className="w-full bg-slate-400 text-slate-900 hover:bg-slate-300">Mute</Button>
        <Button className="w-full bg-rose-500 text-white hover:bg-rose-400">Report</Button>
      </div>
    </Modal>
  );
}
