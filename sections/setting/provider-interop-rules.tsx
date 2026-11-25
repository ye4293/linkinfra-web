'use client';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowDown,
  ArrowUp,
  Info,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

const OPTION_KEY = 'ProviderInteropRules';

/** One rule: for models matching any pattern, the listed providers can retry each other. */
interface InteropRule {
  models: string[];
  providers: string[];
}

/** A provider name configured on channels (GET /api/channel/providers). */
interface ProviderUsage {
  provider: string;
  channel_count: number;
  enabled_count: number;
}

const EMPTY_RULE: InteropRule = { models: [], providers: [] };

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function parseRules(value: unknown): InteropRule[] {
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((rule) => ({
      models: strings(rule?.models),
      providers: strings(rule?.providers)
    }));
  } catch {
    return [];
  }
}

function usageHint(usage: ProviderUsage | undefined): string {
  if (!usage) return 'no channels';
  if (usage.enabled_count === 0) return 'none enabled';
  if (usage.enabled_count !== usage.channel_count) {
    return `${usage.enabled_count}/${usage.channel_count} enabled`;
  }
  return usage.channel_count === 1
    ? '1 channel'
    : `${usage.channel_count} channels`;
}

function RuleDialog({
  open,
  onOpenChange,
  rule,
  usage,
  onSave
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: InteropRule | null;
  usage: ProviderUsage[];
  onSave: (rule: InteropRule) => void;
}) {
  const [models, setModels] = useState('');
  const [providers, setProviders] = useState<string[]>([]);
  const [custom, setCustom] = useState('');

  useEffect(() => {
    const current = rule ?? EMPTY_RULE;
    setModels(current.models.join('\n'));
    setProviders(current.providers);
    setCustom('');
  }, [rule, open]);

  const known = usage.map((item) => item.provider);
  // Providers already on the rule stay listed even when no channel uses them any more.
  const listed = known.concat(
    providers.filter((name) => known.indexOf(name) < 0)
  );
  const patterns = models
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const toggle = (name: string) =>
    setProviders((prev) =>
      prev.indexOf(name) >= 0
        ? prev.filter((item) => item !== name)
        : prev.concat(name)
    );

  const addCustom = () => {
    const name = custom.trim().toLowerCase();
    if (!name) return;
    setProviders((prev) =>
      prev.indexOf(name) >= 0 ? prev : prev.concat(name)
    );
    setCustom('');
  };

  const problem =
    patterns.length === 0
      ? 'Add at least one model pattern.'
      : providers.length < 2
      ? 'Select at least two providers.'
      : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rule ? 'Edit rule' : 'Add rule'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="interop-models">Model regex (one per line)</Label>
            <Textarea
              id="interop-models"
              rows={3}
              value={models}
              onChange={(e) => setModels(e.target.value)}
              placeholder="^claude-"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Matched against the model name in the request. The rule applies
              when any pattern matches.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Providers that can retry each other</Label>
            {listed.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No channel has a provider yet. Set the Provider field on the
                channels first, or add a name below.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {listed.map((name) => {
                  const id = `interop-provider-${name}`;
                  return (
                    <div
                      key={name}
                      className="flex items-center gap-2 rounded-md border px-3 py-2"
                    >
                      <Checkbox
                        id={id}
                        checked={providers.indexOf(name) >= 0}
                        onCheckedChange={() => toggle(name)}
                      />
                      <Label
                        htmlFor={id}
                        className="min-w-0 flex-1 font-normal"
                      >
                        <span className="block truncate font-mono text-sm">
                          {name}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {usageHint(
                            usage.find((item) => item.provider === name)
                          )}
                        </span>
                      </Label>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                onKeyDown={(e) => {
                  // Ignore Enter while an input method is composing text.
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    addCustom();
                  }
                }}
                placeholder="Another provider name"
                className="max-w-xs"
              />
              <Button
                type="button"
                variant="outline"
                onClick={addCustom}
                disabled={!custom.trim()}
              >
                Add
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            {problem && (
              <span className="text-sm text-muted-foreground">{problem}</span>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              disabled={Boolean(problem)}
              onClick={() => {
                onSave({ models: patterns, providers });
                onOpenChange(false);
              }}
            >
              Save rule
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Provider interop rules: which providers may retry each other for which models.
 * Stored in the ProviderInteropRules system option; the backend validates on save.
 */
export default function ProviderInteropRulesSection() {
  const [rules, setRules] = useState<InteropRule[]>([]);
  const [savedRules, setSavedRules] = useState('[]');
  const [usage, setUsage] = useState<ProviderUsage[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [optionRes, usageRes] = await Promise.all([
        fetch('/api/option').then((res) => res.json()),
        fetch('/api/channel/providers').then((res) => res.json())
      ]);
      if (optionRes?.success && Array.isArray(optionRes.data)) {
        const option = optionRes.data.find(
          (item: { key: string }) => item.key === OPTION_KEY
        );
        const loaded = parseRules(option?.value);
        setRules(loaded);
        setSavedRules(JSON.stringify(loaded));
      } else {
        toast.error('Failed to load provider interop rules.');
      }
      if (usageRes?.success && Array.isArray(usageRes.data)) {
        setUsage(usageRes.data);
      }
    } catch {
      toast.error('Failed to load provider interop rules.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dirty = JSON.stringify(rules) !== savedRules;

  const handleSave = async () => {
    setSaving(true);
    try {
      const value = JSON.stringify(rules);
      const res = await fetch('/api/option', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: OPTION_KEY, value })
      });
      const result = await res.json();
      if (result?.success) {
        setSavedRules(value);
        toast.success('Saved.');
      } else {
        toast.error(result?.message || 'Save failed.');
      }
    } catch (e: unknown) {
      toast.error(
        'Save failed: ' + (e instanceof Error ? e.message : String(e))
      );
    } finally {
      setSaving(false);
    }
  };

  const move = (index: number, offset: number) =>
    setRules((prev) => {
      const target = index + offset;
      if (target < 0 || target >= prev.length) return prev;
      const next = prev.slice();
      const moved = next[index];
      next[index] = next[target];
      next[target] = moved;
      return next;
    });

  const handleSaveRule = (rule: InteropRule) =>
    setRules((prev) => {
      if (editingIndex === null) return prev.concat(rule);
      return prev.map((item, index) => (index === editingIndex ? rule : item));
    });

  return (
    <>
      <div className="space-y-4">
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="space-y-1 text-blue-700">
            <p>
              When the first channel of a request has a provider listed in a
              rule that matches the model, a failed attempt can be retried on
              channels of the other providers in that rule. Without a matching
              rule, retries stay on the first channel&apos;s provider.
            </p>
            <p>
              Only list providers that are truly interchangeable for those
              models, such as Claude on Anthropic, Vertex AI and AWS. Do not
              combine OpenAI with Azure, or Google AI Studio with Vertex AI for
              Gemini. Requests that continue Responses history and channels
              without a provider are not affected.
            </p>
            <p>
              Rules are checked from top to bottom; the first one that matches
              the model and contains the provider applies.
            </p>
          </AlertDescription>
        </Alert>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingIndex(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add rule
          </Button>
          <div className="flex items-center gap-2">
            {dirty && (
              <span className="text-sm text-muted-foreground">
                Unsaved changes
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={load}
              disabled={loading || saving}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !dirty}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save rules'}
            </Button>
          </div>
        </div>

        {rules.length === 0 ? (
          <p className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            No rules. Retries stay on the provider of the first channel.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Model regex</TableHead>
                <TableHead>Providers</TableHead>
                <TableHead className="w-40 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule, index) => (
                <TableRow key={index}>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {rule.models.map((pattern) => (
                        <code
                          key={pattern}
                          className="rounded bg-muted px-1.5 py-0.5 text-xs"
                        >
                          {pattern}
                        </code>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {rule.providers.map((name) => {
                        const entry = usage.find(
                          (item) => item.provider === name
                        );
                        const idle = !entry || entry.enabled_count === 0;
                        return (
                          <Badge
                            key={name}
                            variant={idle ? 'outline' : 'secondary'}
                            className="gap-1 font-normal"
                          >
                            <span className="font-mono">{name}</span>
                            <span
                              className={
                                idle
                                  ? 'text-destructive'
                                  : 'text-muted-foreground'
                              }
                            >
                              {usageHint(entry)}
                            </span>
                          </Badge>
                        );
                      })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => move(index, -1)}
                        disabled={index === 0}
                        aria-label={`Move rule ${index + 1} up`}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => move(index, 1)}
                        disabled={index === rules.length - 1}
                        aria-label={`Move rule ${index + 1} down`}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditingIndex(index);
                          setDialogOpen(true);
                        }}
                        aria-label={`Edit rule ${index + 1}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() =>
                          setRules((prev) => prev.filter((_, i) => i !== index))
                        }
                        aria-label={`Delete rule ${index + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <RuleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        rule={editingIndex === null ? null : rules[editingIndex] ?? null}
        usage={usage}
        onSave={handleSaveRule}
      />
    </>
  );
}
