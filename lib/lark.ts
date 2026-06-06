interface LarkNotificationPayload {
  candidateName: string
  position: string
  date: string
  startTime: string
  endTime: string
  managerName: string
  hrName: string
  meetLink?: string
  notes?: string
}

export async function sendLarkNotification(payload: LarkNotificationPayload): Promise<boolean> {
  const webhookUrl = process.env.LARK_WEBHOOK_URL
  if (!webhookUrl) {
    console.warn('LARK_WEBHOOK_URL not set — skipping notification')
    return false
  }

  const dateFormatted = new Date(payload.date).toLocaleDateString('th-TH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const lines = [
    '📅 **มีการนัดหมายสัมภาษณ์ใหม่**',
    '',
    `👤 ผู้สมัคร: **${payload.candidateName}**`,
    `💼 ตำแหน่ง: ${payload.position}`,
    `📆 วันที่: ${dateFormatted}`,
    `⏰ เวลา: ${payload.startTime} – ${payload.endTime} น.`,
    `👔 Manager: ${payload.managerName}`,
    `🧑‍💼 จองโดย HR: ${payload.hrName}`,
  ]

  if (payload.meetLink) {
    lines.push(`🔗 Google Meet: ${payload.meetLink}`)
  }
  if (payload.notes) {
    lines.push(`📝 หมายเหตุ: ${payload.notes}`)
  }

  const body = {
    msg_type: 'text',
    content: {
      text: lines.join('\n'),
    },
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    return json.code === 0
  } catch (err) {
    console.error('Lark notification failed:', err)
    return false
  }
}
