import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'

/* Self-hosted at build time by next/font — no runtime font requests, which
   matters for a module that must demo with the venue wifi off. */
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains', display: 'swap' })

export const metadata: Metadata = {
  title: 'ATLAS — Live Incident Map + Severity Triage Engine',
  description:
    'A live 3D campus incident map and an explainable triage rules engine in one module: REST API, SSE stream, hotspot detection, iframe widget, and React embed. No API keys, no tile servers.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
