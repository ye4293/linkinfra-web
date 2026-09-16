'use client';
import { useText } from '@/components/locale-text';

import { Button } from '@/components/ui/button';
import { useSystemConfig } from '@/hooks/use-system-config';
import { toast } from 'sonner';
import { apiAddresses } from '@/lib/client-setup';

export function ApiConnectionGuide({ compact = false }: { compact?: boolean }) {
  const tr = useText();
  const { serverAddress, loading, error, retry } = useSystemConfig();
  let baseUrl = '';
  if (!error) {
    try {
      baseUrl = apiAddresses(serverAddress).openai;
    } catch {
      /* 空配置不生成地址。 */
    }
  }

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
              : tr(error || 'Contact support for your API address.'))}
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
      {!loading && (error || !baseUrl) && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => retry()}
        >
          {tr('Reload API address')}
        </Button>
      )}
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
