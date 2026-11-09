import { StrictMode, type ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "@jest/globals";

import { singleKeyAccessors } from "../utils/useSortedList.utils";
import { useSortedList } from "./useSortedList";
import { useSortState } from "./useSortState";

type Product = {
  id: string;
  name: string;
  price: number;
};

const products: Product[] = [
  { id: "b", name: "Beta", price: 20 },
  { id: "a", name: "Alpha", price: 10 },
  { id: "c", name: "Charlie", price: 30 },
];

describe("useSortedList", () => {
  it("supports standalone mode without useSortState", async () => {
    const { result } = renderHook(() =>
      useSortedList(products, {
        accessors: {
          name: (item: Product) => item.name,
          price: (item: Product) => item.price,
        },
        initialKey: "price",
      }),
    );

    await waitFor(() => {
      expect(result.current.items.map((item) => item.price)).toEqual([10, 20, 30]);
      expect(result.current.sortKey).toBe("price");
    });

    act(() => {
      result.current.toggleDirection();
    });

    await waitFor(() => {
      expect(result.current.items.map((item) => item.price)).toEqual([30, 20, 10]);
    });
  });

  it("returns sorted items based on sort state", async () => {
    const { result } = renderHook(() => {
      const sort = useSortState({
        keys: ["name", "price"] as const,
        initialKey: "name",
      });

      const sorted = useSortedList(products, {
        state: sort.sort,
        accessors: {
          name: (item: Product) => item.name,
          price: (item: Product) => item.price,
        },
      });

      return { sort, sorted };
    });

    await waitFor(() => {
      expect(result.current.sorted.items.map((item) => item.name)).toEqual([
        "Alpha",
        "Beta",
        "Charlie",
      ]);
      expect(result.current.sorted.isSorted).toBe(true);
    });

    act(() => {
      result.current.sort.toggleDirection();
    });

    await waitFor(() => {
      expect(result.current.sorted.items.map((item) => item.name)).toEqual([
        "Charlie",
        "Beta",
        "Alpha",
      ]);
    });
  });

  it("can restore original items and switch back to sorted mode", async () => {
    const { result } = renderHook(() => {
      const sort = useSortState({
        keys: ["price"] as const,
      });

      const sorted = useSortedList(products, {
        state: sort.sort,
        accessors: {
          price: (item: Product) => item.price,
        },
      });

      return sorted;
    });

    await waitFor(() => {
      expect(result.current.items.map((item) => item.price)).toEqual([10, 20, 30]);
    });

    act(() => {
      result.current.restoreOriginal();
    });

    expect(result.current.items.map((item) => item.id)).toEqual(["b", "a", "c"]);
    expect(result.current.isSorted).toBe(false);

    act(() => {
      result.current.restoreSorted();
    });

    await waitFor(() => {
      expect(result.current.items.map((item) => item.price)).toEqual([10, 20, 30]);
      expect(result.current.isSorted).toBe(true);
    });
  });

  it("supports singleKeyAccessors for minimal single-field setup", async () => {
    const { result } = renderHook(() =>
      useSortedList(products, {
        accessors: singleKeyAccessors("price", (item: Product) => item.price),
        initialKey: "price",
      }),
    );

    await waitFor(() => {
      expect(result.current.items.map((item) => item.price)).toEqual([10, 20, 30]);
      expect(result.current.sortKey).toBe("price");
    });
  });

  it("falls back to default accessor when external state key is missing", async () => {
    const { result } = renderHook(() =>
      useSortedList(products, {
        accessors: {
          price: (item: Product) => item.price,
        },
        state: { key: "name" as never, direction: "asc" },
      }),
    );

    await waitFor(() => {
      expect(result.current.items.map((item) => item.price)).toEqual([10, 20, 30]);
    });
  });
});

type Row = { id: number; score: number };

const scoreAccessors = { score: (item: Row) => item.score };

describe("useSortedList regressions (#3)", () => {
  for (const key of ["hasOwnProperty", "valueOf", "__proto__", "constructor", "toString"]) {
    it(`falls back to the default key when external state key is the prototype member ${key}`, async () => {
      const { result } = renderHook(() =>
        useSortedList(products, {
          accessors: { price: (item: Product) => item.price },
          state: { key: key as "price", direction: "asc" },
        }),
      );

      await waitFor(() => {
        expect(result.current.items.map((item) => item.price)).toEqual([10, 20, 30]);
      });
    });
  }

  it("sorts NaN and invalid dates after valid values", async () => {
    const rows: Row[] = [5, Number.NaN, 3, 1, Number.NaN, 4, 2].map((score, id) => ({ id, score }));
    const { result } = renderHook(() => useSortedList(rows, { accessors: scoreAccessors }));

    await waitFor(() => {
      expect(result.current.items.map((item) => item.score)).toEqual([
        1,
        2,
        3,
        4,
        5,
        Number.NaN,
        Number.NaN,
      ]);
    });

    const dates = [new Date(2020, 1, 1), new Date("invalid"), new Date(2019, 1, 1)];
    const { result: dateResult } = renderHook(() =>
      useSortedList(dates, { accessors: { at: (item: Date) => item } }),
    );

    await waitFor(() => {
      expect(dateResult.current.items.map((item) => item.getTime())).toEqual([
        dates[2]!.getTime(),
        dates[0]!.getTime(),
        Number.NaN,
      ]);
    });
  });

  it("never shows a list older than the last committed result while a new one is pending", async () => {
    const v0: Row[] = [
      { id: 1, score: 2 },
      { id: 2, score: 1 },
      { id: 3, score: 3 },
    ];
    const v1: Row[] = [...v0, { id: 4, score: 4 }];
    const v2: Row[] = [{ id: 9, score: 0 }];
    const seen: number[][] = [];

    const { result, rerender } = renderHook(
      ({ list }: { list: Row[] }) => {
        const sorted = useSortedList(list, { accessors: scoreAccessors });
        seen.push(sorted.items.map((item) => item.id));
        return sorted;
      },
      { initialProps: { list: v0 } },
    );

    await act(async () => rerender({ list: v1 }));
    expect(result.current.items.map((item) => item.id)).toEqual([2, 1, 3, 4]);

    seen.length = 0;
    await act(async () => rerender({ list: v2 }));

    expect(result.current.items.map((item) => item.id)).toEqual([9]);
    for (const ids of seen) {
      expect([JSON.stringify([2, 1, 3, 4]), JSON.stringify([9])]).toContain(JSON.stringify(ids));
    }
    expect(result.current.previousItems.map((item) => item.id)).toEqual([2, 1, 3, 4]);
  });

  it("calls each accessor once per item per sort and not on unrelated re-renders", async () => {
    let calls = 0;
    const counted = {
      score: (item: Row) => {
        calls += 1;
        return item.score;
      },
    };
    const rows: Row[] = Array.from({ length: 1000 }, (_, id) => ({
      id,
      score: (id * 7919) % 1000,
    }));

    const { result, rerender } = renderHook(() => useSortedList(rows, { accessors: counted }));

    await waitFor(() => {
      expect(result.current.isSorted).toBe(true);
    });
    expect(calls).toBe(rows.length);

    calls = 0;
    rerender();
    rerender();
    expect(calls).toBe(0);
  });

  it("keeps items referentially stable across re-renders with inline accessors", async () => {
    const { result, rerender } = renderHook(() =>
      useSortedList(products, { accessors: { price: (item: Product) => item.price } }),
    );

    await waitFor(() => {
      expect(result.current.isSorted).toBe(true);
    });
    const first = result.current.items;
    rerender();
    expect(result.current.items).toBe(first);

    act(() => {
      result.current.restoreOriginal();
    });
    const original = result.current.items;
    rerender();
    expect(result.current.items).toBe(original);
  });

  it("passes original items (not internal entries) to a custom sorter", async () => {
    const received: unknown[] = [];
    const recordingSorter = (arr: Product[], compareFn?: (a: Product, b: Product) => number) => {
      received.push(...arr);
      return [...arr].sort(compareFn);
    };

    const { result } = renderHook(() =>
      useSortedList(products, {
        accessors: { price: (item: Product) => item.price },
        sorter: recordingSorter,
      }),
    );

    await waitFor(() => {
      expect(result.current.items.map((item) => item.price)).toEqual([10, 20, 30]);
    });
    expect(received.every((item) => products.includes(item as Product))).toBe(true);
  });

  it("sorts and toggles under StrictMode", async () => {
    const wrapper = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>;
    const { result } = renderHook(
      () => useSortedList(products, { accessors: { price: (item: Product) => item.price } }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.items.map((item) => item.price)).toEqual([10, 20, 30]);
    });

    act(() => {
      result.current.toggleDirection();
    });

    await waitFor(() => {
      expect(result.current.items.map((item) => item.price)).toEqual([30, 20, 10]);
      expect(result.current.isSorting).toBe(false);
    });
  });
});

describe("useSortedList unstable inputs (#3 review)", () => {
  it("does not loop when items are rebuilt as new objects on every render", async () => {
    const source: Row[] = [
      { id: 1, score: 2 },
      { id: 2, score: 1 },
    ];
    const { result, rerender } = renderHook(() =>
      useSortedList(
        source.map((row) => ({ ...row })),
        { accessors: scoreAccessors },
      ),
    );

    rerender();
    rerender();

    await waitFor(() => {
      expect(result.current.items.map((item) => item.id)).toEqual([2, 1]);
      expect(result.current.isSorting).toBe(false);
    });
  });

  it("does not report sorting when items is a new array with the same elements", async () => {
    const flags: boolean[] = [];
    const { rerender } = renderHook(() => {
      const sorted = useSortedList(
        products.filter(() => true),
        { accessors: { price: (item: Product) => item.price } },
      );
      flags.push(sorted.isSorting);
      return sorted;
    });

    await act(async () => rerender());
    await act(async () => rerender());

    expect(flags.every((flag) => !flag)).toBe(true);
  });
});
