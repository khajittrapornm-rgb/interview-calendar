'use client'

import { InterviewSlot } from '@/lib/types'
import { formatThaiDate, formatTime } from '@/lib/utils'
import { Clock, Trash2, Video, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  slot: InterviewSlot
  onDelete?: (id: string) => void
  onBook?: (slot: InterviewSlot) => void
  showManager?: boolean
}

const statusLabel: Record<string, { text: string; color: string }> = {
  available: { text: 'ว่าง', color: 'bg-mint-100 text-mint-700' },
  booked: { text: 'จองแล้ว', color: 'bg-amber-100 text-amber-700' },
  cancelled: { text: 'ยกเลิก', color: 'bg-gray-100 text-gray-500' },
}

export default function SlotCard({ slot, onDelete, onBook, showManager }: Props) {
  const s = statusLabel[slot.status] ?? statusLabel.available

  return (
    <div
      className={cn(
        'rounded-2xl border p-4 bg-white shadow-sm transition-all',
        slot.status === 'available' && onBook && 'hover:border-mint-400 hover:shadow-md cursor-pointer',
        slot.status === 'booked' && 'opacity-80',
        slot.status === 'cancelled' && 'opacity-50'
      )}
      onClick={() => slot.status === 'available' && onBook?.(slot)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {showManager && slot.manager && (
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-7 h-7 rounded-full bg-mint-200 flex items-center justify-center text-xs font-bold text-mint-700 shrink-0">
                {slot.manager.name.charAt(0)}
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-800 leading-tight">{slot.manager.name}</div>
                {slot.manager.department && (
                  <div className="text-xs text-gray-400">{slot.manager.department}</div>
                )}
              </div>
            </div>
          )}
          <div className="text-sm font-medium text-gray-700">
            {formatThaiDate(slot.date)}
          </div>
          <div className="flex items-center gap-1 text-mint-600 mt-1">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span className="text-sm font-semibold">
              {formatTime(slot.start_time)} – {formatTime(slot.end_time)} น.
            </span>
            <span className="text-xs text-gray-400">({slot.duration_minutes} นาที)</span>
          </div>
          {slot.meet_link && (
            <a
              href={slot.meet_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-500 mt-1 hover:underline"
              onClick={e => e.stopPropagation()}
            >
              <Video className="w-3 h-3" />
              Google Meet
            </a>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', s.color)}>
            {s.text}
          </span>
          {onDelete && slot.status === 'available' && (
            <button
              onClick={e => { e.stopPropagation(); onDelete(slot.id) }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="ลบ slot นี้"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {onBook && slot.status === 'available' && (
            <button
              onClick={e => { e.stopPropagation(); onBook(slot) }}
              className="flex items-center gap-1 text-xs bg-mint-500 text-white px-3 py-1.5 rounded-lg hover:bg-mint-600 transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              จอง
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
