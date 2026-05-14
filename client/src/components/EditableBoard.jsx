import { useEffect, useMemo, useState } from 'react';
import MarkdownRenderer from './MarkdownRenderer';

const tagsToText = (tags) => (Array.isArray(tags) ? tags.join(', ') : '');

const EditableBoard = ({
  selectedDeckId,
  selectedDeckName,
  cards,
  loading,
  onRefresh,
  onUpdateCard,
  onDeleteCard,
  onClose,
}) => {
  const [selectedCardId, setSelectedCardId] = useState('');
  const [draft, setDraft] = useState({ title: '', question: '', answer: '', tagsText: '' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const selectedCard = useMemo(
    () => cards.find((card) => card._id === selectedCardId) || null,
    [cards, selectedCardId]
  );

  useEffect(() => {
    if (!cards.length) {
      setSelectedCardId('');
      setDraft({ title: '', question: '', answer: '', tagsText: '' });
      return;
    }

    const stillExists = cards.some((card) => card._id === selectedCardId);
    const nextCard = stillExists ? cards.find((card) => card._id === selectedCardId) : cards[0];
    setSelectedCardId(nextCard._id);
    setDraft({
      title: nextCard.title || '',
      question: nextCard.question,
      answer: nextCard.answer,
      tagsText: tagsToText(nextCard.tags),
    });
  }, [cards, selectedCardId]);

  const handlePickCard = (card) => {
    setSelectedCardId(card._id);
    setDraft({
      title: card.title || '',
      question: card.question,
      answer: card.answer,
      tagsText: tagsToText(card.tags),
    });
  };

  const handleSave = async () => {
    if (!selectedCard || !draft.question.trim() || !draft.answer.trim()) return;
    setSaving(true);

    const tags = [...new Set(draft.tagsText.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean))];

    await onUpdateCard(selectedCard._id, {
      title: draft.title,
      question: draft.question,
      answer: draft.answer,
      tags,
    });
    await onRefresh();
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!selectedCard) return;
    setDeleting(true);
    await onDeleteCard(selectedCard._id);
    await onRefresh();
    setDeleting(false);
  };

  return (
    <section className="composer panel">
      <div className="composer-header">
        <div>
          <h2>Editable Board</h2>
          <p>Deck: {selectedDeckName || 'Select a deck first'}</p>
        </div>
        <button className="btn ghost-btn" type="button" onClick={onClose}>
          Close Board
        </button>
      </div>

      {!selectedDeckId ? (
        <p>Select a deck first.</p>
      ) : loading ? (
        <p>Loading cards...</p>
      ) : cards.length === 0 ? (
        <p>No cards in this deck yet.</p>
      ) : (
        <div className="editable-board-layout">
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

          <div className="composer-layout">
            <div className="composer-editor">
              <h3>Edit</h3>
              <label htmlFor="edit-title">Card Name</label>
              <input
                id="edit-title"
                className="input"
                value={draft.title}
                onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
              />

              <label htmlFor="edit-tags">Tags</label>
              <input
                id="edit-tags"
                className="input"
                value={draft.tagsText}
                onChange={(e) => setDraft((prev) => ({ ...prev, tagsText: e.target.value }))}
              />

              <label htmlFor="edit-question">Question (Markdown)</label>
              <textarea
                id="edit-question"
                className="input large-input"
                value={draft.question}
                onChange={(e) => setDraft((prev) => ({ ...prev, question: e.target.value }))}
              />

              <label htmlFor="edit-answer">Answer (Markdown)</label>
              <textarea
                id="edit-answer"
                className="input large-input"
                value={draft.answer}
                onChange={(e) => setDraft((prev) => ({ ...prev, answer: e.target.value }))}
              />

              <div className="card-board-item-actions">
                <button className="btn" type="button" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button className="btn danger" type="button" onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Deleting...' : 'Delete Card'}
                </button>
              </div>
            </div>

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