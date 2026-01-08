# PunchCard - Planning Document

## Project Overview

**PunchCard** is a time tracking application designed for architectural consultants. It provides a simple, focused interface for tracking billable hours against projects and categories, with administrative oversight for reporting and management.

---

## User Roles

### 1. User (Consultant)
- Can track time using start/stop timer
- Can select projects or categories for time entries
- Can edit start/end times after stopping timer
- Can view their own historical time entries
- Cannot create/edit/delete projects or categories

### 2. Admin
- All User capabilities
- Can create, edit, and delete projects
- Can create, edit, and delete categories
- Can view all users' historical time entries
- Can manage user accounts

---

## Core Features

### Authentication & Session Management

| Feature | Description |
|---------|-------------|
| Sign Up | Email/password registration (no verification required) |
| Sign In | Email/password login |
| Sign Out | Manual logout |
| Session Timeout | Auto-logout after 8 hours of inactivity with warning modal |
| Password Reset | **Admin-initiated only** (no self-service) |

**Session Timeout Behavior:**
1. After 7 hours 55 minutes of inactivity, display a modal: *"Your session will expire in 5 minutes. Click to stay logged in."*
2. If user clicks "Stay Logged In" → reset the 8-hour timer
3. If user doesn't respond within 5 minutes → auto-logout and redirect to login page
4. "Inactivity" = no mouse movement, clicks, or keyboard input

---

### Time Tracking (User Dashboard)

#### Active Timer Component
- Large, prominent start/stop button
- Running timer display (HH:MM:SS) when active
- Project/category dropdown selector (required before starting)
- Visual indicator when timer is running (pulsing dot, color change, etc.)

#### Timer Workflow
1. User selects a project OR category from dropdown
2. User clicks "Start" → timer begins, start time recorded
3. User clicks "Stop" → timer stops, entry goes to "Review" state
4. Review modal appears with:
   - Start time (editable)
   - End time (editable)
   - Duration (auto-calculated, read-only)
   - Project/category (editable)
   - Notes field (optional)
   - "Save Entry" and "Discard" buttons
5. On save → entry stored in history

#### Time Entry History (User View)
- List of user's own time entries
- Sortable by date (default: newest first)
- Filterable by:
  - Date range
  - Project
  - Category
- Each entry shows:
  - Date
  - Project/category name
  - Start time
  - End time
  - Duration
  - Notes (truncated with expand option)
- Edit capability for past entries
- Delete capability for past entries

---

### Admin Dashboard

#### User Management
- List all registered users
- View user details
- Deactivate/reactivate user accounts
- Promote user to admin / demote admin to user

#### Project Management
- Create new projects
  - Name (required)
  - Description (optional)
  - Client name (optional)
  - Active/inactive status
- Edit existing projects
- Archive/delete projects (soft delete recommended)
- List all projects with search/filter

#### Category Management
- Create new categories
  - Name (required)
  - Description (optional)
  - Color code (optional, for UI distinction)
  - Active/inactive status
- Edit existing categories
- Archive/delete categories (soft delete)
- List all categories with search/filter

#### Time Entry Reports (Admin View)
- View ALL users' time entries
- Advanced filtering:
  - Date range
  - User(s)
  - Project(s)
  - Category/categories
- Summary statistics:
  - Total hours by user
  - Total hours by project
  - Total hours by category
- Export to CSV

---

## Data Models

### User (Supabase: profiles table, linked to auth.users)
```
id: UUID (primary key, matches auth.users.id)
email: String (from auth.users, read-only)
first_name: String (required)
last_name: String (required)
role: Enum ['user', 'admin'] (default: 'user')
is_active: Boolean (default: true)
active_timer_start: Timestamp (nullable, for tracking running timer)
created_at: Timestamp
updated_at: Timestamp
```
*Note: Authentication fields (password, email verification) handled by Supabase Auth*

### Project
```
id: UUID (primary key)
name: String (required)
description: String (optional)
client_name: String (optional)
is_active: Boolean (default: true)
created_at: Timestamp
updated_at: Timestamp
deleted_at: Timestamp (nullable, for soft delete)
```

### Category
```
id: UUID (primary key)
name: String (required)
description: String (optional)
color: String (optional, hex code)
is_active: Boolean (default: true)
created_at: Timestamp
updated_at: Timestamp
deleted_at: Timestamp (nullable, for soft delete)
```

### TimeEntry
```
id: UUID (primary key)
user_id: UUID (foreign key → User)
project_id: UUID (foreign key → Project, nullable)
category_id: UUID (foreign key → Category, nullable)
start_time: Timestamp (required)
end_time: Timestamp (required)
duration_minutes: Integer (computed)
notes: Text (optional)
created_at: Timestamp
updated_at: Timestamp
```

**Constraint:** Either `project_id` OR `category_id` must be set (not both, not neither)

*Note: Session management handled by Supabase Auth - no custom session table needed*

---

## User Flows

### Flow 1: New User Registration
```
Landing Page → Click "Sign Up" → Registration Form (email, password, name) →
Submit → Account Created → Auto-login → User Dashboard
```

### Flow 2: Daily Time Tracking
```
Login → Dashboard → Select Project/Category → Click Start →
Timer Running → Work → Click Stop → Review/Edit Modal →
Adjust times if needed → Add notes → Save → Entry in History
```

### Flow 3: Session Timeout
```
User idle for 7h 55m → Warning Modal Appears →
  Option A: Click "Stay Logged In" → Timer resets, continue working
  Option B: No response for 5 min → Auto-logout → Login page
```

### Flow 4: Admin Creates Project
```
Admin Login → Admin Dashboard → Projects Tab → Click "Add Project" →
Fill form (name, description, client) → Save → Project appears in list →
Project now available in user dropdowns
```

### Flow 5: Admin Reviews Time Entries
```
Admin Login → Admin Dashboard → Reports Tab → Set Filters →
View entries table → Optional: Export CSV
```

---

## Page Structure

### Public Pages
- `/` - Landing page (marketing/info)
- `/login` - Sign in form
- `/signup` - Registration form

### User Pages (Protected)
- `/dashboard` - Main time tracking interface
- `/history` - User's time entry history
- `/settings` - User profile settings (name, etc.)

### Admin Pages (Protected, Admin Only)
- `/admin` - Admin dashboard overview
- `/admin/users` - User management (includes password reset)
- `/admin/projects` - Project management
- `/admin/categories` - Category management
- `/admin/reports` - Time entry reports for all users
- `/admin/audit-log` - Activity audit log viewer

---

## Technical Recommendations

### Stack Overview
- **Frontend:** Next.js (React) with App Router
- **Styling:** Tailwind CSS
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **State Management:** Zustand or React Context for timer state
- **Data Fetching:** Supabase client + React Query (optional)

### Supabase Configuration

#### Authentication Setup
- Email/password authentication (no OAuth needed for MVP)
- **No email verification** - users are active immediately on signup
- **No self-service password reset** - admins reset passwords manually via Supabase dashboard or admin UI
- Session management handled by Supabase Auth
- Custom session timeout logic layered on top (see below)

#### Database Tables
All tables created in Supabase with Row Level Security (RLS) policies:

| Table | RLS Policy |
|-------|------------|
| `users` (profiles) | Users read own row; Admins read all |
| `projects` | All authenticated users can read active; Admins can write |
| `categories` | All authenticated users can read active; Admins can write |
| `time_entries` | Users read/write own; Admins read all |
| `audit_logs` | Admins read only; Insert via service role |

#### Supabase Features to Use
- **Supabase Auth** - handles signup, login, session tokens
- **Supabase Database** - PostgreSQL with RLS
- **Supabase Realtime** (optional) - for session timeout warnings
- **Database Functions** - for computed fields (duration) and audit triggers

### Key Technical Considerations

1. **Timer Accuracy**
   - Store `start_time` when user clicks Start
   - Calculate duration on Stop (don't rely on frontend timer)
   - Frontend timer is for display only
   - Use database trigger to compute `duration_minutes` on insert/update

2. **Session Timeout (Custom Implementation)**
   - Supabase sessions don't auto-expire at 8 hours by default
   - Implement custom timeout tracking:
     - Store `last_activity` timestamp in localStorage or app state
     - Update on each user interaction
     - Check elapsed time on interval (every 30 seconds)
     - Show warning modal at 7h 55m
     - Force logout at 8h by calling `supabase.auth.signOut()`

3. **Concurrent Timer Prevention**
   - Add `active_timer_start` column to user profile (nullable timestamp)
   - On Start: set timestamp, on Stop: clear it
   - Check on login if active timer exists (offer to resume or discard)
   - RLS policy ensures user can only modify their own timer state

4. **Time Zone Handling**
   - Store all times in UTC (Supabase default)
   - Display in user's local timezone via JavaScript
   - Use `timestamptz` column type in Supabase

5. **Admin Password Reset Flow**
   - Admin navigates to user management
   - Admin clicks "Reset Password" for a user
   - Option A: Use Supabase Admin API to send reset email
   - Option B: Admin sets a temporary password directly
   - User is informed of new password out-of-band

---

## UI/UX Guidelines

### Dashboard Priority
The time tracker should be the dominant element. Users should be able to start tracking within 2 clicks of logging in.

### Visual Timer States
- **Idle:** Muted colors, prominent "Start" button
- **Running:** Active colors (green), pulsing indicator, prominent "Stop" button
- **Review:** Modal overlay with form

### Mobile Responsiveness
All pages should work on mobile devices. The timer in particular should be easily operable on a phone (large tap targets).

### Accessibility
- Proper contrast ratios
- Keyboard navigation
- Screen reader labels
- Focus indicators

---

## MVP Scope vs Future Enhancements

### MVP (Build First)
- [x] User authentication (signup, login, logout)
- [x] Session timeout with warning
- [x] Basic timer (start/stop)
- [x] Project and category selection
- [x] Time entry review/edit before save
- [x] User history view (with edit/delete)
- [x] Admin: Project CRUD
- [x] Admin: Category CRUD
- [x] Admin: View all time entries
- [x] Admin: Password reset for users
- [x] Audit logging

### Future Enhancements (Post-MVP)
- [ ] Email notifications/reminders
- [ ] Detailed reporting with charts
- [ ] Bulk time entry import
- [ ] Team/department groupings
- [ ] Billable rate tracking
- [ ] Invoice generation
- [ ] Calendar view of entries
- [ ] Browser extension for quick tracking
- [ ] Mobile app

---

## Security Requirements

1. **Password Requirements** (Supabase Auth default)
   - Minimum 6 characters (can be increased in Supabase settings)
   - Consider enforcing stronger requirements via frontend validation

2. **Session Security** (Handled by Supabase)
   - JWT tokens managed by Supabase Auth
   - Automatic token refresh
   - Secure cookie handling

3. **Data Protection via Row Level Security (RLS)**
   - Users can only access their own time entries
   - Admin role verified in RLS policies
   - All database access goes through RLS

4. **Rate Limiting**
   - Supabase has built-in rate limiting
   - Consider additional application-level limits if needed

5. **Environment Variables**
   - `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public anon key
   - `SUPABASE_SERVICE_ROLE_KEY` - Server-side only, for admin operations

---

## Success Criteria

The application is complete when:

1. A new user can sign up and log in immediately
2. A logged-in user can start a timer, stop it, and save an entry
3. A user can view, edit, and delete their time entries
4. An admin can create projects and categories
5. An admin can view all users' time entries
6. An admin can reset user passwords
7. Sessions automatically expire after 8 hours with a warning
8. Audit logs capture key user actions
9. The UI is clean, intuitive, and works on mobile

---

## Resolved Decisions

| Question | Decision |
|----------|----------|
| Can users delete their own time entries? | **Yes** - users can edit AND delete their entries |
| Approval workflow for time entries? | **No** - entries are saved directly without approval |
| User roles beyond USER and ADMIN? | **No** - two roles are sufficient |
| Budgeted hours for projects? | **No** - not tracking estimates vs actuals |
| Audit logging? | **Yes** - implement activity logging |
| Email service? | **None** - no email verification, admin-initiated password resets only |

---

## Audit Logging

Track the following events for accountability:

### Events to Log
```
id: UUID (primary key)
user_id: UUID (foreign key → User, who performed action)
action: String (enum: see below)
entity_type: String ('time_entry', 'project', 'category', 'user')
entity_id: UUID (the affected record)
old_values: JSONB (nullable, previous state)
new_values: JSONB (nullable, new state)
ip_address: String (optional)
created_at: Timestamp
```

### Action Types
- `time_entry.created`
- `time_entry.updated`
- `time_entry.deleted`
- `project.created`
- `project.updated`
- `project.archived`
- `category.created`
- `category.updated`
- `category.archived`
- `user.created`
- `user.updated`
- `user.deactivated`
- `user.role_changed`
- `user.password_reset` (by admin)

### Admin Access
- Admins can view audit logs in admin dashboard
- Filterable by user, action type, entity type, date range
- Read-only (logs cannot be modified or deleted)

---

*This document should be used as the primary reference when building PunchCard with Claude Code.*
