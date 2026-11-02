import { PublicInfo } from '@/components/pages/PublicInfo';
import { publicMetadata } from '@/lib/site-seo';
export const metadata = publicMetadata('en', 'privacy');
export default function Page() { return <PublicInfo locale="en" page="privacy" />; }
