import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

function getSessionKey(eventSessionId) {
  return `lucky_draw_result_${eventSessionId}`;
}

function getBrowserSessionId() {
  let id = sessionStorage.getItem('lucky_draw_session_id');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('lucky_draw_session_id', id);
  }
  return id;
}

export function useDraw(eventSessionId) {
  const sessionKey = getSessionKey(eventSessionId);
  const stored = sessionStorage.getItem(sessionKey);
  const [drawnNumber, setDrawnNumber] = useState(stored ? Number(stored) : null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [error, setError] = useState(null);
  const [isExhausted, setIsExhausted] = useState(false);

  const draw = useCallback(async () => {
    if (drawnNumber !== null || isDrawing) return;

    setIsDrawing(true);
    setError(null);

    try {
      const browserSessionId = getBrowserSessionId();
      const { data, error: rpcError } = await supabase.rpc('draw_number', {
        p_session_id: browserSessionId,
        p_event_session_id: eventSessionId,
      });

      if (rpcError) throw rpcError;

      if (data === null) {
        setIsExhausted(true);
      } else {
        setDrawnNumber(data);
        sessionStorage.setItem(sessionKey, String(data));
      }
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsDrawing(false);
    }
  }, [drawnNumber, isDrawing, eventSessionId, sessionKey]);

  return { draw, drawnNumber, isDrawing, error, isExhausted };
}
