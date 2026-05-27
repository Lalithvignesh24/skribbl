import { LOBBY_COUNTDOWN_SEC, TOTAL_ROUNDS } from "../game/constants.js";
import { clearAllTimers } from "../game/timerManager.js";

const rooms = {};

export function getRooms() {
  return rooms;
}

export function getRoom(roomId) {
  return rooms[roomId];
}

export function createRoom(roomId) {
  if (!rooms[roomId]) {
    rooms[roomId] = {
      players: [],
      currentDrawerIndex: 0,
      gameStarted: false,
      phase: "lobby",
      round: 1,
      totalRounds: TOTAL_ROUNDS,
      secretWord: "",
      timer: 80,
      timerType: null,
      guessedPlayers: [],
      usedWords: [],
      wordOptions: [],
      isPublic: false,
      lobbyTimer: LOBBY_COUNTDOWN_SEC,
      turnsCompleted: 0,
      timers: { lobby: null, wordSelect: null, round: null, roundEnd: null },
    };
  }
  return rooms[roomId];
}

/** @deprecated Use removeSocketFromAllRooms from roomLifecycle.js */
export function removePlayerFromAllRooms(socketId) {
  Object.keys(rooms).forEach((roomId) => {
    const room = rooms[roomId];
    room.players = room.players.filter((player) => player.id !== socketId);
    if (room.players.length === 0) {
      clearAllTimers(room);
      delete rooms[roomId];
    }
  });
}

export function deleteRoom(roomId) {
  const room = rooms[roomId];
  if (room) {
    clearAllTimers(room);
    if (room.timers?.turnDelay) clearTimeout(room.timers.turnDelay);
    if (room.timers?.roundEnd) clearTimeout(room.timers.roundEnd);
  }
  delete rooms[roomId];
}
