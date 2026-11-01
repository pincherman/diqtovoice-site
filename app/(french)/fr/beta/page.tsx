import { NewBeta } from '@/components/pages/NewBeta';
import { homeMetadata } from '@/lib/home-copy';
export const metadata = homeMetadata('fr', true);
export default function FrenchBetaPage() { return <NewBeta locale="fr" />; }
