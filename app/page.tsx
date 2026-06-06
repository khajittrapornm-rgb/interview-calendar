'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Root() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    if (!session) router.replace('/login')
    else if (session.user.role === 'admin') router.replace('/admin')
    else if (session.user.role === 'hr') router.replace('/hr')
    else router.replace('/manager')
  }, [session, status, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-mint-50">
      <div className="w-8 h-8 border-4 border-mint-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
