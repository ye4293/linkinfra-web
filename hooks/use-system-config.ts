'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { systemConfigStore, refreshSystemConfig } from '@/lib/system-config';

export { refreshSystemConfig } from '@/lib/system-config';

export function useSystemConfig() {
  const config = useSyncExternalStore(
    systemConfigStore.subscribe,
    systemConfigStore.getSnapshot,
    systemConfigStore.getServerSnapshot
  );
  useEffect(() => {
    const reload = () => {
      void systemConfigStore.load();
    };
    reload();
    window.addEventListener('online', reload);
    window.addEventListener('focus', reload);
    return () => {
      window.removeEventListener('online', reload);
      window.removeEventListener('focus', reload);
    };
  }, []);
  return { ...config, retry: refreshSystemConfig };
}
