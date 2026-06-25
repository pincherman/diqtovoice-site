import type { Metadata } from 'next';
import { Work_Sans } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

const workSans = Work_Sans({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700', '800'] });

export const metadata: Metadata = {
  title: 'Diqto Voice — Real-time translated voice for meetings',
  description: 'Speak your language. Be heard in theirs. Diqto Voice translates your voice in real time for meetings, starting on Mac.',
  metadataBase: new URL('https://diqtovoice.com'),
  openGraph: {
    title: 'Diqto Voice',
    description: 'Real-time translated voice for meetings. Mac beta first.',
    url: 'https://diqtovoice.com',
    siteName: 'Diqto Voice',
    type: 'website',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={workSans.className}>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
