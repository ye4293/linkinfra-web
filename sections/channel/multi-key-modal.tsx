'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Channel } from '@/lib/types/channel';
import request from '@/app/lib/clientFetch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Terminal,
  RefreshCw,
  Trash2,
  PlayCircle,
  PauseCircle,
  RotateCcw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import dayjs from 'dayjs';

// 辅助函数：解析并格式化禁用原因
const formatDisableReason = (reason: string) => {
  try {
    const parsed = JSON.parse(reason);
    if (parsed.error && parsed.error.message) {
      const message = parsed.error.message;
      const coreMessageMatch = message.match(/\[.*?\]\s*(.*)/);
      const cleanMessage = coreMessageMatch ? coreMessageMatch[1] : message;

      return {
        display:
          cleanMessage.length > 30
            ? `${cleanMessage.substring(0, 30)}...`
            : cleanMessage,
        tooltip: JSON.stringify(parsed, null, 2)
      };
    }
    if (parsed.message) {
      return {
        display:
          parsed.message.length > 30
            ? `${parsed.message.substring(0, 30)}...`
            : parsed.message,
        tooltip: JSON.stringify(parsed, null, 2)
      };
    }
  } catch (e) {
    return {
      display: reason.length > 30 ? `${reason.substring(0, 30)}...` : reason,
      tooltip: reason
    };
  }
  return {
    display: reason.length > 30 ? `${reason.substring(0, 30)}...` : reason,
    tooltip: reason
  };
};

interface KeyDetail {
  index: number;
  key: string;
  status: number;
  disable_reason: string;
  disable_time: number;
  disabled_model: string;
  usage: number;
  balance: number;
}

interface KeyStats {
  total: number;
  enabled: number;
  manually_disabled: number;
  auto_disabled: number;
}

interface MultiKeyManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: Channel | null;
}

const statusMap: {
  [key: number]: {
    text: string;
    variant: 'default' | 'destructive' | 'secondary' | 'outline';
  };
} = {
  1: { text: 'Enabled', variant: 'default' },
  2: { text: 'Disabled', variant: 'secondary' },
  3: { text: 'Auto-disabled', variant: 'destructive' }
};

const MultiKeyManagementModal: React.FC<MultiKeyManagementModalProps> = ({
  open,
  onOpenChange,
  channel
}) => {
  const [keyDetails, setKeyDetails] = useState<KeyDetail[]>([]);
  const [keyStats, setKeyStats] = useState<KeyStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [totalKeys, setTotalKeys] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [enableLoading, setEnableLoading] = useState(false);
  const [disableLoading, setDisableLoading] = useState(false);

  const fetchKeyStats = useCallback(async () => {
    if (!channel) return;
    try {
      const statsRes = await request.get(
        `/api/channel/${channel.id}/keys/stats`
      );
      if ((statsRes as any).success) {
        setKeyStats((statsRes as any).data);
      } else {
        throw new Error(
          (statsRes as any).message || 'Failed to load key stats.'
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load key stats.'
      );
    }
  }, [channel]);

  const fetchKeyDetails = useCallback(async () => {
    if (!channel) return;
    setIsLoading(true);
    setError(null);
    try {
      const detailsRes = await request.get(
        `/api/channel/${channel.id}/keys/details`,
        {
          params: {
            page: pagination.pageIndex + 1,
            page_size: pagination.pageSize,
            status: statusFilter === 'all' ? undefined : statusFilter
          }
        }
      );
      if ((detailsRes as any).success) {
        setKeyDetails((detailsRes as any).data.keys || []);
        setTotalKeys((detailsRes as any).data.total_count || 0);
      } else {
        throw new Error(
          (detailsRes as any).message || 'Failed to load key details.'
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error.');
    } finally {
      setIsLoading(false);
    }
  }, [channel, pagination, statusFilter]);

  const fetchKeyData = useCallback(async () => {
    await Promise.all([fetchKeyStats(), fetchKeyDetails()]);
  }, [fetchKeyStats, fetchKeyDetails]);

  useEffect(() => {
    if (open && channel) {
      fetchKeyData();
    }
  }, [open, channel, fetchKeyData]);

  useEffect(() => {
    if (open && channel && keyStats) {
      fetchKeyDetails();
    }
  }, [pagination, statusFilter, open, channel, keyStats, fetchKeyDetails]);

  const handleToggleKeyStatus = async (
    keyIndex: number,
    currentStatus: number
  ) => {
    if (!channel) return;
    const newStatus = currentStatus === 1 ? 2 : 1;
    try {
      const res = await request.post('/api/channel/keys/toggle', {
        channel_id: channel.id,
        key_index: keyIndex,
        enabled: newStatus === 1
      });
      if ((res as any).success) {
        fetchKeyData();
      } else {
        throw new Error((res as any).message);
      }
    } catch (err) {
      alert(
        `Operation failed: ${
          err instanceof Error ? err.message : 'Unknown error.'
        }`
      );
    }
  };

  const handleBatchToggle = async (status: number) => {
    const isEnabling = status === 1;
    const setLoading = isEnabling ? setEnableLoading : setDisableLoading;
    if (!channel) return;
    if ((isEnabling && enableLoading) || (!isEnabling && disableLoading))
      return;

    setLoading(true);
    try {
      let allKeys: KeyDetail[] = [];
      let currentPage = 1;
      const pageSize = 100;
      let hasMoreData = true;

      while (hasMoreData) {
        const allKeysRes = await request.get(
          `/api/channel/${channel.id}/keys/details`,
          {
            params: {
              page: currentPage,
              page_size: pageSize
            }
          }
        );

        if (!(allKeysRes as any).success) {
          throw new Error(
            (allKeysRes as any).message || 'Failed to load key list.'
          );
        }

        const pageKeys = (allKeysRes as any).data.keys || [];
        const totalCount = (allKeysRes as any).data.total_count || 0;

        allKeys.push(...pageKeys);

        if (allKeys.length >= totalCount || pageKeys.length < pageSize) {
          hasMoreData = false;
        } else {
          currentPage++;
        }
      }

      if (allKeys.length === 0) {
        alert('No keys found.');
        return;
      }

      const keyIndices = allKeys.map((key: KeyDetail) => key.index);

      const res = await request.post('/api/channel/keys/batch-toggle', {
        channel_id: channel.id,
        key_indices: keyIndices,
        enabled: status === 1
      });

      if ((res as any).success) {
        fetchKeyData();
      } else {
        throw new Error((res as any).message);
      }
    } catch (err) {
      alert(
        `Operation failed: ${
          err instanceof Error ? err.message : 'Unknown error.'
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDisabledKeys = async () => {
    if (!channel) return;
    if (!confirm('Delete all disabled keys? This cannot be undone.')) return;
    try {
      const res = await request.post(`/api/channel/keys/delete-disabled`, {
        id: channel.id
      });
      if ((res as any).success) {
        fetchKeyData();
      } else {
        throw new Error((res as any).message);
      }
    } catch (err) {
      alert(
        `Operation failed: ${
          err instanceof Error ? err.message : 'Unknown error.'
        }`
      );
    }
  };

  const handleFixKeyStatus = async () => {
    if (!channel) return;
    if (
      !confirm(
        'Fix key statuses? This will set all keys without a status to Enabled.'
      )
    )
      return;
    try {
      const res = await request.post(`/api/channel/keys/fix-status`, {
        id: channel.id
      });
      if ((res as any).success) {
        fetchKeyData();
        window.location.reload();
      } else {
        throw new Error((res as any).message);
      }
    } catch (err) {
      alert(
        `Fix failed: ${err instanceof Error ? err.message : 'Unknown error.'}`
      );
    }
  };

  if (!channel) return null;

  const pageCount = Math.ceil(totalKeys / pagination.pageSize);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-full flex-col gap-0 p-0 sm:h-[800px] sm:max-h-[90vh] sm:max-w-4xl">
        <DialogHeader className="flex-shrink-0 border-b bg-muted/20 px-6 py-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-lg font-semibold">
                Multi-key management
              </DialogTitle>
              <Badge
                variant="outline"
                className="max-w-[200px] truncate font-mono font-normal"
              >
                {channel.name}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="text-xs font-normal">
                Total keys:{' '}
                {channel.multi_key_info?.key_selection_mode === 0
                  ? 'Round-robin'
                  : 'Random'}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {isLoading && !keyStats ? (
          <div className="flex flex-1 items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="flex-shrink-0 bg-muted/10 p-6 pb-2">
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <Terminal className="h-4 w-4" />
                  <AlertTitle>Failed to load</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {keyStats && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Card
                    status="Enabled"
                    count={keyStats.enabled}
                    total={keyStats.total}
                    color="text-green-600"
                    progressColor="bg-green-500"
                    borderColor="border-border/50"
                  />
                  <Card
                    status="Disabled"
                    count={keyStats.manually_disabled}
                    total={keyStats.total}
                    color="text-yellow-600"
                    progressColor="bg-yellow-500"
                    borderColor="border-border/50"
                  />
                  <Card
                    status="Auto-disabled"
                    count={keyStats.auto_disabled}
                    total={keyStats.total}
                    color="text-red-600"
                    progressColor="bg-red-500"
                    borderColor="border-border/50"
                  />
                </div>
              )}
            </div>

            <div className="flex flex-shrink-0 flex-col gap-4 border-y bg-muted/30 px-4 py-3 sm:px-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Select
                    value={statusFilter}
                    onValueChange={(value) => {
                      setStatusFilter(value);
                      setPagination({ ...pagination, pageIndex: 0 });
                    }}
                  >
                    <SelectTrigger className="h-9 w-full bg-background sm:w-[140px]">
                      <SelectValue placeholder="Filter status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="1">Enabled</SelectItem>
                      <SelectItem value="2">Disabled</SelectItem>
                      <SelectItem value="3">Auto-disabled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={fetchKeyDetails}
                    size="sm"
                    variant="ghost"
                    className="h-9 w-9 p-0"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
                    />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => handleBatchToggle(1)}
                          size="sm"
                          variant="outline"
                          className="h-9 w-full sm:w-auto"
                          disabled={enableLoading}
                        >
                          <PlayCircle className="mr-2 h-3.5 w-3.5 text-green-600" />
                          {enableLoading ? 'Enabling...' : 'Enable all'}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Enable all keys</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => handleBatchToggle(2)}
                          size="sm"
                          variant="outline"
                          className="h-9 w-full sm:w-auto"
                          disabled={disableLoading}
                        >
                          <PauseCircle className="mr-2 h-3.5 w-3.5 text-yellow-600" />
                          {disableLoading ? 'Disabling...' : 'Disable all'}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Disable all keys</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={handleDeleteDisabledKeys}
                          size="sm"
                          variant="outline"
                          className="h-9 w-full sm:w-auto"
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5 text-red-600" />
                          Delete disabled
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete all disabled keys</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={handleFixKeyStatus}
                          size="sm"
                          variant="outline"
                          className="h-9 w-full sm:w-auto"
                        >
                          <RotateCcw className="mr-2 h-3.5 w-3.5" />
                          Fix statuses
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Set initial status for keys without one.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                  <TableRow className="border-b border-border/50 hover:bg-transparent">
                    <TableHead className="min-w-[150px] bg-transparent">
                      Key
                    </TableHead>
                    <TableHead className="w-[80px] bg-transparent text-center">
                      Status
                    </TableHead>
                    <TableHead className="hidden min-w-[200px] bg-transparent sm:table-cell">
                      Disable reason
                    </TableHead>
                    <TableHead className="hidden w-[160px] bg-transparent md:table-cell">
                      Disabled at
                    </TableHead>
                    <TableHead className="w-[80px] bg-transparent text-right">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keyDetails.length > 0 ? (
                    keyDetails.map((key) => (
                      <TableRow
                        key={key.index}
                        className="border-b border-border/50 hover:bg-muted/30"
                      >
                        <TableCell>
                          <code className="break-all rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
                            {key.key.substring(0, 6)}...
                            {key.key.substring(key.key.length - 4)}
                          </code>
                          {/* 移动端显示的额外信息 */}
                          <div className="mt-1 space-y-1 sm:hidden">
                            {key.disable_reason && (
                              <div className="max-w-[150px] truncate text-xs text-red-500">
                                {
                                  formatDisableReason(key.disable_reason)
                                    .display
                                }
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={`whitespace-nowrap font-normal ${
                              key.status === 1
                                ? 'border-green-200 bg-green-50 text-green-700'
                                : key.status === 2
                                ? 'border-yellow-200 bg-yellow-50 text-yellow-700'
                                : 'border-red-200 bg-red-50 text-red-700'
                            }`}
                          >
                            {statusMap[key.status]?.text || 'Unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {key.disable_reason ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="block max-w-[200px] cursor-help truncate text-sm text-muted-foreground decoration-dotted underline-offset-4 hover:underline md:max-w-[300px]">
                                    {
                                      formatDisableReason(key.disable_reason)
                                        .display
                                    }
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent
                                  className="max-w-md p-4"
                                  side="left"
                                >
                                  <div className="space-y-2">
                                    <div className="font-semibold">
                                      Disable details
                                    </div>
                                    <div className="text-xs">
                                      {key.disabled_model && (
                                        <div className="flex gap-2">
                                          <span className="text-muted-foreground">
                                            Model:
                                          </span>
                                          <span>{key.disabled_model}</span>
                                        </div>
                                      )}
                                      {key.disable_time && (
                                        <div className="flex gap-2">
                                          <span className="text-muted-foreground">
                                            Time:
                                          </span>
                                          <span>
                                            {dayjs
                                              .unix(key.disable_time)
                                              .format('YYYY-MM-DD HH:mm:ss')}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="whitespace-pre-wrap break-all rounded bg-muted p-2 font-mono text-xs">
                                      {
                                        formatDisableReason(key.disable_reason)
                                          .tooltip
                                      }
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                          {key.disable_time
                            ? dayjs
                                .unix(key.disable_time)
                                .format('YYYY-MM-DD HH:mm')
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant={key.status === 1 ? 'ghost' : 'outline'}
                            className={`h-7 px-2 text-xs sm:px-3 ${
                              key.status === 1
                                ? 'text-destructive hover:bg-destructive/10 hover:text-destructive'
                                : 'border-green-200 text-green-600 hover:bg-green-50 hover:text-green-700'
                            }`}
                            onClick={() =>
                              handleToggleKeyStatus(key.index, key.status)
                            }
                          >
                            {key.status === 1 ? 'Disable' : 'Enable'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No data.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex-shrink-0 border-t bg-background px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex items-center justify-between">
                <div className="hidden text-sm text-muted-foreground sm:block">
                  {totalKeys} records total
                </div>
                <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() =>
                      setPagination((p) => ({
                        ...p,
                        pageIndex: p.pageIndex - 1
                      }))
                    }
                    disabled={pagination.pageIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="min-w-[3rem] text-center text-sm font-medium">
                    {pagination.pageIndex + 1} / {Math.max(1, pageCount)}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() =>
                      setPagination((p) => ({
                        ...p,
                        pageIndex: p.pageIndex + 1
                      }))
                    }
                    disabled={pagination.pageIndex + 1 >= pageCount}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

const Card = ({
  status,
  count,
  total,
  color,
  progressColor,
  borderColor
}: {
  status: string;
  count: number;
  total: number;
  color: string;
  progressColor: string;
  borderColor: string;
}) => {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className={`rounded-lg border bg-card p-4 shadow-sm ${borderColor}`}>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">{status}</h3>
        <span className={`text-2xl font-bold ${color}`}>
          {count}{' '}
          <span className="text-sm font-normal text-muted-foreground">
            / {total}
          </span>
        </span>
      </div>
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full w-full flex-1 transition-all ${progressColor}`}
          style={{ transform: `translateX(-${100 - (percentage || 0)}%)` }}
        />
      </div>
      <div className="mt-1 text-right text-xs text-muted-foreground">
        {percentage.toFixed(1)}%
      </div>
    </div>
  );
};

export default MultiKeyManagementModal;
