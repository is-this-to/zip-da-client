import { computed, ref } from "vue";
import { defineStore } from "pinia";

import myAxios from "../../api/myAxios.js";
import { PROPERTY_LOCATION_API_PATHS } from "./propertyRequestPolicy.js";

const isCanceledRequest = (error) =>
  error?.code === "ERR_CANCELED" ||
  error?.name === "CanceledError" ||
  error?.name === "AbortError";

export const usePropertyRegistrationLocationStore = defineStore(
  "propertyRegistrationLocationStore",
  () => {
    const addressItems = ref([]);
    const validatedLocation = ref(null);
    const apartmentComplexItems = ref([]);
    const isAddressLoading = ref(false);
    const isValidationLoading = ref(false);
    const isComplexLoading = ref(false);
    const errorMessage = ref("");

    let addressController = null;
    let complexController = null;
    let validationSequence = 0;

    const hasValidatedLocation = computed(
      () => validatedLocation.value?.regionId != null,
    );

    const cancelAddressRequest = () => {
      addressController?.abort();
      addressController = null;
      isAddressLoading.value = false;
    };

    const cancelComplexRequest = () => {
      complexController?.abort();
      complexController = null;
      isComplexLoading.value = false;
    };

    const clearLocationSelection = () => {
      validationSequence += 1;
      cancelComplexRequest();
      validatedLocation.value = null;
      apartmentComplexItems.value = [];
      isValidationLoading.value = false;
      errorMessage.value = "";
    };

    const searchAddresses = async (query) => {
      const normalizedQuery = String(query ?? "").trim();

      cancelAddressRequest();
      addressItems.value = [];
      errorMessage.value = "";

      if (normalizedQuery.length < 2) return [];

      const controller = new AbortController();
      addressController = controller;
      isAddressLoading.value = true;

      try {
        const response = await myAxios.get(
          PROPERTY_LOCATION_API_PATHS.kakaoAddress,
          {
            params: { query: normalizedQuery },
            signal: controller.signal,
          },
        );
        const items = response.data?.data?.items;
        addressItems.value = Array.isArray(items) ? items : [];
        return addressItems.value;
      } catch (error) {
        if (isCanceledRequest(error)) return [];
        errorMessage.value =
          error?.response?.data?.message ??
          "주소 검색 결과를 불러오지 못했습니다.";
        throw error;
      } finally {
        if (addressController === controller) {
          addressController = null;
          isAddressLoading.value = false;
        }
      }
    };

    const validateAddress = async (address) => {
      const currentSequence = ++validationSequence;
      cancelComplexRequest();
      isValidationLoading.value = true;
      errorMessage.value = "";
      validatedLocation.value = null;
      apartmentComplexItems.value = [];

      try {
        const response = await myAxios.post(
          PROPERTY_LOCATION_API_PATHS.validate,
          {
            roadAddress: address.roadAddress || null,
            jibunAddress: address.jibunAddress || null,
            legalDongCode: address.legalDongCode,
            longitude: address.longitude,
            latitude: address.latitude,
          },
        );
        if (currentSequence !== validationSequence) return null;
        validatedLocation.value = response.data?.data ?? null;
        return validatedLocation.value;
      } catch (error) {
        if (currentSequence !== validationSequence) return null;
        errorMessage.value =
          error?.response?.data?.message ??
          "주소와 Region 정보를 확인하지 못했습니다.";
        throw error;
      } finally {
        if (currentSequence === validationSequence) {
          isValidationLoading.value = false;
        }
      }
    };

    const searchApartmentComplexes = async ({
      regionId,
      keyword = "",
      size = 20,
    }) => {
      cancelComplexRequest();

      const controller = new AbortController();
      complexController = controller;
      isComplexLoading.value = true;
      errorMessage.value = "";

      try {
        const response = await myAxios.get(
          PROPERTY_LOCATION_API_PATHS.apartmentComplexes,
          {
            params: {
              regionId: String(regionId),
              keyword: String(keyword).trim() || undefined,
              size,
            },
            signal: controller.signal,
          },
        );
        const items = response.data?.data?.items;
        apartmentComplexItems.value = Array.isArray(items) ? items : [];
        return apartmentComplexItems.value;
      } catch (error) {
        if (isCanceledRequest(error)) return [];
        errorMessage.value =
          error?.response?.data?.message ??
          "아파트 단지를 불러오지 못했습니다.";
        throw error;
      } finally {
        if (complexController === controller) {
          complexController = null;
          isComplexLoading.value = false;
        }
      }
    };

    const hydrateValidatedLocation = (location) => {
      validatedLocation.value = location ? { ...location } : null;
    };

    const reset = () => {
      validationSequence += 1;
      cancelAddressRequest();
      cancelComplexRequest();
      addressItems.value = [];
      validatedLocation.value = null;
      apartmentComplexItems.value = [];
      isValidationLoading.value = false;
      errorMessage.value = "";
    };

    return {
      addressItems,
      validatedLocation,
      apartmentComplexItems,
      isAddressLoading,
      isValidationLoading,
      isComplexLoading,
      errorMessage,
      hasValidatedLocation,
      searchAddresses,
      validateAddress,
      searchApartmentComplexes,
      clearLocationSelection,
      hydrateValidatedLocation,
      reset,
    };
  },
);
