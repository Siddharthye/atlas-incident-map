import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ATLAS — Live Incident Map + Severity Triage Engine',
  description:
    'A live 3D campus incident map and an explainable triage rules engine in one module: REST API, SSE stream, hotspot detection, iframe widget, and React embed. No API keys, no tile servers.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
