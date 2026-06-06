'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { Shield, ChevronDown } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { Profile } from '@/lib/types'
import toast from 'react-hot-toast'
import Image from 'next/image'

const ROLE_LABEL: Record<string, { text: string; color: string }> = {
  admin:   { text: '🛡️ Admin',   color: 'bg-purple-100 text-purple-700' },
  hr:      { text: '🧑‍💼 HR',      color: 'bg-blue-100 text-blue-700' },
  manager: { text: '👔 Manager', color: 'bg-mint-100 text-mint-700' },
}

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [changing, setChanging] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.replace('/login'); return }
    if (session.user.role !== 'admin') { router.replace('/'); return }
  }, [session, status, router])

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      setUsers(Array.isArray(data) ? data : [])
    } catch {
      toast.error('โหลดข้อมูลไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (session?.user.role === 'admin') fetchUsers()
  }, [session, fetchUsers])

  async function handleRoleChange(userId: string, newRole: string) {
    setChanging(userId)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('เปลี่ยน role สำเร็จ')
      fetchUsers()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setChanging(null)
    }
  }

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mint-50">
        <div className="w-8 h-8 border-4 border-mint-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const counts = {
    admin: users.filter(u => u.role === 'admin').length,
    hr: users.filter(u => u.role === 'hr').length,
    manager: users.filter(u => u.role === 'manager').length,
  }

  return (
    <div className="min-h-screen bg-mint-50">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="bg-white rounded-3xl p-5 flex items-center gap-4 shadow-sm">
          <div className="relative w-16 h-16 shrink-0">
            <Image src="/capybara.png" alt="mascot" fill className="object-contain" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-500" />
              จัดการสมาชิก
            </h1>
            <p className="text-sm text-gray-500">กำหนดสิทธิ์การใช้งานให้แต่ละคน</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {(['admin', 'hr', 'manager'] as const).map(r => (
            <div key={r} className="bg-white rounded-2xl p-3 shadow-sm text-center">
              <div className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mb-1 ${ROLE_LABEL[r].color}`}>
                {ROLE_LABEL[r].text}
              </div>
              <div className="text-2xl font-bold text-gray-700">{counts[r]}</div>
              <div className="text-xs text-gray-400">คน</div>
            </div>
          ))}
        </div>

        {/* User table */}
        <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-gray-700">
              สมาชิกทั้งหมด ({users.length} คน)
            </h2>
          </div>

          {loading ? (
            <div className="text-center py-10 text-gray-400 text-sm">กำลังโหลด...</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {users.map(user => {
                const isSelf = user.id === session.user.profileId
                const rl = ROLE_LABEL[user.role] ?? ROLE_LABEL.manager
                return (
                  <div key={user.id} className="flex items-center gap-3 px-5 py-3.5">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-mint-100 flex items-center justify-center text-sm font-bold text-mint-700 shrink-0 overflow-hidden">
                      {user.avatar_url ? (
                        <Image src={user.avatar_url} alt={user.name} width={36} height={36} />
                      ) : (
                        user.name.charAt(0)
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">
                        {user.name}
                        {isSelf && <span className="text-xs text-gray-400 ml-1">(คุณ)</span>}
                      </div>
                      <div className="text-xs text-gray-400 truncate">{user.email}</div>
                    </div>

                    {/* Role selector */}
                    {isSelf ? (
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${rl.color}`}>
                        {rl.text}
                      </span>
                    ) : (
                      <div className="relative">
                        <select
                          value={user.role}
                          disabled={changing === user.id}
                          onChange={e => handleRoleChange(user.id, e.target.value)}
                          className={`appearance-none text-xs pl-3 pr-7 py-1.5 rounded-xl border font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-mint-400 ${rl.color} border-transparent`}
                        >
                          <option value="admin">🛡️ Admin</option>
                          <option value="hr">🧑‍💼 HR</option>
                          <option value="manager">👔 Manager</option>
                        </select>
                        <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Help */}
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-sm text-amber-700 space-y-1">
          <div className="font-semibold">คำอธิบาย role</div>
          <div>🛡️ <b>Admin</b> — เปลี่ยน role ของคนอื่นได้</div>
          <div>🧑‍💼 <b>HR</b> — ดู slot ว่างของ Manager ทุกคน + จองนัดสัมภาษณ์ได้</div>
          <div>👔 <b>Manager</b> — กำหนดเวลาว่างสำหรับสัมภาษณ์</div>
        </div>
      </main>
    </div>
  )
}
