
import type {Metadata} from 'next';
import './globals.css';
import { ClientOnlyToaster } from '@/components/ClientOnlyToaster'; // Updated import

export const metadata: Metadata = {
  title: 'TeleTap',
  description: 'Manage your Telegram bots with ease.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link key="font-preconnect-google" rel="preconnect" href="https://fonts.googleapis.com" />
        <link key="font-preconnect-gstatic" rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link key="font-inter" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link key="font-space-grotesk" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased" suppressHydrationWarning={true}>
        {children}
        <ClientOnlyToaster />
      </body>
    </html>
  );
}
