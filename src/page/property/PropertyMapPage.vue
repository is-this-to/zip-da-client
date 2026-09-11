<script setup>
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from "vue";

import { useRegionStore } from "../../store/region/useRegionStore.js";
import { useMyErrorStore } from "../../store/error/useMyErrorStore.js";

import IconButton from "../../component/button/IconButton.vue";
import KakaoMap from "../../component/region/KakaoMap.vue";
import RegionSelector from "../../component/region/RegionSelector.vue";

const regionStore = useRegionStore();
const myErrorStore = useMyErrorStore();

const kakaoMapRef = shallowRef(null);

/**
 * 지역 선택창 상태
 */
const isRegionSelectorOpen = ref(false);

/**
 * 현재 카카오 지도 확대 단계
 */
const mapLevel = ref(8);

/**
 * 지역 상세·지도 오류 메시지
 */
const inlineErrorMessage = ref("");

/**
 * 확인 버튼을 눌러
 * 검색 조건으로 확정한 지역
 */
const appliedRegion = ref(null);

/**
 * 현재 지도에 경계가 표시된 지역
 *
 * 데스크탑에서는 사용자가 선택 중인
 * 미리보기 지역이 될 수도 있다.
 */
const displayedRegion = ref(null);

/**
 * 현재 화면이 데스크톱인지 여부
 */
const isDesktop = ref(false);

/**
 * 지역명 검색 상태
 */
const searchKeyword = ref("");
const searchErrorMessage = ref("");
const isSearchPending = ref(false);

/**
 * 브라우저 화면 크기 감지 객체
 */
let viewportMediaQuery = null;

/**
 * 지역 검색 debounce 타이머
 */
let searchDebounceTimer = null;

/**
 * 지도 확대 단계 변경 debounce 타이머
 */
let levelChangeTimer = null;

/**
 * 현재 실행 중인 지역 상세 요청 키
 *
 * 같은 Region과 같은 지도 단계의 요청이
 * 동시에 중복 실행되지 않도록 사용한다.
 */
let activeDetailRequestKey = "";

/**
 * 지도 상단 검색 버튼에 표시할 지역명
 *
 * 사용자가 확인 버튼을 눌러 확정한 지역이 있으면
 * 해당 지역명을 표시한다.
 */
const selectedRegionName = computed(() => {
  return appliedRegion.value?.regionName ?? "지역·단지·키워드 검색";
});

/**
 * 지역 상세·지도 공통 오류 처리
 */
const handleError = (error) => {
  console.error(error);

  /**
   * DB 오류 또는 시스템 오류라면
   * 공통 오류 페이지로 이동한다.
   */
  if (myErrorStore.redirectErrorPage(error)) {
    return;
  }

  /**
   * 그 외 오류는 지도 화면 안에 표시한다.
   */
  inlineErrorMessage.value =
    error?.response?.data?.message ?? "지역 정보를 불러오지 못했습니다.";
};

/**
 * 지역명 검색 오류 처리
 *
 * 지역 상세 오류와 지역 검색 오류를
 * 서로 다른 위치에 표시하기 위해 분리한다.
 */
const handleSearchError = (error) => {
  console.error(error);

  if (myErrorStore.redirectErrorPage(error)) {
    return;
  }

  searchErrorMessage.value =
    error?.response?.data?.message ?? "지역 검색 결과를 불러오지 못했습니다.";
};

/**
 * 지역 상세·경계 요청
 *
 * regionId와 지도 확대 단계를 전달하여
 * 중심점, 경계 geometry, bounds를 조회한다.
 */
const requestRegionDetail = async (
  regionId,
  level = mapLevel.value,
  { fitMap = false } = {},
) => {
  const requestKey = `${regionId}:${level}`;

  /**
   * 실행 중인 요청과 완전히 동일한 요청이면
   * 중복 실행하지 않는다.
   */
  if (activeDetailRequestKey === requestKey) {
    return null;
  }

  activeDetailRequestKey = requestKey;

  try {
    inlineErrorMessage.value = "";

    const detail = await regionStore.getRegionDetail(regionId, level);

    /**
     * fitMap이 true이면 Region의 bounds에 맞춰
     * 지도의 중심과 확대 단계를 조정한다.
     */
    if (detail && fitMap) {
      kakaoMapRef.value?.fitToRegion(detail);
    }

    return detail;
  } catch (error) {
    handleError(error);
    return null;
  } finally {
    /**
     * 현재 실행한 요청이 여전히 최신 요청일 때만
     * 요청 키를 초기화한다.
     */
    if (activeDetailRequestKey === requestKey) {
      activeDetailRequestKey = "";
    }
  }
};

/**
 * 데스크톱 지역 경계 미리보기
 *
 * 데스크탑에서는 지역을 선택할 때마다
 * 확인 버튼을 누르기 전에도 지도에 경계를 표시한다.
 *
 * 모바일에서는 지역 선택창이 화면 전체를 가리므로
 * 확인 버튼을 누르기 전에는 경계를 요청하지 않는다.
 */
const previewRegionOnDesktop = async (region) => {
  if (!isDesktop.value) {
    return;
  }

  displayedRegion.value = region;

  await requestRegionDetail(region.regionId, mapLevel.value, {
    fitMap: true,
  });
};

/**
 * 시·도 선택
 */
const handleSidoSelect = async (region) => {
  try {
    await Promise.all([
      /**
       * 선택한 시·도의 하위 시·군·구를 조회한다.
       */
      regionStore.selectSido(region),

      /**
       * 데스크탑이면 선택한 시·도 경계를
       * 지도에 미리 표시한다.
       */
      previewRegionOnDesktop(region),
    ]);
  } catch (error) {
    handleError(error);
  }
};

/**
 * 시·군·구 선택
 */
const handleSigunguSelect = async (region) => {
  try {
    await Promise.all([
      /**
       * 선택한 시·군·구의 하위 읍·면·동을 조회한다.
       */
      regionStore.selectSigungu(region),

      /**
       * 데스크탑이면 선택한 시·군·구 경계를
       * 지도에 미리 표시한다.
       */
      previewRegionOnDesktop(region),
    ]);
  } catch (error) {
    handleError(error);
  }
};

/**
 * 읍·면·동 선택
 */
const handleEmdSelect = async (region) => {
  try {
    /**
     * 읍·면·동은 공개 선택의 마지막 단계이므로
     * 하위 Region API를 호출하지 않는다.
     */
    regionStore.selectEmd(region);

    /**
     * 데스크탑이면 선택한 읍·면·동 경계를
     * 지도에 미리 표시한다.
     */
    await previewRegionOnDesktop(region);
  } catch (error) {
    handleError(error);
  }
};

/**
 * 선택한 지역을 검색 조건으로 확정
 *
 * 계층으로 선택한 지역과 검색으로 선택한 지역 모두
 * regionStore.selectedRegion을 통해 가져온다.
 */
const applySelectedRegion = async () => {
  const region = regionStore.selectedRegion;

  if (!region) {
    return;
  }

  /**
   * 최종 검색 조건으로 선택한 Region을 저장한다.
   */
  appliedRegion.value = region;

  /**
   * 지도에 푯시할 Region도 동일하게 설정한다.
   */
  displayedRegion.value = region;

  /**
   * 모바일에서는 먼저 선택창을 닫아
   * 지도가 바로 보이게 한다.
   */
  isRegionSelectorOpen.value = false;

  /**
   * 선택한 Region의 상세·경계를 조회하고
   * bounds에 맞춰 지도를 이동한다.
   */
  await requestRegionDetail(region.regionId, mapLevel.value, { fitMap: true });
};

/**
 * 지역 선택창 닫기
 */
const closeRegionSelector = () => {
  isRegionSelectorOpen.value = false;
};

/**
 * 카카오 지도 생성 완료
 */
const handleMapReady = (level) => {
  mapLevel.value = level;
};

/**
 * 카카오 지도 확대 단계 변경
 *
 * 지도 확대 단계가 바뀌면 300ms 후
 * 현재 표시 중인 Region의 단순화 경계를 다시 요청한다.
 */
const handleLevelChange = (level) => {
  mapLevel.value = level;

  clearTimeout(levelChangeTimer);

  levelChangeTimer = setTimeout(async () => {
    const region = displayedRegion.value;

    if (!region) {
      return;
    }

    /**
     * 확대 단계 변경으로 다시 조회할 때는
     * 지도를 Region bounds로 되돌리지 않는다.
     *
     * 경계 geometry만 새 단계에 맞춰 교체한다.
     */
    await requestRegionDetail(region.regionId, level, { fitMap: false });
  }, 300);
};

/**
 * 현재 사용자 위치로 지도 이동
 */
const moveToCurrentLocation = () => {
  kakaoMapRef.value?.moveToCurrentLocation();
};

/**
 * 현재 지도에 표시 중인 Region 다시 조회
 */
const refreshDisplayedRegion = async () => {
  const region = displayedRegion.value;

  if (!region) {
    return;
  }

  await requestRegionDetail(region.regionId, mapLevel.value, { fitMap: false });
};

/**
 * 지도 페이지 초기화
 */
const initializePage = async () => {
  try {
    /**
     * 최초 진입 시 최상위 시·도 목록을 조회한다.
     */
    await regionStore.getRootRegions();
  } catch (error) {
    handleError(error);
  }
};

/**
 * 화면 크기 변경 감지
 */
const updateViewportMode = (event) => {
  isDesktop.value = event.matches;
};

/**
 * 지역 검색어 변경
 *
 * 사용자가 마지막으로 입력한 후
 * 350ms 동안 추가 입력이 없을 때 검색한다.
 */

/**
 * 지역 검색어 변경
 *
 * 사용자가 마지막으로 입력한 뒤
 * 350ms 동안 추가 입력이 없을 때 검색한다.
 */
const handleSearchKeywordUpdate = (keyword) => {
  /**
   * 입력창에 표시할 검색어를 저장한다.
   */
  searchKeyword.value = keyword;

  /**
   * 검색어가 바뀌면 기존 검색 오류를 제거한다.
   */
  searchErrorMessage.value = "";

  /**
   * 이전 debounce 타이머를 제거한다.
   */
  clearTimeout(searchDebounceTimer);

  /**
   * 입력값이 바뀌는 즉시 기존 검색 결과와
   * 검색 선택 상태를 초기화한다.
   *
   * 실행 중인 이전 검색 요청도 논리적으로 무효화한다.
   */
  regionStore.clearRegionSearchState();

  /**
   * 앞뒤 공백을 제거한다.
   */
  const normalizedKeyword = keyword.trim();

  /**
   * 공백 제거 후 빈 문자열이면
   * 검색 API를 호출하지 않는다.
   */
  if (!normalizedKeyword) {
    isSearchPending.value = false;
    return;
  }

  /**
   * debounce 대기 시간도 화면에서는
   * 검색 중 상태로 표시한다.
   */
  isSearchPending.value = true;

  /**
   * 마지막 입력 후 350ms가 지나면
   * 지역 검색 API를 호출한다.
   */
  searchDebounceTimer = setTimeout(async () => {
    isSearchPending.value = false;

    try {
      await regionStore.searchRegions(normalizedKeyword);
    } catch (error) {
      handleSearchError(error);
    }
  }, 350);
};

/**
 * 지역명 검색 결과 선택
 */
const handleSearchRegionSelect = async (region) => {
  try {
    searchErrorMessage.value = "";

    /**
     * 검색 결과를 Store의 공통 선택 후보로 저장한다.
     */
    regionStore.selectSearchRegion(region);

    /**
     * 데스크톱이면 검색 결과를 선택하는 즉시
     * 기존 상세·경계 API를 호출하여 미리 보여준다.
     *
     * 모바일이면 previewRegionOnDesktop()에서
     * 아무 작업도 하지 않고 반환한다.
     */
    await previewRegionOnDesktop(region);
  } catch (error) {
    handleError(error);
  }
};

/**
 * 컴포넌트가 화면에 생성될 때 실행
 */
onMounted(async () => {
  viewportMediaQuery = window.matchMedia("(min-width: 768px)");

  isDesktop.value = viewportMediaQuery.matches;

  viewportMediaQuery.addEventListener("change", updateViewportMode);

  await initializePage();
});

/**
 * 컴포넌트가 제거되기 전에 실행
 */
onBeforeUnmount(() => {
  /**
   * 지도 확대 단계 타이머 제거
   */
  clearTimeout(levelChangeTimer);

  /**
   * 지역 검색 debounce 타이머 제거
   */
  clearTimeout(searchDebounceTimer);

  /**
   * 화면 크기 변경 이벤트 제거
   */
  viewportMediaQuery?.removeEventListener("change", updateViewportMode);

  /**
   * Region Store 상태 초기화
   */
  regionStore.clearRegionState();
});
</script>

<template>
  <section class="property-map-page">
    <!-- 카카오 지도 -->
    <KakaoMap
      ref="kakaoMapRef"
      :region-detail="regionStore.regionDetail"
      @ready="handleMapReady"
      @level-change="handleLevelChange"
      @map-error="handleError"
    />

    <!-- 지도 상단 검색 영역 -->
    <div
      class="map-top-overlay"
      :class="{ 'map-top-overlay--selector-open': isRegionSelectorOpen }"
    >
      <div class="map-search-row">
        <button
          type="button"
          class="map-search-button"
          :aria-expanded="isRegionSelectorOpen"
          @click="isRegionSelectorOpen = !isRegionSelectorOpen"
        >
          <span aria-hidden="true">⌕</span>
          <span>{{ selectedRegionName }}</span>
        </button>

        <IconButton icon="☷" label="검색 필터 열기" />
      </div>

      <!-- 매물 API 연결 전에는 화면 구조만 준비 -->
      <div class="property-type-chips">
        <button type="button" class="property-chip property-chip--active">
          전체
        </button>

        <button type="button" class="property-chip">아파트</button>

        <button type="button" class="property-chip">오피스텔</button>

        <button type="button" class="property-chip">빌라</button>

        <button type="button" class="property-chip">원룸·투룸+</button>
      </div>

      <!-- 지역 선택 및 지역명 검색 -->
      <RegionSelector
        :open="isRegionSelectorOpen"
        :sido-regions="regionStore.sidoRegions"
        :sigungu-regions="regionStore.sigunguRegions"
        :emd-regions="regionStore.emdRegions"
        :search-keyword="searchKeyword"
        :search-results="regionStore.searchResults"
        :is-search-loading="isSearchPending || regionStore.isSearchLoading"
        :search-error-message="searchErrorMessage"
        :selected-sido-id="regionStore.selectedSido?.regionId ?? null"
        :selected-sigungu-id="regionStore.selectedSigungu?.regionId ?? null"
        :selected-emd-id="regionStore.selectedEmd?.regionId ?? null"
        :selected-region-id="regionStore.selectedRegion?.regionId ?? null"
        @update:search-keyword="handleSearchKeywordUpdate"
        @select-search-region="handleSearchRegionSelect"
        @select-sido="handleSidoSelect"
        @select-sigungu="handleSigunguSelect"
        @select-emd="handleEmdSelect"
        @confirm="applySelectedRegion"
        @close="closeRegionSelector"
      />

      <!-- 지역 상세·지도 오류 -->
      <p v-if="inlineErrorMessage" class="map-error-message">
        {{ inlineErrorMessage }}
      </p>
    </div>

    <!-- 지도 우측 하단 버튼 -->
    <div class="map-floating-actions">
      <IconButton
        icon="⌾"
        label="현재 위치로 이동"
        @click="moveToCurrentLocation"
      />

      <IconButton
        icon="↻"
        label="현재 지역 다시 조회"
        :loading="regionStore.isDetailLoading"
        @click="refreshDisplayedRegion"
      />
    </div>

    <!-- 지역 상세·경계 로딩 -->
    <div v-if="regionStore.isDetailLoading" class="map-loading" role="status">
      지역 경계를 불러오는 중입니다.
    </div>
  </section>
</template>

<style scoped>
.property-map-page {
  position: relative;
  width: 100%;

  /*
   * App.vue가 BottomNavBar 공간을 
   * padding으로 확보하므로 지도 화면이
   * 불필요하게 세로 스크롤되지 않도록 한다.
   */
  height: calc(100dvh - var(--zipda-bottom-nav-height));

  overflow: hidden;
  background: var(--zipda-color-disabled);
}

.map-top-overlay {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  z-index: 10;
  display: grid;
  gap: 8px;
  padding: 16px 16px 32px;
  background: linear-gradient(
    to bottom,
    rgb(255 255 255 / 95%),
    rgb(255 255 255 / 80%) 50%,
    transparent
  );
}
.map-top-overlay--selector-open {
  z-index: 40;
}

.map-search-row {
  display: grid;
  grid-template-columns:
    minmax(0, 1fr)
    48px;
  gap: 8px;
}

.map-search-button {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  height: 48px;
  padding: 0 17px;
  color: var(--zipda-color-text);
  background: var(--zipda-color-white);
  border: 1px solid var(--zipda-color-border);
  border-radius: var(--zipda-radius-large);
  box-shadow: 0 1px 2px rgb(0 0 0 / 5%);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.map-search-button span:last-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.property-type-chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
}

.property-type-chips::-webkit-scrollbar {
  display: none;
}

.property-chip {
  flex: 0 0 auto;
  height: 34px;
  padding: 0 16px;
  color: var(--zipda-color-text);
  background: #e9f5db;
  border: 1px solid var(--zipda-color-border);
  border-radius: 9999px;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.property-chip--active {
  color: var(--zipda-color-white);
  background: var(--zipda-color-subtle-text);
  border-color: var(--zipda-color-subtle-text);
}

.map-floating-actions {
  position: absolute;
  right: 16px;
  bottom: 32px;
  z-index: 10;
  display: grid;
  gap: 12px;
}

.map-error-message {
  padding: 10px 12px;
  color: var(--zipda-color-danger);
  background: var(--zipda-color-danger-light);
  border-radius: var(--zipda-radius-medium);
  font-size: 12px;
}

.map-loading {
  position: absolute;
  bottom: 24px;
  left: 50%;
  z-index: 20;
  padding: 9px 14px;
  color: var(--zipda-color-white);
  background: rgb(32 33 31 / 80%);
  border-radius: 9999px;
  font-size: 12px;
  transform: translateX(-50%);
}

@media (min-width: 768px) {
  /*
   * 데스크톱에서는 BottomNavBar가 없으므로
   * 지도 페이지가 브라우저 전체 높이를 사용한다.
   */
  .property-map-page {
    height: 100dvh;
  }

  /*
   * 상단 UI 전체를 화면에 펼치지 않고
   * 지도 왼쪽의 고정 너비 패널로 만든다.
   */
  .map-top-overlay {
    top: 0;
    right: auto;
    left: 0;

    width: min(420px, calc(100vw - 48px));

    padding: 24px;

    /*
     * 모바일에서 사용한 전체 너비 그라데이션을 제거한다.
     */
    background: transparent;
  }

  /*
   * 검색창과 필터 버튼의 가독성을 높이기 위한 배경이다.
   */
  .map-search-row {
    padding: 0;
  }

  /*
   * 매물 유형 필터가 왼쪽 패널 너비 안에서
   * 가로 스크롤되도록 유지한다.
   */
  .property-type-chips {
    width: 100%;
    padding-bottom: 2px;
  }

  /*
   * 지도 제어 버튼은 화면 오른쪽 아래에 배치한다.
   */
  .map-floating-actions {
    right: 24px;
    bottom: 24px;
  }

  /*
   * 지도 오류 메시지도 왼쪽 패널 너비를 따른다.
   */
  .map-error-message {
    width: 100%;
  }

  /*
   * 로딩 표시는 지도 화면의 중앙 하단에 배치한다.
   */
  .map-loading {
    bottom: 32px;
  }
}
</style>
