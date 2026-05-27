import mongoose from "mongoose";

const wordSchema = new mongoose.Schema({
  text: { type: String, required: true, unique: true, trim: true },
  difficulty: {
    type: String,
    enum: ["easy", "medium", "hard"],
    default: "easy",
    index: true,
  },
  category: { type: String, default: "general", index: true },
});

wordSchema.index({ difficulty: 1, category: 1 });

export default mongoose.model("Word", wordSchema);
