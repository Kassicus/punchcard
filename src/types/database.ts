export type UserRole = 'user' | 'admin'

export interface Profile {
  id: string
  email: string
  first_name: string
  last_name: string
  role: UserRole
  is_active: boolean
  active_timer_start: string | null
  active_timer_project_id: string | null
  active_timer_category_id: string | null
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  name: string
  description: string | null
  client_name: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Category {
  id: string
  name: string
  description: string | null
  color: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface TimeEntry {
  id: string
  user_id: string
  project_id: string | null
  category_id: string | null
  start_time: string
  end_time: string
  duration_seconds: number
  notes: string | null
  created_at: string
  updated_at: string
}

export type AuditAction =
  | 'time_entry.created'
  | 'time_entry.updated'
  | 'time_entry.deleted'
  | 'project.created'
  | 'project.updated'
  | 'project.archived'
  | 'category.created'
  | 'category.updated'
  | 'category.archived'
  | 'user.created'
  | 'user.updated'
  | 'user.deactivated'
  | 'user.role_changed'
  | 'user.password_reset'

export type EntityType = 'time_entry' | 'project' | 'category' | 'user'

export interface AuditLog {
  id: string
  user_id: string
  action: AuditAction
  entity_type: EntityType
  entity_id: string
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

// Database schema type for Supabase client
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
      }
      projects: {
        Row: Project
        Insert: Omit<Project, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Project, 'id' | 'created_at'>>
      }
      categories: {
        Row: Category
        Insert: Omit<Category, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Category, 'id' | 'created_at'>>
      }
      time_entries: {
        Row: TimeEntry
        Insert: Omit<TimeEntry, 'id' | 'created_at' | 'updated_at' | 'duration_seconds'>
        Update: Partial<Omit<TimeEntry, 'id' | 'created_at' | 'duration_seconds'>>
      }
      audit_logs: {
        Row: AuditLog
        Insert: Omit<AuditLog, 'id' | 'created_at'>
        Update: never
      }
    }
  }
}
