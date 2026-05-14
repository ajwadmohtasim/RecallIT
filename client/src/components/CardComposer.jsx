import { useState } from 'react';
import MarkdownRenderer from './MarkdownRenderer';

const CardComposer = ({ selectedDeckName, selectedDeckId, onClose, onCreateCard }) => {
  const [form, setForm] = useState({ title: '', question: '', answer: '', tagsText: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDeckId || !form.question.trim() || !form.answer.trim()) return;

    const tags = [...new Set(form.tagsText.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean))];

    await onCreateCard({
      deckId: selectedDeckId,
      title: form.title,
      question: form.question,
      answer: form.answer,
      tags,
    });

    setForm({ title: '', question: '', answer: '', tagsText: '' });
  };

  return (
    <section className="composer panel">
      <div className="composer-header">
        <div>
          <h2>Add Card</h2>
          <p>Deck: {selectedDeckName || 'Select a deck first'}</p>
        </div>
        <button className="btn ghost-btn" type="button" onClick={onClose}>
          Close Composer
        </button>
      </div>

      <form className="composer-layout" onSubmit={handleSubmit}>
        <div className="composer-editor">
          <h3>Write</h3>
          <label htmlFor="title">Card Name</label>
          <input
            id="title"
            className="input"
            placeholder="Short card name..."
            value={form.title}
            onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
          />

          <label htmlFor="tags">Tags</label>
          <input
            id="tags"
            className="input"
            placeholder="dp, trees, recursion"
            value={form.tagsText}
            onChange={(e) => setForm((s) => ({ ...s, tagsText: e.target.value }))}
          />

          <label htmlFor="question">Question (Markdown)</label>
          <textarea
            id="question"
            className="input large-input"
            placeholder="Write your question in Markdown..."
            value={form.question}
            onChange={(e) => setForm((s) => ({ ...s, question: e.target.value }))}
          />

          <label htmlFor="answer">Answer (Markdown + code blocks)</label>
          <textarea
            id="answer"
            className="input large-input"
            placeholder="Write your answer in Markdown..."
            value={form.answer}
            onChange={(e) => setForm((s) => ({ ...s, answer: e.target.value }))}
          />

          <button className="btn" type="submit" disabled={!selectedDeckId}>
            Save Card
          </button>
        </div>

        <div className="composer-preview">
          <h3>Rendered Preview</h3>
          <div className="preview-box">
            <h4>Question</h4>
            <MarkdownRenderer content={form.question || '*Question preview...*'} />
          </div>
          <div className="preview-box">
            <h4>Answer</h4>
            <MarkdownRenderer content={form.answer || '*Answer preview...*'} />
          </div>
        </div>
      </form>
    </section>
  );
};

export default CardComposer;