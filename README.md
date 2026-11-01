# Next Step — Algorithm Practice, Made Active

A prediction-first algorithm learning game. Instead of watching a visualization run, learners choose the next move, receive a concise explanation, and build a local record of their practice.

## MVP tracks

- **Binary Search:** choose which half can be discarded.
- **Bubble Sort:** predict whether adjacent values swap or stay in order.
- **Selection Sort:** choose which value belongs in the next sorted position.
- **BFS / DFS:** click the next graph node according to the queue or stack.

Each algorithm is a UI-independent generator of state snapshots, prompts, options, correct answers, and explanations. The UI consumes saved steps so decisions can be paused and replayed. Difficulty modes, a timed Expert mode, hint costs, report cards, misconception labels, custom arrays/graphs, shareable results, and SVG-based visual interaction are included. During a run, live telemetry shows elapsed time, decision progress, answered decisions, accuracy, score, streak, and the Expert countdown; the final report and share link retain the run duration. Per-algorithm progress is saved in `localStorage`; there is no backend.

## Roadmap

Quick Sort and Dijkstra are later additions; Merge Sort, A*, Union-Find, BST insertion, and heap operations remain future candidates. They are not represented as playable MVP tracks.

## Run locally

```sh
pnpm install
pnpm dev
```

## Checks and build

```sh
pnpm test
pnpm build
```

The static production output is in `dist/` and can be hosted on a static web host. The entry document includes useful initial page content and social metadata. Add the real public domain before configuring canonical and `og:url` tags; Preview addresses are not used as public canonical URLs.
