export const NOTICE_UPDATED_EVENT = 'linkinfra:notice-updated';

export async function readSiteNotice(signal?: AbortSignal): Promise<string> {
  const response = await fetch('/api/notice', { cache: 'no-store', signal });
  const result = await response.json();
  if (
    !response.ok ||
    !result.success ||
    (result.data != null && typeof result.data !== 'string')
  ) {
    throw new Error('Unable to load the announcement.');
  }
  return (result.data || '').trim();
}

export async function saveSiteNotice(content: string): Promise<void> {
  const response = await fetch('/api/option', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: 'Notice', value: content.trim() })
  });
  const result = await response.json();
  if (!response.ok || !result.success)
    throw new Error('Unable to save the announcement.');
  window.dispatchEvent(new Event(NOTICE_UPDATED_EVENT));
}
