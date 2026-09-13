import { ref } from "vue";
import { defineStore } from "pinia";
import myAxios from "../../api/myAxios";

/**
 * 매물 찜 상태를 관리하는 Store
 */
export const useFavoriteStore = defineStore("favoriteStore", () => {
  /**
   * 찜 등록/해제 요청 중 여부
   */
  const isFavoriteLoading = ref(false);

  /**
   * 매물 찜 등록/해제
   *
   * @param {number|string} propertyId 매물 ID
   * @returns {Promise<*>} 백엔드 찜 처리 결과
   */
  const toggleFavorite = async (propertyId) => {
    try {
      isFavoriteLoading.value = true;

      const response = await myAxios.put(
        `/api/property/properties/${propertyId}/favorite`,
      );

      return response.data.data;
    } finally {
      isFavoriteLoading.value = false;
    }
  };

  return {
    isFavoriteLoading,
    toggleFavorite,
  };
});
