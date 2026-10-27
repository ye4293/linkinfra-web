'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  emptyPlaygroundHistory,
  loadPlaygroundHistory,
  savePlaygroundHistory,
  type PlaygroundHistory
} from '@/lib/playground-history';
import type { PlaygroundMessage, PlaygroundMode } from '@/lib/playground';

// The workspace is keyed by user ID, so pending requests cannot cross accounts.
export function usePlaygroundHistory(userId: string | undefined) {
  const [history, setHistoryState] = useState(emptyPlaygroundHistory);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [storageError, setStorageError] = useState(false);
  const latest = useRef(history);
  const loaded = useRef(false);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const mounted = useRef(false);

  const flushHistory = useCallback(async () => {
    clearTimeout(timer.current);
    timer.current = undefined;
    if (!userId || !loaded.current || !dirty.current) return;
    const snapshot = latest.current;
    dirty.current = false;
    try {
      await savePlaygroundHistory(userId, snapshot);
      if (mounted.current) setStorageError(false);
    } catch {
      dirty.current = true;
      if (mounted.current) setStorageError(true);
    }
  }, [userId]);

  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    if (userId) {
      loadPlaygroundHistory(userId)
        .then((saved) => {
          if (cancelled) return;
          latest.current = saved;
          loaded.current = true;
          setHistoryState(saved);
          setIsHistoryLoading(false);
        })
        .catch(() => {
          if (cancelled) return;
          // Chat remains usable, but unread records are never overwritten.
          setStorageError(true);
          setIsHistoryLoading(false);
        });
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') void flushHistory();
    };
    const onPageHide = () => {
      void flushHistory();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      cancelled = true;
      mounted.current = false;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
      void flushHistory();
    };
  }, [userId, flushHistory]);

  const setHistory = useCallback(
    (
      update:
        | PlaygroundHistory
        | ((previous: PlaygroundHistory) => PlaygroundHistory)
    ) => {
      if (!mounted.current) return;
      const next =
        typeof update === 'function' ? update(latest.current) : update;
      latest.current = next;
      setHistoryState(next);
      dirty.current = true;
      // Save during long streams as well as at completion; don't reset on each token.
      if (timer.current === undefined)
        timer.current = setTimeout(() => {
          void flushHistory();
        }, 400);
    },
    [flushHistory]
  );

  const clearHistory = useCallback(
    async (mode: PlaygroundMode) => {
      setHistory({ ...latest.current, [mode]: [] });
      await flushHistory();
    },
    [setHistory, flushHistory]
  );

  const deleteMessage = useCallback(
    async (mode: PlaygroundMode, message: PlaygroundMessage) => {
      setHistory((previous) => ({
        ...previous,
        [mode]: previous[mode].filter((item) => item !== message)
      }));
      await flushHistory();
    },
    [setHistory, flushHistory]
  );

  return {
    history,
    setHistory,
    clearHistory,
    deleteMessage,
    flushHistory,
    isHistoryLoading,
    storageError
  };
}
