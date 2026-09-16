'use client';

import ThemeToggle from '@/components/layout/ThemeToggle/theme-toggle';
import LanguageToggle from '@/components/layout/language-toggle';
import { cn } from '@/lib/utils';
import { MobileSidebar } from './mobile-sidebar';
import { UserNav } from './user-nav';
import { SiteNavLinks } from './site-nav-links';

export default function Header() {
  return (
    <header className="sticky inset-x-0 top-0 z-10 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="flex min-h-14 flex-wrap items-center justify-between gap-2 px-2 py-2 sm:px-4">
        {/* Left: mobile menu + nav links */}
        <div className="flex items-center gap-1 sm:gap-4">
          <div className={cn('block lg:!hidden')}>
            <MobileSidebar />
          </div>

          {/* Nav links */}
          <div className="flex items-center gap-1">
            <SiteNavLinks className="inline-flex items-center rounded-lg px-2 py-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground sm:px-3 sm:text-sm" />
          </div>
        </div>

        {/* Right: language + user + theme */}
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <UserNav />
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
