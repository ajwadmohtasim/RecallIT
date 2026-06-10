import { ReviewLog } from '../models/ReviewLog.js';

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const dayRange = (date) => {
  const start = startOfDay(date);
  const end = new Date(start.getTime() + DAY_MS);
  return { start, end };
};

const isSameDay = (a, b) => {
  if (!a || !b) return false;
  return startOfDay(a).getTime() === startOfDay(b).getTime();
};

export const getDailyReviewCount = async (ownerId, date = new Date()) => {
  const { start, end } = dayRange(date);
  return ReviewLog.countDocuments({
    owner: ownerId,
    reviewedAt: { $gte: start, $lt: end },
  });
};

export const updateUserProgressAfterReview = async ({ user, reviewedAt, xp }) => {
  user.stats = user.stats || {};

  const dailyGoal = Math.max(1, Number(user.stats.dailyGoal || 20));
  // +1 because this review hasn't been saved to the DB yet when we query
  const reviewedToday = (await getDailyReviewCount(user._id, reviewedAt)) + 1;
  const todayStart = startOfDay(reviewedAt);
  const alreadyMetToday = isSameDay(user.stats.lastGoalMetOn, todayStart);

  if (!alreadyMetToday && reviewedToday >= dailyGoal) {
    const yesterdayStart = new Date(todayStart.getTime() - DAY_MS);
    const metYesterday = isSameDay(user.stats.lastGoalMetOn, yesterdayStart);

    const nextStreak = metYesterday ? Number(user.stats.currentStreak || 0) + 1 : 1;
    user.stats.currentStreak = nextStreak;
    user.stats.bestStreak = Math.max(Number(user.stats.bestStreak || 0), nextStreak);
    user.stats.lastGoalMetOn = todayStart;
  }

  user.stats.totalXp = Math.max(0, Number(user.stats.totalXp || 0) + Math.max(0, Number(xp || 0)));

  return {
    reviewedToday,
    dailyGoal,
    remaining: Math.max(0, dailyGoal - reviewedToday),
    streak: Number(user.stats.currentStreak || 0),
    bestStreak: Number(user.stats.bestStreak || 0),
    totalXp: Number(user.stats.totalXp || 0),
    goalMetToday: reviewedToday >= dailyGoal,
  };
};

export const getCurrentGoalProgress = async (ownerId, dailyGoal, date = new Date()) => {
  const reviewedToday = await getDailyReviewCount(ownerId, date);
  const safeGoal = Math.max(1, Number(dailyGoal || 20));
  return {
    reviewedToday,
    dailyGoal: safeGoal,
    remaining: Math.max(0, safeGoal - reviewedToday),
    goalMetToday: reviewedToday >= safeGoal,
  };
};

export const getHeatmapWindowStart = (days = 41) => {
  const now = new Date();
  const utcStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return new Date(utcStart.getTime() - (days - 1) * DAY_MS);
};

export const startOfDayUtcKey = (date) => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
};
