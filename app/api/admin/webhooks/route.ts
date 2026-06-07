import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase'

// GET /api/admin/webhooks — ดึงรายการกลุ่ม Lark (ทุก role อ่านได้ — Manager ต้องใช้)
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()
  const { data, error } = await db
    .from('lark_webhooks')
    .select('id, name, webhook_url, created_at')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/admin/webhooks — เพิ่มกลุ่มใหม่ (admin เท่านั้น)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — admin เท่านั้น' }, { status: 403 })
  }

  const body = await req.json()
  const { name, webhook_url } = body

  if (!name?.trim() || !webhook_url?.trim()) {
    return NextResponse.json({ error: 'กรุณากรอกชื่อกลุ่มและ Webhook URL' }, { status: 400 })
  }

  if (!webhook_url.startsWith('https://open.larksuite.com/') && !webhook_url.startsWith('https://open.feishu.cn/')) {
    return NextResponse.json({ error: 'Webhook URL ไม่ถูกต้อง (ต้องขึ้นต้นด้วย https://open.larksuite.com/ หรือ https://open.feishu.cn/)' }, { status: 400 })
  }

  const db = createServiceClient()
  const { data, error } = await db
    .from('lark_webhooks')
    .insert({ name: name.trim(), webhook_url: webhook_url.trim() })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// DELETE /api/admin/webhooks?id=xxx — ลบกลุ่ม (admin เท่านั้น)
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — admin เท่านั้น' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const db = createServiceClient()
  const { error } = await db.from('lark_webhooks').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
