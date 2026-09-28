import { SiteHeader } from '@/components/layout/site-header';

export default function ModelPlazaLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      {children}
    </div>
  );
}
