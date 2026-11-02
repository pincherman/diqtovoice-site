import { PublicInfo } from '@/components/pages/PublicInfo';
import { publicMetadata } from '@/lib/site-seo';
export const metadata = publicMetadata('fr', 'privacy');
export default function Page() { return <PublicInfo locale="fr" page="privacy" />; }
