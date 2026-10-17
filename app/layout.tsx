import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { LanguageProvider } from './language';
import { DepthTransition, depthBootstrap } from './depth-transition';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Loïc Misenta — Data Science & Machine Learning',
  description: 'Loïc Misenta — About, projects in Data Science and Machine Learning, and music as OWLY.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head><script dangerouslySetInnerHTML={{ __html: depthBootstrap }}/></head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <LanguageProvider>{children}<DepthTransition/></LanguageProvider>
      </body>
    </html>
  );
}
