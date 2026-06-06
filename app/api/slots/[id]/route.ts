import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase'

// DELETE /api/slots/[id] — Manager ยกเลิก slot ของตัวเอง
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const db = createServiceClient()

  // ตรวจสอบว่าเป็น slot ของ Manager คนนี้
  const { data: slot } = await db
    .from('interview_slots')
    .select('manager_id, status')
    .eq('id', params.id)
    .single()

  if (!slot) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (slot.manager_id !== session.user.profileId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (slot.status === 'booked') {
    return NextResponse.json({ error: 'ไม่สามารถลบ slot ที่มีการจองแล้ว' }, { status: 400 })
  }

  const { error } = await db
    .from('interview_slots')
    .update({ status: 'cancelled' })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// PATCH /api/slots/[id] — Manager แก้ไข slot
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const db = createServiceClient()

  const { data: slot } = await db
    .from('interview_slots')
    .select('manager_id')
    .eq('id', params.id)
    .single()

  if (!slot || slot.manager_id !== session.user.profileId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await db
    .from('interview_slots')
    .update(body)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
