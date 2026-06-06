'use client'

import { useSession, signOut } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { LogOut, Menu, X, Calendar, Shield } from 'lucide-react'

export default function Navbar() {
  const { data: session } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)

  if (!session) return null

  const isHR = session.user.role === 'hr'

  return (
    <nav className="bg-white border-b border-mint-100 shadow-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={isHR ? '/hr' : '/manager'} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-mint-100 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-mint-600" />
            </div>
            <span className="font-semibold text-mint-700 hidden sm:block">Interview Calendar</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-4">
            {session.user.role === 'admin' && (
              <Link
                href="/admin"
                className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 font-medium"
              >
                <Shield className="w-4 h-4" />
                จัดการสมาชิก
              </Link>
            )}
            <span className="text-sm text-gray-500">
              {session.user.role === 'admin' ? '🛡️ Admin' : isHR ? '🧑‍💼 HR' : '👔 Manager'}
            </span>
            <div className="flex items-center gap-2">
              {session.user.image && (
                <Image
                  src={session.user.image}
                  alt={session.user.name ?? ''}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              )}
              <span className="text-sm font-medium text-gray-700">{session.user.name}</span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-500 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              ออกจากระบบ
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-gray-500"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden pb-4 border-t border-mint-50 pt-3 space-y-3">
            {session.user.role === 'admin' && (
              <Link
                href="/admin"
                className="flex items-center gap-2 text-sm text-purple-600 font-medium px-1"
                onClick={() => setMenuOpen(false)}
              >
                <Shield className="w-4 h-4" />
                จัดการสมาชิก
              </Link>
            )}
            <div className="flex items-center gap-2 px-1">
              {session.user.image && (
                <Image
                  src={session.user.image}
                  alt={session.user.name ?? ''}
                  width={36}
                  height={36}
                  className="rounded-full"
                />
              )}
              <div>
                <div className="text-sm font-medium text-gray-700">{session.user.name}</div>
                <div className="text-xs text-gray-400">{isHR ? 'HR' : 'Manager'}</div>
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex items-center gap-2 text-sm text-red-500 px-1"
            >
              <LogOut className="w-4 h-4" />
              ออกจากระบบ
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}
