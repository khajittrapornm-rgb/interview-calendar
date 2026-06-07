import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase'
import { sendLarkNotification } from '@/lib/lark'

// POST /api/bookings — HR จอง slot
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'hr') {
    return NextResponse.json({ error: 'Forbidden — HR เท่านั้น' }, { status: 403 })
  }

  const body = await req.json()
  const { slot_id, candidate_name, candidate_email, position, department, notes } = body

  if (!slot_id || !candidate_name || !position) {
    return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบ' }, { status: 400 })
  }

  const db = createServiceClient()

  // ดึง slot + manager profile + lark webhook
  const { data: slot, error: slotErr } = await db
    .from('interview_slots')
    .select('*, manager:profiles!manager_id(name,email), lark_webhook:lark_webhooks(webhook_url)')
    .eq('id', slot_id)
    .eq('status', 'available')
    .single()

  if (slotErr || !slot) {
    return NextResponse.json({ error: 'Slot ไม่ว่างหรือไม่พบ' }, { status: 404 })
  }

  // สร้าง booking + อัปเดต slot status พร้อมกัน
  const [bookingResult] = await Promise.all([
    db
      .from('bookings')
      .insert({
        slot_id,
        hr_id: session.user.profileId,
        candidate_name,
        candidate_email,
        position,
        department,
        notes,
        status: 'confirmed',
        lark_notified: false,
      })
      .select('*, hr:profiles!hr_id(name), slot:interview_slots(*,manager:profiles!manager_id(name))')
      .single(),
    db.from('interview_slots').update({ status: 'booked' }).eq('id', slot_id),
  ])

  if (bookingResult.error) {
    return NextResponse.json({ error: bookingResult.error.message }, { status: 500 })
  }

  // ส่ง Lark แจ้งเตือน (ใช้ webhook จาก slot ถ้ามี มิฉะนั้นใช้ env default)
  const slotWebhookUrl = (slot.lark_webhook as { webhook_url: string } | null)?.webhook_url
  const notified = await sendLarkNotification({
    candidateName: candidate_name,
    position,
    date: slot.date,
    startTime: slot.start_time.substring(0, 5),
    endTime: slot.end_time.substring(0, 5),
    managerName: (slot.manager as { name: string })?.name ?? 'Manager',
    hrName: session.user.name ?? 'HR',
    meetLink: slot.meet_link,
    notes,
  }, slotWebhookUrl)

  if (notified) {
    await db.from('bookings').update({ lark_notified: true }).eq('id', bookingResult.data.id)
  }

  return NextResponse.json(bookingResult.data, { status: 201 })
}

// GET /api/bookings — ดูรายการ bookings
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()
  const { searchParams } = new URL(req.url)
  const slotId = searchParams.get('slot_id')

  let query = db
    .from('bookings')
    .select(
      '*, hr:profiles!hr_id(name,email), slot:interview_slots(*,manager:profiles!manager_id(name,email,avatar_url))'
    )
    .order('created_at', { ascending: false })

  if (slotId) query = query.eq('slot_id', slotId)

  if (session.user.role === 'manager') {
    // Manager เห็นเฉพาะ booking ใน slot ของตัวเอง
    query = query.eq('slot.manager_id', session.user.profileId)
  } else {
    // HR เห็น booking ที่ตัวเองสร้าง
    query = query.eq('hr_id', session.user.profileId)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
