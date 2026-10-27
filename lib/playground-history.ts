import { z } from 'zod';
import {
  isImageUrl,
  getTextContent,
  getImageUrls,
  type PlaygroundMessage,
  type PlaygroundMode
} from './playground';

export type PlaygroundHistory = Record<PlaygroundMode, PlaygroundMessage[]>;
export const emptyPlaygroundHistory = (): PlaygroundHistory => ({
  chat: [],
  image: []
});

const messageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.union([
    z.string(),
    z.array(
      z.union([
        z.object({ type: z.literal('text'), text: z.string() }),
        z.object({
          type: z.literal('image_url'),
          image_url: z.object({ url: z.string().refine(isImageUrl) })
        })
      ])
    )
  ]),
  error: z.boolean().optional()
});
const savedHistorySchema = z.object({
  version: z.literal(1),
  history: z.object({
    chat: z.array(messageSchema),
    image: z.array(messageSchema)
  })
});

export function restorePlaygroundHistory(saved: unknown): PlaygroundHistory {
  if (saved === undefined) return emptyPlaygroundHistory();
  // A corrupt or newer record must not silently be overwritten with an empty one.
  const history = savedHistorySchema.parse(saved).history;
  for (const mode of ['chat', 'image'] as const) {
    // A refresh during generation can leave a placeholder, not a real reply.
    history[mode] = history[mode].filter(
      (message) =>
        message.role !== 'assistant' ||
        getTextContent(message.content).length > 0 ||
        getImageUrls(message.content).length > 0
    );
  }
  return history;
}

function historyTransaction(
  userId: string,
  history?: PlaygroundHistory
): Promise<unknown> {
  if (!userId)
    return Promise.reject(new Error('A user is required for local history.'));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('linkinfra-playground', 1);
    let blocked = false;
    request.onupgradeneeded = () =>
      request.result.createObjectStore('histories');
    request.onerror = () => reject(request.error);
    request.onblocked = () => {
      blocked = true;
      reject(new Error('Close other Playground tabs and try again.'));
    };
    request.onsuccess = () => {
      const database = request.result;
      if (blocked) {
        database.close();
        return;
      }
      try {
        const transaction = database.transaction(
          'histories',
          history ? 'readwrite' : 'readonly'
        );
        const store = transaction.objectStore('histories');
        const operation = history
          ? store.put(savedHistorySchema.parse({ version: 1, history }), userId)
          : store.get(userId);
        transaction.oncomplete = () => {
          database.close();
          resolve(operation.result);
        };
        transaction.onabort = () => {
          database.close();
          reject(transaction.error || operation.error);
        };
        transaction.onerror = () => {
          database.close();
          reject(transaction.error || operation.error);
        };
      } catch (error) {
        database.close();
        reject(error);
      }
    };
  });
}

// Serialize saves across page remounts so an older queued write cannot undo a clear.
let writes: Promise<unknown> = Promise.resolve();

export async function loadPlaygroundHistory(userId: string) {
  await writes.catch(() => {});
  return restorePlaygroundHistory(await historyTransaction(userId));
}

export function savePlaygroundHistory(
  userId: string,
  history: PlaygroundHistory
) {
  writes = writes
    .catch(() => {})
    .then(() => historyTransaction(userId, history));
  return writes;
}
