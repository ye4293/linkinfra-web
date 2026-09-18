'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { toast } from 'sonner';

export default function ModelDiscountInput({
  modelName,
  discount = 1,
  onSaved
}: {
  modelName: string;
  discount?: number;
  onSaved: () => void;
}) {
  const [value, setValue] = useState(String(discount));
  const [saving, setSaving] = useState(false);
  useEffect(() => setValue(String(discount)), [discount, modelName]);
  const amount = Number(value);
  const valid =
    value.trim() !== '' && Number.isFinite(amount) && amount > 0 && amount <= 1;
  const dirty = !valid || amount !== discount;

  async function save() {
    if (!valid || saving) return;
    setSaving(true);
    try {
      const response = await fetch('/api/pricing/model', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_name: modelName, model_discount: amount })
      });
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.message || '保存失败');
      toast.success('模型折扣已保存');
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-w-[140px] space-y-1">
      <div className="flex items-center gap-1">
        <Input
          type="number"
          min={0}
          max={1}
          step="any"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-label={`${modelName} 模型折扣`}
          aria-invalid={!valid}
          disabled={saving}
          className="h-8 w-20"
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void save();
            }
          }}
        />
        {dirty && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            disabled={!valid || saving}
            onClick={save}
            aria-label="保存模型折扣"
          >
            <Save className="h-4 w-4" />
          </Button>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground">
        {!valid
          ? '请输入大于 0、不超过 1 的数值'
          : amount < 1
          ? `${Number(((1 - amount) * 100).toFixed(2))}% OFF`
          : '1.0 · 原价'}
      </p>
    </div>
  );
}
