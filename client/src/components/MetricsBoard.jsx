const fmtRatio = (right, wrong) => {
  if (wrong === 0) return right > 0 ? `${right}:0` : '0:0';
  return `${right}:${wrong}`;
};

const dayLabel = (iso) => {
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
};

const intensityClass = (count) => {
  if (count >= 20) return 'heat-4';
  if (count >= 12) return 'heat-3';
  if (count >= 6) return 'heat-2';
  if (count >= 1) return 'heat-1';
  return 'heat-0';
};

const addDays = (date, amount) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};

const toIsoDate = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizeHeatmap = (rawHeatmap, targetDays = 365) => {
  const byDate = new Map((rawHeatmap || []).map((item) => [item.date, item.count]));
  const lastDate = rawHeatmap?.length
    ? new Date(`${rawHeatmap[rawHeatmap.length - 1].date}T00:00:00`)
    : new Date();
  lastDate.setHours(0, 0, 0, 0);
  const startDate = addDays(lastDate, -(targetDays - 1));

  return Array.from({ length: targetDays }, (_, idx) => {
    const current = addDays(startDate, idx);
    const iso = toIsoDate(current);
    return {
      date: iso,
      count: byDate.get(iso) || 0,
    };
  });
};

const MetricsBoard = ({ metrics, loading, onClose, onRefresh }) => {
  const summary = metrics?.summary;
  const heatmap = normalizeHeatmap(metrics?.heatmap, 365);
  const heatmapDays = heatmap.length;
  const heatmapWeeks = Math.max(1, Math.ceil(heatmapDays / 7));
  const weekColumns = Array.from({ length: heatmapWeeks }, (_, weekIndex) =>
    heatmap.slice(weekIndex * 7, weekIndex * 7 + 7),
  );
  const monthFormatter = new Intl.DateTimeFormat(undefined, { month: 'short' });
  const monthLabels = weekColumns.map((week, weekIndex) => {
    if (!week.length) return '';
    const currentMonth = new Date(`${week[0].date}T00:00:00`).getMonth();
    if (weekIndex === 0) return monthFormatter.format(new Date(`${week[0].date}T00:00:00`));
    const previousWeek = weekColumns[weekIndex - 1];
    if (!previousWeek.length) return '';
    const previousMonth = new Date(`${previousWeek[0].date}T00:00:00`).getMonth();
    return currentMonth !== previousMonth
      ? monthFormatter.format(new Date(`${week[0].date}T00:00:00`))
      : '';
  });

  return (
    <section className="panel metrics-board">
      <div className="metrics-header">
        <div>
          <h2>Learning Metrics</h2>
          <p>Forecast, mode performance, and consistency tracking.</p>
        </div>
        <div className="metrics-actions">
          <button className="btn" type="button" onClick={onRefresh} disabled={loading}>
            Refresh
          </button>
          <button className="btn ghost-btn" type="button" onClick={onClose}>
            Close Metrics
          </button>
        </div>
      </div>

      {loading && <p>Loading metrics...</p>}

      {!loading && summary && (
        <>
          <div className="metrics-grid">
            <div className="metric-card">
              <h3>Total Decks</h3>
              <p>{summary.totalDecks}</p>
            </div>
            <div className="metric-card">
              <h3>Due Now</h3>
              <p>{summary.dueNow}</p>
            </div>
            <div className="metric-card">
              <h3>Progress</h3>
              <p>{summary.learningProgressPercent}%</p>
            </div>
            <div className="metric-card">
              <h3>Today Reviews</h3>
              <p>{summary.todayReviews}</p>
            </div>
            <div className="metric-card">
              <h3>Current Streak</h3>
              <p>{summary.currentStreak}</p>
            </div>
            <div className="metric-card">
              <h3>Best Streak</h3>
              <p>{summary.bestStreak}</p>
            </div>
            <div className="metric-card">
              <h3>Total XP</h3>
              <p>{summary.totalXp}</p>
            </div>
            <div className="metric-card">
              <h3>Right / Wrong</h3>
              <p>{fmtRatio(summary.rightReviews, summary.wrongReviews)}</p>
            </div>
          </div>

          <div className="forecast-board">
            <h3>Due Forecast (8 days)</h3>
            <div className="forecast-list">
              {(metrics.dueForecast || []).map((item) => (
                <div key={item.date} className="forecast-item">
                  <span>{dayLabel(item.date)}</span>
                  <div className="forecast-bar-wrap">
                    <div className="forecast-bar" style={{ width: `${Math.min(100, item.count * 9)}%` }} />
                  </div>
                  <strong>{item.count}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="heatmap-board">
            <h3>Review Heatmap (1 year)</h3>
            <div className="heatmap-shell" style={{ '--heat-weeks': heatmapWeeks }}>
              <div className="heatmap-months">
                {monthLabels.map((monthLabel, idx) => (
                  <span key={`${monthLabel || 'm'}-${idx}`}>{monthLabel}</span>
                ))}
              </div>
              <div className="heatmap-body">
                <div className="heatmap-grid-wrap">
                  <div className="heatmap-grid">
                    {heatmap.map((day) => (
                      <div
                        key={day.date}
                        className={`heat-cell ${intensityClass(day.count)}`}
                        title={`${day.date}: ${day.count} reviews`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="heatmap-legend">
                <span>Less</span>
                <div className="heat-legend-cell heat-0" />
                <div className="heat-legend-cell heat-1" />
                <div className="heat-legend-cell heat-2" />
                <div className="heat-legend-cell heat-3" />
                <div className="heat-legend-cell heat-4" />
                <span>More</span>
              </div>
            </div>
          </div>

          <div className="mode-tag-grid">
            <div className="mode-card">
              <h3>Mode Usage</h3>
              <ul className="flat-list">
                <li>Normal: {metrics?.modeStats?.normal || 0}</li>
                <li>Exam: {metrics?.modeStats?.exam || 0}</li>
                <li>Cram: {metrics?.modeStats?.cram || 0}</li>
                <li>Weak: {metrics?.modeStats?.weak || 0}</li>
              </ul>
            </div>
            <div className="mode-card">
              <h3>Top Tags</h3>
              <ul className="flat-list">
                {(metrics.topTags || []).map((row) => (
                  <li key={row._id}>
                    #{row._id} ({row.count})
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="deck-metrics-table-wrap">
            <h3>Per-Deck Breakdown</h3>
            <table className="deck-metrics-table">
              <thead>
                <tr>
                  <th>Deck</th>
                  <th>Total</th>
                  <th>Due Now</th>
                  <th>Future</th>
                  <th>Status</th>
                  <th>Again</th>
                  <th>Hard</th>
                  <th>Good</th>
                  <th>Easy</th>
                </tr>
              </thead>
              <tbody>
                {metrics.deckMetrics.map((deck) => (
                  <tr key={deck.deckId}>
                    <td>{deck.deckName}</td>
                    <td>{deck.totalCards}</td>
                    <td>{deck.dueNow}</td>
                    <td>{deck.futureCards}</td>
                    <td>{deck.mastered ? 'Mastered' : deck.needsWork ? 'Needs Work' : 'In Progress'}</td>
                    <td>{deck.reviews.again}</td>
                    <td>{deck.reviews.hard}</td>
                    <td>{deck.reviews.good}</td>
                    <td>{deck.reviews.easy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!loading && !summary && <p>No metrics available yet.</p>}
    </section>
  );
};

export default MetricsBoard;
