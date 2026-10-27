import type { PlaygroundMessage } from './playground';

// Vercel rejects requests above 4.5 MB before a route handler can run.
// Reserve headroom for encoding and transport overhead.
export const MAX_PLAYGROUND_REQUEST_BYTES = 4_000_000;
const MULTIPART_RESERVE_BYTES = 64_000;

export class PlaygroundPayloadError extends Error {
  constructor(
    public readonly reason:
      | 'too-large'
      | 'animated-image'
      | 'invalid-image' = 'too-large'
  ) {
    super(
      reason === 'animated-image'
        ? 'This GIF is too large. Use a smaller GIF or a static image.'
        : reason === 'invalid-image'
        ? 'This image could not be read. Try uploading it again.'
        : 'This request is too large. Reduce attachments or turn off Include chat history in Settings.'
    );
    this.name = 'PlaygroundPayloadError';
  }
}

export function assertPlaygroundRequestSize(body: string | number) {
  const size =
    typeof body === 'number' ? body : new TextEncoder().encode(body).byteLength;
  if (size > MAX_PLAYGROUND_REQUEST_BYTES) throw new PlaygroundPayloadError();
}

export function readImageFile(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new PlaygroundPayloadError('invalid-image'));
    reader.onerror = () => reject(new PlaygroundPayloadError('invalid-image'));
    reader.readAsDataURL(file);
  });
}

function throwIfAborted(signal: AbortSignal) {
  if (signal.aborted)
    throw new DOMException('Request cancelled.', 'AbortError');
}

async function fitImage(
  blob: Blob,
  maxBytes: number,
  signal: AbortSignal
): Promise<Blob> {
  throwIfAborted(signal);
  if (blob.size <= maxBytes) return blob;
  // Never silently discard animation by flattening a GIF onto a canvas.
  if (blob.type === 'image/gif')
    throw new PlaygroundPayloadError('animated-image');
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(blob.type))
    throw new PlaygroundPayloadError('invalid-image');
  if (maxBytes < 16_000) throw new PlaygroundPayloadError();
  const image = new Image();
  const objectUrl = URL.createObjectURL(blob);
  const canvas = document.createElement('canvas');
  try {
    await new Promise<void>((resolve, reject) => {
      const finish = (error?: Error) => {
        signal.removeEventListener('abort', abort);
        image.onload = null;
        image.onerror = null;
        if (error) reject(error);
        else resolve();
      };
      const abort = () =>
        finish(new DOMException('Request cancelled.', 'AbortError'));
      image.onload = () => finish();
      image.onerror = () => finish(new PlaygroundPayloadError('invalid-image'));
      signal.addEventListener('abort', abort, { once: true });
      image.src = objectUrl;
      if (signal.aborted) abort();
    });
    const context = canvas.getContext('2d');
    if (!context || !image.naturalWidth || !image.naturalHeight)
      throw new PlaygroundPayloadError('invalid-image');
    let longestSide = Math.min(
      2048,
      Math.max(image.naturalWidth, image.naturalHeight)
    );
    while (true) {
      throwIfAborted(signal);
      const scale =
        longestSide / Math.max(image.naturalWidth, image.naturalHeight);
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      // WebP keeps transparency; browsers without its encoder fall back to PNG.
      for (const quality of [0.9, 0.8, 0.72]) {
        throwIfAborted(signal);
        const result = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, 'image/webp', quality)
        );
        throwIfAborted(signal);
        if (!result) throw new PlaygroundPayloadError('invalid-image');
        if (result.size <= maxBytes) return result;
      }
      if (longestSide <= 512) throw new PlaygroundPayloadError();
      longestSide = Math.max(512, Math.floor(longestSide * 0.75));
    }
  } finally {
    URL.revokeObjectURL(objectUrl);
    image.src = '';
    canvas.width = 0;
    canvas.height = 0;
  }
}

type ChatRequest = Record<string, unknown> & {
  messages: Array<Pick<PlaygroundMessage, 'role' | 'content'>>;
};

export async function prepareChatRequest(
  payload: ChatRequest,
  signal: AbortSignal
) {
  throwIfAborted(signal);
  const inlineImages: string[] = [];
  const skeleton = payload.messages.map((message) => ({
    ...message,
    content:
      typeof message.content === 'string'
        ? message.content
        : message.content.map((part) => {
            if (
              part.type !== 'image_url' ||
              !part.image_url.url.startsWith('data:image/')
            )
              return part;
            inlineImages.push(part.image_url.url);
            return { ...part, image_url: { ...part.image_url, url: '' } };
          })
  }));
  const overhead = new TextEncoder().encode(
    JSON.stringify({ ...payload, messages: skeleton })
  ).byteLength;
  assertPlaygroundRequestSize(overhead);
  const available = MAX_PLAYGROUND_REQUEST_BYTES - overhead;
  // Data URLs are ASCII. Count occurrences, since repeated images still travel repeatedly.
  if (inlineImages.reduce((size, url) => size + url.length, 0) <= available) {
    const body = JSON.stringify(payload);
    assertPlaygroundRequestSize(body);
    return { body, optimizedImages: 0 };
  }
  const maxBytes = Math.floor(
    ((available / inlineImages.length - 128) * 3) / 4
  );
  if (maxBytes < 16_000) throw new PlaygroundPayloadError();
  const optimized = new Map<string, string>();
  let optimizedImages = 0;
  for (const url of inlineImages) {
    throwIfAborted(signal);
    if (optimized.has(url)) continue;
    if (url.length <= available / inlineImages.length) {
      optimized.set(url, url);
      continue;
    }
    const original = await (await fetch(url, { signal })).blob();
    const result = await fitImage(original, maxBytes, signal);
    optimized.set(url, await readImageFile(result));
    if (result !== original) optimizedImages += 1;
  }
  const messages = payload.messages.map((message) => ({
    ...message,
    content:
      typeof message.content === 'string'
        ? message.content
        : message.content.map((part) =>
            part.type === 'image_url' && optimized.has(part.image_url.url)
              ? {
                  ...part,
                  image_url: {
                    ...part.image_url,
                    url: optimized.get(part.image_url.url)!
                  }
                }
              : part
          )
  }));
  throwIfAborted(signal);
  const body = JSON.stringify({ ...payload, messages });
  assertPlaygroundRequestSize(body);
  return { body, optimizedImages };
}

export async function fitImageFormData(
  form: FormData,
  images: Blob[],
  signal: AbortSignal
) {
  const textBytes = Array.from(form.entries()).reduce(
    (sum, [key, value]) =>
      sum +
      new TextEncoder().encode(key + (typeof value === 'string' ? value : ''))
        .byteLength,
    0
  );
  const available =
    MAX_PLAYGROUND_REQUEST_BYTES - textBytes - MULTIPART_RESERVE_BYTES;
  if (available <= 0) throw new PlaygroundPayloadError();
  const needsOptimization =
    images.reduce((size, image) => size + image.size, 0) > available;
  const maxBytes = Math.floor(available / images.length);
  let optimizedImages = 0;
  for (let index = 0; index < images.length; index++) {
    throwIfAborted(signal);
    const original = images[index];
    const image = needsOptimization
      ? await fitImage(original, maxBytes, signal)
      : original;
    if (image !== original) optimizedImages += 1;
    form.append(
      'image[]',
      image,
      `image-${index + 1}.${image.type.split('/')[1]}`
    );
  }
  assertPlaygroundRequestSize((await new Response(form).blob()).size);
  throwIfAborted(signal);
  return { body: form, optimizedImages };
}
