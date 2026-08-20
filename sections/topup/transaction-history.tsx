'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface TopUpRecord {
  id: number;
  user_id: number;
  amount: number;
  money: number;
  trade_no: string;
  payment_method: string;
  /** Stripe uses the currency from the Checkout callback (supports USD/CNY etc.) */
  currency?: string;
  /** Extended JSON: manual_complete structure on admin completion, usually empty on payment callback */
  other?: string;
  create_time: number;
  complete_time: number;
  status: string;
  /** Stripe 收据链接，支付回调写入（charge.receipt_url） */
  receipt_url?: string;
}

const PAGE_SIZE = 10;

const statusConfig: Record<
  string,
  {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
  }
> = {
  success: { label: 'Paid', variant: 'default' },
  pending: { label: 'Pending', variant: 'secondary' },
  failed: { label: 'Failed', variant: 'destructive' },
  expired: { label: 'Expired', variant: 'outline' }
};

/** Currency badge — uses the currency from the API response; may be empty before Stripe payment completes */
function currencyBadge(record: TopUpRecord): string {
  const c = (record.currency || '').trim().toUpperCase();
  if (c) return c;
  if ((record.payment_method || '').toLowerCase() === 'stripe') {
    return '—';
  }
  return 'CNY';
}

function formatPayMoney(record: TopUpRecord): string {
  const c = (record.currency || '').trim().toUpperCase();
  const m = record.money;
  if (c === 'USD') return `$${m.toFixed(2)}`;
  if (c === 'CNY' || c === 'CNH') return `¥${m.toFixed(2)}`;
  if (c) return `${m.toFixed(2)} ${c}`;
  if ((record.payment_method || '').toLowerCase() === 'stripe') {
    return m.toFixed(2);
  }
  return `¥${m.toFixed(2)}`;
}

function paymentMethodLabel(method: string): string {
  const m = (method || '').toLowerCase();
  const map: Record<string, string> = {
    stripe: 'Stripe',
    alipay: 'Alipay',
    wxpay: 'WeChat Pay',
    qqpay: 'QQ Wallet'
  };
  return map[m] || method || '-';
}

/** Parse manual_complete JSON from other field, used for "Entry type" display */
function manualCompleteSummary(other?: string): string | null {
  const raw = (other || '').trim();
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as {
      source?: string;
      operator_user_id?: number;
      operator_username?: string;
      operator_display_name?: string;
    };
    if (o.source === 'manual_complete') {
      if (o.operator_display_name && o.operator_username) {
        return `Admin: ${o.operator_display_name} (${o.operator_username})`;
      }
      if (o.operator_username) {
        return `Admin: ${o.operator_username}`;
      }
      if (o.operator_display_name) {
        return `Admin: ${o.operator_display_name}`;
      }
      if (o.operator_user_id) {
        return `Admin: user #${o.operator_user_id}`;
      }
      return 'Admin (manual complete)';
    }
    return `Extended: ${raw.length > 80 ? `${raw.slice(0, 80)}…` : raw}`;
  } catch {
    return raw.length > 80 ? `${raw.slice(0, 80)}…` : raw;
  }
}

export default function TransactionHistory() {
  const { data: session } = useSession();
  const router = useRouter();
  const isAdmin = session?.user?.role !== undefined && session.user.role >= 10;

  const [records, setRecords] = useState<TopUpRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [tradeNoQuery, setTradeNoQuery] = useState('');
  const [completingId, setCompletingId] = useState<number | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        pagesize: String(PAGE_SIZE)
      });
      if (tradeNoQuery) {
        params.set('trade_no', tradeNoQuery);
      }
      const res = await fetch(`/api/user/topup/self?${params.toString()}`);
      const result = await res.json();
      if (!res.ok || !result?.success) {
        throw new Error(result?.message || 'Failed to load top-up history.');
      }
      setRecords(result?.data?.list || []);
      setTotal(result?.data?.total || 0);
    } catch (err) {
      console.error('Failed to fetch transaction history:', err);
      setError('Failed to load top-up history.');
    } finally {
      setLoading(false);
    }
  }, [page, tradeNoQuery]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleSearch = () => {
    setPage(1);
    setTradeNoQuery(searchInput.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setPage(1);
    setTradeNoQuery('');
  };

  const handleComplete = async (record: TopUpRecord) => {
    if (completingId !== null) return;
    setCompletingId(record.id);
    try {
      const res = await fetch('/api/user/topup/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trade_no: record.trade_no })
      });
      const result = await res.json();
      if (!res.ok || !result?.success) {
        throw new Error(result?.message || 'Order completion failed.');
      }
      toast.success('Order completed.');
      router.refresh();
      fetchRecords();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Order completion failed.'
      );
    } finally {
      setCompletingId(null);
    }
  };

  return (
    <Card className="mt-0">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg font-semibold">
            Top-up history
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by order ID..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-9 w-[200px] pl-8 text-sm"
              />
            </div>
            <Button size="sm" variant="outline" onClick={handleSearch}>
              Search
            </Button>
            {tradeNoQuery && (
              <Button size="sm" variant="ghost" onClick={handleClearSearch}>
                Clear
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        ) : error ? (
          <div className="py-4 text-center text-sm text-destructive">
            {error}
          </div>
        ) : records.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Credits</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Amount paid</TableHead>
                    <TableHead>Receipt</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Entry type</TableHead>
                    {isAdmin && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => {
                    const cfg = statusConfig[record.status] || {
                      label: record.status,
                      variant: 'outline' as const
                    };
                    const entrySummary = manualCompleteSummary(record.other);
                    return (
                      <TableRow key={record.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(
                            new Date(record.create_time * 1000),
                            'yyyy-MM-dd HH:mm'
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {record.trade_no}
                        </TableCell>
                        <TableCell className="font-medium">
                          {record.amount}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal">
                            {currencyBadge(record)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium tabular-nums">
                          {formatPayMoney(record)}
                        </TableCell>
                        <TableCell>
                          {record.receipt_url ? (
                            <a
                              href={record.receipt_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline"
                            >
                              View receipt
                            </a>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {paymentMethodLabel(record.payment_method)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={cfg.variant}>{cfg.label}</Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {record.complete_time
                            ? format(
                                new Date(record.complete_time * 1000),
                                'yyyy-MM-dd HH:mm'
                              )
                            : '-'}
                        </TableCell>
                        <TableCell
                          className="max-w-[260px] text-sm text-muted-foreground"
                          title={
                            record.other?.trim() ? record.other : undefined
                          }
                        >
                          {entrySummary
                            ? entrySummary
                            : record.status === 'success'
                            ? 'Payment callback'
                            : '-'}
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            {record.status === 'pending' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 gap-1 text-xs"
                                disabled={completingId === record.id}
                                onClick={() => handleComplete(record)}
                              >
                                {completingId === record.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <RotateCcw className="h-3 w-3" />
                                )}
                                Complete
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {total} records total
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            {tradeNoQuery
              ? 'No matching orders found.'
              : 'No top-up history yet.'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
