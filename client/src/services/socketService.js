import { io } from "socket.io-client";

let socketInstance;

export function getSocket() {
  if (!socketInstance) {
    socketInstance = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:3001", {
      autoConnect: true,
    });
  }

  return socketInstance;
}
