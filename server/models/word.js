import mongoose from 'mongoose';

const wordSchema = new mongoose.Schema({
    text: { type: String, required: true, unique: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'easy' }
});

export default mongoose.model('Word', wordSchema);