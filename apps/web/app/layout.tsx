import type { Metadata } from 'next';
import './styles.css';
export const metadata: Metadata = { title: 'Agent Genome — Watch an AI Species Evolve', description: 'An interactive exhibit on evolutionary AI.' };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body>{children}</body></html>; }
