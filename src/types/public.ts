import type { CompareFn } from "exsorted/types";

/**
 * Direction used when applying a sort operation.
 */
export type SortDirection = "asc" | "desc";

/**
 * Primitive values supported by the default comparator.
 */
export type SortPrimitive = string | number | boolean | Date | null | undefined;

/**
 * Current sort state containing the active key and direction.
 *
 * @template TKey key union for sortable fields
 */
export interface SortState<TKey extends PropertyKey = string> {
  key: TKey;
  direction: SortDirection;
}

/**
 * Map of sort keys to accessor functions.
 *
 * Each accessor extracts a comparable primitive from an item.
 *
 * @template TItem item type in the source list
 * @template TKey union of valid sort keys
 */
export type SortAccessors<TItem, TKey extends PropertyKey> = Record<
  TKey,
  (item: TItem) => SortPrimitive
>;

/**
 * External controller contract for controlled sorting mode.
 *
 * @template TKey key union for sortable fields
 */
export interface SortController<TKey extends PropertyKey> {
  sort: SortState<TKey>;
  setSort: (next: SortState<TKey> | ((previous: SortState<TKey>) => SortState<TKey>)) => void;
  reset: () => void;
}

/**
 * Exsorted-compatible sorting function signature.
 *
 * Accepts only strict comparator-based sorters.
 *
 * Excluded intentionally:
 * - non-compare family from `exsorted/non-compare`:
 *   `countingSort`, `radixSort`, `bucketSort`, `pigeonholeSort`
 * - `introSort` from `exsorted/standard` (overload includes threshold variants)
 *
 * The trailing `...extra: never[]` prevents passing sorters with additional
 * non-compatible parameters.
 */
export type ExsortedSorter<TItem> = (
  arr: TItem[],
  compareFn?: CompareFn<TItem>,
  ...extra: never[]
) => TItem[];

/**
 * Configuration object for useSortedList.
 *
 * Supports three modes:
 * - standalone mode: no external state/controller, optional initialKey/initialDirection
 * - controller mode: provide `sort` to fully control state and actions
 * - state mode: provide `state` for read-only external state observation
 *
 * @template TItem item type in the source list
 * @template TKey union of valid sort keys
 */
export type UseSortedListOptions<TItem, TKey extends PropertyKey> = {
  /**
   * Accessors used to derive sortable values from each item.
   */
  accessors: SortAccessors<TItem, TKey>;
  /**
   * Legacy alias for `comparator`.
   *
   * If both are provided, `comparator` takes precedence.
   */
  comparators?: CompareFn<TItem>;
  /**
   * Custom comparator used for all sort keys.
   */
  comparator?: CompareFn<TItem>;
  /**
   * Custom Exsorted sorter (defaults to mergeSort in the hook).
   */
  sorter?: ExsortedSorter<TItem>;
} & (
  | {
      /**
       * Controlled mode: external controller with state + mutators.
       */
      sort: SortController<TKey>;
      state?: never;
      initialKey?: never;
      initialDirection?: never;
    }
  | {
      /**
       * Read-only external state mode.
       */
      state: SortState<TKey>;
      sort?: never;
      initialKey?: never;
      initialDirection?: never;
    }
  | {
      sort?: never;
      state?: never;
      /**
       * Standalone mode initial key.
       *
       * If omitted, the first accessor key is used.
       */
      initialKey?: TKey;
      /**
       * Standalone mode initial direction.
       *
       * Defaults to `asc`.
       */
      initialDirection?: SortDirection;
    }
);

/**
 * Return shape for useSortedList.
 *
 * @template TItem item type in the source list
 * @template TKey union of valid sort keys
 */
export interface UseSortedListResult<TItem, TKey extends PropertyKey = string> {
  /**
   * Current visible list, which may be sorted or original depending on mode/actions.
   */
  items: TItem[];
  /**
   * Last visible list snapshot prior to the most recent sorted update.
   */
  previousItems: TItem[];
  /**
   * Original source list reference from hook input.
   */
  originalItems: readonly TItem[];
  /**
   * True while a deferred transition is applying a new sorted result.
   */
  isSorting: boolean;
  /**
   * True when sorted view is active and no transition is pending.
   */
  isSorted: boolean;
  /**
   * Current effective sort state.
   */
  sort: SortState<TKey>;
  /**
   * Shortcut to `sort.key`.
   */
  sortKey: TKey;
  /**
   * Shortcut to `sort.direction`.
   */
  direction: SortDirection;
  /**
   * Updates only the active sort key.
   */
  setSortKey: (nextKey: TKey) => void;
  /**
   * Updates only the active sort direction.
   */
  setDirection: (nextDirection: SortDirection) => void;
  /**
   * Toggles direction between `asc` and `desc`.
   */
  toggleDirection: () => void;
  /**
   * Replaces sort state directly or via an updater callback.
   */
  setSort: (next: SortState<TKey> | ((previous: SortState<TKey>) => SortState<TKey>)) => void;
  /**
   * Resets sorting state to the initial standalone/controller state.
   */
  reset: () => void;
  /**
   * Shows original input order in `items`.
   */
  restoreOriginal: () => void;
  /**
   * Switches back to sorted view in `items`.
   */
  restoreSorted: () => void;
}
