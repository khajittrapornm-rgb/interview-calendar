'use client'

import { SessionProvider } from 'next-auth/react'
import { Toaster } from 'react-hot-toast'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            fontFamily: 'Noto Sans Thai, sans-serif',
            borderRadius: '12px',
          },
          success: {
            style: { background: '#d9faf0', color: '#136355', border: '1px solid #7eeacf' },
          },
          error: {
            style: { background: '#fee2e2', color: '#991b1b' },
          },
        }}
      />
    </SessionProvider>
  )
}
