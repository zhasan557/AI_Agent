import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Nexus AI Agent — Autonomous Engineering Intelligence',
  description:
    'An advanced autonomous AI engineering agent that transforms simple commands into fully working production-grade solutions. Build apps, websites, APIs, and more with AI.',
  keywords: [
    'AI agent',
    'autonomous coding',
    'full stack development',
    'AI engineering',
    'code generation',
    'Next.js',
    'Groq AI',
  ],
  authors: [{ name: 'Nexus AI' }],
  openGraph: {
    title: 'Nexus AI Agent — Autonomous Engineering Intelligence',
    description:
      'Transform simple commands into fully working solutions with AI-powered autonomous development.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#1e293b',
              color: '#e2e8f0',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: '12px',
              backdropFilter: 'blur(10px)',
            },
            success: {
              iconTheme: { primary: '#10b981', secondary: '#1e293b' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#1e293b' },
            },
          }}
        />
      </body>
    </html>
  );
}
