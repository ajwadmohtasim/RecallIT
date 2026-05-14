import { useEffect, useMemo, useState } from 'react';

const tagsToText = (tags) => (Array.isArray(tags) ? tags.join(', ') : '');

const DeckPanel = ({
  decks,
  selectedDeckId,
  onSelectDeck,
  onDeckCreated,
  onOpenComposer,
  onOpenEditableBoard,
  onOpenMetrics,
  studyOptions,
  onStudyOptionsChange,
  settings,
  goalProgress,
  onSaveSettings,
  settingsSaving,
}) => {
  const [deckForm, setDeckForm] = useState({ name: '', description: '' });
  const [tagsInput, setTagsInput] = useState(tagsToText(studyOptions?.tags || []));
  const [settingsDraft, setSettingsDraft] = useState({
    dailyGoal: settings?.dailyGoal || 20,
    requestRetention: settings?.fsrsSettings?.requestRetention || 0.9,
    enableShortTerm: settings?.fsrsSettings?.enableShortTerm ?? true,
    enableFuzz: settings?.fsrsSettings?.enableFuzz ?? true,
  });
  const [activePanel, setActivePanel] = useState('queue');

  const selectedDeck = useMemo(
    () => decks.find((deck) => deck._id === selectedDeckId) || null,
    [decks, selectedDeckId]
  );

  useEffect(() => {
    setTagsInput(tagsToText(studyOptions?.tags || []));
  }, [studyOptions?.tags]);

  useEffect(() => {
    setSettingsDraft({
      dailyGoal: settings?.dailyGoal || 20,
      requestRetention: settings?.fsrsSettings?.requestRetention || 0.9,
      enableShortTerm: settings?.fsrsSettings?.enableShortTerm ?? true,
      enableFuzz: settings?.fsrsSettings?.enableFuzz ?? true,
    });
  }, [settings]);

  const handleDeckSubmit = async (e) => {
    e.preventDefault();
    if (!deckForm.name.trim()) return;
    await onDeckCreated(deckForm);
    setDeckForm({ name: '', description: '' });
  };

  const commitTags = () => {
    const parsed = [...new Set(tagsInput.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean))];
    onStudyOptionsChange({ tags: parsed });
  };

  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    await onSaveSettings(settingsDraft);
  };

  const panelClass = (name) => `fold-panel ${activePanel === name ? 'active' : ''}`;

  return (
    <aside className="panel control-dock">
      <div className="dock-header">
        <h2>Mission Dock</h2>
        <p>{selectedDeck ? `${selectedDeck.dueCards} due` : 'No deck selected'}</p>
      </div>

      <select
        className="input"
        value={selectedDeckId || ''}
        onChange={(e) => onSelectDeck(e.target.value)}
      >
        <option value="">Select a deck</option>
        {decks.map((deck) => (
          <option key={deck._id} value={deck._id}>
            {deck.name} ({deck.dueCards}/{deck.totalCards})
          </option>
        ))}
      </select>

      <div className="mini-action-grid">
        <button className="btn ghost-btn" type="button" onClick={onOpenComposer} disabled={!selectedDeckId}>
          Composer
        </button>
        <button
          className="btn ghost-btn"
          type="button"
          onClick={onOpenEditableBoard}
          disabled={!selectedDeckId}
        >
          Board
        </button>
        <button className="btn ghost-btn" type="button" onClick={onOpenMetrics}>
          Metrics
        </button>
      </div>

      <div className={panelClass('queue')}>
        <button type="button" className="fold-title" onClick={() => setActivePanel('queue')}>
          Queue Rules
        </button>
        <div className="fold-body">
          <select
            className="input"
            value={studyOptions.mode}
            onChange={(e) => onStudyOptionsChange({ mode: e.target.value })}
          >
            <option value="normal">Normal</option>
            <option value="exam">Exam</option>
            <option value="cram">Cram</option>
            <option value="weak">Weak</option>
          </select>

          <select
            className="input"
            value={studyOptions.dueScope}
            onChange={(e) => onStudyOptionsChange({ dueScope: e.target.value })}
          >
            <option value="due">Due</option>
            <option value="overdue">Overdue</option>
            <option value="today">Today</option>
            <option value="any">Any</option>
          </select>

          <input
            className="input"
            placeholder="tags: dp, tree"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            onBlur={commitTags}
          />
          <label className="check-row">
            <input
              type="checkbox"
              checked={studyOptions.weakOnly}
              onChange={(e) => onStudyOptionsChange({ weakOnly: e.target.checked })}
            />
            Weak cards only
          </label>
        </div>
      </div>

      <div className={panelClass('tune')}>
        <button type="button" className="fold-title" onClick={() => setActivePanel('tune')}>
          Pilot Tune
        </button>
        <form className="fold-body" onSubmit={handleSettingsSubmit}>
          <label htmlFor="dailyGoal">Daily goal</label>
          <input
            id="dailyGoal"
            className="input"
            type="number"
            min={1}
            max={2000}
            value={settingsDraft.dailyGoal}
            onChange={(e) => setSettingsDraft((prev) => ({ ...prev, dailyGoal: Number(e.target.value) }))}
          />

          <label htmlFor="retention">Retention ({settingsDraft.requestRetention.toFixed(2)})</label>
          <input
            id="retention"
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

          <label className="check-row">
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
            Short-term steps
          </label>

          <label className="check-row">
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
            Fuzz intervals
          </label>

          <button className="btn" type="submit" disabled={settingsSaving}>
            {settingsSaving ? 'Saving...' : 'Save'}
          </button>
          {goalProgress && (
            <p className="small-line">
              Today: {goalProgress.reviewedToday}/{goalProgress.dailyGoal}
            </p>
          )}
        </form>
      </div>

      <div className={panelClass('decks')}>
        <button type="button" className="fold-title" onClick={() => setActivePanel('decks')}>
          Create Deck
        </button>
        <form className="fold-body" onSubmit={handleDeckSubmit}>
          <input
            className="input"
            placeholder="Deck name"
            value={deckForm.name}
            onChange={(e) => setDeckForm((s) => ({ ...s, name: e.target.value }))}
          />
          <textarea
            className="input"
            placeholder="Description"
            value={deckForm.description}
            onChange={(e) => setDeckForm((s) => ({ ...s, description: e.target.value }))}
          />
          <button className="btn" type="submit">
            Add Deck
          </button>
        </form>
      </div>
    </aside>
  );
};

export default DeckPanel;