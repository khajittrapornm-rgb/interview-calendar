export type UserRole = 'admin' | 'manager' | 'hr'

export interface Profile {
  id: string
  email: string
  name: string
  avatar_url?: string
  role: UserRole
  department?: string
  lark_user_id?: string
  created_at: string
}

export interface InterviewSlot {
  id: string
  manager_id: string
  manager?: Profile
  date: string           // YYYY-MM-DD
  start_time: string     // HH:mm
  end_time: string       // HH:mm
  duration_minutes: number
  status: 'available' | 'booked' | 'cancelled'
  google_event_id?: string
  meet_link?: string
  created_at: string
}

export interface Booking {
  id: string
  slot_id: string
  slot?: InterviewSlot
  hr_id: string
  hr?: Profile
  candidate_name: string
  candidate_email?: string
  position: string
  department?: string
  notes?: string
  status: 'confirmed' | 'cancelled'
  lark_notified: boolean
  created_at: string
}
