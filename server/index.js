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
                gameStarted: false,
                secretWord: "",
                timer: 80,
                timerId: null
            };
        }
        const alreadyJoined = rooms[roomId].players.some(p => p.id === socket.id);
        if (!alreadyJoined) {
            rooms[roomId].players.push({ id: socket.id, name, points: 0 });
        }
        io.to(roomId).emit('update_players', rooms[roomId].players);
    });

    // SINGLE MERGED START_GAME LOGIC
    // Inside server/index.js, update the start_game and timer logic

socket.on('start_game', (roomId) => {
    const room = rooms[roomId];
    if (room && room.players.length >= 1) {
        room.gameStarted = true;
        room.currentDrawerIndex = 0; // Start with the first player
        startNewRound(roomId);
    }
});

async function startNewRound(roomId) {
    const room = rooms[roomId];
    if (!room) return;

    // Reset round state
    room.timer = 80;
    const drawer = room.players[room.currentDrawerIndex];
    room.currentDrawer = drawer.id;

    try {
        const randomWord = await Word.aggregate([{ $sample: { size: 1 } }]);
        room.secretWord = randomWord[0].text;

        io.to(roomId).emit('game_started', {
            drawerId: drawer.id,
            drawerName: drawer.name,
            wordDisplay: "_ ".repeat(room.secretWord.length).trim()
        });
        io.to(drawer.id).emit('secret_word', room.secretWord);

        // Timer Logic
        if (room.timerId) clearInterval(room.timerId);
        room.timerId = setInterval(() => {
            room.timer--;
            io.to(roomId).emit('timer_update', room.timer);

            if (room.timer <= 0) {
                clearInterval(room.timerId);
                endRound(roomId);
            }
        }, 1000);
    } catch (err) { console.error(err); }
}

function endRound(roomId) {
    const room = rooms[roomId];
    io.to(roomId).emit('round_ended', { word: room.secretWord });

    // Rotate to next player
    room.currentDrawerIndex++;

    if (room.currentDrawerIndex < room.players.length) {
        // Next person's turn after a 5-second break
        setTimeout(() => startNewRound(roomId), 5000);
    } else {
        // Everyone has drawn!
        io.to(roomId).emit('game_over', room.players);
        room.gameStarted = false;
        room.currentDrawerIndex = 0;
    }
}

    socket.on('send_message', ({ roomId, message, name }) => {
        const room = rooms[roomId];
        if (!room) return;
        if (message.toLowerCase().trim() === room.secretWord.toLowerCase().trim() && room.gameStarted) {
            const player = room.players.find(p => p.id === socket.id);
            if (player && socket.id !== room.currentDrawer) {
                player.points += 100;
                io.to(roomId).emit('update_players', room.players);
                io.to(roomId).emit('receive_message', { name: "System", message: `${name} guessed it!`, isCorrect: true });
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

server.listen(process.env.PORT || 3001, () => console.log(`🚀 SERVER RUNNING ON PORT 3001`));