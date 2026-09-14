import { ref } from "vue";
import { defineStore } from "pinia";

import myAxios from "../../api/myAxios.js";
import {
  buildPropertyListQueryParams,
  normalizePropertyMapFilters,
} from "../../util/property/propertyMapFilter.js";

const DEFAULT_PAGE_SIZE = 20;

const copyViewport = (viewport) => ({
  minLat: viewport.minLat,
  minLng: viewport.minLng,
  maxLat: viewport.maxLat,
  maxLng: viewport.maxLng,
});

const normalizePageSize = (size) => {
  const normalized = Number(size);

  if (
    !Number.isSafeInteger(normalized) ||
    normalized < 1 ||
    normalized > 50
  ) {
    throw new Error("목록 조회 크기는 1 이상 50 이하여야 합니다.");
  }

  return normalized;
};

const appendUniqueItems = (currentItems, newItems) => {
  const itemMap = new Map(
    currentItems.map((item) => [String(item.propertyId), item]),
  );

  newItems.forEach((item) => {
    const propertyId = String(item.propertyId);

    if (!itemMap.has(propertyId)) {
      itemMap.set(propertyId, item);
    }
  });

  return [...itemMap.values()];
};

const getErrorMessage = (error) => {
  return (
    error?.response?.data?.message ??
    "매물 목록을 불러오지 못했습니다."
  );
};

export const usePropertyListStore = defineStore(
  "propertyListStore",
  () => {
    const items = ref([]);
    const nextCursor = ref(null);
    const hasNext = ref(false);
    const isInitialLoading = ref(false);
    const isLoadingMore = ref(false);
    const errorMessage = ref("");
    const currentContextKey = ref("");

    let activeViewport = null;
    let activeFilters = null;
    let activePageSize = DEFAULT_PAGE_SIZE;
    let requestSequence = 0;
    let activeAbortController = null;

    const isCanceledRequest = (error) => {
      return (
        error?.code === "ERR_CANCELED" ||
        error?.name === "CanceledError" ||
        error?.name === "AbortError"
      );
    };

    const cancelActiveRequest = () => {
      requestSequence += 1;
      activeAbortController?.abort();
      activeAbortController = null;
      isInitialLoading.value = false;
      isLoadingMore.value = false;
    };

    const createContextKey = (viewport, filters, size) => {
      const params = buildPropertyListQueryParams(
        viewport,
        filters,
        { size },
      );

      params.sort();
      return params.toString();
    };

    const fetchPage = async ({ cursor = null, append = false } = {}) => {
      if (!activeViewport || !activeFilters) {
        return null;
      }

      if (isInitialLoading.value || isLoadingMore.value) {
        return null;
      }

      if (append && (!hasNext.value || nextCursor.value === null)) {
        return null;
      }

      const requestId = ++requestSequence;
      const requestContextKey = currentContextKey.value;
      const abortController = new AbortController();

      activeAbortController = abortController;
      errorMessage.value = "";

      if (append) {
        isLoadingMore.value = true;
      } else {
        isInitialLoading.value = true;
      }

      try {
        const response = await myAxios.get(
          "/api/property/properties",
          {
            params: buildPropertyListQueryParams(
              activeViewport,
              activeFilters,
              {
                cursor,
                size: activePageSize,
              },
            ),
            signal: abortController.signal,
          },
        );

        if (
          requestId !== requestSequence ||
          requestContextKey !== currentContextKey.value
        ) {
          return null;
        }

        const data = response.data?.data ?? {};
        const receivedItems = Array.isArray(data.items)
          ? data.items
          : [];

        items.value = append
          ? appendUniqueItems(items.value, receivedItems)
          : appendUniqueItems([], receivedItems);

        nextCursor.value =
          typeof data.nextCursor === "string" &&
          data.nextCursor.length > 0
            ? data.nextCursor
            : null;

        hasNext.value =
          data.hasNext === true && nextCursor.value !== null;

        return data;
      } catch (error) {
        if (
          isCanceledRequest(error) ||
          requestId !== requestSequence ||
          requestContextKey !== currentContextKey.value
        ) {
          return null;
        }

        errorMessage.value = getErrorMessage(error);
        throw error;
      } finally {
        if (requestId === requestSequence) {
          isInitialLoading.value = false;
          isLoadingMore.value = false;
          activeAbortController = null;
        }
      }
    };

    const fetchInitialProperties = async (
      viewport,
      sourceFilters,
      size = DEFAULT_PAGE_SIZE,
    ) => {
      cancelActiveRequest();

      activeViewport = copyViewport(viewport);
      activeFilters = normalizePropertyMapFilters(sourceFilters);
      activePageSize = normalizePageSize(size);
      currentContextKey.value = createContextKey(
        activeViewport,
        activeFilters,
        activePageSize,
      );

      items.value = [];
      nextCursor.value = null;
      hasNext.value = false;
      errorMessage.value = "";

      return fetchPage({ cursor: null, append: false });
    };

    const fetchNextProperties = async () => {
      if (
        !hasNext.value ||
        nextCursor.value === null ||
        isInitialLoading.value ||
        isLoadingMore.value
      ) {
        return null;
      }

      return fetchPage({
        cursor: nextCursor.value,
        append: true,
      });
    };

    const retry = async () => {
      if (items.value.length === 0) {
        return fetchPage({ cursor: null, append: false });
      }

      return fetchNextProperties();
    };

    const clearListState = () => {
      cancelActiveRequest();

      items.value = [];
      nextCursor.value = null;
      hasNext.value = false;
      isInitialLoading.value = false;
      isLoadingMore.value = false;
      errorMessage.value = "";
      currentContextKey.value = "";
      activeViewport = null;
      activeFilters = null;
      activePageSize = DEFAULT_PAGE_SIZE;
    };

    return {
      items,
      nextCursor,
      hasNext,
      isInitialLoading,
      isLoadingMore,
      errorMessage,
      currentContextKey,
      fetchInitialProperties,
      fetchNextProperties,
      retry,
      cancelActiveRequest,
      clearListState,
    };
  },
);
