'use client';

import { useCallback } from 'react';
import { useLocale } from '@/components/providers/locale-provider';
import messages from '@/locales/interface-zh.json';

export function useText() {
  const { lang } = useLocale();
  return useCallback(
    (text: string, values?: Record<string, string | number>) => {
      const translated =
        lang === 'zh'
          ? (messages as Record<string, string>)[text] ?? text
          : text;
      return translated.replace(/\{(\w+)\}/g, (match, key) =>
        values?.[key] !== undefined ? String(values[key]) : match
      );
    },
    [lang]
  );
}

export function LocaleText({ children }: { children: string }) {
  const tr = useText();
  return <>{tr(children)}</>;
}
