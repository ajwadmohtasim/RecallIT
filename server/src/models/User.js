import mongoose from 'mongoose';

const fsrsSettingsSchema = new mongoose.Schema(
  {
    requestRetention: {
      type: Number,
      default: 0.9,
      min: 0.75,
      max: 0.99,
    },
    enableShortTerm: {
      type: Boolean,
      default: true,
    },
    enableFuzz: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

const statsSchema = new mongoose.Schema(
  {
    dailyGoal: {
      type: Number,
      default: 20,
      min: 1,
      max: 2000,
    },
    currentStreak: {
      type: Number,
      default: 0,
      min: 0,
    },
    bestStreak: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastGoalMetOn: {
      type: Date,
      default: null,
    },
    totalXp: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    fsrsSettings: {
      type: fsrsSettingsSchema,
      default: () => ({}),
    },
    stats: {
      type: statsSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model('User', userSchema);