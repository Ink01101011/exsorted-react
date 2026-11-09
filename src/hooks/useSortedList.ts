"use client";

import { useCallback, useDeferredValue, useMemo, useState } from "react";
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

  // Sorting runs on deferred inputs: while React works on a newer list or sort,
  // the last completed result stays on screen.
  const deferredItems = useDeferredValue(items);
  const deferredSort = useDeferredValue(stableSort);
  const isSorting = deferredItems !== items || deferredSort !== stableSort;

  const { accessor } = resolveAccessorWithFallback(accessors, deferredSort.key, defaultKey);

  const computed = useMemo(
    () => sortList(deferredItems, deferredSort, accessor, comparator, sorter),
    [accessor, comparator, deferredItems, deferredSort, sorter],
  );

  // Keep the last two distinct results in state. Updating state during render is
  // React's supported "adjust state when inputs change" pattern; a shallow-equal
  // result reuses the previous array so references stay stable (e.g. with inline
  // accessors, which re-run the sort but produce the same order).
  const [snapshot, setSnapshot] = useState(() => ({ current: computed, previous: computed }));
  let sorted = snapshot.current;
  let previousItems = snapshot.previous;
  if (!areArraysShallowEqual(snapshot.current, computed)) {
    setSnapshot({ current: computed, previous: snapshot.current });
    previousItems = snapshot.current;
    sorted = computed;
  }

  const [isOriginalMode, setIsOriginalMode] = useState(false);
  const originalItems = useMemo(() => [...items], [items]);

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
