<script setup>
defineProps({
  open: {
    type: Boolean,
    default: false,
  },

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
});

const emit = defineEmits([
  "select-sido",
  "select-sigungu",
  "select-emd",
  "confirm",
  "close",
]);
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

    <div class="region-selector__columns">
      <div class="region-column">
        <strong class="region-column__title">
          시·도
        </strong>

        <button
          v-for="region in sidoRegions"
          :key="region.regionId"
          type="button"
          class="region-item"
          :class="{
            'region-item--selected':
              selectedSidoId === region.regionId
          }"
          :aria-pressed="selectedSidoId === region.regionId"
          @click="emit('select-sido', region)"
        >
          {{ region.regionName }}
        </button>
      </div>

      <div class="region-column">
        <strong class="region-column__title">
          시·군·구
        </strong>

        <button
          v-for="region in sigunguRegions"
          :key="region.regionId"
          type="button"
          class="region-item"
          :class="{
            'region-item--selected':
              selectedSigunguId === region.regionId
          }"
          :aria-pressed="selectedSigunguId === region.regionId"
          @click="emit('select-sigungu', region)"
        >
          {{ region.regionName }}
        </button>
      </div>

      <div class="region-column">
        <strong class="region-column__title">
          읍·면·동
        </strong>

        <button
          v-for="region in emdRegions"
          :key="region.regionId"
          type="button"
          class="region-item"
          :class="{
            'region-item--selected':
              selectedEmdId === region.regionId
          }"
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
        :disabled="selectedSidoId === null"
        @click="emit('confirm')"
      >
        이 지역에서 보기
      </button>
    </footer>
  </section>
</template>

<style scoped>
.region-selector {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  width: 100%;
  max-width: var(--zipda-app-width);
  height: 100dvh;
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
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  border: 1px solid var(--zipda-color-border);
  border-width: 1px 0 0;
}

.region-selector__confirm {
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
  overflow-y: auto;
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
    position: relative;
    inset: auto;
    z-index: auto;
    width: 100%;
    max-width: none;
    height: min(420px, calc(100dvh - 180px));
    margin: 0;
    border: 1px solid var(--zipda-color-border);
    border-radius: var(--zipda-radius-large);
    box-shadow: var(--zipda-shadow-app);
  }
}
</style>
