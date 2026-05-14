import { Router } from 'express';
import { Card } from '../models/Card.js';
import { ReviewLog } from '../models/ReviewLog.js';
import { User } from '../models/User.js';
import { applyReview, normalizeRating } from '../services/fsrsService.js';
import {
  calculateXpForRating,
  getNextCardForDeck,
  normalizeStudyFilters,
} from '../services/studyService.js';
import { updateUserProgressAfterReview } from '../services/progressService.js';

const router = Router();
const DAY_MS = 24 * 60 * 60 * 1000;

const formatInterval = (dueDate, now = new Date()) => {
  const ms = new Date(dueDate).getTime() - now.getTime();
  const abs = Math.abs(ms);
  const suffix = ms >= 0 ? '' : ' overdue';

  if (abs < 60 * 60 * 1000) {
    const mins = Math.max(1, Math.round(abs / (60 * 1000)));
    return `${mins}m${suffix}`;
  }

  if (abs < DAY_MS) {
    const hours = Math.max(1, Math.round(abs / (60 * 60 * 1000)));
    return `${hours}h${suffix}`;
  }

  const days = Math.max(1, Math.round(abs / DAY_MS));
  return `${days}d${suffix}`;
};

const buildFsrsDiagnostics = (card, now = new Date()) => {
  const fsrs = card?.fsrsCard || {};
  const due = new Date(card?.due || fsrs?.due || now);
  const dueInDays = (due.getTime() - now.getTime()) / DAY_MS;

  return {
    dueAt: due,
    dueIn: formatInterval(due, now),
    dueInDays: Number(dueInDays.toFixed(2)),
    stability: Number((Number(fsrs.stability || 0)).toFixed(2)),
    difficulty: Number((Number(fsrs.difficulty || 0)).toFixed(2)),
    reps: Number(fsrs.reps || 0),
    lapses: Number(fsrs.lapses || 0),
    state: Number(fsrs.state || 0),
    elapsedDays: Number(fsrs.elapsed_days || 0),
    scheduledDays: Number(fsrs.scheduled_days || 0),
  };
};

const buildIntervalPreview = (card, fsrsSettings, now = new Date()) => {
  const ratings = ['again', 'hard', 'good', 'easy'];
  const preview = {};

  for (const ratingKey of ratings) {
    const result = applyReview(card.fsrsCard, ratingKey, now, fsrsSettings);
    preview[ratingKey] = {
      nextDue: result.fsrsCard.due,
      interval: formatInterval(result.fsrsCard.due, now),
      scheduledDays: Number(result.fsrsCard.scheduled_days || 0),
    };
  }

  return preview;
};

router.get('/:deckId/next', async (req, res, next) => {
  try {
    const filters = normalizeStudyFilters(req.query || {});

    const card = await getNextCardForDeck({
      deckId: req.params.deckId,
      ownerId: req.user.id,
      mode: filters.mode,
      filters,
    });

    if (!card) {
      return res.json({ done: true, card: null, mode: filters.mode, filters });
    }

    const now = new Date();
    res.json({
      done: false,
      mode: filters.mode,
      filters,
      card: {
        _id: card._id,
        title: card.title || '',
        question: card.question,
        tags: card.tags || [],
        fsrsDiagnostics: buildFsrsDiagnostics(card, now),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/card/:cardId/reveal', async (req, res, next) => {
  try {
    const card = await Card.findOne({ _id: req.params.cardId, owner: req.user.id }).lean();
    if (!card) {
      return res.status(404).json({ message: 'Card not found.' });
    }
    const user = await User.findById(req.user.id).lean();
    const now = new Date();

    res.json({
      _id: card._id,
      title: card.title || '',
      question: card.question,
      answer: card.answer,
      tags: card.tags || [],
      fsrsDiagnostics: buildFsrsDiagnostics(card, now),
      intervalPreview: buildIntervalPreview(card, user?.fsrsSettings || {}, now),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:deckId/review', async (req, res, next) => {
  try {
    const { cardId, rating } = req.body;
    const ratingKey = normalizeRating(rating);

    if (!cardId || !ratingKey) {
      return res.status(400).json({
        message: 'cardId and valid rating (again, hard, good, easy) are required.',
      });
    }

    const card = await Card.findOne({ _id: cardId, deck: req.params.deckId, owner: req.user.id });

    if (!card) {
      return res.status(404).json({ message: 'Card not found in selected deck.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ message: 'User no longer exists.' });
    }

    const now = new Date();
    const { fsrsCard } = applyReview(card.fsrsCard, ratingKey, now, user.fsrsSettings || {});

    card.fsrsCard = fsrsCard;
    card.due = fsrsCard.due;
    await card.save();

    const mode = ['normal', 'exam', 'cram', 'weak'].includes(req.body?.mode) ? req.body.mode : 'normal';
    const dueScope = ['due', 'overdue', 'today', 'any'].includes(req.body?.dueScope)
      ? req.body.dueScope
      : 'due';
    const tagsApplied = Array.isArray(req.body?.tags)
      ? req.body.tags.map((x) => String(x || '').trim().toLowerCase()).filter(Boolean)
      : [];

    await ReviewLog.create({
      owner: req.user.id,
      card: card._id,
      deck: card.deck,
      rating: ratingKey,
      mode,
      dueScope,
      weakOnly: Boolean(req.body?.weakOnly),
      tagsApplied,
      reviewedAt: now,
    });

    const xp = calculateXpForRating(ratingKey);
    const goalProgress = await updateUserProgressAfterReview({ user, reviewedAt: now, xp });
    await user.save();

    res.json({
      message: 'Review saved.',
      nextDue: card.due,
      gainedXp: xp,
      goalProgress,
      stats: {
        currentStreak: Number(user?.stats?.currentStreak || 0),
        bestStreak: Number(user?.stats?.bestStreak || 0),
        totalXp: Number(user?.stats?.totalXp || 0),
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
