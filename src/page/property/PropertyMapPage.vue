<script setup>
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
} from "vue";

import { useRegionStore } from "../../store/region/useRegionStore.js";
import { useMyErrorStore } from "../../store/error/useMyErrorStore.js";

import IconButton from "../../component/button/IconButton.vue";
import KakaoMap from "../../component/region/KakaoMap.vue";
import RegionSelector from "../../component/region/RegionSelector.vue";


const regionStore = useRegionStore();
const myErrorStore = useMyErrorStore();

const kakaoMapRef = shallowRef(null);

const isRegionSelectorOpen = ref(false);
const mapLevel = ref(8);
const inlineErrorMessage = ref("");

// 확인 버튼을 눌러 검색 조건으로 확정한 지역
const appliedRegion = ref(null);

// 현재 지도에 경계가 표시된 지역
// 웹에서는 미리보기 지역이 될 수도 있다.
const displayedRegion = ref(null);

// 데스크탑 여부
const isDesktop = ref(false);

let viewportMediaQuery = null;
let levelChangeTimer = null;
let activeDetailRequestKey = "";

const selectedRegionName = computed(()=>{
  return (
    appliedRegion.value?.regionName ?? "지역·단지·키워드 검색"
  );
});


/**
 * 공통 오류 처리
 */
const handleError = (error)=>{
  console.error(error);

  if(myErrorStore.redirectErrorPage(error)){
    return;
  }

  inlineErrorMessage.value = error?.response?.data?.message ?? "지역 정보를 불러오지 못했습니다.";
};

/**
 * 상세·경계 요청
 */
const requestRegionDetail = async (
  regionId,
  level = mapLevel.value,
  { fitMap = false } = {},
) => {
  const requestKey =
    `${regionId}:${level}`;

  // 실행 중인 동일 요청만 차단한다.
  if (
    activeDetailRequestKey ===
    requestKey
  ) {
    return null;
  }

  activeDetailRequestKey =
    requestKey;

  try {
    inlineErrorMessage.value = "";

    const detail =
      await regionStore.getRegionDetail(
        regionId,
        level,
      );

    if (detail && fitMap) {
      kakaoMapRef.value?.fitToRegion(
        detail,
      );
    }

    return detail;
  } catch (error) {
    handleError(error);
    return null;
  } finally {
    if (
      activeDetailRequestKey ===
      requestKey
    ) {
      activeDetailRequestKey = "";
    }
  }
};

const previewRegionOnDesktop = async (region) =>{
  if(!isDesktop.value){
    return;
  }

  displayedRegion.value = region;

  await requestRegionDetail(
    region.regionId,
    mapLevel.value,
    {
      fitMap: true
    }
  );
};

/**
 * 시·도 선택
 */
const handleSidoSelect = async (region)=>{
  try{
    await Promise.all([
      regionStore.selectSido(region),
      previewRegionOnDesktop(region)
    ]);
  }catch(error){
    handleError(error);
  }
};

/**
 * 시·군·구 선택
 */
const handleSigunguSelect = async (region) =>{
  try{
    await Promise.all([
      regionStore.selectSigungu(region),
      previewRegionOnDesktop(region)
    ]);
  }catch(error){
    handleError(error);
  }
};

/**
 * 읍·면·동 선택
 */
const handleEmdSelect = async (region) =>{
  try{
    regionStore.selectEmd(region);

    await previewRegionOnDesktop(region);
  }catch(error){
    handleError(error);
  }
};

const applySelectedRegion = async () => {
  const region = regionStore.selectedRegion;

  if (!region){
    return;
  }

  appliedRegion.value = region;
  displayedRegion.value = region;

  // 모바일에서는 먼저 선택창을 닫아
  // 지도가 바로 보이도록 한다.
  isRegionSelectorOpen.value = false;

  await requestRegionDetail(region.regionId, mapLevel.value,{fitMap: true});
};

const closeRegionSelector = () => {
  isRegionSelectorOpen.value = false;
};

/**
 * 지도 생성 완료
 */
const handleMapReady = (level) =>{
  mapLevel.value = level;
};

/**
 * 지도 확대 단계 변경
 */
const handleLevelChange = (level) =>{
  mapLevel.value = level;

  clearTimeout(levelChangeTimer);

  levelChangeTimer = setTimeout(
    async ()=>{
      const region = displayedRegion.value;

      if(!region){
        return;
      }

      await requestRegionDetail(region.regionId, level,{fitMap: false});
    },
    300
  );
};

const moveToCurrentLocation = () =>{
  kakaoMapRef.value?.moveToCurrentLocation();
};

const refreshDisplayedRegion = async () => {
  const region = displayedRegion.value;

  if (!region) {
    return;
  }

  await requestRegionDetail(
    region.regionId,
    mapLevel.value,
    { fitMap: false },
  );
};

const initializePage = async()=>{
  try{
    await regionStore.getRootRegions();
  }catch(error){
    handleError(error);
  }
};

const updateViewportMode = (event) => {
  isDesktop.value = event.matches;
};

onMounted(async () => {
  viewportMediaQuery = window.matchMedia(
    "(min-width: 768px)",
  );

  isDesktop.value = viewportMediaQuery.matches;

  viewportMediaQuery.addEventListener(
    "change",
    updateViewportMode,
  );

  await initializePage();
});

onBeforeUnmount(()=>{
  clearTimeout(levelChangeTimer);

  viewportMediaQuery?.removeEventListener(
    "change",
    updateViewportMode,
  );

  regionStore.clearRegionState();
});
</script>

<template>
  <section class="property-map-page">
    <KakaoMap
      ref="kakaoMapRef"
      :region-detail="regionStore.regionDetail"
      @ready="handleMapReady"
      @level-change="handleLevelChange"
      @map-error="handleError"
    />

    <div class="map-top-overlay">
      <div class="map-search-row">
        <button
          type="button"
          class="map-search-button"
          :aria-expanded="isRegionSelectorOpen"
          @click="
            isRegionSelectorOpen =
              !isRegionSelectorOpen
          "
        >
          <span aria-hidden="true">⌕</span>
          <span>{{ selectedRegionName }}</span>
        </button>

        <IconButton
          icon="☷"
          label="검색 필터 열기"
        />
      </div>

      <!-- 매물 API 연결 전에는 화면 구조만 준비 -->
      <div class="property-type-chips">
        <button
          type="button"
          class="property-chip property-chip--active"
        >
          전체
        </button>

        <button
          type="button"
          class="property-chip"
        >
          아파트
        </button>

        <button
          type="button"
          class="property-chip"
        >
          오피스텔
        </button>

        <button
          type="button"
          class="property-chip"
        >
          빌라
        </button>

        <button
          type="button"
          class="property-chip"
        >
          원룸·투룸+
        </button>
      </div>

      <RegionSelector
        :open="isRegionSelectorOpen"
        :sido-regions="regionStore.sidoRegions"
        :sigungu-regions="regionStore.sigunguRegions"
        :emd-regions="regionStore.emdRegions"
        :selected-sido-id="
          regionStore.selectedSido?.regionId
        "
        :selected-sigungu-id="
          regionStore.selectedSigungu?.regionId
        "
        :selected-emd-id="
          regionStore.selectedEmd?.regionId
        "
        @select-sido="handleSidoSelect"
        @select-sigungu="handleSigunguSelect"
        @select-emd="handleEmdSelect"
        @confirm="applySelectedRegion"
        @close="closeRegionSelector"
      />

      <p
        v-if="inlineErrorMessage"
        class="map-error-message"
      >
        {{ inlineErrorMessage }}
      </p>
    </div>

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

    <div
      v-if="regionStore.isDetailLoading"
      class="map-loading"
      role="status"
    >
      지역 경계를 불러오는 중입니다.
    </div>
  </section>
</template>

<style scoped>
.property-map-page {
  position: relative;
  width: 100%;

  /*
   * App.vue가 BottomNavBar 공간을 padding으로 확보하므로
   * 지도 화면이 불필요하게 세로 스크롤되지 않도록 제외한다.
   */
  height: calc(
    100dvh -
    var(--zipda-bottom-nav-height)
  );

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
</style>
