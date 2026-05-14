# RecallIT

RecallIT is a MERN flashcard app that uses the **Free Spaced Repetition Scheduler (FSRS)** to optimize review timing.

## Features

- Deck-based studying (`C++ Advanced`, etc.)
- One-card-at-a-time active recall flow
- Minimal black/white game-inspired UI with 3D playing-card effects
- Side toggle control panel (study controls, filters, settings, deck actions)
- Markdown support in card question/answer content
- Fenced code blocks with syntax highlighting
- Answer reveal before grading
- Separate metrics board window with learning analytics
- Editable card board for browsing, selecting, and updating cards
- Taggable cards + smart queue filters (tags, due scope, weak-only)
- Study modes: `normal`, `exam`, `cram`, `weak`
- Self-grading with FSRS ratings:
  - Wrong (`again`)
  - Struggled (`hard`)
  - Correct (`good`)
  - Easy (`easy`)
- Weighted random pick among due cards (statistical queueing)
- Daily goal, XP, and streak tracking
- User FSRS tuning (`requestRetention`, short-term mode, fuzz)
- Forecast and heatmap analytics (upcoming due load + full-year review activity)
- MongoDB-backed deck/card/review history
- Basic authentication (register, login, logout)

## Stack

- MongoDB
- Express
- React (Vite)
- Node.js
- `ts-fsrs` (official Open Spaced Repetition JS package)
- `react-markdown` + `remark-gfm` + `rehype-pretty-code` + `shiki` for Markdown/code rendering

## Setup

1. Install dependencies:

```bash
npm install
npm install --prefix server
npm install --prefix client
```

2. Configure environment:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

3. Configure database behavior in `server/.env`.

- `MONGO_MODE=auto` (default): try `MONGO_URI` first, then auto-start embedded MongoDB if unavailable.
- `MONGO_MODE=external`: require an external MongoDB (`MONGO_URI`) and fail if unreachable.
- `MONGO_MODE=embedded`: always use embedded local MongoDB (no Docker/system Mongo required).
- Optional: `EMBEDDED_MONGO_DATA_DIR=.local-mongo-data/embedded` to control local DB storage path.

Also set a JWT signing key for auth:
```bash
JWT_SECRET=your-secret-key
```

4. (Optional) Seed sample deck/cards:

```bash
npm run seed
```

5. (Optional) Seed a large reusable dataset (1,000 cards by default):

```bash
npm run seed:bulk
```

- This creates/updates `Arena Fundamentals`, `Arena Algorithms`, `Arena Systems`, and `Arena Mixed Drills`.
- It is idempotent for bulk-generated cards (`bulk-seed-v1` tag), so rerunning will only add missing generated cards.
- To change size, set `BULK_SEED_CARDS_PER_DECK` (default: `250`).

6. Run both frontend and backend:

```bash
npm run dev
```

- Client: `http://localhost:5173`
- Server: `http://localhost:5000`

## Persistent Local Storage (Recommended)

You have three persistence options:

1. **Embedded local MongoDB (no Docker, default with `MONGO_MODE=auto`)**
   - Persists to `.local-mongo-data/embedded` in the project.
2. **Local/system MongoDB**
   - Set `MONGO_MODE=external` and configure `MONGO_URI`.
3. **Docker MongoDB**
   - Use Docker volume persistence:

```bash
npm run db:up
```

Then start app:

```bash
npm run dev
```

Or run both with one command:

```bash
npm run dev:persistent
```

Notes:
- Data is stored in Docker volume `recallit_mongo_data`.
- Embedded mode stores data in `.local-mongo-data/embedded`.

## Data Persistence Note

- The app now supports both external and embedded MongoDB modes.
- For external DB only behavior, set `MONGO_MODE=external`.
- For Docker-free local runs, keep `MONGO_MODE=auto` or set `MONGO_MODE=embedded`.

## API Overview

- `GET /api/decks` list decks with due counts
- `POST /api/auth/register` create account
- `POST /api/auth/login` login
- `GET /api/auth/me` fetch current user
- `POST /api/auth/logout` logout
- `POST /api/decks` create deck
- `POST /api/cards` create card
- `GET /api/study/:deckId/next` get next statistically selected due card
- `GET /api/study/card/:cardId/reveal` reveal answer
- `POST /api/study/:deckId/review` submit rating (`again|hard|good|easy`)
- `GET /api/metrics` dashboard metrics (global + per-deck breakdown)
- `GET /api/auth/settings` fetch daily goal + FSRS user settings
- `PATCH /api/auth/settings` update daily goal + FSRS user settings

## FSRS Notes

- Uses `ts-fsrs` scheduler defaults with:
  - `request_retention: 0.9`
  - `enable_short_term: true`
  - `enable_fuzz: true`
- Each review updates card scheduling fields and next due date.
