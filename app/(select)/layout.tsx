import { SiteDocument } from '@/components/SiteDocument';
import { homeCopy } from '@/lib/home-copy';

export const metadata = {
  title: homeCopy.en.seo.selectorTitle,
  description: homeCopy.en.seo.selectorDescription,
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <SiteDocument locale="en">{children}</SiteDocument>;
}
