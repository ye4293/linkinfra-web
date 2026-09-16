'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale } from '@/components/providers/locale-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { RefreshCcw, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function DurationPricing({
  initialModels,
  onSaved
}: {
  initialModels: string[];
  onSaved: () => void;
}) {
  const { t } = useLocale();
  const p = t.durationPricing;
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [names, setNames] = useState(initialModels.join('\n'));
  const [price, setPrice] = useState('');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const loadVersion = useRef(0);

  const load = useCallback(async () => {
    const version = ++loadVersion.current;
    setLoading(true);
    try {
      const response = await fetch('/api/option', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success || !Array.isArray(result.data))
        throw new Error(p.loadFailed);
      const option = result.data.find(
        (entry: { key: string }) => entry.key === 'AudioDurationPrices'
      );
      if (!option) throw new Error(p.unsupported);
      const data = JSON.parse(option.value);
      if (
        !data ||
        typeof data !== 'object' ||
        Array.isArray(data) ||
        Object.entries(data).some(
          ([name, value]) =>
            !name.trim() ||
            name !== name.trim() ||
            typeof value !== 'number' ||
            !Number.isFinite(value) ||
            value < 0
        )
      ) {
        throw new Error(p.loadFailed);
      }
      if (version !== loadVersion.current) return null;
      setPrices(data);
      setError('');
      return data as Record<string, number>;
    } catch (err) {
      if (version !== loadVersion.current) return null;
      setError(err instanceof Error ? err.message : p.loadFailed);
      return null;
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }, [p.loadFailed, p.unsupported]);

  useEffect(() => {
    let active = true;
    setNames(initialModels.join('\n'));
    setPrice('');
    load().then((data) => {
      if (active && data && initialModels.length === 1) {
        setPrice(
          data[initialModels[0]] == null ? '' : String(data[initialModels[0]])
        );
      }
    });
    return () => {
      active = false;
      loadVersion.current++;
    };
  }, [initialModels, load]);

  const selectedNames = Array.from(
    new Set(
      names
        .split('\n')
        .map((name) => name.trim())
        .filter(Boolean)
    )
  );
  const busy = loading || saving;
  const save = async (remove: boolean) => {
    const amount = Number(price);
    if (
      !selectedNames.length ||
      (!remove && (!price.trim() || !Number.isFinite(amount) || amount < 0))
    ) {
      toast.error(p.invalid);
      return;
    }
    setSaving(true);
    try {
      const models = selectedNames.map((model_name) =>
        remove
          ? { model_name, remove_duration_price: true }
          : { model_name, duration_price_per_minute: amount }
      );
      const response = await fetch(
        models.length === 1 ? '/api/pricing/model' : '/api/pricing/batch',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(models.length === 1 ? models[0] : { models })
        }
      );
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.message || p.saveFailed);
      toast.success(p.saved);
      if (remove) setPrice('');
      await load();
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : p.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="space-y-4 rounded-xl border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h3 className="font-semibold">{p.title}</h3>
            <p className="text-sm text-muted-foreground">{p.description}</p>
          </div>
          <Button variant="outline" disabled={busy} onClick={() => load()}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            {p.refresh}
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="duration-models">{p.models}</Label>
            <Textarea
              id="duration-models"
              value={names}
              placeholder="whisper-1"
              disabled={busy || !!error}
              onChange={(event) => {
                const value = event.target.value;
                setNames(value);
                setPrice(
                  prices[value.trim()] == null
                    ? ''
                    : String(prices[value.trim()])
                );
              }}
            />
            <p className="text-xs text-muted-foreground">{p.modelsHint}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="duration-price">{p.price}</Label>
            <Input
              id="duration-price"
              type="number"
              min="0"
              step="any"
              value={price}
              placeholder="0.006"
              disabled={busy || !!error}
              onChange={(event) => setPrice(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">{p.priceHint}</p>
            <p className="text-xs text-muted-foreground">{p.example}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={busy || !!error || !selectedNames.length}
            onClick={() => save(false)}
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? p.saving : p.save} ({selectedNames.length})
          </Button>
          <Button
            variant="outline"
            disabled={
              busy ||
              !!error ||
              !selectedNames.length ||
              selectedNames.some((name) => prices[name] == null)
            }
            onClick={() => save(true)}
          >
            {p.remove}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{p.removeHint}</p>
      </section>
      <Input
        aria-label={p.search}
        placeholder={p.search}
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
        className="max-w-sm"
      />
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{p.model}</TableHead>
              <TableHead>{p.price}</TableHead>
              <TableHead>{p.billingType}</TableHead>
              <TableHead>{p.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(prices)
              .filter(([name]) =>
                name.toLowerCase().includes(keyword.toLowerCase())
              )
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([name, value]) => (
                <TableRow key={name}>
                  <TableCell className="font-mono text-xs">{name}</TableCell>
                  <TableCell>${value}</TableCell>
                  <TableCell>
                    <span className="rounded-full bg-violet-100 px-2 py-1 text-xs text-violet-800 dark:bg-violet-950 dark:text-violet-200">
                      {p.perDuration}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      disabled={busy}
                      onClick={() => {
                        setNames(name);
                        setPrice(String(value));
                      }}
                    >
                      {p.edit}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            {!Object.keys(prices).some((name) =>
              name.toLowerCase().includes(keyword.toLowerCase())
            ) && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground"
                >
                  {loading ? p.loading : error || p.empty}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
