import {
  ROUND_DURATION_SEC,
  ROUND_END_DELAY_MS,
  TOTAL_ROUNDS,
  TURN_TRANSITION_MS,
  WORD_SELECT_SEC,
} from "./constants.js";
import { scoreCorrectGuess, scoreDrawerBonus, getSecondsRemaining } from "./scoring.js";
import { clearAllTimers, clearTimer, startInterval } from "./timerManager.js";
import { getRoom } from "../utils/roomManager.js";
import { emitSystemMessage } from "./messages.js";
import {
  clearHintState,
  emitHintUpdate,
  getPublicHintDisplay,
  initHintState,
  tickHintReveal,
} from "./hintScheduler.js";
import {
  buildWordDisplay,
  fetchWordOptions,
  markWordUsed,
} from "./wordService.js";

export function getEligiblePlayers(room) {
  return room.players.filter((p) => !p.joinedMidGame);
}

export function getDrawer(room) {
  const eligible = getEligiblePlayers(room);
  return eligible[room.currentDrawerIndex] || null;
}

export function buildRoomState(room) {
  const drawer = getDrawer(room);
  return {
    round: room.round,
    totalRounds: room.totalRounds,
    gameStarted: room.gameStarted,
    phase: room.phase,
    activeDrawerId: drawer?.id || null,
    activeDrawerName: drawer?.name || null,
    wordDisplay: room.secretWord ? getPublicHintDisplay(room) : null,
    guessedPlayerIds: [...(room.guessedPlayers || [])],
    waitingPlayerIds: room.players.filter((p) => p.joinedMidGame).map((p) => p.id),
    timer: room.timer,
    timerType: room.timerType,
  };
}

export function emitRoomState(io, roomId, room) {
  io.to(roomId).emit("room_state_update", buildRoomState(room));
}

export function emitPlayers(io, roomId, room) {
  io.to(roomId).emit(
    "update_players",
    room.players.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      score: p.score || 0,
      isWaiting: Boolean(p.joinedMidGame),
    })),
  );
}

function emitTimer(io, roomId, room) {
  io.to(roomId).emit("timer_update", {
    timeLeft: room.timer,
    type: room.timerType,
  });
}

function countActiveGuessers(room, drawerId) {
  return getEligiblePlayers(room).filter((p) => p.id !== drawerId).length;
}

export async function beginTurn(io, roomId) {
  const room = getRoom(roomId);
  if (!room || !room.gameStarted) return;

  const eligible = getEligiblePlayers(room);
  if (eligible.length === 0) {
    endGame(io, roomId);
    return;
  }

  if (room.currentDrawerIndex >= eligible.length) {
    room.currentDrawerIndex = 0;
  }

  const drawer = getDrawer(room);
  if (!drawer) {
    endGame(io, roomId);
    return;
  }

  clearTimer(room, "round");
  clearTimer(room, "wordSelect");

  room.phase = "word_select";
  room.secretWord = "";
  room.guessedPlayers = [];
  clearHintState(room);
  room.timer = WORD_SELECT_SEC;
  room.timerType = "word_select";

  io.to(roomId).emit("clear_canvas");

  const options = await fetchWordOptions(room, 3);
  room.wordOptions = options;

  io.to(drawer.id).emit("choose_word", {
    options: options.map((o) => o.text),
    timeLeft: WORD_SELECT_SEC,
  });

  io.to(roomId).except(drawer.id).emit("choose_word", {
    options: null,
    drawerId: drawer.id,
    drawerName: drawer.name,
    timeLeft: WORD_SELECT_SEC,
  });

  emitRoomState(io, roomId, room);
  emitTimer(io, roomId, room);

  startInterval(room, "wordSelect", () => {
    room.timer--;
    emitTimer(io, roomId, room);

    if (room.timer <= 0) {
      clearTimer(room, "wordSelect");
      const pick =
        room.wordOptions?.[Math.floor(Math.random() * (room.wordOptions?.length || 1))];
      if (pick) {
        startDrawingRound(io, roomId, pick.text || pick);
      }
    }
  });
}

export function startDrawingRound(io, roomId, wordText) {
  const room = getRoom(roomId);
  if (!room || room.phase === "drawing") return;

  clearTimer(room, "wordSelect");

  const drawer = getDrawer(room);
  if (!drawer || !wordText) return;

  room.secretWord = wordText;
  markWordUsed(room, wordText);
  room.phase = "drawing";
  room.wordOptions = [];
  room.timer = ROUND_DURATION_SEC;
  room.timerType = "round";
  room.guessedPlayers = [];

  initHintState(room, wordText);
  const wordDisplay = getPublicHintDisplay(room);

  // Drawer-only word (never overwritten by guesser hint state on client)
  io.to(drawer.id).emit("drawer_word", { word: wordText });
  io.to(drawer.id).emit("secret_word", wordText);

  io.to(roomId).emit("game_started", {
    drawerId: drawer.id,
    drawerName: drawer.name,
    wordDisplay,
  });

  emitHintUpdate(io, roomId, room, drawer.id);
  emitRoomState(io, roomId, room);
  emitTimer(io, roomId, room);

  startInterval(room, "round", () => {
    room.timer--;
    emitTimer(io, roomId, room);

    if (tickHintReveal(room)) {
      emitHintUpdate(io, roomId, room, drawer.id);
      emitRoomState(io, roomId, room);
    }

    const guessersCount = countActiveGuessers(room, drawer.id);
    const allGuessed =
      guessersCount > 0 && room.guessedPlayers.length >= guessersCount;

    if (room.timer <= 0 || allGuessed) {
      clearTimer(room, "round");
      endTurn(io, roomId);
    }
  });
}

export function handleCorrectGuess(io, roomId, socketId, playerName) {
  const room = getRoom(roomId);
  if (!room || room.phase !== "drawing" || !room.secretWord) return false;

  const drawer = getDrawer(room);
  if (!drawer || socketId === drawer.id) return false;

  const guesser = room.players.find((p) => p.id === socketId);
  if (!guesser || guesser.joinedMidGame) return false;
  if (room.guessedPlayers.includes(socketId)) return false;

  const secondsLeft = getSecondsRemaining(room);
  scoreCorrectGuess(guesser, secondsLeft);
  scoreDrawerBonus(drawer, 1);
  room.guessedPlayers.push(socketId);

  emitPlayers(io, roomId, room);
  emitRoomState(io, roomId, room);

  io.to(socketId).emit("secret_word", room.secretWord);

  io.to(roomId).emit("receive_message", {
    name: "System",
    message: `${playerName} guessed correctly!`,
    isCorrect: true,
  });

  const guessersCount = countActiveGuessers(room, drawer.id);
  if (guessersCount > 0 && room.guessedPlayers.length >= guessersCount) {
    clearTimer(room, "round");
    endTurn(io, roomId);
  }

  return true;
}

function endTurn(io, roomId) {
  const room = getRoom(roomId);
  if (!room) return;

  clearHintState(room);
  room.phase = "round_end";
  room.timerType = "round_end";

  io.to(roomId).emit("round_ended", {
    word: room.secretWord,
    drawerId: getDrawer(room)?.id,
  });

  clearTimer(room, "roundEnd");
  room.timers.roundEnd = setTimeout(() => advanceToNextTurn(io, roomId), ROUND_END_DELAY_MS);
}

function advanceToNextTurn(io, roomId) {
  const room = getRoom(roomId);
  if (!room || !room.gameStarted) return;

  const eligible = getEligiblePlayers(room);

  room.currentDrawerIndex++;
  room.turnsCompleted = (room.turnsCompleted || 0) + 1;

  if (room.currentDrawerIndex >= eligible.length) {
    room.currentDrawerIndex = 0;
    room.round++;

    const promoted = room.players.filter((p) => p.joinedMidGame);
    room.players.forEach((p) => {
      p.joinedMidGame = false;
    });

    if (promoted.length > 0) {
      emitSystemMessage(
        io,
        roomId,
        `${promoted.map((p) => p.name).join(", ")} joined the active roster`,
      );
      emitPlayers(io, roomId, room);
    }

    if (room.round > room.totalRounds) {
      endGame(io, roomId);
      return;
    }
  }

  emitRoomState(io, roomId, room);
  room.timers.turnDelay = setTimeout(() => beginTurn(io, roomId), TURN_TRANSITION_MS);
}

function endGame(io, roomId) {
  const room = getRoom(roomId);
  if (!room) return;

  clearAllTimers(room);

  room.phase = "game_over";
  room.gameStarted = false;

  const leaderboard = [...room.players].sort((a, b) => (b.score || 0) - (a.score || 0));

  io.to(roomId).emit("game_over", leaderboard);
  emitRoomState(io, roomId, room);
}

export function startGame(io, roomId) {
  const room = getRoom(roomId);
  if (!room || room.players.length < 1) return false;
  if (room.phase === "word_select" || room.phase === "drawing" || room.phase === "round_end") {
    return false;
  }

  clearAllTimers(room);

  room.gameStarted = true;
  room.phase = "playing";
  room.round = 1;
  room.totalRounds = TOTAL_ROUNDS;
  room.currentDrawerIndex = Math.floor(Math.random() * getEligiblePlayers(room).length);
  room.turnsCompleted = 0;
  room.usedWords = [];
  room.secretWord = "";
  room.guessedPlayers = [];

  room.players.forEach((p) => {
    p.score = 0;
    p.joinedMidGame = false;
  });

  emitPlayers(io, roomId, room);
  emitRoomState(io, roomId, room);

  beginTurn(io, roomId);
  return true;
}

export function resetRoomForLobby(io, roomId) {
  const room = getRoom(roomId);
  if (!room) return;

  clearAllTimers(room);

  room.gameStarted = false;
  room.phase = "lobby";
  room.round = 1;
  room.currentDrawerIndex = 0;
  room.secretWord = "";
  room.usedWords = [];
  room.guessedPlayers = [];
  room.wordOptions = [];

  room.players.forEach((p) => {
    p.score = 0;
    p.joinedMidGame = false;
  });

  emitPlayers(io, roomId, room);
  emitRoomState(io, roomId, room);
  io.to(roomId).emit("room_reset");
}

export function onPlayerRemovedFromActiveGame(io, roomId, removedSocketId) {
  const room = getRoom(roomId);
  if (!room || !room.gameStarted) return;

  const eligible = getEligiblePlayers(room);

  if (room.currentDrawerIndex >= eligible.length) {
    room.currentDrawerIndex = Math.max(0, eligible.length - 1);
  }

  const drawer = getDrawer(room);
  const wasDrawer = !drawer || removedSocketId === drawer.id;

  if (eligible.length === 0) {
    emitRoomState(io, roomId, room);
    return;
  }

  if (wasDrawer && (room.phase === "word_select" || room.phase === "drawing")) {
    clearTimer(room, "wordSelect");
    clearTimer(room, "round");
    if (room.timers?.roundEnd) {
      clearTimeout(room.timers.roundEnd);
      room.timers.roundEnd = null;
    }
    endTurn(io, roomId);
  } else {
    emitRoomState(io, roomId, room);
  }
}

export function syncPlayerOnJoin(io, socket, roomId, room) {
  const me = room.players.find((p) => p.id === socket.id);

  emitRoomState(io, roomId, room);
  socket.emit(
    "update_players",
    room.players.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      score: p.score || 0,
      isWaiting: Boolean(p.joinedMidGame),
    })),
  );

  if (me?.joinedMidGame) {
    socket.emit("player_waiting", {
      message: "You will join the next round.",
    });
    return;
  }

  if (room.phase === "word_select") {
    const drawer = getDrawer(room);
    if (drawer?.id === socket.id && room.wordOptions?.length) {
      socket.emit("choose_word", {
        options: room.wordOptions.map((o) => o.text || o),
        timeLeft: room.timer,
      });
    } else if (drawer) {
      socket.emit("choose_word", {
        options: null,
        drawerId: drawer.id,
        drawerName: drawer.name,
        timeLeft: room.timer,
      });
    }
  }

  if (room.phase === "drawing" && room.secretWord) {
    const drawer = getDrawer(room);
    const wordDisplay = getPublicHintDisplay(room);
    const isDrawer = drawer?.id === socket.id;
    const hasGuessed = room.guessedPlayers.includes(socket.id);

    if (isDrawer) {
      socket.emit("drawer_word", { word: room.secretWord });
      socket.emit("secret_word", room.secretWord);
    } else if (hasGuessed) {
      socket.emit("secret_word", room.secretWord);
    } else {
      socket.emit("hint_update", { wordDisplay });
    }

    socket.emit("game_started", {
      drawerId: drawer?.id,
      drawerName: drawer?.name,
      wordDisplay,
    });
  }

  if (room.timerType) {
    socket.emit("timer_update", { timeLeft: room.timer, type: room.timerType });
  }
}
