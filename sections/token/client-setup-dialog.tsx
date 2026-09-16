'use client';
import { useText } from '@/components/locale-text';

import { useEffect, useId, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ClientModel,
  parseClientModels,
  modelMatchesApp,
  setupSelection
} from '@/lib/client-models';
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
  const tr = useText();
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="mr-2 h-4 w-4" />
          {tr('Set up client')}
        </Button>
      </DialogTrigger>
      {open && <ClientSetupContent token={token} />}
    </Dialog>
  );
}

function ClientSetupContent({ token }: { token: Token }) {
  const tr = useText();
  const selectedModel = useSearchParams().get('model') || '';
  const selection = setupSelection([], selectedModel);
  const selectionChanged = useRef(false);
  const id = useId();
  const {
    serverAddress,
    systemName,
    error: configError,
    retry: retryConfig,
    loading: configLoading
  } = useSystemConfig();
  const [target, setTarget] = useState<Target>(
    selectedModel ? selection.target : 'ccswitch'
  );
  const [app, setApp] = useState<CodingApp>(selection.app || 'claude');
  const [name, setName] = useState<string | null>(null);
  const [models, setModels] = useState<ClientModel[]>([]);
  const [model, setModel] = useState(selectedModel);
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
      err instanceof Error ? err.message : tr('API address unavailable.');
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
  const endpoint = configError
    ? ''
    : target === 'ccswitch' && app !== 'codex'
    ? root
    : openai;
  const availableModels =
    target === 'ccswitch'
      ? models.filter((item) => modelMatchesApp(item, app))
      : models;
  const matches = (id: string) =>
    modelMatchesApp(
      models.find((item) => item.id === id.trim()) ?? { id: id.trim() },
      app
    );
  const invalidModel =
    target === 'ccswitch' &&
    ((!!model.trim() &&
      (!matches(model) ||
        (!loading &&
          !modelError &&
          !models.some((item) => item.id === model.trim())))) ||
      (app === 'claude' &&
        Object.values(optionalModels).some(
          (id) =>
            id.trim() &&
            (!matches(id) ||
              (!loading &&
                !modelError &&
                !models.some((item) => item.id === id.trim())))
        )));

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
        if (!controller.signal.aborted) {
          const entries = parseClientModels(body.data);
          setModels(entries);
          if (selectedModel && !selectionChanged.current) {
            const initial = setupSelection(entries, selectedModel);
            setTarget(initial.target);
            if (initial.app) setApp(initial.app);
          }
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setModelError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [retry, selectedModel]);

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(tr('{label} copied', { label }));
    } catch {
      toast.error(tr('Unable to copy {label}', { label }));
    }
  };
  const launch = () => {
    if (
      configLoading ||
      configError ||
      inactive ||
      addressError ||
      keyError ||
      invalidModel
    )
      return;
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
      toast.error(tr((err as Error).message));
    }
  };

  return (
    <DialogContent className="flex h-[min(740px,calc(100dvh-32px))] w-[calc(100vw-32px)] max-w-xl flex-col overflow-hidden p-4 sm:p-6">
      <DialogHeader className="pr-6 text-left">
        <DialogTitle>{tr('Set up your client')}</DialogTitle>
        <DialogDescription className="break-words">
          {tr(
            'Use {name} with your favorite app. Your key stays universal across models.',
            { name: token.name || tr('this API key') }
          )}
        </DialogDescription>
      </DialogHeader>
      <div
        className="grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-3"
        aria-label={tr('Client')}
      >
        {(
          [
            ['ccswitch', 'CC Switch'],
            ['cherry', 'Cherry Studio'],
            ['manual', tr('Chatbox / Other')]
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            variant={target === value ? 'default' : 'outline'}
            aria-pressed={target === value}
            onClick={() => {
              selectionChanged.current = true;
              setTarget(value);
              setOpened(false);
            }}
          >
            {label}
          </Button>
        ))}
      </div>
      <div
        className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-2"
        key={target}
      >
        {inactive && (
          <p role="alert" className="text-sm text-destructive">
            {tr(
              'This key is disabled, expired or exhausted. Enable or renew it before importing.'
            )}
          </p>
        )}
        {keyError && (
          <p role="alert" className="text-sm text-destructive">
            {tr(keyError)}
          </p>
        )}
        {configLoading ? (
          <p className="text-sm text-muted-foreground">
            {tr('Loading API address…')}
          </p>
        ) : (
          (configError || addressError) && (
            <div className="space-y-2">
              <p role="alert" className="text-sm text-destructive">
                {tr(configError || addressError)}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => retryConfig()}
              >
                {tr('Reload API address')}
              </Button>
            </div>
          )
        )}
        {target !== 'manual' && (
          <div className="space-y-2">
            <Label htmlFor={`${id}-name`}>{tr('Provider name')}</Label>
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
            <Label htmlFor={`${id}-app`}>
              {tr('Application in CC Switch')}
            </Label>
            <select
              id={`${id}-app`}
              value={app}
              onChange={(e) => {
                selectionChanged.current = true;
                setApp(e.target.value as CodingApp);
                const nextApp = e.target.value as CodingApp;
                if (
                  !modelMatchesApp(
                    models.find((item) => item.id === model) ?? { id: model },
                    nextApp
                  )
                )
                  setModel('');
                setOptionalModels({
                  haikuModel: '',
                  sonnetModel: '',
                  opusModel: ''
                });
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
                ? tr('Choose a model that supports the Anthropic Messages API.')
                : app === 'codex'
                ? tr('Choose a model that supports the OpenAI Responses API.')
                : tr('Choose a model that supports the native Gemini API.')}
            </p>
          </div>
        )}
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                {target === 'ccswitch'
                  ? tr('API endpoint')
                  : tr('OpenAI-compatible Base URL')}
              </p>
              <code className="break-all text-sm">
                {endpoint || tr('Not configured')}
              </code>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label={tr('Copy API address')}
              disabled={!endpoint}
              onClick={() => copy(endpoint, tr('API address'))}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs text-muted-foreground">{tr('API key')}</p>
              <span
                aria-label={tr('API key hidden')}
                className="font-mono text-sm"
              >
                ••••••••••••••••
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label={tr('Copy API key')}
              disabled={!!keyError || inactive}
              onClick={() => copy(clientApiKey(token.key), tr('API key'))}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {target !== 'cherry' && (
          <div className="space-y-2">
            <Label htmlFor={`${id}-model`}>
              {target === 'ccswitch' ? tr('Primary model') : tr('Model ID')}
            </Label>
            <div className="flex gap-2">
              <Input
                id={`${id}-model`}
                list={`${id}-models`}
                placeholder={tr('Search or enter a model ID')}
                value={model}
                onChange={(e) => {
                  selectionChanged.current = true;
                  setModel(e.target.value);
                }}
              />
              <Button
                variant="outline"
                size="icon"
                aria-label={tr('Copy model ID')}
                disabled={!model.trim()}
                onClick={() => copy(model.trim(), tr('Model ID'))}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <datalist id={`${id}-models`}>
              {availableModels.map(({ id }) => (
                <option key={id} value={id} />
              ))}
            </datalist>
            {loading ? (
              <p className="text-xs text-muted-foreground">
                {tr('Loading your models… You can also enter an ID.')}
              </p>
            ) : modelError ? (
              <p className="text-xs text-muted-foreground">
                {tr('Model list unavailable. Enter an ID manually or')}{' '}
                <button
                  type="button"
                  className="underline"
                  onClick={() => setRetry((v) => v + 1)}
                >
                  {tr('retry')}
                </button>
                .
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {tr('{count} models available for this selection.', {
                  count: availableModels.length
                })}
              </p>
            )}
          </div>
        )}
        {invalidModel && (
          <p role="alert" className="text-sm text-destructive">
            {tr(
              'Choose an available model compatible with this application, including optional mappings.'
            )}
          </p>
        )}
        {target === 'ccswitch' &&
          !loading &&
          models.some((item) => item.protocols === undefined) && (
            <p className="text-xs text-muted-foreground">
              {tr(
                'Suggestions are based on model families. Channel protocol compatibility has not been verified. For a custom model, use manual setup.'
              )}
            </p>
          )}
        {target === 'ccswitch' && app === 'claude' && (
          <details className="rounded-lg border p-3">
            <summary className="cursor-pointer text-sm">
              {tr('Optional Claude model mappings')}
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
                      placeholder={tr('Use app default')}
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
              {tr(
                'In Chatbox, open Settings → Model Provider and add an OpenAI-compatible provider.'
              )}
            </p>
            <p>
              {tr(
                'Paste the Base URL and API key above, then select or add your model ID. The same fields work in other OpenAI-compatible clients.'
              )}
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              {tr(
                'Install {app} first. Opening the app passes this key and API address to it; review and confirm the import there.',
                { app: target === 'cherry' ? 'Cherry Studio' : 'CC Switch' }
              )}
              {target === 'cherry' &&
                tr(' Then fetch or add models in the provider settings.')}
            </p>
            <Button
              disabled={
                configLoading ||
                !!configError ||
                !!addressError ||
                !!keyError ||
                inactive ||
                invalidModel ||
                !providerName.trim() ||
                (target === 'ccswitch' && (loading || !model.trim()))
              }
              onClick={launch}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              {tr('Open {app}', {
                app: target === 'cherry' ? 'Cherry Studio' : 'CC Switch'
              })}
            </Button>
            {opened && (
              <p role="status" className="text-sm text-muted-foreground">
                {tr(
                  'If the app did not open, allow the browser’s app prompt or use Chatbox / Other to copy the settings manually.'
                )}
              </p>
            )}
          </>
        )}
      </div>
    </DialogContent>
  );
}
