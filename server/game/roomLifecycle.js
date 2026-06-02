import { LOBBY_COUNTDOWN_SEC, MAX_PLAYERS } from "./constants.js";
import { clearAllTimers } from "./timerManager.js";
import {
  createRoom,
  deleteRoom,
  getRoom,
  getRooms,
} from "../utils/roomManager.js";
import { emitSystemMessage } from "./messages.js";
import {
  emitPlayers,
  emitRoomState,
  onPlayerRemovedFromActiveGame,
} from "./roundManager.js";

export { emitSystemMessage };

function generatePublicRoomId() {
  return "PUB-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

/**
 * Find a joinable public room (lobby OR in-progress).
 * Prefer filling active games, then fullest lobby.
 * Returns null only when every public room has 10 players.
 */
export function findJoinablePublicRoom() {
  const rooms = getRooms();

  const joinable = Object.entries(rooms)
    .filter(([, room]) => {
      if (!room.isPublic) return false;
      if (room.phase === "game_over") return false;
      return room.players.length < MAX_PLAYERS;
    })
    .sort(([, a], [, b]) => {
      const aIsLobby = !a.gameStarted && a.phase === "lobby";
      const bIsLobby = !b.gameStarted && b.phase === "lobby";
      if (aIsLobby !== bIsLobby) {
        return Number(bIsLobby) - Number(aIsLobby);
      }
      if (a.gameStarted !== b.gameStarted) {
        return Number(b.gameStarted) - Number(a.gameStarted);
      }
      return b.players.length - a.players.length;
    });

  return joinable.length > 0 ? joinable[0][0] : null;
}

export function findOrCreatePublicRoom() {
  const existingId = findJoinablePublicRoom();
  if (existingId) return existingId;

  const roomId = generatePublicRoomId();
  const room = createRoom(roomId);
  room.isPublic = true;
  room.phase = "lobby";
  room.lobbyTimer = LOBBY_COUNTDOWN_SEC;
  return roomId;
}

export function allPublicRoomsFull() {
  const rooms = getRooms();
  const publicRooms = Object.values(rooms).filter((r) => r.isPublic);
  if (publicRooms.length === 0) return false;
  return publicRooms.every((r) => r.players.length >= MAX_PLAYERS);
}

/**
 * Remove socket from every room it belongs to (single-room membership).
 */
export function removeSocketFromAllRooms(io, socket, { reason = "leave", exceptRoomId = null } = {}) {
  const socketId = socket.id;
  const rooms = getRooms();

  Object.keys(rooms).forEach((roomId) => {
    if (exceptRoomId && roomId === exceptRoomId) return;

    const room = rooms[roomId];
    const player = room.players.find((p) => p.id === socketId);
    if (!player) return;

    removePlayerFromRoom(io, roomId, socketId, {
      reason,
      playerName: player.name,
      skipSocketLeave: true,
    });
    socket.leave(roomId);
  });

  if (!exceptRoomId) {
    socket.data.roomId = null;
  }
}

export function removePlayerFromRoom(
  io,
  roomId,
  socketId,
  { reason = "leave", playerName, skipSocketLeave = false } = {},
) {
  const room = getRoom(roomId);
  if (!room) return false;

  const player = room.players.find((p) => p.id === socketId);
  if (!player) return false;

  const name = playerName || player.name;
  room.players = room.players.filter((p) => p.id !== socketId);

  if (room.players.length === 0) {
    clearAllTimers(room);
    deleteRoom(roomId);
    return true;
  }

  if (reason === "disconnect") {
    emitSystemMessage(io, roomId, `${name} left the room`);
  }

  emitPlayers(io, roomId, room);

  if (room.gameStarted && room.phase !== "game_over") {
    onPlayerRemovedFromActiveGame(io, roomId, socketId);
  } else {
    emitRoomState(io, roomId, room);
  }

  return true;
}

export function addPlayerToRoom(io, socket, roomId, { name, avatar, source = "matchmake" }) {
  let room = getRoom(roomId);
  if (!room) return null;

  if (room.players.length >= MAX_PLAYERS) {
    socket.emit("room_error", "This room is full.");
    return null;
  }

  // Do not remove from the room we are joining (avoids deleting an empty target room)
  removeSocketFromAllRooms(io, socket, { reason: "switch", exceptRoomId: roomId });

  room = getRoom(roomId);
  if (!room) return null;

  socket.join(roomId);
  socket.data.roomId = roomId;

  let player = room.players.find((p) => p.id === socket.id);
  const isNewPlayer = !player;

  if (player) {
    player.name = name;
    player.avatar = avatar || player.avatar;
  } else {
    // We no longer track if they joined mid-game because they play instantly
    const joiningMidGame = false;

    player = {
      id: socket.id,
      name,
      avatar: avatar || "😀",
      score: 0,
      joinedMidGame: false, // Set to false to instantly allow guessing
    };
    room.players.push(player);

    if (isNewPlayer) {
      emitSystemMessage(io, roomId, `${name} joined the room`);
    }
  }

  emitPlayers(io, roomId, room);

  return { player, isNewPlayer, joiningMidGame: Boolean(player.joinedMidGame) };
}
