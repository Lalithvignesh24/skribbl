import Word from "../models/word.js";
import { createRoom, getRoom, getRooms, removePlayerFromAllRooms } from "../utils/roomManager.js";

export default function registerGameSocket(io) {
  io.on("connection", (socket) => {
    console.log(`User Connected: ${socket.id}`);
    // Add these utility states or flags to your existing global room structures on the server
socket.on("matchmake_online", ({ name, avatar }) => {
  const trimmedName = (name || "").trim();
  if (!trimmedName) {
    socket.emit("room_error", "A valid player nickname is required.");
    return;
  }

  const rooms = getRooms(); // Retrieves your global rooms object reference
  let targetRoomId = null;

  // Search for an active public room with space available
  for (const id in rooms) {
    const room = rooms[id];
    if (room.isPublic && !room.gameStarted && room.players.length < 10) {
      targetRoomId = id;
      break;
    }
  }

  // Fallback: If no public room has open slots, create a new public room
  if (!targetRoomId) {
    targetRoomId = "PUB-" + Math.random().toString(36).slice(2, 8).toUpperCase();
    const newRoom = createRoom(targetRoomId); 
    
    // Configure public room metadata defaults
    newRoom.isPublic = true;
    newRoom.gameStarted = false;
    newRoom.round = 1;
    newRoom.totalRounds = 3;
    newRoom.lobbyTimer = 60; // 1-minute countdown limit
  }

  const room = getRoom(targetRoomId);
  socket.join(targetRoomId);

  // Add the player if they aren't already tracked in this room
  const alreadyJoined = room.players.some((p) => p.id === socket.id);
  if (!alreadyJoined) {
    room.players.push({
      id: socket.id,
      name: trimmedName,
      avatar: avatar || "😀",
      score: 0,
    });
  }

  // Synchronize player lists across the lobby
  io.to(targetRoomId).emit("update_players", room.players);

  // If this is the first player, start the 60-second room countdown
  if (room.players.length === 1 && !room.lobbyTimerId) {
    room.lobbyTimerId = setInterval(() => {
      room.lobbyTimer--;
      
      // Broadcast the current remaining lobby time to the waiting screen
      io.to(targetRoomId).emit("lobby_timer_update", {
        timeLeft: room.lobbyTimer,
        canStart: room.players.length >= 2
      });

      // Match conditions met: room is full OR time is up with at least 2 players
      if (
        room.players.length === 10 || 
        (room.lobbyTimer <= 0 && room.players.length >= 2)
      ) {
        clearInterval(room.lobbyTimerId);
        room.lobbyTimerId = null;
        room.gameStarted = true;
        room.currentDrawerIndex = 0;

        // Command all connected waiting sockets to launch their GamePages
        io.to(targetRoomId).emit("online_match_ready", targetRoomId);
        
        // Trigger your existing turn-based game loop initialization
        startNewRound(io, targetRoomId);
      } 
      
      // If time runs out but nobody else joined, reset countdown to wait for a peer
      else if (room.lobbyTimer <= 0 && room.players.length < 2) {
        room.lobbyTimer = 60; 
      }
    }, 1000);
  } else {
    // Immediately notify the newly joined player of the current lobby countdown status
    socket.emit("lobby_timer_update", {
      timeLeft: room.lobbyTimer,
      canStart: room.players.length >= 2
    });
  }
});

// IMPORTANT: Clean up the lobby countdown interval if players disconnect during matchmaking
const originalDisconnect = socket._events.disconnect; 
socket.on("disconnect", () => {
  const rooms = getRooms();
  Object.keys(rooms).forEach((id) => {
    const room = rooms[id];
    if (room && room.isPublic) {
      room.players = room.players.filter((p) => p.id !== socket.id);
      io.to(id).emit("update_players", room.players);

      // If the public room becomes completely empty, clear its active interval
      if (room.players.length === 0 && room.lobbyTimerId) {
        clearInterval(room.lobbyTimerId);
        delete rooms[id];
      }
    }
  });
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
      socket.join(trimmedRoomId);

      const alreadyJoined = room.players.some((player) => player.id === socket.id);
      if (!alreadyJoined) {
        room.players.push({
          id: socket.id,
          name: trimmedName,
          avatar: avatar || "😀",
          score: 0,
        });
      }

      if (!room.round) room.round = 1;
      if (!room.totalRounds) room.totalRounds = 3; 

      io.to(trimmedRoomId).emit("update_players", room.players);
      io.to(socket.id).emit("room_state_update", {
        round: room.round,
        totalRounds: room.totalRounds,
        gameStarted: room.gameStarted || false
      });
    });

    socket.on("start_game", (roomId) => {
      const room = getRoom(roomId);
      if (room && room.players.length >= 1) {
        room.currentDrawerIndex = 0;
        room.round = 1; 
        room.totalRounds = 3; 
        room.gameLoopActive = true; 
        room.gameStarted = true; // Set to true immediately to hide the start button globally

        io.to(roomId).emit("room_state_update", {
          round: room.round,
          totalRounds: room.totalRounds,
          gameStarted: true
        });
        
        startNewRound(io, roomId);
      }
    });

    // NEW EVENT: Allows player 1 to conduct a game restart directly from the podium screen
    socket.on("reconduct_game", (roomId) => {
      const room = getRoom(roomId);
      if (!room || room.players[0]?.id !== socket.id) return; // Verify only owner initiates

      // Reset scores and room structures
      room.players.forEach(p => p.score = 0);
      room.round = 1;
      room.currentDrawerIndex = 0;
      room.gameStarted = false;
      room.gameLoopActive = false;

      io.to(roomId).emit("update_players", room.players);
      io.to(roomId).emit("room_reset");
      io.to(roomId).emit("room_state_update", {
        round: room.round,
        totalRounds: room.totalRounds,
        gameStarted: false
      });
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
        
        const guessersCount = room.players.length - 1;
        if (room.timer <= 0 || (guessersCount > 0 && room.guessedPlayers.length === guessersCount)) {
          clearInterval(room.timerId);
          endRound(io, roomId);
        }
      }, 1000);
    });

    socket.on("send_message", ({ roomId, message, name }) => {
      const room = getRoom(roomId);
      if (!room || !room.gameStarted) return;

      const currentDrawerId = room.players[room.currentDrawerIndex]?.id;
      if (socket.id === currentDrawerId) {
        io.to(roomId).emit("receive_message", { name, message: `[Drawer] ${message}`, isCorrect: false });
        return;
      }

      const isCorrect = message.toLowerCase().trim() === room.secretWord.toLowerCase().trim();
      if (isCorrect) {
        if (!room.guessedPlayers.includes(socket.id)) {
          const player = room.players.find((candidate) => candidate.id === socket.id);
          if (player) {
            const timeBonus = Math.max(10, room.timer);
            player.score += 50 + timeBonus; 
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

  if (room.currentDrawerIndex >= room.players.length) {
    room.currentDrawerIndex = 0; 
    room.round += 1; 
  }

  // Update room state values dynamically 
  io.to(roomId).emit("room_state_update", {
    round: Math.min(room.round, room.totalRounds),
    totalRounds: room.totalRounds,
    gameStarted: room.round <= room.totalRounds
  });

  if (room.round <= room.totalRounds) {
    setTimeout(() => startNewRound(io, roomId), 5000);
  } else {
    // Round 3 Complete! Sort final standings and emit gameOver sequence
    const sortedLeaderboard = [...room.players].sort((a, b) => b.score - a.score);
    io.to(roomId).emit("game_over", sortedLeaderboard);
    
    room.gameStarted = false;
    room.gameLoopActive = false;
  }
}