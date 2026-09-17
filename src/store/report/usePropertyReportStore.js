import { ref } from "vue";
import { defineStore } from "pinia";

import {
  PROPERTY_REPORT_API_PATH,
  createMyReportListParams,
} from "../../constant/report/propertyReport.js";

export const usePropertyReportStore = defineStore(
  "propertyReportStore",
  () => {
    // 내가 신고한 목록
    const items = ref([]);

    // 다음 페이지 조회용 cursor
    const nextCursor = ref(null);

    // 다음 페이지 존재 여부
    const hasNext = ref(false);

    // 목록 조회 중 여부
    const isLoading = ref(false);

    // 조회 중 발생한 오류
    const error = ref(null);

    // 내 신고 목록 조회
    const fetchReports = async ({
      cursor = null,
      size = 20,
      append = false,
    } = {}) => {
      if (isLoading.value) {
        return;
      }

      try {
        isLoading.value = true;
        error.value = null;

        // 테스트에서 Store 초기 상태만 확인할 때
        // Axios 모듈까지 바로 불러오지 않도록 실제 요청 시점에 import
        const { default: myAxios } = await import("../../api/myAxios.js");

        const response = await myAxios.get(
          PROPERTY_REPORT_API_PATH,
          {
            params: createMyReportListParams({
              cursor,
              size,
            }),
          },
        );

        const data = response.data.data;
        const newItems = Array.isArray(data.items)
          ? data.items
          : [];

        if (append) {
          items.value = [
            ...items.value,
            ...newItems,
          ];
        } else {
          items.value = newItems;
        }

        nextCursor.value = data.nextCursor ?? null;
        hasNext.value = Boolean(data.hasNext);

        return data;
      } catch (requestError) {
        error.value = requestError;
        throw requestError;
      } finally {
        isLoading.value = false;
      }
    };

    // 다음 신고 목록 조회
    const fetchNextPage = async (size = 20) => {
      if (
        !hasNext.value ||
        nextCursor.value === null ||
        isLoading.value
      ) {
        return;
      }

      return fetchReports({
        cursor: nextCursor.value,
        size,
        append: true,
      });
    };

    // 신고 목록 상태 초기화
    const reset = () => {
      items.value = [];
      nextCursor.value = null;
      hasNext.value = false;
      error.value = null;
    };

    return {
      items,
      nextCursor,
      hasNext,
      isLoading,
      error,

      fetchReports,
      fetchNextPage,
      reset,
    };
  },
);