'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
import { Info, Plus, RefreshCw, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import request from '@/app/lib/clientFetch';

// ─── 类型定义 ─────────────────────────────────────────────────────────────────

interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
}

interface KeySource {
  Type: string; // "context_int" | "context_string" | "gjson"
  Key: string;
  Path: string;
}

interface AffinityRule {
  Name: string;
  ModelRegex: string[];
  PathRegex: string[];
  UserAgentInclude: string[];
  KeySources: KeySource[];
  ValueRegex: string;
  TTLSeconds: number;
  SkipRetryOnFailure: boolean;
  IncludeRuleName: boolean;
  IncludeModelName: boolean;
  IncludeUsingGroup: boolean;
}

interface AffinityConfig {
  Enabled: boolean;
  MaxSize: number;
  DefaultTTLSeconds: number;
  SwitchAffinityOnSuccess: boolean;
  Rules: AffinityRule[];
}

const DEFAULT_CONFIG: AffinityConfig = {
  Enabled: false,
  MaxSize: 100000,
  DefaultTTLSeconds: 3600,
  SwitchAffinityOnSuccess: false,
  Rules: []
};

// ─── 规则编辑弹窗 ─────────────────────────────────────────────────────────────

function RuleEditDialog({
  open,
  onOpenChange,
  rule,
  onSave
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rule: AffinityRule | null;
  onSave: (r: AffinityRule) => void;
}) {
  const [form, setForm] = useState<AffinityRule>(
    rule ?? {
      Name: '',
      ModelRegex: [],
      PathRegex: [],
      UserAgentInclude: [],
      KeySources: [{ Type: 'gjson', Key: '', Path: '' }],
      ValueRegex: '',
      TTLSeconds: 0,
      SkipRetryOnFailure: true,
      IncludeRuleName: true,
      IncludeModelName: false,
      IncludeUsingGroup: true
    }
  );

  useEffect(() => {
    setForm(
      rule ?? {
        Name: '',
        ModelRegex: [],
        PathRegex: [],
        UserAgentInclude: [],
        KeySources: [{ Type: 'gjson', Key: '', Path: '' }],
        ValueRegex: '',
        TTLSeconds: 0,
        SkipRetryOnFailure: true,
        IncludeRuleName: true,
        IncludeModelName: false,
        IncludeUsingGroup: true
      }
    );
  }, [rule, open]);

  const handle = (field: keyof AffinityRule, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rule ? 'Edit rule' : 'Add rule'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Rule name</Label>
              <Input
                value={form.Name}
                onChange={(e) => handle('Name', e.target.value)}
                placeholder="e.g. claude-cli"
              />
            </div>
            <div className="space-y-1">
              <Label>TTL (seconds, 0 = use global default)</Label>
              <Input
                type="number"
                value={form.TTLSeconds}
                onChange={(e) => handle('TTLSeconds', Number(e.target.value))}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Model regex (one per line)</Label>
            <Textarea
              rows={2}
              value={form.ModelRegex.join('\n')}
              onChange={(e) =>
                handle('ModelRegex', e.target.value.split('\n').filter(Boolean))
              }
              placeholder="^claude-"
            />
          </div>
          <div className="space-y-1">
            <Label>Path regex (one per line; leave blank for any path)</Label>
            <Textarea
              rows={2}
              value={form.PathRegex.join('\n')}
              onChange={(e) =>
                handle('PathRegex', e.target.value.split('\n').filter(Boolean))
              }
              placeholder="/v1/messages"
            />
          </div>
          <div className="space-y-1">
            <Label>
              Key source (only gjson is supported; Path e.g. metadata.user_id)
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Type</Label>
                <Input
                  value={form.KeySources[0]?.Type ?? 'gjson'}
                  onChange={(e) => {
                    const sources = [...form.KeySources];
                    sources[0] = { ...sources[0], Type: e.target.value };
                    handle('KeySources', sources);
                  }}
                  placeholder="gjson"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Path / Key
                </Label>
                <Input
                  value={
                    form.KeySources[0]?.Path || form.KeySources[0]?.Key || ''
                  }
                  onChange={(e) => {
                    const sources = [...form.KeySources];
                    const t = sources[0]?.Type ?? 'gjson';
                    sources[0] = {
                      ...sources[0],
                      Path: t === 'gjson' ? e.target.value : '',
                      Key: t !== 'gjson' ? e.target.value : ''
                    };
                    handle('KeySources', sources);
                  }}
                  placeholder="metadata.user_id"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                checked={form.SkipRetryOnFailure}
                onCheckedChange={(v) => handle('SkipRetryOnFailure', v)}
              />
              <Label>No retry on failure</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.IncludeRuleName}
                onCheckedChange={(v) => handle('IncludeRuleName', v)}
              />
              <Label>Include rule name in key</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.IncludeModelName}
                onCheckedChange={(v) => handle('IncludeModelName', v)}
              />
              <Label>Include model name in key</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.IncludeUsingGroup}
                onCheckedChange={(v) => handle('IncludeUsingGroup', v)}
              />
              <Label>Include group in key</Label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                onSave(form);
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

// ─── 主组件（内联，无弹框） ────────────────────────────────────────────────────

export default function AffinitySection() {
  const [config, setConfig] = useState<AffinityConfig>(DEFAULT_CONFIG);
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [cacheCount, setCacheCount] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AffinityRule | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      const res = (await request.get(
        '/api/affinity/config'
      )) as unknown as ApiResponse<AffinityConfig>;
      if (res?.success) {
        setConfig(res.data);
        setJsonText(JSON.stringify(res.data, null, 2));
      }
    } catch {
      toast.error('Failed to load affinity config.');
    }
  }, []);

  const fetchCacheStats = useCallback(async () => {
    try {
      const res = (await request.get(
        '/api/affinity/cache'
      )) as unknown as ApiResponse<{ count: number }>;
      if (res?.success) {
        setCacheCount(res.data?.count ?? 0);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchConfig();
    fetchCacheStats();
  }, [fetchConfig, fetchCacheStats]);

  const handleSave = async () => {
    setSaving(true);
    try {
      let cfg = config;
      if (jsonMode) {
        cfg = JSON.parse(jsonText);
      }
      const res = (await request.put(
        '/api/affinity/config',
        cfg
      )) as unknown as ApiResponse;
      if (res?.success) {
        toast.success('Saved.');
        setConfig(cfg);
      } else {
        toast.error(res?.message ?? 'Save failed.');
      }
    } catch (e: unknown) {
      toast.error(
        'Save failed: ' + (e instanceof Error ? e.message : String(e))
      );
    } finally {
      setSaving(false);
    }
  };

  const handleClearCache = async () => {
    setClearing(true);
    try {
      const res = (await request.delete(
        '/api/affinity/cache'
      )) as unknown as ApiResponse;
      if (res?.success) {
        toast.success(res?.message ?? 'Cache cleared.');
        setCacheCount(0);
      } else {
        toast.error(res?.message ?? 'Failed to clear cache.');
      }
    } catch {
      toast.error('Failed to clear cache.');
    } finally {
      setClearing(false);
    }
  };

  const handleSwitchToJson = () => {
    setJsonText(JSON.stringify(config, null, 2));
    setJsonMode(true);
  };

  const handleSwitchToVisual = () => {
    try {
      const cfg = JSON.parse(jsonText);
      setConfig(cfg);
      setJsonMode(false);
    } catch {
      toast.error('Invalid JSON — cannot switch to visual mode.');
    }
  };

  const handleAddRule = () => {
    setEditingRule(null);
    setEditingIndex(null);
    setRuleDialogOpen(true);
  };

  const handleEditRule = (rule: AffinityRule, index: number) => {
    setEditingRule(rule);
    setEditingIndex(index);
    setRuleDialogOpen(true);
  };

  const handleDeleteRule = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      Rules: prev.Rules.filter((_, i) => i !== index)
    }));
  };

  const handleSaveRule = (rule: AffinityRule) => {
    setConfig((prev) => {
      const rules = [...(prev.Rules ?? [])];
      if (editingIndex !== null) {
        rules[editingIndex] = rule;
      } else {
        rules.push(rule);
      }
      return { ...prev, Rules: rules };
    });
  };

  const formatKeySource = (sources: KeySource[]) => {
    if (!sources?.length) return '-';
    const s = sources[0];
    if (s.Type === 'gjson') return `gjson:${s.Path}`;
    return `${s.Type}:${s.Key}`;
  };

  return (
    <>
      <div className="space-y-6">
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700">
            Channel affinity prefers to reuse the last successful channel based
            on a key extracted from request context or the JSON body.
          </AlertDescription>
        </Alert>

        {!jsonMode ? (
          <div className="space-y-6">
            {/* 全局开关 + 参数 */}
            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-base font-semibold">Enable</Label>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={config.Enabled}
                    onCheckedChange={(v) =>
                      setConfig((prev) => ({ ...prev, Enabled: v }))
                    }
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  When enabled, the last successful channel will be preferred
                  (sticky routing).
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-base font-semibold">Max entries</Label>
                <Input
                  type="number"
                  value={config.MaxSize}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      MaxSize: Number(e.target.value)
                    }))
                  }
                  className="w-36"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum in-memory entries. 0 uses the backend default of
                  100,000.
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  Default TTL (seconds)
                </Label>
                <Input
                  type="number"
                  value={config.DefaultTTLSeconds}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      DefaultTTLSeconds: Number(e.target.value)
                    }))
                  }
                  className="w-36"
                />
                <p className="text-xs text-muted-foreground">
                  Used when a rule's ttl_seconds is 0. 0 uses the backend
                  default of 3,600 seconds.
                </p>
              </div>
            </div>

            {/* 成功后切换亲和 */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">
                Switch affinity on success
              </Label>
              <div className="flex items-center gap-2">
                <Switch
                  checked={config.SwitchAffinityOnSuccess}
                  onCheckedChange={(v) =>
                    setConfig((prev) => ({
                      ...prev,
                      SwitchAffinityOnSuccess: v
                    }))
                  }
                />
              </div>
              <p className="text-xs text-muted-foreground">
                If the affinity channel fails and a retry on another channel
                succeeds, update the affinity to the successful channel.
              </p>
            </div>

            {/* 工具栏 */}
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleSwitchToJson}>
                JSON mode
              </Button>
              <Button variant="outline" size="sm" onClick={handleAddRule}>
                <Plus className="mr-1 h-3 w-3" /> Add rule
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button variant="outline" size="sm" onClick={fetchCacheStats}>
                <RefreshCw className="mr-1 h-3 w-3" />
                Refresh cache stats
                <span className="ml-1 text-muted-foreground">
                  ({cacheCount})
                </span>
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleClearCache}
                disabled={clearing}
              >
                {clearing ? 'Clearing...' : 'Clear all cache'}
              </Button>
            </div>

            {/* 规则表格 */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Model regex</TableHead>
                    <TableHead>Path regex</TableHead>
                    <TableHead>Key source</TableHead>
                    <TableHead>TTL (s)</TableHead>
                    <TableHead>Retry on failure</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(config.Rules ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-8 text-center text-muted-foreground"
                      >
                        No rules configured. Click "Add rule" to create one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (config.Rules ?? []).map((rule, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">
                          {rule.Name}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {rule.ModelRegex?.map((r, i) => (
                              <Badge
                                key={i}
                                variant="secondary"
                                className="font-mono text-xs"
                              >
                                {r}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {rule.PathRegex?.length ? (
                              rule.PathRegex.map((r, i) => (
                                <Badge
                                  key={i}
                                  variant="outline"
                                  className="font-mono text-xs"
                                >
                                  {r}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {formatKeySource(rule.KeySources)}
                        </TableCell>
                        <TableCell>
                          {rule.TTLSeconds > 0 ? rule.TTLSeconds : '-'}
                        </TableCell>
                        <TableCell>
                          {rule.SkipRetryOnFailure ? (
                            <Badge variant="destructive" className="text-xs">
                              No retry
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              Retry
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleEditRule(rule, idx)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => handleDeleteRule(idx)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSwitchToVisual}
              >
                Visual mode
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
            <Textarea
              className="min-h-[400px] font-mono text-sm"
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
            />
          </div>
        )}
      </div>

      <RuleEditDialog
        open={ruleDialogOpen}
        onOpenChange={setRuleDialogOpen}
        rule={editingRule}
        onSave={handleSaveRule}
      />
    </>
  );
}
