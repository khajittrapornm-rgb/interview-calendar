import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/calendar/busy?date=YYYY-MM-DD
// ดึงช่วงเวลาที่ติดนัดใน Google Calendar ของ Manager วันนั้น
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  if (!date) return NextResponse.json({ error: 'Missing date' }, { status: 400 })

  const accessToken = session.accessToken
  if (!accessToken) {
    return NextResponse.json({ error: 'ไม่พบ access token — ลอง login ใหม่' }, { status: 401 })
  }

  const timeMin = `${date}T00:00:00+07:00`
  const timeMax = `${date}T23:59:59+07:00`

  try {
    const res = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        timeMin,
        timeMax,
        timeZone: 'Asia/Bangkok',
        items: [{ id: 'primary' }],
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      // token หมดอายุ → แจ้งให้ login ใหม่
      if (res.status === 401) {
        return NextResponse.json({ error: 'token_expired' }, { status: 401 })
      }
      return NextResponse.json({ error: err.error?.message ?? 'Google API error' }, { status: 500 })
    }

    const data = await res.json()
    const busy: { start: string; end: string }[] = data.calendars?.primary?.busy ?? []

    // แปลงเป็นเวลา HH:mm (Bangkok time)
    const busySlots = busy.map(b => ({
      start: new Date(b.start).toLocaleTimeString('th-TH', {
        hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Bangkok',
      }),
      end: new Date(b.end).toLocaleTimeString('th-TH', {
        hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Bangkok',
      }),
    }))

    return NextResponse.json({ busy: busySlots })
  } catch (err) {
    console.error('freeBusy error:', err)
    return NextResponse.json({ error: 'เชื่อมต่อ Google Calendar ไม่ได้' }, { status: 500 })
  }
}
