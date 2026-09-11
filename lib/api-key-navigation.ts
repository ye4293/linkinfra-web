const platformUrl = 'https://platform.linkinfra.ai';

export function apiKeyHref(authenticated: boolean): string {
  return authenticated
    ? `${platformUrl}/dashboard/token`
    : `${platformUrl}/sign-in?callbackUrl=${encodeURIComponent(
        '/dashboard/token'
      )}`;
}
