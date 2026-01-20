// Time formatting utilities

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    secs.toString().padStart(2, '0'),
  ].join(':')
}

export function formatDurationHuman(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }
  if (mins > 0) {
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
  }
  return `${secs}s`
}

export function formatDate(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatTime(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDateTime(date: string | Date): string {
  return `${formatDate(date)} ${formatTime(date)}`
}

export function formatDateForInput(date: Date): string {
  // Use local time methods to format for datetime-local input
  // (toISOString() returns UTC which causes timezone display issues)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

export function getRelativeTime(date: string | Date): string {
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(date)
}

/**
 * Parse a duration string into seconds
 * Supported formats: "2h 30m", "2h", "30m", "90m", "1:30" (H:MM or HH:MM)
 * Returns null if the format is invalid
 */
export function parseDuration(input: string): number | null {
  const trimmed = input.trim().toLowerCase()
  if (!trimmed) return null

  // Try H:MM or HH:MM format (e.g., "1:30", "02:45")
  const colonMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/)
  if (colonMatch) {
    const hours = parseInt(colonMatch[1], 10)
    const minutes = parseInt(colonMatch[2], 10)
    if (minutes >= 60) return null
    return hours * 3600 + minutes * 60
  }

  // Try "Xh Ym" format (e.g., "2h 30m", "2h", "30m")
  let totalSeconds = 0
  let hasMatch = false

  const hoursMatch = trimmed.match(/(\d+)\s*h/)
  if (hoursMatch) {
    totalSeconds += parseInt(hoursMatch[1], 10) * 3600
    hasMatch = true
  }

  const minutesMatch = trimmed.match(/(\d+)\s*m/)
  if (minutesMatch) {
    totalSeconds += parseInt(minutesMatch[1], 10) * 60
    hasMatch = true
  }

  if (hasMatch) return totalSeconds

  // Try plain number (assume minutes)
  const plainNumber = trimmed.match(/^(\d+)$/)
  if (plainNumber) {
    return parseInt(plainNumber[1], 10) * 60
  }

  return null
}
