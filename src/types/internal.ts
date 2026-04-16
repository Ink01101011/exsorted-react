import type { SortDirection, SortState } from "./public";

/**
 * Strategy function used by useSortState to compute the next direction.
 */
export type NextDirectionResolver = (current: SortDirection) => SortDirection;

/**
 * Shared options for internal sort-state management.
 */
export interface UseSortStateBaseOptions {
  /**
   * Initial direction for standalone state creation.
   */
  initialDirection?: SortDirection;
  /**
   * Optional direction transition strategy used by toggleDirection.
   */
  getNextDirection?: NextDirectionResolver;
}

/**
 * Internal options variant that derives available keys from a tuple.
 *
 * This shape allows inference of a strict key union while still supporting
 * optional initialKey fallback to the first key.
 */
export interface UseSortStateWithKeysOptions<
  TKeys extends readonly PropertyKey[],
> extends UseSortStateBaseOptions {
  /**
   * Ordered tuple of allowed keys. The first key is used as fallback.
   */
  keys: TKeys;
  /**
   * Optional initial key. If omitted, first entry from keys is used.
   */
  initialKey?: TKeys[number];
}

/**
 * Internal options variant that requires a concrete initial key.
 */
export interface UseSortStateWithInitialKeyOptions<
  TKey extends PropertyKey,
> extends UseSortStateBaseOptions {
  /**
   * Required initial key for standalone state creation.
   */
  initialKey: TKey;
}

/**
 * Internal controller shape returned by useSortState.
 *
 * Used by useSortedList standalone mode and by tests.
 */
export interface UseSortStateResult<TKey extends PropertyKey> {
  /** Current sort state object. */
  sort: SortState<TKey>;
  /** Alias for sort.key. */
  sortKey: TKey;
  /** Alias for sort.direction. */
  direction: SortDirection;
  /** Updates only the active sort key. */
  setSortKey: (nextKey: TKey) => void;
  /** Updates only the active sort direction. */
  setDirection: (nextDirection: SortDirection) => void;
  /** Applies direction transition using getNextDirection or default toggling. */
  toggleDirection: () => void;
  /** Replaces sort state directly or with an updater callback. */
  setSort: (next: SortState<TKey> | ((previous: SortState<TKey>) => SortState<TKey>)) => void;
  /** Restores initial sort state snapshot. */
  reset: () => void;
}

/**
 * Internal primitive union used by accessor and comparator helpers.
 */
export type SortPrimitive = string | number | boolean | Date | null | undefined;

/**
 * Internal accessor map used to infer key unions for hook APIs.
 */
export type SortAccessorRecord<TItem> = Record<string, (item: TItem) => SortPrimitive>;

/**
 * Extracts string keys from accessor maps for stable public API typing.
 */
export type SortKey<TAccessors extends Record<string, (...args: any[]) => unknown>> = Extract<
  keyof TAccessors,
  string
>;

/**
 * Named alias for resolved sort state used in helper signatures.
 */
export type ResolvedSortState<TKey extends PropertyKey> = SortState<TKey>;
