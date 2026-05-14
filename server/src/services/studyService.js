import { Card } from '../models/Card.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

const normalizeTags = (tags = []) => {
  return [...new Set(tags.map((tag) => String(tag || '').trim().toLowerCase()).filter(Boolean))];
};

const isWeakCard = (card) => {
  const reps = Number(card?.fsrsCard?.reps || 0);
  const lapses = Number(card?.fsrsCard?.lapses || 0);
  const difficulty = Number(card?.fsrsCard?.difficulty || 0);

  if (reps === 0) return true;
  if (lapses >= 2) return true;
  if (reps >= 3 && lapses / reps >= 0.34) return true;
  return difficulty >= 7;
};

const pickWeightedRandom = (cards, mode, now) => {
  const nowTs = now.getTime();

  const weighted = cards.map((card) => {
    const dueTs = new Date(card.due).getTime();
    const overdueDays = Math.max(0, (nowTs - dueTs) / DAY_MS);
    const untilDueHours = (dueTs - nowTs) / HOUR_MS;
    const weakBoost = isWeakCard(card) ? 1.35 : 1;

    let weight = 1 + overdueDays;

    if (mode === 'cram') {
      if (dueTs <= nowTs) {
        const overdueHours = (nowTs - dueTs) / HOUR_MS;
        weight = 2 + overdueHours / 6;
      } else {
        weight = 1 / (1 + Math.max(0, untilDueHours) / 12);
      }
    }

    return { card, weight: Math.max(0.1, weight * weakBoost) };
  });

  const sum = weighted.reduce((acc, cur) => acc + cur.weight, 0);
  const target = Math.random() * sum;
  let running = 0;

  for (const item of weighted) {
    running += item.weight;
    if (running >= target) return item.card;
  }

  return weighted[weighted.length - 1]?.card || null;
};

const applyModeRules = (cards, mode) => {
  if (mode === 'weak') {
    return cards.filter(isWeakCard);
  }

  if (mode === 'exam') {
    return cards.filter((card) => {
      const reps = Number(card?.fsrsCard?.reps || 0);
      const lapses = Number(card?.fsrsCard?.lapses || 0);
      const difficulty = Number(card?.fsrsCard?.difficulty || 0);
      return reps < 3 || lapses > 0 || difficulty >= 6;
    });
  }

  return cards;
};

const buildDueFilter = ({ dueScope, mode, now }) => {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  if (dueScope === 'overdue') {
    return { $lt: startOfToday };
  }

  if (dueScope === 'today') {
    return { $gte: startOfToday, $lt: endOfToday };
  }

  if (dueScope === 'any') {
    if (mode === 'cram') {
      const cramHorizon = new Date(now.getTime() + 36 * HOUR_MS);
      return { $lte: cramHorizon };
    }
    return undefined;
  }

  if (mode === 'cram') {
    const cramHorizon = new Date(now.getTime() + 36 * HOUR_MS);
    return { $lte: cramHorizon };
  }

  return { $lte: now };
};

export const getNextCardForDeck = async ({
  deckId,
  ownerId,
  mode = 'normal',
  filters = {},
}) => {
  const now = new Date();
  const safeMode = ['normal', 'exam', 'cram', 'weak'].includes(mode) ? mode : 'normal';
  const dueScope = ['due', 'overdue', 'today', 'any'].includes(filters.dueScope)
    ? filters.dueScope
    : 'due';
  const weakOnly = Boolean(filters.weakOnly);
  const tags = normalizeTags(filters.tags || []);

  const query = {
    owner: ownerId,
    deck: deckId,
  };

  if (tags.length) {
    query.tags = { $in: tags };
  }

  const dueFilter = buildDueFilter({ dueScope, mode: safeMode, now });
  if (dueFilter) {
    query.due = dueFilter;
  }

  const cards = await Card.find(query).sort({ due: 1 }).limit(250).lean();

  if (!cards.length) {
    return null;
  }

  let scoped = applyModeRules(cards, safeMode);

  if (weakOnly) {
    scoped = scoped.filter(isWeakCard);
  }

  if (!scoped.length && safeMode !== 'normal') {
    scoped = applyModeRules(cards, 'normal');
    if (weakOnly) {
      scoped = scoped.filter(isWeakCard);
    }
  }

  if (!scoped.length) {
    return null;
  }

  return pickWeightedRandom(scoped, safeMode, now);
};

export const normalizeStudyFilters = (raw = {}) => {
  return {
    mode: ['normal', 'exam', 'cram', 'weak'].includes(raw.mode) ? raw.mode : 'normal',
    dueScope: ['due', 'overdue', 'today', 'any'].includes(raw.dueScope) ? raw.dueScope : 'due',
    weakOnly: String(raw.weakOnly || '') === 'true' || raw.weakOnly === true,
    tags: normalizeTags(typeof raw.tags === 'string' ? raw.tags.split(',') : raw.tags || []),
  };
};

export const calculateXpForRating = (rating) => {
  if (rating === 'easy') return 16;
  if (rating === 'good') return 12;
  if (rating === 'hard') return 8;
  return 4;
};