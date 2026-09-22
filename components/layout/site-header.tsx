'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Layers3, Menu, X } from 'lucide-react';
import { useLocale } from '@/components/providers/locale-provider';
import { useSystemConfig } from '@/hooks/use-system-config';
import { consoleHref } from '@/lib/api-key-navigation';
import LanguageToggle from './language-toggle';
import ThemeToggle from './ThemeToggle/theme-toggle';
import { UserNav } from './user-nav';
import { SiteNavLinks } from './site-nav-links';
import s from './site-header.module.css';

export function SiteHeader({
  leading,
  children
}: {
  leading?: ReactNode;
  children?: ReactNode;
}) {
  const { lang } = useLocale();
  const { systemName } = useSystemConfig();
  const { data: session } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const zh = lang === 'zh';
  const brand = systemName.trim() || 'LinkInfra';

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open]);

  return (
    <header className={s.header}>
      <div className={s.inner}>
        {leading}
        <Link
          href="/"
          className={s.brand}
          aria-label={`${brand} ${zh ? '首页' : 'home'}`}
        >
          <Layers3 size={28} aria-hidden="true" />
          <span>{brand}</span>
        </Link>
        <nav
          className={s.navigation}
          aria-label={zh ? '主导航' : 'Main navigation'}
        >
          <SiteNavLinks includeConsole={false} />
          <Link href="/#contact">{zh ? '联系我们' : 'Contact us'}</Link>
        </nav>
        <div className={s.actions}>
          {children}
          <LanguageToggle />
          <span className={s.theme}>
            <ThemeToggle />
          </span>
          <span className={s.account}>
            <UserNav />
          </span>
          <Link
            href={consoleHref(Boolean(session), lang)}
            className={s.console}
            aria-current={
              pathname.startsWith('/dashboard') ? 'page' : undefined
            }
          >
            Console
          </Link>
          <button
            type="button"
            className={s.menu}
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls="site-mobile-nav"
            aria-label={zh ? '切换主导航' : 'Toggle main navigation'}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
      {open && (
        <nav
          id="site-mobile-nav"
          className={s.mobile}
          aria-label={zh ? '移动导航' : 'Mobile navigation'}
        >
          <SiteNavLinks onNavigate={() => setOpen(false)} />
          <Link href="/#contact" onClick={() => setOpen(false)}>
            {zh ? '联系我们' : 'Contact us'}
          </Link>
          <Link href="/getting-started" onClick={() => setOpen(false)}>
            {zh ? '新手指引' : 'Getting started'}
          </Link>
          <div className={s.mobileTools}>
            <ThemeToggle />
            <UserNav />
          </div>
        </nav>
      )}
    </header>
  );
}
