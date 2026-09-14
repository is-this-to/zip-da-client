import { computed, ref } from "vue";
import { defineStore } from "pinia";

import myAxios from "../../api/myAxios.js";
import {
  buildPropertyMapQueryParams,
  createPropertyMapFilters,
  normalizePropertyMapFilters,
} from "../../util/property/propertyMapFilter.js";

export const usePropertyMapStore = defineStore("propertyMapStore", () => {
  const responseType = ref("");
  const items = ref([]);
  const totalCount = ref(0);
  const truncated = ref(false);
  const isLoading = ref(false);
  const errorMessage = ref("");
  const selectedPropertyId = ref(null);
  const selectedPropertySnapshot = ref(null);
  const appliedFilters = ref(createPropertyMapFilters());

  let requestSequence = 0;
  let activeAbortController = null;

  const propertyItems = computed(() => {
    if (
      responseType.value === "REGION_AGGREGATE" ||
      truncated.value
    ) {
      return [];
    }

    return items.value;
  });

  const selectedProperty = computed(() => {
    if (selectedPropertyId.value === null) {
      return null;
    }

    const currentMapProperty = propertyItems.value.find(
      (item) =>
        String(item.propertyId) === String(selectedPropertyId.value),
    );

    if (currentMapProperty) {
      return currentMapProperty;
    }

    return (
      selectedPropertySnapshot.value &&
      String(selectedPropertySnapshot.value.propertyId) ===
        String(selectedPropertyId.value)
        ? selectedPropertySnapshot.value
        : null
    );
  });

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
    isLoading.value = false;
  };

  const getMapProperties = async (
    viewport,
    { preserveSelectedProperty = false } = {},
  ) => {
    cancelActiveRequest();

    const currentSequence = ++requestSequence;
    const abortController = new AbortController();

    activeAbortController = abortController;

    try {
      isLoading.value = true;
      errorMessage.value = "";

      const response = await myAxios.get(
        "/api/property/properties/map",
        {
          params: buildPropertyMapQueryParams(
            viewport,
            appliedFilters.value,
          ),
          signal: abortController.signal,
        },
      );

      if (currentSequence !== requestSequence) {
        return null;
      }

      const data = response.data?.data ?? {};

      responseType.value = data.responseType ?? "";
      items.value = Array.isArray(data.items) ? data.items : [];
      totalCount.value = Number(data.totalCount ?? 0);
      truncated.value = data.truncated === true;

      if (
        selectedPropertyId.value !== null &&
        !preserveSelectedProperty
      ) {
        const selectedStillExists =
          !truncated.value &&
          responseType.value !== "REGION_AGGREGATE" &&
          items.value.some(
            (item) =>
              String(item.propertyId) ===
              String(selectedPropertyId.value),
          );

        if (!selectedStillExists) {
          selectedPropertyId.value = null;
          selectedPropertySnapshot.value = null;
        }
      }

      return data;
    } catch (error) {
      if (
        isCanceledRequest(error) ||
        currentSequence !== requestSequence
      ) {
        return null;
      }

      responseType.value = "";
      items.value = [];
      totalCount.value = 0;
      truncated.value = false;
      errorMessage.value =
        error?.response?.data?.message ??
        "지도 매물 정보를 불러오지 못했습니다.";

      throw error;
    } finally {
      if (currentSequence === requestSequence) {
        isLoading.value = false;
        activeAbortController = null;
      }
    }
  };

  const selectProperty = (property) => {
    if (property === null) {
      selectedPropertyId.value = null;
      selectedPropertySnapshot.value = null;
      return;
    }

    const propertyId =
      typeof property === "object"
        ? property.propertyId
        : property;

    selectedPropertyId.value = String(propertyId);

    if (typeof property === "object") {
      selectedPropertySnapshot.value = property;
      return;
    }

    selectedPropertySnapshot.value =
      propertyItems.value.find(
        (item) => String(item.propertyId) === String(propertyId),
      ) ?? null;
  };

  const setAppliedFilters = (filters) => {
    appliedFilters.value = normalizePropertyMapFilters(filters);
    selectProperty(null);

    return appliedFilters.value;
  };

  const setPropertyTypeFilter = (propertyType) => {
    return setAppliedFilters({
      ...appliedFilters.value,
      propertyTypes: propertyType ? [propertyType] : [],
      roomCountMin: null,
      roomCountMax: null,
    });
  };

  const clearMapState = () => {
    cancelActiveRequest();
    responseType.value = "";
    items.value = [];
    totalCount.value = 0;
    truncated.value = false;
    errorMessage.value = "";
    selectProperty(null);
  };

  return {
    responseType,
    items,
    propertyItems,
    totalCount,
    truncated,
    isLoading,
    errorMessage,
    selectedPropertyId,
    selectedProperty,
    appliedFilters,
    getMapProperties,
    cancelActiveRequest,
    selectProperty,
    setAppliedFilters,
    setPropertyTypeFilter,
    clearMapState,
  };
});
