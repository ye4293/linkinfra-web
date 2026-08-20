'use client';

import { useEffect, useMemo, useState } from 'react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import PageContainer from '@/components/layout/page-container';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { toast } from 'sonner';
import { CreditCard, KeyRound, Save, ShieldCheck } from 'lucide-react';

const breadcrumbItems = [
  { title: 'Dashboard', link: '/dashboard' },
  { title: 'Settings', link: '/dashboard/setting' },
  { title: 'Payment settings', link: '/dashboard/setting/payment' }
];

interface Option {
  key: string;
  value: unknown;
}

const getOptionValue = (options: Option[], key: string) => {
  const option = options.find((item) => item.key === key);
  return option?.value;
};

const toBool = (val: unknown) => val === 'true' || val === true;

export default function PaymentSettingPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ---- Stripe state ----
  const [stripePaymentEnabled, setStripePaymentEnabled] = useState(false);
  const [stripeApiSecret, setStripeApiSecret] = useState('');
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState('');
  const [stripePriceId, setStripePriceId] = useState('');
  const [stripeMinTopUp, setStripeMinTopUp] = useState('1');
  const [stripePromotionCodesEnabled, setStripePromotionCodesEnabled] =
    useState(false);

  const isStripeConfigured = useMemo(() => {
    return Boolean(stripePriceId);
  }, [stripePriceId]);

  const fetchOptions = async () => {
    try {
      setIsDataLoading(true);
      setError(null);
      const response = await fetch('/api/option');
      if (!response.ok) {
        throw new Error('Failed to fetch options');
      }
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        const options = result.data as Option[];

        // Stripe
        setStripePaymentEnabled(
          toBool(getOptionValue(options, 'StripePaymentEnabled'))
        );
        setStripePriceId(
          String(getOptionValue(options, 'StripePriceId') || '')
        );
        setStripeMinTopUp(
          String(getOptionValue(options, 'StripeMinTopUp') || '1')
        );
        setStripePromotionCodesEnabled(
          toBool(getOptionValue(options, 'StripePromotionCodesEnabled'))
        );
        setStripeApiSecret('');
        setStripeWebhookSecret('');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load payment settings'
      );
    } finally {
      setIsDataLoading(false);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  const saveOption = async (key: string, value: string) => {
    const response = await fetch('/api/option', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ key, value })
    });

    if (!response.ok) {
      throw new Error(`Failed to save ${key}`);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const optionsToSave = [
        // Stripe
        {
          key: 'StripePaymentEnabled',
          value: stripePaymentEnabled.toString()
        },
        { key: 'StripePriceId', value: stripePriceId.trim() },
        { key: 'StripeMinTopUp', value: stripeMinTopUp.trim() || '1' },
        {
          key: 'StripePromotionCodesEnabled',
          value: stripePromotionCodesEnabled.toString()
        }
      ];

      for (const option of optionsToSave) {
        await saveOption(option.key, option.value);
      }

      if (stripeApiSecret.trim()) {
        await saveOption('StripeApiSecret', stripeApiSecret.trim());
      }
      if (stripeWebhookSecret.trim()) {
        await saveOption('StripeWebhookSecret', stripeWebhookSecret.trim());
      }

      toast.success('Payment settings saved.');
      setStripeApiSecret('');
      setStripeWebhookSecret('');
      await fetchOptions();
    } catch (saveError) {
      console.error('Save payment setting error:', saveError);
      toast.error('Failed to save payment settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <div className="p-4 text-red-500">
        Failed to load payment settings: {error}
      </div>
    );
  }

  if (isDataLoading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <PageContainer scrollable>
      <div className="space-y-6">
        <Breadcrumbs items={breadcrumbItems} />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Payment settings
            </h2>
            <p className="text-sm text-muted-foreground">
              Configure Stripe payment settings.
            </p>
          </div>
          <Button onClick={handleSave} disabled={isLoading}>
            <Save className="mr-2 h-4 w-4" />
            {isLoading ? 'Saving...' : 'Save settings'}
          </Button>
        </div>

        <Separator />

        {/* ==================== Stripe ==================== */}
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Stripe toggle
              </CardTitle>
              <CardDescription>
                When enabled, the frontend top-up page will support online
                payment via Stripe Checkout.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <Label
                    htmlFor="stripe-enabled"
                    className="text-base font-medium"
                  >
                    Enable Stripe payments
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Status: {stripePaymentEnabled ? 'Enabled' : 'Disabled'}
                    {isStripeConfigured
                      ? ', Price ID configured'
                      : ', Price ID not configured'}
                  </p>
                </div>
                <Switch
                  id="stripe-enabled"
                  checked={stripePaymentEnabled}
                  onCheckedChange={setStripePaymentEnabled}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Stripe keys
              </CardTitle>
              <CardDescription>
                Enter your Stripe API Secret Key and Webhook Signing Secret.
                These are sensitive and will not be displayed after saving.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="stripe-api-secret">API Secret Key</Label>
                  <Input
                    id="stripe-api-secret"
                    type="password"
                    value={stripeApiSecret}
                    onChange={(e) => setStripeApiSecret(e.target.value)}
                    placeholder="sk_live_... or sk_test_..."
                    autoComplete="new-password"
                  />
                  <p className="text-xs text-muted-foreground">
                    Starts with sk_live_ or sk_test_. Only updated when a new
                    value is entered.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stripe-webhook-secret">
                    Webhook Signing Secret
                  </Label>
                  <Input
                    id="stripe-webhook-secret"
                    type="password"
                    value={stripeWebhookSecret}
                    onChange={(e) => setStripeWebhookSecret(e.target.value)}
                    placeholder="whsec_..."
                    autoComplete="new-password"
                  />
                  <p className="text-xs text-muted-foreground">
                    Starts with whsec_. Used to verify Stripe webhook
                    signatures.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Stripe top-up rules
              </CardTitle>
              <CardDescription>
                Configure the Stripe Price ID, unit price, minimum top-up
                amount, and whether to allow promo codes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="stripe-price-id">Stripe Price ID</Label>
                  <Input
                    id="stripe-price-id"
                    value={stripePriceId}
                    onChange={(e) => setStripePriceId(e.target.value)}
                    placeholder="price_..."
                  />
                  <p className="text-xs text-muted-foreground">
                    The price ID obtained after creating a Product → Price in
                    the Stripe Dashboard.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stripe-min-topup">Minimum top-up</Label>
                  <Input
                    id="stripe-min-topup"
                    type="number"
                    min="1"
                    step="1"
                    value={stripeMinTopUp}
                    onChange={(e) => setStripeMinTopUp(e.target.value)}
                    placeholder="e.g. 1"
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum quantity enforced on both the frontend and backend.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <Label
                    htmlFor="stripe-promo"
                    className="text-base font-medium"
                  >
                    Allow promo codes
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    When enabled, users can enter a promotion code at checkout.
                  </p>
                </div>
                <Switch
                  id="stripe-promo"
                  checked={stripePromotionCodesEnabled}
                  onCheckedChange={setStripePromotionCodesEnabled}
                />
              </div>

              <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">
                  Configuration notes
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  <li>
                    It is recommended to fill in the API Secret Key, Webhook
                    Secret, and Price ID before enabling Stripe.
                  </li>
                  <li>
                    Configure the webhook callback URL in the Stripe Dashboard
                    as
                    <code className="mx-1 rounded bg-muted px-1 py-0.5">
                      {'https://<your-domain>/api/stripe/webhook'}
                    </code>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
