import { describe, expect, it } from 'vitest'
import { binarySearchSteps, bubbleSortSteps, selectionSortSteps } from './arrayAlgorithms'

describe('array prediction generators', () => {
  it('yields Binary Search decisions and stops at the target', () => {
    const steps = [...binarySearchSteps([3, 8, 12, 20, 27, 34, 41], 34)]
    expect(steps.map((step) => step.question?.correct)).toEqual(['discard-left', 'found'])
    expect(steps[0].state).toMatchObject({ kind: 'array', mode: 'binary', mid: 3, target: 34 })
    expect(steps[0].explanation).toContain('every value at or left of the midpoint')
  })

  it('yields Bubble Sort swap and keep decisions from array snapshots', () => {
    const steps = [...bubbleSortSteps([4, 1, 3])]
    expect(steps.map((step) => step.question?.correct)).toEqual(['swap', 'swap', 'keep'])
    expect(steps[0].state).toMatchObject({ kind: 'array', mode: 'bubble', values: [4, 1, 3], active: [0, 1] })
    expect(steps.every((step) => step.explanation.length > 20)).toBe(true)
  })

  it('asks Selection Sort for the smallest remaining value', () => {
    const steps = [...selectionSortSteps([6, 2, 4])]
    expect(steps.map((step) => step.question?.correct)).toEqual(['item-1', 'item-2'])
    expect(steps[0].question?.options.map((option) => option.id)).toContain('item-1')
    expect(steps[1].state).toMatchObject({ values: [2, 6, 4], sorted: [0] })
  })
})
