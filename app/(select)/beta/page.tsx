import { NewBeta } from '@/components/pages/NewBeta';
import { homeMetadata } from '@/lib/home-copy';
export const metadata = homeMetadata('en', true);
export default function BetaPage() { return <NewBeta locale="en" />; }
