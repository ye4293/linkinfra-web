'use client';

import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useText } from '@/components/locale-text';
import { Button } from '@/components/ui/button';
import { clientApiKey, maskedApiKey } from '@/lib/client-setup';

export function ApiKeyCopy({ value }: { value: string }) {
  const tr = useText();
  const masked = maskedApiKey(value);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(clientApiKey(value));
      toast.success(tr('Copied to clipboard!'));
    } catch {
      toast.error(tr('Failed to copy!'));
    }
  };
  return (
    <div className="inline-flex max-w-full items-center gap-1">
      <code className="min-w-0 truncate text-xs text-muted-foreground">
        {masked}
      </code>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 shrink-0"
        disabled={masked === '—'}
        title={tr('Copy API key')}
        aria-label={tr('Copy API key')}
        onClick={copy}
      >
        <Copy className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
