import type { Metadata } from 'next';
import { JetBrains_Mono, Playfair_Display } from 'next/font/google';
import './globals.css';
import MotionProvider from '@/components/MotionProvider';

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  weight: ['700', '900'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'CLOUD LATENCY MAP',
  description:
    'Real-time browser-side latency comparison: AWS vs Azure across 10 global regions.',
  openGraph: {
    title: 'CLOUD LATENCY MAP',
    description: 'Real-time browser-side latency comparison: AWS vs Azure across 10 global regions.',
    type: 'website',
    url: 'https://cloud-latency-map.shellnode.lol',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${jetbrains.variable} ${playfair.variable}`}>
      <body>
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
