## Quality Tooling

- Lint: `pnpm run lint`
- Format check: `pnpm run format:check`
- Type check: `pnpm run typecheck`
- Build: `pnpm run build`
- Bundle size check: `pnpm run size`
- CVE audit: `pnpm run audit:cve`
- Full local check: `pnpm run check`

This project includes:

- oxlint and oxfmt commands
- husky pre-commit hook
- GitHub Actions CI for lint, format, typecheck, build, bundle budget, and CVE audit
