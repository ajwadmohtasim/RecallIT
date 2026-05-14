import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { normalizeFsrsSettings } from '../services/fsrsService.js';
import { getCurrentGoalProgress } from '../services/progressService.js';

const router = Router();

const signToken = (user) => {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email, name: user.name },
    process.env.JWT_SECRET || 'dev-secret-change-me',
    { expiresIn: '7d' }
  );
};

const toPublicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  fsrsSettings: normalizeFsrsSettings(user.fsrsSettings || {}),
  stats: {
    dailyGoal: Number(user?.stats?.dailyGoal || 20),
    currentStreak: Number(user?.stats?.currentStreak || 0),
    bestStreak: Number(user?.stats?.bestStreak || 0),
    totalXp: Number(user?.stats?.totalXp || 0),
    lastGoalMetOn: user?.stats?.lastGoalMetOn || null,
  },
});

router.post('/register', async (req, res, next) => {
  try {
    const name = req.body?.name?.trim();
    const email = req.body?.email?.trim().toLowerCase();
    const password = req.body?.password || '';

    if (!name || !email || password.length < 6) {
      return res
        .status(400)
        .json({ message: 'Name, email, and password (min 6 chars) are required.' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'Email is already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash });
    const token = signToken(user);

    res.status(201).json({
      token,
      user: toPublicUser(user),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const email = req.body?.email?.trim().toLowerCase();
    const password = req.body?.password || '';

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = signToken(user);
    res.json({
      token,
      user: toPublicUser(user),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) {
      return res.status(401).json({ message: 'User no longer exists.' });
    }

    const goalProgress = await getCurrentGoalProgress(user._id, user?.stats?.dailyGoal || 20);

    res.json({
      ...toPublicUser(user),
      goalProgress,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/settings', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) {
      return res.status(401).json({ message: 'User no longer exists.' });
    }

    const goalProgress = await getCurrentGoalProgress(user._id, user?.stats?.dailyGoal || 20);

    res.json({
      fsrsSettings: normalizeFsrsSettings(user.fsrsSettings || {}),
      stats: {
        dailyGoal: Number(user?.stats?.dailyGoal || 20),
        currentStreak: Number(user?.stats?.currentStreak || 0),
        bestStreak: Number(user?.stats?.bestStreak || 0),
        totalXp: Number(user?.stats?.totalXp || 0),
      },
      goalProgress,
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/settings', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ message: 'User no longer exists.' });
    }

    const incomingFsrs = req.body?.fsrsSettings;
    const incomingDailyGoal = req.body?.dailyGoal;

    if (incomingFsrs) {
      user.fsrsSettings = normalizeFsrsSettings({
        ...user.fsrsSettings?.toObject?.(),
        ...incomingFsrs,
      });
    }

    if (incomingDailyGoal !== undefined) {
      const parsed = Number(incomingDailyGoal);
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > 2000) {
        return res.status(400).json({ message: 'dailyGoal must be a number between 1 and 2000.' });
      }

      user.stats = user.stats || {};
      user.stats.dailyGoal = Math.round(parsed);
    }

    await user.save();

    const goalProgress = await getCurrentGoalProgress(user._id, user?.stats?.dailyGoal || 20);

    res.json({
      fsrsSettings: normalizeFsrsSettings(user.fsrsSettings || {}),
      stats: {
        dailyGoal: Number(user?.stats?.dailyGoal || 20),
        currentStreak: Number(user?.stats?.currentStreak || 0),
        bestStreak: Number(user?.stats?.bestStreak || 0),
        totalXp: Number(user?.stats?.totalXp || 0),
      },
      goalProgress,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (_req, res) => {
  res.json({ message: 'Logged out.' });
});

export default router;