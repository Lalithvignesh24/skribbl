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
  const joinMode = location.state?.mode || "join";

  useEffect(() => {
    if (!currentPlayer.name) {
      navigate("/", { replace: true });
      return;
    }

    setRoom((prev) => ({ ...prev, id: roomId }));
    setMessages([]);
    socket.emit("join_room", { roomId, name: currentPlayer.name, avatar: currentPlayer.avatar, mode: joinMode });

    const onPlayers = (nextPlayers) => setPlayers(nextPlayers);
    const onTimer = (t) => setTimer(t);
    const onGameStarted = (data) => {
      setActiveDrawerId(data.drawerId);
      setWordHint(data.wordDisplay || "________");
      setGameStarted(true);
      setWordOptions([]);
    };
    const onSecret = (word) => setWordHint(word);
    const onChooseWord = (options) => {
      setWordOptions(options);
      setGameStarted(false);
    };
    const onRoundEnd = ({ word }) => {
      setToast(`Round ended. Word: ${word}`);
      setGameStarted(false);
      setWordOptions([]);
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
    socket.on("game_started", onGameStarted);
    socket.on("secret_word", onSecret);
    socket.on("choose_word", onChooseWord);
    socket.on("round_ended", onRoundEnd);
    socket.on("room_error", onRoomError);
    socket.on("receive_message", onMessage);

    return () => {
      socket.off("update_players", onPlayers);
      socket.off("timer_update", onTimer);
      socket.off("game_started", onGameStarted);
      socket.off("secret_word", onSecret);
      socket.off("choose_word", onChooseWord);
      socket.off("round_ended", onRoundEnd);
      socket.off("room_error", onRoomError);
      socket.off("receive_message", onMessage);
    };
  }, [roomId, socket, currentPlayer.avatar, currentPlayer.name, joinMode, navigate, setActiveDrawerId, setMessages, setPlayers, setRoom, setTimer, setWordHint]);

  const canDraw = useMemo(() => socket.id && socket.id === activeDrawerId, [activeDrawerId, socket.id]);
  const drawer = players.find((player) => player.id === activeDrawerId);
  const isOwner = players[0]?.id === socket.id;

  const handleSendMessage = (text) => {
    socket.emit("send_message", { roomId, message: text, name: currentPlayer.name });
  };

  const handleStartGame = () => socket.emit("start_game", roomId);
  const handleChooseWord = (word) => socket.emit("word_chosen", { roomId, word });
  const handleCopyRoomId = async () => {
    await navigator.clipboard.writeText(roomId);
    setToast("Room ID copied.");
  };

  return (
    <div className="pattern-bg relative min-h-screen p-3 lg:p-5">
      <GameHeader
        timer={timer}
        roomId={room.id || roomId}
        playerCount={players.length}
        roundText={`Round ${room.round}/${room.totalRounds}`}
        onCopyRoomId={handleCopyRoomId}
        onOpenSettings={() => setSettingsOpen((prev) => !prev)}
      />

      {!!toast && (
        <div className="mb-3 rounded-xl bg-slate-900/90 px-4 py-2 text-sm text-white shadow-lg">{toast}</div>
      )}

      <div className="relative">
        <SettingsPanel isOpen={settingsOpen} settings={settings} onChange={setSettings} />
      </div>

      {!gameStarted && !wordOptions.length && isOwner && (
        <div className="mb-3 flex justify-center">
          <button
            onClick={handleStartGame}
            className="rounded-2xl bg-lime-400 px-6 py-3 font-bold text-slate-900 transition hover:bg-lime-300"
          >
            Start Game
          </button>
        </div>
      )}

      {!!wordOptions.length && (
        <div className="mb-3 rounded-2xl bg-blue-900/80 p-3">
          <p className="mb-2 text-sm font-semibold text-blue-100">Choose a word:</p>
          <div className="flex flex-wrap gap-2">
            {wordOptions.map((word) => (
              <button
                key={word}
                onClick={() => handleChooseWord(word)}
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-sky-100"
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
