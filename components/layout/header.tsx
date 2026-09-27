import { MobileSidebar } from './mobile-sidebar';
import { SiteHeader } from './site-header';

export default function Header() {
  return (
    <SiteHeader
      fullWidth
      leading={
        <div className="md:hidden">
          <MobileSidebar />
        </div>
      }
    />
  );
}
