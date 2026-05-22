import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import ChatPanel from "../components/chat/ChatPanel";
import DrawingBoard from "../components/drawing/DrawingBoard";
import WordHintBar from "../components/game/WordHintBar";
import GameHeader from "../components/layout/GameHeader";
import GameShell from "../components/layout/GameShell";
import PlayerOptionsModal from "../components/modals/PlayerOptionsModal";
import SettingsPanel from "../components/modals/SettingsPanel";
import PlayersList from "../components/players/PlayersList";
import { useGameContext } from "../context/GameContext";
import { useSocket } from "../hooks/useSocket";

export default function GamePage() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const socket = useSocket();
  
  const {
    currentPlayer,
    room,
    setRoom,
    players,
    setPlayers,
    messages,
    setMessages,
    timer,
    setTimer,
    wordHint,
    setWordHint,
    activeDrawerId,
    setActiveDrawerId,
  } = useGameContext();

  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState({ sound: true, music: true, volume: 70 });
  const [wordOptions, setWordOptions] = useState([]);
  const [toast, setToast] = useState("");
  const [gameStarted, setGameStarted] = useState(false);
  
  // NEW States for structural end-of-game flows
  const [isGameOver, setIsGameOver] = useState(false);
  const [finalPodium, setFinalPodium] = useState([]);

  const joinMode = location.state?.mode || "join";

  useEffect(() => {
    if (!currentPlayer.name) {
      navigate("/", { replace: true });
      return;
    }

    setRoom((prev) => ({ ...prev, id: roomId, round: prev.round || 1, totalRounds: prev.totalRounds || 3 }));
    setMessages([]);
    socket.emit("join_room", { roomId, name: currentPlayer.name, avatar: currentPlayer.avatar, mode: joinMode });

    const onPlayers = (nextPlayers) => setPlayers(nextPlayers);
    const onTimer = (t) => setTimer(t);
    
    const onRoomStateUpdate = (state) => {
      setRoom((prev) => ({
        ...prev,
        round: state.round,
        totalRounds: state.totalRounds,
        gameStarted: state.gameStarted // Sync starting parameters
      }));
      if (state.gameStarted) {
        setGameStarted(true);
        setIsGameOver(false);
      }
    };

    const onGameStarted = (data) => {
      setActiveDrawerId(data.drawerId);
      setWordHint(data.wordDisplay || "________");
      setGameStarted(true);
      setIsGameOver(false);
      setWordOptions([]);
    };
    
    const onSecret = (word) => setWordHint(word);
    
    const onChooseWord = (options) => {
      setWordOptions(options);
      setGameStarted(false); 
    };
    
    const onRoundEnd = ({ word }) => {
      setToast(`Turn ended! Word was: ${word}`);
      setGameStarted(false);
      setWordOptions([]);
      setTimeout(() => setToast(""), 4000);
    };

    const onGameOver = (finalLeaderboard) => {
      setToast("🎉 3 Rounds Completed! Game Over!");
      setGameStarted(false);
      setIsGameOver(true);
      setFinalPodium(finalLeaderboard);
      setWordOptions([]);
    };

    const onRoomReset = () => {
      setIsGameOver(false);
      setGameStarted(false);
      setFinalPodium([]);
      setWordHint("________");
      setToast("The game has been restarted by the owner!");
      setTimeout(() => setToast(""), 3000);
    };

    const onRoomError = (errorMessage) => {
      setToast(errorMessage);
      setTimeout(() => navigate("/", { replace: true }), 1200);
    };
    
    const onMessage = (msg) => {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          playerName: msg.name || "System",
          text: msg.message,
          type: msg.name ? "player" : "system",
          isCorrect: Boolean(msg.isCorrect),
        },
      ]);
    };

    socket.on("update_players", onPlayers);
    socket.on("timer_update", onTimer);
    socket.on("room_state_update", onRoomStateUpdate);
    socket.on("game_started", onGameStarted);
    socket.on("secret_word", onSecret);
    socket.on("choose_word", onChooseWord);
    socket.on("round_ended", onRoundEnd);
    socket.on("game_over", onGameOver);
    socket.on("room_reset", onRoomReset);
    socket.on("room_error", onRoomError);
    socket.on("receive_message", onMessage);

    return () => {
      socket.off("update_players", onPlayers);
      socket.off("timer_update", onTimer);
      socket.off("room_state_update", onRoomStateUpdate);
      socket.off("game_started", onGameStarted);
      socket.off("secret_word", onSecret);
      socket.off("choose_word", onChooseWord);
      socket.off("round_ended", onRoundEnd);
      socket.off("game_over", onGameOver);
      socket.off("room_reset", onRoomReset);
      socket.off("room_error", onRoomError);
      socket.off("receive_message", onMessage);
    };
  }, [roomId, socket, currentPlayer.avatar, currentPlayer.name, joinMode, navigate, setActiveDrawerId, setMessages, setPlayers, setRoom, setTimer, setWordHint]);

  const canDraw = useMemo(() => socket.id && socket.id === activeDrawerId, [activeDrawerId, socket.id]);
  const drawer = players.find((player) => player.id === activeDrawerId);
  const isOwner = players[0]?.id === socket.id;

  const handleSendMessage = (text) => {
    if (canDraw) {
      setToast("Drawers cannot type in the chat!");
      setTimeout(() => setToast(""), 2000);
      return;
    }
    socket.emit("send_message", { roomId, message: text, name: currentPlayer.name });
  };

  const handleStartGame = () => socket.emit("start_game", roomId);
  const handleReconductGame = () => socket.emit("reconduct_game", roomId);
  
  const handleQuitRoom = () => {
    socket.disconnect();
    navigate("/", { replace: true });
  };
  
  const handleChooseWord = (word) => socket.emit("word_chosen", { roomId, word });
  
  const handleCopyRoomId = async () => {
    await navigator.clipboard.writeText(roomId);
    setToast("Room ID copied.");
    setTimeout(() => setToast(""), 2000);
  };

  return (
    <div className="pattern-bg relative min-h-screen p-3 lg:p-5">
      <GameHeader
        timer={timer}
        roomId={room.id || roomId}
        playerCount={players.length}
        roundText={`Round ${room.round || 1}/${room.totalRounds || 3}`}
        onCopyRoomId={handleCopyRoomId}
        onOpenSettings={() => setSettingsOpen((prev) => !prev)}
      />

      {!!toast && (
        <div className="fixed top-20 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-slate-900/90 px-6 py-3 text-sm font-bold text-white shadow-xl border border-slate-700">
          {toast}
        </div>
      )}

      <div className="relative">
        <SettingsPanel isOpen={settingsOpen} settings={settings} onChange={setSettings} />
      </div>

      {/* FIX 1: Hide completely if game Loop is initiated or active */}
      {!room.gameStarted && !gameStarted && !wordOptions.length && isOwner && !isGameOver && (
        <div className="mb-3 flex justify-center">
          <button
            onClick={handleStartGame}
            className="rounded-2xl bg-lime-400 px-8 py-4 text-lg font-black text-slate-900 transition hover:bg-lime-300 shadow-md"
          >
            START GAME
          </button>
        </div>
      )}

      {/* FIX 2: Final Game Over Screen Overlay Podium */}
      {isGameOver && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-400 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
            <h2 className="text-3xl font-black text-amber-400 mb-2">🏆 FINAL PODIUM 🏆</h2>
            <p className="text-slate-400 text-sm mb-6">All 3 rounds complete!</p>
            
            <div className="space-y-3 mb-8">
              {finalPodium.map((player, index) => (
                <div 
                  key={player.id} 
                  className={`flex items-center justify-between p-3 rounded-xl border ${
                    index === 0 ? "bg-amber-500/20 border-amber-400 font-bold" : "bg-slate-800/50 border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}</span>
                    <span className="text-lg">{player.avatar}</span>
                    <span className="text-white text-md font-semibold truncate max-w-[150px]">{player.name}</span>
                  </div>
                  <span className="text-emerald-400 font-black">{player.score} pts</span>
                </div>
              ))}
            </div>

            {/* Context Actions dependent on Ownership status */}
            {isOwner ? (
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleReconductGame}
                  className="w-full bg-lime-400 hover:bg-lime-300 text-slate-900 font-black py-3 px-6 rounded-xl transition shadow-lg"
                >
                  🔄 Reconduct Game (Restart)
                </button>
                <button
                  onClick={handleQuitRoom}
                  className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 px-6 rounded-xl transition"
                >
                  🚪 Close & Quit Room
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-slate-400 animate-pulse">Waiting for Host to restart or disband...</p>
                <button
                  onClick={handleQuitRoom}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-rose-400 font-bold py-2 px-6 rounded-xl transition border border-rose-900/50"
                >
                  🚪 Leave Lobby
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {!!wordOptions.length && (
        <div className="mb-3 rounded-2xl bg-blue-900/90 p-4 shadow-xl border border-blue-500 max-w-xl mx-auto">
          <p className="mb-3 text-md font-bold text-blue-100 text-center">👇 Select a Secret Word to Draw:</p>
          <div className="flex justify-center gap-3">
            {wordOptions.map((word) => (
              <button
                key={word}
                onClick={() => handleChooseWord(word)}
                className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-slate-900 hover:bg-sky-100 transition shadow"
              >
                {word}
              </button>
            ))}
          </div>
        </div>
      )}

      <GameShell
        left={<PlayersList players={players} currentId={socket.id} onPlayerClick={(p) => setSelectedPlayer(p)} />}
        center={
          <>
            <WordHintBar hint={wordHint} drawerName={drawer?.name} />
            <DrawingBoard socket={socket} roomId={roomId} canDraw={canDraw} />
          </>
        }
        right={<ChatPanel messages={messages} onSend={handleSendMessage} />}
      />

      <PlayerOptionsModal player={selectedPlayer} isOpen={Boolean(selectedPlayer)} onClose={() => setSelectedPlayer(null)} />
    </div>
  );
}