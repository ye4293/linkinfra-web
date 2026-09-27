'use client';
import { DashboardNav } from '@/components/dashboard-nav';
import { navItems } from '@/constants/data';
import { useSidebar } from '@/hooks/useSidebar';
import { cn } from '@/lib/utils';
import { ChevronLeft } from 'lucide-react';
import { useSession } from 'next-auth/react';

type SidebarProps = {
  className?: string;
};

export default function Sidebar({ className }: SidebarProps) {
  const { data: session } = useSession();
  const { isMinimized, toggle } = useSidebar();

  const filterNavItems = navItems.filter((item) => {
    return item.roles?.includes((session?.user as any)?.role as number);
  });

  const handleToggle = () => {
    toggle();
  };

  return (
    <aside
      className={cn(
        `relative hidden h-full flex-none border-r bg-card transition-[width] duration-500 md:block`,
        !isMinimized ? 'w-72' : 'w-[72px]',
        className
      )}
    >
      <ChevronLeft
        className={cn(
          'absolute -right-3 top-5 z-50  cursor-pointer rounded-full border bg-background text-3xl text-foreground',
          isMinimized && 'rotate-180'
        )}
        onClick={handleToggle}
      />
      <div className="flex h-full flex-col space-y-4 overflow-y-auto py-4">
        <div className="px-3 py-2">
          <div className="mt-3 space-y-1">
            <DashboardNav items={filterNavItems} />
          </div>
        </div>
      </div>
    </aside>
  );
}
