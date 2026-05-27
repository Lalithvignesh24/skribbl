import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { useGameContext } from "../context/GameContext";
import { useSocket } from "../hooks/useSocket";
import { ensureSocketConnected } from "../services/socketService";

export default function PlayOnline() {
  const navigate = useNavigate();
  const location = useLocation();
  const socket = useSocket();
  const { currentPlayer, setRoom, setPlayers } = useGameContext();

  const [lobbyPlayers, setLobbyPlayers] = useState([]);
  const [countdown, setCountdown] = useState(60);
  const [canStart, setCanStart] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Connecting to server...");
  const [connectionError, setConnectionError] = useState("");
  const language = location.state?.language || "en";
  const matchmakeSentRef = useRef(false);

  useEffect(() => {
    if (!currentPlayer.name) {
      navigate("/", { replace: true });
      return;
    }

    const sock = ensureSocketConnected();
    matchmakeSentRef.current = false;

    const runMatchmake = () => {
      setConnectionError("");
      setStatusMessage("Searching for open lobbies...");
      sock.emit("matchmake_online", {
        name: currentPlayer.name,
        avatar: currentPlayer.avatar,
      });
      matchmakeSentRef.current = true;
    };

    const onUpdatePlayers = (updatedPlayers) => {
      setLobbyPlayers(updatedPlayers);
      setPlayers(updatedPlayers);

      if (updatedPlayers.length < 2) {
        setStatusMessage("Waiting for at least 2 players...");
      } else if (updatedPlayers.length >= 10) {
        setStatusMessage("Room full! Starting match...");
      } else {
        setStatusMessage("Enough players — match will start soon!");
      }
    };

    const onLobbyTimerUpdate = (data) => {
      setCountdown(data.timeLeft);
      setCanStart(Boolean(data.canStart));

      if (data.playerCount >= 10) {
        setStatusMessage("Room is full — launching game!");
      } else if (data.canStart && data.timeLeft <= 10) {
        setStatusMessage("Match starting...");
      } else if (data.canStart) {
        setStatusMessage("2+ players ready — game starts when timer ends or room fills");
      }
    };

    const onMatchReady = (payload) => {
      const roomId = typeof payload === "string" ? payload : payload?.roomId;
      const inProgress = typeof payload === "object" && payload?.inProgress;
      setRoom((prev) => ({
        ...prev,
        id: roomId,
        language,
        gameStarted: Boolean(inProgress),
      }));
      navigate(`/game/${roomId}`, { state: { mode: "join", inProgress } });
    };

    const onPlayerWaiting = () => {
      setStatusMessage("Game in progress — you'll join the next round");
    };

    const onRoomError = (message) => {
      setConnectionError(message);
      setStatusMessage("Could not join matchmaking");
    };

    const onConnect = () => {
      if (!matchmakeSentRef.current) {
        runMatchmake();
      }
    };

    const onConnectError = (err) => {
      setConnectionError(
        `Cannot reach game server. Is the backend running on port 3001? (${err.message})`,
      );
      setStatusMessage("Connection failed");
    };

    sock.on("connect", onConnect);
    sock.on("connect_error", onConnectError);
    sock.on("update_players", onUpdatePlayers);
    sock.on("lobby_timer_update", onLobbyTimerUpdate);
    sock.on("online_match_ready", onMatchReady);
    sock.on("player_waiting", onPlayerWaiting);
    sock.on("room_error", onRoomError);

    if (sock.connected) {
      runMatchmake();
    }

    return () => {
      sock.off("connect", onConnect);
      sock.off("connect_error", onConnectError);
      sock.off("update_players", onUpdatePlayers);
      sock.off("lobby_timer_update", onLobbyTimerUpdate);
      sock.off("online_match_ready", onMatchReady);
      sock.off("player_waiting", onPlayerWaiting);
      sock.off("room_error", onRoomError);
    };
  }, [socket, currentPlayer.name, currentPlayer.avatar, navigate, setPlayers, setRoom, language]);

  const handleCancel = () => {
    if (socket.connected) {
      socket.emit("leave_matchmaking");
    }
    navigate("/", { replace: true });
  };

  const handleRetry = () => {
    matchmakeSentRef.current = false;
    ensureSocketConnected();
    socket.emit("matchmake_online", {
      name: currentPlayer.name,
      avatar: currentPlayer.avatar,
    });
    matchmakeSentRef.current = true;
    setConnectionError("");
    setStatusMessage("Searching for open lobbies...");
  };

  return (
    <div className="pattern-bg flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md border border-slate-800 bg-slate-900 p-6 text-center shadow-2xl">
        <h2 className="mb-2 text-3xl font-black tracking-tight text-yellow-300">MATCHMAKING</h2>
        <p className="mb-6 text-sm font-semibold uppercase tracking-wider text-slate-400">
          {statusMessage}
        </p>

        {connectionError && (
          <div className="mb-4 rounded-xl border border-rose-500/50 bg-rose-950/50 p-3 text-left text-sm text-rose-200">
            {connectionError}
            <button
              type="button"
              onClick={handleRetry}
              className="mt-2 block w-full rounded-lg bg-rose-600 py-2 text-xs font-bold text-white hover:bg-rose-500"
            >
              Retry connection
            </button>
          </div>
        )}

        <div className="relative mx-auto mb-8 flex h-36 w-36 items-center justify-center rounded-full border-4 border-dashed border-sky-400">
          <div className="absolute inset-2 flex flex-col items-center justify-center rounded-full border border-slate-800 bg-slate-950 shadow-inner">
            <span className="text-4xl font-black tracking-tighter text-white">{countdown}s</span>
            <span className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-sky-400">
              {canStart ? "Ready" : "Waiting"}
            </span>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4 text-left">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
            Players in Lobby ({lobbyPlayers.length}/10):
          </p>
          <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
            {lobbyPlayers.length === 0 ? (
              <p className="text-center text-sm text-slate-500">No players yet...</p>
            ) : (
              lobbyPlayers.map((player, index) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/80 p-2.5 transition"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="text-xs font-bold text-yellow-400/80">#{index + 1}</span>
                    <span className="select-none text-xl">{player.avatar}</span>
                    <span className="truncate text-sm font-bold text-slate-200">{player.name}</span>
                  </div>
                  {player.id === socket.id && (
                    <span className="rounded-md border border-sky-500/30 bg-sky-500/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-sky-400">
                      You
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <Button
          onClick={handleCancel}
          className="w-full rounded-xl border border-rose-950/30 bg-slate-800 py-3 px-6 text-sm font-bold text-rose-400 transition hover:bg-slate-700"
        >
          Cancel Search
        </Button>
      </Card>
    </div>
  );
}
