import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSessions } from '../hooks/useSessions';

export default function AdminSessionsPage() {
  const { sessions, loading, createSession } = useSessions();
  const [name, setName] = useState('');
  const [totalNumbers, setTotalNumbers] = useState(25);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await createSession(name.trim(), totalNumbers);
      setName('');
      setTotalNumbers(25);
      setShowForm(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-loading">Loading sessions…</div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1 className="admin-title">🎯 Lucky Draw — Sessions</h1>
        <p className="admin-subtitle">Manage event sessions. Each session has its own QR code and number pool.</p>
      </header>

      {/* Create button / Form */}
      {!showForm ? (
        <button
          className="create-session-button"
          onClick={() => setShowForm(true)}
          id="create-session-btn"
        >
          ＋ New Session
        </button>
      ) : (
        <form className="session-form" onSubmit={handleCreate}>
          <div className="session-form__field">
            <label htmlFor="session-name">Session Name</label>
            <input
              id="session-name"
              type="text"
              placeholder="e.g. Holiday Party 2025"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div className="session-form__field">
            <label htmlFor="session-total">Number of Gifts</label>
            <input
              id="session-total"
              type="number"
              min={1}
              max={9999}
              value={totalNumbers}
              onChange={(e) => setTotalNumbers(Number(e.target.value))}
              required
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <div className="session-form__actions">
            <button
              type="submit"
              className="spin-button"
              disabled={creating}
              style={{ animation: 'none', maxWidth: 200 }}
            >
              {creating ? 'Creating…' : 'Create Session'}
            </button>
            <button
              type="button"
              className="cancel-button"
              onClick={() => { setShowForm(false); setError(null); }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Session list */}
      {sessions.length === 0 && !showForm ? (
        <div className="session-empty">
          <p>No sessions yet. Create one to get started!</p>
        </div>
      ) : (
        <div className="session-list">
          {sessions.map((s) => {
            const drawnCount = s.drawn_count || 0;
            const pct = s.total_numbers ? Math.round((drawnCount / s.total_numbers) * 100) : 0;
            return (
              <Link
                to={`/admin/${s.id}`}
                key={s.id}
                className="session-card"
              >
                <div className="session-card__header">
                  <h3 className="session-card__name">{s.name}</h3>
                  <span className={`session-card__badge session-card__badge--${s.status}`}>
                    {s.status}
                  </span>
                </div>
                <div className="session-card__meta">
                  <span>{s.total_numbers} gifts</span>
                  <span>·</span>
                  <span>{drawnCount} drawn</span>
                  <span>·</span>
                  <span>{pct}%</span>
                </div>
                <div className="session-card__progress">
                  <div className="session-card__progress-fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="session-card__date">
                  {new Date(s.created_at).toLocaleDateString()}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
