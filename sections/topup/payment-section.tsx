'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Info } from 'lucide-react';

const FIXED_AMOUNTS = [10, 20, 50, 100, 200, 500];

const extractApiErrorMessage = (result: any, fallback: string) => {
  if (typeof result?.message === 'string' && result.message) {
    return result.message;
  }
  if (typeof result?.details === 'string' && result.details) {
    return result.details;
  }
  if (typeof result?.error === 'string' && result.error) {
    return result.error;
  }
  if (typeof result?.error?.message === 'string' && result.error.message) {
    return result.error.message;
  }
  if (
    typeof result?.error?.error?.message === 'string' &&
    result.error.error.message
  ) {
    return result.error.error.message;
  }
  return fallback;
};

export default function PaymentSection() {
  const [amount, setAmount] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // StripePriceId 单价为 $1/unit，amount 即美金数量，直接展示无需后端预算。
  const payAmount = amount ? String(amount) : '';

  const handlePay = async () => {
    if (!amount || amount <= 0) {
      toast.error('Please select or enter a valid amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/user/stripe/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amount: Number(amount),
          payment_method: 'stripe',
          success_url: `${window.location.origin}/dashboard/log`,
          cancel_url: `${window.location.origin}/dashboard/topup`
        })
      });
      const result = await res.json().catch(() => null);
      if (res.ok && result?.success && result.data?.pay_link) {
        window.open(result.data.pay_link, '_blank');
      } else {
        toast.error(
          extractApiErrorMessage(result, 'Failed to create Stripe order.')
        );
      }
    } catch {
      toast.error('An error occurred while creating the Stripe order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Top up</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label>Amount</Label>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-3">
            {FIXED_AMOUNTS.map((val) => (
              <Button
                key={val}
                variant={amount === val ? 'default' : 'outline'}
                className="w-full"
                onClick={() => setAmount(val)}
              >
                {val}
              </Button>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Label className="w-32 whitespace-nowrap">Custom amount:</Label>
            <Input
              type="number"
              min="1"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) =>
                setAmount(e.target.value ? Number(e.target.value) : '')
              }
              className="flex-1"
            />
          </div>
          {!!amount && (
            <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
              <div className="mt-0 font-medium text-foreground">
                You pay: {payAmount ? `$${payAmount}` : '--'}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-start gap-2 rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            <span className="font-medium text-foreground">
              Stripe processing fee:
            </span>{' '}
            Stripe charges a processing fee for each top-up. This fee is
            deducted from your payment, and the remaining amount is credited to
            your balance.
          </p>
        </div>

        <Button
          className="w-full"
          size="lg"
          onClick={handlePay}
          disabled={isSubmitting}
        >
          {isSubmitting
            ? 'Processing...'
            : `Pay Now${payAmount ? ` ($${payAmount})` : ''}`}
        </Button>
      </CardContent>
    </Card>
  );
}
