import { binarySearchSteps, bubbleSortSteps, selectionSortSteps } from './arrayAlgorithms'
import { graphTraversalSteps } from './graphAlgorithms'
import type { AlgorithmId, AlgorithmStep, GraphDefinition } from './types'

export const ALGORITHM_LABELS: Record<AlgorithmId, string> = {
  'binary-search': 'Binary Search',
  'bubble-sort': 'Bubble Sort',
  'selection-sort': 'Selection Sort',
  bfs: 'Breadth-first search',
  dfs: 'Depth-first search',
}

export function collectChallengeSteps(
  algorithm: AlgorithmId,
  array: number[],
  target: number,
  graph: GraphDefinition,
  startNode = graph.nodes[0] ?? 'A',
): AlgorithmStep[] {
  let generated: Generator<AlgorithmStep>
  switch (algorithm) {
    case 'binary-search': generated = binarySearchSteps(array, target); break
    case 'bubble-sort': generated = bubbleSortSteps(array); break
    case 'selection-sort': generated = selectionSortSteps(array); break
    case 'bfs': generated = graphTraversalSteps('bfs', graph, startNode); break
    case 'dfs': generated = graphTraversalSteps('dfs', graph, startNode); break
  }
  return [...generated].filter((step) => Boolean(step.question))
}
