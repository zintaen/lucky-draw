import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useSessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) setSessions(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSessions();

    const channel = supabase
      .channel('sessions-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, fetchSessions)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchSessions]);

  const createSession = useCallback(async (name, totalNumbers) => {
    const { data, error } = await supabase.rpc('create_session', {
      p_name: name,
      p_total_numbers: totalNumbers,
    });
    if (error) throw error;
    return data; // returns the new session UUID
  }, []);

  return { sessions, loading, createSession, refetch: fetchSessions };
}
