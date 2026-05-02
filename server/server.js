import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import registerGameSocket from "./sockets/gameSocket.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:5173" },
});

connectDB();
registerGameSocket(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`🚀 SERVER RUNNING ON PORT ${PORT}`));
