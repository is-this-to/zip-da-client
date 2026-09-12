<script setup>
import { ref, watch } from "vue";

import {
  createPropertyMapFilters,
  normalizePropertyMapFilters,
} from "../../util/property/propertyMapFilter.js";

const props = defineProps({
  open: { type: Boolean, default: false },
  appliedFilters: { type: Object, required: true },
});

const emit = defineEmits(["close", "apply"]);

const form = ref(createPropertyMapFilters());
const errorMessage = ref("");

const optionSections = [
  {
    title: "매물 유형",
    field: "propertyTypes",
    options: [
      ["APARTMENT", "아파트"],
      ["OFFICETEL", "오피스텔"],
      ["VILLA", "빌라"],
      ["ROOM", "원룸·투룸+"],
    ],
  },
  {
    title: "거래 유형",
    field: "transactionTypes",
    options: [
      ["SALE", "매매"],
      ["JEONSE", "전세"],
      ["MONTHLY_RENT", "월세"],
    ],
  },
  {
    title: "등록 주체",
    field: "publisherTypes",
    options: [
      ["DIRECT_OWNER", "집주인 직접"],
      ["DIRECT_TENANT", "세입자 직접"],
      ["AGENT_BROKERAGE", "중개사"],
    ],
  },
];

const rangeSections = [
  {
    title: "매매가",
    minField: "minSalePrice",
    maxField: "maxSalePrice",
    minPlaceholder: "최소 매매가",
    maxPlaceholder: "최대 매매가",
    min: 0,
    step: 1,
  },
  {
    title: "보증금",
    minField: "minDeposit",
    maxField: "maxDeposit",
    minPlaceholder: "최소 보증금",
    maxPlaceholder: "최대 보증금",
    min: 0,
    step: 1,
  },
  {
    title: "월세",
    minField: "minMonthlyRent",
    maxField: "maxMonthlyRent",
    minPlaceholder: "최소 월세",
    maxPlaceholder: "최대 월세",
    min: 0,
    step: 1,
  },
  {
    title: "관리비",
    minField: "minMaintenanceFee",
    maxField: "maxMaintenanceFee",
    minPlaceholder: "최소 관리비",
    maxPlaceholder: "최대 관리비",
    min: 0,
    step: 1,
  },
  {
    title: "전용면적(㎡)",
    minField: "minExclusiveArea",
    maxField: "maxExclusiveArea",
    minPlaceholder: "최소 면적",
    maxPlaceholder: "최대 면적",
    min: 0.01,
    step: 0.01,
  },
  {
    title: "방 개수",
    minField: "roomCountMin",
    maxField: "roomCountMax",
    minPlaceholder: "최소 방 개수",
    maxPlaceholder: "최대 방 개수",
    min: 1,
    step: 1,
  },
];

const booleanSections = [
  ["isParkingAvailable", "주차", "가능", "불가능"],
  ["hasElevator", "엘리베이터", "있음", "없음"],
  ["isPetAllowed", "반려동물", "가능", "불가능"],
];

watch(
  () => props.open,
  (open) => {
    if (open) {
      form.value = createPropertyMapFilters(props.appliedFilters);
      errorMessage.value = "";
    }
  },
);

const toggleArrayValue = (field, value) => {
  const selected = new Set(form.value[field]);
  selected.has(value) ? selected.delete(value) : selected.add(value);
  form.value[field] = [...selected];
};

const isSelected = (field, value) => form.value[field].includes(value);

const toNullableBoolean = (value) => {
  if (value === "") {
    return null;
  }
  return value === "true";
};

const resetForm = () => {
  form.value = createPropertyMapFilters();
  errorMessage.value = "";
};

const applyFilters = () => {
  try {
    emit("apply", normalizePropertyMapFilters(form.value));
  } catch (error) {
    errorMessage.value = error?.message ?? "필터 값을 확인해 주세요.";
  }
};
</script>

<template>
  <section
    v-if="open"
    class="property-filter-panel"
    role="dialog"
    aria-modal="true"
    aria-label="지도 매물 필터"
  >
    <header class="property-filter-panel__header">
      <strong>검색 필터</strong>
      <button
        type="button"
        class="property-filter-panel__close"
        aria-label="검색 필터 닫기"
        @click="emit('close')"
      >
        ×
      </button>
    </header>

    <div class="property-filter-panel__body">
      <fieldset
        v-for="section in optionSections"
        :key="section.field"
        class="filter-section"
      >
        <legend>{{ section.title }}</legend>
        <div class="filter-options">
          <button
            v-for="[value, label] in section.options"
            :key="value"
            type="button"
            class="filter-option"
            :class="{
              'filter-option--selected': isSelected(section.field, value),
            }"
            :aria-pressed="isSelected(section.field, value)"
            @click="toggleArrayValue(section.field, value)"
          >
            {{ label }}
          </button>
        </div>
      </fieldset>

      <fieldset
        v-for="section in rangeSections"
        :key="section.minField"
        class="filter-section"
      >
        <legend>{{ section.title }}</legend>
        <div class="filter-range">
          <input
            v-model="form[section.minField]"
            type="number"
            :min="section.min"
            :step="section.step"
            :placeholder="section.minPlaceholder"
          />
          <span>~</span>
          <input
            v-model="form[section.maxField]"
            type="number"
            :min="section.min"
            :step="section.step"
            :placeholder="section.maxPlaceholder"
          />
        </div>
      </fieldset>

      <fieldset class="filter-section">
        <legend>사용승인일</legend>
        <div class="filter-range">
          <input
            v-model="form.approvalDateFrom"
            type="date"
            aria-label="사용승인일 시작일"
          />
          <span>~</span>
          <input
            v-model="form.approvalDateTo"
            type="date"
            aria-label="사용승인일 종료일"
          />
        </div>
      </fieldset>

      <fieldset class="filter-section">
        <legend>상세 조건</legend>
        <label
          v-for="[field, label, trueLabel, falseLabel] in booleanSections"
          :key="field"
          class="filter-select"
        >
          <span>{{ label }}</span>
          <select
            :value="form[field] === null ? '' : String(form[field])"
            @change="form[field] = toNullableBoolean($event.target.value)"
          >
            <option value="">전체</option>
            <option value="true">{{ trueLabel }}</option>
            <option value="false">{{ falseLabel }}</option>
          </select>
        </label>
      </fieldset>

      <p
        v-if="errorMessage"
        class="property-filter-panel__error"
        role="alert"
      >
        {{ errorMessage }}
      </p>
    </div>

    <footer class="property-filter-panel__footer">
      <button
        type="button"
        class="property-filter-panel__reset"
        @click="resetForm"
      >
        초기화
      </button>
      <button
        type="button"
        class="property-filter-panel__apply"
        @click="applyFilters"
      >
        적용하기
      </button>
    </footer>
  </section>
</template>

<style scoped>
.property-filter-panel {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  width: 100%;
  max-width: var(--zipda-app-width);
  height: 100dvh;
  margin: 0 auto;
  background: var(--zipda-color-white);
}

.property-filter-panel__header,
.property-filter-panel__footer {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: var(--zipda-color-white);
}

.property-filter-panel__header {
  justify-content: space-between;
  border-bottom: 1px solid var(--zipda-color-border);
}

.property-filter-panel__footer {
  border-top: 1px solid var(--zipda-color-border);
}

.property-filter-panel__close {
  width: 40px;
  height: 40px;
  padding: 0;
  background: transparent;
  border: 0;
  font-size: 24px;
  cursor: pointer;
}

.property-filter-panel__body {
  min-height: 0;
  padding: 8px 16px 20px;
  overflow-y: auto;
}

.filter-section {
  display: grid;
  gap: 10px;
  min-width: 0;
  padding: 16px 0;
  border: 0;
  border-bottom: 1px solid var(--zipda-color-border);
}

.filter-section legend {
  font-size: 14px;
  font-weight: 700;
}

.filter-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-option {
  min-height: 36px;
  padding: 0 14px;
  color: var(--zipda-color-text);
  background: var(--zipda-color-white);
  border: 1px solid var(--zipda-color-border);
  border-radius: 9999px;
  cursor: pointer;
}

.filter-option--selected {
  color: var(--zipda-color-white);
  background: var(--zipda-color-primary);
  border-color: var(--zipda-color-primary);
}

.filter-range {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 8px;
}

.filter-range input,
.filter-select select {
  min-width: 0;
  height: 42px;
  padding: 0 10px;
  color: var(--zipda-color-text);
  background: var(--zipda-color-white);
  border: 1px solid var(--zipda-color-border);
  border-radius: var(--zipda-radius-medium);
}

.filter-select {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.property-filter-panel__error {
  margin-top: 12px;
  padding: 10px 12px;
  color: var(--zipda-color-danger);
  background: var(--zipda-color-danger-light);
  border-radius: var(--zipda-radius-medium);
  font-size: 12px;
}

.property-filter-panel__reset,
.property-filter-panel__apply {
  height: 48px;
  border-radius: var(--zipda-radius-medium);
  font-weight: 700;
  cursor: pointer;
}

.property-filter-panel__reset {
  width: 100px;
  color: var(--zipda-color-text);
  background: var(--zipda-color-white);
  border: 1px solid var(--zipda-color-border);
}

.property-filter-panel__apply {
  flex: 1;
  color: var(--zipda-color-white);
  background: var(--zipda-color-primary);
  border: 0;
}

@media (min-width: 768px) {
  .property-filter-panel {
    position: absolute;
    top: 84px;
    right: 24px;
    bottom: auto;
    left: 24px;
    width: auto;
    height: min(680px, calc(100dvh - 120px));
    border: 1px solid var(--zipda-color-border);
    border-radius: var(--zipda-radius-large);
    box-shadow: var(--zipda-shadow-app);
    overflow: hidden;
  }
}
</style>
