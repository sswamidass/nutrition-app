import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';

export const metadata: Metadata = {
  title: 'NutriTrack',
  description: 'Personal nutrition tracking',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main className="max-w-2xl mx-auto px-4 py-4">{children}</main>
      </body>
    </html>
  );
}
