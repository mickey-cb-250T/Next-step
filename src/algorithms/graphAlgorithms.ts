import type { AlgorithmStep, GraphDefinition, GraphSnapshot } from './types'

function adjacencyFor(graph: GraphDefinition): Map<string, string[]> {
  const adjacency = new Map(graph.nodes.map((node) => [node, [] as string[]]))
  for (const [left, right] of graph.edges) {
    adjacency.get(left)?.push(right)
    adjacency.get(right)?.push(left)
  }
  return adjacency
}

export function* graphTraversalSteps(
  algorithm: 'bfs' | 'dfs', graph: GraphDefinition, start: string,
): Generator<AlgorithmStep> {
  const adjacency = adjacencyFor(graph)
  const neighbors = adjacency.get(start) ?? []
  const visited = [start]
  const discovered = new Set([start, ...neighbors])
  const frontier = algorithm === 'bfs' ? [...neighbors] : [...neighbors].reverse()
  let turn = 0

  while (frontier.length > 0) {
    const candidate = algorithm === 'bfs' ? frontier[0] : frontier[frontier.length - 1]
    const state: GraphSnapshot = {
      kind: 'graph', algorithm, graph, visited: [...visited], frontier: [...frontier], current: candidate, start,
    }
    const detail = algorithm === 'bfs'
      ? `BFS uses a first-in, first-out queue. ${candidate} entered the frontier earlier than the other available nodes.`
      : `DFS follows the most recently discovered branch first. ${candidate} is at the top of the stack.`
    yield {
      id: `${algorithm}-${turn++}`, state,
      explanation: `${detail} Visit ${candidate} next, then add its undiscovered neighbors.`,
      question: {
        kind: 'graph', prompt: `${algorithm === 'bfs' ? 'Which node leaves the queue next?' : 'Which node is explored next?'}`,
        correct: candidate,
        options: graph.nodes.filter((node) => !visited.includes(node)).map((node) => ({
          id: node,
          label: node,
          detail: frontier.includes(node) ? 'Waiting in the frontier' : 'Not discovered yet',
        })),
        hint: algorithm === 'bfs'
          ? 'Read the queue from the oldest entry. BFS expands outward in layers.'
          : 'Follow the newest branch on the stack before backtracking.',
        topic: algorithm === 'bfs' ? 'Queue order and breadth' : 'Stack order and depth',
      },
    }

    if (algorithm === 'bfs') frontier.shift()
    else frontier.pop()
    visited.push(candidate)
    const nextNeighbors = adjacency.get(candidate) ?? []
    const orderedNeighbors = algorithm === 'bfs' ? nextNeighbors : [...nextNeighbors].reverse()
    for (const neighbor of orderedNeighbors) {
      if (discovered.has(neighbor)) continue
      discovered.add(neighbor)
      frontier.push(neighbor)
    }
  }
}
