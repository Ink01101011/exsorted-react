---
name: react-sorting-hook-library-authoring
description: "Design and release a React custom hook library for sorting with Exsorted. Use when defining stable API contracts, TypeScript-first ergonomics, compatibility policy, tree-shakable packaging, and release governance."
argument-hint: "Library goal and constraints (for example: React 18+, ESM+CJS, semver policy strict)"
user-invocable: true
disable-model-invocation: false
---

# React Sorting Hook Library Authoring

## Outcome

Produce a publishable sorting hook library for React developers with:

- Stable and documented API contracts.
- Predictable performance (low re-render/memory churn) in common usage.
- Compatibility policy that is explicit and testable.
- Release process that enforces semver, changelog quality, and deprecation policy.

## When to Use

- Team is building reusable sorting hooks for multiple apps.
- Existing app-level hooks need to be extracted into a maintainable shared library.
- Consumers need clear typing, compatibility expectations, and migration guidance.

## Required Inputs

- Target consumers: internal team, multi-team monorepo, or public npm users.
- Supported data models and sort use cases.
- Compatibility targets: React, Node, and bundlers.
- Packaging target: ESM only or dual ESM/CJS.
- Governance preference: semver strictness, release cadence, and deprecation window.

## Compatibility Matrix (Explicit)

Define and maintain this matrix in the library README and release notes.

| Dimension  | Minimum                        | Recommended         | Notes                                        |
| ---------- | ------------------------------ | ------------------- | -------------------------------------------- |
| React      | 18.2.0                         | 18.3+ / 19.x tested | Hooks only; test StrictMode behavior         |
| Node.js    | 18.18.0                        | 20.x LTS            | Match build tooling requirements             |
| Bundlers   | Vite 5+, Webpack 5+, Rollup 4+ | Vite 6+             | Verify tree-shaking and sideEffects handling |
| TypeScript | 5.3+                           | 5.6+                | Ensure inference for common hook usage       |

If your team must support React 17 or Node 16, maintain a separate legacy support policy and test lane.

## Procedure

1. Define API contracts first.

- Specify hook inputs/outputs and default behavior.
- Keep contracts deterministic and non-mutating.
- Provide escape hatches for custom comparator logic without bloating the primary API.

2. Design for TypeScript ergonomics.

- Ensure common paths work with inference and minimal generic annotations.
- Avoid overly dynamic signatures that degrade editor hints.
- Document overload behavior and edge-case typing.

3. Build hook internals for stability.

- Keep internal state minimal.
- Avoid referential churn in returned objects/functions.
- Use memoization only when profiling shows benefit.

4. Optimize for memory and re-render safety.

- Profile realistic usage patterns with React DevTools.
- Validate no stale-closure bugs.
- Validate repeated sort/filter interactions do not show significant memory growth.

5. Package for consumption.

- Export side-effect-free modules when possible.
- Validate tree-shaking for each target bundler.
- Ensure entrypoints and type declarations are clean and discoverable.

6. Validate compatibility matrix.

- Run tests across the declared React/Node versions.
- Run a sample consumer app for Vite and at least one additional bundler.
- Confirm documented matrix matches actual CI/build behavior.

7. Execute release checklist.

- Semver: classify change as patch/minor/major based on API and behavior impact.
- Changelog: include features, fixes, perf notes, and migration guidance.
- Deprecation policy: mark deprecated APIs, provide replacement path, set removal version.
- Tag and publish only after all checks pass.

8. Report release readiness.

- Publish a concise readiness summary with compatibility, test status, and known tradeoffs.

## Decision Points

- If API is powerful but hard to understand:
  Reduce surface area and move advanced behavior to optional utilities.
- If typing becomes brittle:
  Prefer explicit helper types and simpler overloads.
- If bundle size grows with new features:
  Split optional features into secondary entrypoints.
- If broad compatibility blocks progress:
  Narrow supported versions and document policy clearly.

## Completion Checks

- API contract is documented and stable.
- TypeScript inference is validated with consumer examples.
- Compatibility matrix is explicit, tested, and published.
- Tree-shaking works in declared bundlers.
- Semver decision is explicit and justified.
- Changelog and deprecation notes are complete.
- Release artifacts are ready for consumer adoption.

## Example Prompts

- /react-sorting-hook-library-authoring design API contracts for useSortedList and useSortState
- /react-sorting-hook-library-authoring validate React 18/19 and Node 18/20 compatibility before release
- /react-sorting-hook-library-authoring prepare next minor release with changelog and deprecation notes
