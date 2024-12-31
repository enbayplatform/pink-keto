import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/context/AuthContext'

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#EC4899', // Pink-600 from Tailwind
}

export const metadata: Metadata = {
  title: 'Pink Keto - AI-Powered Document Scanner',
  description: 'Transform your documents into searchable text instantly with our AI-powered document scanning solution. Fast, accurate, and secure document processing.',
  keywords: 'document scanner, OCR, text extraction, AI document processing, document management',
  openGraph: {
    title: 'Pink Keto - AI-Powered Document Scanner',
    description: 'Transform your documents into searchable text instantly with our AI-powered document scanning solution.',
    type: 'website',
    locale: 'en_US',
    siteName: 'Pink Keto',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pink Keto - AI-Powered Document Scanner',
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
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
