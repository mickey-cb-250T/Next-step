import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { AlgorithmId, RunSummary } from '../algorithms/types'

interface ProgressState {
  history: RunSummary[]
  recordRun: (summary: RunSummary) => void
  clearProgress: () => void
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set) => ({
      history: [],
      recordRun: (summary) => set((state) => ({ history: [summary, ...state.history].slice(0, 60) })),
      clearProgress: () => set({ history: [] }),
    }),
    { name: 'predict-next-step-progress', storage: createJSONStorage(() => localStorage) },
  ),
)

export function progressFor(history: RunSummary[], algorithm: AlgorithmId) {
  const runs = history.filter((run) => run.algorithm === algorithm)
  const total = runs.reduce((sum, run) => sum + run.total, 0)
  const correct = runs.reduce((sum, run) => sum + run.correct, 0)
  return {
    runs: runs.length,
    accuracy: total ? Math.round((correct / total) * 100) : 0,
    best: runs.reduce((best, run) => Math.max(best, run.score), 0),
    latest: runs[0],
    weakTopic: runs.find((run) => run.weakTopic)?.weakTopic,
  }
}
