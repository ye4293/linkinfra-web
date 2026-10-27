'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  defaultPlaygroundPreferences,
  loadPlaygroundPreferences,
  savePlaygroundPreferences,
  type PlaygroundPreferences
} from '@/lib/playground-preferences';

// Like history, this hook belongs to the workspace keyed by the signed-in user.
export function usePlaygroundPreferences(userId: string | undefined) {
  const [preferences, setState] = useState(defaultPlaygroundPreferences);
  const [isPreferencesLoading, setLoading] = useState(true);
  const [preferencesError, setError] = useState(false);
  const latest = useRef(preferences);
  const loaded = useRef(false);
  const writable = useRef(false);

  useEffect(() => {
    if (!userId) return;
    try {
      latest.current = loadPlaygroundPreferences(userId);
      setState(latest.current);
      writable.current = true;
      setError(false);
    } catch {
      // Do not overwrite unread or newer saved preferences with defaults.
      setError(true);
    }
    loaded.current = true;
    setLoading(false);
  }, [userId]);

  const setPreferences = useCallback(
    (update: (previous: PlaygroundPreferences) => PlaygroundPreferences) => {
      if (!userId || !loaded.current) return;
      const next = update(latest.current);
      latest.current = next;
      setState(next);
      if (!writable.current) return;
      try {
        // Save on the selection event, before a fast route change can unmount us.
        savePlaygroundPreferences(userId, next);
        setError(false);
      } catch {
        setError(true);
      }
    },
    [userId]
  );

  return {
    preferences,
    setPreferences,
    isPreferencesLoading,
    preferencesError
  };
}
