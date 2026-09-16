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
import { useState } from 'react';
import { toast } from 'sonner';

interface CellActionProps {
  data: Token;
}

export const CellAction: React.FC<CellActionProps> = ({ data }) => {
  const tr = useText();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const model = useSearchParams().get('model');

  const onConfirm = async (token: Token) => {
    deleteToken(token);
  };

  const manageToken = async (token: Token) => {
    const params = {
      id: token.id,
      status: token.status === 1 ? 2 : 1,
      status_only: true
    };
    // Implement disable logic here
    const res = await fetch(`/api/token`, {
      method: 'PUT',
      body: JSON.stringify(params),
      credentials: 'include'
    });
    const { success, message } = await res.json();
    if (success) {
      router.refresh();
      toast.success(tr('Operation completed successfully!'));
    } else {
      toast.error(message || tr('Operation failed!'));
    }
  };

  const deleteToken = async (token: Token) => {
    // Implement disable logic here
    const res = await fetch(`/api/token/${token.id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    const { success } = await res.json();
    if (success) {
      setOpen(false);
      router.refresh();
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
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">{tr('Open menu')}</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{tr('Actions')}</DropdownMenuLabel>

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
            {tr('Update')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpen(true)}>
            <Trash className="mr-2 h-4 w-4" />
            {tr('Delete')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => manageToken(data)}>
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
