import type { CodingApp } from './client-setup';

export type ModelProtocol =
  | 'anthropic-messages'
  | 'openai-responses'
  | 'gemini';
export interface ClientModel {
  id: string;
  // An explicit list is authoritative, including an empty list.
  protocols?: ModelProtocol[];
}
export const appProtocol: Record<CodingApp, ModelProtocol> = {
  claude: 'anthropic-messages',
  codex: 'openai-responses',
  gemini: 'gemini'
};

export function parseClientModels(data: unknown): ClientModel[] {
  if (!Array.isArray(data)) throw new Error('Invalid model list');
  const result = new Map<string, ClientModel>();
  for (const value of data) {
    if (typeof value === 'string' && value.trim())
      result.set(value, { id: value });
    else if (
      value &&
      typeof value === 'object' &&
      typeof value.id === 'string'
    ) {
      const protocols = Array.isArray(value.protocols)
        ? value.protocols.filter((p: unknown): p is ModelProtocol =>
            Object.values(appProtocol).includes(p as ModelProtocol)
          )
        : undefined;
      result.set(value.id, { id: value.id, protocols });
    }
  }
  return Array.from(result.values());
}

// Legacy servers return only names. These are conservative suggestions, not a
// claim about a particular channel. Explicit protocol metadata always wins.
export function suggestedApp(model: ClientModel): CodingApp | undefined {
  if (model.protocols !== undefined)
    return (Object.keys(appProtocol) as CodingApp[]).find((app) =>
      model.protocols!.includes(appProtocol[app])
    );
  const id = model.id.toLowerCase().split('/').pop() || '';
  if (/(?:^|[.-])claude(?:-|$)/.test(id)) return 'claude';
  if (
    /^gemini-/.test(id) &&
    !/embedding|image|tts|audio|live|robotics/.test(id)
  )
    return 'gemini';
  if (
    /^(gpt-(?:4\.1|4o|[5-9])|o[134](?:-|$)|codex-)/.test(id) &&
    !/image|audio|realtime|transcribe|tts|search/.test(id)
  )
    return 'codex';
  return undefined;
}

export function modelMatchesApp(model: ClientModel, app: CodingApp): boolean {
  return model.protocols !== undefined
    ? model.protocols.includes(appProtocol[app])
    : suggestedApp(model) === app;
}

export function setupSelection(models: ClientModel[], selected: string) {
  const model = models.find((item) => item.id === selected) ?? { id: selected };
  return {
    model: selected,
    app: suggestedApp(model),
    target: suggestedApp(model) ? ('ccswitch' as const) : ('manual' as const)
  };
}
