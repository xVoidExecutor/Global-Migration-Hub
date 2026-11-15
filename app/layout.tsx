import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Public_Sans, Source_Serif_4 } from 'next/font/google'
import './globals.css'

const inter = Public_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
})

const siteUrl = 'https://globalmigrationhub.com'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Global Migration Hub | Trusted Visa & Immigration Consultancy',
    template: '%s | Global Migration Hub',
  },
  description:
    'Global Migration Hub provides expert work permit services, up-to-date immigration news, and a secure client portal to track your visa status. Trusted guidance for your relocation journey.',
  keywords: [
    'immigration consultancy',
    'work permit services',
    'visa status',
    'visa application',
    'immigration news',
    'global migration',
    'relocation services',
  ],
  authors: [{ name: 'Global Migration Hub' }],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: siteUrl,
    title: 'Global Migration Hub | Trusted Visa & Immigration Consultancy',
    description:
      'Expert work permit services, immigration news, and a secure client portal to track your visa status.',
    siteName: 'Global Migration Hub',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Global Migration Hub | Trusted Visa & Immigration Consultancy',
    description:
      'Expert work permit services, immigration news, and a secure client portal to track your visa status.',
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: '/favicon.ico?v=2', sizes: 'any' },
      { url: '/favicon-48x48.png?v=2', sizes: '48x48', type: 'image/png' },
      { url: '/favicon-192x192.png?v=2', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/favicon.ico?v=2',
    apple: [{ url: '/apple-touch-icon.png?v=2', sizes: '180x180', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#002664',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${sourceSerif.variable} bg-background`}
    >
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
