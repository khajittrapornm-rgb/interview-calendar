'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { Search, Filter, CalendarDays, Users, CheckCircle2, GitCompare, X, Clock } from 'lucide-react'
import Navbar from '@/components/Navbar'
import SlotCard from '@/components/SlotCard'
import BookingModal from '@/components/BookingModal'
import { InterviewSlot, Profile } from '@/lib/types'
import toast from 'react-hot-toast'
import Image from 'next/image'

// ---- Overlap logic ----
function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
function minutesToTime(m: number) {
  const h = Math.floor(m / 60).toString().padStart(2, '0')
  const min = (m % 60).toString().padStart(2, '0')
  return `${h}:${min}`
}
function formatThaiDateShort(d: string) {
  return new Date(d).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' })
}

interface OverlapGroup {
  date: string
  overlapStart: string   // HH:mm
  overlapEnd: string     // HH:mm
  slots: InterviewSlot[] // 1 slot per selected manager
}

// ฟังก์ชัน helper หา combination แบบ iterative (ไม่ใช้ recursive ใน block)
function getCombinations(slotsByManager: InterviewSlot[][]): InterviewSlot[][] {
  let result: InterviewSlot[][] = [[]]
  for (const group of slotsByManager) {
    const next: InterviewSlot[][] = []
    for (const existing of result) {
      for (const slot of group) {
        next.push([...existing, slot])
      }
    }
    result = next
  }
  return result
}

function findOverlaps(slots: InterviewSlot[], selectedManagerIds: string[]): OverlapGroup[] {
  if (selectedManagerIds.length < 2) return []

  // Group available slots by date
  const byDate: Record<string, InterviewSlot[]> = {}
  slots
    .filter(s => s.status === 'available' && selectedManagerIds.includes(s.manager_id))
    .forEach(s => {
      if (!byDate[s.date]) byDate[s.date] = []
      byDate[s.date].push(s)
    })

  const results: OverlapGroup[] = []

  for (const date of Object.keys(byDate)) {
    const dateSlots = byDate[date]

    // Check if every selected manager has at least one slot on this date
    const managersOnDate = new Set(dateSlots.map(s => s.manager_id))
    if (!selectedManagerIds.every(id => managersOnDate.has(id))) continue

    const slotsByManager = selectedManagerIds.map(id => dateSlots.filter(s => s.manager_id === id))
    const combinations = getCombinations(slotsByManager)

    for (const chosen of combinations) {
      const maxStart = Math.max(...chosen.map(s => timeToMinutes(s.start_time)))
      const minEnd = Math.min(...chosen.map(s => timeToMinutes(s.end_time)))
      if (maxStart < minEnd) {
        results.push({
          date,
          overlapStart: minutesToTime(maxStart),
          overlapEnd: minutesToTime(minEnd),
          slots: chosen,
        })
      }
    }
  }

  // Deduplicate by same set of slot ids
  const seen = new Set<string>()
  return results.filter(g => {
    const key = g.slots.map(s => s.id).sort().join('|')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).sort((a, b) => a.date.localeCompare(b.date) || a.overlapStart.localeCompare(b.overlapStart))
}

// ---- Component ----
export default function HRPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [slots, setSlots] = useState<InterviewSlot[]>([])
  const [managers, setManagers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedManager, setSelectedManager] = useState<string>('all')
  const [searchDate, setSearchDate] = useState('')
  const [bookingSlot, setBookingSlot] = useState<InterviewSlot | null>(null)

  // Lark group filter
  const [selectedWebhookId, setSelectedWebhookId] = useState<string>('all')
  const [webhooks, setWebhooks] = useState<{id: string; name: string}[]>([])

  // Compare mode state
  const [compareMode, setCompareMode] = useState(false)
  const [selectedManagerIds, setSelectedManagerIds] = useState<string[]>([])
  const [overlapResults, setOverlapResults] = useState<OverlapGroup[] | null>(null)

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

  useEffect(() => {
    fetch('/api/admin/webhooks')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setWebhooks(d) })
      .catch(() => {})
  }, [])

  // Fetch ALL available slots (no filter) when entering compare mode
  const [allSlots, setAllSlots] = useState<InterviewSlot[]>([])
  const fetchAllSlots = useCallback(async () => {
    try {
      const res = await fetch('/api/slots')
      const data = await res.json()
      setAllSlots(Array.isArray(data) ? data : [])
    } catch {
      toast.error('โหลดข้อมูลไม่สำเร็จ')
    }
  }, [])

  function enterCompareMode() {
    setCompareMode(true)
    setSelectedManagerIds([])
    setOverlapResults(null)
    fetchAllSlots()
  }

  function exitCompareMode() {
    setCompareMode(false)
    setSelectedManagerIds([])
    setOverlapResults(null)
  }

  function toggleManager(id: string) {
    setSelectedManagerIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
    setOverlapResults(null) // reset results when selection changes
  }

  function handleFindOverlap() {
    if (selectedManagerIds.length < 2) {
      toast.error('กรุณาเลือก Manager อย่างน้อย 2 คน')
      return
    }
    const results = findOverlaps(allSlots, selectedManagerIds)
    setOverlapResults(results)
    if (results.length === 0) {
      toast('ไม่พบเวลาที่ทุกคนว่างตรงกัน', { icon: '😔' })
    } else {
      toast.success(`พบ ${results.length} ช่วงเวลาที่ว่างตรงกัน!`)
    }
  }

  // Filter by Lark group
  const filteredSlots = selectedWebhookId === 'all'
    ? slots
    : slots.filter(s => s.lark_webhook?.id === selectedWebhookId)

  // Group slots by manager (normal mode)
  const grouped = filteredSlots.reduce<Record<string, InterviewSlot[]>>((acc, slot) => {
    const key = slot.manager_id
    if (!acc[key]) acc[key] = []
    acc[key].push(slot)
    return acc
  }, {})

  const totalAvailable = filteredSlots.length

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
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-800">
              HR Dashboard 🧑‍💼
            </h1>
            <p className="text-sm text-gray-500">
              มี <span className="font-semibold text-mint-600">{totalAvailable}</span> slot ว่าง
              จาก <span className="font-semibold text-mint-600">{managers.length}</span> Manager
            </p>
          </div>
          {/* Compare button */}
          {!compareMode ? (
            <button
              onClick={enterCompareMode}
              className="flex items-center gap-1.5 bg-blue-500 text-white text-xs px-3 py-2 rounded-xl hover:bg-blue-600 transition-colors font-medium shrink-0"
            >
              <GitCompare className="w-3.5 h-3.5" />
              เปรียบเทียบตาราง
            </button>
          ) : (
            <button
              onClick={exitCompareMode}
              className="flex items-center gap-1.5 bg-gray-200 text-gray-600 text-xs px-3 py-2 rounded-xl hover:bg-gray-300 transition-colors font-medium shrink-0"
            >
              <X className="w-3.5 h-3.5" />
              ออกจากโหมดเปรียบเทียบ
            </button>
          )}
        </div>

        {/* ===== COMPARE MODE ===== */}
        {compareMode && (
          <div className="space-y-4">
            {/* Instruction */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-700">
              <div className="font-semibold mb-1 flex items-center gap-2">
                <GitCompare className="w-4 h-4" />
                โหมดเปรียบเทียบตาราง
              </div>
              เลือก Manager ที่ต้องการเชิญสัมภาษณ์ด้วย แล้วกด &quot;หาเวลาว่างตรงกัน&quot;
            </div>

            {/* Manager checkboxes */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                เลือก Manager ({selectedManagerIds.length} คนที่เลือก)
              </div>
              <div className="space-y-2">
                {managers.map(m => {
                  const checked = selectedManagerIds.includes(m.id)
                  return (
                    <label
                      key={m.id}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                        checked ? 'bg-blue-50 border-2 border-blue-300' : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleManager(m.id)}
                        className="w-4 h-4 accent-blue-500 cursor-pointer"
                      />
                      <div className="w-8 h-8 rounded-full bg-mint-100 flex items-center justify-center text-sm font-bold text-mint-700 shrink-0">
                        {m.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-800">{m.name}</div>
                        {m.department && <div className="text-xs text-gray-400">{m.department}</div>}
                      </div>
                      {checked && (
                        <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">เลือกแล้ว</span>
                      )}
                    </label>
                  )
                })}
              </div>

              <button
                onClick={handleFindOverlap}
                disabled={selectedManagerIds.length < 2}
                className="w-full mt-4 bg-blue-500 text-white py-3 rounded-xl font-semibold hover:bg-blue-600 transition-colors disabled:opacity-40 flex items-center justify-center gap-2 text-sm"
              >
                <Search className="w-4 h-4" />
                หาเวลาว่างตรงกัน{selectedManagerIds.length >= 2 ? ` (${selectedManagerIds.length} คน)` : ''}
              </button>
              {selectedManagerIds.length < 2 && (
                <p className="text-xs text-center text-gray-400 mt-2">เลือกอย่างน้อย 2 คน</p>
              )}
            </div>

            {/* Overlap Results */}
            {overlapResults !== null && (
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-3">
                  {overlapResults.length > 0
                    ? `✅ พบ ${overlapResults.length} ช่วงเวลาที่ว่างตรงกัน`
                    : '😔 ไม่พบเวลาที่ทุกคนว่างตรงกัน'}
                </div>

                {overlapResults.length === 0 ? (
                  <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
                    <CalendarDays className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">ยังไม่มี slot ที่ว่างตรงกันในขณะนี้</p>
                    <p className="text-xs text-gray-400 mt-1">รอให้ Manager เพิ่มเวลาว่างเพิ่มเติม</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {overlapResults.map((group, i) => (
                      <div key={i} className="bg-white rounded-2xl shadow-sm overflow-hidden border-l-4 border-blue-400">
                        {/* Date + overlap time header */}
                        <div className="bg-blue-50 px-4 py-3 flex items-center gap-3">
                          <CalendarDays className="w-4 h-4 text-blue-500 shrink-0" />
                          <div>
                            <div className="text-sm font-semibold text-blue-800">
                              {formatThaiDateShort(group.date)}
                            </div>
                            <div className="text-xs text-blue-600 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3" />
                              ว่างตรงกัน: <strong>{group.overlapStart} – {group.overlapEnd} น.</strong>
                              <span className="text-blue-400 ml-1">
                                ({Math.round((timeToMinutes(group.overlapEnd) - timeToMinutes(group.overlapStart)))} นาที)
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Manager slots involved */}
                        <div className="px-4 py-3 space-y-2">
                          <p className="text-xs text-gray-500 font-medium">Slot ของแต่ละ Manager ที่ทับกัน:</p>
                          {group.slots.map(slot => (
                            <div key={slot.id} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
                              <div className="w-6 h-6 rounded-full bg-mint-100 flex items-center justify-center text-xs font-bold text-mint-700 shrink-0">
                                {slot.manager?.name?.charAt(0) ?? 'M'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium text-gray-700">{slot.manager?.name}</div>
                                <div className="text-xs text-gray-400">
                                  ว่าง {slot.start_time.substring(0,5)} – {slot.end_time.substring(0,5)} น.
                                </div>
                              </div>
                              <button
                                onClick={() => setBookingSlot(slot)}
                                className="text-xs bg-mint-500 text-white px-3 py-1.5 rounded-lg hover:bg-mint-600 transition-colors font-medium shrink-0"
                              >
                                จองกับ {slot.manager?.name?.split(' ')[0]}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ===== NORMAL MODE ===== */}
        {!compareMode && (
          <>
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
              {/* Lark group filter */}
          {webhooks.length > 0 && (
            <div>
              <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
                🔔 กลุ่ม Lark
              </label>
              <select
                value={selectedWebhookId}
                onChange={e => setSelectedWebhookId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mint-400"
              >
                <option value="all">ทั้งหมด</option>
                {webhooks.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          )}
          {(selectedManager !== 'all' || searchDate || selectedWebhookId !== 'all') && (
                <button
                  onClick={() => { setSelectedManager('all'); setSearchDate(''); setSelectedWebhookId('all') }}
                  className="text-xs text-gray-400 hover:text-mint-600 underline"
                >
                  ล้างตัวกรอง
                </button>
              )}
            </div>

            {/* Slot list */}
            {loading ? (
              <div className="text-center py-12 text-gray-400 text-sm">กำลังโหลด...</div>
            ) : filteredSlots.length === 0 ? (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-mint-200 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">ไม่พบ slot ว่างในขณะนี้</p>
                <p className="text-xs text-gray-400 mt-1">ลองเปลี่ยนตัวกรอง หรือรอให้ Manager เพิ่มเวลาว่าง</p>
              </div>
            ) : selectedManager !== 'all' ? (
              <div className="space-y-3">
                {filteredSlots.map(slot => (
                  <SlotCard
                    key={slot.id}
                    slot={slot}
                    onBook={setBookingSlot}
                    showManager
                  />
                ))}
              </div>
            ) : (
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
          </>
        )}
      </main>

      {bookingSlot && (
        <BookingModal
          slot={bookingSlot}
          onClose={() => setBookingSlot(null)}
          onBooked={() => {
            fetchData()
            fetchAllSlots()
            setOverlapResults(null) // refresh overlap results after booking
          }}
        />
      )}
    </div>
  )
}
