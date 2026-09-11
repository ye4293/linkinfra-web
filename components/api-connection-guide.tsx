'use client';

import { Button } from '@/components/ui/button';
import { useSystemConfig } from '@/hooks/use-system-config';
import { toast } from 'sonner';

export function ApiConnectionGuide() {
  const { serverAddress, loading } = useSystemConfig();
  const baseUrl = serverAddress
    ? `${serverAddress.replace(/\/+$/, '').replace(/\/v1$/, '')}/v1`
    : '';

  return (
    <section
      className="space-y-3 rounded-lg border bg-muted/30 p-4"
      aria-label="About your API keys"
    >
      <h2 className="text-sm font-semibold">One API key, multiple models</h2>
      <p className="text-sm text-muted-foreground">
        Your API keys are universal: the same key can call any model available
        to your account. Choose a model by setting its model ID in each request.
        There is no need to create a separate key for each model. Your account
        balance and each key’s spending limit apply.
      </p>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium">OpenAI-compatible Base URL</span>
        <code className="min-w-0 break-all rounded bg-background px-2 py-1">
          {baseUrl ||
            (loading ? 'Loading…' : 'Contact support for your API address.')}
        </code>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!baseUrl}
          onClick={() =>
            navigator.clipboard
              .writeText(baseUrl)
              .then(() => toast.success('Base URL copied'))
              .catch(() => toast.error('Unable to copy Base URL'))
          }
        >
          Copy URL
        </Button>
      </div>
    </section>
  );
}
