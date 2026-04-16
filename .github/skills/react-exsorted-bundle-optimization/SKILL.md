---
name: react-exsorted-bundle-optimization
description: "Optimize React bundle size with Exsorted. Use when reducing JavaScript payload, tree-shaking dead code, import-path tuning, and verifying build-size impact with measurable before/after checks."
argument-hint: "Target route/component and budget (for example: Home page to < 160 kB gzip)"
user-invocable: true
disable-model-invocation: false
---

# React Exsorted Bundle Optimization

## Outcome

Produce a measurable bundle-size reduction for a React app that uses Exsorted, with a verified before/after comparison and no behavior regressions.

Also reduce avoidable re-renders and memory churn by extracting stable custom hooks around Exsorted-driven logic.

This skill is app-focused. For publishable hook-library workflows, use `/react-sorting-hook-library-authoring`.

## When to Use

- Bundle output is too large or performance budget is missed.
- A route or component ships too much JavaScript.
- Exsorted is installed but import usage may block effective tree shaking.
- A PR needs objective size-impact evidence.
- Sorting logic is duplicated across components and should be extracted into reusable custom hooks.
- UI is responsive but still spends too much time re-rendering or creating short-lived objects.

## Required Inputs

- Target surface: route, page, component, or shared module.
- Current size budget (default: gzip).
- Build command and analyzer tool (default: Vite build + rollup visualizer).
- Performance target: render count, commit duration, or interaction latency baseline.

## Procedure

1. Baseline current size.

- Run production build and record key artifacts (entry chunks, route chunks, vendor chunk).
- Generate analyzer output with Vite-compatible tooling (for example rollup visualizer).
- Save a short baseline table: file/chunk, raw size, gzip size.

2. Find Exsorted usage and import shape.

- Locate all Exsorted imports and map where each import is consumed.
- Identify broad imports that may pull unnecessary code.
- Prefer the most granular import style supported by Exsorted and your bundler.

3. Apply optimization changes in small, reviewable steps.

- Refactor imports for better tree-shaking friendliness.
- Remove duplicate wrappers or utility layers that cause Exsorted code to be re-exported broadly.
- Move infrequently used Exsorted-driven logic behind lazy boundaries where UX allows.

4. Extract and harden custom hooks for sorting workflows.

- Create focused hooks (for example `useSortedList`, `useSortState`, `useSortConfig`) to isolate Exsorted integration.
- Keep hook inputs minimal and stable; avoid passing newly created object/array literals on every render.
- Memoize derived values with `useMemo` only where profiling shows meaningful wins.
- Stabilize callbacks with `useCallback` when they are passed to memoized children or dependencies.
- Ensure hooks are pure and return a small, explicit API surface.

5. Optimize memory and re-render behavior.

- Identify hot re-render paths with React DevTools Profiler (or equivalent).
- Remove unnecessary state and derive values from props/data when possible.
- Prevent referential churn: hoist constants, reuse stable comparators, avoid inline closures in hot lists.
- Use `React.memo` selectively for expensive child subtrees after confirming prop stability.
- For large lists, apply virtualization/windowing before micro-optimizing memoization.

6. Rebuild and compare.

- Re-run production build.
- Compare post-change artifact sizes to baseline.
- Attribute wins to specific edits (import refactor, lazy split, dead code removal, hook extraction, rerender reductions).

7. Validate correctness.

- Run full test suite and smoke-check affected UI paths.
- Confirm sorting behavior and edge cases still match expected output.
- Confirm no stale-closure bugs after memoization and callback stabilization.

8. Report result.

- Provide before/after table and net change.
- Include performance evidence: render count delta, profiler commit delta, or interaction timing delta.
- Note tradeoffs (extra request count, cache behavior, complexity).
- Recommend follow-up only if budget is still not met.

## Decision Points

- If Exsorted imports are already granular and savings are small:
  Prioritize route-level code splitting and removing unrelated heavy dependencies in the same chunk.
- If tree shaking appears ineffective:
  Verify bundler production mode, sideEffects config, and ESM import path usage.
- If hook extraction improves reuse but not performance:
  Keep hooks for maintainability, then target list virtualization and state shape simplification.
- If memoization increases complexity without measurable gain:
  Roll back unnecessary memoization and keep only proven optimizations.
- If bundle decreases but runtime cost increases:
  Keep the change only when user-perceived latency improves or stays neutral.
- If no measurable size win after two focused iterations:
  Stop and pivot to higher-impact targets (large shared libraries, image strategy, route architecture).

## Completion Checks

- Build succeeds in production mode.
- Bundle-size delta is measured and documented.
- Full test suite passes.
- No regression in sorting behavior for impacted screens after smoke checks.
- Re-render counts are reduced or held flat with lower commit cost in profiled paths.
- No significant memory growth during repeated sort/filter interactions.
- Changes are minimal, readable, and tied to measured impact.
- Outcome is mapped to budget status: met, partially met, or not met.

## Example Prompts

- /react-exsorted-bundle-optimization optimize product-list route to under 180 kB gzip
- /react-exsorted-bundle-optimization audit current Exsorted imports and propose highest impact reductions
- /react-exsorted-bundle-optimization reduce main bundle without changing UI behavior
- /react-exsorted-bundle-optimization extract custom hooks for sorting and cut rerenders on catalog page
- /react-exsorted-bundle-optimization profile memory and rerender hotspots after Exsorted integration
