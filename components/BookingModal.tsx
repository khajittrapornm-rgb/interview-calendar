'use client'

import { useState } from 'react'
import { X, CheckCircle, User, Briefcase, FileText, Mail } from 'lucide-react'
import { InterviewSlot } from '@/lib/types'
import { formatThaiDate, formatTime } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Props {
  slot: InterviewSlot
  onClose: () => void
  onBooked: () => void
}

export default function BookingModal({ slot, onClose, onBooked }: Props) {
  const [form, setForm] = useState({
    candidate_name: '',
    candidate_email: '',
    position: '',
    department: '',
    notes: '',
  })
  const [loading, setLoading] = useState(false)

  function handleChange(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot_id: slot.id, ...form }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('จองสำเร็จ! แจ้งเตือน Lark เรียบร้อย')
      onBooked()
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 sticky top-0 bg-white rounded-t-3xl border-b border-gray-50">
          <h2 className="text-lg font-bold text-gray-800">จองนัดหมายสัมภาษณ์</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Slot summary */}
        <div className="mx-6 mt-4 bg-mint-50 rounded-2xl p-4">
          <div className="text-sm font-semibold text-mint-700 mb-1">
            {slot.manager?.name ?? 'Manager'}
          </div>
          <div className="text-sm text-mint-600">
            {formatThaiDate(slot.date)} · {formatTime(slot.start_time)} – {formatTime(slot.end_time)} น.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {/* Candidate name */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
              <User className="w-3.5 h-3.5" />
              ชื่อผู้สมัคร <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="เช่น นายสมชาย ใจดี"
              value={form.candidate_name}
              onChange={e => handleChange('candidate_name', e.target.value)}
              required
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-mint-400"
            />
          </div>

          {/* Candidate email */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
              <Mail className="w-3.5 h-3.5" />
              อีเมลผู้สมัคร (ไม่บังคับ)
            </label>
            <input
              type="email"
              placeholder="candidate@email.com"
              value={form.candidate_email}
              onChange={e => handleChange('candidate_email', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-mint-400"
            />
          </div>

          {/* Position */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
              <Briefcase className="w-3.5 h-3.5" />
              ตำแหน่งงาน <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="เช่น Software Engineer, HR Business Partner"
              value={form.position}
              onChange={e => handleChange('position', e.target.value)}
              required
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-mint-400"
            />
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              แผนก (ไม่บังคับ)
            </label>
            <input
              type="text"
              placeholder="เช่น Engineering, Marketing"
              value={form.department}
              onChange={e => handleChange('department', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-mint-400"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
              <FileText className="w-3.5 h-3.5" />
              หมายเหตุ (ไม่บังคับ)
            </label>
            <textarea
              placeholder="เช่น สัมภาษณ์รอบ 2, มี portfolio ส่งมา"
              value={form.notes}
              onChange={e => handleChange('notes', e.target.value)}
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-mint-400 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-mint-500 text-white py-3 rounded-xl font-semibold hover:bg-mint-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            {loading ? 'กำลังจอง...' : 'ยืนยันการจอง'}
          </button>
        </form>
      </div>
    </div>
  )
}
