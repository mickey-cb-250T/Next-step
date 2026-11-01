import { describe, expect, it } from 'vitest'
import type { RunSummary } from '../algorithms/types'
import { progressFor } from './progressStore'

const run = (id: string, algorithm: RunSummary['algorithm'], accuracy: number, score: number, weakTopic?: string): RunSummary => ({
  id, algorithm, algorithmLabel: algorithm, score, accuracy,
  correct: accuracy, total: 100, mistakes: weakTopic ? 1 : 0, date: id, weakTopic,
})

describe('per-algorithm progress', () => {
  it('aggregates results and highlights the latest misconception for that algorithm', () => {
    const summary = progressFor([
      run('3', 'binary-search', 70, 250, 'Search boundaries'),
      run('2', 'bubble-sort', 90, 400),
      run('1', 'binary-search', 50, 150, 'Older search issue'),
    ], 'binary-search')
    expect(summary.runs).toBe(2)
    expect(summary.accuracy).toBe(60)
    expect(summary.best).toBe(250)
    expect(summary.weakTopic).toBe('Search boundaries')
  })
})
