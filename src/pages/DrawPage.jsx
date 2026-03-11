import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { useDraw } from '../hooks/useDraw';
import { supabase } from '../lib/supabase';
import { SHOP_URL, SHOP_LABEL } from '../config';

const SHUFFLE_DURATION = 1800;
const SHUFFLE_INTERVAL = 60;

export default function DrawPage() {
  const { sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [sessionError, setSessionError] = useState(null);

  const { draw, drawnNumber, isDrawing, error, isExhausted } = useDraw(sessionId);
  const [displayNumber, setDisplayNumber] = useState(null);
  const [animating, setAnimating] = useState(false);
  const [showResult, setShowResult] = useState(!!drawnNumber);
  const intervalRef = useRef(null);

  /* Load session details */
  useEffect(() => {
    (async () => {
      if (!sessionId) {
        setSessionError('No session specified.');
        setLoadingSession(false);
        return;
      }
      const { data, error: fetchErr } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (fetchErr || !data) {
        setSessionError('This draw session was not found or has ended.');
      } else if (data.status === 'closed') {
        setSessionError('This draw session is closed.');
      } else {
        setSession(data);
      }
      setLoadingSession(false);
    })();
  }, [sessionId]);

  /* Returning user who already drew */
  useEffect(() => {
    if (drawnNumber && !animating) {
      setDisplayNumber(drawnNumber);
      setShowResult(true);
    }
  }, [drawnNumber, animating]);

  /* Shuffle animation */
  useEffect(() => {
    if (!isDrawing && !animating) return;

    if (animating) {
      const total = session?.total_numbers || 25;
      intervalRef.current = setInterval(() => {
        setDisplayNumber(Math.floor(Math.random() * total) + 1);
      }, SHUFFLE_INTERVAL);
    }

    return () => clearInterval(intervalRef.current);
  }, [animating, isDrawing, session]);

  /* When RPC returns, continue shuffling briefly then reveal */
  useEffect(() => {
    if (drawnNumber !== null && animating) {
      const timeout = setTimeout(() => {
        clearInterval(intervalRef.current);
        setDisplayNumber(drawnNumber);
        setAnimating(false);
        setShowResult(true);

        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#F59E0B', '#FBBF24', '#FDE68A', '#FFFFFF', '#EF4444'],
        });
        confetti({
          particleCount: 80,
          spread: 120,
          origin: { y: 0.5 },
          startVelocity: 35,
          colors: ['#F59E0B', '#FBBF24', '#FDE68A', '#FFFFFF'],
        });
      }, 600);
      return () => clearTimeout(timeout);
    }
  }, [drawnNumber, animating]);

  const handleDraw = async () => {
    if (animating || showResult) return;
    setAnimating(true);
    const total = session?.total_numbers || 25;
    setDisplayNumber(Math.floor(Math.random() * total) + 1);

    setTimeout(() => {
      draw();
    }, SHUFFLE_DURATION);
  };

  /* ─── Loading ─── */
  if (loadingSession) {
    return (
      <div className="draw-page">
        <div className="draw-card">
          <div className="draw-icon">⏳</div>
          <h1 className="draw-title">Loading…</h1>
        </div>
      </div>
    );
  }

  /* ─── Session error ─── */
  if (sessionError) {
    return (
      <div className="draw-page">
        <div className="draw-card">
          <div className="draw-icon">❌</div>
          <h1 className="draw-title">Oops!</h1>
          <p className="draw-subtitle">{sessionError}</p>
        </div>
      </div>
    );
  }

  /* ─── Exhausted ─── */
  if (isExhausted) {
    return (
      <div className="draw-page">
        <div className="draw-card">
          <div className="draw-icon">📦</div>
          <h1 className="draw-title">All Gone!</h1>
          <p className="draw-subtitle">
            All gift numbers have been drawn. Thanks for participating!
          </p>
        </div>
      </div>
    );
  }

  /* ─── Result ─── */
  if (showResult && drawnNumber) {
    return (
      <div className="draw-page">
        <div className="draw-card result-card">
          <div className="result-badge">🎉 Congratulations!</div>
          <p className="result-label">You Won Gift Number</p>
          <div className="result-number">{drawnNumber}</div>
          <p className="result-hint">Show this to the organizer to claim your gift</p>
          <a
            href={SHOP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="shop-button"
            id="shop-cta"
          >
            {SHOP_LABEL}
          </a>
        </div>
      </div>
    );
  }

  /* ─── Before / During Draw ─── */
  return (
    <div className="draw-page">
      <div className="draw-card">
        <div className="draw-icon">{animating ? '🎰' : '🎁'}</div>
        <h1 className="draw-title">{session?.name || 'Lucky Draw'}</h1>
        <p className="draw-subtitle">
          {animating
            ? 'Finding your lucky number...'
            : 'Tap the button to spin and win your gift!'}
        </p>

        {animating && (
          <div className="shuffle-display" aria-live="polite">
            {displayNumber}
          </div>
        )}

        <button
          id="spin-button"
          className={`spin-button ${animating ? 'spin-button--active' : ''}`}
          onClick={handleDraw}
          disabled={animating}
        >
          {animating ? 'Spinning…' : '🎰 Spin Now!'}
        </button>

        {error && <p className="error-text">{error}</p>}
      </div>
    </div>
  );
}
