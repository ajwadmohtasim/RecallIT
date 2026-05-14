import mongoose from 'mongoose';

const reviewLogSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    card: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Card',
      required: true,
      index: true,
    },
    deck: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Deck',
      required: true,
      index: true,
    },
    rating: {
      type: String,
      enum: ['again', 'hard', 'good', 'easy'],
      required: true,
    },
    mode: {
      type: String,
      enum: ['normal', 'exam', 'cram', 'weak'],
      default: 'normal',
    },
    dueScope: {
      type: String,
      enum: ['due', 'overdue', 'today', 'any'],
      default: 'due',
    },
    weakOnly: {
      type: Boolean,
      default: false,
    },
    tagsApplied: {
      type: [String],
      default: [],
    },
    reviewedAt: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
  },
  { timestamps: true }
);

reviewLogSchema.index({ owner: 1, reviewedAt: -1 });

export const ReviewLog = mongoose.model('ReviewLog', reviewLogSchema);