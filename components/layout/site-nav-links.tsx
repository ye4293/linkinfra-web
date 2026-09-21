'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useLocale } from '@/components/providers/locale-provider';
import { consoleHref } from '@/lib/api-key-navigation';

export function SiteNavLinks({
  className,
  onNavigate,
  includeConsole = true
}: {
  className?: string;
  onNavigate?: () => void;
  includeConsole?: boolean;
}) {
  const { t, lang } = useLocale();
  const { data: session } = useSession();
  const pathname = usePathname();
  const links = [
    { href: '/', label: t.nav.home, active: pathname === '/' },
    {
      href: '/model-plaza',
      label: t.nav.marketplace,
      active: pathname.startsWith('/model-plaza')
    },
    { href: '/docs', label: t.nav.docs, active: pathname.startsWith('/docs') },
    {
      href: '/rankings',
      label: lang === 'zh' ? '排行榜' : 'Rankings',
      active: pathname.startsWith('/rankings')
    },
    {
      href: consoleHref(Boolean(session), lang),
      label: 'Console',
      active: pathname.startsWith('/dashboard')
    }
  ];
  return (
    <>
      {links
        .filter((link) => includeConsole || link.label !== 'Console')
        .map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className={className}
            aria-current={link.active ? 'page' : undefined}
            onClick={onNavigate}
          >
            {link.label}
          </Link>
        ))}
    </>
  );
}
