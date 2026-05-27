import dotenv from "dotenv";
import connectDB from "../config/db.js";
import Word from "../models/word.js";

dotenv.config();

const WORDS = [
  { text: "apple", difficulty: "easy", category: "food" },
  { text: "banana", difficulty: "easy", category: "food" },
  { text: "pizza", difficulty: "easy", category: "food" },
  { text: "cookie", difficulty: "easy", category: "food" },
  { text: "ice cream", difficulty: "easy", category: "food" },
  { text: "tiger", difficulty: "easy", category: "animals" },
  { text: "dog", difficulty: "easy", category: "animals" },
  { text: "cat", difficulty: "easy", category: "animals" },
  { text: "fish", difficulty: "easy", category: "animals" },
  { text: "butterfly", difficulty: "easy", category: "animals" },
  { text: "school bus", difficulty: "easy", category: "vehicles" },
  { text: "car", difficulty: "easy", category: "vehicles" },
  { text: "bicycle", difficulty: "easy", category: "vehicles" },
  { text: "airplane", difficulty: "easy", category: "vehicles" },
  { text: "house", difficulty: "easy", category: "places" },
  { text: "beach", difficulty: "easy", category: "places" },
  { text: "tree", difficulty: "easy", category: "nature" },
  { text: "sun", difficulty: "easy", category: "nature" },
  { text: "rainbow", difficulty: "easy", category: "nature" },
  { text: "football", difficulty: "easy", category: "sports" },
  { text: "basketball", difficulty: "easy", category: "sports" },
  { text: "guitar", difficulty: "easy", category: "objects" },
  { text: "phone", difficulty: "easy", category: "objects" },
  { text: "book", difficulty: "easy", category: "objects" },
  { text: "hat", difficulty: "easy", category: "objects" },
  { text: "volcano", difficulty: "medium", category: "nature" },
  { text: "waterfall", difficulty: "medium", category: "nature" },
  { text: "mountain", difficulty: "medium", category: "nature" },
  { text: "astronaut", difficulty: "medium", category: "people" },
  { text: "pirate", difficulty: "medium", category: "people" },
  { text: "wizard", difficulty: "medium", category: "people" },
  { text: "detective", difficulty: "medium", category: "people" },
  { text: "violin", difficulty: "medium", category: "music" },
  { text: "piano", difficulty: "medium", category: "music" },
  { text: "drums", difficulty: "medium", category: "music" },
  { text: "castle", difficulty: "medium", category: "places" },
  { text: "submarine", difficulty: "medium", category: "vehicles" },
  { text: "rocket", difficulty: "medium", category: "vehicles" },
  { text: "campfire", difficulty: "medium", category: "nature" },
  { text: "snowman", difficulty: "medium", category: "objects" },
  { text: "telescope", difficulty: "medium", category: "objects" },
  { text: "skateboard", difficulty: "medium", category: "sports" },
  { text: "surfboard", difficulty: "medium", category: "sports" },
  { text: "parachute", difficulty: "hard", category: "objects" },
  { text: "lighthouse", difficulty: "hard", category: "places" },
  { text: "helicopter", difficulty: "hard", category: "vehicles" },
  { text: "dragon fruit", difficulty: "hard", category: "food" },
  { text: "skyscraper", difficulty: "hard", category: "places" },
  { text: "microscope", difficulty: "hard", category: "objects" },
  { text: "chameleon", difficulty: "hard", category: "animals" },
  { text: "octopus", difficulty: "hard", category: "animals" },
  { text: "accordion", difficulty: "hard", category: "music" },
  { text: "windmill", difficulty: "hard", category: "places" },
  { text: "firefighter", difficulty: "hard", category: "people" },
  { text: "roller coaster", difficulty: "hard", category: "places" },
  { text: "snowflake", difficulty: "hard", category: "nature" },
];

async function seed() {
  await connectDB();

  const unique = new Map();
  for (const entry of WORDS) {
    unique.set(entry.text.toLowerCase(), entry);
  }

  const docs = [...unique.values()];
  let inserted = 0;

  for (const doc of docs) {
    const result = await Word.updateOne(
      { text: doc.text },
      { $set: doc },
      { upsert: true },
    );
    if (result.upsertedCount > 0) inserted++;
  }

  const total = await Word.countDocuments();
  console.log(`Seed complete. New: ${inserted}, Total in DB: ${total}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
