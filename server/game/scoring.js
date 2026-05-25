import {
  DRAWER_BONUS_PER_GUESS,
  GUESS_BASE_POINTS,
  GUESS_TIME_MULTIPLIER,
  ROUND_DURATION_SEC,
} from "./constants.js";

export function scoreCorrectGuess(player, secondsRemaining) {
  const timeBonus = Math.max(0, secondsRemaining) * GUESS_TIME_MULTIPLIER;
  const points = GUESS_BASE_POINTS + timeBonus;
  player.score = (player.score || 0) + points;
  return points;
}

export function scoreDrawerBonus(drawer, guessCount = 1) {
  const bonus = DRAWER_BONUS_PER_GUESS * guessCount;
  drawer.score = (drawer.score || 0) + bonus;
  return bonus;
}

export function getSecondsRemaining(room) {
  return Math.max(0, room.timer ?? ROUND_DURATION_SEC);
}
