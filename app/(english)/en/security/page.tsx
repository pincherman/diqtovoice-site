import { NewPending } from '@/components/pages/NewPending';
import { pendingMetadata } from '@/lib/home-copy';
export const metadata = pendingMetadata('en', '/en/security/');
export default function PendingPage() { return <NewPending locale="en" />; }
