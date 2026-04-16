"use client";

import { useCallback, useMemo, useState } from "react";

import type {
  NextDirectionResolver,
  UseSortStateResult,
  UseSortStateWithInitialKeyOptions,
  UseSortStateWithKeysOptions,
} from "../types/internal";
import type { SortDirection, SortState } from "../types/public";

const defaultGetNextDirection: NextDirectionResolver = (current) =>
  current === "asc" ? "desc" : "asc";

const resolveInitialKey = <TKey extends PropertyKey>(
  options: UseSortStateWithInitialKeyOptions<TKey> | UseSortStateWithKeysOptions<readonly TKey[]>,
): TKey => {
  if ("keys" in options) {
    if (options.initialKey !== undefined) {
      return options.initialKey;
    }

    const firstKey = options.keys[0];
    if (firstKey === undefined) {
      throw new Error(
        "useSortState expected at least one key in options.keys when initialKey is omitted.",
      );
    }

    return firstKey;
  }

  return options.initialKey;
};

/**
 * Internal sort-state controller used by useSortedList standalone mode.
 */
export function useSortState<const TKeys extends readonly PropertyKey[]>(
  options: UseSortStateWithKeysOptions<TKeys>,
): UseSortStateResult<TKeys[number]>;

export function useSortState<const TKey extends PropertyKey>(
  options: UseSortStateWithInitialKeyOptions<TKey>,
): UseSortStateResult<TKey>;

export function useSortState<const TKey extends PropertyKey>(
  options: UseSortStateWithInitialKeyOptions<TKey> | UseSortStateWithKeysOptions<readonly TKey[]>,
): UseSortStateResult<TKey> {
  const initialDirection = options.initialDirection ?? "asc";

  const initialKey = useMemo(() => resolveInitialKey(options), [options]);

  const initialSort = useMemo<SortState<TKey>>(
    () => ({ key: initialKey, direction: initialDirection }),
    [initialDirection, initialKey],
  );

  const [sort, setSort] = useState<SortState<TKey>>(initialSort);

  const setSortKey = useCallback((nextKey: TKey) => {
    setSort((previous) => ({ ...previous, key: nextKey }));
  }, []);

  const setDirection = useCallback((nextDirection: SortDirection) => {
    setSort((previous) => ({ ...previous, direction: nextDirection }));
  }, []);

  const toggleDirection = useCallback(() => {
    const getNextDirection = options.getNextDirection ?? defaultGetNextDirection;

    setSort((previous) => ({
      ...previous,
      direction: getNextDirection(previous.direction),
    }));
  }, [options]);

  const reset = useCallback(() => {
    setSort(initialSort);
  }, [initialSort]);

  return {
    sort,
    sortKey: sort.key,
    direction: sort.direction,
    setSortKey,
    setDirection,
    toggleDirection,
    setSort,
    reset,
  };
}
