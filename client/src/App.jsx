import { useEffect, useMemo, useState } from 'react';
import CardComposer from './components/CardComposer';
import EditableBoard from './components/EditableBoard';
import MetricsBoard from './components/MetricsBoard';
import StudyCard from './components/StudyCard';
import {
  createCard,
  createDeck,
  deleteCard,
  getCurrentUser,
  listCardsByDeck,
  loginUser,
  listDecks,
  nextCard,
  revealCard,
  registerUser,
  logoutUser,
  getMetrics,
  submitReview,
  updateCard,
  updateUserSettings,
} from './api/studyApi';
import { getStoredAuthToken, setAuthToken } from './api/client';

const defaultStudyOptions = {
  mode: 'normal',
  dueScope: 'due',
  weakOnly: false,
  tags: [],
};

const defaultSettings = {
  dailyGoal: 20,
  fsrsSettings: {
    requestRetention: 0.9,
    enableShortTerm: true,
    enableFuzz: true,
  },
};

const getApiErrorMessage = (err, fallback) => {
  if (err?.response?.data?.message) return err.response.data.message;

  if (err?.code === 'ERR_NETWORK') {
    return 'Cannot reach backend. Ensure server is running and MongoDB is connected.';
  }

  return fallback;
};

const parseTags = (text = '') => {
  return [...new Set(text.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean))];
};

const buildUpcomingCards = (cards, currentCardId) => {
  return [...cards]
    .filter((card) => String(card._id) !== String(currentCardId || ''))
    .sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime())
    .slice(0, 8)
    .map((card, idx) => ({
      id: card._id,
      position: idx + 1,
      due: card.due,
      tags: card.tags || [],
    }));
};

const App = () => {
  const [theme, setTheme] = useState(() => localStorage.getItem('recallit-theme') || 'dark');
  const [authReady, setAuthReady] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authLoading, setAuthLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });

  const [settings, setSettings] = useState(defaultSettings);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [goalProgress, setGoalProgress] = useState(null);
  const [sessionStats, setSessionStats] = useState({ currentStreak: 0, bestStreak: 0, totalXp: 0 });
  const [lastReward, setLastReward] = useState(0);

  const [decks, setDecks] = useState([]);
  const [selectedDeckId, setSelectedDeckId] = useState('');
  const [studyOptions, setStudyOptions] = useState(defaultStudyOptions);
  const [tagInput, setTagInput] = useState('');
  const [currentCard, setCurrentCard] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [upcomingCards, setUpcomingCards] = useState([]);

  const [showMenu, setShowMenu] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [showEditableBoard, setShowEditableBoard] = useState(false);
  const [showMetricsPanel, setShowMetricsPanel] = useState(false);
  const [showDeckManager, setShowDeckManager] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [deckForm, setDeckForm] = useState({ name: '', description: '' });
  const [boardCards, setBoardCards] = useState([]);
  const [boardLoading, setBoardLoading] = useState(false);
  const [metricsData, setMetricsData] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState({
    dailyGoal: 20,
    requestRetention: 0.9,
    enableShortTerm: true,
    enableFuzz: true,
  });

  const selectedDeck = useMemo(() => decks.find((deck) => deck._id === selectedDeckId), [decks, selectedDeckId]);

  const hydrateSession = (me) => {
    setUser({ id: me.id, name: me.name, email: me.email });

    const hydratedSettings = {
      dailyGoal: Number(me?.stats?.dailyGoal || 20),
      fsrsSettings: {
        requestRetention: Number(me?.fsrsSettings?.requestRetention || 0.9),
        enableShortTerm: me?.fsrsSettings?.enableShortTerm ?? true,
        enableFuzz: me?.fsrsSettings?.enableFuzz ?? true,
      },
    };

    setSettings(hydratedSettings);
    setSettingsDraft({
      dailyGoal: hydratedSettings.dailyGoal,
      requestRetention: hydratedSettings.fsrsSettings.requestRetention,
      enableShortTerm: hydratedSettings.fsrsSettings.enableShortTerm,
      enableFuzz: hydratedSettings.fsrsSettings.enableFuzz,
    });

    setSessionStats({
      currentStreak: Number(me?.stats?.currentStreak || 0),
      bestStreak: Number(me?.stats?.bestStreak || 0),
      totalXp: Number(me?.stats?.totalXp || 0),
    });

    setGoalProgress(
      me.goalProgress || {
        reviewedToday: 0,
        dailyGoal: Number(me?.stats?.dailyGoal || 20),
        remaining: Number(me?.stats?.dailyGoal || 20),
        goalMetToday: false,
      }
    );
  };

  const refreshDecks = async () => {
    const data = await listDecks();
    setDecks(data);

    if (!selectedDeckId && data.length > 0) {
      setSelectedDeckId(data[0]._id);
    }

    if (selectedDeckId && !data.some((d) => d._id === selectedDeckId)) {
      setSelectedDeckId(data[0]?._id || '');
    }
  };

  const fetchUpcomingCards = async (deckId, cardId = null) => {
    if (!deckId) {
      setUpcomingCards([]);
      return;
    }

    try {
      const cards = await listCardsByDeck(deckId);
      setUpcomingCards(buildUpcomingCards(cards, cardId || currentCard?._id));
    } catch (_err) {
      setUpcomingCards([]);
    }
  };

  const refreshEditableBoardCards = async (deckId = selectedDeckId) => {
    if (!deckId) {
      setBoardCards([]);
      return;
    }

    setBoardLoading(true);
    try {
      const cards = await listCardsByDeck(deckId);
      setBoardCards(cards);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load editable board cards.'));
    } finally {
      setBoardLoading(false);
    }
  };

  const loadNextCard = async (deckId, options = studyOptions) => {
    if (!deckId) return null;

    setLoading(true);
    setError('');

    try {
      const result = await nextCard(deckId, {
        mode: options.mode,
        dueScope: options.dueScope,
        weakOnly: options.weakOnly,
        tags: options.tags.join(','),
      });

      setDone(result.done);
      setRevealed(false);

      if (result.done || !result.card) {
        setCurrentCard({ _id: null, title: '', question: 'No matching cards are available.', answer: '', tags: [] });
        return null;
      }

      setCurrentCard(result.card);
      return result.card;
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load next card.'));
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('recallit-theme', theme);
  }, [theme]);

  useEffect(() => {
    const initAuth = async () => {
      const token = getStoredAuthToken();
      if (!token) {
        setAuthReady(true);
        return;
      }

      setAuthToken(token);
      try {
        const me = await getCurrentUser();
        hydrateSession(me);
      } catch (_err) {
        setAuthToken('');
        setUser(null);
      } finally {
        setAuthReady(true);
      }
    };

    initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) return;
    refreshDecks().catch((err) => {
      setError(getApiErrorMessage(err, 'Failed to load decks.'));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    setTagInput(studyOptions.tags.join(', '));
  }, [studyOptions.tags]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.target?.tagName || '').match(/INPUT|TEXTAREA|SELECT/)) return;
      if (e.key.toLowerCase() === 'z') {
        setIsZenMode((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsZenMode(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!user || !selectedDeckId) return;

    const run = async () => {
      const card = await loadNextCard(selectedDeckId, studyOptions);
      await fetchUpcomingCards(selectedDeckId, card?._id || null);
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDeckId, user, studyOptions.mode, studyOptions.dueScope, studyOptions.weakOnly, studyOptions.tags.join('|')]);

  const handleReveal = async () => {
    if (!currentCard?._id) return;

    setLoading(true);
    setError('');

    try {
      const fullCard = await revealCard(currentCard._id);
      setCurrentCard(fullCard);
      setRevealed(true);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to reveal answer.'));
    } finally {
      setLoading(false);
    }
  };

  const handleHideAnswer = () => {
    setRevealed(false);
  };

  const handleRate = async (rating) => {
    if (!selectedDeckId || !currentCard?._id) return;

    setLoading(true);
    setError('');

    try {
      const result = await submitReview(selectedDeckId, currentCard._id, rating, {
        mode: studyOptions.mode,
        dueScope: studyOptions.dueScope,
        weakOnly: studyOptions.weakOnly,
        tags: studyOptions.tags,
      });

      setLastReward(result?.gainedXp || 0);
      if (result?.goalProgress) setGoalProgress(result.goalProgress);
      if (result?.stats) setSessionStats(result.stats);

      await refreshDecks();
      const next = await loadNextCard(selectedDeckId, studyOptions);
      await fetchUpcomingCards(selectedDeckId, next?._id || null);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to save review.'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeckCreated = async (payload) => {
    setError('');
    try {
      const deck = await createDeck(payload);
      await refreshDecks();
      setSelectedDeckId(deck._id);
      setDeckForm({ name: '', description: '' });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to create deck.'));
    }
  };

  const handleCardCreated = async (payload) => {
    setError('');
    try {
      await createCard(payload);
      await refreshDecks();
      const next = await loadNextCard(selectedDeckId, studyOptions);
      await fetchUpcomingCards(selectedDeckId, next?._id || null);
      setShowComposer(false);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to add card.'));
    }
  };

  const handleOpenEditableBoard = async () => {
    if (!selectedDeckId) return;
    setShowEditableBoard(true);
    await refreshEditableBoardCards(selectedDeckId);
  };

  const handleUpdateCard = async (cardId, payload) => {
    setError('');
    try {
      await updateCard(cardId, payload);
      await refreshDecks();
      const next = await loadNextCard(selectedDeckId, studyOptions);
      await fetchUpcomingCards(selectedDeckId, next?._id || null);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to update card.'));
    }
  };

  const handleDeleteCard = async (cardId) => {
    setError('');
    try {
      await deleteCard(cardId);
      await refreshDecks();
      const next = await loadNextCard(selectedDeckId, studyOptions);
      await fetchUpcomingCards(selectedDeckId, next?._id || null);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to delete card.'));
    }
  };

  const refreshMetrics = async () => {
    setMetricsLoading(true);
    try {
      const data = await getMetrics();
      setMetricsData(data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load metrics.'));
    } finally {
      setMetricsLoading(false);
    }
  };

  const handleOpenMetrics = async () => {
    setShowMetricsPanel(true);
    await refreshMetrics();
  };

  const handleSettingsSave = async () => {
    setSettingsSaving(true);
    setError('');

    try {
      const result = await updateUserSettings({
        dailyGoal: Number(settingsDraft.dailyGoal || 20),
        fsrsSettings: {
          requestRetention: Number(settingsDraft.requestRetention || 0.9),
          enableShortTerm: Boolean(settingsDraft.enableShortTerm),
          enableFuzz: Boolean(settingsDraft.enableFuzz),
        },
      });

      setSettings({
        dailyGoal: Number(result?.stats?.dailyGoal || 20),
        fsrsSettings: {
          requestRetention: Number(result?.fsrsSettings?.requestRetention || 0.9),
          enableShortTerm: result?.fsrsSettings?.enableShortTerm ?? true,
          enableFuzz: result?.fsrsSettings?.enableFuzz ?? true,
        },
      });
      setGoalProgress(result.goalProgress || null);
      setShowSettingsPanel(false);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to save settings.'));
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setAuthLoading(true);

    try {
      const payload =
        authMode === 'register'
          ? {
              name: authForm.name,
              email: authForm.email,
              password: authForm.password,
            }
          : { email: authForm.email, password: authForm.password };

      const result = authMode === 'register' ? await registerUser(payload) : await loginUser(payload);
      setAuthToken(result.token);

      const me = await getCurrentUser();
      hydrateSession(me);

      setAuthForm({ name: '', email: '', password: '' });
      setSelectedDeckId('');
      setCurrentCard(null);
      setRevealed(false);
      setDone(false);
      setError('');
    } catch (err) {
      setError(getApiErrorMessage(err, `Failed to ${authMode}.`));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    setError('');
    try {
      await logoutUser();
    } catch (_err) {
      // no-op
    }
    setAuthToken('');
    setUser(null);
    setDecks([]);
    setSelectedDeckId('');
    setCurrentCard(null);
    setRevealed(false);
    setDone(false);
    setSettings(defaultSettings);
    setGoalProgress(null);
    setSessionStats({ currentStreak: 0, bestStreak: 0, totalXp: 0 });
    setUpcomingCards([]);
    setBoardCards([]);
    setMetricsData(null);
    setShowMenu(false);
    setShowComposer(false);
    setShowEditableBoard(false);
    setShowMetricsPanel(false);
  };

  const applyTagFilter = () => {
    setStudyOptions((prev) => ({
      ...prev,
      tags: parseTags(tagInput),
    }));
  };

  if (!authReady) {
    return (
      <div className="app">
        <div className="panel auth-panel">
          <h2>Checking session...</h2>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app">
        <header className="top-shell">
          <h1>RecallIT</h1>
          <button
            className="btn btn-ghost"
            onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
          >
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
        </header>

        <div className="panel auth-panel">
          <h2>{authMode === 'login' ? 'Login' : 'Create Account'}</h2>
          <form className="stack" onSubmit={handleAuthSubmit}>
            {authMode === 'register' && (
              <input
                className="input"
                placeholder="Name"
                value={authForm.name}
                onChange={(e) => setAuthForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            )}
            <input
              className="input"
              placeholder="Email"
              type="email"
              value={authForm.email}
              onChange={(e) => setAuthForm((prev) => ({ ...prev, email: e.target.value }))}
              required
            />
            <input
              className="input"
              placeholder="Password"
              type="password"
              minLength={6}
              value={authForm.password}
              onChange={(e) => setAuthForm((prev) => ({ ...prev, password: e.target.value }))}
              required
            />
            <button className="btn" type="submit" disabled={authLoading}>
              {authLoading ? 'Please wait...' : authMode === 'login' ? 'Login' : 'Create Account'}
            </button>
          </form>
          <button
            className="btn btn-ghost"
            onClick={() => setAuthMode((prev) => (prev === 'login' ? 'register' : 'login'))}
            type="button"
          >
            {authMode === 'login' ? 'Need an account? Register' : 'Already have an account? Login'}
          </button>
          {error && <div className="error">{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className={`app stage-app ${isZenMode ? 'zen-mode' : ''}`}>
      {!isZenMode ? (
        <button className={`side-toggle ${showMenu ? 'open' : ''}`} onClick={() => setShowMenu((prev) => !prev)}>
          {showMenu ? 'Close' : 'Menu'}
        </button>
      ) : null}

      {!isZenMode && showMenu ? <button className="menu-scrim" onClick={() => setShowMenu(false)} aria-label="Close menu" /> : null}

      {!isZenMode ? (
      <aside className={`side-menu panel ${showMenu ? 'open' : ''}`}>
        <div className="menu-head">
          <h2>Study Console</h2>
          <p className="muted-text">{user.name}</p>
          <p className="muted-text">XP {sessionStats.totalXp} | Streak {sessionStats.currentStreak}</p>
        </div>

        <div className="menu-group">
          <label>Deck</label>
          <select className="input" value={selectedDeckId || ''} onChange={(e) => setSelectedDeckId(e.target.value)}>
            <option value="">Select a deck</option>
            {decks.map((deck) => (
              <option key={deck._id} value={deck._id}>
                {deck.name} ({deck.dueCards}/{deck.totalCards})
              </option>
            ))}
          </select>
          <div className="menu-button-row">
            <button className="btn btn-ghost" onClick={() => setShowDeckManager(true)}>
              Decks
            </button>
            <button className="btn btn-ghost" onClick={() => setShowComposer(true)} disabled={!selectedDeckId}>
              Add Card
            </button>
            <button className="btn btn-ghost" onClick={handleOpenEditableBoard} disabled={!selectedDeckId}>
              Card Board
            </button>
            <button className="btn btn-ghost" onClick={() => setShowSettingsPanel(true)}>
              Settings
            </button>
            <button className="btn btn-ghost" onClick={handleOpenMetrics}>
              Metrics
            </button>
          </div>
        </div>

        <div className="menu-group">
          <label>Mode</label>
          <select
            className="input"
            value={studyOptions.mode}
            onChange={(e) => setStudyOptions((prev) => ({ ...prev, mode: e.target.value }))}
          >
            <option value="normal">Normal</option>
            <option value="exam">Exam</option>
            <option value="cram">Cram</option>
            <option value="weak">Weak</option>
          </select>

          <label>Scope</label>
          <select
            className="input"
            value={studyOptions.dueScope}
            onChange={(e) => setStudyOptions((prev) => ({ ...prev, dueScope: e.target.value }))}
          >
            <option value="due">Due</option>
            <option value="overdue">Overdue</option>
            <option value="today">Today</option>
            <option value="any">Any</option>
          </select>

          <label>Tags</label>
          <input
            className="input"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="dp, trees"
          />
          <button className="btn" onClick={applyTagFilter}>
            Apply Tags
          </button>

          <label className="inline-check">
            <input
              type="checkbox"
              checked={studyOptions.weakOnly}
              onChange={(e) => setStudyOptions((prev) => ({ ...prev, weakOnly: e.target.checked }))}
            />
            Weak only
          </label>
        </div>

        <div className="menu-footer">
          <button
            className="btn btn-ghost"
            onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
          >
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
          <button className="btn btn-ghost" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>
      ) : null}

      <main className="focus-stage">
        {isZenMode ? <div className="zen-badge">ZEN</div> : null}
        {error && <div className="error">{error}</div>}
        <StudyCard
          currentCard={currentCard}
          revealed={revealed}
          loading={loading}
          done={done}
          onReveal={handleReveal}
          onHideAnswer={handleHideAnswer}
          onRate={handleRate}
          studyOptions={studyOptions}
          goalProgress={goalProgress}
          sessionStats={sessionStats}
          lastReward={lastReward}
          selectedDeckName={selectedDeck?.name || ''}
          upcomingCards={upcomingCards}
          isZenMode={isZenMode}
        />
      </main>

      {showDeckManager && (
        <section className="overlay" onClick={() => setShowDeckManager(false)}>
          <div className="overlay-card" onClick={(e) => e.stopPropagation()}>
            <div className="overlay-head">
              <h3>Deck Manager</h3>
              <button className="btn btn-ghost" onClick={() => setShowDeckManager(false)}>
                Close
              </button>
            </div>

            <form
              className="stack"
              onSubmit={(e) => {
                e.preventDefault();
                if (!deckForm.name.trim()) return;
                handleDeckCreated(deckForm);
              }}
            >
              <input
                className="input"
                placeholder="Deck name"
                value={deckForm.name}
                onChange={(e) => setDeckForm((prev) => ({ ...prev, name: e.target.value }))}
              />
              <textarea
                className="input"
                placeholder="Description"
                value={deckForm.description}
                onChange={(e) => setDeckForm((prev) => ({ ...prev, description: e.target.value }))}
              />
              <button className="btn" type="submit">
                Create Deck
              </button>
            </form>

            <div className="deck-grid">
              {decks.map((deck) => (
                <button
                  key={deck._id}
                  className={`deck-tile ${deck._id === selectedDeckId ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedDeckId(deck._id);
                    setShowDeckManager(false);
                  }}
                >
                  <strong>{deck.name}</strong>
                  <span>
                    {deck.dueCards} due / {deck.totalCards} total
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {showComposer && (
        <section className="overlay" onClick={() => setShowComposer(false)}>
          <div className="overlay-card composer-wrap" onClick={(e) => e.stopPropagation()}>
            <CardComposer
              selectedDeckName={selectedDeck?.name}
              selectedDeckId={selectedDeckId}
              onClose={() => setShowComposer(false)}
              onCreateCard={handleCardCreated}
            />
          </div>
        </section>
      )}

      {showEditableBoard && (
        <section className="overlay" onClick={() => setShowEditableBoard(false)}>
          <div className="overlay-card composer-wrap" onClick={(e) => e.stopPropagation()}>
            <EditableBoard
              selectedDeckName={selectedDeck?.name}
              selectedDeckId={selectedDeckId}
              cards={boardCards}
              loading={boardLoading}
              onRefresh={() => refreshEditableBoardCards(selectedDeckId)}
              onUpdateCard={handleUpdateCard}
              onDeleteCard={handleDeleteCard}
              onClose={() => setShowEditableBoard(false)}
            />
          </div>
        </section>
      )}

      {showMetricsPanel && (
        <section className="overlay" onClick={() => setShowMetricsPanel(false)}>
          <div className="overlay-card composer-wrap" onClick={(e) => e.stopPropagation()}>
            <MetricsBoard
              metrics={metricsData}
              loading={metricsLoading}
              onRefresh={refreshMetrics}
              onClose={() => setShowMetricsPanel(false)}
            />
          </div>
        </section>
      )}

      {showSettingsPanel && (
        <section className="overlay" onClick={() => setShowSettingsPanel(false)}>
          <div className="overlay-card" onClick={(e) => e.stopPropagation()}>
            <div className="overlay-head">
              <h3>Study Settings</h3>
              <button className="btn btn-ghost" onClick={() => setShowSettingsPanel(false)}>
                Close
              </button>
            </div>

            <div className="stack">
              <label>Daily goal</label>
              <input
                className="input"
                type="number"
                min={1}
                max={2000}
                value={settingsDraft.dailyGoal}
                onChange={(e) => setSettingsDraft((prev) => ({ ...prev, dailyGoal: Number(e.target.value) }))}
              />

              <label>Retention ({settingsDraft.requestRetention.toFixed(2)})</label>
              <input
                className="input"
                type="range"
                min={0.75}
                max={0.99}
                step={0.01}
                value={settingsDraft.requestRetention}
                onChange={(e) =>
                  setSettingsDraft((prev) => ({
                    ...prev,
                    requestRetention: Number(e.target.value),
                  }))
                }
              />

              <label className="inline-check">
                <input
                  type="checkbox"
                  checked={settingsDraft.enableShortTerm}
                  onChange={(e) =>
                    setSettingsDraft((prev) => ({
                      ...prev,
                      enableShortTerm: e.target.checked,
                    }))
                  }
                />
                Enable short-term steps
              </label>

              <label className="inline-check">
                <input
                  type="checkbox"
                  checked={settingsDraft.enableFuzz}
                  onChange={(e) =>
                    setSettingsDraft((prev) => ({
                      ...prev,
                      enableFuzz: e.target.checked,
                    }))
                  }
                />
                Enable interval fuzz
              </label>

              <button className="btn" onClick={handleSettingsSave} disabled={settingsSaving}>
                {settingsSaving ? 'Saving...' : 'Save Settings'}
              </button>

              {goalProgress && (
                <p className="muted-text">
                  Today: {goalProgress.reviewedToday}/{goalProgress.dailyGoal} ({goalProgress.remaining} left)
                </p>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default App;
