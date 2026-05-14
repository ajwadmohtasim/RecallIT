import { useState } from 'react';
import MarkdownRenderer from './MarkdownRenderer';

const StudyCard = ({
  currentCard,
  revealed,
  loading,
  done,
  onReveal,
  onHideAnswer,
  onRate,
  studyOptions,
  goalProgress,
  sessionStats,
  lastReward,
  selectedDeckName,
  upcomingCards,
  isZenMode,
}) => {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  if (!currentCard) {
    return (
      <section className="study-table minimalist-stage">
        <h2>Ready to play</h2>
        <p>Select a deck to draw your first card.</p>
      </section>
    );
  }

  if (done) {
    return (
      <section className="study-table minimalist-stage">
        <h2>Table clear</h2>
        <p>No cards match your current study mode and filters.</p>
      </section>
    );
  }

  const diagnostics = currentCard?.fsrsDiagnostics || null;
  const hasReviews = Number(diagnostics?.reps || 0) > 0;
  const formatMetric = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return '-';
    return n.toFixed(2);
  };

  const handleCardClick = () => {
    if (loading) return;
    if (revealed) {
      onHideAnswer?.();
      return;
    }
    onReveal?.();
  };

  const handleTiltMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const max = 3.5;
    setTilt({
      x: (0.5 - py) * max,
      y: (px - 0.5) * max,
    });
  };

  const handleTiltLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  return (
    <section className="study-table minimalist-stage">
      {!isZenMode ? <div className="table-status-line modern-status-line">
        <span className="status-pill">{selectedDeckName || 'No deck selected'}</span>
        <span className="status-pill">Mode: {studyOptions.mode}</span>
        {studyOptions.weakOnly ? <span className="status-pill">Weak only</span> : null}
        <span className="status-pill">Scope: {studyOptions.dueScope}</span>
        {diagnostics ? (
          <>
            <span className="status-pill status-pill-metric">Due: {diagnostics.dueIn || '-'}</span>
            <span className="status-pill status-pill-metric">Stability: {hasReviews ? formatMetric(diagnostics.stability) : '-'}</span>
            <span className="status-pill status-pill-metric">Difficulty: {hasReviews ? formatMetric(diagnostics.difficulty) : '-'}</span>
            <span className="status-pill status-pill-metric">Reps: {Number(diagnostics.reps || 0)}</span>
            <span className="status-pill status-pill-metric">Lapses: {Number(diagnostics.lapses || 0)}</span>
          </>
        ) : null}
      </div> : null}

      <div className={`review-layout ${isZenMode ? 'review-layout-zen' : ''}`}>
        <div className="review-main">
          <div className="card-scene" onMouseMove={handleTiltMove} onMouseLeave={handleTiltLeave}>
            <div className="card-tilt" style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}>
            <div
              className={`playing-card ${revealed ? 'is-flipped' : ''}`}
              onClick={handleCardClick}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleCardClick();
                }
              }}
              aria-label={revealed ? 'Show question side' : 'Reveal answer side'}
            >
              <div className="playing-card-face playing-card-front">
                <div className="card-corner top">Q</div>
                <div className="card-corner bottom">Q</div>
                <div className="card-center">
                  {currentCard.title ? <h3>{currentCard.title}</h3> : <h3>Question</h3>}
                  <div className="card-scroll-content">
                    <MarkdownRenderer content={currentCard.question} />
                  </div>
                </div>
              </div>

              <div className="playing-card-face playing-card-back">
                <div className="card-corner top">A</div>
                <div className="card-corner bottom">A</div>
                <div className="card-center">
                  <h3>Answer</h3>
                  <div className="card-scroll-content">
                    <MarkdownRenderer content={currentCard.answer || 'Reveal to view answer.'} />
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>

          <div className="action-slot">
            {revealed ? (
              <div className="rating-grid">
                <button className="btn" onClick={() => onRate('again')} disabled={loading}>
                  Again
                  {currentCard?.intervalPreview?.again ? ` (${currentCard.intervalPreview.again.interval})` : ''}
                </button>
                <button className="btn" onClick={() => onRate('hard')} disabled={loading}>
                  Hard
                  {currentCard?.intervalPreview?.hard ? ` (${currentCard.intervalPreview.hard.interval})` : ''}
                </button>
                <button className="btn" onClick={() => onRate('good')} disabled={loading}>
                  Good
                  {currentCard?.intervalPreview?.good ? ` (${currentCard.intervalPreview.good.interval})` : ''}
                </button>
                <button className="btn" onClick={() => onRate('easy')} disabled={loading}>
                  Easy
                  {currentCard?.intervalPreview?.easy ? ` (${currentCard.intervalPreview.easy.interval})` : ''}
                </button>
              </div>
            ) : (
              <div className="rating-grid rating-grid-placeholder" aria-hidden="true" />
            )}
          </div>
        </div>

        {!isZenMode ? <section className="upcoming-zone">
          <h4>Up Next</h4>
          <div className={`upcoming-hand ${upcomingCards?.length ? '' : 'empty'}`}>
            {upcomingCards?.length ? (
              upcomingCards.map((card, idx) => (
                <article
                  key={card.id}
                  className="upcoming-card"
                  style={{
                    '--i': idx,
                    '--count': upcomingCards.length,
                  }}
                >
                  <div className="upcoming-card-inner">
                    <span className="upcoming-mark">#{card.position}</span>
                    <span className="upcoming-note">Due</span>
                  </div>
                </article>
              ))
            ) : (
              <p className="muted-text">No queued cards to preview.</p>
            )}
          </div>
        </section> : null}
      </div>

      {!isZenMode ? <div className="table-footer-line">
        <span>
          Today: {goalProgress?.reviewedToday || 0}/{goalProgress?.dailyGoal || 0}
        </span>
        <span>Streak: {sessionStats?.currentStreak || 0}</span>
        {lastReward ? <span>+{lastReward} XP</span> : <span>XP: {sessionStats?.totalXp || 0}</span>}
      </div> : null}
    </section>
  );
};

export default StudyCard;
