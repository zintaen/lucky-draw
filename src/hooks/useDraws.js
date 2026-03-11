import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useDraws(eventSessionId) {
  const [draws, setDraws] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDraws = useCallback(async () => {
    let query = supabase
      .from('draws')
      .select('*')
      .order('number', { ascending: true });

    if (eventSessionId) {
      query = query.eq('event_session_id', eventSessionId);
    }

    const { data, error } = await query;

    if (!error && data) {
      setDraws(data);
    }
    setLoading(false);
  }, [eventSessionId]);

  useEffect(() => {
    fetchDraws();

    const channel = supabase
      .channel(`draws-realtime-${eventSessionId || 'all'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'draws' },
        () => {
          fetchDraws();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDraws, eventSessionId]);

  const resetAll = useCallback(async () => {
    const { error } = await supabase.rpc('reset_draws', {
      p_event_session_id: eventSessionId || null,
    });
    if (!error) {
      await fetchDraws();
    }
    return error;
  }, [fetchDraws, eventSessionId]);

  return { draws, loading, resetAll, refetch: fetchDraws };
}
