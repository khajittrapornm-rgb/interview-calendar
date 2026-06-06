-- ======================================================
-- Interview Calendar — Supabase Database Schema
-- วิธีใช้: ไปที่ Supabase Dashboard > SQL Editor > วางโค้ดนี้แล้วรัน
-- ======================================================

-- ---- 1. Profiles (ข้อมูลผู้ใช้) ----
create table if not exists profiles (
  id           text primary key default gen_random_uuid()::text,
  email        text unique not null,
  name         text not null,
  avatar_url   text,
  role         text not null default 'manager' check (role in ('admin', 'manager', 'hr')),
  department   text,
  lark_user_id text,
  created_at   timestamptz default now()
);

-- ---- 2. Interview Slots (เวลาว่างของ Manager) ----
create table if not exists interview_slots (
  id               uuid primary key default gen_random_uuid(),
  manager_id       text not null references profiles(id) on delete cascade,
  date             date not null,
  start_time       time not null,
  end_time         time not null,
  duration_minutes integer not null default 60,
  status           text not null default 'available' check (status in ('available', 'booked', 'cancelled')),
  google_event_id  text,
  meet_link        text,
  created_at       timestamptz default now(),
  -- ไม่อนุญาตให้ Manager มี slot ซ้ำกันในวันและเวลาเดียวกัน
  unique (manager_id, date, start_time)
);

-- ---- 3. Bookings (การจองนัดหมาย) ----
create table if not exists bookings (
  id              uuid primary key default gen_random_uuid(),
  slot_id         uuid not null references interview_slots(id) on delete cascade,
  hr_id           text not null references profiles(id),
  candidate_name  text not null,
  candidate_email text,
  position        text not null,
  department      text,
  notes           text,
  status          text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  lark_notified   boolean default false,
  created_at      timestamptz default now()
);

-- ---- Indexes ----
create index if not exists idx_slots_manager_date on interview_slots(manager_id, date);
create index if not exists idx_slots_status on interview_slots(status);
create index if not exists idx_bookings_slot on bookings(slot_id);
create index if not exists idx_bookings_hr on bookings(hr_id);

-- ---- Row Level Security ----
alter table profiles enable row level security;
alter table interview_slots enable row level security;
alter table bookings enable row level security;

-- profiles: ทุกคนอ่านได้, แก้ไขได้เฉพาะตัวเอง
create policy "profiles_select" on profiles for select using (true);
create policy "profiles_insert" on profiles for insert with check (true);
create policy "profiles_update" on profiles for update using (true);

-- slots: ทุกคนอ่าน available ได้, เขียนได้ผ่าน service role เท่านั้น
create policy "slots_select" on interview_slots for select using (true);
create policy "slots_all_service" on interview_slots using (true) with check (true);

-- bookings: อ่านได้ทุกคน, เขียนผ่าน service role
create policy "bookings_select" on bookings for select using (true);
create policy "bookings_all_service" on bookings using (true) with check (true);

-- ======================================================
-- ตั้งค่า Admin คนแรก (ทำ 1 ครั้งหลัง deploy)
-- เปลี่ยน your-email@dplusonline.net เป็น email จริงของ Admin
-- ======================================================
-- update profiles set role = 'admin' where email = 'your-email@dplusonline.net';
--
-- หลังจากนั้น Admin คนนั้นเข้าหน้า /admin แล้วเปลี่ยน role
-- ของคนอื่นผ่านเว็บได้เลย โดยไม่ต้องมาแก้ Supabase อีก
