import { SiteDocument } from '@/components/SiteDocument';
import { homeMetadata } from '@/lib/home-copy';
export const metadata = homeMetadata('en');
export default function EnglishLayout({ children }: { children: React.ReactNode }) {
  return <SiteDocument locale="en">{children}</SiteDocument>;
}
