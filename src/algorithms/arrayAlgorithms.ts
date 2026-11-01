import type { AlgorithmStep, ArraySnapshot } from './types'

export function* binarySearchSteps(values: number[], target: number): Generator<AlgorithmStep> {
  const sortedValues = [...values].sort((a, b) => a - b)
  let low = 0
  let high = sortedValues.length - 1
  let turn = 0

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const state: ArraySnapshot = {
      kind: 'array', mode: 'binary', values: [...sortedValues], active: [mid],
      sorted: [], low, high, mid, target,
    }

    if (sortedValues[mid] === target) {
      yield {
        id: `binary-${turn++}`, state,
        explanation: `${target} is already at the midpoint. Binary Search stops as soon as the target is found.`,
        question: {
          kind: 'binary', prompt: `The midpoint is ${target}. What happens next?`, correct: 'found',
          options: [{ id: 'found', label: 'Stop — the target is found', detail: 'No half needs to be discarded.' }],
          hint: 'Compare the midpoint value directly with the target.', topic: 'Recognizing a match',
        },
      }
      return
    }

    const discard = target > sortedValues[mid] ? 'left' : 'right'
    yield {
      id: `binary-${turn++}`, state,
      explanation: discard === 'left'
        ? `${sortedValues[mid]} is below the target ${target}. Because the array is sorted, every value at or left of the midpoint is too small and can be discarded.`
        : `${sortedValues[mid]} is above the target ${target}. Because the array is sorted, every value at or right of the midpoint is too large and can be discarded.`,
      question: {
        kind: 'binary', prompt: `Which half can you safely discard?`, correct: `discard-${discard}`,
        options: [
          { id: 'discard-left', label: 'Discard the left half', detail: `Values at and left of ${sortedValues[mid]}` },
          { id: 'discard-right', label: 'Discard the right half', detail: `Values at and right of ${sortedValues[mid]}` },
        ],
        hint: `Compare ${sortedValues[mid]} with the target ${target}; the target can only remain on one side.`,
        topic: 'Halving the search space',
      },
    }

    if (discard === 'left') low = mid + 1
    else high = mid - 1
  }
}

export function* bubbleSortSteps(input: number[]): Generator<AlgorithmStep> {
  const values = [...input]
  let turn = 0
  for (let end = values.length - 1; end > 0; end -= 1) {
    for (let index = 0; index < end; index += 1) {
      const left = values[index]
      const right = values[index + 1]
      const shouldSwap = left > right
      yield {
        id: `bubble-${turn++}`,
        state: { kind: 'array', mode: 'bubble', values: [...values], active: [index, index + 1], sorted: Array.from({ length: values.length - end }, (_, i) => end + i), pass: values.length - end },
        explanation: shouldSwap
          ? `${left} is greater than ${right}, so Bubble Sort swaps this adjacent pair to move the larger value right.`
          : `${left} is already before the larger value ${right}, so this pair stays in order.`,
        question: {
          kind: 'bubble', prompt: `What should happen to ${left} and ${right}?`, correct: shouldSwap ? 'swap' : 'keep',
          options: [
            { id: 'swap', label: 'Swap this pair', detail: `${right} moves before ${left}` },
            { id: 'keep', label: 'Keep them in order', detail: 'Leave these neighbors as they are' },
          ],
          hint: 'Bubble Sort moves a larger value to the right when neighboring values are out of order.',
          topic: 'Adjacent comparisons',
        },
      }
      if (shouldSwap) [values[index], values[index + 1]] = [values[index + 1], values[index]]
    }
  }
}

export function* selectionSortSteps(input: number[]): Generator<AlgorithmStep> {
  const values = [...input]
  let turn = 0
  for (let slot = 0; slot < values.length - 1; slot += 1) {
    let minimumIndex = slot
    for (let index = slot + 1; index < values.length; index += 1) {
      if (values[index] < values[minimumIndex]) minimumIndex = index
    }
    const candidates = Array.from({ length: values.length - slot }, (_, offset) => slot + offset)
    const options = candidates.slice(0, 5)
    if (!options.includes(minimumIndex)) options[options.length - 1] = minimumIndex
    const choiceOptions = [...new Set(options)].map((index) => ({
      id: `item-${index}`,
      label: String(values[index]),
      detail: index === slot ? 'Already in the open position' : 'Choose this value for the next position',
    }))
    yield {
      id: `selection-${turn++}`,
      state: { kind: 'array', mode: 'selection', values: [...values], active: [slot, minimumIndex], sorted: Array.from({ length: slot }, (_, i) => i), pass: slot },
      explanation: minimumIndex === slot
        ? `${values[slot]} is already the smallest value in the unsorted section, so it stays in position.`
        : `The smallest value remaining is ${values[minimumIndex]}. Selection Sort swaps it with ${values[slot]} to lock the next position.`,
      question: {
        kind: 'selection', prompt: `Which value moves into position ${slot + 1}?`, correct: `item-${minimumIndex}`,
        options: choiceOptions,
        hint: 'Selection Sort scans the unsorted section and picks its smallest value.',
        topic: 'Selecting the minimum',
      },
    }
    if (minimumIndex !== slot) [values[slot], values[minimumIndex]] = [values[minimumIndex], values[slot]]
  }
}
