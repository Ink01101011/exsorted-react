"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
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
  const { accessors, comparators, comparator, sorter } = options;
  const [isPending, startTransition] = useTransition();

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

  const deferredItems = useDeferredValue(items);
  const deferredState = useDeferredValue(activeSort);

  const effectiveItems = deferredItems;
  const effectiveState = deferredState;
  const effectiveComparator = comparator ?? comparators;
  const { accessor, resolvedKey } = resolveAccessorWithFallback(
    accessors,
    effectiveState.key,
    defaultKey,
  );
  const effectiveSort =
    resolvedKey === effectiveState.key ? effectiveState : { ...effectiveState, key: resolvedKey };

  const nextSorted = useMemo(
    () => sortList(effectiveItems, effectiveSort, accessor, effectiveComparator, sorter),
    [accessor, effectiveComparator, effectiveItems, effectiveSort, sorter],
  );

  const [sorted, setSorted] = useState<TItem[]>(nextSorted);
  const [isOriginalMode, setIsOriginalMode] = useState(false);
  const previousItemsRef = useRef<TItem[]>(nextSorted);

  const restoreOriginal = useCallback(() => {
    setIsOriginalMode(true);
  }, []);

  const restoreSorted = useCallback(() => {
    setIsOriginalMode(false);
  }, []);

  useEffect(() => {
    if (areArraysShallowEqual(sorted, nextSorted)) {
      return;
    }

    startTransition(() => {
      setSorted((current) => {
        if (areArraysShallowEqual(current, nextSorted)) {
          return current;
        }

        previousItemsRef.current = current;
        return nextSorted;
      });
    });
  }, [nextSorted, sorted, startTransition]);

  const visibleItems = resolveVisibleItems({
    isOriginalMode,
    sourceItems: items,
    isPending,
    previousItems: previousItemsRef.current,
    sortedItems: sorted,
  });

  return {
    items: visibleItems,
    previousItems: previousItemsRef.current,
    originalItems: items,
    isSorting: isPending,
    isSorted: !isPending && !isOriginalMode,
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

/**
 * Minimal helper for building required accessors in single-key scenarios.
 */
export { singleKeyAccessors } from "../utils";
export type { UseSortedListOptions };
