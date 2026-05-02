import Word from "../models/word.js";
import { createRoom, getRoom, getRooms, removePlayerFromAllRooms } from "../utils/roomManager.js";

export default function registerGameSocket(io) {
  io.on("connection", (socket) => {
    console.log(`User Connected: ${socket.id}`);

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
      socket.join(trimmedRoomId);

      const alreadyJoined = room.players.some((player) => player.id === socket.id);
      if (!alreadyJoined) {
        room.players.push({
          id: socket.id,
          name: trimmedName,
          avatar: avatar || "😀",
          points: 0,
        });
      }

      io.to(trimmedRoomId).emit("update_players", room.players);
    });

    socket.on("start_game", (roomId) => {
      const room = getRoom(roomId);
      if (room && room.players.length >= 1) {
        room.currentDrawerIndex = 0;
        startNewRound(io, roomId);
      }
    });

    socket.on("word_chosen", ({ roomId, word }) => {
      const room = getRoom(roomId);
      if (!room) return;

      room.secretWord = word;
      room.gameStarted = true;

      io.to(roomId).emit("game_started", {
        drawerId: room.players[room.currentDrawerIndex].id,
        drawerName: room.players[room.currentDrawerIndex].name,
        wordDisplay: "_ ".repeat(word.length).trim(),
      });

      io.to(room.players[room.currentDrawerIndex].id).emit("secret_word", word);

      if (room.timerId) clearInterval(room.timerId);
      room.timerId = setInterval(() => {
        room.timer--;
        io.to(roomId).emit("timer_update", room.timer);
        if (room.timer <= 0) {
          clearInterval(room.timerId);
          endRound(io, roomId);
        }
      }, 1000);
    });

    socket.on("send_message", ({ roomId, message, name }) => {
      const room = getRoom(roomId);
      if (!room || !room.gameStarted) return;

      const isCorrect = message.toLowerCase().trim() === room.secretWord.toLowerCase().trim();
      if (isCorrect && socket.id !== room.players[room.currentDrawerIndex].id) {
        if (!room.guessedPlayers.includes(socket.id)) {
          const player = room.players.find((candidate) => candidate.id === socket.id);
          if (player) {
            player.points += 100;
            room.guessedPlayers.push(socket.id);

            io.to(roomId).emit("update_players", room.players);
            socket.emit("secret_word", room.secretWord);
            io.to(roomId).emit("receive_message", {
              name: "System",
              message: `${name} guessed the word!`,
              isCorrect: true,
            });
          }
        }
      } else {
        io.to(roomId).emit("receive_message", { name, message, isCorrect: false });
      }
    });

    socket.on("draw_data", (data) => socket.to(data.roomId).emit("receive_draw", data));
    socket.on("clear_canvas", (roomId) => socket.to(roomId).emit("clear_canvas"));
    socket.on("fill_canvas", ({ roomId, color }) => socket.to(roomId).emit("fill_canvas", { color }));

    socket.on("disconnect", () => {
      const rooms = getRooms();
      removePlayerFromAllRooms(socket.id);
      Object.keys(rooms).forEach((roomId) => {
        io.to(roomId).emit("update_players", rooms[roomId]?.players || []);
      });
    });
  });
}

async function startNewRound(io, roomId) {
  const room = getRoom(roomId);
  if (!room) return;

  room.timer = 80;
  room.guessedPlayers = [];
  room.gameStarted = false;
  io.to(roomId).emit("clear_canvas");

  const drawer = room.players[room.currentDrawerIndex];
  if (!drawer) return;

  try {
    const options = await Word.aggregate([{ $sample: { size: 3 } }]);
    io.to(drawer.id).emit("choose_word", options.map((word) => word.text));
  } catch (error) {
    console.error("Word Fetch Error:", error);
  }
}

function endRound(io, roomId) {
  const room = getRoom(roomId);
  if (!room) return;

  io.to(roomId).emit("round_ended", { word: room.secretWord });

  room.currentDrawerIndex++;
  if (room.currentDrawerIndex < room.players.length) {
    setTimeout(() => startNewRound(io, roomId), 5000);
  } else {
    io.to(roomId).emit("game_over", room.players);
    room.gameStarted = false;
    room.currentDrawerIndex = 0;
  }
}
