import { useEffect, useMemo, useState } from 'react';
import MarkdownRenderer from './MarkdownRenderer';

// Utility: Converts an array of tags into a comma-separated string for editing
const tagsToText = (tags) => (Array.isArray(tags) ? tags.join(', ') : '');

// EditableBoard: Component for viewing, editing, and deleting cards in a selected deck
const EditableBoard = ({
  selectedDeckId,   // ID of the current deck
  selectedDeckName, // Name of the current deck
  cards,            // Array of card objects in the deck
  loading,          // Boolean flag for loading state
  onRefresh,        // Callback to reload cards
  onUpdateCard,     // Callback to update a card
  onDeleteCard,     // Callback to delete a card
  onClose,          // Callback to close the board
}) => {
  // Selected card ID for editing
  const [selectedCardId, setSelectedCardId] = useState('');

  // Draft object storing editable values of the selected card
  const [draft, setDraft] = useState({ title: '', question: '', answer: '', tagsText: '' });

  // Flags for asynchronous actions
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Memoized selected card object from cards array
  const selectedCard = useMemo(
    () => cards.find((card) => card._id === selectedCardId) || null,
    [cards, selectedCardId]
  );

  // Effect: Updates selected card and draft whenever cards or selectedCardId change
  useEffect(() => {
    if (!cards.length) {
      // No cards: reset selection and draft
      setSelectedCardId('');
      setDraft({ title: '', question: '', answer: '', tagsText: '' });
      return;
    }

    // Check if current selected card still exists
    const stillExists = cards.some((card) => card._id === selectedCardId);

    // Choose the next card to select: either current or first card
    const nextCard = stillExists ? cards.find((card) => card._id === selectedCardId) : cards[0];

    setSelectedCardId(nextCard._id);

    // Populate draft with card details
    setDraft({
      title: nextCard.title || '',
      question: nextCard.question,
      answer: nextCard.answer,
      tagsText: tagsToText(nextCard.tags),
    });
  }, [cards, selectedCardId]);

  // Handler: When a user selects a card from the list
  const handlePickCard = (card) => {
    setSelectedCardId(card._id);
    setDraft({
      title: card.title || '',
      question: card.question,
      answer: card.answer,
      tagsText: tagsToText(card.tags),
    });
  };

  // Handler: Save updates to the selected card
  const handleSave = async () => {
    if (!selectedCard || !draft.question.trim() || !draft.answer.trim()) return;

    setSaving(true);

    // Convert tags string to a clean, unique array
    const tags = [
      ...new Set(
        draft.tagsText
          .split(',')
          .map((x) => x.trim().toLowerCase())
          .filter(Boolean)
      ),
    ];

    // Call update callback and refresh the card list
    await onUpdateCard(selectedCard._id, {
      title: draft.title,
      question: draft.question,
      answer: draft.answer,
      tags,
    });
    await onRefresh();

    setSaving(false);
  };

  // Handler: Delete the selected card
  const handleDelete = async () => {
    if (!selectedCard) return;
    setDeleting(true);

    await onDeleteCard(selectedCard._id);
    await onRefresh();

    setDeleting(false);
  };

  return (
    <section className="composer panel">
      {/* Header section with deck name and close button */}
      <div className="composer-header">
        <div>
          <h2>Editable Board</h2>
          <p>Deck: {selectedDeckName || 'Select a deck first'}</p>
        </div>
        <button className="btn ghost-btn" type="button" onClick={onClose}>
          Close Board
        </button>
      </div>

      {/* Conditional rendering based on deck selection, loading, and card availability */}
      {!selectedDeckId ? (
        <p>Select a deck first.</p>
      ) : loading ? (
        <p>Loading cards...</p>
      ) : cards.length === 0 ? (
        <p>No cards in this deck yet.</p>
      ) : (
        <div className="editable-board-layout">
          {/* Sidebar: List of cards */}
          <aside className="editable-board-list">
            <div className="editable-board-list-header">
              <h3>Cards</h3>
              <button className="btn" type="button" onClick={onRefresh}>
                Refresh
              </button>
            </div>
            {cards.map((card) => (
              <button
                key={card._id}
                type="button"
                className={`editable-board-item ${card._id === selectedCardId ? 'active' : ''}`}
                onClick={() => handlePickCard(card)}
              >
                {card.title?.trim() || card.question}
              </button>
            ))}
          </aside>

          {/* Main editor and preview */}
          <div className="composer-layout">
            <div className="composer-editor">
              <h3>Edit</h3>

              {/* Editable card title */}
              <label htmlFor="edit-title">Card Name</label>
              <input
                id="edit-title"
                className="input"
                value={draft.title}
                onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
              />

              {/* Editable tags */}
              <label htmlFor="edit-tags">Tags</label>
              <input
                id="edit-tags"
                className="input"
                value={draft.tagsText}
                onChange={(e) => setDraft((prev) => ({ ...prev, tagsText: e.target.value }))}
              />

              {/* Editable question */}
              <label htmlFor="edit-question">Question (Markdown)</label>
              <textarea
                id="edit-question"
                className="input large-input"
                value={draft.question}
                onChange={(e) => setDraft((prev) => ({ ...prev, question: e.target.value }))}
              />

              {/* Editable answer */}
              <label htmlFor="edit-answer">Answer (Markdown)</label>
              <textarea
                id="edit-answer"
                className="input large-input"
                value={draft.answer}
                onChange={(e) => setDraft((prev) => ({ ...prev, answer: e.target.value }))}
              />

              {/* Action buttons */}
              <div className="card-board-item-actions">
                <button className="btn" type="button" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button className="btn danger" type="button" onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Deleting...' : 'Delete Card'}
                </button>
              </div>
            </div>

            {/* Live Markdown preview for question and answer */}
            <div className="composer-preview">
              <h3>Rendered Preview</h3>
              <div className="preview-box">
                <h4>Question</h4>
                <MarkdownRenderer content={draft.question || '*Question preview...*'} />
              </div>
              <div className="preview-box">
                <h4>Answer</h4>
                <MarkdownRenderer content={draft.answer || '*Answer preview...*'} />
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default EditableBoard;