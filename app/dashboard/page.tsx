'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { CalendarDays, Clock, CheckCircle2, Users, TrendingUp, CalendarCheck } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { Booking } from '@/lib/types'
import Image from 'next/image'

function formatThaiDateShort(d: string) {
  return new Date(d).toLocaleDateString('th-TH', {
    weekday: 'short', day: 'numeric', month: 'short', year: '2-digit'
  })
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [availableCount, setAvailableCount] = useState(0)
  const [managerCount, setManagerCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.replace('/login'); return }
    if (session.user.role === 'manager') { router.replace('/manager'); return }
  }, [session, status, router])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [bookingsRes, slotsRes, managersRes] = await Promise.all([
        fetch('/api/bookings'),
        fetch('/api/slots'),
        fetch('/api/managers'),
      ])
      const [bookingsData, slotsData, managersData] = await Promise.all([
        bookingsRes.json(), slotsRes.json(), managersRes.json()
      ])
      setBookings(Array.isArray(bookingsData) ? bookingsData : [])
      setAvailableCount(Array.isArray(slotsData) ? slotsData.length : 0)
      setManagerCount(Array.isArray(managersData) ? managersData.length : 0)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (session?.user.role !== 'manager') fetchData()
  }, [session, fetchData])

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mint-50">
        <div className="w-8 h-8 border-4 border-mint-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // คำนวณสถิติ
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const nextWeek = new Date(today)
  nextWeek.setDate(today.getDate() + 7)

  const confirmed = bookings.filter(b => b.status === 'confirmed')
  const upcoming = confirmed
    .filter(b => {
      const d = new Date(b.slot?.date ?? '')
      return d >= today
    })
    .sort((a, b) => {
      const da = a.slot?.date ?? ''
      const db = b.slot?.date ?? ''
      const ta = a.slot?.start_time ?? ''
      const tb = b.slot?.start_time ?? ''
      return da.localeCompare(db) || ta.localeCompare(tb)
    })

  const thisWeek = upcoming.filter(b => new Date(b.slot?.date ?? '') < nextWeek)
  const thisMonth = confirmed.filter(b => {
    const d = new Date(b.slot?.date ?? '')
    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
  })

  const stats = [
    { icon: CalendarCheck, label: 'สัมภาษณ์สัปดาห์นี้', value: thisWeek.length, color: 'text-blue-500', bg: 'bg-blue-50' },
    { icon: TrendingUp, label: 'จองเดือนนี้', value: thisMonth.length, color: 'text-purple-500', bg: 'bg-purple-50' },
    { icon: Clock, label: 'slot ว่างเหลือ', value: availableCount, color: 'text-mint-600', bg: 'bg-mint-50' },
    { icon: Users, label: 'Manager ทั้งหมด', value: managerCount, color: 'text-amber-500', bg: 'bg-amber-50' },
  ]

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
            <h1 className="text-lg font-bold text-gray-800">📊 Dashboard</h1>
            <p className="text-sm text-gray-500">ภาพรวมการนัดสัมภาษณ์</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          {stats.map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className={`w-11 h-11 rounded-2xl ${bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <div className={`text-2xl font-bold ${color}`}>{loading ? '—' : value}</div>
                <div className="text-xs text-gray-400 leading-tight">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Upcoming interviews */}
        <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-mint-500" />
            <h2 className="text-sm font-semibold text-gray-700">
              นัดสัมภาษณ์ที่กำลังจะมาถึง
            </h2>
            {upcoming.length > 0 && (
              <span className="ml-auto text-xs bg-mint-100 text-mint-700 px-2 py-0.5 rounded-full">
                {upcoming.length} นัด
              </span>
            )}
          </div>

          {loading ? (
            <div className="text-center py-10 text-gray-400 text-sm">กำลังโหลด...</div>
          ) : upcoming.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-gray-200 mx-auto" />
              <p className="text-sm text-gray-400">ยังไม่มีนัดที่กำลังจะมาถึง</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {upcoming.slice(0, 10).map(b => {
                const slotDate = b.slot?.date ?? ''
                const isToday = new Date(slotDate).toDateString() === today.toDateString()
                const isTomorrow = new Date(slotDate).toDateString() === new Date(today.getTime() + 86400000).toDateString()
                const tag = isToday ? '🔴 วันนี้' : isTomorrow ? '🟡 พรุ่งนี้' : null

                return (
                  <div key={b.id} className="px-5 py-4 flex items-center gap-3">
                    {/* Date badge */}
                    <div className="w-12 text-center shrink-0">
                      <div className="text-xs text-gray-400">
                        {new Date(slotDate).toLocaleDateString('th-TH', { month: 'short' })}
                      </div>
                      <div className="text-xl font-bold text-mint-600 leading-tight">
                        {new Date(slotDate).getDate()}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-800">{b.candidate_name}</span>
                        {tag && <span className="text-xs font-medium">{tag}</span>}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{b.position}</div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {b.slot?.start_time?.substring(0,5)} – {b.slot?.end_time?.substring(0,5)} น.
                        </span>
                        {b.slot?.manager && (
                          <span>👔 {(b.slot.manager as { name: string }).name}</span>
                        )}
                      </div>
                    </div>

                    {/* Date label */}
                    <div className="text-xs text-gray-400 text-right shrink-0 hidden sm:block">
                      {formatThaiDateShort(slotDate)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Past bookings summary */}
        {confirmed.length > upcoming.length && (
          <div className="bg-gray-50 rounded-2xl p-4 text-center">
            <p className="text-xs text-gray-400">
              มีการสัมภาษณ์ที่ผ่านมาแล้วทั้งหมด{' '}
              <span className="font-semibold text-gray-600">
                {confirmed.length - upcoming.length} นัด
              </span>
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
