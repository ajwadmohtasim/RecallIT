import mongoose from 'mongoose';

const deckSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
);

deckSchema.index({ owner: 1, name: 1 }, { unique: true });

export const Deck = mongoose.model('Deck', deckSchema);