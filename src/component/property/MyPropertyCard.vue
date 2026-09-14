<script setup>
// 임호탁 파트 (내 매물 상태와 관리 액션 카드)
import { computed } from "vue";
import MyButton from "../button/MyButton.vue";
import PropertyStatusBadge from "./PropertyStatusBadge.vue";
import {
  labelPropertyValue,
  resolvePropertyVerificationMode,
} from "../../constant/property/propertyStatus.js";
import { formatPropertyPrice } from "../../util/property/formatPropertyPrice.js";

const props = defineProps({ property: { type: Object, required: true } });
const emit = defineEmits(["edit", "status", "delete", "verify"]);

const price = computed(() => formatPropertyPrice(props.property));
const verificationMode = computed(() => resolvePropertyVerificationMode(props.property));
const canVerify = computed(() => Boolean(verificationMode.value));
</script>

<template>
  <article class="property-card">
    <div class="property-card__heading">
      <div>
        <p class="property-card__meta">
          {{ labelPropertyValue("propertyType", property.propertyType) }} ·
          {{ labelPropertyValue("publisherType", property.publisherType) }}
        </p>
        <h2>{{ property.title }}</h2>
        <strong class="property-card__price">{{ price }}</strong>
      </div>
      <span class="property-card__version">v{{ property.version }}</span>
    </div>

    <div class="property-card__statuses" aria-label="매물 상태">
      <PropertyStatusBadge group="publicationStatus" :value="property.publicationStatus" />
      <PropertyStatusBadge group="transactionStatus" :value="property.transactionStatus" />
      <PropertyStatusBadge group="verificationStatus" :value="property.verificationStatus" />
    </div>

    <p class="property-card__updated">최근 수정 {{ property.updatedAt ? new Date(property.updatedAt).toLocaleString("ko-KR") : "-" }}</p>

    <div class="property-card__actions">
      <MyButton size="small" variant="outline" @click="emit('edit', property)">수정</MyButton>
      <MyButton v-if="property.transactionStatus !== 'COMPLETED'" size="small" variant="outline" @click="emit('status', property)">거래 상태</MyButton>
      <MyButton v-if="canVerify" size="small" variant="subtle" @click="emit('verify', property, verificationMode)">
        {{ verificationMode === "reverification" ? "재검증" : "검증 신청" }}
      </MyButton>
      <MyButton size="small" variant="danger" @click="emit('delete', property)">삭제</MyButton>
    </div>
  </article>
</template>

<style scoped>
.property-card {
  display: grid;
  gap: 14px;
  padding: 18px;
  background: var(--zipda-color-surface);
  border: 1px solid var(--zipda-color-border);
  border-radius: var(--zipda-radius-large);
}

.property-card__heading {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.property-card__heading h2 {
  margin-top: 3px;
  font-size: 17px;
  line-height: 1.45;
}

.property-card__meta,
.property-card__updated,
.property-card__version {
  color: var(--zipda-color-text-muted);
  font-size: 12px;
}

.property-card__price {
  display: block;
  margin-top: 8px;
  font-size: 15px;
}

.property-card__statuses,
.property-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}
</style>
