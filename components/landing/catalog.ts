import type {
  ModelPlazaItem,
  ModelPlazaResponse
} from '@/lib/types/model-plaza';

export function modelEntryKey(model: ModelPlazaItem) {
  return JSON.stringify([model.channel_id ?? model.provider, model.model_name]);
}

export function modelDetailHref(model: ModelPlazaItem) {
  const path = `/model-plaza/${encodeURIComponent(model.model_name)}`;
  return model.channel_id ? `${path}?channel_id=${model.channel_id}` : path;
}

// Order families, not specific releases. Numeric sorting includes future versions.
const families = [
  'claude-opus',
  'claude-fable',
  'claude-sonnet',
  'glm',
  'gpt',
  'gemini',
  'deepseek',
  'claude-haiku'
];
function family(name: string) {
  const normalized = name.replace(/^global\.anthropic\./, '');
  const index = families.findIndex((prefix) => normalized.startsWith(prefix));
  return index < 0 ? families.length : index;
}
export function orderModels(models: ModelPlazaItem[]) {
  const sorted = [...models].sort(
    (a, b) =>
      Number(a.model_name.startsWith('global.')) -
        Number(b.model_name.startsWith('global.')) ||
      family(a.model_name) - family(b.model_name) ||
      b.model_name
        .replace(/-thinking$/, '')
        .localeCompare(a.model_name.replace(/-thinking$/, ''), 'en', {
          numeric: true
        }) ||
      Number(a.model_name.endsWith('-thinking')) -
        Number(b.model_name.endsWith('-thinking'))
  );
  const seen = new Set<string>();
  const featured: ModelPlazaItem[] = [],
    rest: ModelPlazaItem[] = [];
  for (const model of sorted) {
    const key = `${model.provider}:${family(model.model_name)}`;
    if (!seen.has(key)) {
      seen.add(key);
      featured.push(model);
    } else rest.push(model);
  }
  return [...featured, ...rest];
}
export function modelTitle(name: string) {
  const displayName = name.startsWith('global.anthropic.')
    ? name.replace(/^global\.anthropic\./, '').replace(/-v\d+(?::\d+)?$/, '')
    : name;
  return displayName
    .replace(/-\d{8}(?=-|$)/, '')
    .replace(/(\d)-(?=\d)/g, '$1.')
    .split('-')
    .map((p) =>
      p === 'deepseek'
        ? 'DeepSeek'
        : p === 'glm' || p === 'gpt'
        ? p.toUpperCase()
        : p.charAt(0).toUpperCase() + p.slice(1)
    )
    .join(' ');
}

export function matchesModel(model: ModelPlazaItem, query: string) {
  const normalize = (value: string) =>
    value.toLowerCase().replace(/[\s._:/-]+/g, '');
  const search = normalize(query);
  return [
    model.model_name,
    modelTitle(model.model_name),
    model.provider,
    model.provider === 'Zhipu' ? 'Z.ai' : ''
  ].some((value) => normalize(value).includes(search));
}
export function modelPrices(model: ModelPlazaItem, group: string) {
  const price = model.group_prices?.find((item) => item.group_key === group);
  const discount = (model.model_discount ?? 1) * (model.channel_discount ?? 1);
  return {
    input: price?.final_input_price ?? model.base_input_price * discount,
    output: price?.final_output_price ?? model.base_output_price * discount,
    fixed: price?.final_fixed_price ?? model.base_fixed_price * discount,
    duration:
      price?.final_duration_price_per_minute ??
      (model.base_duration_price_per_minute == null
        ? undefined
        : model.base_duration_price_per_minute * discount),
    discount: price?.combined_discount ?? discount
  };
}
export function formatPrice(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value)
    ? `$${value.toLocaleString('en-US', { maximumFractionDigits: 6 })}`
    : '—';
}
export async function fetchCatalog(
  signal: AbortSignal
): Promise<ModelPlazaResponse> {
  const readPage = async (page: number) => {
    const response = await fetch(`/api/model-plaza?page=${page}&pagesize=100`, {
      signal
    });
    if (!response.ok) throw new Error('Catalog unavailable');
    const result = await response.json();
    if (!result.success || !Array.isArray(result.data?.models))
      throw new Error('Invalid catalog');
    const data = result.data;
    // Nullable collections are valid for empty backend responses. Reject invalid
    // identities and prices here so the page can show its retry state safely.
    const groups = data.groups ?? [];
    const providers = data.providers ?? [];
    const validPrice = (price: unknown) =>
      typeof price === 'number' && Number.isFinite(price) && price >= 0;
    if (
      !Number.isSafeInteger(data.total) ||
      data.total < 0 ||
      !Array.isArray(groups) ||
      !Array.isArray(providers) ||
      !groups.every(
        (group) =>
          group &&
          typeof group.group_key === 'string' &&
          typeof group.display_name === 'string'
      ) ||
      !providers.every(
        (provider) =>
          provider &&
          typeof provider.name === 'string' &&
          Number.isSafeInteger(provider.count) &&
          provider.count >= 0
      ) ||
      !data.models.every(
        (model: ModelPlazaItem | null) =>
          model &&
          typeof model.model_name === 'string' &&
          model.model_name.length > 0 &&
          typeof model.provider === 'string' &&
          ['ratio', 'fixed', 'duration'].includes(model.price_type) &&
          (model.price_type !== 'duration' ||
            validPrice(model.base_duration_price_per_minute)) &&
          [
            model.base_input_price,
            model.base_output_price,
            model.base_fixed_price
          ].every(validPrice) &&
          (model.group_prices == null ||
            (Array.isArray(model.group_prices) &&
              model.group_prices.every(
                (price) =>
                  price &&
                  typeof price.group_key === 'string' &&
                  (model.price_type !== 'duration' ||
                    validPrice(price.final_duration_price_per_minute)) &&
                  [
                    price.final_input_price,
                    price.final_output_price,
                    price.final_fixed_price
                  ].every(validPrice)
              )))
      )
    ) {
      throw new Error('Invalid catalog fields');
    }
    const pageSize = data.page_size ?? (data.models.length || 100);
    if (!Number.isSafeInteger(pageSize) || pageSize < 1)
      throw new Error('Invalid catalog pagination');
    return {
      ...data,
      groups,
      providers,
      page_size: pageSize
    } as ModelPlazaResponse;
  };
  const first = await readPage(1),
    models = [...first.models];
  const pageSize = first.page_size || first.models.length || 100;
  for (let page = 2; page <= Math.ceil(first.total / pageSize); page++) {
    const next = await readPage(page);
    if (!next.models.length) break;
    models.push(...next.models);
  }
  return {
    ...first,
    models: orderModels(
      Array.from(new Map(models.map((m) => [modelEntryKey(m), m])).values())
    )
  };
}
