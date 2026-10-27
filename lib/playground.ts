import { z } from 'zod';
import {
  assertPlaygroundRequestSize,
  fitImageFormData
} from './playground-payload';
export { readImageFile } from './playground-payload';

export type PlaygroundMode = 'chat' | 'image';
export type MessageContent =
  | string
  | Array<
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string } }
    >;

export interface PlaygroundMessage {
  role: 'system' | 'user' | 'assistant';
  content: MessageContent;
  error?: boolean;
}

export function chatSamplingParameters(temperature: number | null | undefined) {
  // Omission lets each model use its own supported default. Zero is an explicit value.
  return typeof temperature === 'number' ? { temperature } : {};
}

// Keep uploads bounded in both the browser and the proxy.
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
export const MAX_IMAGE_COUNT = 16;
export const EDIT_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
export const CHAT_IMAGE_TYPES = [...EDIT_IMAGE_TYPES, 'image/gif'];

export const imageRequestSchema = z.object({
  model: z.string().trim().min(1, 'Select an image model.'),
  prompt: z.string().trim().min(1, 'Describe the image you want to create.'),
  size: z.enum(['auto', '1024x1024', '1536x1024', '1024x1536']).default('auto'),
  quality: z.enum(['auto', 'low', 'medium', 'high']).default('auto'),
  output_format: z.enum(['png', 'jpeg', 'webp']).default('png'),
  n: z.coerce.number().int().min(1).max(4).default(1)
});

export type ImageRequest = z.infer<typeof imageRequestSchema>;

export function isGptImageModel(model: string) {
  return /gpt-image/i.test(model);
}

export function isImageUrl(value: string) {
  if (/^data:image\/(png|jpeg|webp|gif);base64,/i.test(value)) return true;
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

export function getTextContent(content: MessageContent) {
  return typeof content === 'string'
    ? content
    : content
        .flatMap((part) => (part.type === 'text' ? [part.text] : []))
        .join('\n');
}

export function getImageUrls(content: MessageContent) {
  return typeof content === 'string'
    ? []
    : content.flatMap((part) =>
        part.type === 'image_url' ? [part.image_url.url] : []
      );
}

export function buildMessageContent(
  text: string,
  images: string[]
): MessageContent {
  return images.length
    ? [
        { type: 'text', text },
        ...images.map((url) => ({
          type: 'image_url' as const,
          image_url: { url }
        }))
      ]
    : text;
}

export function requestError(
  data: unknown,
  fallback = 'Request failed'
): string {
  if (typeof data === 'string') return data || fallback;
  if (data && typeof data === 'object') {
    const value = data as { error?: unknown; message?: unknown };
    if (value.error) return requestError(value.error, fallback);
    if (typeof value.message === 'string') return value.message;
  }
  return fallback;
}

export function normalizeImageResponse(
  data: unknown,
  format = 'png'
): MessageContent {
  const response = data as {
    data?: unknown;
    error?: unknown;
    output_format?: string;
  } | null;
  if (response?.error) throw new Error(requestError(response));
  if (!response || !Array.isArray(response.data))
    throw new Error('No images returned.');
  const outputFormat = response.output_format || format;
  const mime =
    outputFormat === 'jpeg'
      ? 'image/jpeg'
      : outputFormat === 'webp'
      ? 'image/webp'
      : 'image/png';
  const images: string[] = [];
  const prompts: string[] = [];
  for (const item of response.data) {
    if (!item || typeof item !== 'object') continue;
    if (typeof item.b64_json === 'string' && item.b64_json) {
      images.push(`data:${mime};base64,${item.b64_json}`);
    } else if (typeof item.url === 'string' && isImageUrl(item.url)) {
      images.push(item.url);
    }
    if (typeof item.revised_prompt === 'string')
      prompts.push(item.revised_prompt);
  }
  if (!images.length) throw new Error('No images returned.');
  return buildMessageContent(prompts.join('\n'), images);
}

// Multipart works with GPT Image-compatible gateways, including image edits.
// Remote attachments are fetched in the browser, never by the server proxy.
export async function buildImageRequest(
  params: ImageRequest,
  apiKey: string,
  images: string[],
  signal: AbortSignal
): Promise<{
  body: BodyInit;
  headers?: Record<string, string>;
  optimizedImages: number;
}> {
  const payload = imageRequestSchema.parse(params);
  if (!images.length) {
    const body = JSON.stringify({ ...payload, apiKey });
    assertPlaygroundRequestSize(body);
    return {
      headers: { 'Content-Type': 'application/json' },
      body,
      optimizedImages: 0
    };
  }
  if (images.length > MAX_IMAGE_COUNT)
    throw new Error('You can attach up to 16 images.');
  const form = new FormData();
  form.set('apiKey', apiKey);
  Object.entries(payload).forEach(([key, value]) =>
    form.set(key, String(value))
  );
  const blobs: Blob[] = [];
  for (let index = 0; index < images.length; index++) {
    const url = images[index];
    if (!isImageUrl(url)) throw new Error('Invalid image URL.');
    let response: Response;
    try {
      response = await fetch(url, { signal, credentials: 'omit' });
    } catch (error) {
      if (signal.aborted) throw error;
      throw new Error(
        'Cannot load this image URL. Download the image and drop the file here instead.'
      );
    }
    if (!response.ok)
      throw new Error('Cannot load this image URL. Upload the file instead.');
    const blob = await response.blob();
    if (!EDIT_IMAGE_TYPES.includes(blob.type))
      throw new Error('Image editing supports PNG, JPEG and WebP files.');
    if (!blob.size || blob.size > MAX_IMAGE_BYTES)
      throw new Error('Each image must be between 1 byte and 20 MB.');
    blobs.push(blob);
  }
  return fitImageFormData(form, blobs, signal);
}

function assistantText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .flatMap((part) =>
      part?.type === 'text' && typeof part.text === 'string' ? [part.text] : []
    )
    .join('');
}

export async function readChatResponse(
  response: Response,
  onDelta: (text: string) => void
) {
  if (!response.headers.get('content-type')?.includes('text/event-stream')) {
    const json = await response.json();
    if (json.error) throw new Error(requestError(json));
    const text = assistantText(json.choices?.[0]?.message?.content);
    if (!text) throw new Error('No response content.');
    onDelta(text);
    return;
  }
  if (!response.body) throw new Error('No response body.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let receivedText = false;
  const consume = (line: string) => {
    if (!line.startsWith('data:')) return;
    const data = line.slice(5).trim();
    if (data === '[DONE]') return true;
    if (!data) return;
    let parsed;
    try {
      parsed = JSON.parse(data);
    } catch {
      return;
    }
    if (parsed.error) throw new Error(requestError(parsed));
    const text = assistantText(parsed.choices?.[0]?.delta?.content);
    if (text) {
      receivedText = true;
      onDelta(text);
    }
  };
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      let complete = false;
      for (const line of lines) {
        if (consume(line)) {
          complete = true;
          break;
        }
      }
      if (complete) break;
      if (done) {
        consume(buffer);
        break;
      }
    }
    if (!receivedText) throw new Error('No response content.');
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
