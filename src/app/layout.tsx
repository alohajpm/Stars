// src/app/layout.tsx
import type { Metadata } from 'next'
import { Geist, Montserrat, Lora } from 'next/font/google' // Import Montserrat and Lora
import localFont from 'next/font/local'
import './globals.css'

// Existing Geist fonts
const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});


// New fonts (using next/font/google for Montserrat and Lora)
const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  weight: ['400', '700'], // Regular and Bold
  display: 'swap',
});

const lora = Lora({
  subsets: ['latin'],
  variable: '--font-lora',
  weight: ['400', '700'], // Regular and Bold
  display: 'swap',
});

// Great Vibes (local font)
const greatVibes = localFont({
  src: '../../public/GreatVibes-Regular.ttf', // Correct path
  variable: '--font-great-vibes',
  display: 'swap',
});

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
    <html lang="en" className={`${geistSans.variable} ${montserrat.variable} ${lora.variable} ${greatVibes.variable}`}>
      <body className="antialiased"> {/* Removed font classes from body */}
        {children}
      </body>
    </html>
  )
}
