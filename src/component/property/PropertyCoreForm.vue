<script setup>
// 임호탁 파트 (매물 등록·수정 공통 핵심 정보 입력 폼)
import MyInput from "../input/MyInput.vue";
import MyTextarea from "../input/MyTextarea.vue";
import { PROPERTY_LABELS, PROPERTY_TYPES, PUBLISHER_TYPES, TRANSACTION_TYPES } from "../../constant/property/propertyStatus.js";

defineProps({
  errors: { type: Object, default: () => ({}) },
  disabled: { type: Boolean, default: false },
  editMode: { type: Boolean, default: false },
  publisherLocked: { type: Boolean, default: false },
  propertyTypeLocked: { type: Boolean, default: false },
  publisherTypes: { type: Array, default: () => PUBLISHER_TYPES },
  showLivingConditions: { type: Boolean, default: true },
});

const form = defineModel({ type: Object, required: true });
</script>

<template>
  <div class="property-core-form">
    <fieldset v-if="!publisherLocked" class="property-form-section" :disabled="disabled">
      <legend>등록 주체</legend>
      <label class="property-select-field">
        <span>등록 주체</span>
        <select v-model="form.publisherType" :disabled="editMode || publisherLocked">
          <option value="">선택</option>
          <option v-for="value in publisherTypes" :key="value" :value="value">
            {{ PROPERTY_LABELS.publisherType[value] }}
          </option>
        </select>
        <small v-if="errors.publisherType" class="text-error">{{ errors.publisherType }}</small>
      </label>
    </fieldset>

    <fieldset class="property-form-section" :disabled="disabled">
      <legend>어떤 종류의 매물인가요?</legend>
      <div class="property-choice-grid property-choice-grid--property" role="group" aria-label="매물 유형">
        <button
          v-for="value in PROPERTY_TYPES"
          :key="value"
          type="button"
          class="property-choice"
          :class="{ 'property-choice--selected': form.propertyType === value }"
          :aria-pressed="form.propertyType === value"
          :disabled="disabled || editMode || propertyTypeLocked"
          @click="form.propertyType = value"
        >
          {{ PROPERTY_LABELS.propertyType[value] }}
        </button>
      </div>
      <small v-if="errors.propertyType" class="text-error">{{ errors.propertyType }}</small>
    </fieldset>

    <fieldset class="property-form-section" :disabled="disabled">
      <legend>거래 방식을 선택해 주세요</legend>
      <div class="property-choice-grid property-choice-grid--transaction" role="group" aria-label="거래 유형">
        <button
          v-for="value in TRANSACTION_TYPES"
          :key="value"
          type="button"
          class="property-choice"
          :class="{ 'property-choice--selected': form.transactionType === value }"
          :aria-pressed="form.transactionType === value"
          :disabled="disabled"
          @click="form.transactionType = value"
        >
          {{ PROPERTY_LABELS.transactionType[value] }}
        </button>
      </div>
      <small v-if="errors.transactionType" class="text-error">{{ errors.transactionType }}</small>
    </fieldset>

    <fieldset class="property-form-section" :disabled="disabled">
      <legend>희망 가격을 입력해 주세요</legend>
      <MyInput v-if="form.transactionType === 'SALE'" v-model="form.salePrice" label="매매가" inputmode="numeric" placeholder="예: 50000" :error-message="errors.salePrice" required>
        <template #trailing><span class="input-unit">만원</span></template>
      </MyInput>
      <MyInput v-if="form.transactionType === 'JEONSE' || form.transactionType === 'MONTHLY_RENT'" v-model="form.deposit" label="보증금" inputmode="numeric" placeholder="예: 10000" :error-message="errors.deposit" required>
        <template #trailing><span class="input-unit">만원</span></template>
      </MyInput>
      <MyInput v-if="form.transactionType === 'MONTHLY_RENT'" v-model="form.monthlyRent" label="월세" inputmode="numeric" placeholder="예: 80" :error-message="errors.monthlyRent" required>
        <template #trailing><span class="input-unit">만원</span></template>
      </MyInput>
      <MyInput v-model="form.maintenanceFee" label="관리비" inputmode="numeric" placeholder="예: 10" :error-message="errors.maintenanceFee">
        <template #trailing><span class="input-unit">만원</span></template>
      </MyInput>
    </fieldset>

    <fieldset class="property-form-section property-form-grid" :disabled="disabled">
      <legend>기본 정보를 알려주세요</legend>
      <MyInput v-model="form.exclusiveArea" label="전용면적(㎡)" inputmode="decimal" :error-message="errors.exclusiveArea" required />
      <MyInput v-model="form.supplyArea" label="공급면적(㎡)" inputmode="decimal" :error-message="errors.supplyArea" />
      <MyInput v-model="form.roomCount" label="방 수" inputmode="numeric" :error-message="errors.roomCount" />
      <MyInput v-model="form.bathroomCount" label="욕실 수" inputmode="numeric" :error-message="errors.bathroomCount" />
      <MyInput v-model="form.floor" label="해당 층" inputmode="numeric" :error-message="errors.floor" />
      <MyInput v-model="form.totalFloor" label="전체 층" inputmode="numeric" :error-message="errors.totalFloor" />
      <MyInput v-model="form.floorCondition" label="층 조건" :maxlength="30" />
      <MyInput v-model="form.direction" label="방향" :maxlength="20" />
      <MyInput v-model="form.approvalDate" label="사용승인일" type="date" />
      <MyInput v-model="form.buildingUse" label="건축물 용도" :maxlength="100" />
    </fieldset>

    <fieldset v-if="showLivingConditions" class="property-form-section" :disabled="disabled">
      <legend>생활 조건</legend>
      <div class="property-check-grid">
        <label class="property-check"><input v-model="form.isParkingAvailable" type="checkbox" /> 주차 가능</label>
        <label class="property-check"><input v-model="form.hasElevator" type="checkbox" /> 엘리베이터 있음</label>
        <label class="property-check"><input v-model="form.isPetAllowed" type="checkbox" /> 반려동물 가능</label>
      </div>
    </fieldset>

    <fieldset class="property-form-section" :disabled="disabled">
      <legend>상세 설명</legend>
      <MyInput v-model="form.title" label="제목" placeholder="매물의 특징을 한 문장으로 알려주세요" :maxlength="200" :error-message="errors.title" required />
      <MyTextarea v-model="form.description" label="설명" placeholder="남향 여부, 주변 환경, 교통 등 매물의 장점을 자세히 적어주세요." :maxlength="2000" :rows="6" :error-message="errors.description" required />
    </fieldset>
  </div>
</template>

<style scoped>
.property-core-form,
.property-form-section {
  display: grid;
  gap: 14px;
}

.property-form-section {
  padding: 0;
  border: 0;
}

.property-form-section legend {
  padding: 0;
  margin-bottom: 2px;
  font-size: 16px;
  font-weight: 700;
}

.property-form-section label {
  display: grid;
  gap: 7px;
  font-size: 14px;
  font-weight: 700;
}

.property-form-section select,
.property-form-section textarea {
  width: 100%;
  padding: 12px 13px;
  background: var(--zipda-color-white);
  border: 1px solid var(--zipda-color-border);
  border-radius: var(--zipda-radius-medium);
}

.property-choice-grid {
  display: grid;
  gap: 8px;
}

.property-choice-grid--property {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.property-choice-grid--transaction {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.property-choice {
  min-height: 44px;
  padding: 10px 8px;
  color: var(--zipda-color-text);
  background: var(--zipda-color-white);
  border: 1px solid var(--zipda-color-border);
  border-radius: var(--zipda-radius-medium);
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.property-choice--selected {
  color: var(--zipda-color-white);
  background: var(--zipda-color-primary);
  border-color: var(--zipda-color-primary);
}

.property-choice:focus-visible {
  outline: none;
  box-shadow: var(--zipda-focus-ring);
}

.property-choice:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.input-unit {
  flex: 0 0 auto;
  color: var(--zipda-color-text-muted);
  font-size: 13px;
}

.property-form-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.property-form-grid legend {
  grid-column: 1 / -1;
}

.property-check {
  display: flex !important;
  align-items: center;
  grid-template-columns: auto 1fr;
}

.property-check-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.property-check {
  min-height: 42px;
  padding: 10px 12px;
  background: var(--zipda-color-surface);
  border: 1px solid var(--zipda-color-border);
  border-radius: var(--zipda-radius-medium);
}

.property-check input {
  accent-color: var(--zipda-color-primary);
}

@media (max-width: 480px) {
  .property-form-grid { grid-template-columns: 1fr; }
}
</style>
