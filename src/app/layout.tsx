// src/app/layout.tsx
import type { Metadata } from 'next'
import { Montserrat, Lora } from 'next/font/google' // Import from next/font/google
import localFont from 'next/font/local'
import './globals.css'

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  weight: ['400', '700'], // Regular and Bold
  display: 'swap',
})

const lora = Lora({
  subsets: ['latin'],
  variable: '--font-lora',
  weight: ['400', '700'], // Regular and Bold
  display: 'swap',
})

const greatVibes = localFont({
  src: '../../public/GreatVibes-Regular.ttf', // Correct path
  variable: '--font-great-vibes',
  display: 'swap',
})


export const metadata: Metadata = {
  title: 'Your Astrology App', // Changed title
  description: 'Discover your astrological chart', // Changed description
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${montserrat.variable} ${lora.variable} ${greatVibes.variable}`}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
