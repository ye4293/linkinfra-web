'use client';
import { useText } from '@/components/locale-text';

import { Button } from '@/components/ui/button';
import { useSystemConfig } from '@/hooks/use-system-config';
import { toast } from 'sonner';

export function ApiConnectionGuide({ compact = false }: { compact?: boolean }) {
  const tr = useText();
  const { serverAddress, loading } = useSystemConfig();
  const baseUrl = serverAddress
    ? `${serverAddress.replace(/\/+$/, '').replace(/\/v1$/, '')}/v1`
    : '';

  return (
    <section
      className="space-y-3 rounded-lg border bg-muted/30 p-4"
      aria-label={tr('About your API keys')}
    >
      {!compact && (
        <h2 className="text-sm font-semibold">
          {tr('One API key, multiple models')}
        </h2>
      )}
      {!compact && (
        <p className="text-sm text-muted-foreground">
          {tr(
            'Your API keys are universal: the same key can call any model available to your account. Choose a model by setting its model ID in each request. There is no need to create a separate key for each model. Your account balance and each key’s spending limit apply.'
          )}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium">{tr('OpenAI-compatible Base URL')}</span>
        <code className="min-w-0 break-all rounded bg-background px-2 py-1">
          {baseUrl ||
            (loading
              ? tr('Loading…')
              : tr('Contact support for your API address.'))}
        </code>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!baseUrl}
          onClick={() =>
            navigator.clipboard
              .writeText(baseUrl)
              .then(() => toast.success(tr('Base URL copied')))
              .catch(() => toast.error(tr('Unable to copy Base URL')))
          }
        >
          {tr('Copy URL')}
        </Button>
      </div>
      {compact && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">
            {tr('One API key, multiple models')}
          </summary>
          <p className="mt-2 leading-relaxed">
            {tr(
              'Your API keys are universal: the same key can call any model available to your account. Choose a model by setting its model ID in each request. There is no need to create a separate key for each model. Your account balance and each key’s spending limit apply.'
            )}
          </p>
        </details>
      )}
    </section>
  );
}
