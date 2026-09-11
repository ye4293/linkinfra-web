'use client';

import { useEffect, useId, useState } from 'react';
import { Copy, ExternalLink, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { useSystemConfig } from '@/hooks/use-system-config';
import { Token } from '@/lib/types/token';
import {
  apiAddresses,
  buildClientImport,
  clientApiKey,
  CodingApp
} from '@/lib/client-setup';

type Target = 'ccswitch' | 'cherry' | 'manual';

export function ClientSetupDialog({ token }: { token: Token }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="mr-2 h-4 w-4" />
          Set up client
        </Button>
      </DialogTrigger>
      {open && <ClientSetupContent token={token} />}
    </Dialog>
  );
}

function ClientSetupContent({ token }: { token: Token }) {
  const id = useId();
  const {
    serverAddress,
    systemName,
    loading: configLoading
  } = useSystemConfig();
  const [target, setTarget] = useState<Target>('ccswitch');
  const [app, setApp] = useState<CodingApp>('claude');
  const [name, setName] = useState<string | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState('');
  const [optionalModels, setOptionalModels] = useState({
    haikuModel: '',
    sonnetModel: '',
    opusModel: ''
  });
  const [loading, setLoading] = useState(true);
  const [modelError, setModelError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [opened, setOpened] = useState(false);
  const providerName =
    name ??
    `${systemName || 'LinkInfra'}${token.name ? ` · ${token.name}` : ''}`;
  let addressError = '';
  let root = '';
  let openai = '';
  try {
    ({ root, openai } = apiAddresses(serverAddress));
  } catch (err) {
    addressError =
      err instanceof Error ? err.message : 'API address unavailable.';
  }
  let keyError = '';
  try {
    clientApiKey(token.key);
  } catch (err) {
    keyError = (err as Error).message;
  }
  const expired =
    token.expired_time !== undefined &&
    token.expired_time !== -1 &&
    token.expired_time <= Date.now() / 1000;
  const inactive = token.status !== 1 || expired;
  const endpoint = target === 'ccswitch' && app !== 'codex' ? root : openai;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setModelError(false);
    fetch('/api/playground/models', {
      cache: 'no-store',
      signal: controller.signal
    })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok || !body.success || !Array.isArray(body.data))
          throw new Error();
        if (!controller.signal.aborted)
          setModels(
            body.data.filter(
              (item: unknown): item is string => typeof item === 'string'
            )
          );
      })
      .catch(() => {
        if (!controller.signal.aborted) setModelError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [retry]);

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error(`Unable to copy ${label.toLowerCase()}`);
    }
  };
  const launch = () => {
    if (inactive || addressError || keyError) return;
    try {
      const url = buildClientImport(target === 'cherry' ? 'cherry' : app, {
        serverAddress,
        apiKey: token.key,
        name: providerName,
        model,
        ...optionalModels
      });
      // Build the secret-bearing URL only in direct response to this click.
      window.location.assign(url);
      setOpened(true);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <DialogContent className="max-h-[calc(100dvh-32px)] w-[calc(100vw-32px)] max-w-xl overflow-y-auto p-4 sm:p-6">
      <DialogHeader className="pr-6 text-left">
        <DialogTitle>Set up your client</DialogTitle>
        <DialogDescription className="break-words">
          Use {token.name || 'this API key'} with your favorite app. Your key
          stays universal across models.
        </DialogDescription>
      </DialogHeader>
      <div
        className="grid grid-cols-1 gap-2 sm:grid-cols-3"
        aria-label="Client"
      >
        {(
          [
            ['ccswitch', 'CC Switch'],
            ['cherry', 'Cherry Studio'],
            ['manual', 'Chatbox / Other']
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            variant={target === value ? 'default' : 'outline'}
            aria-pressed={target === value}
            onClick={() => {
              setTarget(value);
              setOpened(false);
            }}
          >
            {label}
          </Button>
        ))}
      </div>
      {inactive && (
        <p role="alert" className="text-sm text-destructive">
          This key is disabled, expired or exhausted. Enable or renew it before
          importing.
        </p>
      )}
      {keyError && (
        <p role="alert" className="text-sm text-destructive">
          {keyError}
        </p>
      )}
      {configLoading ? (
        <p className="text-sm text-muted-foreground">Loading API address…</p>
      ) : (
        addressError && (
          <p role="alert" className="text-sm text-destructive">
            {addressError}
          </p>
        )
      )}
      {target !== 'manual' && (
        <div className="space-y-2">
          <Label htmlFor={`${id}-name`}>Provider name</Label>
          <Input
            id={`${id}-name`}
            value={providerName}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
          />
        </div>
      )}
      {target === 'ccswitch' && (
        <div className="space-y-2">
          <Label htmlFor={`${id}-app`}>Application in CC Switch</Label>
          <select
            id={`${id}-app`}
            value={app}
            onChange={(e) => {
              setApp(e.target.value as CodingApp);
              setModel('');
              setOpened(false);
            }}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="claude">Claude Code</option>
            <option value="codex">Codex</option>
            <option value="gemini">Gemini CLI</option>
          </select>
          <p className="text-xs text-muted-foreground">
            {app === 'claude'
              ? 'Choose a model that supports the Anthropic Messages API.'
              : app === 'codex'
              ? 'Choose a model that supports the OpenAI Responses API.'
              : 'Choose a model that supports the native Gemini API.'}
          </p>
        </div>
      )}
      <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">
              {target === 'ccswitch'
                ? 'API endpoint'
                : 'OpenAI-compatible Base URL'}
            </p>
            <code className="break-all text-sm">
              {endpoint || 'Not configured'}
            </code>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Copy API address"
            disabled={!endpoint}
            onClick={() => copy(endpoint, 'API address')}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground">API key</p>
            <span aria-label="API key hidden" className="font-mono text-sm">
              ••••••••••••••••
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Copy API key"
            disabled={!!keyError || inactive}
            onClick={() => copy(clientApiKey(token.key), 'API key')}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {target !== 'cherry' && (
        <div className="space-y-2">
          <Label htmlFor={`${id}-model`}>
            {target === 'ccswitch' ? 'Primary model' : 'Model ID'}
          </Label>
          <div className="flex gap-2">
            <Input
              id={`${id}-model`}
              list={`${id}-models`}
              placeholder="Search or enter a model ID"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
            <Button
              variant="outline"
              size="icon"
              aria-label="Copy model ID"
              disabled={!model.trim()}
              onClick={() => copy(model.trim(), 'Model ID')}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <datalist id={`${id}-models`}>
            {models.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          {loading ? (
            <p className="text-xs text-muted-foreground">
              Loading your models… You can also enter an ID.
            </p>
          ) : modelError ? (
            <p className="text-xs text-muted-foreground">
              Model list unavailable. Enter an ID manually or{' '}
              <button
                type="button"
                className="underline"
                onClick={() => setRetry((v) => v + 1)}
              >
                retry
              </button>
              .
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {models.length} configured models. Choose one compatible with this
              application.
            </p>
          )}
        </div>
      )}
      {target === 'ccswitch' && app === 'claude' && (
        <details className="rounded-lg border p-3">
          <summary className="cursor-pointer text-sm">
            Optional Claude model mappings
          </summary>
          <div className="mt-3 space-y-3">
            {(['haikuModel', 'sonnetModel', 'opusModel'] as const).map(
              (field) => (
                <div key={field} className="space-y-1">
                  <Label htmlFor={`${id}-${field}`}>
                    {field.replace('Model', '')}
                  </Label>
                  <Input
                    id={`${id}-${field}`}
                    list={`${id}-models`}
                    placeholder="Use app default"
                    value={optionalModels[field]}
                    onChange={(e) =>
                      setOptionalModels({
                        ...optionalModels,
                        [field]: e.target.value
                      })
                    }
                  />
                </div>
              )
            )}
          </div>
        </details>
      )}
      {target === 'manual' ? (
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            In Chatbox, open Settings → Model Provider and add an
            OpenAI-compatible provider.
          </p>
          <p>
            Paste the Base URL and API key above, then select or add your model
            ID. The same fields work in other OpenAI-compatible clients.
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Install {target === 'cherry' ? 'Cherry Studio' : 'CC Switch'} first.
            Opening the app passes this key and API address to it; review and
            confirm the import there.
            {target === 'cherry' &&
              ' Then fetch or add models in the provider settings.'}
          </p>
          <Button
            disabled={
              configLoading ||
              !!addressError ||
              !!keyError ||
              inactive ||
              !providerName.trim() ||
              (target === 'ccswitch' && !model.trim())
            }
            onClick={launch}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Open {target === 'cherry' ? 'Cherry Studio' : 'CC Switch'}
          </Button>
          {opened && (
            <p role="status" className="text-sm text-muted-foreground">
              If the app did not open, allow the browser’s app prompt or use
              Chatbox / Other to copy the settings manually.
            </p>
          )}
        </>
      )}
    </DialogContent>
  );
}
