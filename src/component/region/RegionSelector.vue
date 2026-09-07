<script setup>
import { computed } from 'vue';

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },

  /**
   * 기존 계층 목록
   */
  sidoRegions: {
    type: Array,
    default: () => [],
  },

  sigunguRegions:{
    type: Array,
    default: () => [],
  },

  emdRegions:{
    type: Array,
    default: () => [],
  },

  /**
   * 지역명 검색
   */
  searchKeyword: {
    type: String,
    default: ""
  },

  searchResults: {
    type: Array,
    default: () => []
  },

  isSearchLoading:{
    type: Boolean,
    default: false
  },

  searchErrorMessage:{
    type: String,
    default: ""
  },

  /**
   * 기존 계층 선택 ID
   */
  selectedSidoId: {
    type: Number,
    default: null,
  },

  selectedSigunguId:{
    type: Number,
    default: null,
  },

  selectedEmdId:{
    type: Number,
    default: null,
  },

  /**
   * 검색 선택과 계층 선택을 합친
   * 최종 선택 Region ID
   */
  selectedRegionId:{
    type: Number,
    default: null
  },
});

const emit = defineEmits([
  /**
   * 검색 이벤트
   */
  "update:search-keyword",
  "select-search-region",

  /**
   * 기존 계층 선택 이벤트
   */
  "select-sido",
  "select-sigungu",
  "select-emd",

  /**
   * 기존 확인·닫기 이벤트
   */
  "confirm",
  "close",
]);

/**
 * 검색어가 존재하면 검색 결과 하면을 보여주고,
 * 검색어가 없으면 기존 계층 선택 화면을 보여준다.
 */
const isSearchMode = computed(()=>{
  return (
    props.searchKeyword
    .trim()
    .length > 0
  );
});

const handleSearchInput = (event) =>{
  emit(
    "update:search-keyword",
    event.target.value  
  );
};

const clearSearchKeyword = ()=>{
  emit("update:search-keyword", "");
};

/**
 * 검색 결과에서 지역 계층을 사용자에게 표시한다.
 */
const regionLevelLabel = (region)=>{
  switch(region.regionLevel){
    case 1: 
      return "시·도";
    case 2:
      return "시·군·구";
    case 3: 
      return "읍·면·동";
    default:
      return "지역"; 
  }
};
</script>

<template>
  <section
    v-if="open"
    class="region-selector"
    aria-label="지역 선택"
  >
    <header class="region-selector__header">
      <strong>지역 선택</strong>
      <button
        type="button"
        class="region-selector__close"
        aria-label="지역 선택 닫기"
        @click="emit('close')"
      >
        ×
      </button>
    </header>

    <!-- 지역명 검색 입력창 -->
    <div class="region-search">
      <label 
        for="region-search-keyword"
        class="visually-hidden">
        지역명 검색
      </label>

      <div class="region-search__field">
        <span
          class="region-search__icon"
          aria-hidden="true"
        >
          ⌕
        </span>

        <input 
          id="region-search-keyword"
          :value="searchKeyword"
          type="search"
          maxlength="50"
          autocomplete="off"
          placeholder="지역명을 입력해 주세요."
          class="region-search__input"
          @input="handleSearchInput"
        />

        <button
          v-if="searchKeyword"
          type="button"
          class="region-search__clear"
          aria-label="검색어 지우기"
          @click="clearSearchKeyword"
        >
          ×
        </button>
      </div>
    </div>

    <!-- 지역명 검색 결과-->
    <div
      v-if="isSearchMode"
      class="region-search-results"
      aria-live="polite"    
    >
      <!-- 검색 중 -->
      <p
        v-if="isSearchLoading"
        class="region-search-results__message"
        role="status"
      >
        지역을 검색하는 중입니다.
      </p>

      <!-- 검색 API 오류 -->
      <p
        v-else-if="searchErrorMessage"
        class="
        region-search-results__message 
        region-search-results__message--error"
      >
        {{ searchErrorMessage }}
      </p>

      <!-- 검색 결과-->
      <template
        v-else-if="searchResults.length > 0"
      >
        <button
        v-for="region in searchResults"
        :key="region.regionId"
        type="button"
        class="region-search-result"
        :class="{'region-search-result--selected': selectedRegionId === region.regionId}"
        :aria-pressed="selectedRegionId === region.regionId"
        @click="emit('select-search-region', region)"
        >
          <span
            class="region-search-result__name"
          >
            {{ region.regionName }}
          </span>
          <span
            class="region-search-result__meta"
          >
            {{ regionLevelLabel(region) }}
            ·
            {{ region.regionCode }}
          </span>
        </button>
      </template>

      <!-- 검색 결과 없음 -->
      <p
        v-else
        class="region-search-results__message"
      >
        검색 결과가 없습니다.
      </p>
    </div>
    
    <!-- 기존 계층 선택 -->
    <div
      v-else
      class="region-selector__columns"
    >
      <!-- 시·도 -->
      <div class="region-column">
        <strong
          class="region-column__title"
        >
          시·도
        </strong>

        <button
          v-for="region in sidoRegions"
          :key="region.regionId"
          type="button"
          class="region-item"
          :class="{'region-item--selected': selectedSidoId === region.regionId}"
          :aria-pressed="selectedSidoId === region.regionId"
          @click="
            emit('select-sido', region)
          "
        >
          {{ region.regionName }}
        </button>
      </div>

      <!-- 시·군·구 -->
      <div class="region-column">
        <strong
          class="region-column__title"
        >
          시·군·구
        </strong>

        <button
          v-for="region in sigunguRegions"
          :key="region.regionId"
          type="button"
          class="region-item"
          :class="{'region-item--selected': selectedSigunguId === region.regionId}"
          :aria-pressed="selectedSigunguId === region.regionId"
          @click="emit('select-sigungu', region)"
        >
          {{ region.regionName }}
        </button>
      </div>

      <!-- 읍·면·동 -->
      <div class="region-column">
        <strong
          class="region-column__title"
        >
          읍·면·동
        </strong>

        <button
          v-for="region in emdRegions"
          :key="region.regionId"
          type="button"
          class="region-item"
          :class="{'region-item--selected': selectedEmdId === region.regionId}"
          :aria-pressed="selectedEmdId === region.regionId"
          @click="emit('select-emd', region)"
        >
          {{ region.regionName }}
        </button>
      </div>

    </div>

    <footer class="region-selector__footer">
      <button
        type="button"
        class="region-selector__confirm"
        :disabled="selectedRegionId === null"
        @click="emit('confirm')"
      >
        이 지역에서 보기
      </button>
    </footer>
  </section>
</template>

<style scoped>
.region-search{
  padding: 12px 16px;
  border-bottom: 1px solid var(--zipda-color-border);
}

.region-search__field{
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  min-height: 44px;
  padding: 0 12px;
  background: var(--zipda-color-subtle-background);
  border: 1px solid var(--zipda-color-border);
  border-radius: var(--zipda-radius-medium);
}
.region-search__field:focus-within {
  border-color:
    var(--zipda-color-primary);
  box-shadow:
    var(--zipda-focus-ring);
}

.region-search__icon {
  color:
    var(--zipda-color-text-muted);
  font-size: 18px;
}

.region-search__input {
  width: 100%;
  height: 42px;
  padding: 0 10px;
  color:
    var(--zipda-color-text);
  background: transparent;
  border: 0;
  outline: none;
  font-size: 14px;
}

.region-search__input::placeholder {
  color:
    var(--zipda-color-text-muted);
}

.region-search__clear {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  color:
    var(--zipda-color-text-muted);
  background: transparent;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
}

.region-search-results {
  min-height: 0;
  overflow-y: auto;
}

.region-search-results__message {
  padding: 32px 16px;
  color:
    var(--zipda-color-text-muted);
  font-size: 13px;
  text-align: center;
}

.region-search-results__message--error {
  color:
    var(--zipda-color-danger);
}

.region-search-result {
  display: grid;
  gap: 5px;
  width: 100%;
  padding: 14px 16px;
  color:
    var(--zipda-color-text);
  background:
    var(--zipda-color-white);
  border: 0;
  border-bottom:
    1px solid
    var(--zipda-color-border);
  text-align: left;
  cursor: pointer;
  transition: 
    background-color 150ms ease, 
    color 150ms ease;
}

/*
 * 마우스를 사용할 수 있는 데스크톱 환경에서만
 * hover 효과를 적용한다.
 */
@media (hover: hover) and (pointer: fine) {
  .region-search-result:hover {
    color: var(--zipda-color-primary-active);
    background:
      var(--zipda-color-subtle-hover);
  }
}

/*
 * 버튼을 누르는 순간의 효과
 * 모바일 터치에서도 확인할 수 있다.
 */
.region-search-result:active {
  background:
    var(--zipda-color-primary-light);
}

/*
 * 선택이 끝난 상태는 hover보다 명확하게 유지한다.
 */
.region-search-result--selected {
  color:
    var(--zipda-color-primary-active);
  background:
    var(--zipda-color-primary-light);
  font-weight: 700;
}


.region-search-result--selected {
  color:
    var(
      --zipda-color-primary-active
    );
  background:
    var(--zipda-color-primary-light);
}

.region-search-result__name {
  font-size: 14px;
  font-weight: 700;
}

.region-search-result__meta {
  color:
    var(--zipda-color-text-muted);
  font-size: 11px;
}

.region-search-result--selected
.region-search-result__meta {
  color:
    var(
      --zipda-color-primary-active
    );
}

.region-search__clear:focus-visible,
.region-search-result:focus-visible {
  outline: none;
  box-shadow:
    var(--zipda-focus-ring);
}

.region-selector {
  position: fixed;
  inset: 0;
  z-index: 50;
  
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  width: 100%;
  max-width: var(--zipda-app-width);
  height: 100dvh;
  max-height: 100dvh;
  min-height: 0;
  margin: 0 auto;
  overflow: hidden;

  background: var(--zipda-color-white);
}

.region-selector__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 56px;
  padding: 0 16px;
  border-bottom: 1px solid var(--zipda-color-border);
}

.region-selector__close {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  padding: 0;
  color: var(--zipda-color-text);
  background: transparent;
  border: 0;
  border-radius: 50%;
  font-size: 24px;
  cursor: pointer;
}

.region-selector__columns {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  min-height: 0;
  overflow: hidden;
}

.region-selector__footer {
  position: relative;
  z-index: 2;

  flex-shrink: 0;
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom));

  background: var(--zipda-color-white);
  border-top: 1px solid var(--zipda-color-border);
  box-shadow: 0 -4px 12px rgb(32 33 31 / 6%);
}

.region-selector__confirm {
  display: block;
  width: 100%;
  height: 52px;

  color: var(--zipda-color-white);
  background: var(--zipda-color-primary);
  border: 0;
  border-radius: var(--zipda-radius-medium);

  font-weight: 700;
  cursor: pointer;
}

.region-selector__confirm:disabled {
  opacity: 0.5;
  cursor: default;
}

.region-column {
  min-width: 0;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;

  border-right: 1px solid var(--zipda-color-border);
}

.region-column:last-child {
  border-right: 0;
}

.region-column__title {
  position: sticky;
  top: 0;
  display: block;
  padding: 10px 8px;
  background: var(--zipda-color-surface);
  font-size: 12px;
  text-align: center;
}

.region-item {
  width: 100%;
  padding: 10px 6px;
  overflow: hidden;
  background: transparent;
  border: 0;
  color: var(--zipda-color-text);
  font-size: 12px;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.region-item--selected {
  color: var(--zipda-color-primary-active);
  background: var(--zipda-color-primary-light);
  font-weight: 700;
}

.region-selector__close:focus-visible,
.region-selector__confirm:focus-visible,
.region-item:focus-visible {
  outline: none;
  box-shadow: var(--zipda-focus-ring);
}

@media (min-width: 768px) {
  .region-selector {
    /*
     * 모바일의 fixed 전체 화면 모달을 해제하고
     * 부모인 map-top-overlay 내부 패널로 배치한다.
     */
    position: relative;
    inset: auto;
    z-index: auto;

    width: 100%;
    max-width: none;

    /*
     * 브라우저 높이에 맞게 패널 높이를 조절한다.
     * 너무 작아지는 것은 방지한다.
     */
    height: min(
      520px,
      calc(100dvh - 190px)
    );
    min-height: 320px;
    max-height: calc(100dvh - 190px);

    margin: 0;

    background: var(--zipda-color-white);
    border: 1px solid var(--zipda-color-border);
    border-radius: var(--zipda-radius-large);
    box-shadow: var(--zipda-shadow-app);
  }
}
</style>
