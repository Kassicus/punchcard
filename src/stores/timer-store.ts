import { create } from 'zustand'

interface TimerState {
  isRunning: boolean
  startTime: Date | null
  selectedProjectId: string | null
  selectedCategoryId: string | null
  elapsedSeconds: number

  // Actions
  startTimer: (projectId: string | null, categoryId: string | null) => void
  stopTimer: () => void
  resetTimer: () => void
  setElapsedSeconds: (seconds: number) => void
  resumeTimer: (startTime: Date, projectId: string | null, categoryId: string | null) => void
}

export const useTimerStore = create<TimerState>((set) => ({
  isRunning: false,
  startTime: null,
  selectedProjectId: null,
  selectedCategoryId: null,
  elapsedSeconds: 0,

  startTimer: (projectId, categoryId) =>
    set({
      isRunning: true,
      startTime: new Date(),
      selectedProjectId: projectId,
      selectedCategoryId: categoryId,
      elapsedSeconds: 0,
    }),

  stopTimer: () =>
    set({
      isRunning: false,
    }),

  resetTimer: () =>
    set({
      isRunning: false,
      startTime: null,
      selectedProjectId: null,
      selectedCategoryId: null,
      elapsedSeconds: 0,
    }),

  setElapsedSeconds: (seconds) =>
    set({
      elapsedSeconds: seconds,
    }),

  resumeTimer: (startTime, projectId, categoryId) =>
    set({
      isRunning: true,
      startTime,
      selectedProjectId: projectId,
      selectedCategoryId: categoryId,
      elapsedSeconds: Math.floor((Date.now() - startTime.getTime()) / 1000),
    }),
}))
