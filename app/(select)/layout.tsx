import { SiteDocument } from '@/components/SiteDocument';
import { homeMetadata } from '@/lib/home-copy';
export const metadata = homeMetadata('fr');
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <SiteDocument locale="fr">{children}</SiteDocument>;
}
