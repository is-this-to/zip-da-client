import { defineStore } from "pinia";
import { ref } from "vue";
import myAxios from "../../api/myAxios.js";

export const usePopularPropertyStore = defineStore(
  "popularPropertyStore",
  () => {
    const items = ref([]);
    const loading = ref(false);
    const errorMessage = ref("");
    let requestSequence = 0;

    const fetchPopularProperties = async (region) => {
      const sequence = ++requestSequence;
      try {
        loading.value = true;
        errorMessage.value = "";
        const response = await myAxios.get(
          "/api/property/properties/popular",
          { params: { region, size: 5 } },
        );
        if (sequence === requestSequence) {
          items.value = response.data.data ?? [];
        }
      } catch {
        if (sequence === requestSequence) {
          items.value = [];
          errorMessage.value =
            "인기 매물을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";
        }
      } finally {
        if (sequence === requestSequence) {
          loading.value = false;
        }
      }
    };

    return {
      items,
      loading,
      errorMessage,
      fetchPopularProperties,
    };
  },
);
