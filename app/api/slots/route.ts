import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase'

// GET /api/slots — HR ดู slots ทั้งหมดที่ available, Manager ดูของตัวเอง
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  const managerId = searchParams.get('manager_id')

  let query = db
    .from('interview_slots')
    .select('*, manager:profiles!manager_id(id,name,email,avatar_url,department)')
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })

  if (session.user.role === 'manager') {
    query = query.eq('manager_id', session.user.profileId)
  } else {
    if (managerId) query = query.eq('manager_id', managerId)
    query = query.eq('status', 'available')
  }

  if (date) query = query.eq('date', date)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/slots — Manager สร้าง slot ใหม่
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { date, start_time, end_time, duration_minutes } = body

  if (!date || !start_time || !end_time) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const db = createServiceClient()
  const { data, error } = await db
    .from('interview_slots')
    .insert({
      manager_id: session.user.profileId,
      date,
      start_time,
      end_time,
      duration_minutes: duration_minutes ?? 60,
      status: 'available',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
