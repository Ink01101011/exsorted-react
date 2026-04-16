# exsorted-react

Custom React hooks for sorting with TypeScript-first APIs.

Supports React 18 and React 19.

Sorting is powered by exsorted.
If a consumer project already provides exsorted, that version is used through peer resolution; otherwise the library fallback dependency is used.

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

## APIs

- useSortState: manages sort key and direction with strong key inference.
- useSortedList: returns a sorted copy from typed accessors and sort state.
- defineSortAccessors: helper to preserve literal accessor keys for maximum inference.

## Example

```ts
import { defineSortAccessors, useSortedList, useSortState } from "exsorted-react";
import { quickSort } from "exsorted";

type Product = {
  id: string;
  name: string;
  price: number;
  rating: number;
};

const accessors = defineSortAccessors<Product>({
  name: (item) => item.name,
  price: (item) => item.price,
  rating: (item) => item.rating,
});

const sort = useSortState({
  keys: ["name", "price", "rating"] as const,
  initialKey: "price",
});

const sortedProducts = useSortedList(products, {
  state: sort.sort,
  accessors,
  sorter: quickSort,
  useTransition: true,
  useDeferred: true,
});

// sort.setSortKey only accepts: 'name' | 'price' | 'rating'
```

`sorter` is tree-shakable: import only the algorithm you need from `exsorted` and pass it to the hook.
