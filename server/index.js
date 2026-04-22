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

// MongoDB Connection [cite: 138, 258]
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.log("❌ DB Connection Error:", err));

// Global game state [cite: 203, 332]
const rooms = {}; 

io.on('connection', (socket) => {
    console.log(`User Connected: ${socket.id}`);

    // Join Room & Duplicate Prevention [cite: 304, 355]
    socket.on('join_room', ({ roomId, name }) => {
        socket.join(roomId);

        if (!rooms[roomId]) {
            rooms[roomId] = { 
                players: [], 
                currentDrawer: null, 
                gameStarted: false,
                secretWord: "",
                timer: 80 
            };
        }

        const alreadyJoined = rooms[roomId].players.some(p => p.id === socket.id);
        if (!alreadyJoined) {
            rooms[roomId].players.push({ id: socket.id, name, points: 0 });
            console.log(`👤 ${name} joined room: ${roomId}`);
        }

        io.to(roomId).emit('update_players', rooms[roomId].players);
    });

    // Start Game Engine [cite: 224, 367]
    socket.on('start_game', async (roomId) => {
        if (rooms[roomId] && rooms[roomId].players.length >= 1) { // Adjusted to 1 for testing solo
            rooms[roomId].gameStarted = true;
            
            // Pick drawer [cite: 225, 389]
            const drawer = rooms[roomId].players[0];
            rooms[roomId].currentDrawer = drawer.id;

            try {
                // Fetch random word from MongoDB [cite: 168, 390]
                const randomWord = await Word.aggregate([{ $sample: { size: 1 } }]);
                const secretWord = randomWord[0].text;
                rooms[roomId].secretWord = secretWord;

                // Broadcast state [cite: 227, 369]
                io.to(roomId).emit('game_started', {
                    drawerId: drawer.id,
                    drawerName: drawer.name,
                    wordDisplay: "_ ".repeat(secretWord.length).trim() 
                });

                // Send actual word ONLY to drawer [cite: 23, 390]
                io.to(drawer.id).emit('secret_word', secretWord);

            } catch (err) {
                console.error("Error fetching word from DB:", err);
            }
        }
    });

    // Drawing Sync [cite: 16, 57]
    socket.on('draw_data', (data) => {
        socket.to(data.roomId).emit('receive_draw', data);
    });

    socket.on('clear_canvas', (roomId) => {
        socket.to(roomId).emit('clear_canvas');
    });

    // Cleanup [cite: 334, 359]
    socket.on('disconnect', () => {
        for (const roomId in rooms) {
            rooms[roomId].players = rooms[roomId].players.filter(p => p.id !== socket.id);
            io.to(roomId).emit('update_players', rooms[roomId].players);
            if (rooms[roomId].players.length === 0) delete rooms[roomId];
        }
    });
});

server.listen(process.env.PORT || 3001, () => {
    console.log(`🚀 SERVER RUNNING ON PORT ${process.env.PORT || 3001}`);
});