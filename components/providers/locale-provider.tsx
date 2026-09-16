'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState
} from 'react';
import { zh, en } from '@/locales';
import type { Locale } from '@/locales';
import {
  readLanguage,
  saveLanguage,
  LOCALE_STORAGE_KEY
} from '@/lib/locale-preference';

type Lang = 'zh' | 'en';

interface LocaleContextValue {
  lang: Lang;
  t: Locale;
  setLang: (lang: Lang) => void;
}

const locales: Record<Lang, Locale> = { zh, en };

const LocaleContext = createContext<LocaleContextValue>({
  lang: 'en',
  t: en,
  setLang: () => {}
});

export function LocaleProvider({
  children,
  initialLang = 'en'
}: {
  children: React.ReactNode;
  initialLang?: Lang;
}) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  useEffect(() => {
    const sync = () => {
      const saved = readLanguage();
      setLangState(saved);
      saveLanguage(saved);
      const url = new URL(window.location.href);
      if (url.searchParams.has('lang')) {
        url.searchParams.delete('lang');
        window.history.replaceState(window.history.state, '', url);
      }
    };
    sync();
    const onStorage = (event: StorageEvent) => {
      if (event.key === LOCALE_STORAGE_KEY) sync();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', sync);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', sync);
    };
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    saveLanguage(l);
    // Consume an explicit cross-domain preference so it cannot override later choices.
    const url = new URL(window.location.href);
    if (url.searchParams.has('lang')) {
      url.searchParams.delete('lang');
      window.history.replaceState(window.history.state, '', url);
    }
  }, []);

  return (
    <LocaleContext.Provider value={{ lang, t: locales[lang], setLang }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
