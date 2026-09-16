import { defineStore } from "pinia";
import { ref } from "vue";

import {
  getMyPropertyDetail,
  getPublicPropertyDetail,
} from "../../api/propertyDetailApi.js";
import { useFavoriteStore } from "../favorite/useFavoriteStore.js";

export const usePropertyDetailStore = defineStore(
  "propertyDetail",
  () => {
    const detail = ref(null);
    const isLoading = ref(false);
    const error = ref(null);

    const favoriteStore = useFavoriteStore();

    let requestId = 0;

    const load = async (
      propertyId,
      { own = false } = {},
    ) => {
      const currentRequest = ++requestId;

      detail.value = null;
      error.value = null;
      isLoading.value = true;

      try {
        const data = own
          ? await getMyPropertyDetail(propertyId)
          : await getPublicPropertyDetail(propertyId);

        if (currentRequest === requestId) {
          detail.value = data;
        }
      } catch (cause) {
        if (currentRequest === requestId) {
          error.value = cause;
        }
      } finally {
        if (currentRequest === requestId) {
          isLoading.value = false;
        }
      }
    };

    const toggleFavorite = async () => {
      if (
        !detail.value ||
        favoriteStore.isFavoriteLoading
      ) {
        return;
      }

      const result =
        await favoriteStore.toggleFavorite(
          String(detail.value.propertyId),
          !detail.value.isFavorite,
        );

      detail.value = {
        ...detail.value,
        isFavorite: result.favorite,
        favoriteCount: result.favoriteCount,
      };
    };

    return {
      detail,
      isLoading,
      error,
      load,
      toggleFavorite,
    };
  },
);