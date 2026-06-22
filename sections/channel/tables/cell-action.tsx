'use client';
import { AlertModal } from '@/components/modal/alert-modal';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Channel } from '@/lib/types/channel';
import {
  Edit,
  MoreHorizontal,
  Trash,
  Ban,
  CircleSlash2,
  ListTree,
  KeyRound,
  Copy
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { ModelsModal } from './models-modal';

export interface CellActionProps {
  data: Channel;
  onManageKeys: (channel: Channel) => void; // 添加 onManageKeys
  onDataChange?: () => void; // 数据变化回调
}

export const CellAction: React.FC<CellActionProps> = ({
  data,
  onManageKeys, // 接收 onManageKeys
  onDataChange // 接收 onDataChange
}) => {
  const [loading, setLoading] = useState(false);
  const [copyLoading, setCopyLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [copyConfirmOpen, setCopyConfirmOpen] = useState(false);
  const [modelsModalOpen, setModelsModalOpen] = useState(false);
  const router = useRouter();

  const onConfirm = async (channel: Channel) => {
    manageChannel(channel.id as number, 'delete', '');
  };

  const manageChannel = async (id: number, action: string, value: string) => {
    let _params: {
      id: number;
      status?: number;
      priority?: number;
      weight?: number;
    } = { id };
    let res;
    switch (action) {
      case 'delete':
        res = await fetch(`/api/channel/${id}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        break;
      case 'enable':
        _params.status = 1;
        res = await fetch(`/api/channel/`, {
          method: 'PUT',
          body: JSON.stringify(_params),
          credentials: 'include'
        });
        break;
      case 'disable':
        _params.status = 2;
        res = await fetch(`/api/channel/`, {
          method: 'PUT',
          body: JSON.stringify(_params),
          credentials: 'include'
        });
        break;
      case 'priority':
        if (value === '') {
          return;
        }
        _params.priority = parseInt(value);
        res = await fetch(`/api/channel/`, {
          method: 'PUT',
          body: JSON.stringify(_params),
          credentials: 'include'
        });
        break;
      case 'weight':
        if (value === '') {
          return;
        }
        _params.weight = parseInt(value);
        if (_params.weight < 0) {
          _params.weight = 0;
        }
        res = await fetch(`/api/channel/`, {
          method: 'PUT',
          body: JSON.stringify(_params),
          credentials: 'include'
        });
        break;
    }
    if (res) {
      const { success, message } = await res.json();
      if (success) {
        toast.success('Operation completed successfully!');
        setOpen(false);
        onDataChange?.();
      } else {
        toast.error(message || 'Operation failed!');
      }
    }
  };

  // 复制渠道
  const copyChannel = async (channel: Channel) => {
    try {
      setCopyLoading(true);
      const res = await fetch(`/api/channel/copy/${channel.id}`, {
        method: 'POST',
        credentials: 'include'
      });
      const { success, message, data } = await res.json();
      if (success) {
        toast.success(
          `Channel "${channel.name}" duplicated. New name: ${
            data?.name || channel.name + '_copy'
          }`
        );
        setCopyConfirmOpen(false);
        // trigger data refresh callback
        onDataChange?.();
      } else {
        toast.error(message || 'Failed to duplicate channel.');
      }
    } catch (error) {
      toast.error('An error occurred while duplicating the channel.');
    } finally {
      setCopyLoading(false);
    }
  };

  return (
    <>
      <AlertModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={() => onConfirm(data)}
        loading={loading}
      />
      <AlertModal
        isOpen={copyConfirmOpen}
        onClose={() => setCopyConfirmOpen(false)}
        onConfirm={() => copyChannel(data)}
        loading={copyLoading}
        title="Duplicate channel"
        description={`Duplicate channel "${data.name}"? The new channel will be disabled by default.`}
      />
      <ModelsModal
        channel={data}
        isOpen={modelsModalOpen}
        onClose={() => setModelsModalOpen(false)}
      />
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          {data.multi_key_info?.is_multi_key && (
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                onManageKeys(data);
              }}
            >
              <KeyRound className="mr-2 h-4 w-4" /> Multi-key
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => router.push(`/dashboard/channel/${data.id}`)}
          >
            <Edit className="mr-2 h-4 w-4" /> Update
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpen(true)}>
            <Trash className="mr-2 h-4 w-4" /> Delete
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setCopyConfirmOpen(true)}
            disabled={copyLoading}
          >
            <Copy className="mr-2 h-4 w-4" />{' '}
            {copyLoading ? 'Duplicating...' : 'Duplicate'}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              manageChannel(
                data.id as number,
                data.status === 1 ? 'disable' : 'enable',
                ''
              )
            }
          >
            {data.status === 1 ? (
              <>
                <Ban className="mr-2 h-4 w-4" /> Disable
              </>
            ) : (
              <>
                <CircleSlash2 className="mr-2 h-4 w-4" /> Enable
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setModelsModalOpen(true)}>
            <ListTree className="mr-2 h-4 w-4" /> View Models
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};
