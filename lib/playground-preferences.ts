import { z } from 'zod';
import { isGptImageModel } from './playground';

const preferencesSchema = z.object({
  version: z.literal(1),
  mode: z.enum(['chat', 'image']),
  models: z.object({ chat: z.string(), image: z.string() }),
  includeHistory: z.boolean()
});

export type PlaygroundPreferences = z.infer<typeof preferencesSchema>;

export const defaultPlaygroundPreferences = (): PlaygroundPreferences => ({
  version: 1,
  mode: 'chat',
  models: { chat: '', image: '' },
  includeHistory: true
});

function preferenceKey(userId: string) {
  if (!userId)
    throw new Error('A user is required for Playground preferences.');
  return `linkinfra-playground-preferences:${encodeURIComponent(userId)}`;
}

export function loadPlaygroundPreferences(userId: string) {
  const saved = localStorage.getItem(preferenceKey(userId));
  return saved === null
    ? defaultPlaygroundPreferences()
    : preferencesSchema.parse(JSON.parse(saved));
}

export function savePlaygroundPreferences(
  userId: string,
  preferences: PlaygroundPreferences
) {
  localStorage.setItem(
    preferenceKey(userId),
    JSON.stringify(preferencesSchema.parse(preferences))
  );
}

export function resolvePlaygroundModels(
  available: string[],
  saved: PlaygroundPreferences['models']
) {
  return {
    chat: available.includes(saved.chat)
      ? saved.chat
      : available.find((model) => !isGptImageModel(model)) || '',
    image: available.includes(saved.image)
      ? saved.image
      : available.find((model) => model === 'gpt-image-1.5') ||
        available.find(isGptImageModel) ||
        ''
  };
}
