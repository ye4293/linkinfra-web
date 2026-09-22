import { SiteHeader } from '@/components/layout/site-header';

export default function ModelPlazaLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <SiteHeader />
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
