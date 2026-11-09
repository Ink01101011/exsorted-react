"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useSortState } from "./useSortState";
import {
  areArraysShallowEqual,
  resolveAccessorWithFallback,
  resolveDefaultKey,
  resolveExternalController,
  resolveExternalState,
  resolveStandaloneInitialDirection,
  resolveStandaloneInitialKey,
  resolveVisibleItems,
  sortList,
  toggleSortDirection,
} from "../utils";

import type {
  SortController,
  SortDirection,
  SortState,
  UseSortedListOptions,
  UseSortedListResult,
} from "../types/public";
import type { SortAccessorRecord, SortKey, UseSortStateResult } from "../types/internal";

/**
 * Sorts a readonly list using Exsorted with stable, non-mutating behavior.
 *
 * Supports 3 modes:
 * - standalone mode: pass initialKey/initialDirection (or neither) and the hook owns sort state
 * - controller mode: pass sort controller from outside for fully controlled state/actions
 * - state mode: pass state only for read-only external state (actions become no-ops)
 *
 * @template TItem item type in the source list
 * @template TAccessors accessor map used for sort keys and inferred key union
 * @param items source list (never mutated)
 * @param options sorting config, accessors, and state mode controls
 * @returns visible items, previous/original snapshots, status flags, and sort actions
 * @example
 * const sorted = useSortedList(products, {
 *   accessors: {
 *     name: (item) => item.name,
 *     price: (item) => item.price,
 *   },
 *   initialKey: "price",
 * });
 */
export function useSortedList<TItem, const TAccessors extends SortAccessorRecord<TItem>>(
  items: readonly TItem[],
  options: UseSortedListOptions<TItem, SortKey<TAccessors>> & {
    accessors: TAccessors;
  },
): UseSortedListResult<TItem, SortKey<TAccessors>> {
  const { accessors, comparator, sorter } = options;

  const defaultKey = useMemo(() => resolveDefaultKey(accessors), [accessors]);
  const externalSortController = resolveExternalController(options);
  const externalState = resolveExternalState(options);
  const standaloneInitialDirection = resolveStandaloneInitialDirection(options);
  const standaloneInitialKey = resolveStandaloneInitialKey(options, defaultKey);

  const localSortController: UseSortStateResult<SortKey<TAccessors>> = useSortState({
    initialKey: standaloneInitialKey,
    initialDirection: standaloneInitialDirection,
  });

  const activeSortController: SortController<SortKey<TAccessors>> | undefined =
    externalSortController ?? (externalState === undefined ? localSortController : undefined);

  const activeSort: SortState<SortKey<TAccessors>> =
    externalState ?? activeSortController?.sort ?? localSortController.sort;

  const setSort = useCallback(
    (
      next:
        | SortState<SortKey<TAccessors>>
        | ((previous: SortState<SortKey<TAccessors>>) => SortState<SortKey<TAccessors>>),
    ) => {
      activeSortController?.setSort(next);
    },
    [activeSortController],
  );

  const setSortKey = useCallback(
    (nextKey: SortKey<TAccessors>) => {
      setSort((previous) => ({ ...previous, key: nextKey }));
    },
    [setSort],
  );

  const setDirection = useCallback(
    (nextDirection: SortDirection) => {
      setSort((previous) => ({ ...previous, direction: nextDirection }));
    },
    [setSort],
  );

  const toggleDirection = useCallback(() => {
    setSort((previous) => ({
      ...previous,
      direction: toggleSortDirection(previous.direction),
    }));
  }, [setSort]);

  const reset = useCallback(() => {
    activeSortController?.reset();
  }, [activeSortController]);

  // Key/direction-stable sort object, so an inline `state={{ key, direction }}`
  // does not look like a new sort on every render.
  const activeKey = activeSort.key;
  const activeDirection = activeSort.direction;
  const stableSort = useMemo<SortState<SortKey<TAccessors>>>(
    () => ({ key: activeKey, direction: activeDirection }),
    [activeKey, activeDirection],
  );

  // A new array with the same elements (e.g. `data.filter(...)`, `list ?? []`)
  // keeps the previous reference, so it is not treated as a new list.
  const stableItems = useShallowStableArray(items);

  // Sorting runs on deferred inputs: while React works on a newer list or sort,
  // the last completed result stays on screen.
  const deferredItems = useDeferredValue(stableItems);
  const deferredSort = useDeferredValue(stableSort);
  const isSorting = deferredItems !== stableItems || deferredSort !== stableSort;

  const { accessor } = resolveAccessorWithFallback(accessors, deferredSort.key, defaultKey);

  const computed = useMemo(
    () => sortList(deferredItems, deferredSort, accessor, comparator, sorter),
    [accessor, comparator, deferredItems, deferredSort, sorter],
  );

  // Results are tracked in refs written only after commit, never via state:
  // a state update here would re-render the caller, which may rebuild `items`
  // as new objects and loop forever. A shallow-equal result reuses the last
  // committed array so `items` keeps its reference (e.g. inline accessors).
  const committedRef = useRef<{ current: TItem[]; previous: TItem[] }>({
    current: computed,
    previous: computed,
  });
  const committed = committedRef.current;
  const isSameResult = areArraysShallowEqual(committed.current, computed);
  const sorted = isSameResult ? committed.current : computed;
  const previousItems = isSameResult ? committed.previous : committed.current;

  useEffect(() => {
    if (committedRef.current.current !== sorted) {
      committedRef.current = { current: sorted, previous: committedRef.current.current };
    }
  }, [sorted]);

  const [isOriginalMode, setIsOriginalMode] = useState(false);
  const originalItems = useMemo(
    () => (isOriginalMode ? [...stableItems] : sorted),
    [isOriginalMode, stableItems, sorted],
  );

  const restoreOriginal = useCallback(() => {
    setIsOriginalMode(true);
  }, []);

  const restoreSorted = useCallback(() => {
    setIsOriginalMode(false);
  }, []);

  const visibleItems = resolveVisibleItems({
    isOriginalMode,
    originalItems,
    sortedItems: sorted,
  });

  return {
    items: visibleItems,
    previousItems,
    originalItems: items,
    isSorting,
    isSorted: !isSorting && !isOriginalMode,
    sort: activeSort,
    sortKey: activeSort.key,
    direction: activeSort.direction,
    setSortKey,
    setDirection,
    toggleDirection,
    setSort,
    reset,
    restoreOriginal,
    restoreSorted,
  };
}

export type { UseSortedListOptions };

/**
 * Returns the previous array reference while the input has the same elements
 * (Object.is per index), so identity-based hooks see no change. The ref is
 * only written after commit.
 */
function useShallowStableArray<TItem>(value: readonly TItem[]): readonly TItem[] {
  const ref = useRef(value);
  const stable = areArraysShallowEqual(ref.current, value) ? ref.current : value;

  useEffect(() => {
    ref.current = stable;
  }, [stable]);

  return stable;
}
