import { Rating, fsrs } from 'ts-fsrs';

export const DEFAULT_FSRS_SETTINGS = {
  requestRetention: 0.9,
  enableShortTerm: true,
  enableFuzz: true,
};

const RATING_MAP = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

export const normalizeRating = (value) => {
  const key = String(value || '').toLowerCase();
  if (!RATING_MAP[key]) return null;
  return key;
};

const toBool = (value, fallback) =>
  typeof value === 'boolean' ? value : fallback;

export const normalizeFsrsSettings = (settings = {}) => {
  const requestRetentionRaw = Number(settings.requestRetention);
  const requestRetention = Number.isFinite(requestRetentionRaw)
    ? Math.min(0.99, Math.max(0.75, requestRetentionRaw))
    : DEFAULT_FSRS_SETTINGS.requestRetention;

  return {
    requestRetention,
    enableShortTerm: toBool(settings.enableShortTerm, DEFAULT_FSRS_SETTINGS.enableShortTerm),
    enableFuzz: toBool(settings.enableFuzz, DEFAULT_FSRS_SETTINGS.enableFuzz),
  };
};

const getScheduler = (settings = DEFAULT_FSRS_SETTINGS) => {
  const safe = normalizeFsrsSettings(settings);
  return fsrs({
    request_retention: safe.requestRetention,
    enable_short_term: safe.enableShortTerm,
    enable_fuzz: safe.enableFuzz,
  });
};

export const applyReview = (fsrsCard, ratingKey, now = new Date(), fsrsSettings) => {
  const fsrsRating = RATING_MAP[ratingKey];
  const scheduler = getScheduler(fsrsSettings);
  const result = scheduler.next(fsrsCard, now, fsrsRating);

  return {
    fsrsCard: {
      ...result.card,
      due: new Date(result.card.due),
      last_review: result.card.last_review ? new Date(result.card.last_review) : null,
    },
    reviewLog: result.log,
  };
};