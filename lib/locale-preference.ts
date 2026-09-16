export type Language = 'zh' | 'en';
export const LOCALE_STORAGE_KEY = 'ezlink-locale-v2';
export const LOCALE_COOKIE = 'linkinfra-locale';

export function isLanguage(value: unknown): value is Language {
  return value === 'zh' || value === 'en';
}

export function readLanguage(): Language {
  const query = new URLSearchParams(window.location.search).get('lang');
  if (isLanguage(query)) return query;
  const cookie = document.cookie
    .split('; ')
    .find((v) => v.startsWith(`${LOCALE_COOKIE}=`))
    ?.split('=')[1];
  if (isLanguage(cookie)) return cookie;
  try {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLanguage(saved)) return saved;
  } catch {
    /* Storage can be unavailable in private browsing. */
  }
  return 'en';
}

export function saveLanguage(lang: Language) {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, lang);
  } catch {
    /* Cookie still persists the preference. */
  }
  const host = window.location.hostname;
  const domain =
    host === 'linkinfra.ai' || host.endsWith('.linkinfra.ai')
      ? '; Domain=linkinfra.ai'
      : '';
  document.cookie = `${LOCALE_COOKIE}=${lang}; Path=/; Max-Age=31536000; SameSite=Lax${domain}${
    window.location.protocol === 'https:' ? '; Secure' : ''
  }`;
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
}
