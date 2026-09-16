const platformUrl = 'https://platform.linkinfra.ai';

export function consoleHref(
  authenticated: boolean,
  lang?: 'zh' | 'en',
  path = '/dashboard'
): string {
  const target = new URL(path, platformUrl);
  if (lang) target.searchParams.set('lang', lang);
  if (authenticated) return target.href;
  const login = new URL('/sign-in', platformUrl);
  login.searchParams.set('callbackUrl', target.pathname + target.search);
  if (lang) login.searchParams.set('lang', lang);
  return login.href;
}

export function apiKeyHref(
  authenticated: boolean,
  model?: string,
  lang?: 'zh' | 'en'
): string {
  const params = new URLSearchParams();
  if (model?.trim()) params.set('model', model.trim());
  return consoleHref(
    authenticated,
    lang,
    `/dashboard/token${params.size ? `?${params}` : ''}`
  );
}
