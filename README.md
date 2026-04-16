# exsorted-react

TypeScript-first React sorting hook powered by [exsorted](https://www.npmjs.com/package/exsorted).

- React support: 18 and 19
- Public API: useSortedList, singleKeyAccessors, and related public types
- Exsorted resolution: uses peer version when available, otherwise falls back to bundled dependency

## API Surface

```ts
import { singleKeyAccessors, useSortedList } from "exsorted-react";
```

## singleKeyAccessors

Minimal helper for one-field sorting while keeping accessors required.

```ts
const sorted = useSortedList(products, {
  accessors: singleKeyAccessors("price", (item: Product) => item.price),
  initialKey: "price",
});
```

## useSortedList

```ts
const result = useSortedList(items, options);
```

### Next.js SSR / RSC

`useSortedList` is a client hook. In Next.js App Router, call it only in Client Components.

```tsx
"use client";

import { useSortedList } from "exsorted-react";
```

`singleKeyAccessors` is a pure helper and can be called in server code, but it does not make
`useSortedList` callable in Server Components.

If external read-only state provides a key that is not present in `accessors`, the hook safely falls
back to the first accessor key to avoid error-triggered re-render loops.

### Modes

- Standalone mode: pass accessors with optional initialKey and initialDirection
- Controlled mode: pass sort controller object
- Read-only state mode: pass state object

### Options

- accessors (required): map of key to value accessor
- comparator (optional): comparator used for sorting
- sorter (optional): custom compare-based exsorted sorter, default is mergeSort
- initialKey and initialDirection (standalone mode only)
- sort (controlled mode only)
- state (read-only state mode only)

### Sorter Compatibility

sorter must match compare-based signature:

```ts
(arr, compareFn?) => arr;
```

Not supported because function interfaces differ:

- exsorted/non-compare: countingSort, radixSort, bucketSort, pigeonholeSort
- exsorted/standard: introSort

### Return Value

- items: visible items (sorted or original depending on mode/actions)
- previousItems: previous visible snapshot
- originalItems: input source reference
- isSorting: transition pending state
- isSorted: true when sorted view is active and not pending
- sort, sortKey, direction: effective sort state
- setSortKey, setDirection, toggleDirection, setSort, reset: sort controls
- restoreOriginal, restoreSorted: view-mode controls

## Examples

### Standalone Mode

```ts
import { useSortedList } from "exsorted-react";
import { quickSort } from "exsorted";

type Product = {
  id: string;
  name: string;
  price: number;
  rating: number;
};

const sorted = useSortedList(products, {
  accessors: {
    name: (item: Product) => item.name,
    price: (item: Product) => item.price,
    rating: (item: Product) => item.rating,
  },
  sorter: quickSort,
  initialKey: "price",
});

sorted.setSortKey("name");
sorted.toggleDirection();
```

### Single-key Minimal Mode

```ts
import { singleKeyAccessors, useSortedList } from "exsorted-react";

const sorted = useSortedList(products, {
  accessors: singleKeyAccessors("price", (item: Product) => item.price),
  initialKey: "price",
});
```

### Controlled Mode

```ts
import { useState } from "react";
import { useSortedList } from "exsorted-react";

const [sort, setSort] = useState({ key: "name" as const, direction: "asc" as const });

const sorted = useSortedList(products, {
  accessors: {
    name: (item: Product) => item.name,
    price: (item: Product) => item.price,
  },
  sort: {
    sort,
    setSort,
    reset: () => setSort({ key: "name", direction: "asc" }),
  },
});
```

### Read-only State Mode

```ts
const sorted = useSortedList(products, {
  accessors: {
    name: (item: Product) => item.name,
    price: (item: Product) => item.price,
  },
  state: { key: "price", direction: "desc" },
});
```

### Custom Comparator

```ts
const sorted = useSortedList(products, {
  accessors: {
    name: (item: Product) => item.name,
    price: (item: Product) => item.price,
  },
  initialKey: "name",
  comparator: (a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }),
});
```

Tree-shaking note: import and pass only the sorter algorithm you need.
