'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { Shield, ChevronDown, Bell, Plus, Trash2, Link } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { Profile } from '@/lib/types'
import toast from 'react-hot-toast'
import Image from 'next/image'

const ROLE_LABEL: Record<string, { text: string; color: string }> = {
  admin:   { text: '🛡️ Admin',   color: 'bg-purple-100 text-purple-700' },
  hr:      { text: '🧑‍💼 HR',      color: 'bg-blue-100 text-blue-700' },
  manager: { text: '👔 Manager', color: 'bg-mint-100 text-mint-700' },
}

interface LarkWebhook {
  id: string
  name: string
  webhook_url: string
  created_at: string
}

type Tab = 'users' | 'lark'

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('users')

  // Users tab state
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [changing, setChanging] = useState<string | null>(null)

  // Lark tab state
  const [webhooks, setWebhooks] = useState<LarkWebhook[]>([])
  const [webhookLoading, setWebhookLoading] = useState(false)
  const [addingWebhook, setAddingWebhook] = useState(false)
  const [newName, setNewName] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.replace('/login'); return }
    if (session.user.role !== 'admin') { router.replace('/'); return }
  }, [session, status, router])

  // ---- Users ----
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

  // ---- Lark Webhooks ----
  const fetchWebhooks = useCallback(async () => {
    setWebhookLoading(true)
    try {
      const res = await fetch('/api/admin/webhooks')
      const data = await res.json()
      setWebhooks(Array.isArray(data) ? data : [])
    } catch {
      toast.error('โหลด Lark webhooks ไม่สำเร็จ')
    } finally {
      setWebhookLoading(false)
    }
  }, [])

  useEffect(() => {
    if (session?.user.role === 'admin' && tab === 'lark') fetchWebhooks()
  }, [session, tab, fetchWebhooks])

  async function handleAddWebhook(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/admin/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, webhook_url: newUrl }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('เพิ่มกลุ่ม Lark สำเร็จ!')
      setNewName('')
      setNewUrl('')
      setAddingWebhook(false)
      fetchWebhooks()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteWebhook(id: string, name: string) {
    if (!confirm(`ลบกลุ่ม "${name}" ใช่ไหม?\n\nSlot ที่ผูกกับกลุ่มนี้จะใช้กลุ่มหลักแทน`)) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/admin/webhooks?id=${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error)
      }
      toast.success('ลบกลุ่มแล้ว')
      fetchWebhooks()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'ลบไม่สำเร็จ')
    } finally {
      setDeleting(null)
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
            <Image src="/capybara.jpg" alt="mascot" fill className="object-contain" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-500" />
              Admin Panel
            </h1>
            <p className="text-sm text-gray-500">จัดการสมาชิกและกลุ่ม Lark</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-white rounded-2xl p-1.5 shadow-sm">
          <button
            onClick={() => setTab('users')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              tab === 'users' ? 'bg-mint-500 text-white shadow-sm' : 'text-gray-500 hover:text-mint-600'
            }`}
          >
            <Shield className="w-4 h-4" />
            จัดการสมาชิก
          </button>
          <button
            onClick={() => setTab('lark')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              tab === 'lark' ? 'bg-mint-500 text-white shadow-sm' : 'text-gray-500 hover:text-mint-600'
            }`}
          >
            <Bell className="w-4 h-4" />
            กลุ่ม Lark
            {webhooks.length > 0 && tab !== 'lark' && (
              <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">{webhooks.length}</span>
            )}
          </button>
        </div>

        {/* ===== TAB: USERS ===== */}
        {tab === 'users' && (
          <>
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
                        <div className="w-9 h-9 rounded-full bg-mint-100 flex items-center justify-center text-sm font-bold text-mint-700 shrink-0 overflow-hidden">
                          {user.avatar_url ? (
                            <Image src={user.avatar_url} alt={user.name} width={36} height={36} />
                          ) : (
                            user.name.charAt(0)
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-800 truncate">
                            {user.name}
                            {isSelf && <span className="text-xs text-gray-400 ml-1">(คุณ)</span>}
                          </div>
                          <div className="text-xs text-gray-400 truncate">{user.email}</div>
                        </div>
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
          </>
        )}

        {/* ===== TAB: LARK WEBHOOKS ===== */}
        {tab === 'lark' && (
          <>
            {/* Header action */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                กลุ่ม Lark ที่ตั้งไว้ Manager จะเลือกได้ตอนสร้าง slot
              </p>
              <button
                onClick={() => setAddingWebhook(v => !v)}
                className="flex items-center gap-1.5 bg-mint-500 text-white text-sm px-3 py-2 rounded-xl hover:bg-mint-600 transition-colors font-medium"
              >
                <Plus className="w-4 h-4" />
                เพิ่มกลุ่ม
              </button>
            </div>

            {/* Add form */}
            {addingWebhook && (
              <form
                onSubmit={handleAddWebhook}
                className="bg-white rounded-2xl p-4 shadow-sm space-y-3 border-2 border-mint-200"
              >
                <div className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-mint-500" />
                  เพิ่มกลุ่ม Lark ใหม่
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">ชื่อกลุ่ม</label>
                  <input
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="เช่น Sales Interview, HR Interview"
                    required
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mint-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Webhook URL</label>
                  <input
                    value={newUrl}
                    onChange={e => setNewUrl(e.target.value)}
                    placeholder="https://open.larksuite.com/open-apis/bot/v2/hook/..."
                    required
                    type="url"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mint-400"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    ได้จาก Lark → เพิ่ม Bot → Incoming Webhook → Copy URL
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setAddingWebhook(false); setNewName(''); setNewUrl('') }}
                    className="flex-1 py-2 rounded-xl text-sm text-gray-500 border border-gray-200 hover:bg-gray-50"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-2 rounded-xl text-sm bg-mint-500 text-white font-medium hover:bg-mint-600 disabled:opacity-60"
                  >
                    {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                  </button>
                </div>
              </form>
            )}

            {/* Webhook list */}
            <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <h2 className="text-sm font-semibold text-gray-700">
                  กลุ่ม Lark ทั้งหมด ({webhooks.length} กลุ่ม)
                </h2>
              </div>

              {webhookLoading ? (
                <div className="text-center py-10 text-gray-400 text-sm">กำลังโหลด...</div>
              ) : webhooks.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <Bell className="w-10 h-10 text-gray-200 mx-auto" />
                  <p className="text-sm text-gray-400">ยังไม่มีกลุ่ม Lark</p>
                  <p className="text-xs text-gray-300">กดปุ่ม "เพิ่มกลุ่ม" เพื่อเริ่มต้น</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {webhooks.map(w => (
                    <div key={w.id} className="flex items-center gap-3 px-5 py-4">
                      <div className="w-9 h-9 rounded-full bg-mint-100 flex items-center justify-center shrink-0">
                        <Bell className="w-4 h-4 text-mint-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800">{w.name}</div>
                        <div className="text-xs text-gray-400 truncate flex items-center gap-1 mt-0.5">
                          <Link className="w-3 h-3 shrink-0" />
                          {w.webhook_url.replace('https://open.larksuite.com/open-apis/bot/v2/hook/', '.../')}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteWebhook(w.id, w.name)}
                        disabled={deleting === w.id}
                        className="p-2 rounded-xl text-red-400 hover:bg-red-50 transition-colors disabled:opacity-40"
                        title="ลบกลุ่มนี้"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Help */}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-sm text-blue-700 space-y-1">
              <div className="font-semibold">วิธีใช้งาน</div>
              <div>1. เพิ่มกลุ่ม Lark พร้อม Webhook URL ที่นี่</div>
              <div>2. Manager เลือกกลุ่มได้ตอนสร้าง slot</div>
              <div>3. เมื่อ HR จองแล้ว แจ้งเตือนจะไปที่กลุ่มที่เลือกไว้</div>
              <div className="text-xs text-blue-500 pt-1">
                💡 ถ้า Manager ไม่เลือกกลุ่ม จะใช้ webhook หลักจาก .env แทน
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
