import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Market Analyzer - Pocket Option',
  description: 'Mobile-first short-term market analysis assistant',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#06090F] min-h-screen">{children}</body>
    </html>
  );
}

