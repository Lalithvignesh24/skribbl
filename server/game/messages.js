export function emitSystemMessage(io, roomId, message) {
  io.to(roomId).emit("receive_message", {
    name: "System",
    message,
    isCorrect: false,
    isSystem: true,
  });
}
