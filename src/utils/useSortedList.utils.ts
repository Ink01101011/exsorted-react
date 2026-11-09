import { mergeSort } from "exsorted/merge";
import type { CompareFn } from "exsorted/types";

import type {
  ExsortedSorter,
  SortController,
  SortDirection,
  SortPrimitive,
  SortState,
  UseSortedListOptions,
} from "../types/public";
import type { SortAccessorRecord, SortKey } from "../types/internal";

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

/**
 * True for values that cannot be ordered: null, undefined, NaN and invalid dates.
 * They are always placed after orderable values (before them when descending).
 * Evaluated once per item while decorating, not per comparison.
 */
const isUnorderable = (value: SortPrimitive): boolean =>
  value == null ||
  (typeof value === "number" && Number.isNaN(value)) ||
  (value instanceof Date && Number.isNaN(value.getTime()));

/**
 * Compares two orderable values. Hot path: number and string checks come first.
 */
const compareOrderableValues = (left: SortPrimitive, right: SortPrimitive): number => {
  if (left === right) {
    return 0;
  }

  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  if (typeof left === "string" && typeof right === "string") {
    return collator.compare(left, right);
  }

  if (left instanceof Date && right instanceof Date) {
    return left.getTime() - right.getTime();
  }

  if (typeof left === "boolean" && typeof right === "boolean") {
    return Number(left) - Number(right);
  }

  return collator.compare(String(left), String(right));
};

const withDirection = (comparison: number, direction: SortState["direction"]) =>
  direction === "asc" ? comparison : -comparison;

/**
 * Builds a single-key accessor map for simpler one-field sorting cases.
 */
export const singleKeyAccessors = <TItem, const TKey extends string>(
  key: TKey,
  accessor: (item: TItem) => SortPrimitive,
): Record<TKey, (item: TItem) => SortPrimitive> =>
  ({ [key]: accessor }) as Record<TKey, (item: TItem) => SortPrimitive>;

/**
 * Toggles a sort direction between asc and desc.
 */
export const toggleSortDirection = (direction: SortDirection): SortDirection =>
  direction === "asc" ? "desc" : "asc";

type SortEntry<TItem> = { item: TItem; value: SortPrimitive; unorderable: boolean };

const compareEntries = <TItem>(left: SortEntry<TItem>, right: SortEntry<TItem>): number => {
  if (left.unorderable || right.unorderable) {
    return Number(left.unorderable) - Number(right.unorderable);
  }

  return compareOrderableValues(left.value, right.value);
};

const toEntry = <TItem>(item: TItem, value: SortPrimitive): SortEntry<TItem> => ({
  item,
  value,
  unorderable: isUnorderable(value),
});

/**
 * Sorts items using the provided compare-based sorter.
 *
 * With the default sorter and no custom comparator, accessor values are
 * computed once per item up front (decorate-sort-undecorate), so the accessor
 * runs n times instead of about 2·n·log(n) times. A user-supplied `sorter`
 * always receives the original items, keeping its `ExsortedSorter<TItem>`
 * contract unchanged.
 */
export const sortList = <TItem>(
  items: readonly TItem[],
  state: SortState,
  accessor?: (item: TItem) => SortPrimitive,
  comparator?: CompareFn<TItem>,
  sorter?: ExsortedSorter<TItem>,
): TItem[] => {
  if (!accessor) {
    return [...items];
  }

  const { direction } = state;

  if (comparator) {
    const selectedSorter = sorter ?? mergeSort;
    return selectedSorter([...items], (left, right) =>
      withDirection(comparator(left, right), direction),
    );
  }

  if (sorter) {
    return sorter([...items], (left, right) =>
      withDirection(
        compareEntries(toEntry(left, accessor(left)), toEntry(right, accessor(right))),
        direction,
      ),
    );
  }

  const entries = items.map((item) => toEntry(item, accessor(item)));
  const sortedEntries = mergeSort(entries, (left, right) =>
    withDirection(compareEntries(left, right), direction),
  );

  return sortedEntries.map((entry) => entry.item);
};

/**
 * Resolves the default sort key from accessor map order.
 */
export const resolveDefaultKey = <TAccessors extends Record<string, (...args: any[]) => unknown>>(
  accessors: TAccessors,
): SortKey<TAccessors> => {
  const firstKey = Object.keys(accessors)[0] as SortKey<TAccessors> | undefined;

  if (firstKey === undefined) {
    throw new Error("useSortedList expected at least one accessor key.");
  }

  return firstKey;
};

/**
 * Reads initial direction for standalone mode with asc fallback.
 */
export const resolveStandaloneInitialDirection = <TItem, TKey extends PropertyKey>(
  options: UseSortedListOptions<TItem, TKey>,
): SortDirection => {
  if ("initialDirection" in options && options.initialDirection !== undefined) {
    return options.initialDirection;
  }

  return "asc";
};

/**
 * Resolves standalone initial key with fallback to default key.
 */
export const resolveStandaloneInitialKey = <TItem, TAccessors extends SortAccessorRecord<TItem>>(
  options: UseSortedListOptions<TItem, SortKey<TAccessors>>,
  fallbackKey: SortKey<TAccessors>,
): SortKey<TAccessors> => {
  if ("initialKey" in options && options.initialKey !== undefined) {
    return options.initialKey;
  }

  return fallbackKey;
};

/**
 * Resolves accessor for active key with fallback to default key.
 *
 * This avoids repeated render errors when external state provides an unknown key.
 */
export const resolveAccessorWithFallback = <TItem, TKey extends string>(
  accessors: Record<TKey, (item: TItem) => SortPrimitive>,
  key: TKey,
  fallbackKey: TKey,
): { accessor: (item: TItem) => SortPrimitive; resolvedKey: TKey } => {
  // Own-property check: keys such as "valueOf" or "__proto__" (e.g. taken from a
  // URL query) must not resolve to Object.prototype members.
  if (Object.prototype.hasOwnProperty.call(accessors, key)) {
    const directAccessor = accessors[key];
    if (typeof directAccessor === "function") {
      return { accessor: directAccessor, resolvedKey: key };
    }
  }

  return { accessor: accessors[fallbackKey], resolvedKey: fallbackKey };
};

/**
 * Reads external controller when hook is used in controlled mode.
 */
export const resolveExternalController = <TItem, TAccessors extends SortAccessorRecord<TItem>>(
  options: UseSortedListOptions<TItem, SortKey<TAccessors>>,
): SortController<SortKey<TAccessors>> | undefined =>
  "sort" in options ? options.sort : undefined;

/**
 * Reads external state when hook is used in read-only state mode.
 */
export const resolveExternalState = <TItem, TAccessors extends SortAccessorRecord<TItem>>(
  options: UseSortedListOptions<TItem, SortKey<TAccessors>>,
): SortState<SortKey<TAccessors>> | undefined => ("state" in options ? options.state : undefined);

/**
 * Fast shallow equality check for array identity/content references.
 */
export const areArraysShallowEqual = <TItem>(left: readonly TItem[], right: readonly TItem[]) => {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (!Object.is(left[index], right[index])) {
      return false;
    }
  }

  return true;
};

/**
 * Resolves currently visible items by mode and transition state.
 */
export const resolveVisibleItems = <TItem>(params: {
  isOriginalMode: boolean;
  originalItems: TItem[];
  sortedItems: TItem[];
}): TItem[] => (params.isOriginalMode ? params.originalItems : params.sortedItems);
