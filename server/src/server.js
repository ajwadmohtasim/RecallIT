import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { connectDB } from './config/db.js';
import { requireAuth } from './middleware/auth.js';
import cardRoutes from './routes/cardRoutes.js';
import deckRoutes from './routes/deckRoutes.js';
import metricsRoutes from './routes/metricsRoutes.js';
import studyRoutes from './routes/studyRoutes.js';
import authRoutes from './routes/authRoutes.js';

dotenv.config();

const app = express();

const parseAllowedOrigins = () => {
  const configured = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  return new Set([...configured, 'http://localhost:5173', 'http://127.0.0.1:5173']);
};

const allowedOrigins = parseAllowedOrigins();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.has(origin)) return callback(null, true);

      try {
        const parsed = new URL(origin);
        const isLocalhost =
          (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') &&
          /^https?:$/.test(parsed.protocol);

        if (isLocalhost) return callback(null, true);
      } catch (_err) {
        // Invalid origins are rejected below.
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRoutes);
app.use('/api/decks', requireAuth, deckRoutes);
app.use('/api/cards', requireAuth, cardRoutes);
app.use('/api/study', requireAuth, studyRoutes);
app.use('/api/metrics', requireAuth, metricsRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err?.code === 11000) {
    return res.status(409).json({ message: 'Duplicate value detected.' });
  }
  res.status(500).json({ message: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;

const boot = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

boot().catch((err) => {
  console.error('Failed to boot server. Check MongoDB connection and MONGO_URI.');
  console.error(err);
  process.exit(1);
});
