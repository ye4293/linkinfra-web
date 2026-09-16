export interface SystemConfigSnapshot {
  systemName: string;
  serverAddress: string;
  frontendServerAddress: string;
  /** 兼容旧页面的字段，文档始终由本站提供。 */
  docsAddress: string;
  loading: boolean;
  error: string | null;
}

const initial: SystemConfigSnapshot = {
  systemName: '',
  serverAddress: '',
  frontendServerAddress: '',
  docsAddress: '/docs',
  loading: true,
  error: null
};

export function createSystemConfigStore(
  fetcher: typeof fetch = (...args) => fetch(...args)
) {
  let snapshot = initial;
  let expiresAt = 0;
  let pending: Promise<void> | null = null;
  const listeners = new Set<() => void>();
  const update = (value: SystemConfigSnapshot) => {
    snapshot = value;
    listeners.forEach((listener) => listener());
  };
  const load = (force = false): Promise<void> => {
    if (pending) return force ? pending.then(() => load(true)) : pending;
    if (!force && expiresAt > Date.now()) return Promise.resolve();
    pending = Promise.resolve()
      .then(async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        try {
          const response = await fetcher('/api/public/option', {
            cache: 'no-store',
            signal: controller.signal
          });
          if (!response.ok) throw new Error('Invalid status');
          const result = await response.json();
          const data = result?.data;
          if (
            !result?.success ||
            !data ||
            typeof data !== 'object' ||
            Array.isArray(data) ||
            typeof data.server_address !== 'string'
          )
            throw new Error('Invalid status');
          expiresAt = Date.now() + 60000;
          update({
            systemName:
              typeof data.system_name === 'string' ? data.system_name : '',
            serverAddress: data.server_address.trim(),
            frontendServerAddress:
              typeof data.frontend_server_address === 'string'
                ? data.frontend_server_address.trim()
                : '',
            docsAddress: '/docs',
            loading: false,
            error: null
          });
        } catch {
          expiresAt = 0;
          update({
            ...snapshot,
            loading: false,
            error: 'Unable to load the API address. Please retry.'
          });
        } finally {
          clearTimeout(timeout);
        }
      })
      .finally(() => {
        pending = null;
      });
    update({ ...snapshot, loading: true, error: null });
    return pending;
  };
  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => initial,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    load
  };
}

export const systemConfigStore = createSystemConfigStore();
export const refreshSystemConfig = () => systemConfigStore.load(true);
