import mongoose from 'mongoose';
import { createEmptyCard } from 'ts-fsrs';

const cardVersionSchema = new mongoose.Schema(
  {
    title: { type: String, default: '', trim: true },
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true },
    tags: { type: [String], default: [] },
    editedAt: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const cardSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    deck: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Deck',
      required: true,
      index: true,
    },
    question: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      trim: true,
      default: '',
    },
    answer: {
      type: String,
      required: true,
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    history: {
      type: [cardVersionSchema],
      default: [],
    },
    fsrsCard: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: () => {
        const base = createEmptyCard();
        return {
          ...base,
          due: new Date(base.due),
          last_review: base.last_review ? new Date(base.last_review) : null,
        };
      },
    },
    due: {
      type: Date,
      required: true,
      index: true,
      default: () => new Date(),
    },
  },
  { timestamps: true }
);

cardSchema.index({ owner: 1, deck: 1, due: 1 });

export const Card = mongoose.model('Card', cardSchema);