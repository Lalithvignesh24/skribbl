import {
  LOBBY_COUNTDOWN_SEC,
  MAX_PLAYERS,
  MIN_PLAYERS_TO_START,
} from "./constants.js";
import { clearTimer, startInterval } from "./timerManager.js";
import { getRoom } from "../utils/roomManager.js";
import { emitPlayers, startGame, syncPlayerOnJoin } from "./roundManager.js";

function serializePlayers(room) {
  return room.players.map((p) => ({
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    score: p.score || 0,
    isWaiting: Boolean(p.joinedMidGame),
  }));
}

function buildLobbyTimerPayload(room) {
  return {
    timeLeft: room.lobbyTimer ?? LOBBY_COUNTDOWN_SEC,
    canStart: room.players.length >= MIN_PLAYERS_TO_START,
    playerCount: room.players.length,
    maxPlayers: MAX_PLAYERS,
    gameStarted: false,
  };
}

export function broadcastLobbyTimer(io, roomId, room) {
  io.to(roomId).emit("lobby_timer_update", buildLobbyTimerPayload(room));
}

export function sendLobbyStateToSocket(socket, room) {
  //socket for sending to specific client, io for broadcasting to everyone in the room
  socket.emit("update_players", serializePlayers(room));
  socket.emit("lobby_timer_update", buildLobbyTimerPayload(room));
}

//Realtime multiplayer matchmaking scheduler
function startLobbyCountdown(io, roomId) {
  const room = getRoom(roomId);//gets the room state from the in-memory store using the roomId
  if (!room || room.gameStarted || room.timers?.lobby) return;

  if (!room.lobbyTimer) {
    room.lobbyTimer = LOBBY_COUNTDOWN_SEC;
  }

  startInterval(room, "lobby", () => {
    const live = getRoom(roomId);
    if (!live || live.gameStarted) {
      if (live) clearTimer(live, "lobby");
      return;
    }

    live.lobbyTimer--;
    broadcastLobbyTimer(io, roomId, live);

    if (live.players.length >= MAX_PLAYERS) {
      clearTimer(live, "lobby");
      tryStartPublicGame(io, roomId);
      return;
    }

    if (live.lobbyTimer <= 0) {
      if (live.players.length >= MIN_PLAYERS_TO_START) {
        clearTimer(live, "lobby");
        tryStartPublicGame(io, roomId);
      } else {
        live.lobbyTimer = LOBBY_COUNTDOWN_SEC;
        broadcastLobbyTimer(io, roomId, live);
      }
    }
  });
}

function tryStartPublicGame(io, roomId) {
  const room = getRoom(roomId);
  if (!room || room.gameStarted) return false;

  if (room.players.length >= MIN_PLAYERS_TO_START) {
    launchPublicGame(io, roomId);
    return true;
  }

  return false;
}

function launchPublicGame(io, roomId) {
  const room = getRoom(roomId);
  if (!room || room.gameStarted) return;

  clearTimer(room, "lobby");

  room.players.forEach((p) => {
    p.joinedMidGame = false;
  });

  io.to(roomId).emit("online_match_ready", { roomId, inProgress: false });
  startGame(io, roomId);
}
export function handlePublicLobbyJoin(io, socket, roomId) {
  const room = getRoom(roomId);
  if (!room || room.gameStarted) return;

  if (!room.lobbyTimer) {
    room.lobbyTimer = LOBBY_COUNTDOWN_SEC;
  }

  emitPlayers(io, roomId, room);
  sendLobbyStateToSocket(socket, room);

  const activeLobbyPlayers = room.players.filter((p) => !p.joinedMidGame);

  // NEW LOGIC: Only skip the timer and start instantly if the room hits MAX_PLAYERS (10)
  if (activeLobbyPlayers.length >= MAX_PLAYERS) {
    clearTimer(room, "lobby");
    tryStartPublicGame(io, roomId);
    return;
  }

  // Otherwise, ALWAYS start or continue the 60-second countdown
  startLobbyCountdown(io, roomId);
}

export function handleRunningGameJoin(io, socket, roomId) {
  const room = getRoom(roomId);
  if (!room || !room.gameStarted) return;

  emitPlayers(io, roomId, room);
  syncPlayerOnJoin(io, socket, roomId, room);

  socket.emit("online_match_ready", {
    roomId,
    inProgress: true,
    isWaiting: Boolean(
      room.players.find((p) => p.id === socket.id)?.joinedMidGame,
    ),
  });

  if (room.players.find((p) => p.id === socket.id)?.joinedMidGame) {
    socket.emit("player_waiting", {
      message: "You will join the next round.",
    });
  }
}

export function handlePublicLobbyLeave(io, roomId) {
  const room = getRoom(roomId);
  if (!room) return;

  if (!room.gameStarted) {
    broadcastLobbyTimer(io, roomId, room);
  }

  if (room.players.length === 0) {
    clearTimer(room, "lobby");
  }
}
