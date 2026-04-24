import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Word from './models/word.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "http://localhost:5173" }
});

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.log("❌ DB Connection Error:", err));

const rooms = {}; 

io.on('connection', (socket) => {
    console.log(`User Connected: ${socket.id}`);

    socket.on('join_room', ({ roomId, name }) => {
        socket.join(roomId);
        if (!rooms[roomId]) {
            rooms[roomId] = { 
                players: [], 
                currentDrawer: null, 
                currentDrawerIndex: 0,
                gameStarted: false,
                secretWord: "",
                timer: 80,
                timerId: null,
                guessedPlayers: [] // NEW: Track who guessed to prevent point spam
            };
        }
        const alreadyJoined = rooms[roomId].players.some(p => p.id === socket.id);
        if (!alreadyJoined) {
            rooms[roomId].players.push({ id: socket.id, name, points: 0 });
        }
        io.to(roomId).emit('update_players', rooms[roomId].players);
    });

    socket.on('start_game', (roomId) => {
        const room = rooms[roomId];
        if (room && room.players.length >= 1) {
            room.currentDrawerIndex = 0;
            startNewRound(roomId); // Call the selection phase
        }
    });

    // NEW: Handle the word selection from the drawer
    socket.on('word_chosen', ({ roomId, word }) => {
        const room = rooms[roomId];
        if (!room) return;

        room.secretWord = word;
        room.gameStarted = true;
        
        io.to(roomId).emit('game_started', {
            drawerId: room.players[room.currentDrawerIndex].id,
            drawerName: room.players[room.currentDrawerIndex].name,
            wordDisplay: "_ ".repeat(word.length).trim()
        });
        
        // Send the real word ONLY to the drawer
        io.to(room.players[room.currentDrawerIndex].id).emit('secret_word', word);

        // Start the Timer
        if (room.timerId) clearInterval(room.timerId);
        room.timerId = setInterval(() => {
            room.timer--;
            io.to(roomId).emit('timer_update', room.timer);
            if (room.timer <= 0) {
                clearInterval(room.timerId);
                endRound(roomId);
            }
        }, 1000);
    });

    socket.on('send_message', ({ roomId, message, name }) => {
        const room = rooms[roomId];
        if (!room || !room.gameStarted) return;

        const isCorrect = message.toLowerCase().trim() === room.secretWord.toLowerCase().trim();

        // CHECK: Match word AND verify player hasn't already guessed correctly this round
        if (isCorrect && socket.id !== room.players[room.currentDrawerIndex].id) {
            if (!room.guessedPlayers.includes(socket.id)) {
                const player = room.players.find(p => p.id === socket.id);
                if (player) {
                    player.points += 100;
                    room.guessedPlayers.push(socket.id); // Block further points for this player
                    
                    io.to(roomId).emit('update_players', room.players);
                    
                    // Reveal the word for THIS specific player only
                    socket.emit('secret_word', room.secretWord); 
                    
                    io.to(roomId).emit('receive_message', {
                        name: "System",
                        message: `${name} guessed the word!`,
                        isCorrect: true
                    });
                }
            }
        } else {
            io.to(roomId).emit('receive_message', { name, message, isCorrect: false });
        }
    });

    socket.on('draw_data', (data) => socket.to(data.roomId).emit('receive_draw', data));

    socket.on('clear_canvas', (roomId) => socket.to(roomId).emit('clear_canvas'));

    socket.on('disconnect', () => {
        for (const roomId in rooms) {
            rooms[roomId].players = rooms[roomId].players.filter(p => p.id !== socket.id);
            io.to(roomId).emit('update_players', rooms[roomId].players);
            if (rooms[roomId].players.length === 0) {
                if (rooms[roomId].timerId) clearInterval(rooms[roomId].timerId);
                delete rooms[roomId];
            }
        }
    });
});

// Helper Functions
async function startNewRound(roomId) {
    const room = rooms[roomId];
    if (!room) return;

    room.timer = 80;
    room.guessedPlayers = []; // Reset guessers
    room.gameStarted = false; // Wait for word choice

    // Auto-Clear Canvas for everyone [cite: 1364]
    io.to(roomId).emit('clear_canvas');

    const drawer = room.players[room.currentDrawerIndex];

    try {
        // Fetch 3 random words for choice [cite: 1360]
        const options = await Word.aggregate([{ $sample: { size: 3 } }]);
        io.to(drawer.id).emit('choose_word', options.map(w => w.text));
    } catch (err) {
        console.error("Word Fetch Error:", err);
    }
}

function endRound(roomId) {
    const room = rooms[roomId];
    if (!room) return;

    io.to(roomId).emit('round_ended', { word: room.secretWord });

    room.currentDrawerIndex++;
    if (room.currentDrawerIndex < room.players.length) {
        setTimeout(() => startNewRound(roomId), 5000);
    } else {
        io.to(roomId).emit('game_over', room.players);
        room.gameStarted = false;
        room.currentDrawerIndex = 0;
    }
}

server.listen(process.env.PORT || 3001, () => console.log(`🚀 SERVER RUNNING ON PORT 3001`));