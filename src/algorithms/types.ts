export type AlgorithmId = 'binary-search' | 'bubble-sort' | 'selection-sort' | 'bfs' | 'dfs'
export type Difficulty = 'beginner' | 'normal' | 'expert'

export interface AnswerOption {
  id: string
  label: string
  detail?: string
}

export interface PredictionQuestion {
  kind: 'binary' | 'bubble' | 'selection' | 'graph'
  prompt: string
  correct: string
  options: AnswerOption[]
  hint: string
  topic: string
}

export interface ArraySnapshot {
  kind: 'array'
  mode: 'binary' | 'bubble' | 'selection'
  values: number[]
  active: number[]
  sorted: number[]
  low?: number
  high?: number
  mid?: number
  target?: number
  pass?: number
}

export interface GraphDefinition {
  nodes: string[]
  edges: Array<[string, string]>
}

export interface GraphSnapshot {
  kind: 'graph'
  algorithm: 'bfs' | 'dfs'
  graph: GraphDefinition
  visited: string[]
  frontier: string[]
  current: string
  start: string
}

export type StepState = ArraySnapshot | GraphSnapshot

export interface AlgorithmStep {
  id: string
  state: StepState
  explanation: string
  question?: PredictionQuestion
}

export interface RunSummary {
  id: string
  algorithm: AlgorithmId
  algorithmLabel: string
  score: number
  accuracy: number
  correct: number
  total: number
  mistakes: number
  bestStreak?: number
  durationSeconds?: number
  date: string
  weakTopic?: string
}
