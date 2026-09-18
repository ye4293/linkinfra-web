'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';

export function isValidModelDiscount(value: string) {
  const amount = Number(value);
  return (
    value.trim() !== '' && Number.isFinite(amount) && amount > 0 && amount <= 1
  );
}

export default function ModelDiscountInput({
  modelName,
  discount = 1,
  value,
  saving,
  onChange,
  onSave
}: {
  modelName: string;
  discount?: number;
  value: string;
  saving: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
}) {
  const amount = Number(value);
  const valid = isValidModelDiscount(value);
  const dirty = !valid || amount !== discount;

  return (
    <div className="min-w-[140px] space-y-1">
      <div className="flex items-center gap-1">
        <Input
          type="number"
          min={0}
          max={1}
          step="any"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label={`${modelName} 模型折扣`}
          aria-invalid={!valid}
          disabled={saving}
          className="h-8 w-20"
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              if (valid && dirty && !saving) onSave();
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
            onClick={onSave}
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
