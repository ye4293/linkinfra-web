export type CodingApp = 'claude' | 'codex' | 'gemini';

export interface ClientSetup {
  serverAddress: string;
  apiKey: string;
  name: string;
  model?: string;
  haikuModel?: string;
  sonnetModel?: string;
  opusModel?: string;
}

export function apiAddresses(address: string) {
  let url: URL;
  try {
    url = new URL(address.trim());
  } catch {
    throw new Error(
      'The API address is not configured correctly. Contact support.'
    );
  }
  if (
    !['https:', 'http:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      'The API address must be an HTTP or HTTPS URL without credentials, query parameters or fragments.'
    );
  }
  const root = url.href.replace(/\/+$/, '').replace(/\/v1$/, '');
  return { root, openai: `${root}/v1` };
}

export function clientApiKey(key: string) {
  const value = key.trim();
  if (!value || /[\s*•]/u.test(value))
    throw new Error(
      'This API key is missing or masked. Refresh the page and try again.'
    );
  return value.startsWith('sk-') ? value : `sk-${value}`;
}

export function buildClientImport(
  target: 'cherry' | CodingApp,
  setup: ClientSetup
) {
  const { root, openai } = apiAddresses(setup.serverAddress);
  const apiKey = clientApiKey(setup.apiKey);
  const name = setup.name.trim();
  if (!name) throw new Error('Enter a provider name.');
  if (target === 'cherry') {
    // UTF-8 before base64 preserves names in any language.
    const bytes = new TextEncoder().encode(
      JSON.stringify({
        id: 'linkinfra',
        name,
        type: 'openai',
        baseUrl: openai,
        apiKey
      })
    );
    const data = btoa(
      Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')
    );
    return `cherrystudio://providers/api-keys?${new URLSearchParams({
      v: '1',
      data
    })}`;
  }
  if (!['claude', 'codex', 'gemini'].includes(target))
    throw new Error('Unsupported client.');
  if (!setup.model?.trim()) throw new Error('Select or enter a model ID.');
  const params = new URLSearchParams({
    resource: 'provider',
    app: target,
    name,
    apiKey,
    endpoint: target === 'codex' ? openai : root,
    model: setup.model.trim(),
    homepage: 'https://platform.linkinfra.ai'
  });
  if (target === 'claude') {
    for (const field of ['haikuModel', 'sonnetModel', 'opusModel'] as const) {
      if (setup[field]?.trim()) params.set(field, setup[field]!.trim());
    }
  }
  // Do not auto-enable a provider or change the current client selection.
  return `ccswitch://v1/import?${params}`;
}
