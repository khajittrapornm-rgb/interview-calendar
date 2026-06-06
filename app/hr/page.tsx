'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { Search, Filter, CalendarDays, Users, CheckCircle2 } from 'lucide-react'
import Navbar from '@/components/Navbar'
import SlotCard from '@/components/SlotCard'
import BookingModal from '@/components/BookingModal'
import { InterviewSlot, Profile } from '@/lib/types'
import toast from 'react-hot-toast'
import Image from 'next/image'

export default function HRPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [slots, setSlots] = useState<InterviewSlot[]>([])
  const [managers, setManagers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedManager, setSelectedManager] = useState<string>('all')
  const [searchDate, setSearchDate] = useState('')
  const [bookingSlot, setBookingSlot] = useState<InterviewSlot | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.replace('/login'); return }
    if (session.user.role !== 'hr') { router.replace('/manager'); return }
  }, [session, status, router])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedManager !== 'all') params.set('manager_id', selectedManager)
      if (searchDate) params.set('date', searchDate)

      const [slotsRes, managersRes] = await Promise.all([
        fetch(`/api/slots?${params}`),
        fetch('/api/managers'),
      ])
      const [slotsData, managersData] = await Promise.all([slotsRes.json(), managersRes.json()])
      setSlots(Array.isArray(slotsData) ? slotsData : [])
      setManagers(Array.isArray(managersData) ? managersData : [])
    } catch {
      toast.error('โหลดข้อมูลไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [selectedManager, searchDate])

  useEffect(() => {
    if (session?.user.role === 'hr') fetchData()
  }, [session, fetchData])

  // Group slots by manager
  const grouped = slots.reduce<Record<string, InterviewSlot[]>>((acc, slot) => {
    const key = slot.manager_id
    if (!acc[key]) acc[key] = []
    acc[key].push(slot)
    return acc
  }, {})

  const totalAvailable = slots.length

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

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Welcome */}
        <div className="bg-white rounded-3xl p-5 flex items-center gap-4 shadow-sm">
          <div className="relative w-16 h-16 shrink-0">
            <Image src="/capybara.jpg" alt="mascot" fill className="object-contain" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">
              HR Dashboard 🧑‍💼
            </h1>
            <p className="text-sm text-gray-500">
              มี <span className="font-semibold text-mint-600">{totalAvailable}</span> slot ว่าง
              จาก <span className="font-semibold text-mint-600">{managers.length}</span> Manager
            </p>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: CalendarDays, label: 'slot ว่าง', value: totalAvailable, color: 'text-mint-600' },
            { icon: Users, label: 'Manager', value: managers.length, color: 'text-blue-500' },
            { icon: CheckCircle2, label: 'พร้อมจอง', value: totalAvailable, color: 'text-emerald-500' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-white rounded-2xl p-3 shadow-sm text-center">
              <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
              <div className={`text-xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-gray-400">{label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
            <Filter className="w-4 h-4" />
            กรองข้อมูล
          </div>
          <div className="grid grid-cols-2 gap-3">
            {/* Manager filter */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Manager</label>
              <select
                value={selectedManager}
                onChange={e => setSelectedManager(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mint-400"
              >
                <option value="all">ทั้งหมด</option>
                {managers.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            {/* Date filter */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">วันที่</label>
              <input
                type="date"
                value={searchDate}
                onChange={e => setSearchDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mint-400"
              />
            </div>
          </div>
          {(selectedManager !== 'all' || searchDate) && (
            <button
              onClick={() => { setSelectedManager('all'); setSearchDate('') }}
              className="text-xs text-gray-400 hover:text-mint-600 underline"
            >
              ล้างตัวกรอง
            </button>
          )}
        </div>

        {/* Slot list */}
        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm">กำลังโหลด...</div>
        ) : slots.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-mint-200 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">ไม่พบ slot ว่างในขณะนี้</p>
            <p className="text-xs text-gray-400 mt-1">ลองเปลี่ยนตัวกรอง หรือรอให้ Manager เพิ่มเวลาว่าง</p>
          </div>
        ) : selectedManager !== 'all' ? (
          // Single manager view
          <div className="space-y-3">
            {slots.map(slot => (
              <SlotCard
                key={slot.id}
                slot={slot}
                onBook={setBookingSlot}
                showManager
              />
            ))}
          </div>
        ) : (
          // Grouped by manager
          <div className="space-y-5">
            {Object.entries(grouped).map(([managerId, managerSlots]) => {
              const mgr = managerSlots[0]?.manager
              return (
                <div key={managerId}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-mint-200 flex items-center justify-center text-sm font-bold text-mint-700">
                      {mgr?.name?.charAt(0) ?? 'M'}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-800">{mgr?.name}</div>
                      {mgr?.department && (
                        <div className="text-xs text-gray-400">{mgr.department}</div>
                      )}
                    </div>
                    <span className="ml-auto text-xs bg-mint-100 text-mint-700 px-2 py-0.5 rounded-full">
                      {managerSlots.length} slot
                    </span>
                  </div>
                  <div className="space-y-2 pl-10">
                    {managerSlots.map(slot => (
                      <SlotCard
                        key={slot.id}
                        slot={slot}
                        onBook={setBookingSlot}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {bookingSlot && (
        <BookingModal
          slot={bookingSlot}
          onClose={() => setBookingSlot(null)}
          onBooked={fetchData}
        />
      )}
    </div>
  )
}
