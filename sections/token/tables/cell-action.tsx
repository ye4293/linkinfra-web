'use client';
import { useText } from '@/components/locale-text';
import { AlertModal } from '@/components/modal/alert-modal';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Token } from '@/lib/types/token';
import { Edit, MoreHorizontal, Trash, Ban, CircleSlash2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

interface CellActionProps {
  data: Token;
}

export const CellAction: React.FC<CellActionProps> = ({ data }) => {
  const tr = useText();
  const [loading, setLoading] = useState(false);
  const pending = useRef(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const model = useSearchParams().get('model');

  const updateToken = async (remove: boolean) => {
    if (pending.current) return;
    pending.current = true;
    setLoading(true);
    try {
      const res = await fetch(remove ? `/api/token/${data.id}` : '/api/token', {
        method: remove ? 'DELETE' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        ...(remove
          ? {}
          : {
              body: JSON.stringify({
                id: data.id,
                status: data.status === 1 ? 2 : 1,
                status_only: true
              })
            }),
        credentials: 'include'
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        toast.error(result.message || tr('Operation failed!'));
        return;
      }
      if (remove) setOpen(false);
      router.refresh();
      toast.success(tr('Operation completed successfully!'));
    } catch {
      toast.error(tr('Operation failed!'));
    } finally {
      pending.current = false;
      setLoading(false);
    }
  };

  return (
    <>
      <AlertModal
        isOpen={open}
        onClose={() => {
          if (!pending.current) setOpen(false);
        }}
        onConfirm={() => void updateToken(true)}
        loading={loading}
      />
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            disabled={loading}
            size="sm"
            className="shrink-0 gap-1.5 whitespace-nowrap"
            aria-label={`${tr('Manage key')}: ${data.name || ''}`}
          >
            {tr('Manage key')}
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{tr('Manage key')}</DropdownMenuLabel>

          <DropdownMenuItem
            onClick={() =>
              router.push(
                `/dashboard/token/${data.id}${
                  model ? `?${new URLSearchParams({ model })}` : ''
                }`
              )
            }
          >
            <Edit className="mr-2 h-4 w-4" />
            {tr('Edit name and limits')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpen(true)}>
            <Trash className="mr-2 h-4 w-4" />
            {tr('Delete')}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={loading}
            onClick={() => void updateToken(false)}
          >
            {data.status === 1 ? (
              <>
                <Ban className="mr-2 h-4 w-4" />
                {tr('Disable')}
              </>
            ) : (
              <>
                <CircleSlash2 className="mr-2 h-4 w-4" />
                {tr('Enable')}
              </>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};
