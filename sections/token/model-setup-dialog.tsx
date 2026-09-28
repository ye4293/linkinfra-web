'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { KeyRound, Plug } from 'lucide-react';
import { useText } from '@/components/locale-text';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import type { Token } from '@/lib/types/token';
import TokenForm from './token-form';
import { ClientSetupContent } from './client-setup-dialog';

// Model links open a choice, never create or expose a key automatically.
export function ModelSetupDialog({ tokens }: { tokens: Token[] }) {
  const tr = useText();
  const model = useSearchParams().get('model')?.trim() || '';
  const [open, setOpen] = useState(Boolean(model));
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Token>();
  const [created, setCreated] = useState(false);

  useEffect(() => {
    setOpen(Boolean(model));
    setCreating(false);
    setSelected(undefined);
    setCreated(false);
  }, [model]);

  if (!model) return null;
  const available = tokens.filter(
    (token) =>
      token.status === 1 &&
      (token.expired_time === -1 ||
        (token.expired_time ?? 0) > Date.now() / 1000) &&
      (token.unlimited_quota || (token.remain_quota ?? 0) > 0)
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
      <p className="min-w-0 break-all text-sm">
        {tr('Selected model')}: <strong>{model}</strong>
      </p>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            {tr('Set up this model')}
          </Button>
        </DialogTrigger>
        {open &&
          (selected ? (
            <ClientSetupContent
              key={selected.id ?? 'created-key'}
              token={selected}
              onChangeKey={() => {
                setSelected(undefined);
                setCreated(false);
              }}
            />
          ) : (
            <DialogContent className="max-h-[calc(100dvh-32px)] w-[calc(100vw-32px)] max-w-xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{tr('Set up this model')}</DialogTitle>
                <DialogDescription className="break-all">
                  {model}
                </DialogDescription>
              </DialogHeader>
              {creating ? (
                <TokenForm
                  create
                  onCancel={() => setCreating(false)}
                  onCreated={(token) => {
                    setCreating(false);
                    setCreated(true);
                    setSelected(token);
                  }}
                />
              ) : (
                <div className="min-w-0 space-y-4">
                  {created && (
                    <p role="status" className="text-sm text-primary">
                      {tr(
                        'API key created. Select it below to connect your app.'
                      )}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {tr(
                      'Use an existing key or create a new one, then connect your app with this model. Keys work across your available models; this does not restrict the key to one model.'
                    )}
                  </p>
                  <Button
                    className="w-full gap-2"
                    onClick={() => setCreating(true)}
                  >
                    <KeyRound className="h-4 w-4" />
                    {tr('Create API key')}
                  </Button>
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">
                      {tr('Use an existing key')}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {tr(
                        'Available keys on the current page. Close this dialog to search or change pages.'
                      )}
                    </p>
                    {available.map((token) => (
                      <Button
                        key={token.id}
                        variant="outline"
                        className="h-auto w-full justify-start gap-2 whitespace-normal py-3 text-left"
                        onClick={() => setSelected(token)}
                      >
                        <Plug className="h-4 w-4 shrink-0" />
                        <span className="min-w-0 break-all">
                          {token.name || tr('API key')}
                        </span>
                      </Button>
                    ))}
                    {!available.length && (
                      <p className="text-sm text-muted-foreground">
                        {tr('No active keys on this page.')}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </DialogContent>
          ))}
      </Dialog>
    </div>
  );
}
