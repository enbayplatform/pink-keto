import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/context/AuthContext'
import GoogleAnalytics from '@/components/GoogleAnalytics'

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#EC4899', // Pink-600 from Tailwind
}

export const metadata: Metadata = {
  title: 'Pink Scan AI - AI-Powered Document Scanner',
  description: 'Transform your documents into searchable text instantly with our AI-powered document scanning solution. Fast, accurate, and secure document processing.',
  keywords: 'document scanner, OCR, text extraction, AI document processing, document management',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
  openGraph: {
    title: 'Pink Scan AI - AI-Powered Document Scanner',
    description: 'Transform your documents into searchable text instantly with our AI-powered document scanning solution.',
    type: 'website',
    locale: 'en_US',
    siteName: 'Pink Scan AI',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pink Scan AI - AI-Powered Document Scanner',
    description: 'Transform your documents into searchable text instantly with our AI-powered document scanning solution.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <GoogleAnalytics />
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
