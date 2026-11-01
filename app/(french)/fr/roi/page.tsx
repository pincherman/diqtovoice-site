import { NewPending } from '@/components/pages/NewPending';
import { pendingMetadata } from '@/lib/home-copy';
export const metadata = pendingMetadata('fr', '/fr/roi/');
export default function PendingPage() { return <NewPending locale="fr" />; }
