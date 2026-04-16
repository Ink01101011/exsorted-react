import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "@jest/globals";

import { useSortState } from "./useSortState";

describe("useSortState", () => {
  it("initializes from keys and toggles direction", () => {
    const { result } = renderHook(() =>
      useSortState({
        keys: ["name", "price"] as const,
        initialKey: "price",
      }),
    );

    expect(result.current.sortKey).toBe("price");
    expect(result.current.direction).toBe("asc");

    act(() => {
      result.current.toggleDirection();
    });

    expect(result.current.direction).toBe("desc");
  });

  it("updates key, direction, and resets to initial sort", () => {
    const { result } = renderHook(() =>
      useSortState({
        keys: ["name", "price"] as const,
      }),
    );

    act(() => {
      result.current.setSortKey("price");
      result.current.setDirection("desc");
    });

    expect(result.current.sort).toEqual({
      key: "price",
      direction: "desc",
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.sort).toEqual({
      key: "name",
      direction: "asc",
    });
  });
});
