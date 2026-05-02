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
      currentDrawer: null,
      currentDrawerIndex: 0,
      gameStarted: false,
      secretWord: "",
      timer: 80,
      timerId: null,
      guessedPlayers: [],
    };
  }
  return rooms[roomId];
}

export function removePlayerFromAllRooms(socketId) {
  Object.keys(rooms).forEach((roomId) => {
    rooms[roomId].players = rooms[roomId].players.filter((player) => player.id !== socketId);
    if (rooms[roomId].players.length === 0) {
      if (rooms[roomId].timerId) {
        clearInterval(rooms[roomId].timerId);
      }
      delete rooms[roomId];
    }
  });
}
