export interface OAuthProviderConfig {
  githubId: string;
  githubSecret: string;
  googleId: string;
  googleSecret: string;
}

const emptyConfig: OAuthProviderConfig = {
  githubId: '',
  githubSecret: '',
  googleId: '',
  googleSecret: ''
};

let cachedConfig: OAuthProviderConfig | null = null;
let cacheExpiresAt = 0;

export async function getOAuthProviderConfig(): Promise<OAuthProviderConfig> {
  const now = Date.now();
  if (cachedConfig && now < cacheExpiresAt) return cachedConfig;

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const sharedSecret = process.env.OAUTH_LOGIN_SECRET;

  if (baseUrl && sharedSecret) {
    try {
      const response = await fetch(`${baseUrl}/api/oauth/provider-config`, {
        method: 'POST',
        headers: { 'X-OAuth-Login-Secret': sharedSecret },
        cache: 'no-store'
      });
      if (response.ok) {
        const data = await response.json();
        cachedConfig = {
          githubId: data.github_id || '',
          githubSecret: data.github_secret || '',
          googleId: data.google_id || '',
          googleSecret: data.google_secret || ''
        };
        cacheExpiresAt = now + 30_000;
        return cachedConfig;
      }
    } catch {
      // Fall back to deployment variables when the backend is unavailable.
    }
  }

  return {
    ...emptyConfig,
    githubId: process.env.GITHUB_ID || '',
    githubSecret: process.env.GITHUB_SECRET || '',
    googleId: process.env.GOOGLE_ID || '',
    googleSecret: process.env.GOOGLE_SECRET || ''
  };
}

export function clearOAuthProviderConfigCache() {
  cachedConfig = null;
  cacheExpiresAt = 0;
}
