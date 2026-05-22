import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { useGameContext } from "../context/GameContext";
import { useSocket } from "../hooks/useSocket";

export default function PlayOnline() {
  const navigate = useNavigate();
  const location = useLocation();
  const socket = useSocket();
  const { currentPlayer, setRoom, setPlayers } = useGameContext();

  const [lobbyPlayers, setLobbyPlayers] = useState([]);
  const [countdown, setCountdown] = useState(60);
  const [statusMessage, setStatusMessage] = useState("Searching for open lobbies...");
  const language = location.state?.language || "en";

  useEffect(() => {
    // Redirect back home if user info is missing
    if (!currentPlayer.name) {
      navigate("/", { replace: true });
      return;
    }

    // Trigger the matchmaking sequence on the server
    socket.emit("matchmake_online", {
      name: currentPlayer.name,
      avatar: currentPlayer.avatar,
    });

    const onUpdatePlayers = (updatedPlayers) => {
      setLobbyPlayers(updatedPlayers);
      setPlayers(updatedPlayers); // Sync global context state
      
      if (updatedPlayers.length === 1) {
        setStatusMessage("Waiting for more players to join...");
      } else {
        setStatusMessage("Match found! Filling room slots...");
      }
    };

    const onLobbyTimerUpdate = (data) => {
      setCountdown(data.timeLeft);
      if (data.timeLeft <= 10 && data.canStart) {
        setStatusMessage("📢 Match starting immediately!");
      }
    };

    const onMatchReady = (finalRoomId) => {
      setRoom((prev) => ({ ...prev, id: finalRoomId, language }));
      // Push directly to your existing unified GamePage
      navigate(`/game/${finalRoomId}`, { state: { mode: "join" } });
    };

    socket.on("update_players", onUpdatePlayers);
    socket.on("lobby_timer_update", onLobbyTimerUpdate);
    socket.on("online_match_ready", onMatchReady);

    return () => {
      socket.off("update_players", onUpdatePlayers);
      socket.off("lobby_timer_update", onLobbyTimerUpdate);
      socket.off("online_match_ready", onMatchReady);
    };
  }, [socket, currentPlayer, navigate, setPlayers, setRoom, language]);

  const handleCancel = () => {
    socket.disconnect();
    // Reconnect to restore the clean client instance
    socket.connect(); 
    navigate("/", { replace: true });
  };

  return (
    <div className="pattern-bg flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 border border-slate-800 bg-slate-900 text-center shadow-2xl">
        <h2 className="text-3xl font-black text-yellow-300 mb-2 tracking-tight">MATCHMAKING</h2>
        <p className="text-sm text-slate-400 mb-6 font-semibold uppercase tracking-wider">{statusMessage}</p>

        {/* Big Countdown Timer Circle */}
        <div className="relative w-36 h-36 mx-auto mb-8 flex items-center justify-center rounded-full border-4 border-dashed border-sky-400 animate-spin-slow">
          <div className="absolute inset-2 bg-slate-950 rounded-full flex flex-col items-center justify-center border border-slate-800 shadow-inner">
            <span className="text-4xl font-black text-white tracking-tighter">{countdown}s</span>
            <span className="text-[10px] font-bold text-sky-400 tracking-widest uppercase mt-0.5">Remaining</span>
          </div>
        </div>

        {/* Connected Players Queue Box */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 mb-6 text-left">
          <p className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">
            Players in Lobby ({lobbyPlayers.length}/10):
          </p>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {lobbyPlayers.map((player, index) => (
              <div 
                key={player.id} 
                className="flex items-center justify-between bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl transition"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xs font-bold text-yellow-400/80">#{index + 1}</span>
                  <span className="text-xl select-none">{player.avatar}</span>
                  <span className="text-sm font-bold text-slate-200 truncate">{player.name}</span>
                </div>
                {player.id === socket.id && (
                  <span className="text-[10px] font-black tracking-wider bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded-md border border-sky-500/30 uppercase">You</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <Button 
          onClick={handleCancel}
          className="w-full bg-slate-800 hover:bg-slate-700 text-rose-400 font-bold py-3 px-6 rounded-xl transition border border-rose-950/30 text-sm"
        >
          ❌ Cancel Search & Exit
        </Button>
      </Card>
    </div>
  );
}