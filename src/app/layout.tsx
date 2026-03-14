import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Alethia Live',
  description: 'Healthcare navigation and health literacy companion.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
