const TIMER_KEYS = ["lobby", "wordSelect", "round", "roundEnd", "hint"];

export function ensureTimers(room) {
  if (!room.timers) {
    room.timers = {
      lobby: null,
      wordSelect: null,
      round: null,
      roundEnd: null,
      hint: null,
    };
  }
  return room.timers;
}

export function clearTimer(room, key) {
  const timers = ensureTimers(room);
  if (timers[key]) {
    clearInterval(timers[key]);
    timers[key] = null;
  }
}

export function clearAllTimers(room) {
  TIMER_KEYS.forEach((key) => clearTimer(room, key));
  if (room.timers?.turnDelay) {
    clearTimeout(room.timers.turnDelay);
    room.timers.turnDelay = null;
  }
  if (room.timers?.roundEnd) {
    clearTimeout(room.timers.roundEnd);
    room.timers.roundEnd = null;
  }
}

export function startInterval(room, key, callback) {
  clearTimer(room, key);
  const timers = ensureTimers(room);
  timers[key] = setInterval(callback, 1000);
  return timers[key];
}
