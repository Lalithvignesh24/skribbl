import { ROUND_DURATION_SEC } from "./constants.js";
import { buildWordDisplay } from "./wordService.js";

/** Elapsed ~40s and ~60s on an 80s round → timeLeft 40 and 20. */
const HINT_TIME_FIRST = 40;
const HINT_TIME_SECOND = 20;

function letterIndices(word) {
  const indices = [];
  for (let i = 0; i < word.length; i++) {
    if (word[i] !== " ") indices.push(i);
  }
  return indices;
}

function countLetters(word) {
  return letterIndices(word).length;
}

//Fisher-Yates Shuffle Algorithm
//Every arrangement has equal probability
//O(n) time complexity, O(n) space complexity
function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * 3–4 letters: one hint at ~40s.
 * 5+ letters: two hints at ~40s and ~60s (one letter each).
 */
export function buildHintStages(secretWord) {
  const letterCount = countLetters(secretWord);
  const first = { timeLeftAtOrBelow: HINT_TIME_FIRST, lettersToReveal: 1 };

  if (letterCount <= 4) {
    return [first];
  }

  return [
    first,
    { timeLeftAtOrBelow: HINT_TIME_SECOND, lettersToReveal: 1 },
  ];
}

export function initHintState(room, secretWord) {
  room.hintStage = 0;
  room.hintStages = buildHintStages(secretWord);
  room.hintRevealedIndices = new Set();
  room.hintDisplay = buildWordDisplay(secretWord);
}

export function buildHintFromRoom(room) {
  if (!room.secretWord) return "";
  const word = room.secretWord;
  const revealed = room.hintRevealedIndices || new Set();

  return word
    .split("")
    .map((char, index) => {
      if (char === " ") return " ";
      return revealed.has(index) ? char.toUpperCase() : "_";
    })
    .join(" ");
}

export function clearHintState(room) {
  room.hintStage = 0;
  room.hintStages = [];
  room.hintRevealedIndices = new Set();
  room.hintDisplay = "";
}

function revealLetters(room, count) {
  const word = room.secretWord;
  if (!word || count <= 0) return false;

  if (!room.hintRevealedIndices) {
    room.hintRevealedIndices = new Set();
  }

  const unrevealed = letterIndices(word).filter((i) => !room.hintRevealedIndices.has(i));
  const toReveal = shuffle(unrevealed).slice(0, Math.min(count, 1));

  if (toReveal.length === 0) return false;

  toReveal.forEach((i) => room.hintRevealedIndices.add(i));
  room.hintDisplay = buildHintFromRoom(room);
  return true;
}

/**
 * Called once per second during drawing. Returns true if hint changed.
 */
export function tickHintReveal(room) {
  if (!room.secretWord || room.phase !== "drawing") return false;

  const stages = room.hintStages || [];
  const timeLeft = room.timer ?? ROUND_DURATION_SEC;
  let changed = false;

  while (room.hintStage < stages.length) {
    const stage = stages[room.hintStage];
    if (timeLeft > stage.timeLeftAtOrBelow) break;

    if (revealLetters(room, stage.lettersToReveal)) {
      changed = true;
    }
    room.hintStage++;
  }

  return changed;
}

export function emitHintUpdate(io, roomId, room, drawerId = null) {
  const hintDisplay = buildHintFromRoom(room);
  room.hintDisplay = hintDisplay;

  if (drawerId) {
    io.to(roomId).except(drawerId).emit("hint_update", { wordDisplay: hintDisplay });
  } else {
    io.to(roomId).emit("hint_update", { wordDisplay: hintDisplay });
  }
}

export function getPublicHintDisplay(room) {
  return room.hintDisplay || buildWordDisplay(room.secretWord || "");
}
