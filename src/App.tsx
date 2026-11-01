import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity, ArrowRight, BarChart3, Check, CheckCircle2,
  ChevronLeft, ChevronRight, CircleHelp, Clock3, Download, Flame, GitBranch, Lightbulb,
  ListOrdered, Network, PenLine, RotateCcw, Search, Share2, Shuffle, Sparkles,
  Target, Trophy, TriangleAlert, X, Zap,
} from 'lucide-react'
import { ALGORITHM_LABELS, collectChallengeSteps } from './algorithms'
import type { AlgorithmId, Difficulty, GraphDefinition, RunSummary } from './algorithms/types'
import { ChallengeVisualizer } from './components/Visualizers'
import { accuracyPercent, classifyMistake, scorePrediction } from './engine/scoring'
import { formatDuration } from './engine/time'
import { progressFor, useProgressStore } from './store/progressStore'

const ALGORITHMS: Array<{ id: AlgorithmId; subtitle: string; icon: typeof Search }> = [
  { id: 'binary-search', subtitle: 'Sorted arrays', icon: Search },
  { id: 'bubble-sort', subtitle: 'Adjacent swaps', icon: Activity },
  { id: 'selection-sort', subtitle: 'Find the minimum', icon: ListOrdered },
  { id: 'bfs', subtitle: 'Explore by layers', icon: Network },
  { id: 'dfs', subtitle: 'Follow a branch', icon: GitBranch },
]

const BINARY_ARRAY = [3, 8, 12, 20, 27, 34, 41, 56, 63]
const BUBBLE_ARRAY = [34, 12, 41, 8, 27, 56, 20, 63, 3]
const SELECTION_ARRAY = [44, 16, 31, 8, 25, 37, 12, 53, 4]
const BASE_GRAPH: GraphDefinition = {
  nodes: ['A', 'B', 'C', 'D', 'E', 'F'],
  edges: [['A', 'B'], ['A', 'C'], ['B', 'D'], ['B', 'E'], ['C', 'F'], ['E', 'F']],
}

interface Mistake {
  stepIndex: number
  answer: string
  correct: string
  answerDisplay: string
  correctDisplay: string
  explanation: string
  topic: string
  category: string
  question: string
}

function makeRandomGraph(): GraphDefinition {
  const nodes = ['A', 'B', 'C', 'D', 'E', 'F']
  const edges: Array<[string, string]> = []
  for (let index = 1; index < nodes.length; index += 1) {
    const parent = nodes[Math.floor(Math.random() * index)]
    edges.push([parent, nodes[index]])
  }
  for (let left = 0; left < nodes.length; left += 1) {
    for (let right = left + 2; right < nodes.length; right += 1) {
      if (Math.random() > .76 && !edges.some(([a, b]) => a === nodes[left] && b === nodes[right])) {
        edges.push([nodes[left], nodes[right]])
      }
    }
  }
  return { nodes, edges }
}

function randomArray(): number[] {
  const values = new Set<number>()
  while (values.size < 9) values.add(4 + Math.floor(Math.random() * 88))
  return [...values]
}

function answerLabel(algorithm: AlgorithmId, answer: string, values?: number[]): string {
  if (answer === 'timeout') return 'Time ran out'
  if (algorithm === 'bfs' || algorithm === 'dfs') return `Node ${answer}`
  if (answer.startsWith('item-')) {
    const index = Number(answer.slice(5))
    return `Value ${values?.[index] ?? index}`
  }
  if (answer === 'swap') return 'Swap the pair'
  if (answer === 'keep') return 'Keep the pair in order'
  if (answer === 'found') return 'Stop — the target is found'
  return answer.replace('discard-', 'Discard the ').concat(answer.startsWith('discard-') ? ' half' : '')
}

function escapeSvg(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;')
}

function makeScoreImage(summary: RunSummary): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#1a2420"/><circle cx="1080" cy="75" r="225" fill="none" stroke="#c8ed72" stroke-opacity=".24" stroke-width="2"/><circle cx="1080" cy="75" r="265" fill="none" stroke="#c8ed72" stroke-opacity=".12" stroke-width="2"/><text x="88" y="104" fill="#c8ed72" font-family="monospace" font-size="22" letter-spacing="4">PREDICT THE NEXT STEP</text><text x="88" y="194" fill="#f4f2eb" font-family="Arial,sans-serif" font-size="46" font-weight="700">${escapeSvg(summary.algorithmLabel)}</text><text x="88" y="354" fill="#c8ed72" font-family="monospace" font-size="140" font-weight="500">${summary.score}</text><text x="92" y="408" fill="#b7bbb0" font-family="Arial,sans-serif" font-size="22">POINTS EARNED</text><text x="680" y="318" fill="#f4f2eb" font-family="monospace" font-size="68">${summary.accuracy}%</text><text x="684" y="358" fill="#b7bbb0" font-family="Arial,sans-serif" font-size="19">ACCURACY</text><text x="680" y="424" fill="#f4f2eb" font-family="monospace" font-size="38">${summary.correct} / ${summary.total}</text><text x="684" y="462" fill="#b7bbb0" font-family="Arial,sans-serif" font-size="18">DECISIONS PREDICTED</text><text x="684" y="500" fill="#c8ed72" font-family="monospace" font-size="18">SESSION TIME · ${formatDuration(summary.durationSeconds ?? 0)}</text><line x1="88" y1="530" x2="1112" y2="530" stroke="#576059"/><text x="88" y="572" fill="#b7bbb0" font-family="Arial,sans-serif" font-size="19">I learned by making the next move, not just watching it.</text></svg>`
}

export default function App() {
  const initialSharedSummary = useMemo(() => readSharedSummary(), [])
  const [screen, setScreen] = useState<'play' | 'progress' | 'report' | 'review' | 'rewind' | 'shared'>(() => initialSharedSummary ? 'shared' : 'play')
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<AlgorithmId>('binary-search')
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner')
  const [array, setArray] = useState<number[]>(BINARY_ARRAY)
  const [target, setTarget] = useState(34)
  const [graph, setGraph] = useState<GraphDefinition>(BASE_GRAPH)
  const [startNode, setStartNode] = useState('A')
  const [stepIndex, setStepIndex] = useState(0)
  const [rewindIndex, setRewindIndex] = useState(0)
  const [answer, setAnswer] = useState<string | null>(null)
  const [reviewAnswer, setReviewAnswer] = useState<string | null>(null)
  const [reviewCursor, setReviewCursor] = useState(0)
  const [points, setPoints] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [attemptCount, setAttemptCount] = useState(0)
  const [lastCorrect, setLastCorrect] = useState(false)
  const [lastPoints, setLastPoints] = useState(0)
  const [mistakes, setMistakes] = useState<Mistake[]>([])
  const [hintVisible, setHintVisible] = useState(false)
  const [hintUsed, setHintUsed] = useState(false)
  const [seconds, setSeconds] = useState(18)
  const [runStartedAt, setRunStartedAt] = useState(() => Date.now())
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [customOpen, setCustomOpen] = useState(false)
  const [customInput, setCustomInput] = useState('')
  const [customTarget, setCustomTarget] = useState('')
  const [customError, setCustomError] = useState('')
  const [toast, setToast] = useState('')
  const [summary, setSummary] = useState<RunSummary | null>(initialSharedSummary)
  const [hasRecorded, setHasRecorded] = useState(false)

  const history = useProgressStore((state) => state.history)
  const recordRun = useProgressStore((state) => state.recordRun)
  const steps = useMemo(
    () => collectChallengeSteps(selectedAlgorithm, array, target, graph, startNode),
    [selectedAlgorithm, array, target, graph, startNode],
  )
  const reviewMistake = mistakes[reviewCursor]
  const activeStepIndex = screen === 'review' ? reviewMistake?.stepIndex ?? 0 : screen === 'rewind' ? rewindIndex : stepIndex
  const activeStep = steps[activeStepIndex]
  const activeAnswer = screen === 'review' ? reviewAnswer : screen === 'rewind' ? null : answer
  const question = activeStep?.question
  const isGraphChallenge = selectedAlgorithm === 'bfs' || selectedAlgorithm === 'dfs'
  const algorithmLabel = ALGORITHM_LABELS[selectedAlgorithm]
  const hintIsVisible = difficulty === 'beginner' || hintVisible
  const frontier = activeStep?.state.kind === 'graph' ? activeStep.state.frontier : []
  const runAccuracy = accuracyPercent(correctCount, attemptCount)
  const submitRef = useRef<(choice: string) => void>(() => {})

  const showToast = useCallback((message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2300)
  }, [])

  const answerQuestion = useCallback((choice: string) => {
    if (screen === 'review') {
      if (reviewAnswer === null) setReviewAnswer(choice)
      return
    }
    if (screen !== 'play' || answer !== null || !question) return
    const outcome = scorePrediction(choice, question.correct, streak, hintUsed)
    const isCorrect = outcome.correct
    const earned = outcome.netPoints
    setAnswer(choice)
    setLastCorrect(isCorrect)
    setLastPoints(earned)
    setAttemptCount((count) => count + 1)
    if (isCorrect) {
      setCorrectCount((count) => count + 1)
      setPoints((score) => Math.max(0, score + earned))
      setStreak(outcome.nextStreak)
      setBestStreak((peak) => Math.max(peak, outcome.nextStreak))
    } else {
      setPoints((score) => Math.max(0, score + earned))
      setStreak(outcome.nextStreak)
      const category = classifyMistake(selectedAlgorithm, choice, question.correct, frontier)
      setMistakes((current) => [...current, {
        stepIndex, answer: choice, correct: question.correct, explanation: activeStep.explanation,
        answerDisplay: answerLabel(selectedAlgorithm, choice, array), correctDisplay: answerLabel(selectedAlgorithm, question.correct, array),
        topic: question.topic, category, question: question.prompt,
      }])
    }
  }, [screen, reviewAnswer, answer, question, streak, hintUsed, selectedAlgorithm, frontier, stepIndex, activeStep, array])
  submitRef.current = answerQuestion

  useEffect(() => {
    if (screen !== 'play' || difficulty !== 'expert' || answer !== null || !question) return
    setSeconds(18)
    const timer = window.setInterval(() => {
      setSeconds((remaining) => {
        if (remaining <= 1) {
          window.clearInterval(timer)
          submitRef.current('timeout')
          return 0
        }
        return remaining - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [screen, difficulty, answer, stepIndex, question])

  useEffect(() => {
    if (screen === 'progress' || screen === 'report' || screen === 'shared') return
    const updateElapsed = () => setElapsedSeconds(Math.floor((Date.now() - runStartedAt) / 1000))
    updateElapsed()
    const timer = window.setInterval(updateElapsed, 1000)
    return () => window.clearInterval(timer)
  }, [screen, runStartedAt])

  const startRun = useCallback(() => {
    const startedAt = Date.now()
    setScreen('play')
    setRunStartedAt(startedAt)
    setElapsedSeconds(0)
    setStepIndex(0)
    setAnswer(null)
    setReviewAnswer(null)
    setPoints(0)
    setStreak(0)
    setBestStreak(0)
    setCorrectCount(0)
    setAttemptCount(0)
    setLastCorrect(false)
    setLastPoints(0)
    setMistakes([])
    setHintVisible(false)
    setHintUsed(false)
    setSummary(null)
    setHasRecorded(false)
  }, [])

  const selectAlgorithm = (algorithm: AlgorithmId) => {
    const startedAt = Date.now()
    setSelectedAlgorithm(algorithm)
    setRunStartedAt(startedAt)
    setElapsedSeconds(0)
    setAnswer(null)
    setStepIndex(0)
    setPoints(0)
    setStreak(0)
    setBestStreak(0)
    setCorrectCount(0)
    setAttemptCount(0)
    setLastCorrect(false)
    setLastPoints(0)
    setMistakes([])
    setSummary(null)
    setHasRecorded(false)
    setHintVisible(false)
    setHintUsed(false)
    if (algorithm === 'binary-search') {
      setArray(BINARY_ARRAY)
      setTarget(34)
    } else if (algorithm === 'bubble-sort') setArray(BUBBLE_ARRAY)
    else if (algorithm === 'selection-sort') setArray(SELECTION_ARRAY)
    else {
      setGraph(BASE_GRAPH)
      setStartNode('A')
    }
    setScreen('play')
  }

  const recordAndFinish = () => {
    if (hasRecorded) {
      setScreen('report')
      return
    }
    const total = steps.length
    const accuracy = accuracyPercent(correctCount, total)
    const topicCounts = mistakes.reduce<Record<string, number>>((counts, issue) => {
      counts[issue.category] = (counts[issue.category] ?? 0) + 1
      return counts
    }, {})
    const weakTopic = Object.entries(topicCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
    const durationSeconds = Math.max(0, Math.floor((Date.now() - runStartedAt) / 1000))
    setElapsedSeconds(durationSeconds)
    const result: RunSummary = {
      id: `${Date.now()}`, algorithm: selectedAlgorithm, algorithmLabel, score: points,
      accuracy, correct: correctCount, total, mistakes: mistakes.length, bestStreak,
      date: new Date().toISOString(), weakTopic, durationSeconds,
    }
    setSummary(result)
    setHasRecorded(true)
    recordRun(result)
    setScreen('report')
  }

  const handleNext = () => {
    if (screen === 'review') {
      if (reviewCursor < mistakes.length - 1) {
        setReviewCursor((cursor) => cursor + 1)
        setReviewAnswer(null)
      } else setScreen('report')
      return
    }
    if (stepIndex + 1 < steps.length) {
      setStepIndex((current) => current + 1)
      setAnswer(null)
      setHintVisible(false)
      setHintUsed(false)
    } else recordAndFinish()
  }

  const openCustom = () => {
    setCustomError('')
    setCustomInput(isGraphChallenge ? graph.edges.map(([left, right]) => `${left}-${right}`).join(', ') : array.join(', '))
    setCustomTarget(String(target))
    setCustomOpen(true)
  }

  const applyCustom = () => {
    setCustomError('')
    if (isGraphChallenge) {
      const pairs = customInput.split(/[\n,;]+/).map((part) => part.trim()).filter(Boolean).map((part) => part.match(/^([A-Za-z0-9])\s*[-:]\s*([A-Za-z0-9])$/))
      if (pairs.some((pair) => !pair)) { setCustomError('Use edges like A-B, A-C, B-D.'); return }
      const edges = pairs.map((pair) => [pair![1].toUpperCase(), pair![2].toUpperCase()] as [string, string]).filter(([left, right]) => left !== right)
      const nodes = [...new Set(edges.flat())]
      if (nodes.length < 3 || nodes.length > 8 || edges.length < 2) {
        setCustomError('Create a connected-looking graph with 3–8 nodes and at least 2 edges.'); return
      }
      const reached = new Set([nodes[0]])
      const pending = [nodes[0]]
      while (pending.length) {
        const current = pending.pop()!
        for (const [left, right] of edges) {
          const neighbor = left === current ? right : right === current ? left : ''
          if (neighbor && !reached.has(neighbor)) { reached.add(neighbor); pending.push(neighbor) }
        }
      }
      if (reached.size !== nodes.length) { setCustomError('Connect every node so the traversal can reach the full graph.'); return }
      setGraph({ nodes, edges })
      setStartNode(nodes[0])
    } else {
      const values = customInput.split(/[\s,;]+/).map(Number)
      if (values.length < 4 || values.length > 12 || values.some((value) => !Number.isFinite(value))) {
        setCustomError('Enter 4–12 whole numbers.'); return
      }
      const normalized = values.map((value) => Math.round(value))
      setArray(selectedAlgorithm === 'binary-search' ? [...normalized].sort((a, b) => a - b) : normalized)
      if (selectedAlgorithm === 'binary-search') {
        const parsedTarget = Number(customTarget)
        if (!Number.isFinite(parsedTarget)) { setCustomError('Enter a numeric target value.'); return }
        setTarget(parsedTarget)
      }
    }
    setCustomOpen(false)
    startRun()
  }

  const shuffleChallenge = () => {
    if (isGraphChallenge) {
      const nextGraph = makeRandomGraph()
      setGraph(nextGraph)
      setStartNode(nextGraph.nodes[0])
    } else {
      const nextArray = randomArray()
      if (selectedAlgorithm === 'binary-search') {
        const sorted = [...nextArray].sort((a, b) => a - b)
        setArray(sorted)
        setTarget(sorted[Math.floor(Math.random() * sorted.length)])
      } else {
        for (let index = nextArray.length - 1; index > 0; index -= 1) {
          const swapIndex = Math.floor(Math.random() * (index + 1))
          ;[nextArray[index], nextArray[swapIndex]] = [nextArray[swapIndex], nextArray[index]]
        }
        setArray(nextArray)
      }
    }
    startRun()
  }

  const revealHint = () => {
    if (difficulty === 'expert' || hintIsVisible || answer !== null) return
    setHintVisible(true)
    setHintUsed(true)
    showToast('Hint revealed · 25 points will be charged when you answer')
  }

  const shareLink = async () => {
    if (!summary) return
    const url = new URL(window.location.href)
    url.searchParams.set('share', 'score')
    url.searchParams.set('algorithm', summary.algorithm)
    url.searchParams.set('score', String(summary.score))
    url.searchParams.set('accuracy', String(summary.accuracy))
    url.searchParams.set('correct', String(summary.correct))
    url.searchParams.set('total', String(summary.total))
    url.searchParams.set('mistakes', String(summary.mistakes))
    url.searchParams.set('bestStreak', String(summary.bestStreak ?? 0))
    url.searchParams.set('durationSeconds', String(summary.durationSeconds ?? 0))
    try {
      await navigator.clipboard.writeText(url.toString())
      showToast('Score link copied')
    } catch {
      showToast(url.toString())
    }
  }

  const downloadScore = () => {
    if (!summary) return
    const objectUrl = URL.createObjectURL(new Blob([makeScoreImage(summary)], { type: 'image/svg+xml' }))
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = `next-step-${summary.algorithm}.svg`
    link.click()
    URL.revokeObjectURL(objectUrl)
    showToast('Score card downloaded as an SVG image')
  }

  const reviewMistakeAt = (index: number) => {
    setReviewCursor(index)
    setReviewAnswer(null)
    setScreen('review')
  }

  const pageTitle = screen === 'progress' ? 'Your learning, in motion.' : screen === 'report' ? 'You made the moves.' : screen === 'review' ? 'Let’s replay that moment.' : screen === 'rewind' ? 'Look back, then move forward.' : screen === 'shared' ? 'A score worth sharing.' : 'Don’t watch it happen. Call the next move.'
  const pageDescription = screen === 'progress'
    ? 'A local record of every decision you’ve practiced. Your weak spots are your next best step.'
    : screen === 'report' ? 'Every prediction is progress — especially the ones you had to think twice about.'
      : screen === 'review' ? 'Same decision, fresh eyes. This replay won’t change your original score.'
        : screen === 'rewind' ? 'Review a previous saved state without changing your score or current decision.'
          : screen === 'shared' ? 'A learner shared their prediction-first session. Your own next move is one click away.'
          : 'A hands-on algorithm lab. Predict the next step, then see exactly why it works.'

  return <div className="app-shell">
    <header className="topbar">
      <button className="brand" onClick={() => { setScreen('play'); if (answer) startRun() }} aria-label="Next Step home">
        <span className="brand-mark"><Activity size={18} strokeWidth={2.6} /></span>
        <span className="brand-copy"><span className="brand-name">NEXT / STEP</span><span className="brand-tag">algorithm practice, made active</span></span>
      </button>
      <nav className="top-nav" aria-label="Main navigation">
        <button className={`nav-button ${screen === 'play' || screen === 'review' || screen === 'rewind' ? 'active' : ''}`} onClick={() => setScreen('play')}><Zap size={14} /> Play</button>
        <button className={`nav-button ${screen === 'progress' ? 'active' : ''}`} onClick={() => setScreen('progress')}><BarChart3 size={14} /> Progress</button>
      </nav>
      <div className="header-right">{(screen === 'play' || screen === 'review' || screen === 'rewind') && <span className={`live-clock-pill ${screen === 'play' ? '' : 'replay'}`} aria-label={`${screen === 'play' ? 'Live' : 'Replay'} session time ${formatDuration(elapsedSeconds)}`}><i className="live-dot" aria-hidden="true" /><span className="live-label">{screen === 'play' ? 'LIVE SESSION' : 'REPLAY'}</span><strong>{formatDuration(elapsedSeconds)}</strong></span>}<span className="streak-pill"><Flame size={14} fill="#ed7952" /> {streak} streak</span><span className="avatar-mark">N</span></div>
    </header>

    <main className="main-wrap">
      <div className="page-intro">
        <div><div className="eyebrow"><span className="eyebrow-dot" /> Learn by predicting</div><h1>{pageTitle}</h1><p>{pageDescription}</p></div>
        <div className="intro-side"><span className="date-stamp">INTERACTIVE ALGORITHM LAB</span><span className="intro-tag">No passive playback. Just good decisions.</span></div>
      </div>

      <AnimatePresence mode="wait">
        {screen === 'progress' ? <motion.section key="progress" className="progress-page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: .22 }}>
          <ProgressPage history={history} onPlay={() => { setScreen('play'); startRun() }} />
        </motion.section> : null}

        {screen === 'report' && summary ? <motion.section key="report" className="report-page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: .22 }}>
          <ReportPage summary={summary} mistakes={mistakes} onReplay={reviewMistakeAt} onPlayAgain={startRun} onShare={shareLink} onDownload={downloadScore} />
        </motion.section> : null}

        {screen === 'shared' && summary ? <motion.section key="shared" className="report-page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: .22 }}>
          <ReportPage summary={summary} mistakes={[]} onReplay={() => {}} onPlayAgain={() => { selectAlgorithm(summary.algorithm); startRun() }} onShare={shareLink} onDownload={downloadScore} />
        </motion.section> : null}

        {(screen === 'play' || screen === 'review' || screen === 'rewind') ? <motion.section key="workspace" className="workspace" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: .22 }}>
          <aside className="setup-rail">
            <div className="rail-heading"><span>Choose a challenge</span><span className="rail-count">{ALGORITHMS.length} TRACKS</span></div>
            <div className="algo-list">{ALGORITHMS.map(({ id, subtitle, icon: Icon }, index) => <button key={id} className={`algo-button ${selectedAlgorithm === id ? 'selected' : ''}`} aria-label={`Challenge ${index + 1}: ${ALGORITHM_LABELS[id]}`} onClick={() => selectAlgorithm(id)}>
              <span className="algo-icon"><Icon size={15} /></span><span className="algo-copy"><span className="algo-title">{ALGORITHM_LABELS[id]}</span><span className="algo-subtitle">{subtitle}</span></span><ChevronRight className="algo-chevron" size={14} />
            </button>)}</div>
            <div className="rail-divider" />
            <div className="rail-label"><span>Difficulty</span><CircleHelp size={13} /></div>
            <div className="difficulty-pills">{(['beginner', 'normal', 'expert'] as const).map((level) => <button key={level} onClick={() => setDifficulty(level)} className={`difficulty-button ${difficulty === level ? 'active' : ''}`}>{level[0].toUpperCase() + level.slice(1)}</button>)}</div>
            <p className="difficulty-note">{difficulty === 'beginner' ? 'Friendly nudges appear as you play.' : difficulty === 'normal' ? 'Ask for a hint when you need one — it costs 25 points.' : '18 seconds per decision. No hints. Trust your instincts.'}</p>
            <div className="rail-actions"><button className="text-action" onClick={shuffleChallenge}><Shuffle size={14} /> Shuffle this challenge</button><button className="text-action" onClick={openCustom}><PenLine size={14} /> Use custom input</button></div>
            <p className="rail-footnote">Your progress stays in this browser. No account or backend required.</p>
            <div className="roadmap-mini"><strong>ON THE ROADMAP</strong><span>V2 · Quick Sort, Dijkstra</span><span>V3 · Merge Sort, A*, Union-Find, BST insertion, Heap ops</span></div>
          </aside>

          <div className="center-stage">
            {screen === 'review' && <div className="review-banner"><strong>REPLAY MODE</strong> · Practice this decision again; it won’t affect your score or saved result.</div>}
            {screen === 'rewind' && <div className="review-banner"><strong>REWIND PREVIEW · STEP {activeStepIndex + 1}</strong> · Your answer and score are unchanged. Return to the current decision when ready.</div>}
            <section className="session-card">
              <div className="session-topline">
                <div className="session-id"><span className="eyebrow-dot" /><strong>{algorithmLabel}</strong><span>·</span><span>{isGraphChallenge ? 'GRAPH TRAVERSAL' : 'ARRAY CHALLENGE'}</span></div>
                <div className="session-top-actions">
                  {difficulty === 'expert' && screen === 'play' && answer === null && <span className="streak-pill"><Clock3 size={13} /> 00:{String(seconds).padStart(2, '0')}</span>}
                  {screen === 'play' && stepIndex > 0 && <button className="icon-button" title="Rewind one saved step" aria-label="Rewind one saved step" onClick={() => { setRewindIndex(stepIndex - 1); setScreen('rewind') }}><ChevronLeft size={14} /></button>}
                  <button className="icon-button" title="Shuffle challenge" aria-label="Shuffle challenge" onClick={shuffleChallenge}><Shuffle size={14} /></button>
                  <button className="icon-button" title="Custom input" aria-label="Use custom input" onClick={openCustom}><PenLine size={14} /></button>
                  <button className="icon-button" title="Start over" aria-label="Start over" onClick={startRun}><RotateCcw size={14} /></button>
                </div>
              </div>
              <div className="challenge-content">
                <div className="question-heading"><div><div className="eyebrow"><span className="eyebrow-dot" /> Decision point {String(activeStepIndex + 1).padStart(2, '0')}</div><h2>{question?.prompt ?? 'This run is ready.'}</h2><p>{isGraphChallenge ? `Starting from node ${activeStep?.state.kind === 'graph' ? activeStep.state.start : startNode}, follow the ${selectedAlgorithm === 'bfs' ? 'queue' : 'stack'} and make your next pick.` : selectedAlgorithm === 'binary-search' ? 'The target is somewhere in this ordered sequence. Every decision cuts the search space.' : 'The array is in motion. Make the local choice that moves it closer to order.'}</p></div><span className="question-index"><b>{String(activeStepIndex + 1).padStart(2, '0')}</b> / {String(steps.length).padStart(2, '0')}</span></div>
                <div className="challenge-board">
                  <div className="board-meta"><span>{isGraphChallenge ? `${selectedAlgorithm.toUpperCase()} · START AT ${startNode}` : selectedAlgorithm === 'binary-search' ? 'SORTED INPUT · INDEXED FROM 0' : 'LIVE ARRAY · LOWER VALUES FIRST'}</span><span>{screen === 'rewind' ? 'READ-ONLY SAVED STEP' : activeAnswer ? 'ANSWER REVEALED' : 'AWAITING YOUR PREDICTION'}</span></div>
                  {activeStep ? <ChallengeVisualizer step={activeStep} disabled={activeAnswer !== null || screen === 'rewind'} onPredict={answerQuestion} /> : <div className="empty-state"><h3>No decisions in this run</h3><p>Try a new array or graph to build a challenge.</p><button className="primary-button" onClick={shuffleChallenge}>Create a challenge <ArrowRight size={14} /></button></div>}
                </div>

                {activeAnswer !== null && activeStep && <motion.div className={`feedback-panel ${(screen === 'review' ? reviewAnswer === question?.correct : lastCorrect) ? 'correct' : 'incorrect'}`} initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }}>
                  <span className="feedback-icon">{(screen === 'review' ? reviewAnswer === question?.correct : lastCorrect) ? <Check size={14} /> : <TriangleAlert size={14} />}</span>
                  <div className="feedback-copy"><strong>{screen === 'review' ? (reviewAnswer === question?.correct ? 'Nice — that’s the right move.' : 'Not quite — look for the rule.') : lastCorrect ? `Exactly. +${lastPoints} points${streak > 1 ? ` · ${streak} in a row` : ''}` : activeAnswer === 'timeout' ? 'Time’s up — the move is revealed.' : `Not this time. You picked ${answerLabel(selectedAlgorithm, activeAnswer, array)}.`}</strong><p>{activeStep.explanation}</p>
                    {screen !== 'review' && !lastCorrect && mistakes.length > 0 && <span className="misconception-tag">MISCONCEPTION · {mistakes[mistakes.length - 1].category}</span>}
                    {screen === 'review' && <span className="misconception-tag">REPLAY ONLY · ORIGINAL SCORE UNCHANGED</span>}
                  </div>
                </motion.div>}

                <div className="feedback-footer">
                  <div>{screen === 'play' && hintIsVisible && question && activeAnswer === null && <div className="hint-copy"><strong>QUICK NUDGE</strong> · {question.hint}</div>}
                    {screen === 'play' && activeAnswer === null && <button className="hint-button" disabled={difficulty === 'expert' || hintIsVisible} onClick={revealHint}><Lightbulb size={13} />{difficulty === 'beginner' ? 'Hint included' : difficulty === 'expert' ? 'Hints disabled in Expert' : 'Reveal a hint · −25 pts'}</button>}
                  </div>
                  {screen === 'rewind' ? <button className="next-button" onClick={() => setScreen('play')}>Return to current decision <ArrowRight size={14} /></button> : activeAnswer !== null && <button className="next-button" onClick={handleNext}>{screen === 'review' ? reviewCursor < mistakes.length - 1 ? 'Next missed step' : 'Back to report' : activeStepIndex + 1 >= steps.length ? 'See report card' : 'Next decision'} <ArrowRight size={14} /></button>}
                </div>
              </div>
            </section>
            <div className="bottom-note"><CheckCircle2 size={13} /> Algorithm rules are separated from the display — each step can be replayed and explained.</div>
          </div>

          <aside className="right-rail">
            <section className="right-rail-card">
              <div className="right-card-head"><span>Run score</span><Zap size={13} /></div><div className="score-number">{points}<span style={{ fontSize: 14, color: '#85887f', fontWeight: 500 }}> XP</span></div><div className="score-sub">{answer !== null && lastCorrect ? `+${lastPoints} on that decision` : 'Points for accurate predictions'}</div>
              <div className="score-meter"><span style={{ width: `${steps.length ? Math.min(100, (attemptCount / steps.length) * 100) : 0}%` }} /></div>
              <div className="score-stats"><div className="mini-stat"><b>{runAccuracy}%</b><span>accuracy</span></div><div className="mini-stat"><b>{streak}</b><span>current streak</span></div></div>
            </section>
            <section className="right-rail-card telemetry-card">
              <div className="right-card-head"><span>Live session</span><span className={`live-badge ${screen === 'play' ? '' : 'paused'}`}><i />{screen === 'play' ? 'LIVE' : 'REPLAY'}</span></div>
              <div className="telemetry-clock"><strong>{formatDuration(elapsedSeconds)}</strong><span>ELAPSED</span></div>
              <div className="telemetry-meter"><span style={{ width: `${steps.length ? Math.min(100, (attemptCount / steps.length) * 100) : 0}%` }} /></div>
              <div className="telemetry-grid">
                <div><span>DECISION</span><strong>{String(Math.min(activeStepIndex + 1, steps.length)).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}</strong></div>
                <div><span>ANSWERED</span><strong>{attemptCount} / {steps.length}</strong></div>
                <div><span>ACCURACY</span><strong>{runAccuracy}%</strong></div>
              </div>
              <div className="telemetry-status" role="status"><i className={answer !== null ? 'answered' : ''} /><span>{screen === 'rewind' ? 'Inspecting a saved step' : screen === 'review' ? 'Replaying a missed decision' : answer !== null ? lastCorrect ? 'Correct move captured' : 'Feedback ready for your next move' : question ? 'Waiting on your prediction' : 'Challenge complete'}</span></div>
              {difficulty === 'expert' && screen === 'play' && answer === null && question && <div className="expert-window"><div><span>DECISION CLOCK</span><strong>00:{String(seconds).padStart(2, '0')}</strong></div><div className="expert-meter"><span style={{ width: `${(seconds / 18) * 100}%` }} /></div></div>}
            </section>
            <section className="right-rail-card streak-card"><div className="right-card-head"><span>Practice rhythm</span><Flame size={13} color="#e67c4b" /></div><div className="streak-copy"><strong>{streak > 1 ? `${streak} decisions, on a roll.` : 'One clear decision at a time.'}</strong><p>{history.length ? `${history.length} completed ${history.length === 1 ? 'run' : 'runs'} saved on this device.` : 'Finish a run to start your personal progress log.'}</p></div></section>
            <section className="right-rail-card callout-card"><div className="right-card-head"><span>Why this feels different</span><Sparkles className="callout-mark" size={14} /></div><p>Watching an algorithm isn’t the same as knowing what it will do.</p><small>Predict first. Get feedback second. Build the mental model that sticks.</small></section>
          </aside>
        </motion.section> : null}
      </AnimatePresence>
    </main>

    {customOpen && <div className="custom-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCustomOpen(false) }}><div className="custom-dialog" role="dialog" aria-modal="true" aria-labelledby="custom-title">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start' }}><div><div className="eyebrow"><span className="eyebrow-dot" /> Make it yours</div><h2 id="custom-title">Custom challenge</h2></div><button className="icon-button" onClick={() => setCustomOpen(false)} aria-label="Close"><X size={15} /></button></div>
      <p>{isGraphChallenge ? 'Describe your graph as a list of connected edges.' : 'Bring your own values into the next decision.'}</p>
      <label className="form-label" htmlFor="custom-values">{isGraphChallenge ? 'Edges' : 'Values'}</label>
      <textarea id="custom-values" className="custom-textarea" value={customInput} onChange={(event) => setCustomInput(event.target.value)} placeholder={isGraphChallenge ? 'A-B, A-C, B-D, C-E' : '8, 14, 23, 31, 42'} />
      <div className="form-help">{isGraphChallenge ? 'Use A-B pairs; 3–8 nodes are supported.' : 'Use commas or spaces. 4–12 numbers are supported.'}</div>
      {!isGraphChallenge && selectedAlgorithm === 'binary-search' && <><label className="form-label" htmlFor="custom-target">Search target</label><input id="custom-target" className="custom-input" value={customTarget} onChange={(event) => setCustomTarget(event.target.value)} inputMode="numeric" /></>}
      {customError && <p style={{ margin: '10px 0 0', color: '#b74f36', fontSize: 10 }}>{customError}</p>}
      <div className="dialog-actions"><button className="secondary-button" onClick={() => setCustomOpen(false)}>Cancel</button><button className="primary-button" onClick={applyCustom}>Start with this input <ArrowRight size={14} /></button></div>
    </div></div>}
    {toast && <div className="toast" role="status">{toast}</div>}
  </div>
}

function ProgressPage({ history, onPlay }: { history: RunSummary[]; onPlay: () => void }) {
  const totalRuns = history.length
  const totalQuestions = history.reduce((sum, run) => sum + run.total, 0)
  const correct = history.reduce((sum, run) => sum + run.correct, 0)
  const best = history.reduce((score, run) => Math.max(score, run.score), 0)
  return <>
    <div className="progress-overview">
      <div className="progress-stat"><span>Completed runs</span><strong>{totalRuns}</strong></div>
      <div className="progress-stat"><span>Decisions made</span><strong>{totalQuestions}</strong></div>
      <div className="progress-stat"><span>All-time accuracy</span><strong>{totalQuestions ? Math.round((correct / totalQuestions) * 100) : 0}%</strong></div>
    </div>
    {history.length === 0 ? <div className="empty-state"><Trophy size={23} color="#88976c" /><h3>Your first run is a good place to start.</h3><p>Finish a challenge and this page will show your strongest algorithms, decision accuracy, and the topics worth revisiting.</p><button className="primary-button" onClick={onPlay}>Start a challenge <ArrowRight size={14} /></button></div> : <>
      <div className="progress-table"><div className="progress-row heading"><span>Algorithm</span><span>Runs</span><span>Accuracy</span><span>Best score</span></div>
        {ALGORITHMS.map(({ id, icon: Icon }) => {
          const progress = progressFor(history, id)
          return <div className="progress-row" key={id}><div className="progress-algorithm"><span className="algo-icon"><Icon size={14} /></span><span className="progress-algorithm-copy"><span>{ALGORITHM_LABELS[id]}</span>{progress.weakTopic && <small className="progress-focus">Focus · {progress.weakTopic}</small>}</span></div><div className="progress-value">{progress.runs}</div><div className="progress-value">{progress.accuracy}%<div className="progress-track"><span style={{ width: `${progress.accuracy}%` }} /></div></div><div className="progress-value">{progress.best} XP</div></div>
        })}
      </div>
      <AccuracyTrend history={history} />
      <div className="progress-overview" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 13 }}><div className="progress-stat"><span>Personal best</span><strong>{best} <small style={{ fontSize: 12 }}>XP</small></strong></div><div className="progress-stat"><span>Most recent focus</span><strong style={{ fontSize: 18 }}>{history[0].weakTopic ?? 'Building confidence'}</strong></div></div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}><button className="primary-button" onClick={onPlay}>Play another challenge <ArrowRight size={14} /></button></div>
    </>}
    <p className="bottom-note"><CheckCircle2 size={13} /> Saved locally in this browser — no account, tracking profile, or backend.</p>
  </>
}

function AccuracyTrend({ history }: { history: RunSummary[] }) {
  const recent = [...history].slice(0, 8).reverse()
  const chartPoints = recent.map((run, index) => ({
    run,
    x: recent.length === 1 ? 360 : 42 + index * (636 / (recent.length - 1)),
    y: 144 - run.accuracy * 1.12,
  }))
  const line = chartPoints.map(({ x, y }) => `${x},${y}`).join(' ')
  return <section className="trend-card" aria-label="Recent run accuracy trend">
    <div className="trend-heading"><div><span>LEARNING SIGNAL</span><strong>Recent accuracy</strong></div><small>Last {recent.length} runs · oldest to newest</small></div>
    <svg viewBox="0 0 720 180" role="img" aria-label="Accuracy over recent challenge runs">
      {[24, 80, 136].map((y) => <line key={y} x1="38" y1={y} x2="684" y2={y} className="trend-gridline" />)}
      <text x="4" y="28" className="trend-axis-label">100%</text><text x="12" y="84" className="trend-axis-label">50%</text><text x="19" y="140" className="trend-axis-label">0%</text>
      {chartPoints.length > 1 && <polyline points={line} className="trend-line" />}
      {chartPoints.map(({ run, x, y }) => <g key={run.id}><circle cx={x} cy={y} r="5" className="trend-point"><title>{ALGORITHM_LABELS[run.algorithm]}: {run.accuracy}%</title></circle><text x={x} y={Math.max(13, y - 10)} textAnchor="middle" className="trend-point-label">{run.accuracy}%</text></g>)}
    </svg>
    <div className="trend-run-labels">{recent.map((run) => <span key={run.id}>{ALGORITHM_LABELS[run.algorithm].replace(' Sort', '')} · {new Date(run.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>)}</div>
  </section>
}

function ReportPage({ summary, mistakes, onReplay, onPlayAgain, onShare, onDownload }: {
  summary: RunSummary; mistakes: Mistake[]; onReplay: (index: number) => void; onPlayAgain: () => void; onShare: () => void; onDownload: () => void
}) {
  const accuracy = summary.accuracy
  return <>
    <div className="report-hero"><div className="eyebrow"><span className="eyebrow-dot" /> Session report · {summary.algorithmLabel}</div><h1>{accuracy >= 80 ? 'You saw the pattern.' : accuracy >= 50 ? 'You’re building the pattern.' : 'Every miss is a clue.'}</h1><p>A run of {summary.total} decisions — and one more step toward thinking like the algorithm.</p><div className="report-scoreline"><span className="report-score">{summary.score}</span><span className="report-score-label">POINTS<br />EARNED</span></div></div>
    <div className="report-metrics"><div className="report-metric"><span>Accuracy</span><strong>{summary.accuracy}%</strong></div><div className="report-metric"><span>Right calls</span><strong>{summary.correct} / {summary.total}</strong></div><div className="report-metric"><span>Missed moments</span><strong>{summary.mistakes}</strong></div><div className="report-metric"><span>Best streak</span><strong>{summary.bestStreak ?? 0}</strong></div><div className="report-metric"><span>Run time</span><strong>{formatDuration(summary.durationSeconds ?? 0)}</strong></div></div>
    <section className="right-rail-card" style={{ marginTop: 13 }}><div className="right-card-head"><span>Where to grow next</span><Target size={14} /></div>
      {mistakes.length ? <><p style={{ margin: '10px 0 2px', fontSize: 12, fontWeight: 700 }}>{summary.weakTopic ?? mistakes[0].category}</p><p style={{ margin: 0, color: '#85887f', fontSize: 10, lineHeight: 1.5 }}>Patterns get stronger when you revisit the exact decision, not just the final answer.</p><div className="mistake-list">{mistakes.map((mistake, index) => <div className="mistake-item" key={`${mistake.stepIndex}-${index}`}><div><strong>{mistake.topic}</strong><p>{mistake.question}<br />You chose {mistake.answerDisplay} · Correct: {mistake.correctDisplay}</p></div><button className="secondary-button" onClick={() => onReplay(index)}>Replay <RotateCcw size={12} /></button></div>)}</div></> : summary.mistakes > 0 ? <p style={{ margin: '11px 0 0', color: '#74796d', fontSize: 11, lineHeight: 1.6 }}>{summary.mistakes} missed decisions in this shared run. The original replay notes stay in the learner’s browser; you can still try the challenge yourself.</p> : <p style={{ margin: '11px 0 0', color: '#74796d', fontSize: 11, lineHeight: 1.6 }}>Clean run. To keep growing, try a harder mode or make your own input. No weak topic to flag yet.</p>}
    </section>
    <div className="report-actions"><button className="primary-button" onClick={onPlayAgain}><RotateCcw size={14} /> Play again</button><button className="secondary-button" onClick={onShare}><Share2 size={14} /> Copy share link</button><button className="secondary-button" onClick={onDownload}><Download size={14} /> Download score image</button></div>
    <p className="bottom-note"><Sparkles size={13} /> Learning is the ability to predict the next move — not memorize the last one.</p>
  </>
}


function readSharedSummary(): RunSummary | null {
  const params = new URLSearchParams(window.location.search)
  if (params.get('share') !== 'score') return null
  const algorithmValue = params.get('algorithm')
  if (!algorithmValue || !Object.hasOwn(ALGORITHM_LABELS, algorithmValue)) return null
  const integer = (key: string, fallback = 0) => {
    const value = Number(params.get(key) ?? fallback)
    return Number.isSafeInteger(value) && value >= 0 ? value : fallback
  }
  const total = integer('total')
  const correct = Math.min(total, integer('correct'))
  const accuracy = Math.min(100, integer('accuracy', accuracyPercent(correct, total)))
  const algorithm = algorithmValue as AlgorithmId
  return {
    id: 'shared-result', algorithm, algorithmLabel: ALGORITHM_LABELS[algorithm],
    score: integer('score'), accuracy, correct, total,
    mistakes: Math.min(total, integer('mistakes')),
    bestStreak: Math.min(total, integer('bestStreak')),
    durationSeconds: integer('durationSeconds'),
    date: new Date().toISOString(),
  }
}
