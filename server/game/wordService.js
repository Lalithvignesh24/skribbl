import Word from "../models/word.js";

const FALLBACK_WORDS = [
  { text: "apple", difficulty: "easy", category: "food" },
  { text: "tiger", difficulty: "easy", category: "animals" },
  { text: "pizza", difficulty: "easy", category: "food" },
  { text: "volcano", difficulty: "medium", category: "nature" },
  { text: "astronaut", difficulty: "medium", category: "people" },
  { text: "parachute", difficulty: "hard", category: "objects" },
];

function pickRandom(items, count) {
  const pool = [...items];
  const picked = [];
  while (picked.length < count && pool.length > 0) {
    const index = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(index, 1)[0]);
  }
  return picked;
}

export async function fetchWordOptions(room, count = 3) {
  const used = room.usedWords || [];
  const matchStage = used.length
    ? { $match: { text: { $nin: used } } }
    : { $match: {} };

  try {
    const options = await Word.aggregate([
      matchStage,
      { $sample: { size: count } },
      { $project: { text: 1, difficulty: 1, category: 1, _id: 0 } },
    ]);

    if (options.length >= count) {
      return options;
    }

    const fallback = pickRandom(
      FALLBACK_WORDS.filter((w) => !used.includes(w.text)),
      count - options.length,
    );
    return [...options, ...fallback].slice(0, count);
  } catch (error) {
    console.error("Word fetch error:", error);
    return pickRandom(
      FALLBACK_WORDS.filter((w) => !used.includes(w.text)),
      count,
    );
  }
}

export function markWordUsed(room, wordText) {
  if (!room.usedWords) room.usedWords = [];
  if (!room.usedWords.includes(wordText)) {
    room.usedWords.push(wordText);
  }
}

export function buildWordDisplay(word) {
  return word
    .split("")
    .map((char) => (char === " " ? " " : "_"))
    .join(" ");
}

export function isExactWordMatch(message, secretWord) {
  return (message || "").trim().toLowerCase() === (secretWord || "").trim().toLowerCase();
}
