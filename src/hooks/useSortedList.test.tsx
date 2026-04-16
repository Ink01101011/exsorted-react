import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "@jest/globals";

import { singleKeyAccessors, useSortedList } from "./useSortedList";
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

  it("throws when external state key has no accessor", () => {
    expect(() => {
      renderHook(() =>
        useSortedList(products, {
          accessors: {
            price: (item: Product) => item.price,
          },
          state: { key: "name" as never, direction: "asc" },
        }),
      );
    }).toThrow("useSortedList could not find accessor for key: name");
  });
});
