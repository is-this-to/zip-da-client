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
   * 내가 찜한 매물 목록
   */
  const favoriteItems = ref([]);

  /**
   * 다음 페이지 조회에 사용할 cursor
   */
  const nextCursor = ref(null);

  /**
   * 다음 페이지 존재 여부
   */
  const hasNext = ref(false);

  /**
   * 찜 목록 조회 중 여부
   */
  const isFavoriteListLoading = ref(false);

  /**
   * 찜 목록 조회 중 발생한 오류
   */
  const favoriteListError = ref(null);

  /**
   * 매물 찜 등록/해제
   *
   * @param {number|string} propertyId 매물 ID
   * @param {boolean} favorite 변경할 찜 상태
   * @returns {Promise<*>} 백엔드 찜 처리 결과
   */
  const toggleFavorite = async (propertyId, favorite) => {
    try {
      isFavoriteLoading.value = true;

      const response = await myAxios.put(
        `/api/property/properties/${propertyId}/favorite`,
        {
          favorite,
        },
      );

      return response.data.data;
    } finally {
      isFavoriteLoading.value = false;
    }
  };

  /**
   * 내가 찜한 매물 목록 조회
   *
   * @param {Object} options 조회 옵션
   * @param {number} options.cursor 조회 cursor
   * @param {number} options.size 조회 개수
   * @param {boolean} options.append 기존 목록 뒤에 추가할지 여부
   * @returns {Promise<*>} 찜 목록 조회 결과
   */
  const fetchFavoriteList = async ({
                                     cursor = 0,
                                     size = 20,
                                     append = false,
                                   } = {}) => {
    if (isFavoriteListLoading.value) {
      return;
    }

    try {
      isFavoriteListLoading.value = true;
      favoriteListError.value = null;

      const response = await myAxios.get(
        "/api/property/me/property-favorites",
        {
          params: {
            cursor,
            size,
          },
        },
      );

      const data = response.data.data;

      if (append) {
        favoriteItems.value = [
          ...favoriteItems.value,
          ...data.items,
        ];
      } else {
        favoriteItems.value = data.items;
      }

      nextCursor.value = data.nextCursor;
      hasNext.value = data.hasNext;

      return data;
    } catch (error) {
      favoriteListError.value = error;
      throw error;
    } finally {
      isFavoriteListLoading.value = false;
    }
  };

  /**
   * 다음 찜 목록 조회
   *
   * 백엔드에서 전달받은 nextCursor를 그대로 사용한다.
   *
   * @param {number} size 조회 개수
   * @returns {Promise<*>|undefined} 다음 찜 목록 조회 결과
   */
  const fetchNextFavoritePage = async (size = 20) => {
    if (
      !hasNext.value ||
      nextCursor.value === null ||
      isFavoriteListLoading.value
    ) {
      return;
    }

    return fetchFavoriteList({
      cursor: nextCursor.value,
      size,
      append: true,
    });
  };

  /**
   * 찜 목록 상태 초기화
   */
  const resetFavoriteList = () => {
    favoriteItems.value = [];
    nextCursor.value = null;
    hasNext.value = false;
    favoriteListError.value = null;
  };

  return {
    isFavoriteLoading,
    favoriteItems,
    nextCursor,
    hasNext,
    isFavoriteListLoading,
    favoriteListError,

    toggleFavorite,
    fetchFavoriteList,
    fetchNextFavoritePage,
    resetFavoriteList,
  };
});
