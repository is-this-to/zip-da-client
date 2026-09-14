import { ref } from "vue";
import { defineStore } from "pinia";

import myAxios from "../../api/myAxios";

export const usePropertyDetailStore = defineStore(
  "propertyDetailStore",
  () => {
    const propertyDetail = ref(null);
    const isPropertyDetailLoading = ref(false);
    const propertyDetailError = ref(null);

    const fetchPropertyDetail = async (propertyId) => {
      if (propertyId === null || propertyId === undefined || propertyId === "") {
        throw new Error("매물 ID가 필요합니다.");
      }

      try {
        isPropertyDetailLoading.value = true;
        propertyDetailError.value = null;

        const response = await myAxios.get(
          `/api/properties/${encodeURIComponent(String(propertyId))}`,
        );

        propertyDetail.value = response.data.data;
        return propertyDetail.value;
      } catch (error) {
        propertyDetail.value = null;
        propertyDetailError.value = error;
        throw error;
      } finally {
        isPropertyDetailLoading.value = false;
      }
    };

    const resetPropertyDetail = () => {
      propertyDetail.value = null;
      propertyDetailError.value = null;
    };

    return {
      propertyDetail,
      isPropertyDetailLoading,
      propertyDetailError,
      fetchPropertyDetail,
      resetPropertyDetail,
    };
  },
);
