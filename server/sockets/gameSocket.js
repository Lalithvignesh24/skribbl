import { MAX_PLAYERS, MIN_PLAYERS_TO_START } from "../game/constants.js";
import {
  handlePublicLobbyJoin,
  handlePublicLobbyLeave,
  handleRunningGameJoin,
} from "../game/lobbyManager.js";
import {
  addPlayerToRoom,
  emitSystemMessage,
  findOrCreatePublicRoom,
  removeSocketFromAllRooms,
} from "../game/roomLifecycle.js";
import {
  emitPlayers,
  getDrawer,
  handleCorrectGuess,
  resetRoomForLobby,
  startDrawingRound,
  startGame,
  syncPlayerOnJoin,
} from "../game/roundManager.js";
import { isExactWordMatch } from "../game/wordService.js";
import { createRoom, getRoom } from "../utils/roomManager.js";

export default function registerGameSocket(io) {
  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);
    socket.data.roomId = null;

    socket.on("leave_matchmaking", () => {
      removeSocketFromAllRooms(io, socket, { reason: "leave" });
    });

    socket.on("matchmake_online", ({ name, avatar }) => {
      const trimmedName = (name || "").trim();
      if (!trimmedName) {
        socket.emit("room_error", "A valid player nickname is required.");
        return;
      }

      const roomId = findOrCreatePublicRoom();
      const result = addPlayerToRoom(io, socket, roomId, {
        name: trimmedName,
        avatar,
      });

      if (!result) return;

      const room = getRoom(roomId);
      if (!room) {
        socket.emit("room_error", "Could not join matchmaking room. Please try again.");
        return;
      }

      if (room.gameStarted && room.phase !== "lobby" && room.phase !== "game_over") {
        handleRunningGameJoin(io, socket, roomId);
      } else {
        handlePublicLobbyJoin(io, socket, roomId);
      }

      socket.emit("matchmaking_joined", { roomId });
    });

    socket.on("join_room", ({ roomId, name, avatar, mode }) => {
      const trimmedRoomId = (roomId || "").trim();
      const trimmedName = (name || "").trim();

      if (!trimmedRoomId || !trimmedName) {
        socket.emit("room_error", "Room ID and player name are required.");
        return;
      }

      const existingRoom = getRoom(trimmedRoomId);
      if (mode === "join" && !existingRoom) {
        socket.emit("room_error", "Room does not exist.");
        return;
      }

      const room = existingRoom || createRoom(trimmedRoomId);
      const wasInRoom = room.players.some((p) => p.id === socket.id);

      if (!wasInRoom && room.players.length >= MAX_PLAYERS) {
        socket.emit("room_error", "This room is full.");
        return;
      }

      const joiningMidGame =
        room.gameStarted &&
        room.phase !== "lobby" &&
        room.phase !== "game_over" &&
        !wasInRoom;

      if (!wasInRoom) {
        removeSocketFromAllRooms(io, socket, { reason: "switch", exceptRoomId: trimmedRoomId });
        socket.join(trimmedRoomId);
        socket.data.roomId = trimmedRoomId;

        if (!getRoom(trimmedRoomId)) {
          socket.emit("room_error", "Room no longer exists.");
          return;
        }

        room.players.push({
          id: socket.id,
          name: trimmedName,
          avatar: avatar || "😀",
          score: 0,
          joinedMidGame: joiningMidGame,
        });

        emitSystemMessage(io, trimmedRoomId, `${trimmedName} joined the room`);
      } else {
        const player = room.players.find((p) => p.id === socket.id);
        player.name = trimmedName;
        player.avatar = avatar || player.avatar;
        socket.join(trimmedRoomId);
        socket.data.roomId = trimmedRoomId;
      }

      emitPlayers(io, trimmedRoomId, room);
      syncPlayerOnJoin(io, socket, trimmedRoomId, room);

      if (joiningMidGame) {
        socket.emit("player_waiting", {
          message: "You will join the next round.",
        });
      }
    });

    socket.on("start_game", (roomId) => {
      const room = getRoom(roomId);
      if (!room || room.players.length < MIN_PLAYERS_TO_START) return;
      if (room.gameStarted) return;
      startGame(io, roomId);
    });

    socket.on("choose_word", ({ roomId, word }) => {
      const room = getRoom(roomId);
      if (!room || room.phase !== "word_select") return;

      const drawer = getDrawer(room);
      if (!drawer || drawer.id !== socket.id) return;

      const chosen = (word || "").trim();
      if (!chosen) return;

      const valid = room.wordOptions?.some(
        (o) => (o.text || o).toLowerCase() === chosen.toLowerCase(),
      );
      if (!valid) return;

      startDrawingRound(io, roomId, chosen);
    });

    socket.on("word_chosen", ({ roomId, word }) => {
      if (!roomId || !word) return;
      const room = getRoom(roomId);
      if (!room || room.phase !== "word_select") return;
      const drawer = getDrawer(room);
      if (drawer?.id !== socket.id) return;
      startDrawingRound(io, roomId, word);
    });

    socket.on("send_message", ({ roomId, message, name }) => {
      const room = getRoom(roomId);
      if (!room || room.phase !== "drawing" || !room.secretWord) return;

      const player = room.players.find((p) => p.id === socket.id);
      if (!player || player.joinedMidGame) return;

      const drawer = getDrawer(room);
      if (!drawer) return;

      const trimmedMessage = (message || "").trim();
      if (!trimmedMessage) return;

      if (socket.id === drawer.id) {
        io.to(roomId).emit("receive_message", {
          name,
          message: `[Drawer] ${trimmedMessage}`,
          isCorrect: false,
        });
        return;
      }

      const alreadyGuessed = room.guessedPlayers.includes(socket.id);

      if (alreadyGuessed) {
        if (isExactWordMatch(trimmedMessage, room.secretWord)) {
          socket.emit("private_warning", {
            message: "⚠ You already guessed the word. Do not reveal the answer.",
          });
        } else {
          io.to(roomId).emit("receive_message", {
            name,
            message: trimmedMessage,
            isCorrect: false,
          });
        }
        return;
      }

      const isCorrect = isExactWordMatch(trimmedMessage, room.secretWord);

      if (isCorrect) {
        handleCorrectGuess(io, roomId, socket.id, name);
      } else {
        io.to(roomId).emit("receive_message", {
          name,
          message: trimmedMessage,
          isCorrect: false,
        });
      }
    });

    socket.on("draw_data", (data) => {
      if (!data?.roomId) return;
      socket.to(data.roomId).emit("receive_draw", data);
    });

    socket.on("clear_canvas", (roomId) => {
      socket.to(roomId).emit("clear_canvas");
    });

    socket.on("fill_canvas", ({ roomId, color }) => {
      socket.to(roomId).emit("fill_canvas", { color });
    });

    socket.on("reconduct_game", (roomId) => {
      const room = getRoom(roomId);
      if (!room || room.players[0]?.id !== socket.id) return;
      resetRoomForLobby(io, roomId);
    });

    socket.on("disconnect", () => {
      const roomId = socket.data.roomId;
      removeSocketFromAllRooms(io, socket, { reason: "disconnect" });

      if (roomId) {
        const room = getRoom(roomId);
        if (room && !room.gameStarted) {
          handlePublicLobbyLeave(io, roomId);
        }
      }
    });
  });
}
