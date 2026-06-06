import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase'

// GET /api/admin/users — ดู user ทั้งหมด
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const db = createServiceClient()
  const { data, error } = await db
    .from('profiles')
    .select('id, email, name, avatar_url, role, department, created_at')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PATCH /api/admin/users — เปลี่ยน role
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId, role } = await req.json()

  if (!['admin', 'hr', 'manager'].includes(role)) {
    return NextResponse.json({ error: 'Role ไม่ถูกต้อง' }, { status: 400 })
  }

  // Admin เปลี่ยน role ตัวเองไม่ได้
  if (userId === session.user.profileId) {
    return NextResponse.json({ error: 'ไม่สามารถเปลี่ยน role ของตัวเองได้' }, { status: 400 })
  }

  const db = createServiceClient()
  const { data, error } = await db
    .from('profiles')
    .update({ role })
    .eq('id', userId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
