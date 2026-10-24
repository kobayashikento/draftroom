import type { Metadata } from 'next';
import SocialCallback from '../../../components/media/social-callback';

export const metadata: Metadata = {
  title: 'Connecting your channel — Draftroom',
  referrer: 'no-referrer',
  robots: { index: false, follow: false }
};

export default function SocialCallbackPage() {
  return <SocialCallback />;
}
