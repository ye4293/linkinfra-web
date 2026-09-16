'use client';

import Link from 'next/link';
import { useLocale } from '@/components/providers/locale-provider';
import { useSystemConfig } from '@/hooks/use-system-config';
import ThemeToggle from '@/components/layout/ThemeToggle/theme-toggle';
import LanguageToggle from '@/components/layout/language-toggle';
import { UserNav } from '@/components/layout/user-nav';
import { SiteNavLinks } from '@/components/layout/site-nav-links';

export default function ModelPlazaLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const { t } = useLocale();
  const { systemName } = useSystemConfig();

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <header className="z-50 shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex min-h-14 flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6 text-primary"
              >
                <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
              </svg>
              <span className="text-lg font-bold">{systemName}</span>
            </Link>
            <nav
              aria-label={t.nav.marketplace}
              className="flex flex-wrap items-center gap-3 text-xs sm:text-sm"
            >
              <SiteNavLinks className="text-muted-foreground hover:text-foreground" />
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
            <UserNav />
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
