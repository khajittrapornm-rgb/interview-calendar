'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { CalendarDays, Clock, CheckCircle2, Users, TrendingUp, CalendarCheck, Filter, Download } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { Booking } from '@/lib/types'
import Image from 'next/image'

function formatThaiDateShort(d: string) {
  return new Date(d).toLocaleDateString('th-TH', {
    weekday: 'short', day: 'numeric', month: 'short', year: '2-digit'
  })
}

function exportToCSV(bookings: Booking[], filename: string) {
  const headers = ['วันที่สัมภาษณ์', 'เวลาเริ่ม', 'เวลาจบ', 'ชื่อผู้สมัคร', 'ตำแหน่ง', 'แผนก', 'Manager', 'HR ที่จอง', 'กลุ่ม Lark', 'สถานะ']

  const rows = bookings.map(b => [
    b.slot?.date ?? '',
    b.slot?.start_time?.substring(0, 5) ?? '',
    b.slot?.end_time?.substring(0, 5) ?? '',
    b.candidate_name,
    b.position,
    b.department ?? '',
    (b.slot?.manager as { name: string } | undefined)?.name ?? '',
    (b.hr as { name: string } | undefined)?.name ?? '',
    (b.slot as { lark_webhook?: { name: string } } | undefined)?.lark_webhook?.name ?? '',
    b.status === 'confirmed' ? 'ยืนยัน' : 'ยกเลิก',
  ])

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  // BOM สำหรับ Excel ภาษาไทย
  const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

interface HRUser { id: string; name: string; email: string }
interface LarkGroup { id: string; name: string }

type PeriodFilter = 'week' | 'month' | 'all'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [allBookings, setAllBookings] = useState<Booking[]>([])
  const [availableCount, setAvailableCount] = useState(0)
  const [managerCount, setManagerCount] = useState(0)
  const [hrUsers, setHrUsers] = useState<HRUser[]>([])
  const [larkGroups, setLarkGroups] = useState<LarkGroup[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [filterHR, setFilterHR] = useState<string>('all')
  const [filterGroup, setFilterGroup] = useState<string>('all')
  const [filterPeriod, setFilterPeriod] = useState<PeriodFilter>('all')

  const isAdmin = session?.user.role === 'admin'

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.replace('/login'); return }
    if (session.user.role === 'manager') { router.replace('/manager'); return }
  }, [session, status, router])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [bookingsRes, slotsRes, managersRes, webhooksRes] = await Promise.all([
        fetch('/api/bookings'),
        fetch('/api/slots'),
        fetch('/api/managers'),
        fetch('/api/admin/webhooks'),
      ])
      const [bookingsData, slotsData, managersData, webhooksData] = await Promise.all([
        bookingsRes.json(), slotsRes.json(), managersRes.json(), webhooksRes.json()
      ])
      setAllBookings(Array.isArray(bookingsData) ? bookingsData : [])
      setAvailableCount(Array.isArray(slotsData) ? slotsData.length : 0)
      setManagerCount(Array.isArray(managersData) ? managersData.length : 0)
      setLarkGroups(Array.isArray(webhooksData) ? webhooksData : [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  // ดึง HR users (admin เท่านั้น)
  useEffect(() => {
    if (isAdmin) {
      fetch('/api/admin/users')
        .then(r => r.json())
        .then(d => {
          if (Array.isArray(d)) setHrUsers(d.filter((u: HRUser & { role: string }) => u.role === 'hr'))
        })
        .catch(() => {})
    }
  }, [isAdmin])

  useEffect(() => {
    if (session?.user.role !== 'manager') fetchData()
  }, [session, fetchData])

  // คำนวณ filtered bookings
  const today = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d
  }, [])

  const filteredBookings = useMemo(() => {
    let list = allBookings.filter(b => b.status === 'confirmed')

    // Filter by HR
    if (filterHR !== 'all') list = list.filter(b => b.hr_id === filterHR)

    // Filter by Lark group
    if (filterGroup !== 'all') {
      list = list.filter(b => (b.slot as { lark_webhook_id?: string })?.lark_webhook_id === filterGroup)
    }

    // Filter by period
    if (filterPeriod === 'week') {
      const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7)
      list = list.filter(b => {
        const d = new Date(b.slot?.date ?? '')
        return d >= today && d < nextWeek
      })
    } else if (filterPeriod === 'month') {
      list = list.filter(b => {
        const d = new Date(b.slot?.date ?? '')
        return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
      })
    }

    return list.sort((a, b) => {
      const da = a.slot?.date ?? ''; const db = b.slot?.date ?? ''
      const ta = a.slot?.start_time ?? ''; const tb = b.slot?.start_time ?? ''
      return da.localeCompare(db) || ta.localeCompare(tb)
    })
  }, [allBookings, filterHR, filterGroup, filterPeriod, today])

  // base = filtered by HR + group (ไม่รวม period filter) เพื่อคำนวณ stats
  const baseBookings = useMemo(() => {
    let list = allBookings.filter(b => b.status === 'confirmed')
    if (filterHR !== 'all') list = list.filter(b => b.hr_id === filterHR)
    if (filterGroup !== 'all') list = list.filter(b => (b.slot as { lark_webhook_id?: string })?.lark_webhook_id === filterGroup)
    return list
  }, [allBookings, filterHR, filterGroup])

  const nextWeek = useMemo(() => { const d = new Date(today); d.setDate(today.getDate() + 7); return d }, [today])

  const thisWeekCount = useMemo(() => baseBookings.filter(b => {
    const d = new Date(b.slot?.date ?? '')
    return d >= today && d < nextWeek
  }).length, [baseBookings, today, nextWeek])

  const thisMonthCount = useMemo(() => baseBookings.filter(b => {
    const d = new Date(b.slot?.date ?? '')
    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
  }).length, [baseBookings, today])

  const totalCount = baseBookings.length

  const hasFilter = filterHR !== 'all' || filterGroup !== 'all' || filterPeriod !== 'all'

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mint-50">
        <div className="w-8 h-8 border-4 border-mint-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const stats = [
    { icon: CalendarCheck, label: 'สัปดาห์นี้', value: thisWeekCount, color: 'text-blue-500', bg: 'bg-blue-50' },
    { icon: TrendingUp, label: 'เดือนนี้', value: thisMonthCount, color: 'text-purple-500', bg: 'bg-purple-50' },
    { icon: CheckCircle2, label: 'ทั้งหมด', value: totalCount, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { icon: Clock, label: 'slot ว่างเหลือ', value: availableCount, color: 'text-mint-600', bg: 'bg-mint-50' },
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

        {/* Stats (ภาพรวมทั้งหมดเสมอ) */}
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

        {/* Filters */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
            <Filter className="w-4 h-4" />
            กรองรายการสัมภาษณ์
          </div>

          {/* Period filter */}
          <div className="flex gap-2">
            {([
              { key: 'all', label: 'ทั้งหมด' },
              { key: 'week', label: '7 วันข้างหน้า' },
              { key: 'month', label: 'เดือนนี้' },
            ] as { key: PeriodFilter; label: string }[]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilterPeriod(key)}
                className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors ${
                  filterPeriod === key
                    ? 'bg-mint-500 text-white'
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* HR filter (admin only) */}
            {isAdmin && hrUsers.length > 0 && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">🧑‍💼 HR</label>
                <select
                  value={filterHR}
                  onChange={e => setFilterHR(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mint-400"
                >
                  <option value="all">ทุก HR</option>
                  {hrUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Lark group filter */}
            {larkGroups.length > 0 && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">🔔 กลุ่ม Interview</label>
                <select
                  value={filterGroup}
                  onChange={e => setFilterGroup(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mint-400"
                >
                  <option value="all">ทุกกลุ่ม</option>
                  {larkGroups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {hasFilter && (
            <button
              onClick={() => { setFilterHR('all'); setFilterGroup('all'); setFilterPeriod('all') }}
              className="text-xs text-gray-400 hover:text-mint-600 underline"
            >
              ล้างตัวกรอง
            </button>
          )}
        </div>

        {/* Booking list */}
        <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-mint-500" />
            <h2 className="text-sm font-semibold text-gray-700">
              {filterPeriod === 'week' ? 'สัมภาษณ์ 7 วันข้างหน้า'
                : filterPeriod === 'month' ? 'สัมภาษณ์เดือนนี้'
                : 'นัดสัมภาษณ์ทั้งหมด'}
            </h2>
            <span className="text-xs bg-mint-100 text-mint-700 px-2 py-0.5 rounded-full">
              {filteredBookings.length} นัด
            </span>
            <button
              onClick={() => {
                const date = new Date().toISOString().split('T')[0]
                exportToCSV(filteredBookings, `interview-${date}.csv`)
              }}
              disabled={filteredBookings.length === 0}
              className="ml-auto flex items-center gap-1.5 text-xs bg-emerald-500 text-white px-3 py-1.5 rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-40 font-medium"
            >
              <Download className="w-3.5 h-3.5" />
              Export Excel
            </button>
          </div>

          {loading ? (
            <div className="text-center py-10 text-gray-400 text-sm">กำลังโหลด...</div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-gray-200 mx-auto" />
              <p className="text-sm text-gray-400">ไม่พบรายการที่ตรงกับตัวกรอง</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filteredBookings.map(b => {
                const slotDate = b.slot?.date ?? ''
                const isPast = new Date(slotDate) < today
                const isToday = new Date(slotDate).toDateString() === today.toDateString()
                const isTomorrow = new Date(slotDate).toDateString() === new Date(today.getTime() + 86400000).toDateString()
                const tag = isToday ? '🔴 วันนี้' : isTomorrow ? '🟡 พรุ่งนี้' : null

                return (
                  <div key={b.id} className={`px-5 py-4 flex items-center gap-3 ${isPast ? 'opacity-50' : ''}`}>
                    {/* Date badge */}
                    <div className="w-12 text-center shrink-0">
                      <div className="text-xs text-gray-400">
                        {new Date(slotDate).toLocaleDateString('th-TH', { month: 'short' })}
                      </div>
                      <div className={`text-xl font-bold leading-tight ${isPast ? 'text-gray-400' : 'text-mint-600'}`}>
                        {new Date(slotDate).getDate()}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-800">{b.candidate_name}</span>
                        {tag && <span className="text-xs font-medium">{tag}</span>}
                        {isPast && <span className="text-xs text-gray-400">✓ ผ่านมาแล้ว</span>}
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
                        {isAdmin && b.hr && (
                          <span>🧑‍💼 {(b.hr as { name: string }).name}</span>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-gray-400 text-right shrink-0 hidden sm:block">
                      {formatThaiDateShort(slotDate)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
