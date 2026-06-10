import { useState } from 'react';
import MarkdownRenderer from './MarkdownRenderer';

// CardComposer is the form used to create a new flashcard inside the selected deck.
const CardComposer = ({ selectedDeckName, selectedDeckId, onClose, onCreateCard }) => {
  // Stores all input field values for the card creation form.
  // tagsText is kept as a plain comma-separated string while the user types.
  const [form, setForm] = useState({
    title: '',
    question: '',
    answer: '',
    tagsText: '',
  });

  // Handles form submission when the user clicks "Save Card".
  const handleSubmit = async (e) => {
    // Prevents the browser from refreshing the page after form submission.
    e.preventDefault();

    // Do not create a card if:
    // 1. no deck is selected
    // 2. the question is empty
    // 3. the answer is empty
    if (!selectedDeckId || !form.question.trim() || !form.answer.trim()) return;

    // Convert the comma-separated tags string into a clean array.
    // Example: "dp, Trees, recursion, dp"
    // becomes: ["dp", "trees", "recursion"]
    const tags = [
      ...new Set(
        form.tagsText
          .split(',')
          .map((x) => x.trim().toLowerCase())
          .filter(Boolean)
      ),
    ];

    // Send the new card data to the parent component.
    // The parent component is responsible for saving it through the API/state.
    await onCreateCard({
      deckId: selectedDeckId,
      title: form.title,
      question: form.question,
      answer: form.answer,
      tags,
    });

    // Clear the form after the card is successfully created.
    setForm({
      title: '',
      question: '',
      answer: '',
      tagsText: '',
    });
  };

  return (
    <section className="composer panel">
      {/* Header area showing the composer title and selected deck */}
      <div className="composer-header">
        <div>
          <h2>Add Card</h2>

          {/* If a deck is selected, show its name. Otherwise, ask the user to select one. */}
          <p>Deck: {selectedDeckName || 'Select a deck first'}</p>
        </div>

        {/* Closes/hides the card composer */}
        <button className="btn ghost-btn" type="button" onClick={onClose}>
          Close Composer
        </button>
      </div>

      {/* Main form layout: left side editor, right side live Markdown preview */}
      <form className="composer-layout" onSubmit={handleSubmit}>
        <div className="composer-editor">
          <h3>Write</h3>

          {/* Optional short title/name for the card */}
          <label htmlFor="title">Card Name</label>
          <input
            id="title"
            className="input"
            placeholder="Short card name..."
            value={form.title}
            onChange={(e) =>
              setForm((s) => ({
                ...s,
                title: e.target.value,
              }))
            }
          />

          {/* Optional comma-separated tags for categorizing/searching cards */}
          <label htmlFor="tags">Tags</label>
          <input
            id="tags"
            className="input"
            placeholder="dp, trees, recursion"
            value={form.tagsText}
            onChange={(e) =>
              setForm((s) => ({
                ...s,
                tagsText: e.target.value,
              }))
            }
          />

          {/* Main card question. Supports Markdown syntax. */}
          <label htmlFor="question">Question (Markdown)</label>
          <textarea
            id="question"
            className="input large-input"
            placeholder="Write your question in Markdown..."
            value={form.question}
            onChange={(e) =>
              setForm((s) => ({
                ...s,
                question: e.target.value,
              }))
            }
          />

          {/* Main card answer. Supports Markdown and code blocks. */}
          <label htmlFor="answer">Answer (Markdown + code blocks)</label>
          <textarea
            id="answer"
            className="input large-input"
            placeholder="Write your answer in Markdown..."
            value={form.answer}
            onChange={(e) =>
              setForm((s) => ({
                ...s,
                answer: e.target.value,
              }))
            }
          />

          {/* Disable the save button until a deck has been selected */}
          <button className="btn" type="submit" disabled={!selectedDeckId}>
            Save Card
          </button>
        </div>

        {/* Live preview section that renders the Markdown input */}
        <div className="composer-preview">
          <h3>Rendered Preview</h3>

          {/* Shows the rendered Markdown version of the question */}
          <div className="preview-box">
            <h4>Question</h4>
            <MarkdownRenderer content={form.question || '*Question preview...*'} />
          </div>

          {/* Shows the rendered Markdown version of the answer */}
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