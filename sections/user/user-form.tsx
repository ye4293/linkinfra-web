'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserSelf } from '@/lib/types/user';
import { renderQuota } from '@/utils/render';
import { toast } from 'sonner';
import {
  ArrowLeft,
  BadgeDollarSign,
  Gift,
  Link2,
  Plus,
  Save,
  UserRound
} from 'lucide-react';
import ChannelRatiosEditor from './channel-ratios-editor';

function getQuotaPerUnit(): number {
  if (typeof window === 'undefined') return 500000;
  return parseFloat(localStorage.getItem('quota_per_unit') || '500000');
}

function quotaToDollars(quota: number): number {
  return quota / getQuotaPerUnit();
}

function dollarsToQuota(dollars: number): number {
  return Math.round(dollars * getQuotaPerUnit());
}

const formSchema = z.object({
  username: z.string().min(1, {
    message: 'Username is required.'
  }),
  display_name: z.string().optional(),
  password: z.string().optional(),
  group: z.string().optional(),
  quota: z.number().optional(),
  github_id: z.string().optional(),
  google_id: z.string().optional(),
  email: z.string().optional(),
  channel_ratios: z.record(z.string(), z.number()).optional()
});

type FormValues = z.infer<typeof formSchema>;

interface ParamsOption extends Partial<UserSelf> {
  group?: string;
  quota?: number;
  password?: string;
  github_id?: string;
  google_id?: string;
  email?: string;
  channel_ratios?: string;
}

function parseChannelRatios(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'string') return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(parsed)) {
      const num = Number(v);
      if (Number.isFinite(num) && num > 0) out[k] = num;
    }
    return out;
  } catch {
    return {};
  }
}

function serializeChannelRatios(
  map: Record<string, number> | undefined
): string {
  if (!map) return '';
  const cleaned: Record<string, number> = {};
  for (const [k, v] of Object.entries(map)) {
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
      cleaned[k] = v;
    }
  }
  if (Object.keys(cleaned).length === 0) return '';
  return JSON.stringify(cleaned);
}

export default function UserForm() {
  const router = useRouter();
  const { userId } = useParams();
  const isCreate = !userId || userId === 'create';

  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<UserSelf | null>(null);
  const [groupOptions, setGroupOptions] = useState<string[]>([]);

  const [dollarDisplay, setDollarDisplay] = useState('0');
  const [adjustAmount, setAdjustAmount] = useState('');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      display_name: '',
      password: '',
      group: '',
      quota: 0,
      github_id: '',
      google_id: '',
      email: '',
      channel_ratios: {}
    }
  });

  useEffect(() => {
    setIsLoading(true);

    const getUserDetail = async () => {
      if (isCreate) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/user/${userId}`, {
          credentials: 'include'
        });
        const { data } = await res.json();
        setUserData(data);

        if (data) {
          const formData: FormValues = {
            username: data.username || '',
            display_name: data.display_name || '',
            password: '',
            group: data.group || '',
            quota: data.quota || 0,
            github_id: data.github_id || '',
            google_id: data.google_id || '',
            email: data.email || '',
            channel_ratios: parseChannelRatios(data.channel_ratios)
          };
          form.reset(formData, {
            keepDefaultValues: false
          });
          setDollarDisplay(quotaToDollars(data.quota || 0).toFixed(2));
        }
      } catch (error) {
        console.error('Error loading user:', error);
      }
    };

    const searchGroup = async () => {
      try {
        const res = await fetch(`/api/group`, {
          credentials: 'include'
        });
        const { data } = await res.json();
        setGroupOptions(data || []);
      } catch (error) {
        console.error('Error loading groups:', error);
      }
    };

    Promise.all([getUserDetail(), searchGroup()]).finally(() => {
      setIsLoading(false);
    });
  }, [userId, isCreate, form]);

  if (isLoading && !isCreate) {
    return (
      <Card className="mx-auto w-full">
        <CardHeader>
          <CardTitle className="text-left text-2xl font-bold">
            <Skeleton className="h-8 w-48" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
          <div className="flex gap-4">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleAdjustBalance = () => {
    const amount = parseFloat(adjustAmount);
    if (isNaN(amount) || amount === 0) {
      toast.error('Enter a valid adjustment amount.');
      return;
    }

    const currentDollars = parseFloat(dollarDisplay) || 0;
    const newDollars = currentDollars + amount;
    if (newDollars < 0) {
      toast.error('Balance cannot go below zero.');
      return;
    }

    const newQuota = dollarsToQuota(newDollars);
    form.setValue('quota', newQuota);
    setDollarDisplay(newDollars.toFixed(2));
    setAdjustAmount('');
    toast.success(
      `Balance adjusted ${amount >= 0 ? '+' : ''}$${amount.toFixed(
        2
      )} → now $${newDollars.toFixed(2)}`
    );
  };

  async function onSubmit(values: FormValues) {
    const params: ParamsOption = {
      ...userData,
      ...values,
      channel_ratios: serializeChannelRatios(values.channel_ratios)
    };
    if (!params.password) delete params.password;
    if (isCreate) {
      delete params.group;
      delete params.quota;
      delete params.github_id;
      delete params.google_id;
      delete params.email;
      delete params.channel_ratios;
    }
    const res = await fetch(`/api/user`, {
      method: params.id ? 'PUT' : 'POST',
      body: JSON.stringify(params),
      credentials: 'include'
    });
    const { success, message } = await res.json();
    if (success) {
      router.push('/dashboard/user');
      router.refresh();
    } else {
      toast.error(message);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-7xl overflow-hidden border-border/70 shadow-sm">
      <CardHeader className="border-b bg-muted/20 px-4 py-5 sm:px-6 lg:px-8">
        <CardTitle className="text-left text-xl font-semibold tracking-tight sm:text-2xl">
          User Information
        </CardTitle>
        <CardDescription>
          Manage account details, balance, access tier, and channel-specific
          pricing.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Tabs defaultValue="basic" className="w-full">
              <TabsList
                className={
                  isCreate
                    ? 'm-4 grid h-11 grid-cols-1 sm:mx-6 lg:mx-8'
                    : 'm-4 grid h-11 grid-cols-2 sm:mx-6 lg:mx-8 lg:max-w-lg'
                }
              >
                <TabsTrigger value="basic">Basic info</TabsTrigger>
                {!isCreate && (
                  <TabsTrigger value="discount">
                    Additional discount
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent
                value="basic"
                className="m-0 space-y-8 px-4 pb-7 pt-2 sm:px-6 lg:px-8"
              >
                <section className="space-y-4">
                  <div className="flex items-center gap-2">
                    <UserRound className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-semibold">Account details</h2>
                  </div>
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter your username"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="display_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter your display name"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Enter your password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {!isCreate && (
                      <FormField
                        control={form.control}
                        name="group"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Group</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value || ''}
                              disabled={isLoading}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a group" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {groupOptions.map((group) => (
                                  <SelectItem key={group} value={group}>
                                    {group}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </section>
                {!isCreate && (
                  <>
                    <Separator />
                    <section className="space-y-4">
                      <div className="flex items-center gap-2">
                        <BadgeDollarSign className="h-4 w-4 text-primary" />
                        <div>
                          <h2 className="text-sm font-semibold">Balance</h2>
                          <p className="text-xs text-muted-foreground">
                            Set the final balance or apply a relative
                            adjustment.
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="quota"
                          render={() => (
                            <FormItem>
                              <FormLabel>Balance (USD)</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                    $
                                  </span>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    className="pl-7"
                                    value={dollarDisplay}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setDollarDisplay(val);
                                      const dollars = parseFloat(val);
                                      if (!isNaN(dollars)) {
                                        form.setValue(
                                          'quota',
                                          dollarsToQuota(dollars)
                                        );
                                      }
                                    }}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            Adjust Balance
                          </label>
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <div className="relative flex-1">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                $
                              </span>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="+10 or -5"
                                className="pl-7"
                                value={adjustAmount}
                                onChange={(e) =>
                                  setAdjustAmount(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAdjustBalance();
                                  }
                                }}
                              />
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleAdjustBalance}
                              className="h-9 shrink-0"
                            >
                              <Plus className="mr-1 h-3.5 w-3.5" />
                              Apply
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Positive to add, negative to deduct.
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="rounded-lg border bg-muted/20 p-4">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <BadgeDollarSign className="h-4 w-4" />
                            Cumulative top-ups
                          </div>
                          <p className="mt-2 text-2xl font-semibold tabular-nums">
                            {renderQuota(userData?.topup_quota || 0)}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Real-money payments used for tier upgrades.
                          </p>
                        </div>
                        <div className="rounded-lg border bg-muted/20 p-4">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Gift className="h-4 w-4" />
                            Cumulative bonus
                          </div>
                          <p className="mt-2 text-2xl font-semibold tabular-nums">
                            {renderQuota(userData?.gift_quota || 0)}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Registration bonuses and referral rewards.
                          </p>
                        </div>
                      </div>
                    </section>

                    <Separator />

                    <section className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Link2 className="h-4 w-4 text-primary" />
                        <div>
                          <h2 className="text-sm font-semibold">
                            Linked identities
                          </h2>
                          <p className="text-xs text-muted-foreground">
                            These fields are managed by the user and cannot be
                            edited here.
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                        <FormField
                          control={form.control}
                          name="github_id"
                          disabled
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>GitHub ID</FormLabel>
                              <FormControl>
                                <Input placeholder="Read-only" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="google_id"
                          disabled
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Google ID</FormLabel>
                              <FormControl>
                                <Input placeholder="Read-only" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="email"
                          disabled
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input placeholder="Read-only" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </section>
                  </>
                )}
              </TabsContent>

              {!isCreate && (
                <TabsContent
                  value="discount"
                  className="m-0 px-4 pb-7 pt-2 sm:px-6 lg:px-8"
                >
                  <ChannelRatiosEditor control={form.control} />
                </TabsContent>
              )}
            </Tabs>

            <div className="sticky bottom-0 z-10 flex flex-col-reverse gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur sm:flex-row sm:justify-end sm:px-6 lg:px-8">
              <Button
                type="button"
                variant="outline"
                onClick={() => window.history.back()}
                className="sm:min-w-28"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
              <Button type="submit" className="sm:min-w-28">
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
