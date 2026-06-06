'use client'

import { useState } from 'react'
import { X, Plus, CalendarDays, MousePointerClick, Clock, AlertCircle } from 'lucide-react'
import { generateTimeSlots, addMinutes, formatThaiDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Props {
  onClose: () => void
  onAdded: () => void
}

const TIME_SLOTS = generateTimeSlots('08:00', '18:00', 30)
const DURATIONS = [30, 45, 60, 90]

type Mode = 'manual' | 'calendar'

interface BusySlot {
  start: string
  end: string
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function isTimeBusy(time: string, busy: BusySlot[], duration: number) {
  const startMin = timeToMinutes(time)
  const endMin = startMin + duration
  return busy.some(b => {
    const bs = timeToMinutes(b.start)
    const be = timeToMinutes(b.end)
    return startMin < be && endMin > bs
  })
}

export default function AddSlotModal({ onClose, onAdded }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const [mode, setMode] = useState<Mode>('manual')
  const [date, setDate] = useState(today)
  const [startTime, setStartTime] = useState('09:00')
  const [duration, setDuration] = useState(60)
  const [loading, setLoading] = useState(false)

  // calendar mode state
  const [busy, setBusy] = useState<BusySlot[]>([])
  const [calLoading, setCalLoading] = useState(false)
  const [calError, setCalError] = useState('')
  const [calLoaded, setCalLoaded] = useState(false)

  const endTime = addMinutes(startTime, duration)

  async function loadCalendar(d: string) {
    setCalLoading(true)
    setCalError('')
    setCalLoaded(false)
    try {
      const res = await fetch(`/api/calendar/busy?date=${d}`)
      const data = await res.json()
      if (!res.ok) {
        if (data.error === 'token_expired') {
          setCalError('session หมดอายุ กรุณา logout แล้ว login ใหม่')
        } else {
          setCalError(data.error ?? 'โหลด Calendar ไม่ได้')
        }
        return
      }
      setBusy(data.busy ?? [])
      setCalLoaded(true)
    } catch {
      setCalError('เชื่อมต่อ Google Calendar ไม่ได้')
    } finally {
      setCalLoading(false)
    }
  }

  function handleDateChange(d: string) {
    setDate(d)
    if (mode === 'calendar') loadCalendar(d)
  }

  function handleModeChange(m: Mode) {
    setMode(m)
    if (m === 'calendar' && !calLoaded) loadCalendar(date)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (mode === 'calendar' && isTimeBusy(startTime, busy, duration)) {
      toast.error('เวลานี้ติดนัดใน Google Calendar แล้ว')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, start_time: startTime, end_time: endTime, duration_minutes: duration }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('เพิ่ม slot สำเร็จ!')
      onAdded()
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  const selectedIsBusy = mode === 'calendar' && calLoaded && isTimeBusy(startTime, busy, duration)

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 sticky top-0 bg-white rounded-t-3xl">
          <h2 className="text-lg font-bold text-gray-800">เพิ่มเวลาว่าง</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="px-6 pb-2">
          <div className="flex gap-2 bg-gray-50 rounded-xl p-1">
            <button
              type="button"
              onClick={() => handleModeChange('manual')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors',
                mode === 'manual' ? 'bg-white text-mint-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              )}
            >
              <MousePointerClick className="w-3.5 h-3.5" />
              เลือกเองเลย
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('calendar')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors',
                mode === 'calendar' ? 'bg-white text-mint-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              )}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              ดู Calendar ก่อน
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4 pt-2">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">วันที่</label>
            <input
              type="date"
              value={date}
              min={today}
              onChange={e => handleDateChange(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-mint-400"
            />
          </div>

          {/* Calendar view */}
          {mode === 'calendar' && (
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <div className="bg-mint-50 px-3 py-2 text-xs font-medium text-mint-700 flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5" />
                ตารางนัดหมาย {formatThaiDate(date)}
              </div>

              {calLoading && (
                <div className="py-6 text-center text-sm text-gray-400">กำลังโหลด Calendar...</div>
              )}

              {calError && (
                <div className="p-3 flex items-start gap-2 text-xs text-red-600">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  {calError}
                </div>
              )}

              {calLoaded && (
                <div className="p-3">
                  {busy.length === 0 ? (
                    <p className="text-xs text-center text-gray-400 py-2">ไม่มีนัดหมายในวันนี้ ✨</p>
                  ) : (
                    <div className="space-y-1.5">
                      <p className="text-xs text-gray-400 mb-2">นัดที่มีอยู่แล้ว:</p>
                      {busy.map((b, i) => (
                        <div key={i} className="flex items-center gap-2 bg-red-50 rounded-lg px-2.5 py-1.5">
                          <Clock className="w-3 h-3 text-red-400 shrink-0" />
                          <span className="text-xs text-red-600 font-medium">
                            {b.start} – {b.end} น.
                          </span>
                          <span className="text-xs text-red-400">(ติดนัด)</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ระยะเวลาสัมภาษณ์</label>
            <div className="grid grid-cols-4 gap-2">
              {DURATIONS.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`py-2 rounded-xl text-sm font-medium transition-colors ${
                    duration === d ? 'bg-mint-500 text-white' : 'bg-mint-50 text-mint-700 hover:bg-mint-100'
                  }`}
                >
                  {d}น.
                </button>
              ))}
            </div>
          </div>

          {/* Start time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">เวลาเริ่ม</label>
            {mode === 'manual' ? (
              <select
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-mint-400"
              >
                {TIME_SLOTS.map(t => (
                  <option key={t} value={t}>{t} น.</option>
                ))}
              </select>
            ) : (
              <div className="grid grid-cols-4 gap-1.5 max-h-44 overflow-y-auto pr-1 scrollbar-hide">
                {TIME_SLOTS.map(t => {
                  const busy_t = calLoaded && isTimeBusy(t, busy, duration)
                  return (
                    <button
                      key={t}
                      type="button"
                      disabled={busy_t}
                      onClick={() => setStartTime(t)}
                      className={cn(
                        'py-1.5 rounded-lg text-xs font-medium transition-colors',
                        busy_t
                          ? 'bg-red-50 text-red-300 cursor-not-allowed line-through'
                          : startTime === t
                          ? 'bg-mint-500 text-white'
                          : 'bg-mint-50 text-mint-700 hover:bg-mint-100'
                      )}
                    >
                      {t}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Preview */}
          <div className={cn(
            'rounded-xl p-3 text-sm',
            selectedIsBusy
              ? 'bg-red-50 text-red-600'
              : 'bg-mint-50 text-mint-700'
          )}>
            {selectedIsBusy
              ? '⚠️ เวลานี้ติดนัดใน Google Calendar แล้ว กรุณาเลือกเวลาอื่น'
              : <>สัมภาษณ์เวลา <strong>{startTime} – {endTime} น.</strong></>
            }
          </div>

          <button
            type="submit"
            disabled={loading || selectedIsBusy}
            className="w-full bg-mint-500 text-white py-3 rounded-xl font-semibold hover:bg-mint-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {loading ? 'กำลังบันทึก...' : 'บันทึก slot นี้'}
          </button>
        </form>
      </div>
    </div>
  )
}
