import type { TokenProviderRouting, TokenSource } from '@/lib/types/token';

// Provider routing of an API key: which upstream providers it uses, in what
// order, and which ones it never uses. The backend validates on save; these
// helpers keep the form state in a shape it accepts.

export const EMPTY_PROVIDER_ROUTING: TokenProviderRouting = {
  order: [],
  only: false,
  ignore: []
};

function names(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen: Record<string, boolean> = {};
  const result: string[] = [];
  value.forEach((item) => {
    if (typeof item !== 'string') return;
    const name = item.trim().toLowerCase();
    if (!name || seen[name]) return;
    seen[name] = true;
    result.push(name);
  });
  return result;
}

/** Reads the routing from an API response. Missing or malformed fields become empty. */
export function readProviderRouting(value: unknown): TokenProviderRouting {
  if (!value || typeof value !== 'object') return EMPTY_PROVIDER_ROUTING;
  const raw = value as Record<string, unknown>;
  const order = names(raw.order);
  const ignore = names(raw.ignore).filter((name) => order.indexOf(name) < 0);
  return { order, only: raw.only === true && order.length > 0, ignore };
}

export function isProviderRoutingEmpty(routing: TokenProviderRouting): boolean {
  return (
    routing.order.length === 0 && !routing.only && routing.ignore.length === 0
  );
}

/** Whether requests with this key may use the provider. Ignore wins over everything else. */
export function providerAllowed(
  routing: TokenProviderRouting,
  name: string
): boolean {
  if (routing.ignore.indexOf(name) >= 0) return false;
  return !routing.only || routing.order.indexOf(name) >= 0;
}

/** Appends a provider to the selection. A provider cannot be selected and ignored at once. */
export function selectProvider(
  routing: TokenProviderRouting,
  name: string
): TokenProviderRouting {
  if (routing.order.indexOf(name) >= 0) return routing;
  return {
    order: routing.order.concat(name),
    only: routing.only,
    ignore: routing.ignore.filter((item) => item !== name)
  };
}

/** Removes a provider from the selection. "Only selected" needs a selection, so it turns off with the last one. */
export function deselectProvider(
  routing: TokenProviderRouting,
  name: string
): TokenProviderRouting {
  const order = routing.order.filter((item) => item !== name);
  return {
    order,
    only: routing.only && order.length > 0,
    ignore: routing.ignore
  };
}

/** Replaces the selection order, e.g. after a drag. */
export function reorderProviders(
  routing: TokenProviderRouting,
  order: string[]
): TokenProviderRouting {
  return { order, only: routing.only, ignore: routing.ignore };
}

/** Turns "only selected providers" on or off. It stays off while nothing is selected. */
export function setOnlySelected(
  routing: TokenProviderRouting,
  only: boolean
): TokenProviderRouting {
  return {
    order: routing.order,
    only: only && routing.order.length > 0,
    ignore: routing.ignore
  };
}

/** Adds a provider to the ignore list, or removes it if it is already there. */
export function toggleIgnoredProvider(
  routing: TokenProviderRouting,
  name: string
): TokenProviderRouting {
  if (routing.ignore.indexOf(name) >= 0) {
    return {
      order: routing.order,
      only: routing.only,
      ignore: routing.ignore.filter((item) => item !== name)
    };
  }
  const withoutSelection = deselectProvider(routing, name);
  return {
    order: withoutSelection.order,
    only: withoutSelection.only,
    ignore: routing.ignore.concat(name).sort()
  };
}

/** Providers named in the routing that the account cannot use right now. */
export function unknownProviders(
  sources: TokenSource[],
  routing: TokenProviderRouting
): string[] {
  const known: Record<string, boolean> = {};
  sources.forEach((source) => {
    known[source.name] = true;
  });
  return routing.order
    .concat(routing.ignore)
    .filter((name) => !known[name])
    .sort();
}

/** Providers that can still serve requests under this routing. */
export function usableSources(
  sources: TokenSource[],
  routing: TokenProviderRouting
): TokenSource[] {
  return sources.filter((source) => providerAllowed(routing, source.name));
}

/** Models that no allowed provider serves. Shown as a warning before saving. */
export function unavailableModels(
  sources: TokenSource[],
  routing: TokenProviderRouting
): string[] {
  const available: Record<string, boolean> = {};
  usableSources(sources, routing).forEach((source) => {
    source.models.forEach((model) => {
      available[model] = true;
    });
  });
  const missing: Record<string, boolean> = {};
  sources.forEach((source) => {
    source.models.forEach((model) => {
      if (!available[model]) missing[model] = true;
    });
  });
  return Object.keys(missing).sort();
}
