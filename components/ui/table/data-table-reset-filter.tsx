'use client';
import { useText } from '@/components/locale-text';
import { Button } from '../button';

type DataTableResetFilterProps = {
  isFilterActive: boolean;
  onReset: () => void;
};

export function DataTableResetFilter({
  isFilterActive,
  onReset
}: DataTableResetFilterProps) {
  const tr = useText();
  return (
    <>
      {isFilterActive ? (
        <Button variant="outline" onClick={onReset}>
          {tr('Reset Filters')}
        </Button>
      ) : null}
    </>
  );
}
