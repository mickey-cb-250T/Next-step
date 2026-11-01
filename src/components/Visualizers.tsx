import { useMemo } from 'react'
import {
  forceCenter, forceLink, forceManyBody, forceSimulation,
  type SimulationLinkDatum, type SimulationNodeDatum,
} from 'd3'
import type { AlgorithmStep, ArraySnapshot, GraphSnapshot, PredictionQuestion } from '../algorithms/types'

interface VisualizerProps {
  step: AlgorithmStep
  disabled: boolean
  onPredict: (answer: string) => void
}

export function ChallengeVisualizer({ step, disabled, onPredict }: VisualizerProps) {
  if (step.state.kind === 'graph') return <GraphVisualizer state={step.state} disabled={disabled} onPredict={onPredict} />
  return <ArrayVisualizer state={step.state} question={step.question} disabled={disabled} onPredict={onPredict} />
}

function ArrayVisualizer({ state, question, disabled, onPredict }: {
  state: ArraySnapshot; question?: PredictionQuestion; disabled: boolean; onPredict: (answer: string) => void
}) {
  const maxValue = Math.max(...state.values, 1)
  const minValue = Math.min(...state.values, 0)
  const span = Math.max(1, maxValue - minValue)
  const values = state.values

  if (state.mode === 'binary') {
    return <>
      <div className="target-chip"><span>SEARCHING FOR</span><strong>{state.target}</strong></div>
      <div className="binary-row" aria-label="Sorted array. Choose a half to discard by clicking a cell.">
        {values.map((value, index) => {
          const inRange = index >= (state.low ?? 0) && index <= (state.high ?? values.length - 1)
          const isMid = index === state.mid
          const isFound = state.target === value && isMid
          const targetFound = state.mid !== undefined && state.target === values[state.mid]
          const side = state.mid === undefined || targetFound ? 'found' : index <= state.mid ? 'discard-left' : 'discard-right'
          return <button
            className={`array-cell interactive ${!inRange ? 'dimmed' : ''} ${isMid ? 'midpoint' : ''} ${isFound ? 'completed' : ''}`}
            key={`${value}-${index}`} onClick={() => !disabled && onPredict(side)} disabled={disabled || (targetFound && !isMid)}
            aria-label={targetFound && !isMid ? `Value ${value}; the target is already found at the midpoint` : `Value ${value}, index ${index}${isMid ? ', midpoint' : ''}. Choose this half.`}
          >
            {isMid && <span className="cell-marker">mid</span>}
            <span className="cell-value">{value}</span><span className="cell-index">{String(index).padStart(2, '0')}</span>
          </button>
        })}
      </div>
      <div className="interval-row"><span className="interval-chip">LOW <strong>{state.low ?? 0}</strong></span><span className="interval-chip">MID <strong>{state.mid ?? '—'}</strong></span><span className="interval-chip">HIGH <strong>{state.high ?? values.length - 1}</strong></span></div>
      <div className="array-label">Click any value on the half you think gets discarded</div>
    </>
  }

  const isBubble = state.mode === 'bubble'
  return <>
    {isBubble && <div className="board-meta"><span>ADJACENT PAIR</span><span>PASS {state.pass ?? 1}</span></div>}
    <div className="bars-wrap" role="group" aria-label="Interactive sorting array">
      {values.map((value, index) => {
        const isActive = state.active.includes(index)
        const isSorted = state.sorted.includes(index)
        const percent = 24 + ((value - minValue) / span) * 67
        const selectable = !isBubble && question?.kind === 'selection'
        return <div className="bar-column" key={`${value}-${index}`}>
          <button
            className={`bar-shape ${isActive ? 'active' : ''} ${isSorted ? 'sorted' : ''} ${selectable && !disabled ? 'clickable' : ''}`}
            style={{ height: `${percent}%` }}
            disabled={disabled || !selectable}
            onClick={() => selectable && !disabled && onPredict(`item-${index}`)}
            aria-label={selectable ? `Choose value ${value} for the next position` : `Value ${value}`}
          >{value}</button>
          <span className="bar-index">{String(index).padStart(2, '0')}</span>
        </div>
      })}
    </div>
    {isBubble && <div className="pair-control">
      <button className="pair-choice" disabled={disabled} onClick={() => onPredict('swap')}><span>⇄</span> Swap {values[state.active[0]]} &amp; {values[state.active[1]]}</button>
      <button className="pair-choice" disabled={disabled} onClick={() => onPredict('keep')}><span>↗</span> Keep order</button>
    </div>}
    <div className="array-label">{isBubble ? 'Compare adjacent values — choose the next move' : 'Tap a bar to choose the next value for the sorted section'}</div>
  </>
}

interface LayoutNode extends SimulationNodeDatum { id: string }
type LayoutLink = SimulationLinkDatum<LayoutNode>

function GraphVisualizer({ state, disabled, onPredict }: {
  state: GraphSnapshot; disabled: boolean; onPredict: (answer: string) => void
}) {
  const layout = useMemo(() => {
    const nodes: LayoutNode[] = state.graph.nodes.map((id) => ({ id }))
    const links: LayoutLink[] = state.graph.edges.map(([source, target]) => ({ source, target }))
    const simulation = forceSimulation<LayoutNode>(nodes)
      .force('link', forceLink<LayoutNode, LayoutLink>(links).id((node) => node.id).distance(118).strength(.8))
      .force('charge', forceManyBody<LayoutNode>().strength(-580))
      .force('center', forceCenter(360, 190))
      .stop()
    for (let tick = 0; tick < 160; tick += 1) simulation.tick()
    const positions = new Map(nodes.map((node) => [node.id, {
      x: Math.max(56, Math.min(664, node.x ?? 360)),
      y: Math.max(54, Math.min(326, node.y ?? 190)),
    }]))
    return { nodes: state.graph.nodes.map((id) => ({ id, ...(positions.get(id) ?? { x: 360, y: 190 }) })), positions }
  }, [state.graph])
  const edgeIsVisited = (left: string, right: string) => state.visited.includes(left) && state.visited.includes(right)
  const frontierSet = new Set(state.frontier)
  const visitedSet = new Set(state.visited)

  return <>
    <svg className="graph-svg" viewBox="0 0 720 380" role="group" aria-label={`${state.algorithm.toUpperCase()} graph. Click a node to predict the next visit.`}>
      {state.graph.edges.map(([left, right]) => {
        const a = layout.positions.get(left) ?? { x: 0, y: 0 }
        const b = layout.positions.get(right) ?? { x: 0, y: 0 }
        return <line key={`${left}-${right}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
          className={`graph-edge ${edgeIsVisited(left, right) ? 'visited-edge' : ''} ${frontierSet.has(left) && frontierSet.has(right) ? 'frontier-edge' : ''}`} />
      })}
      {layout.nodes.map((node) => {
        const isVisited = visitedSet.has(node.id)
        const isFrontier = frontierSet.has(node.id)
        const isActive = state.current === node.id
        const className = `graph-node ${isVisited ? 'visited' : ''} ${isFrontier ? 'frontier' : ''} ${isActive ? 'active' : ''}`
        return <g key={node.id} className={className} role="button" tabIndex={0}
          aria-label={`Predict node ${node.id}${isFrontier ? ', in frontier' : ''}`}
          onClick={() => !disabled && onPredict(node.id)}
          onKeyDown={(event) => { if (!disabled && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onPredict(node.id) } }}
          aria-disabled={disabled}>
          <circle cx={node.x} cy={node.y} r="24" />
          <text x={node.x} y={node.y}>{node.id}</text>
          {node.id === state.start && <text className="graph-node-caption" x={node.x} y={node.y + 39}>START</text>}
        </g>
      })}
    </svg>
    <div className="graph-legend"><span className="legend-item"><i className="legend-dot" />Visited</span><span className="legend-item"><i className="legend-dot frontier" />Frontier</span><span className="legend-item"><i className="legend-dot unknown" />Not explored</span></div>
    <div className="array-label">Select the next node in the {state.algorithm === 'bfs' ? 'queue' : 'depth-first stack'}</div>
  </>
}
