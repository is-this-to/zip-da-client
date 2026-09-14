<script setup>
import { computed, ref, watch } from "vue";
import { fetchPropertyOptionCodes } from "../../api/propertyOptionApi.js";
import {
  buildRegistrationOptions,
  groupRegistrationOptions,
  selectedOptionCodesFromOptions,
} from "../../api/propertyOptionPolicy.js";

const props = defineProps({
  propertyType: { type: String, required: true },
});
const emit = defineEmits(["ready-change"]);
const options = defineModel({ type: Array, default: () => [] });

const optionCodes = ref([]);
const selectedOptionCodes = ref(selectedOptionCodesFromOptions(options.value));
const isLoading = ref(false);
const errorMessage = ref("");
const groups = computed(() => groupRegistrationOptions(optionCodes.value));
let requestSequence = 0;

const syncOptions = () => {
  options.value = buildRegistrationOptions(optionCodes.value, selectedOptionCodes.value);
};

const loadOptions = async () => {
  const sequence = ++requestSequence;
  isLoading.value = true;
  errorMessage.value = "";
  emit("ready-change", false);
  try {
    const received = await fetchPropertyOptionCodes(props.propertyType);
    if (sequence !== requestSequence) return;
    optionCodes.value = received;
    selectedOptionCodes.value = selectedOptionCodesFromOptions(options.value);
    syncOptions();
    emit("ready-change", true);
  } catch {
    if (sequence !== requestSequence) return;
    errorMessage.value = "옵션 정보를 불러오지 못했습니다. 다시 시도해 주세요.";
  } finally {
    if (sequence === requestSequence) isLoading.value = false;
  }
};

const toggleOption = (optionCode, checked) => {
  const next = new Set(selectedOptionCodes.value);
  checked ? next.add(optionCode) : next.delete(optionCode);
  selectedOptionCodes.value = next;
  syncOptions();
};

watch(() => props.propertyType, loadOptions, { immediate: true });
</script>

<template>
  <section class="option-selector" aria-labelledby="property-option-title">
    <div class="section-heading">
      <div>
        <h2 id="property-option-title">옵션</h2>
        <p>매물에 해당하는 옵션을 선택해 주세요.</p>
      </div>
      <span>{{ selectedOptionCodes.size }}개 선택</span>
    </div>

    <p v-if="isLoading" class="info-box" aria-live="polite">옵션을 불러오고 있습니다.</p>
    <div v-else-if="errorMessage" class="error-box" role="alert">
      <p>{{ errorMessage }}</p>
      <button type="button" class="retry-button" @click="loadOptions">다시 시도</button>
    </div>
    <p v-else-if="groups.length === 0" class="info-box">등록할 수 있는 옵션이 없습니다.</p>

    <div v-else class="option-groups">
      <fieldset v-for="group in groups" :key="group.category" class="option-group">
        <legend>{{ group.category }}</legend>
        <div class="option-grid">
          <label v-for="item in group.items" :key="item.optionCode" class="option-item">
            <input
              type="checkbox"
              :checked="selectedOptionCodes.has(item.optionCode)"
              @change="toggleOption(item.optionCode, $event.target.checked)"
            />
            <span>{{ item.optionName }}</span>
            <small v-if="item.required">필수 포함</small>
          </label>
        </div>
      </fieldset>
    </div>
  </section>
</template>

<style scoped>
.option-selector,
.option-groups,
.option-group { display: grid; gap: 14px; }
.section-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.section-heading div { display: grid; gap: 5px; }
.section-heading h2 { font-size: 18px; }
.section-heading p { color: var(--zipda-color-text-muted); font-size: 13px; }
.section-heading > span { flex: 0 0 auto; color: var(--zipda-color-primary-active); font-size: 12px; font-weight: 700; }
.option-group { padding: 0; border: 0; }
.option-group legend { margin-bottom: 8px; font-size: 14px; font-weight: 700; }
.option-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.option-item { display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 4px 8px; min-height: 46px; padding: 10px 12px; background: var(--zipda-color-surface); border: 1px solid var(--zipda-color-border); border-radius: var(--zipda-radius-medium); font-size: 13px; font-weight: 700; cursor: pointer; }
.option-item input { accent-color: var(--zipda-color-primary); }
.option-item small { grid-column: 2; color: var(--zipda-color-text-muted); font-size: 11px; font-weight: 400; }
.error-box { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.retry-button { padding: 7px 10px; background: var(--zipda-color-white); border: 1px solid currentColor; border-radius: var(--zipda-radius-small); color: inherit; cursor: pointer; }
@media (max-width: 480px) { .option-grid { grid-template-columns: 1fr; } }
</style>
