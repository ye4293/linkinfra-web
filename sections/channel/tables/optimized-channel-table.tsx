'use client';

import React, { memo, useMemo, useCallback, useState, useEffect } from 'react';
import { DataTable } from '@/components/ui/table/data-table';
import { DataTableSingleSelectFilter } from '@/components/ui/table/data-table-single-select-filter';
import { DataTableResetFilter } from '@/components/ui/table/data-table-reset-filter';
import { DataTableSearch } from '@/components/ui/table/data-table-search';
import { createColumns, ChannelType } from './columns';
import { Channel } from '@/lib/types/channel';
import { useChannelData } from '../hooks/use-channel-data';
import { useTableFilters, STATUS_OPTIONS } from './use-table-filters';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Trash, Ban, CircleSlash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AlertModal } from '@/components/modal/alert-modal';
import { useRouter } from 'next/navigation';
import MultiKeyManagementModal from '../multi-key-modal';
import { useSession } from 'next-auth/react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ModelsModal } from './models-modal';
import { useLocale } from '@/components/providers/locale-provider';
import { Loader2 } from 'lucide-react';

interface OptimizedChannelTableProps {
  initialData?: Channel[];
  initialTotal?: number;
}

// 定义 Card View 组件，用于移动端展示
const MobileChannelCard = memo(
  ({
    channel,
    channelTypes,
    onManageKeys,
    onDataChange,
    onDelete
  }: {
    channel: Channel;
    channelTypes: ChannelType[];
    onManageKeys: (channel: Channel) => void;
    onDataChange: () => void;
    onDelete: (channel: Channel) => void;
  }) => {
    const router = useRouter();
    const [testLoading, setTestLoading] = useState(false);
    const [modelsModalOpen, setModelsModalOpen] = useState(false);
    const mobileActionButtonClass =
      'flex h-9 w-full items-center justify-center rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-50';
    const mobileDangerButtonClass =
      'flex h-10 w-full items-center justify-center rounded-lg bg-red-600 px-3 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50';

    // 获取状态文本和颜色
    const statusMap = {
      1: { text: 'Enabled', color: 'bg-green-100 text-green-800' },
      2: { text: 'Disabled', color: 'bg-gray-100 text-gray-800' },
      3: { text: 'Auto-disabled', color: 'bg-orange-100 text-orange-800' }
    };
    const currentStatus =
      statusMap[channel.status as keyof typeof statusMap] || statusMap[2];

    // 获取类型信息
    const channelTypeInfo = useMemo(() => {
      const typeValue = channel.type;
      const channelType = channelTypes.find((t) => t.value === typeValue);
      return channelType
        ? { text: channelType.text, color: channelType.color }
        : { text: `Unknown type (${typeValue})`, color: 'gray' };
    }, [channelTypes, channel.type]);

    // 处理状态切换
    const handleStatusChange = async (newStatus: number) => {
      try {
        const res = await fetch(`/api/channel/`, {
          method: 'PUT',
          body: JSON.stringify({ id: channel.id, status: newStatus }),
          credentials: 'include'
        });
        if (res.ok) {
          toast.success('Status updated.');
          onDataChange();
        } else {
          toast.error('Failed to update status.');
        }
      } catch (error) {
        toast.error('Failed to update status.');
      }
    };

    // 测试渠道
    const testChannel = async () => {
      setTestLoading(true);
      try {
        const res = await fetch(`/api/channel/test/${channel.id}`, {
          method: 'GET',
          credentials: 'include'
        });
        const { success, message, time } = await res.json();
        if (success) {
          toast.success(`Test passed in ${time.toFixed(2)}s.`);
          onDataChange();
        } else {
          toast.error(message || 'Test failed.');
        }
      } finally {
        setTestLoading(false);
      }
    };

    return (
      <Card className="mb-4 overflow-hidden">
        <CardContent className="p-4">
          <div className="mb-3 border-b pb-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="shrink-0 font-mono text-sm text-muted-foreground">
                ID: {channel.id}
              </span>
              <div className="truncate font-medium">{channel.name}</div>
            </div>
          </div>

          <div className="grid w-full grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Type</span>
              <Badge variant="secondary" className="w-fit font-normal">
                {channelTypeInfo.text}
              </Badge>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Group</span>
              <div className="w-fit rounded bg-muted px-2 py-1 font-mono text-xs">
                {channel.group || 'default'}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Status</span>
              <div className="flex items-center gap-2">
                <Switch
                  checked={channel.status === 1}
                  onCheckedChange={(checked) =>
                    handleStatusChange(checked ? 1 : 2)
                  }
                  className="origin-left scale-75"
                />
                <Badge
                  variant="outline"
                  className={`border-transparent ${currentStatus.color} px-1.5 py-0 text-xs`}
                >
                  {currentStatus.text}
                </Badge>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">
                Response time
              </span>
              <span
                className={`font-mono ${
                  !channel.response_time
                    ? 'text-gray-500'
                    : channel.response_time < 1000
                    ? 'text-green-600'
                    : channel.response_time < 3000
                    ? 'text-yellow-600'
                    : 'text-red-600'
                }`}
              >
                {channel.response_time
                  ? `${(channel.response_time / 1000).toFixed(2)}s`
                  : '—'}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">
                Used / Balance
              </span>
              <div className="font-mono text-xs">
                <div>${((channel.used_quota || 0) / 500000).toFixed(2)}</div>
                <div className="text-muted-foreground">
                  {channel.balance !== undefined
                    ? `$${channel.balance?.toFixed(2)}`
                    : '-'}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">
                Priority / Weight
              </span>
              <div className="font-mono">
                {channel.priority ?? 0} / {channel.weight ?? 0}
              </div>
            </div>
          </div>

          <div className="notranslate mt-4 border-t pt-4" translate="no">
            <div className="space-y-2" translate="no">
              <button
                type="button"
                className={mobileActionButtonClass}
                translate="no"
                onClick={testChannel}
                disabled={testLoading}
              >
                {testLoading ? 'Testing...' : 'Test'}
              </button>
              <button
                type="button"
                className={mobileActionButtonClass}
                translate="no"
                onClick={() => handleStatusChange(channel.status === 1 ? 2 : 1)}
              >
                {channel.status === 1 ? 'Disable' : 'Enable'}
              </button>
              <button
                type="button"
                className={mobileActionButtonClass}
                translate="no"
                onClick={() => router.push(`/dashboard/channel/${channel.id}`)}
              >
                Edit
              </button>
              <button
                type="button"
                className={mobileActionButtonClass}
                translate="no"
                onClick={() => setModelsModalOpen(true)}
              >
                View models
              </button>
              {channel.multi_key_info?.is_multi_key && (
                <button
                  type="button"
                  className={mobileActionButtonClass}
                  translate="no"
                  onClick={() => onManageKeys(channel)}
                >
                  Multi-key
                </button>
              )}
            </div>

            <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 p-2">
              <button
                type="button"
                className={mobileDangerButtonClass}
                translate="no"
                onClick={() => onDelete(channel)}
              >
                Delete channel
              </button>
              <p className="mt-1 text-center text-[11px] text-muted-foreground">
                Deleted channels cannot be recovered.
              </p>
            </div>
          </div>
        </CardContent>

        <ModelsModal
          channel={channel}
          isOpen={modelsModalOpen}
          onClose={() => setModelsModalOpen(false)}
        />
      </Card>
    );
  }
);
MobileChannelCard.displayName = 'MobileChannelCard';

const OptimizedChannelTable = memo(
  ({ initialData = [], initialTotal = 0 }: OptimizedChannelTableProps) => {
    const { t } = useLocale();
    const {
      searchQuery,
      statusFilter,
      typeFilter,
      page,
      pageSize,
      setPage,
      setPageSize,
      setSearchQuery,
      setStatusFilter,
      setTypeFilter,
      resetFilters,
      isAnyFilterActive
    } = useTableFilters();

    // 路由和session
    const router = useRouter();
    const { status } = useSession();

    // 渠道类型数据
    const [channelTypes, setChannelTypes] = useState<ChannelType[]>([]);

    // 批量操作状态
    const [selectedChannels, setSelectedChannels] = useState<Channel[]>([]);
    const [resetSelection, setResetSelection] = useState(false);
    const [open, setOpen] = useState(false);
    const [batchLoading, setBatchLoading] = useState(false);
    const [deleteChannel, setDeleteChannel] = useState<Channel | null>(null); // 单个删除确认

    // 多密钥管理Modal状态
    const [isMultiKeyModalOpen, setIsMultiKeyModalOpen] = useState(false);
    const [selectedChannelForModal, setSelectedChannelForModal] =
      useState<Channel | null>(null);

    // 获取渠道类型数据
    useEffect(() => {
      if (status === 'authenticated') {
        const fetchChannelTypes = async () => {
          try {
            const response = await fetch('/api/channel/types');
            if (!response.ok) {
              throw new Error(`API request failed: ${response.status}`);
            }
            const result = await response.json();
            if (result.object === 'list' && Array.isArray(result.data)) {
              setChannelTypes(result.data);
            } else {
              throw new Error('Unexpected API response format.');
            }
          } catch (error) {
            console.error('获取渠道类型失败:', error);
            setChannelTypes([]);
          }
        };
        fetchChannelTypes();
      }
    }, [status]);

    const {
      data: channels,
      total,
      typeCounts,
      loading,
      error,
      refetch
    } = useChannelData({
      page,
      pageSize,
      keyword: searchQuery,
      status: statusFilter,
      type: typeFilter
    });

    // 计算总数和可用的类型
    const totalAllChannels = useMemo(() => {
      return Object.values(typeCounts).reduce((sum, count) => sum + count, 0);
    }, [typeCounts]);

    // 只保留有渠道的类型
    const availableChannelTypes = useMemo(() => {
      return channelTypes.filter(
        (ct) => typeCounts[ct.value] && typeCounts[ct.value] > 0
      );
    }, [channelTypes, typeCounts]);

    // 检测刷新标记，从编辑/创建页面返回时自动刷新数据
    useEffect(() => {
      const refreshFlag = sessionStorage.getItem('channel_list_refresh');
      if (refreshFlag) {
        sessionStorage.removeItem('channel_list_refresh');
        refetch();
      }
    }, [refetch]);

    // 使用初始数据作为后备，避免首次加载闪烁
    const displayData = useMemo(() => {
      if (loading && channels.length === 0) {
        return initialData;
      }
      return channels;
    }, [channels, initialData, loading]);

    const displayTotal = useMemo(() => {
      if (loading && total === 0) {
        return initialTotal;
      }
      return total;
    }, [total, initialTotal, loading]);

    // 计算页面数量
    const pageCount = Math.ceil(displayTotal / pageSize);

    // 管理密钥的回调函数
    const handleManageKeys = useCallback((channel: Channel) => {
      setSelectedChannelForModal(channel);
      setIsMultiKeyModalOpen(true);
    }, []);

    // 单个删除
    const handleDeleteOne = async () => {
      if (!deleteChannel) return;
      setBatchLoading(true);
      try {
        const res = await fetch(`/api/channel/${deleteChannel.id}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          toast.success('Deleted.');
          refetch();
        } else {
          toast.error('Delete failed.');
        }
      } catch (error) {
        toast.error('Delete failed.');
      } finally {
        setOpen(false);
        setDeleteChannel(null);
        setBatchLoading(false);
      }
    };

    // 批量删除操作
    const handleDeleteBatch = async () => {
      setBatchLoading(true);
      const ids = selectedChannels.map((channel) => channel.id);
      try {
        const res = await fetch('/api/channel/batchdelete', {
          method: 'POST',
          body: JSON.stringify({ ids }),
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (res.ok) {
          toast.success('Deleted.');
          setResetSelection((prev) => !prev);
          refetch(); // use refetch instead of router.refresh
        } else {
          // improved error handling: check if response is JSON
          let errorMessage = 'Delete failed.';
          try {
            const errorData = await res.json();
            errorMessage =
              errorData.message || `Delete failed (HTTP ${res.status})`;
          } catch (jsonError) {
            // response is not JSON
            errorMessage = `Delete failed (HTTP ${res.status}: ${res.statusText})`;
          }
          throw new Error(errorMessage);
        }
      } catch (error) {
        console.error('批量删除错误:', error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        toast.error(errorMsg);
      } finally {
        setOpen(false);
        setBatchLoading(false);
      }
    };

    // 批量禁用操作
    const handleDisable = async () => {
      setBatchLoading(true);
      const ids = selectedChannels.map((channel) => channel.id);
      try {
        const res = await fetch('/api/channel/disabled', {
          method: 'POST',
          body: JSON.stringify({ ids }),
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (res.ok) {
          toast.success('Disabled.');
          setResetSelection((prev) => !prev);
          refetch(); // use refetch instead of router.refresh
        } else {
          // improved error handling: check if response is JSON
          let errorMessage = 'Disable failed.';
          try {
            const errorData = await res.json();
            errorMessage =
              errorData.message || `Disable failed (HTTP ${res.status})`;
          } catch (jsonError) {
            // response is not JSON
            errorMessage = `Disable failed (HTTP ${res.status}: ${res.statusText})`;
          }
          throw new Error(errorMessage);
        }
      } catch (error) {
        console.error('批量禁用错误:', error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        toast.error(errorMsg);
      } finally {
        setBatchLoading(false);
      }
    };

    // 批量启用操作
    const handleEnable = async () => {
      setBatchLoading(true);
      const ids = selectedChannels.map((channel) => channel.id);
      try {
        const res = await fetch('/api/channel/disabled', {
          method: 'DELETE',
          body: JSON.stringify({ ids }),
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (res.ok) {
          toast.success('Enabled.');
          setResetSelection((prev) => !prev);
          refetch(); // use refetch instead of router.refresh
        } else {
          // improved error handling: check if response is JSON
          let errorMessage = 'Enable failed.';
          try {
            const errorData = await res.json();
            errorMessage =
              errorData.message || `Enable failed (HTTP ${res.status})`;
          } catch (jsonError) {
            // response is not JSON
            errorMessage = `Enable failed (HTTP ${res.status}: ${res.statusText})`;
          }
          throw new Error(errorMessage);
        }
      } catch (error) {
        console.error('批量启用错误:', error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        toast.error(errorMsg);
      } finally {
        setBatchLoading(false);
      }
    };

    // 生成列配置
    const tableColumns = useMemo(() => {
      return createColumns({
        onManageKeys: handleManageKeys,
        onDataChange: refetch,
        channelTypes: channelTypes,
        t
      });
    }, [handleManageKeys, refetch, channelTypes, t]);

    // 错误处理
    if (error) {
      return (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-500">
              <p>Failed to load: {error}</p>
              <button
                onClick={refetch}
                className="mt-2 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
              >
                Retry
              </button>
            </div>
          </CardContent>
        </Card>
      );
    }

    // 加载状态
    if (loading && displayData.length === 0) {
      return (
        <div className="space-y-4">
          {/* Mobile Skeleton */}
          <div className="space-y-4 md:hidden">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 w-full rounded-lg" />
            ))}
          </div>
          {/* Desktop Skeleton */}
          <Card className="hidden md:block">
            <CardContent className="p-6">
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* 添加AlertModal用于删除确认 */}
        <AlertModal
          isOpen={open}
          onClose={() => {
            setOpen(false);
            setDeleteChannel(null);
          }}
          onConfirm={deleteChannel ? handleDeleteOne : handleDeleteBatch}
          loading={batchLoading}
        />

        {/* 渠道类型标签页 - 只显示有渠道的类型 */}
        <div className="overflow-x-auto">
          <div className="flex w-max gap-1.5 border-b border-border/50 pb-3">
            {/* 全部标签 */}
            <button
              onClick={() => {
                setTypeFilter('');
                setPage(1);
              }}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                !typeFilter
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              All
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs font-normal ${
                  !typeFilter
                    ? 'bg-primary-foreground/20'
                    : 'bg-muted-foreground/20'
                }`}
              >
                {totalAllChannels}
              </span>
            </button>

            {/* 只渲染有渠道的类型 */}
            {availableChannelTypes.map((channelType) => {
              const isActive = typeFilter === String(channelType.value);
              const count = typeCounts[channelType.value] || 0;
              const colorMap: { [key: string]: string } = {
                green: 'bg-green-500 hover:bg-green-600',
                blue: 'bg-blue-500 hover:bg-blue-600',
                orange: 'bg-orange-500 hover:bg-orange-600',
                black: 'bg-gray-800 hover:bg-gray-900',
                olive: 'bg-lime-600 hover:bg-lime-700',
                brown: 'bg-amber-700 hover:bg-amber-800',
                violet: 'bg-violet-500 hover:bg-violet-600',
                purple: 'bg-purple-500 hover:bg-purple-600',
                teal: 'bg-teal-500 hover:bg-teal-600',
                red: 'bg-red-500 hover:bg-red-600',
                pink: 'bg-pink-500 hover:bg-pink-600',
                yellow: 'bg-yellow-500 hover:bg-yellow-600',
                gray: 'bg-gray-400 hover:bg-gray-500'
              };
              const bgColor = colorMap[channelType.color] || colorMap.gray;

              return (
                <button
                  key={channelType.value}
                  onClick={() => {
                    setTypeFilter(String(channelType.value));
                    setPage(1);
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                    isActive
                      ? `${bgColor} text-white shadow-sm`
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {channelType.text}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-xs font-normal ${
                      isActive ? 'bg-white/20' : 'bg-muted-foreground/20'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 搜索和筛选区域 */}
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-4 sm:flex-1 sm:flex-row sm:items-center">
            <div className="w-full sm:w-auto sm:min-w-[200px]">
              <DataTableSearch
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                setPage={setPage}
                searchKey="ID,Name,Key"
              />
            </div>
            <DataTableSingleSelectFilter
              filterValue={statusFilter}
              setFilterValue={setStatusFilter}
              options={STATUS_OPTIONS}
              title={t.channelPage.columns.status}
              filterKey="status"
            />

            {/* 批量操作按钮 - 仅在有选中项时显示 */}
            {selectedChannels.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 animate-in fade-in zoom-in-50">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setOpen(true)}
                  disabled={batchLoading}
                  className="flex-1 sm:flex-none"
                >
                  <Trash className="mr-2 h-4 w-4" />
                  {t.channelPage.bulk.delete} ({selectedChannels.length})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisable}
                  disabled={batchLoading}
                  className="flex-1 sm:flex-none"
                >
                  <Ban className="mr-2 h-4 w-4" />
                  {t.channelPage.bulk.disable}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEnable}
                  disabled={batchLoading}
                  className="flex-1 sm:flex-none"
                >
                  <CircleSlash2 className="mr-2 h-4 w-4" />
                  {t.channelPage.bulk.enable}
                </Button>
              </div>
            )}
          </div>
          <div className="self-end sm:self-auto">
            <DataTableResetFilter
              isFilterActive={isAnyFilterActive}
              onReset={resetFilters}
            />
          </div>
        </div>

        {/* 居中加载指示器 */}
        {(loading || batchLoading) && (
          <div className="pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center">
            <div className="absolute inset-0 bg-background/40 backdrop-blur-sm" />
            <div className="relative flex items-center gap-3 rounded-lg border bg-card px-5 py-3 text-sm font-medium text-foreground shadow-lg duration-200 animate-in fade-in zoom-in-95">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span>{t.channelPage.overlay.processing}</span>
            </div>
          </div>
        )}

        {/* 移动端视图：卡片列表 (仅在 md 以下显示) */}
        <div className="space-y-4 md:hidden">
          {displayData.map((channel) => (
            <MobileChannelCard
              key={channel.id}
              channel={channel}
              channelTypes={channelTypes}
              onManageKeys={handleManageKeys}
              onDataChange={refetch}
              onDelete={(c) => {
                setDeleteChannel(c);
                setOpen(true);
              }}
            />
          ))}
          {/* 移动端分页控制 */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-4">
            <span className="text-sm text-muted-foreground">
              {displayTotal} total
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <span className="flex items-center px-2 text-sm">
                {page} / {Math.max(1, pageCount)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(pageCount, page + 1))}
                disabled={page >= pageCount}
              >
                Next
              </Button>
            </div>
          </div>
        </div>

        {/* 桌面端视图：数据表格 (仅在 md 及以上显示) */}
        <div className="hidden md:block">
          <DataTable
            columns={tableColumns}
            data={displayData}
            totalItems={displayTotal}
            onSelectionChange={setSelectedChannels}
            resetSelection={resetSelection}
            currentPage={page}
            pageSize={pageSize}
            setCurrentPage={setPage}
            setPageSize={setPageSize}
            pageSizeOptions={[10, 50, 100, 500]}
            minWidth="1500px" // 在小屏上保证最小宽度，允许横向滚动
          />
        </div>

        {/* 多密钥管理Modal */}
        <MultiKeyManagementModal
          open={isMultiKeyModalOpen}
          onOpenChange={setIsMultiKeyModalOpen}
          channel={selectedChannelForModal}
        />
      </div>
    );
  }
);

OptimizedChannelTable.displayName = 'OptimizedChannelTable';

export default OptimizedChannelTable;
