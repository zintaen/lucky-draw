import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDraws } from '../hooks/useDraws';
import { supabase } from '../lib/supabase';
import QRCode from '../components/QRCode';

export default function AdminPage() {
  const { sessionId } = useParams();
  const { draws, loading: drawsLoading, resetAll } = useDraws(sessionId);
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
      setSession(data);
      setLoadingSession(false);
    })();
  }, [sessionId]);

  const drawnCount = draws.filter((d) => d.drawn).length;
  const remainingCount = draws.length - drawnCount;

  const drawUrl = `${window.location.origin}/draw/${sessionId}`;

  const handleReset = async () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    setResetting(true);
    await resetAll();
    setResetting(false);
    setConfirmReset(false);
  };

  if (loadingSession || drawsLoading) {
    return (
      <div className="admin-page">
        <div className="admin-loading">Loading session…</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="admin-page">
        <div className="admin-loading">
          Session not found. <Link to="/admin" style={{ color: 'var(--color-primary)' }}>← Back</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <Link to="/admin" className="admin-back-link">← All Sessions</Link>
        <h1 className="admin-title">🎯 {session.name}</h1>
        <p className="admin-subtitle">
          Real-time inventory tracker · {session.total_numbers} gifts
        </p>
      </header>

      {/* QR Toggle */}
      <div className="qr-section">
        <button
          className="qr-toggle-button"
          onClick={() => setShowQR(!showQR)}
          id="qr-toggle"
        >
          {showQR ? '🔽 Hide QR Code' : '📱 Show QR Code'}
        </button>

        {showQR && (
          <div className="qr-panel">
            <QRCode url={drawUrl} size={220} />
            <p className="qr-url">{drawUrl}</p>
            <button
              className="copy-url-button"
              onClick={() => navigator.clipboard.writeText(drawUrl)}
            >
              📋 Copy Link
            </button>
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div className="stats-bar">
        <div className="stat-card stat-total">
          <span className="stat-value">{draws.length}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="stat-card stat-drawn">
          <span className="stat-value">{drawnCount}</span>
          <span className="stat-label">Drawn</span>
        </div>
        <div className="stat-card stat-remaining">
          <span className="stat-value">{remainingCount}</span>
          <span className="stat-label">Remaining</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress-container">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${draws.length ? (drawnCount / draws.length) * 100 : 0}%` }}
          />
        </div>
        <span className="progress-text">
          {draws.length ? Math.round((drawnCount / draws.length) * 100) : 0}% drawn
        </span>
      </div>

      {/* Number grid */}
      <div className="number-grid">
        {draws.map((item) => (
          <div
            key={item.number}
            className={`number-cell ${item.drawn ? 'number-cell--drawn' : 'number-cell--available'}`}
            title={
              item.drawn
                ? `Drawn at ${new Date(item.drawn_at).toLocaleTimeString()}`
                : 'Available'
            }
          >
            <span className="number-cell__value">{item.number}</span>
            <span className="number-cell__status">
              {item.drawn ? '✓' : '○'}
            </span>
          </div>
        ))}
      </div>

      {/* Drawn log */}
      <div className="drawn-log">
        <h2 className="drawn-log__title">Draw History</h2>
        {draws.filter((d) => d.drawn).length === 0 ? (
          <p className="drawn-log__empty">No numbers drawn yet.</p>
        ) : (
          <div className="drawn-log__list">
            {draws
              .filter((d) => d.drawn)
              .sort((a, b) => new Date(b.drawn_at) - new Date(a.drawn_at))
              .map((item) => (
                <div key={item.number} className="drawn-log__item">
                  <span className="drawn-log__number">#{item.number}</span>
                  <span className="drawn-log__time">
                    {new Date(item.drawn_at).toLocaleTimeString()}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Reset */}
      <div className="admin-actions">
        <button
          className={`reset-button ${confirmReset ? 'reset-button--confirm' : ''}`}
          onClick={handleReset}
          disabled={resetting}
          id="reset-button"
        >
          {resetting
            ? 'Resetting…'
            : confirmReset
              ? '⚠️ Click again to confirm reset'
              : '🔄 Reset All Draws'}
        </button>
        {confirmReset && !resetting && (
          <button
            className="cancel-button"
            onClick={() => setConfirmReset(false)}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
