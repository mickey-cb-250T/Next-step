import { describe, expect, it } from 'vitest'
import { graphTraversalSteps } from './graphAlgorithms'
import type { GraphDefinition } from './types'

const diamond: GraphDefinition = {
  nodes: ['A', 'B', 'C', 'D'],
  edges: [['A', 'B'], ['A', 'C'], ['B', 'D'], ['C', 'D']],
}

describe('graph traversal generators', () => {
  it('visits the oldest discovered node first in BFS', () => {
    const steps = [...graphTraversalSteps('bfs', diamond, 'A')]
    expect(steps.map((step) => step.question?.correct)).toEqual(['B', 'C', 'D'])
    expect(steps[0].state).toMatchObject({ kind: 'graph', algorithm: 'bfs', visited: ['A'], frontier: ['B', 'C'] })
    expect(steps[0].explanation).toContain('first-in, first-out queue')
  })

  it('follows the newest branch before backtracking in DFS', () => {
    const steps = [...graphTraversalSteps('dfs', diamond, 'A')]
    expect(steps.map((step) => step.question?.correct)).toEqual(['B', 'D', 'C'])
    expect(steps[0].explanation).toContain('most recently discovered branch')
    expect(steps[1].state).toMatchObject({ visited: ['A', 'B'], current: 'D' })
  })
})
