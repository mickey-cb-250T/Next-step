import { describe, expect, it } from 'vitest'
import { accuracyPercent, classifyMistake, scorePrediction } from './scoring'

describe('session scoring', () => {
  it('awards base points and a streak bonus for a correct decision', () => {
    expect(scorePrediction('left', 'left', 2, false)).toEqual({
      correct: true, points: 130, hintCost: 0, netPoints: 130, nextStreak: 3,
    })
  })

  it('charges a one-time hint cost against the answer award', () => {
    expect(scorePrediction('swap', 'swap', 0, true)).toEqual({
      correct: true, points: 100, hintCost: 25, netPoints: 75, nextStreak: 1,
    })
    expect(scorePrediction('wrong', 'swap', 2, true).netPoints).toBe(-25)
  })

  it('resets the streak and awards no points for an incorrect answer', () => {
    expect(scorePrediction('right', 'left', 4, false)).toEqual({
      correct: false, points: 0, hintCost: 0, netPoints: 0, nextStreak: 0,
    })
  })

  it('calculates safe rounded accuracy and distinguishes graph mental models', () => {
    expect(accuracyPercent(2, 3)).toBe(67)
    expect(accuracyPercent(0, 0)).toBe(0)
    expect(classifyMistake('bfs', 'F', 'B', ['B', 'C'])).toBe('Frontier vs. unseen nodes')
    expect(classifyMistake('dfs', 'C', 'B', ['B', 'C'])).toBe('Stack order and depth')
    expect(classifyMistake('binary-search', 'discard-right', 'discard-left')).toBe('Search boundaries')
  })
})
