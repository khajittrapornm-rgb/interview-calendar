# คู่มือติดตั้ง Interview Calendar

## ภาพรวม
```
interview-calendar/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/  ← Google OAuth
│   │   ├── slots/               ← CRUD slots
│   │   ├── bookings/            ← จองนัด + Lark notify
│   │   └── managers/            ← รายชื่อ Manager
│   ├── login/                   ← หน้า Login
│   ├── manager/                 ← หน้า Manager (จัดการ slots)
│   └── hr/                      ← หน้า HR (ดู + จอง slots)
├── components/                  ← UI components
├── lib/                         ← utils, supabase, lark
├── supabase/schema.sql          ← สร้าง DB ด้วยไฟล์นี้
└── .env.local.example           ← template env vars
```

---

## ขั้นตอนที่ 1 — ตั้งค่า Google Cloud Console

1. ไปที่ https://console.cloud.google.com
2. สร้าง Project ใหม่ (ตั้งชื่อ "Interview Calendar" หรืออะไรก็ได้)
3. ไปที่ **APIs & Services** → **Enable APIs**
   - ค้นหา "Google Calendar API" → Enable
4. ไปที่ **APIs & Services** → **OAuth consent screen**
   - เลือก **Internal** (ใช้ภายในองค์กร)
   - กรอก App name: "Interview Calendar"
   - กรอก User support email
   - กด Save
5. ไปที่ **APIs & Services** → **Credentials**
   - กด **Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Authorized redirect URIs เพิ่ม:
     - `http://localhost:3000/api/auth/callback/google` (dev)
     - `https://your-domain.vercel.app/api/auth/callback/google` (production)
   - กด Create → Copy **Client ID** และ **Client Secret**

---

## ขั้นตอนที่ 2 — ตั้งค่า Supabase

1. ไปที่ https://supabase.com → สร้าง Project ใหม่
2. ตั้ง Database Password (จดเก็บไว้)
3. รอ Project พร้อม (~2 นาที)
4. ไปที่ **SQL Editor** → New Query
5. เปิดไฟล์ `supabase/schema.sql` แล้ว copy ทั้งหมดวางลงไป → Run
6. ไปที่ **Settings** → **API**
   - Copy **Project URL** → ใส่ใน `NEXT_PUBLIC_SUPABASE_URL`
   - Copy **anon public key** → ใส่ใน `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy **service_role key** → ใส่ใน `SUPABASE_SERVICE_ROLE_KEY`

---

## ขั้นตอนที่ 3 — ตั้งค่าไฟล์ .env.local

```bash
# Copy ไฟล์ template
cp .env.local.example .env.local
```

แล้วแก้ไขค่าทั้งหมดในไฟล์ `.env.local`

---

## ขั้นตอนที่ 4 — เพิ่มรูป Capybara

นำรูป capybara.png (จากในแชท) ไปวางที่ `public/capybara.png`

---

## ขั้นตอนที่ 5 — รันโปรเจกต์

```bash
npm install
npm run dev
```

เปิด http://localhost:3000

---

## ขั้นตอนที่ 6 — ตั้งค่า Role HR

หลังจาก HR เข้าสู่ระบบครั้งแรก ให้ไปที่ Supabase:
1. **Table Editor** → **profiles**
2. ค้นหา email ของ HR
3. แก้ค่า `role` จาก `manager` เป็น `hr`
4. กด Save

---

## ขั้นตอนที่ 7 — Deploy บน Vercel

1. Push โค้ดขึ้น GitHub
2. ไปที่ https://vercel.com → Import repository
3. ตั้งค่า Environment Variables (ใส่ค่าเดียวกับ .env.local ทุกตัว)
4. Deploy
5. อย่าลืมเพิ่ม Production URL ใน Google OAuth redirect URIs

---

## การตั้งค่า Lark Bot

1. ไปที่ https://open.larksuite.com/
2. **My Apps** → **Create App** → **Custom App**
3. ตั้งชื่อ App เช่น "Interview Notifier"
4. ไปที่ **Features** → **Bot** → Enable
5. กลับไปที่ Group ที่ต้องการรับแจ้งเตือน
6. กด **...** → **Settings** → **Bots** → **Add Bot** → เลือก App ที่สร้าง

หรือใช้ **Webhook** ง่ายกว่า:
1. ในกลุ่ม Lark → Settings → Bots → Add Custom Bot
2. Copy Webhook URL มาใส่ใน `LARK_WEBHOOK_URL`
   (URL ในโปรเจกต์นี้ถูกตั้งไว้แล้ว)

---

## คำถามที่พบบ่อย

**Q: เพิ่ม Manager ใหม่ยังไง?**
A: Manager เข้าสู่ระบบด้วย Google Account แล้วจะถูกเพิ่มอัตโนมัติ role default คือ manager

**Q: เปลี่ยน role HR ยังไง?**
A: ดูขั้นตอนที่ 6 ด้านบน

**Q: เพิ่ม department ได้ไหม?**
A: ได้ — ไปที่ Supabase → Table Editor → profiles → แก้ค่า department
