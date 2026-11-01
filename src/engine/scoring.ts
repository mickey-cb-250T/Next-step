import type { AlgorithmId } from '../algorithms/types'

export interface PredictionScore {
  correct: boolean
  points: number
  hintCost: number
  netPoints: number
  nextStreak: number
}

export function scorePrediction(
  answer: string,
  correctAnswer: string,
  currentStreak: number,
  usedHint: boolean,
): PredictionScore {
  const correct = answer === correctAnswer
  const points = correct ? 100 + currentStreak * 15 : 0
  const hintCost = usedHint ? 25 : 0
  return { correct, points, hintCost, netPoints: points - hintCost, nextStreak: correct ? currentStreak + 1 : 0 }
}

export function accuracyPercent(correct: number, total: number): number {
  return total > 0 ? Math.round((correct / total) * 100) : 0
}

export function classifyMistake(
  algorithm: AlgorithmId,
  answer: string,
  correctAnswer: string,
  frontier: string[] = [],
): string {
  if (answer === 'timeout') return 'Decision under pressure'
  if (answer === correctAnswer) return 'No misconception'
  if (algorithm === 'binary-search') return 'Search boundaries'
  if (algorithm === 'bubble-sort') return 'Reading adjacent order'
  if (algorithm === 'selection-sort') return 'Tracking the minimum'
  if (!frontier.includes(answer)) return 'Frontier vs. unseen nodes'
  return algorithm === 'bfs' ? 'Queue order and breadth' : 'Stack order and depth'
}
