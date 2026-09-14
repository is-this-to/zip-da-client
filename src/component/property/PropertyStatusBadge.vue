<script setup>
// 임호탁 파트 (공개·거래·검증 상태 구분 배지)
import { computed } from "vue";
import { labelPropertyValue } from "../../constant/property/propertyStatus.js";

const props = defineProps({
  group: { type: String, required: true },
  value: { type: String, default: "" },
});

const label = computed(() => labelPropertyValue(props.group, props.value));
</script>

<template>
  <span class="property-status" :class="`property-status--${String(value).toLowerCase()}`">
    {{ label }}
  </span>
</template>

<style scoped>
.property-status {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 3px 9px;
  color: var(--zipda-color-subtle-text);
  background: var(--zipda-color-primary-light);
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}

.property-status--completed,
.property-status--hidden,
.property-status--expired {
  color: var(--zipda-color-text-muted);
  background: var(--zipda-color-subtle-background);
}

.property-status--rejected {
  color: var(--zipda-color-danger);
  background: var(--zipda-color-danger-light);
}
</style>
