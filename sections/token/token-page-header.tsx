'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Heading } from '@/components/ui/heading';
import { buttonVariants } from '@/components/ui/button';
import { useText } from '@/components/locale-text';

export function TokenPageHeader({ total }: { total: number }) {
  const tr = useText();
  const model = useSearchParams().get('model');
  const query = model ? `?${new URLSearchParams({ model })}` : '';
  return (
    <div className="flex items-start justify-between gap-3">
      <Heading
        title={`${tr('Keys')} (${total})`}
        description={tr('Manage API keys and their spending limits.')}
      />
      <Link
        href={`/dashboard/token/create${query}`}
        className={buttonVariants({ variant: 'default' })}
      >
        <Plus className="mr-2 h-4 w-4" />
        {tr('Add New')}
      </Link>
    </div>
  );
}
