import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "https://guessink.onrender.com";

let socketInstance;

export function getSocket() {
  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      transports: ["websocket", "polling"],
    });
  }

  return socketInstance;
}

export function ensureSocketConnected() {
  const socket = getSocket();
  if (!socket.connected) {
    socket.connect();
  }
  return socket;
}
