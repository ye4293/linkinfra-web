'use client';

import { useState, useEffect } from 'react';

interface SystemConfig {
  systemName: string;
  /** 后端自身地址（server_address），用于拼 API/回调，不要用它拼前端路由。 */
  serverAddress: string;
  /** 前端地址（frontend_server_address），用于拼 /sign-in 这类前端路由。 */
  frontendServerAddress: string;
  docsAddress: string;
  loading: boolean;
}

const DEFAULTS = {
  systemName: '',
  serverAddress: '',
  frontendServerAddress: '',
  docsAddress: ''
};

// 模块级缓存，避免多个组件各自发起重复请求
let cachedConfig: Omit<SystemConfig, 'loading'> | null = null;
let fetchPromise: Promise<Omit<SystemConfig, 'loading'>> | null = null;

function fetchSystemConfig(): Promise<Omit<SystemConfig, 'loading'>> {
  if (cachedConfig) return Promise.resolve(cachedConfig);
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch('/api/public/option')
    .then((res) => {
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    })
    .then((result) => {
      if (result.success && result.data) {
        const data = result.data;
        cachedConfig = {
          systemName: data.system_name || DEFAULTS.systemName,
          serverAddress: data.server_address || DEFAULTS.serverAddress,
          frontendServerAddress:
            data.frontend_server_address || DEFAULTS.frontendServerAddress,
          docsAddress: data.docs_address || DEFAULTS.docsAddress
        };
      } else {
        cachedConfig = { ...DEFAULTS };
      }
      return cachedConfig;
    })
    .catch(() => {
      cachedConfig = { ...DEFAULTS };
      return cachedConfig;
    });

  return fetchPromise;
}

export function useSystemConfig(): SystemConfig {
  const [config, setConfig] = useState<SystemConfig>(() => ({
    ...(cachedConfig || DEFAULTS),
    loading: !cachedConfig
  }));

  useEffect(() => {
    let cancelled = false;
    fetchSystemConfig().then((result) => {
      if (!cancelled) {
        setConfig({ ...result, loading: false });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return config;
}
