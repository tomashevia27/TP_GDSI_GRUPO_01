import type { Metadata, Viewport } from 'next'
import { Inter, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/components/auth-provider'
import './globals.css'

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-sans"
})

const geistMono = Geist_Mono({ 
  subsets: ["latin"],
  variable: "--font-mono"
})

export const metadata: Metadata = {
  title: 'TeamUp - Armá tu partido',
  description: 'La app para organizar partidos de fútbol con amigos. Encontrá jugadores, reservá canchas y armá tu equipo.',
  keywords: ['fútbol', 'partidos', 'amigos', 'canchas', 'deportes', 'equipo'],
  authors: [{ name: 'TeamUp' }],
  icons: {
    icon: '/pelotarda.png',
    apple: '/pelotarda.png',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FDF8F4' },
    { media: '(prefers-color-scheme: dark)', color: '#1A1614' },
  ],
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${geistMono.variable} bg-background`}>
      <body className="font-sans antialiased min-h-screen">
        <AuthProvider>
          {children}
        </AuthProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
