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

const comparePrimitiveValues = (left: SortPrimitive, right: SortPrimitive): number => {
  if (left === right) {
    return 0;
  }

  if (left == null) {
    return 1;
  }

  if (right == null) {
    return -1;
  }

  if (left instanceof Date && right instanceof Date) {
    return left.getTime() - right.getTime();
  }

  if (typeof left === "boolean" && typeof right === "boolean") {
    return Number(left) - Number(right);
  }

  if (typeof left === "number" && typeof right === "number") {
    return left - right;
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

const buildComparator = <TItem>(
  accessor: (item: TItem) => SortPrimitive,
  state: SortState,
  customComparator?: CompareFn<TItem>,
): CompareFn<TItem> => {
  const compareBase: CompareFn<TItem> =
    customComparator ?? ((left, right) => comparePrimitiveValues(accessor(left), accessor(right)));

  return (left, right) => withDirection(compareBase(left, right), state.direction);
};

/**
 * Sorts items using the provided compare-based sorter.
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

  const selectedSorter = sorter ?? mergeSort;
  const directionalComparator = buildComparator(accessor, state, comparator);
  return selectedSorter([...items], directionalComparator);
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
 * Resolves accessor for the active key and fails fast when key is missing.
 */
export const resolveAccessorOrThrow = <TItem, TKey extends string>(
  accessors: Record<TKey, (item: TItem) => SortPrimitive>,
  key: TKey,
): ((item: TItem) => SortPrimitive) => {
  const accessor = accessors[key];

  if (accessor === undefined) {
    throw new Error(`useSortedList could not find accessor for key: ${String(key)}`);
  }

  return accessor;
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
  sourceItems: readonly TItem[];
  isPending: boolean;
  previousItems: TItem[];
  sortedItems: TItem[];
}): TItem[] => {
  const { isOriginalMode, sourceItems, isPending, previousItems, sortedItems } = params;

  if (isOriginalMode) {
    return [...sourceItems];
  }

  if (isPending) {
    return previousItems;
  }

  return sortedItems;
};
