import './globals.css';
import UIProvider from '../components/ui-provider';
import {cssCustomProperties} from '../lib/design-tokens.js';
export const metadata = { title: 'draftroom — your little creative workspace', description: 'A calm, connected content workspace for your next good idea.' };
export default function RootLayout({ children }) { return <html lang="en" style={cssCustomProperties}><body><UIProvider>{children}</UIProvider></body></html>; }
