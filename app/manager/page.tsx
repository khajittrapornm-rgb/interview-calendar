'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { Plus, CalendarDays, Clock, CheckCircle } from 'lucide-react'
import Navbar from '@/components/Navbar'
import SlotCard from '@/components/SlotCard'
import AddSlotModal from '@/components/AddSlotModal'
import { InterviewSlot } from '@/lib/types'
import toast from 'react-hot-toast'
import Image from 'next/image'

type TabType = 'available' | 'booked' | 'all'

export default function ManagerPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [slots, setSlots] = useState<InterviewSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [tab, setTab] = useState<TabType>('available')

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.replace('/login'); return }
    if (session.user.role !== 'manager') { router.replace('/hr'); return }
  }, [session, status, router])

  const fetchSlots = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/slots')
      const data = await res.json()
      setSlots(Array.isArray(data) ? data : [])
    } catch {
      toast.error('โหลดข้อมูลไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (session?.user.role === 'manager') fetchSlots()
  }, [session, fetchSlots])

  async function handleDelete(id: string) {
    if (!confirm('ต้องการลบ slot นี้?')) return
    try {
      const res = await fetch(`/api/slots/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error)
      }
      toast.success('ลบ slot แล้ว')
      fetchSlots()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'ลบไม่สำเร็จ')
    }
  }

  const filtered = slots.filter(s => {
    if (tab === 'available') return s.status === 'available'
    if (tab === 'booked') return s.status === 'booked'
    return s.status !== 'cancelled'
  })

  const stats = {
    available: slots.filter(s => s.status === 'available').length,
    booked: slots.filter(s => s.status === 'booked').length,
  }

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mint-50">
        <div className="w-8 h-8 border-4 border-mint-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-mint-50">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Welcome */}
        <div className="bg-white rounded-3xl p-5 flex items-center gap-4 shadow-sm">
          <div className="relative w-16 h-16 shrink-0">
            <Image src="/capybara.png" alt="mascot" fill className="object-contain" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">
              สวัสดี, {session.user.name?.split(' ')[0]}! 👋
            </h1>
            <p className="text-sm text-gray-500">กำหนดเวลาว่างเพื่อให้ HR จองนัดสัมภาษณ์</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
            <div className="flex items-center justify-center gap-2 text-mint-600 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-medium">เวลาว่าง</span>
            </div>
            <div className="text-3xl font-bold text-mint-600">{stats.available}</div>
            <div className="text-xs text-gray-400">slot</div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
            <div className="flex items-center justify-center gap-2 text-amber-500 mb-1">
              <CheckCircle className="w-4 h-4" />
              <span className="text-xs font-medium">จองแล้ว</span>
            </div>
            <div className="text-3xl font-bold text-amber-500">{stats.booked}</div>
            <div className="text-xs text-gray-400">slot</div>
          </div>
        </div>

        {/* Add button */}
        <button
          onClick={() => setShowAdd(true)}
          className="w-full bg-mint-500 text-white py-3.5 rounded-2xl font-semibold hover:bg-mint-600 transition-colors shadow-sm flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          เพิ่มเวลาว่างสำหรับสัมภาษณ์
        </button>

        {/* Tabs */}
        <div className="flex gap-2 bg-white rounded-2xl p-1.5 shadow-sm">
          {([
            { key: 'available', label: 'ว่าง', icon: Clock },
            { key: 'booked', label: 'จองแล้ว', icon: CheckCircle },
            { key: 'all', label: 'ทั้งหมด', icon: CalendarDays },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-colors ${
                tab === key
                  ? 'bg-mint-500 text-white shadow-sm'
                  : 'text-gray-500 hover:text-mint-600'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              {key !== 'all' && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  tab === key ? 'bg-white/20' : 'bg-gray-100'
                }`}>
                  {key === 'available' ? stats.available : stats.booked}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Slot list */}
        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm">กำลังโหลด...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <CalendarDays className="w-12 h-12 text-mint-200 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">ยังไม่มี slot ในหมวดนี้</p>
            {tab === 'available' && (
              <button
                onClick={() => setShowAdd(true)}
                className="mt-3 text-mint-600 text-sm underline"
              >
                เพิ่มเวลาว่างเลย
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(slot => (
              <SlotCard
                key={slot.id}
                slot={slot}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>

      {showAdd && (
        <AddSlotModal
          onClose={() => setShowAdd(false)}
          onAdded={fetchSlots}
        />
      )}
    </div>
  )
}
