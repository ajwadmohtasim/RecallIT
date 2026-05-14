import { Router } from 'express';
import mongoose from 'mongoose';
import { Card } from '../models/Card.js';
import { Deck } from '../models/Deck.js';
import { ReviewLog } from '../models/ReviewLog.js';
import { User } from '../models/User.js';
import {
  getCurrentGoalProgress,
  getHeatmapWindowStart,
  startOfDayUtcKey,
} from '../services/progressService.js';

const router = Router();

const DAY_MS = 24 * 60 * 60 * 1000;
const HEATMAP_DAYS = 365;

const startOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const makeCountMap = (rows) => Object.fromEntries(rows.map((row) => [String(row._id), row.count]));

router.get('/', async (req, res, next) => {
  try {
    const ownerId = req.user.id;
    const ownerObjectId = new mongoose.Types.ObjectId(ownerId);
    const now = new Date();
    const todayStart = startOfDay(now);
    const heatmapStart = getHeatmapWindowStart(HEATMAP_DAYS);

    const user = await User.findById(ownerId).lean();
    if (!user) {
      return res.status(401).json({ message: 'User no longer exists.' });
    }

    const decks = await Deck.find({ owner: ownerId }).sort({ name: 1 }).lean();
    const deckIds = decks.map((deck) => deck._id);

    const [
      totalCardsByDeck,
      dueCardsByDeck,
      futureCardsByDeck,
      reviewBreakdownByDeck,
      overallReviewBreakdown,
      reviewedCards,
      todayReviewsCount,
      modeBreakdown,
      topTags,
      dueForecastRows,
      heatmapRows,
    ] = await Promise.all([
      Card.aggregate([
        { $match: { owner: ownerObjectId, deck: { $in: deckIds } } },
        { $group: { _id: '$deck', count: { $sum: 1 } } },
      ]),
      Card.aggregate([
        { $match: { owner: ownerObjectId, deck: { $in: deckIds }, due: { $lte: now } } },
        { $group: { _id: '$deck', count: { $sum: 1 } } },
      ]),
      Card.aggregate([
        { $match: { owner: ownerObjectId, deck: { $in: deckIds }, due: { $gt: now } } },
        { $group: { _id: '$deck', count: { $sum: 1 } } },
      ]),
      ReviewLog.aggregate([
        { $match: { owner: ownerObjectId, deck: { $in: deckIds } } },
        { $group: { _id: { deck: '$deck', rating: '$rating' }, count: { $sum: 1 } } },
      ]),
      ReviewLog.aggregate([{ $match: { owner: ownerObjectId } }, { $group: { _id: '$rating', count: { $sum: 1 } } }]),
      ReviewLog.aggregate([
        { $match: { owner: ownerObjectId } },
        { $group: { _id: '$card' } },
        { $count: 'count' },
      ]),
      ReviewLog.countDocuments({
        owner: ownerObjectId,
        reviewedAt: { $gte: todayStart, $lt: new Date(todayStart.getTime() + DAY_MS) },
      }),
      ReviewLog.aggregate([
        { $match: { owner: ownerObjectId } },
        { $group: { _id: '$mode', count: { $sum: 1 } } },
      ]),
      Card.aggregate([
        { $match: { owner: ownerObjectId, tags: { $exists: true, $ne: [] } } },
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
        { $limit: 12 },
      ]),
      Card.aggregate([
        {
          $match: {
            owner: ownerObjectId,
            due: {
              $gte: todayStart,
              $lt: new Date(todayStart.getTime() + 8 * DAY_MS),
            },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                date: '$due',
                format: '%Y-%m-%d',
              },
            },
            count: { $sum: 1 },
          },
        },
      ]),
      ReviewLog.aggregate([
        {
          $match: {
            owner: ownerObjectId,
            reviewedAt: { $gte: heatmapStart, $lte: now },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                date: '$reviewedAt',
                format: '%Y-%m-%d',
              },
            },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const totalMap = makeCountMap(totalCardsByDeck);
    const dueMap = makeCountMap(dueCardsByDeck);
    const futureMap = makeCountMap(futureCardsByDeck);

    const deckReviewMap = {};
    for (const row of reviewBreakdownByDeck) {
      const deckId = String(row._id.deck);
      if (!deckReviewMap[deckId]) {
        deckReviewMap[deckId] = { again: 0, hard: 0, good: 0, easy: 0 };
      }
      deckReviewMap[deckId][row._id.rating] = row.count;
    }

    const overallReviews = { again: 0, hard: 0, good: 0, easy: 0 };
    for (const row of overallReviewBreakdown) {
      overallReviews[row._id] = row.count;
    }

    const modeStats = { normal: 0, exam: 0, cram: 0, weak: 0 };
    for (const row of modeBreakdown) {
      modeStats[row._id || 'normal'] = row.count;
    }

    const deckMetrics = decks.map((deck) => {
      const key = String(deck._id);
      const totalCards = totalMap[key] || 0;
      const dueNow = dueMap[key] || 0;
      const futureCards = futureMap[key] || 0;
      const reviews = deckReviewMap[key] || { again: 0, hard: 0, good: 0, easy: 0 };

      return {
        deckId: key,
        deckName: deck.name,
        totalCards,
        dueNow,
        futureCards,
        mastered: totalCards > 0 && dueNow === 0,
        needsWork: dueNow > 0,
        reviews,
      };
    });

    const totalCardsAllDecks = deckMetrics.reduce((sum, deck) => sum + deck.totalCards, 0);
    const dueNowAllDecks = deckMetrics.reduce((sum, deck) => sum + deck.dueNow, 0);
    const futureCardsAllDecks = deckMetrics.reduce((sum, deck) => sum + deck.futureCards, 0);

    const rightReviews = overallReviews.good + overallReviews.easy;
    const wrongReviews = overallReviews.again;

    const reviewedCardsCount = reviewedCards[0]?.count || 0;
    const learningProgressPercent =
      totalCardsAllDecks > 0 ? Math.round((reviewedCardsCount / totalCardsAllDecks) * 100) : 0;

    const decksMastered = deckMetrics.filter((deck) => deck.mastered).length;
    const decksNeedWork = deckMetrics.filter((deck) => deck.needsWork).length;

    const dueForecastMap = Object.fromEntries(dueForecastRows.map((row) => [row._id, row.count]));
    const dueForecast = [];
    for (let i = 0; i < 8; i += 1) {
      const day = new Date(todayStart.getTime() + i * DAY_MS);
      const key = startOfDayUtcKey(day);
      dueForecast.push({ date: key, count: dueForecastMap[key] || 0 });
    }

    const heatMapByDate = Object.fromEntries(heatmapRows.map((row) => [row._id, row.count]));
    const heatmap = [];
    for (let i = 0; i < HEATMAP_DAYS; i += 1) {
      const day = new Date(heatmapStart.getTime() + i * DAY_MS);
      const key = startOfDayUtcKey(day);
      heatmap.push({ date: key, count: heatMapByDate[key] || 0 });
    }

    const goalProgress = await getCurrentGoalProgress(ownerId, user?.stats?.dailyGoal || 20);

    res.json({
      summary: {
        totalDecks: decks.length,
        decksMastered,
        decksNeedWork,
        totalCards: totalCardsAllDecks,
        dueNow: dueNowAllDecks,
        futureCardsLeftToReview: futureCardsAllDecks,
        learningProgressPercent,
        rightReviews,
        wrongReviews,
        struggledReviews: overallReviews.hard,
        todayReviews: todayReviewsCount,
        currentStreak: Number(user?.stats?.currentStreak || 0),
        bestStreak: Number(user?.stats?.bestStreak || 0),
        totalXp: Number(user?.stats?.totalXp || 0),
      },
      goalProgress,
      modeStats,
      topTags,
      dueForecast,
      heatmap,
      deckMetrics,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
