import { useEffect, useMemo, useRef, useState } from "react";
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

function buildHintFromDisplay(display) {
  if (!display) return "________";
  return display;
}

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
    timerType,
    setTimerType,
    wordHint,
    setWordHint,
    activeDrawerId,
    setActiveDrawerId,
    guessedPlayerIds,
    setGuessedPlayerIds,
    hasGuessedCorrectly,
    setHasGuessedCorrectly,
  } = useGameContext();

  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState({ sound: true, music: true, volume: 70 });
  const [wordOptions, setWordOptions] = useState([]);
  const [wordSelectTimeLeft, setWordSelectTimeLeft] = useState(10);
  const [waitingForDrawer, setWaitingForDrawer] = useState(false);
  const [drawerChoosingName, setDrawerChoosingName] = useState("");
  const [toast, setToast] = useState("");
  const [gameStarted, setGameStarted] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [finalPodium, setFinalPodium] = useState([]);
  const [isSpectatorWaiting, setIsSpectatorWaiting] = useState(false);
  const [drawerWord, setDrawerWord] = useState("");
  const activeDrawerIdRef = useRef(activeDrawerId);

  useEffect(() => {
    activeDrawerIdRef.current = activeDrawerId;
  }, [activeDrawerId]);

  const joinMode = location.state?.mode || "join";

  useEffect(() => {
    if (!currentPlayer.name) {
      navigate("/", { replace: true });
      return;
    }

    setRoom((prev) => ({
      ...prev,
      id: roomId,
      round: prev.round || 1,
      totalRounds: prev.totalRounds || 3,
    }));
    setMessages([]);
    setHasGuessedCorrectly(false);
    setGuessedPlayerIds([]);

    socket.emit("join_room", {
      roomId,
      name: currentPlayer.name,
      avatar: currentPlayer.avatar,
      mode: joinMode,
    });

    const onPlayers = (nextPlayers) => {
      setPlayers(nextPlayers);
      const me = nextPlayers.find((p) => p.id === socket.id);
      setIsSpectatorWaiting(Boolean(me?.isWaiting));
    };

    const onTimer = (payload) => {
      const timeLeft = typeof payload === "object" ? payload.timeLeft : payload;
      const type = typeof payload === "object" ? payload.type : "round";
      setTimer(timeLeft);
      setTimerType(type);
      if (type === "word_select") {
        setWordSelectTimeLeft(timeLeft);
      }
    };

    const onRoomStateUpdate = (state) => {
      setRoom((prev) => ({
        ...prev,
        round: state.round,
        totalRounds: state.totalRounds,
        gameStarted: state.gameStarted,
        phase: state.phase,
      }));

      if (state.activeDrawerId) {
        setActiveDrawerId(state.activeDrawerId);
      }
      if (state.wordDisplay && socket.id !== state.activeDrawerId) {
        setWordHint(buildHintFromDisplay(state.wordDisplay));
      }
      if (state.guessedPlayerIds) {
        setGuessedPlayerIds(state.guessedPlayerIds);
        setHasGuessedCorrectly(state.guessedPlayerIds.includes(socket.id));
      }
      if (state.waitingPlayerIds) {
        setIsSpectatorWaiting(state.waitingPlayerIds.includes(socket.id));
      }
      if (state.gameStarted && state.phase === "drawing") {
        setGameStarted(true);
        setWaitingForDrawer(false);
        setWordOptions([]);
      }
      if (state.gameStarted) {
        setIsGameOver(false);
      }
      if (state.phase === "game_over") {
        setIsGameOver(true);
        setGameStarted(false);
      }
    };

    const onGameStarted = (data) => {
      setActiveDrawerId(data.drawerId);
      activeDrawerIdRef.current = data.drawerId;

      const amDrawer = socket.id === data.drawerId;
      if (!amDrawer) {
        setWordHint(buildHintFromDisplay(data.wordDisplay));
      }

      setGameStarted(true);
      setIsGameOver(false);
      setWordOptions([]);
      setWaitingForDrawer(false);
    };

    const onDrawerWord = ({ word }) => {
      if (word) setDrawerWord(word);
    };

    const onSecret = (word) => {
      if (socket.id === activeDrawerIdRef.current) {
        setDrawerWord(word);
      } else {
        setWordHint(word);
        setHasGuessedCorrectly(true);
      }
    };

    const onPrivateWarning = ({ message }) => {
      setToast(message);
      setTimeout(() => setToast(""), 3500);
    };

    const onHintUpdate = ({ wordDisplay }) => {
      if (socket.id !== activeDrawerIdRef.current) {
        setWordHint(buildHintFromDisplay(wordDisplay));
      }
    };

    const onChooseWord = (data) => {
      const payload = Array.isArray(data) ? { options: data } : data;

      if (payload.options?.length) {
        setWordOptions(payload.options);
        setWaitingForDrawer(false);
        setWordSelectTimeLeft(payload.timeLeft ?? 10);
        setGameStarted(false);
      } else {
        setWordOptions([]);
        setWaitingForDrawer(true);
        setDrawerChoosingName(payload.drawerName || "Drawer");
        setWordSelectTimeLeft(payload.timeLeft ?? 10);
        setActiveDrawerId(payload.drawerId || "");
        setGameStarted(false);
      }
    };

    const onRoundEnd = ({ word }) => {
      setToast(`Round ended! The word was: ${word}`);
      setGameStarted(false);
      setWordOptions([]);
      setWaitingForDrawer(false);
      setHasGuessedCorrectly(false);
      setGuessedPlayerIds([]);
      setDrawerWord("");
      setWordHint("________");
      setTimeout(() => setToast(""), 4000);
    };

    const onGameOver = (finalLeaderboard) => {
      setToast("Game Over! Final standings are in.");
      setGameStarted(false);
      setIsGameOver(true);
      setFinalPodium(finalLeaderboard);
      setWordOptions([]);
      setWaitingForDrawer(false);
    };

    const onRoomReset = () => {
      setIsGameOver(false);
      setGameStarted(false);
      setFinalPodium([]);
      setWordHint("________");
      setWordOptions([]);
      setWaitingForDrawer(false);
      setHasGuessedCorrectly(false);
      setGuessedPlayerIds([]);
      setToast("The host restarted the game.");
      setTimeout(() => setToast(""), 3000);
    };

    const onRoomError = (errorMessage) => {
      setToast(errorMessage);
      setTimeout(() => navigate("/", { replace: true }), 1200);
    };

    const onPlayerWaiting = () => {
      setIsSpectatorWaiting(true);
      setToast("You will join the next round.");
      setTimeout(() => setToast(""), 4000);
    };

    const onMessage = (msg) => {
      const isSystem = msg.isSystem || msg.name === "System";
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          playerName: msg.name || "System",
          text: msg.message,
          type: msg.isCorrect || isSystem || msg.isHidden ? "system" : "player",
          isCorrect: Boolean(msg.isCorrect),
          isHidden: Boolean(msg.isHidden),
        },
      ]);
    };

    socket.on("update_players", onPlayers);
    socket.on("timer_update", onTimer);
    socket.on("room_state_update", onRoomStateUpdate);
    socket.on("game_started", onGameStarted);
    socket.on("drawer_word", onDrawerWord);
    socket.on("secret_word", onSecret);
    socket.on("hint_update", onHintUpdate);
    socket.on("private_warning", onPrivateWarning);
    socket.on("choose_word", onChooseWord);
    socket.on("round_ended", onRoundEnd);
    socket.on("game_over", onGameOver);
    socket.on("room_reset", onRoomReset);
    socket.on("room_error", onRoomError);
    socket.on("receive_message", onMessage);
    socket.on("player_waiting", onPlayerWaiting);

    return () => {
      socket.off("update_players", onPlayers);
      socket.off("timer_update", onTimer);
      socket.off("room_state_update", onRoomStateUpdate);
      socket.off("game_started", onGameStarted);
      socket.off("drawer_word", onDrawerWord);
      socket.off("secret_word", onSecret);
      socket.off("hint_update", onHintUpdate);
      socket.off("private_warning", onPrivateWarning);
      socket.off("choose_word", onChooseWord);
      socket.off("round_ended", onRoundEnd);
      socket.off("game_over", onGameOver);
      socket.off("room_reset", onRoomReset);
      socket.off("room_error", onRoomError);
      socket.off("receive_message", onMessage);
      socket.off("player_waiting", onPlayerWaiting);
    };
  }, [
    roomId,
    socket,
    currentPlayer.avatar,
    currentPlayer.name,
    joinMode,
    navigate,
    setActiveDrawerId,
    setGuessedPlayerIds,
    setHasGuessedCorrectly,
    setMessages,
    setPlayers,
    setRoom,
    setTimer,
    setTimerType,
    setWordHint,
  ]);

  const canDraw = useMemo(
    () => Boolean(socket.id && socket.id === activeDrawerId && gameStarted),
    [activeDrawerId, gameStarted, socket.id],
  );

  const drawer = players.find((player) => player.id === activeDrawerId);
  const isOwner = players[0]?.id === socket.id;
  const isDrawer = socket.id === activeDrawerId;

  const displayTimer = timerType === "word_select" ? wordSelectTimeLeft : timer;
  const timerLabel =
    timerType === "word_select" ? "Choose word" : timerType === "round" ? "Round" : "Timer";

  const chatDisabled = isDrawer || !gameStarted || waitingForDrawer || isSpectatorWaiting;
  const chatLocked = hasGuessedCorrectly;

  const handleSendMessage = (text) => {
    if (chatDisabled) return;
    socket.emit("send_message", { roomId, message: text, name: currentPlayer.name });
  };

  const handleStartGame = () => socket.emit("start_game", roomId);
  const handleReconductGame = () => socket.emit("reconduct_game", roomId);

  const handleQuitRoom = () => {
    socket.disconnect();
    navigate("/", { replace: true });
  };

  const handleChooseWord = (word) => {
    socket.emit("choose_word", { roomId, word });
    setDrawerWord(word);
    setWordOptions([]);
  };

  const handleCopyRoomId = async () => {
    await navigator.clipboard.writeText(roomId);
    setToast("Room ID copied.");
    setTimeout(() => setToast(""), 2000);
  };

  const showStartButton =
    !room.gameStarted &&
    !gameStarted &&
    !wordOptions.length &&
    !waitingForDrawer &&
    isOwner &&
    !isGameOver &&
    players.length >= 2;

  return (
    <div className="pattern-bg relative flex h-screen max-h-screen flex-col overflow-hidden p-3 lg:p-5">
      <GameHeader
        timer={displayTimer}
        roomId={room.id || roomId}
        playerCount={players.length}
        roundText={`Round ${room.round || 1}/${room.totalRounds || 3}`}
        timerLabel={timerLabel}
        onCopyRoomId={handleCopyRoomId}
        onOpenSettings={() => setSettingsOpen((prev) => !prev)}
      />

      {!!toast && (
        <div className="fixed top-20 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-slate-700 bg-slate-900/90 px-6 py-3 text-sm font-bold text-white shadow-xl">
          {toast}
        </div>
      )}

      <div className="relative">
        <SettingsPanel isOpen={settingsOpen} settings={settings} onChange={setSettings} />
      </div>

      {showStartButton && (
        <div className="mb-3 flex justify-center">
          <button
            onClick={handleStartGame}
            className="rounded-2xl bg-lime-400 px-8 py-4 text-lg font-black text-slate-900 shadow-md transition hover:bg-lime-300"
          >
            START GAME
          </button>
        </div>
      )}

      {isGameOver && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-amber-400 bg-slate-900 p-8 text-center shadow-2xl">
            <h2 className="mb-2 text-3xl font-black text-amber-400">FINAL PODIUM</h2>
            <p className="mb-6 text-sm text-slate-400">All {room.totalRounds || 3} rounds complete!</p>

            <div className="mb-8 space-y-3">
              {finalPodium.map((player, index) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between rounded-xl border p-3 ${
                    index === 0
                      ? "border-amber-400 bg-amber-500/20 font-bold"
                      : "border-slate-700 bg-slate-800/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                    </span>
                    <span className="text-lg">{player.avatar}</span>
                    <span className="max-w-[150px] truncate text-md font-semibold text-white">
                      {player.name}
                    </span>
                  </div>
                  <span className="font-black text-emerald-400">{player.score} pts</span>
                </div>
              ))}
            </div>

            {isOwner ? (
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleReconductGame}
                  className="w-full rounded-xl bg-lime-400 px-6 py-3 font-black text-slate-900 shadow-lg transition hover:bg-lime-300"
                >
                  Restart Game
                </button>
                <button
                  onClick={handleQuitRoom}
                  className="w-full rounded-xl bg-rose-600 px-6 py-2 font-bold text-white transition hover:bg-rose-500"
                >
                  Close Room
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="animate-pulse text-sm text-slate-400">Waiting for host to restart...</p>
                <button
                  onClick={handleQuitRoom}
                  className="w-full rounded-xl border border-rose-900/50 bg-slate-800 px-6 py-2 font-bold text-rose-400 transition hover:bg-slate-700"
                >
                  Leave Lobby
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {!!wordOptions.length && isDrawer && (
        <div className="mx-auto mb-3 max-w-xl rounded-2xl border border-blue-500 bg-blue-900/90 p-4 shadow-xl">
          <p className="mb-1 text-center text-md font-bold text-blue-100">
            Choose a word to draw ({wordSelectTimeLeft}s)
          </p>
          <div className="flex justify-center gap-3">
            {wordOptions.map((word) => (
              <button
                key={word}
                onClick={() => handleChooseWord(word)}
                className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-slate-900 shadow transition hover:bg-sky-100"
              >
                {word}
              </button>
            ))}
          </div>
        </div>
      )}

      {isSpectatorWaiting && (
        <div className="mx-auto mb-3 max-w-xl rounded-2xl border border-violet-500 bg-violet-900/90 p-4 text-center shadow-xl">
          <p className="text-md font-bold text-violet-100">Waiting for next round</p>
          <p className="mt-1 text-sm text-violet-300">
            You joined mid-game. Watch the current round — you will play starting next round.
          </p>
        </div>
      )}

      {waitingForDrawer && !isDrawer && !isSpectatorWaiting && (
        <div className="mx-auto mb-3 max-w-xl rounded-2xl border border-slate-600 bg-slate-900/90 p-4 text-center shadow-xl">
          <p className="text-md font-bold text-slate-200">
            {drawerChoosingName} is choosing a word...
          </p>
          <p className="mt-1 text-sm text-slate-400">Round starts in {wordSelectTimeLeft}s</p>
        </div>
      )}

      <div className="min-h-0 flex-1">
      <GameShell
        left={
          <PlayersList
            players={players}
            currentId={socket.id}
            activeDrawerId={activeDrawerId}
            guessedPlayerIds={guessedPlayerIds}
            onPlayerClick={(p) => setSelectedPlayer(p)}
          />
        }
        center={
          <div className="flex min-h-0 flex-1 flex-col">
            <WordHintBar
              hint={wordHint}
              drawerWord={drawerWord}
              isDrawer={isDrawer}
              drawerName={drawer?.name}
            />
            <DrawingBoard socket={socket} roomId={roomId} canDraw={canDraw} />
          </div>
        }
        right={
          <ChatPanel
            messages={messages}
            onSend={handleSendMessage}
            disabled={chatDisabled}
            chatLocked={chatLocked}
            disabledReason={
              isSpectatorWaiting
                ? "Waiting for the next round to start."
                : isDrawer
                  ? "Drawers cannot type in chat."
                  : undefined
            }
          />
        }
      />
      </div>

      <PlayerOptionsModal
        player={selectedPlayer}
        isOpen={Boolean(selectedPlayer)}
        onClose={() => setSelectedPlayer(null)}
      />
    </div>
  );
}
